import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  REST,
  Routes,
  SlashCommandBuilder,
} from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// ==========================================
// SUPABASE CLIENT INITIALIZATION (DIRECT CLOUD SYNC)
// ==========================================
const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_ANON_KEY || '').trim();
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

if (supabase) {
  console.log('⚡ Conectado directamente a Supabase Cloud (DNI y Banco YA P sincronizados en vivo con la Web).');
} else {
  console.log('ℹ️ Operando con base de datos local (agrega SUPABASE_URL y SUPABASE_ANON_KEY en tu .env para sincronizar con la web).');
}

// ==========================================
// LOCAL DATABASE FALLBACK ENGINE
// ==========================================
const DB_FILE = path.resolve('.data/bot_system.json');

function loadLocalDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const initial = { dnis: [], accounts: [], transactions: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch {
    return { dnis: [], accounts: [], transactions: [] };
  }
}

function saveLocalDb(data) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error saving local bot DB:', e);
  }
}

// Resolver avatar oficial de Roblox con soporte para nombre, ID y búsqueda
async function fetchRobloxUserAvatar(username) {
  let clean = username.trim().replace(/^@/, '');
  // Extraer ID si es un link de perfil de Roblox
  const profileMatch = clean.match(/roblox\.com\/users\/(\d+)/i);
  if (profileMatch) {
    clean = profileMatch[1];
  }

  const defaultAvatar = 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-310966282D3529E36976BF6B07B1DC90-Png/420/420/AvatarHeadshot/Png/noFilter';
  let uId = '';

  // 1. Si ya es un ID numérico de Roblox
  if (/^\d+$/.test(clean)) {
    uId = clean;
  } else {
    // 2. Buscar por nombre exacto en la API de Roblox
    try {
      const userRes = await fetch('https://users.roblox.com/v1/usernames/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: [clean], excludeBannedUsers: false }),
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.data && userData.data.length > 0) {
          uId = userData.data[0].id.toString();
        }
      }
    } catch {}

    // 3. Si no se encontró por coincidencia exacta, usar search de Roblox
    if (!uId) {
      try {
        const searchRes = await fetch(`https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(clean)}&limit=10`);
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.data && searchData.data.length > 0) {
            const matched = searchData.data.find(
              (u) => (u.name && u.name.toLowerCase() === clean.toLowerCase()) ||
                     (u.displayName && u.displayName.toLowerCase() === clean.toLowerCase())
            ) || searchData.data[0];
            if (matched && matched.id) {
              uId = matched.id.toString();
            }
          }
        }
      } catch {}
    }
  }

  if (uId) {
    // URL directa y garantizada de CDN de Roblox Headshot
    let avatarUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${uId}&width=420&height=420&format=png`;
    try {
      const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${uId}&size=420x420&format=Png&isCircular=false`);
      if (thumbRes.ok) {
        const thumbData = await thumbRes.json();
        if (thumbData.data && thumbData.data[0]?.imageUrl) {
          avatarUrl = thumbData.data[0].imageUrl;
        }
      }
    } catch {}
    return { avatarUrl, userId: uId };
  }

  return { avatarUrl: defaultAvatar, userId: '' };
}

// Definition of citizen Slash Commands
const slashCommandsData = [
  new SlashCommandBuilder()
    .setName('crear-dni')
    .setDescription('Registra tus datos ciudadanos y genera tu DNI peruano con tu avatar de Roblox')
    .addStringOption((o) => o.setName('usuario_roblox').setDescription('Tu nombre de usuario o ID en Roblox').setRequired(true))
    .addStringOption((o) => o.setName('nombres').setDescription('Tus prenombres (ej. Juan Diego o tus nombres)').setRequired(true))
    .addStringOption((o) => o.setName('apellido_paterno').setDescription('Tu primer apellido (ej. Quispe)').setRequired(true))
    .addStringOption((o) => o.setName('apellido_materno').setDescription('Tu segundo apellido (ej. Mamani)').setRequired(true))
    .addStringOption((o) => o.setName('fecha_nacimiento').setDescription('Fecha de nacimiento obligatoria AAAA-MM-DD (ej. 2002-05-14)').setRequired(true))
    .addStringOption((o) =>
      o.setName('sexo').setDescription('Sexo ciudadano obligatorio (M o F)').setRequired(true)
        .addChoices({ name: 'Masculino (M)', value: 'M' }, { name: 'Femenino (F)', value: 'F' })
    ),
  new SlashCommandBuilder()
    .setName('dni-ver')
    .setDescription('Muestra el DNI peruano oficial con foto de Roblox y botones de Anverso/Reverso')
    .addStringOption((o) => o.setName('usuario_o_dni').setDescription('Número de DNI (8 dígitos) o usuario de Roblox').setRequired(false)),
  new SlashCommandBuilder()
    .setName('saldo')
    .setDescription('Consulta tu dinero: en mano (cash), banco (Banco YA P) y total')
    .addStringOption((o) => o.setName('usuario_o_dni').setDescription('Usuario de Roblox o número de DNI a consultar').setRequired(false)),
  new SlashCommandBuilder()
    .setName('transferir')
    .setDescription('Transfiere Soles mediante Banco YA P a otro ciudadano por DNI o usuario de Roblox')
    .addStringOption((o) => o.setName('destino').setDescription('DNI (8 dígitos) o usuario de Roblox del destinatario').setRequired(true))
    .addNumberOption((o) => o.setName('monto').setDescription('Cantidad de Soles (S/.) a transferir').setRequired(true).setMinValue(0.1))
    .addStringOption((o) => o.setName('motivo').setDescription('Motivo o concepto de la transferencia').setRequired(false)),
  new SlashCommandBuilder()
    .setName('retirar')
    .setDescription('Retira dinero de tu cuenta de Banco YA P hacia tu mano (efectivo en mano)')
    .addNumberOption((o) => o.setName('monto').setDescription('Cantidad en Soles a retirar').setRequired(true).setMinValue(0.1)),
  new SlashCommandBuilder()
    .setName('depositar')
    .setDescription('Deposita dinero en efectivo de tu mano hacia tu cuenta de Banco YA P')
    .addNumberOption((o) => o.setName('monto').setDescription('Cantidad en Soles a depositar').setRequired(true).setMinValue(0.1)),
  new SlashCommandBuilder()
    .setName('historial')
    .setDescription('Revisa los últimos movimientos y comprobantes de tu Banco YA P')
    .addStringOption((o) => o.setName('usuario_o_dni').setDescription('Usuario de Roblox o DNI').setRequired(false)),
  new SlashCommandBuilder()
    .setName('ayuda')
    .setDescription('Guía de comandos ciudadanos de PE:RP y Banco YA P'),
].map((c) => c.toJSON());

client.once('ready', async () => {
  console.log(`🤖 Bot oficial PE:RP conectado exitosamente como ${client.user.tag}`);
  console.log(`🆔 ID de Aplicación del Bot: ${client.user.id}`);
  client.user.setActivity('Banco YA P | /ayuda', { type: 3 });

  // AUTO-REGISTRO SEGURO DE COMANDOS SLASH EN DISCORD
  try {
    const token = process.env.DISCORD_TOKEN;
    const realClientId = client.user.id;
    const guildId = process.env.GUILD_ID;

    if (token) {
      console.log(`🚀 Registrando automáticamente ${slashCommandsData.length} comandos Slash en Discord para App ${realClientId}...`);
      const rest = new REST({ version: '10' }).setToken(token);

      // 1. Si especificó GUILD_ID en .env, registrar ahí de inmediato
      if (guildId && guildId !== 'tu_guild_id_aqui') {
        try {
          await rest.put(Routes.applicationGuildCommands(realClientId, guildId), { body: slashCommandsData });
          console.log(`⚡ ¡Comandos registrados INSTANTÁNEAMENTE en el servidor Guild (${guildId})!`);
        } catch (guildErr) {
          console.warn(`Aviso al registrar en Guild ${guildId}:`, guildErr.message);
        }
      }

      // 2. Registrar en servidores en caché
      const cachedGuilds = client.guilds.cache;
      for (const [gId, guild] of cachedGuilds) {
        if (gId !== guildId) {
          try {
            await rest.put(Routes.applicationGuildCommands(realClientId, gId), { body: slashCommandsData });
            console.log(`⚡ ¡Comandos registrados INSTANTÁNEAMENTE en servidor "${guild.name}" (${gId})!`);
          } catch (err) {
            console.warn(`Aviso al registrar comandos en servidor ${gId}:`, err.message);
          }
        }
      }

      // 3. Limpiar comandos globales para evitar comandos duplicados en la lista del servidor
      try {
        await rest.put(Routes.applicationCommands(realClientId), { body: [] });
        console.log('🧹 Comandos globales duplicados limpiados con éxito (lista limpia 1:1 en Discord).');
      } catch (cleanErr) {
        // Ignorar si no hay comandos globales previos
      }
    }
  } catch (error) {
    console.error('❌ Error registrando comandos Slash automáticamente:', error);
  }
});

// Helper: Extraer prenombres reales del ciudadano sin fallbacks hardcodeados
function getDniPrenames(dni) {
  const p = dni.prenames || dni.givenNames || dni.given_names || dni.nombres;
  if (p && p.trim() && p.trim().toUpperCase() !== 'CARLOS DANIEL') {
    return p.trim().toUpperCase();
  }
  // Si en fullName está guardado ej. "SANCHEZ MAMANI JUAN DIEGO"
  const rawFull = (dni.fullName || dni.full_name || '').replace(/,/g, ' ').trim();
  if (rawFull) {
    const parts = rawFull.split(/\s+/);
    if (parts.length >= 3) {
      const parsed = parts.slice(2).join(' ').toUpperCase();
      if (parsed !== 'CARLOS DANIEL') return parsed;
    } else if (parts.length === 2) {
      return parts[1].toUpperCase();
    }
  }
  return 'CIUDADANO';
}

// Helper: Extraer primer apellido del ciudadano
function getDniFirstSurname(dni) {
  const s = dni.firstSurname || dni.first_surname || dni.apellido_paterno;
  if (s && s.trim()) return s.trim().toUpperCase();
  const rawFull = (dni.fullName || dni.full_name || '').replace(/,/g, ' ').trim();
  if (rawFull) {
    const parts = rawFull.split(/\s+/);
    if (parts.length > 0) return parts[0].toUpperCase();
  }
  return 'QUISPE';
}

// Helper: Build DNI Front Embed
function buildDniFrontEmbed(dni) {
  const prenames = getDniPrenames(dni);
  const firstSurname = getDniFirstSurname(dni);
  const secondSurname = dni.secondSurname || dni.second_surname || dni.apellido_materno || 'MAMANI';

  return new EmbedBuilder()
    .setColor(0x0284c7)
    .setTitle('🇵🇪 REPÚBLICA DEL PERÚ — DOCUMENTO NACIONAL DE IDENTIDAD')
    .setDescription('**REGISTRO NACIONAL DE IDENTIFICACIÓN Y ESTADO CIVIL (RENIEC)**\n*DNI Electrónico Ciudadano Oficial PE:RP*')
    .setThumbnail(dni.photoUrl || dni.photo_url || 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-310966282D3529E36976BF6B07B1DC90-Png/420/420/AvatarHeadshot/Png/noFilter')
    .addFields(
      { name: '🆔 CÚI / N° DE DNI', value: `\`${dni.dniNumber || dni.dni_number}\``, inline: true },
      { name: '👤 CIUDADANO (ROBLOX)', value: `**@${dni.robloxUsername || dni.roblox_username}**`, inline: true },
      { name: '⚧️ SEXO', value: dni.gender === 'F' ? 'FEMENINO' : 'MASCULINO', inline: true },
      { name: '📝 PRIMER APELLIDO', value: firstSurname, inline: true },
      { name: '📝 SEGUNDO APELLIDO', value: secondSurname, inline: true },
      { name: '📝 PRENOMBRES', value: prenames, inline: true },
      { name: '🎂 FECHA DE NACIMIENTO', value: dni.birthDate || dni.birth_date || '2000-01-01', inline: true },
      { name: '🏛️ ESTADO RENIEC', value: '🟢 **EMITIDO Y VIGENTE**', inline: true }
    )
    .setFooter({
      text: 'PE:RP Streets • Vista: [ANVERSO FRONTAL] • Usa los botones para girar',
      iconURL: 'https://cdn-icons-png.flaticon.com/512/197/197563.png',
    })
    .setTimestamp();
}

// Helper: Build DNI Back Embed
function buildDniBackEmbed(dni) {
  const cleanDni = (dni.dniNumber || dni.dni_number || '00000000').padStart(8, '0');
  const cleanSurname = getDniFirstSurname(dni).replace(/[^A-Z]/g, '');
  const cleanPrenames = getDniPrenames(dni).replace(/[^A-Z]/g, '<');
  const mrzLine1 = `IDPER${cleanDni}<7<<<<<<<<<<<<<<<`;
  const mrzLine2 = `0205148M3010195PER<<<<<<<<<<<0`;
  const mrzLine3 = `${cleanSurname}<<${cleanPrenames}<<<<<<<<<<<<<<<`.substring(0, 30);

  return new EmbedBuilder()
    .setColor(0x0369a1)
    .setTitle('🇵🇪 DOCUMENTO NACIONAL DE IDENTIDAD — [REVERSO]')
    .setDescription('**DATOS COMPLEMENTARIOS Y ZONA DE LECTURA MECÁNICA (MRZ)**')
    .addFields(
      { name: '🗳️ GRUPO DE VOTACIÓN', value: '849201', inline: true },
      { name: '🩸 GRUPO SANGUÍNEO', value: 'O +', inline: true },
      { name: '🔏 HUELLA DIGITAL & FIRMA', value: 'Digitally Registered & Encrypted', inline: false },
      {
        name: '📟 ZONA MRZ (Lector Óptico Policial PNP)',
        value: `\`\`\`text\n${mrzLine1}\n${mrzLine2}\n${mrzLine3}\n\`\`\``,
        inline: false,
      }
    )
    .setFooter({
      text: 'PE:RP Streets • Vista: [REVERSO POSTERIOR] • Usa los botones para girar',
      iconURL: 'https://cdn-icons-png.flaticon.com/512/197/197563.png',
    })
    .setTimestamp();
}

// Botones interactivos Anverso / Reverso
function buildDniButtonRow(currentSide = 'front') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_dni_front')
      .setLabel('📄 Ver Anverso')
      .setStyle(currentSide === 'front' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(currentSide === 'front'),
    new ButtonBuilder()
      .setCustomId('btn_dni_back')
      .setLabel('🔄 Ver Reverso')
      .setStyle(currentSide === 'back' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(currentSide === 'back')
  );
}

// ==========================================
// INTERACTION HANDLING (SUPABASE + LOCAL ENGINE)
// ==========================================
client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;
    const db = loadLocalDb();

    // 1. /crear-dni
    if (commandName === 'crear-dni') {
      await interaction.deferReply();

      const robloxUsername = interaction.options.getString('usuario_roblox')?.trim() || '';
      const prenames = interaction.options.getString('nombres')?.trim() || '';
      const firstSurname = interaction.options.getString('apellido_paterno')?.trim() || '';
      const secondSurname = interaction.options.getString('apellido_materno')?.trim() || '';
      const birthDate = interaction.options.getString('fecha_nacimiento')?.trim() || '';
      const gender = (interaction.options.getString('sexo') || '').toUpperCase().trim();

      if (!robloxUsername || !prenames || !firstSurname || !secondSurname || !birthDate || !gender) {
        return interaction.editReply({
          content: '❌ **Todos los campos son obligatorios para emitir tu DNI:**\n• Usuario o ID de Roblox\n• Prenombres\n• Primer Apellido\n• Segundo Apellido\n• Fecha de Nacimiento (AAAA-MM-DD)\n• Sexo (M o F)',
        });
      }

      let dni;

      if (supabase) {
        try {
          // Verificar si ya existe en Supabase
          const { data: existing } = await supabase
            .from('peru_dnis')
            .select('*')
            .or(`discord_id.eq.${interaction.user.id},roblox_username.ilike.${robloxUsername}`)
            .maybeSingle();

          if (existing) {
            return interaction.editReply({
              content: `❌ **Ya posees un DNI emitido:** N° \`${existing.dni_number}\` (@${existing.roblox_username}). Usa \`/dni-ver\` para consultarlo.`,
            });
          }

          const robloxInfo = await fetchRobloxUserAvatar(robloxUsername);
          const dniNumber = (Math.floor(10000000 + Math.random() * 90000000)).toString();
          const fullName = `${firstSurname.toUpperCase()} ${secondSurname.toUpperCase()} ${prenames.toUpperCase()}`.trim();

          const insertPayload = {
            discord_id: interaction.user.id,
            discord_username: interaction.user.username,
            discord_display_name: interaction.user.displayName || interaction.user.username,
            roblox_username: robloxUsername,
            roblox_user_id: robloxInfo.userId || null,
            dni_number: dniNumber,
            verify_digit: '7',
            full_name: fullName,
            first_surname: firstSurname.toUpperCase(),
            second_surname: secondSurname.toUpperCase(),
            given_names: prenames.toUpperCase(),
            birth_date: birthDate,
            gender,
            photo_url: robloxInfo.avatarUrl,
            status: 'active',
          };

          await supabase.from('peru_dnis').insert([insertPayload]);

          // Crear cuenta en yapo_accounts en Supabase
          await supabase.from('yapo_accounts').upsert([
            {
              discord_id: interaction.user.id,
              discord_username: interaction.user.username,
              roblox_username: robloxUsername,
              dni_number: dniNumber,
              verify_digit: '7',
              full_name: fullName,
              avatar_url: robloxInfo.avatarUrl,
              bank_balance: 1000.0,
              cash_balance: 250.0,
              status: 'active',
            },
          ], { onConflict: 'discord_id' });

          // Registrar bono de bienvenida en transacciones
          await supabase.from('yapo_transactions').insert([
            {
              operation_number: `OP-${Math.floor(100000 + Math.random() * 900000)}`,
              type: 'welcome_bonus',
              receiver_dni: dniNumber,
              receiver_roblox: robloxUsername,
              receiver_name: fullName,
              receiver_avatar: robloxInfo.avatarUrl,
              amount: 1000.0,
              description: 'Bono de Apertura y Bienvenida Banco YA P',
            },
          ]);

          dni = {
            dniNumber,
            discordId: interaction.user.id,
            robloxUsername,
            fullName,
            firstSurname: firstSurname.toUpperCase(),
            secondSurname: secondSurname.toUpperCase(),
            prenames: prenames.toUpperCase(),
            birthDate,
            gender,
            photoUrl: robloxInfo.avatarUrl,
            department: 'LIMA',
            province: 'LIMA',
            district: 'MIRAFLORES',
          };
        } catch (supaErr) {
          console.error('Error insertando en Supabase:', supaErr);
        }
      }

      // Si no hay Supabase o falló la conexión, usar motor local
      if (!dni) {
        const existing = db.dnis.find(
          (d) => d.discordId === interaction.user.id || d.robloxUsername?.toLowerCase() === robloxUsername.toLowerCase()
        );

        if (existing) {
          return interaction.editReply({
            content: `❌ **Ya tienes un DNI emitido:** N° \`${existing.dniNumber}\` (@${existing.robloxUsername}). Usa \`/dni-ver\` para consultarlo.`,
          });
        }

        const robloxInfo = await fetchRobloxUserAvatar(robloxUsername);
        const dniNumber = (Math.floor(10000000 + Math.random() * 90000000)).toString();
        const fullName = `${firstSurname.toUpperCase()} ${secondSurname.toUpperCase()} ${prenames.toUpperCase()}`.trim();

        dni = {
          dniNumber,
          discordId: interaction.user.id,
          robloxUsername,
          fullName,
          firstSurname: firstSurname.toUpperCase(),
          secondSurname: secondSurname.toUpperCase(),
          prenames: prenames.toUpperCase(),
          birthDate,
          gender,
          photoUrl: robloxInfo.avatarUrl,
          department: 'LIMA',
          province: 'LIMA',
          district: 'MIRAFLORES',
          status: 'active',
          createdAt: new Date().toISOString(),
        };

        db.dnis.unshift(dni);

        let acc = db.accounts.find((a) => a.discordId === interaction.user.id || a.dniNumber === dniNumber);
        if (!acc) {
          acc = {
            id: `acc-${Date.now()}`,
            dniNumber,
            discordId: interaction.user.id,
            robloxUsername,
            fullName,
            avatarUrl: robloxInfo.avatarUrl,
            bankBalance: 1000.0,
            cashBalance: 250.0,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          db.accounts.unshift(acc);
        }
        saveLocalDb(db);
      }

      const embed = buildDniFrontEmbed(dni);
      const row = buildDniButtonRow('front');

      const reply = await interaction.editReply({
        content: `🎉 **¡DNI tramitado con éxito!** Se te ha asignado el DNI **${dni.dniNumber}** con tu avatar oficial de Roblox (@${dni.robloxUsername}) y se habilitó tu cuenta en **Banco YA P**.`,
        embeds: [embed],
        components: [row],
      });

      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120000,
      });

      collector.on('collect', async (i) => {
        if (i.customId === 'btn_dni_front') {
          await i.update({ embeds: [buildDniFrontEmbed(dni)], components: [buildDniButtonRow('front')] });
        } else if (i.customId === 'btn_dni_back') {
          await i.update({ embeds: [buildDniBackEmbed(dni)], components: [buildDniButtonRow('back')] });
        }
      });
    }

    // 2. /dni-ver
    else if (commandName === 'dni-ver') {
      await interaction.deferReply();
      const identifier = interaction.options.getString('usuario_o_dni') || interaction.user.id;
      const clean = identifier.trim().toLowerCase().replace(/^@/, '');

      let dni = null;

      // 1. Consultar en Supabase
      if (supabase) {
        try {
          let query = supabase.from('peru_dnis').select('*');
          if (clean.length === 8 && /^\d+$/.test(clean)) {
            query = query.eq('dni_number', clean);
          } else if (/^\d{17,20}$/.test(clean)) {
            query = query.eq('discord_id', clean);
          } else {
            query = query.or(`roblox_username.ilike.${clean},discord_id.eq.${clean},dni_number.eq.${clean}`);
          }

          const { data: row } = await query.maybeSingle();
          if (row) {
            dni = {
              dniNumber: row.dni_number,
              discordId: row.discord_id,
              robloxUsername: row.roblox_username,
              fullName: row.full_name,
              firstSurname: row.first_surname || 'QUISPE',
              secondSurname: row.second_surname || 'MAMANI',
              prenames: row.given_names || 'CIUDADANO',
              birthDate: row.birth_date || '2000-01-01',
              gender: row.gender || 'M',
              photoUrl: row.photo_url,
              status: row.status || 'active',
              department: 'LIMA',
              province: 'LIMA',
              district: 'MIRAFLORES',
            };
          }
        } catch (e) {
          console.error('Error buscando DNI en Supabase:', e);
        }
      }

      // 2. Fallback a BD local
      if (!dni) {
        dni = db.dnis.find(
          (d) =>
            d.dniNumber?.toLowerCase() === clean ||
            d.discordId?.toLowerCase() === clean ||
            d.robloxUsername?.toLowerCase() === clean
        );
      }

      if (!dni) {
        return interaction.editReply({
          content: `❌ **No encontrado:** No se encontró ningún DNI registrado para \`${identifier}\`.\nPuedes tramitarlo en Discord con \`/crear-dni\` o en la web oficial.`,
        });
      }

      const embed = buildDniFrontEmbed(dni);
      const row = buildDniButtonRow('front');

      const reply = await interaction.editReply({ embeds: [embed], components: [row] });
      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120000,
      });

      collector.on('collect', async (i) => {
        if (i.customId === 'btn_dni_front') {
          await i.update({ embeds: [buildDniFrontEmbed(dni)], components: [buildDniButtonRow('front')] });
        } else if (i.customId === 'btn_dni_back') {
          await i.update({ embeds: [buildDniBackEmbed(dni)], components: [buildDniButtonRow('back')] });
        }
      });
    }

    // 3. /saldo
    else if (commandName === 'saldo') {
      await interaction.deferReply();
      const identifier = interaction.options.getString('usuario_o_dni') || interaction.user.id;
      const clean = identifier.trim().toLowerCase().replace(/^@/, '');

      let acc = null;

      // 1. Consultar en Supabase
      if (supabase) {
        try {
          let query = supabase.from('yapo_accounts').select('*');
          if (clean.length === 8 && /^\d+$/.test(clean)) {
            query = query.eq('dni_number', clean);
          } else if (/^\d{17,20}$/.test(clean)) {
            query = query.eq('discord_id', clean);
          } else {
            query = query.or(`roblox_username.ilike.${clean},dni_number.eq.${clean},discord_id.eq.${clean}`);
          }

          const { data: row } = await query.maybeSingle();
          if (row) {
            acc = {
              dniNumber: row.dni_number,
              discordId: row.discord_id,
              robloxUsername: row.roblox_username,
              fullName: row.full_name,
              avatarUrl: row.avatar_url,
              bankBalance: Number(row.bank_balance) || 0,
              cashBalance: Number(row.cash_balance) || 0,
            };
          } else {
            // Si no tiene fila en yapo_accounts pero sí tiene DNI, crearle su cuenta automáticamente
            const { data: dniRow } = await supabase
              .from('peru_dnis')
              .select('*')
              .or(`discord_id.eq.${clean},dni_number.eq.${clean},roblox_username.ilike.${clean}`)
              .maybeSingle();

            if (dniRow) {
              const newAccRow = {
                discord_id: dniRow.discord_id,
                discord_username: dniRow.discord_username,
                roblox_username: dniRow.roblox_username,
                dni_number: dniRow.dni_number,
                verify_digit: '7',
                full_name: dniRow.full_name,
                avatar_url: dniRow.photo_url,
                bank_balance: 1000.0,
                cash_balance: 250.0,
                status: 'active',
              };
              await supabase.from('yapo_accounts').insert([newAccRow]);
              acc = {
                dniNumber: newAccRow.dni_number,
                discordId: newAccRow.discord_id,
                robloxUsername: newAccRow.roblox_username,
                fullName: newAccRow.full_name,
                avatarUrl: newAccRow.avatar_url,
                bankBalance: 1000.0,
                cashBalance: 250.0,
              };
            }
          }
        } catch (e) {
          console.error('Error consultando saldo en Supabase:', e);
        }
      }

      // 2. Fallback a BD local
      if (!acc) {
        acc = db.accounts.find(
          (a) =>
            a.dniNumber?.toLowerCase() === clean ||
            a.discordId?.toLowerCase() === clean ||
            a.robloxUsername?.toLowerCase() === clean
        );
      }

      if (!acc) {
        return interaction.editReply({
          content: `❌ **Cuenta no encontrada:** No se encontró cuenta bancaria para \`${identifier}\`.\nCrea tu DNI primero con \`/crear-dni\` o en la página web.`,
        });
      }

      const totalBalance = Number(acc.cashBalance || 0) + Number(acc.bankBalance || 0);

      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle(`🏦 Estado de Cuenta Bancaria — @${acc.robloxUsername}`)
        .setDescription(`**Banco YA P & Billetera Móvil Oficial PE:RP**\nTitular: **${acc.fullName}** | DNI: \`${acc.dniNumber}\``)
        .setThumbnail(acc.avatarUrl)
        .addFields(
          { name: '💵 Dinero en Mano (Efectivo)', value: `\`S/. ${Number(acc.cashBalance).toFixed(2)}\``, inline: false },
          { name: '🏦 Dinero en Banco (Banco YA P)', value: `\`S/. ${Number(acc.bankBalance).toFixed(2)}\``, inline: false },
          { name: '💰 Dinero Total (Patrimonio)', value: `**\`S/. ${Number(totalBalance).toFixed(2)}\`**`, inline: false }
        )
        .setFooter({ text: 'Banco YA P PE:RP • Retira con /retirar o deposita con /depositar' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }

    // 4. /transferir
    else if (commandName === 'transferir') {
      await interaction.deferReply();
      const destino = interaction.options.getString('destino');
      const monto = interaction.options.getNumber('monto');
      const motivo = interaction.options.getString('motivo') || 'Transferencia por Banco YA P';
      const cleanDestino = destino.trim().toLowerCase().replace(/^@/, '');

      if (supabase) {
        try {
          // Obtener emisor
          const { data: sender } = await supabase
            .from('yapo_accounts')
            .select('*')
            .eq('discord_id', interaction.user.id)
            .maybeSingle();

          if (!sender) {
            return interaction.editReply({ content: '❌ **No tienes cuenta:** Tramita tu DNI primero con `/crear-dni`.' });
          }

          if (Number(sender.bank_balance) < monto) {
            return interaction.editReply({
              content: `❌ **Saldo insuficiente:** Tienes \`S/. ${Number(sender.bank_balance).toFixed(2)}\` en tu banco.`,
            });
          }

          // Obtener receptor
          let queryRec = supabase.from('yapo_accounts').select('*');
          if (cleanDestino.length === 8 && /^\d+$/.test(cleanDestino)) {
            queryRec = queryRec.eq('dni_number', cleanDestino);
          } else {
            queryRec = queryRec.or(`dni_number.eq.${cleanDestino},roblox_username.ilike.${cleanDestino}`);
          }
          const { data: receiver } = await queryRec.maybeSingle();

          if (!receiver) {
            return interaction.editReply({ content: `❌ **Destinatario no encontrado:** No existe cuenta con DNI o usuario \`${destino}\`.` });
          }

          if (sender.dni_number === receiver.dni_number) {
            return interaction.editReply({ content: '❌ **Error:** No puedes transferirte a ti mismo.' });
          }

          // Ejecutar transferencia en Supabase
          const newSenderBank = Number(sender.bank_balance) - monto;
          const newReceiverBank = Number(receiver.bank_balance) + monto;

          await supabase.from('yapo_accounts').update({ bank_balance: newSenderBank }).eq('id', sender.id);
          await supabase.from('yapo_accounts').update({ bank_balance: newReceiverBank }).eq('id', receiver.id);

          const opNumber = `OP-${Math.floor(100000 + Math.random() * 900000)}`;
          await supabase.from('yapo_transactions').insert([
            {
              operation_number: opNumber,
              type: 'transfer',
              sender_dni: sender.dni_number,
              sender_roblox: sender.roblox_username,
              sender_name: sender.full_name,
              receiver_dni: receiver.dni_number,
              receiver_roblox: receiver.roblox_username,
              receiver_name: receiver.full_name,
              amount: monto,
              description: motivo,
            },
          ]);

          const voucherEmbed = new EmbedBuilder()
            .setColor(0x10b981)
            .setTitle('✅ ¡YA P Enviado con Éxito!')
            .setDescription(`**COMPROBANTE ELECTRÓNICO OFICIAL DE BANCO YA P**\nOperación: \`${opNumber}\``)
            .addFields(
              { name: '📤 Emisor', value: `@${sender.roblox_username} (DNI: \`${sender.dni_number}\`)`, inline: true },
              { name: '📥 Destinatario', value: `${receiver.full_name} (@${receiver.roblox_username})\nDNI: \`${receiver.dni_number}\``, inline: true },
              { name: '💸 Monto Transferido', value: `**S/. ${monto.toFixed(2)}**`, inline: false },
              { name: '📝 Motivo', value: motivo, inline: true },
              { name: '🏦 Saldo Restante en Banco', value: `S/. ${newSenderBank.toFixed(2)}`, inline: true }
            )
            .setFooter({ text: 'Banco YA P • Tu dinero seguro e instantáneo en PE:RP Streets' })
            .setTimestamp();

          return interaction.editReply({ embeds: [voucherEmbed] });
        } catch (supaErr) {
          console.error('Error transfiriendo en Supabase:', supaErr);
        }
      }

      // Fallback local
      const senderAcc = db.accounts.find((a) => a.discordId === interaction.user.id);
      if (!senderAcc) return interaction.editReply({ content: '❌ **No tienes cuenta:** Crea tu DNI primero.' });
      if (senderAcc.bankBalance < monto) return interaction.editReply({ content: '❌ **Saldo insuficiente.**' });

      const recipientAcc = db.accounts.find((a) => a.dniNumber?.toLowerCase() === cleanDestino || a.robloxUsername?.toLowerCase() === cleanDestino);
      if (!recipientAcc) return interaction.editReply({ content: '❌ **Destinatario no encontrado.**' });

      senderAcc.bankBalance -= monto;
      recipientAcc.bankBalance += monto;
      const op = `OP-${Math.floor(100000 + Math.random() * 900000)}`;
      saveLocalDb(db);

      const voucher = new EmbedBuilder()
        .setColor(0x10b981)
        .setTitle('✅ ¡YA P Enviado con Éxito!')
        .setDescription(`Operación: \`${op}\``)
        .addFields(
          { name: '📤 Emisor', value: `@${senderAcc.robloxUsername}`, inline: true },
          { name: '📥 Destinatario', value: `@${recipientAcc.robloxUsername}`, inline: true },
          { name: '💸 Monto', value: `S/. ${monto.toFixed(2)}`, inline: false }
        );
      await interaction.editReply({ embeds: [voucher] });
    }

    // 5. /retirar
    else if (commandName === 'retirar') {
      await interaction.deferReply();
      const monto = interaction.options.getNumber('monto');

      if (supabase) {
        try {
          const { data: acc } = await supabase.from('yapo_accounts').select('*').eq('discord_id', interaction.user.id).maybeSingle();
          if (!acc) return interaction.editReply({ content: '❌ **No tienes cuenta.**' });
          if (Number(acc.bank_balance) < monto) return interaction.editReply({ content: '❌ **Fondos insuficientes en banco.**' });

          const newBank = Number(acc.bank_balance) - monto;
          const newCash = Number(acc.cash_balance) + monto;
          await supabase.from('yapo_accounts').update({ bank_balance: newBank, cash_balance: newCash }).eq('id', acc.id);

          const embed = new EmbedBuilder()
            .setColor(0x14b8a6)
            .setTitle('🏧 Cajero Automático: Retiro Exitoso')
            .setDescription(`Has retirado **S/. ${monto.toFixed(2)}** de tu Banco YA P a tu mano.`)
            .addFields(
              { name: '💵 Efectivo en Mano', value: `S/. ${newCash.toFixed(2)}`, inline: true },
              { name: '🏦 Saldo en Banco YA P', value: `S/. ${newBank.toFixed(2)}`, inline: true }
            );
          return interaction.editReply({ embeds: [embed] });
        } catch (e) {
          console.error(e);
        }
      }

      // Local fallback
      const acc = db.accounts.find((a) => a.discordId === interaction.user.id);
      if (!acc) return interaction.editReply({ content: '❌ **No tienes cuenta.**' });
      if (acc.bankBalance < monto) return interaction.editReply({ content: '❌ **Fondos insuficientes.**' });
      acc.bankBalance -= monto;
      acc.cashBalance += monto;
      saveLocalDb(db);
      await interaction.editReply({ content: `✅ Retiraste **S/. ${monto.toFixed(2)}** de tu banco a tu mano.` });
    }

    // 6. /depositar
    else if (commandName === 'depositar') {
      await interaction.deferReply();
      const monto = interaction.options.getNumber('monto');

      if (supabase) {
        try {
          const { data: acc } = await supabase.from('yapo_accounts').select('*').eq('discord_id', interaction.user.id).maybeSingle();
          if (!acc) return interaction.editReply({ content: '❌ **No tienes cuenta.**' });
          if (Number(acc.cash_balance) < monto) return interaction.editReply({ content: '❌ **Fondos insuficientes en mano.**' });

          const newBank = Number(acc.bank_balance) + monto;
          const newCash = Number(acc.cash_balance) - monto;
          await supabase.from('yapo_accounts').update({ bank_balance: newBank, cash_balance: newCash }).eq('id', acc.id);

          const embed = new EmbedBuilder()
            .setColor(0xa855f7)
            .setTitle('🏦 Depósito Exitoso')
            .setDescription(`Has depositado **S/. ${monto.toFixed(2)}** de tu mano en tu cuenta bancaria.`)
            .addFields(
              { name: '💵 Efectivo en Mano', value: `S/. ${newCash.toFixed(2)}`, inline: true },
              { name: '🏦 Saldo en Banco YA P', value: `S/. ${newBank.toFixed(2)}`, inline: true }
            );
          return interaction.editReply({ embeds: [embed] });
        } catch (e) {
          console.error(e);
        }
      }

      // Local fallback
      const acc = db.accounts.find((a) => a.discordId === interaction.user.id);
      if (!acc) return interaction.editReply({ content: '❌ **No tienes cuenta.**' });
      if (acc.cashBalance < monto) return interaction.editReply({ content: '❌ **Fondos insuficientes en mano.**' });
      acc.cashBalance -= monto;
      acc.bankBalance += monto;
      saveLocalDb(db);
      await interaction.editReply({ content: `✅ Depositaste **S/. ${monto.toFixed(2)}** en tu cuenta de Banco YA P.` });
    }

    // 7. /historial
    else if (commandName === 'historial') {
      await interaction.deferReply();
      const identifier = interaction.options.getString('usuario_o_dni') || interaction.user.id;
      const clean = identifier.trim().toLowerCase().replace(/^@/, '');

      let txs = [];

      if (supabase) {
        try {
          const { data } = await supabase
            .from('yapo_transactions')
            .select('*')
            .or(`sender_dni.ilike.${clean},sender_roblox.ilike.${clean},receiver_dni.ilike.${clean},receiver_roblox.ilike.${clean}`)
            .order('timestamp', { ascending: false })
            .limit(10);

          if (data && data.length > 0) {
            txs = data;
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (txs.length === 0) {
        return interaction.editReply({ content: `ℹ️ **Sin movimientos:** No se encontraron transacciones para \`${identifier}\`.` });
      }

      const lines = txs.map((t, idx) => {
        const isReceived = t.receiver_dni?.toLowerCase() === clean || t.receiver_roblox?.toLowerCase() === clean;
        const sign = isReceived ? '+' : '-';
        return `**${idx + 1}.** \`${t.operation_number}\` • **${sign}S/. ${Number(t.amount).toFixed(2)}** • ${t.description} (<t:${Math.floor(new Date(t.timestamp).getTime() / 1000)}:R>)`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle(`📜 Últimos Movimientos — ${identifier}`)
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: 'Banco YA P • PE:RP Streets' });

      await interaction.editReply({ embeds: [embed] });
    }

    // 8. /reiniciar-dni (Restringido solo a administradores en la web)
    else if (commandName === 'reiniciar-dni') {
      await interaction.reply({
        ephemeral: true,
        content: '🔒 **Acción Administrativa Restringida:** Por normativas de PE:RP, el reinicio de DNI solo puede ser ejecutado por un **Administrador** desde el **Panel de Base de Datos Web Oficial**.',
      });
    }

    // 9. /ayuda
    else if (commandName === 'ayuda') {
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('🇵🇪 Comandos Oficiales de PE:RP Streets & Banco YA P')
        .setDescription('Lista de comandos disponibles para ciudadanos en Discord:')
        .addFields(
          { name: '🪪 `/crear-dni`', value: 'Registra tus datos ciudadanos y vincula tu avatar oficial de Roblox al DNI.' },
          { name: '📄 `/dni-ver [dni o usuario]`', value: 'Muestra tu DNI electrónico oficial con botones interactivos **[Anverso]** y **[Reverso]**.' },
          { name: '🏦 `/saldo [usuario opcional]`', value: 'Muestra tu desglose: **En mano** (efectivo), **Banco YA P** y **Total**.' },
          { name: '💸 `/transferir <destino> <monto> [motivo]`', value: 'Envía Soles al instante por número de DNI (8 dígitos) o usuario de Roblox.' },
          { name: '🏧 `/retirar <monto>`', value: 'Retira Soles de Banco YA P a tu efectivo en mano.' },
          { name: '📥 `/depositar <monto>`', value: 'Deposita efectivo de tu mano a Banco YA P.' },
          { name: '📜 `/historial [usuario opcional]`', value: 'Muestra los últimos movimientos y comprobantes.' }
        )
        .setFooter({ text: 'PE:RP Streets • Sincronización en la Nube con Supabase' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
          { name: '📥 `/depositar <monto>`', value: 'Deposita efectivo de tu mano a Banco YA P.' },
          { name: '📜 `/historial [usuario opcional]`', value: 'Muestra los últimos movimientos y comprobantes.' }
        )
        .setFooter({ text: 'PE:RP Streets • Sincronización en la Nube con Supabase' });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
});

// Login bot if DISCORD_TOKEN is present
if (process.env.DISCORD_TOKEN && process.env.DISCORD_TOKEN !== 'tu_token_de_bot_aqui') {
  client.login(process.env.DISCORD_TOKEN).catch((err) => {
    console.error('❌ Error iniciando sesión del bot de Discord:', err.message);
  });
} else {
  console.log('ℹ️ Bot listo. Configura tu token en el archivo .env');
}
