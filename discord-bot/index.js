import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  AttachmentBuilder,
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
import { createCanvas, loadImage } from '@napi-rs/canvas';

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
    // Prioritize avatar-bust (head, shoulders, torso with suit) matching official DNI aesthetic
    let avatarUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${uId}&width=420&height=420&format=png`;
    try {
      const bustRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-bust?userIds=${uId}&size=420x420&format=Png&isCircular=false`);
      if (bustRes.ok) {
        const bustData = await bustRes.json();
        if (bustData.data && bustData.data[0]?.imageUrl) {
          avatarUrl = bustData.data[0].imageUrl;
        }
      } else {
        const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${uId}&size=420x420&format=Png&isCircular=false`);
        if (thumbRes.ok) {
          const thumbData = await thumbRes.json();
          if (thumbData.data && thumbData.data[0]?.imageUrl) {
            avatarUrl = thumbData.data[0].imageUrl;
          }
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
    .setDescription('Registra tus datos ciudadanos y genera tu DNI peruano oficial con tu avatar de Roblox')
    .addStringOption((o) => o.setName('usuario_roblox').setDescription('Tu nombre de usuario o ID en Roblox').setRequired(true))
    .addStringOption((o) => o.setName('primer_apellido').setDescription('Tu primer apellido (ej. Arriola)').setRequired(true))
    .addStringOption((o) => o.setName('segundo_apellido').setDescription('Tu segundo apellido (ej. López)').setRequired(true))
    .addStringOption((o) => o.setName('prenombres').setDescription('Tus prenombres / nombres (ej. Augusto Fernando)').setRequired(true))
    .addStringOption((o) =>
      o.setName('sexo').setDescription('Sexo ciudadano').setRequired(true)
        .addChoices(
          { name: 'Masculino', value: 'Masculino' },
          { name: 'Femenino', value: 'Femenino' }
        )
    )
    .addStringOption((o) =>
      o.setName('estado_civil').setDescription('Estado civil').setRequired(true)
        .addChoices(
          { name: 'Soltero(a)', value: 'SOLTERO' },
          { name: 'Casado(a)', value: 'CASADO' },
          { name: 'Divorciado(a)', value: 'DIVORCIADO' },
          { name: 'Viudo(a)', value: 'VIUDO' }
        )
    )
    .addStringOption((o) => o.setName('fecha_nacimiento').setDescription('Fecha de nacimiento DD/MM/AAAA (ej. 07/08/1986 o 1986-08-07)').setRequired(true))
    .addStringOption((o) =>
      o.setName('donacion_organos').setDescription('¿Donación de órganos?').setRequired(true)
        .addChoices(
          { name: 'NO', value: 'NO' },
          { name: 'SÍ', value: 'SI' }
        )
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

// Helper: Render official DNI Image using template and Roblox avatar
async function renderDniCardImage(dniData) {
  try {
    const templatePaths = [
      path.resolve(__dirname, 'assets/dni-template-official.png'),
      path.resolve('assets/dni-template-official.png'),
      path.resolve(__dirname, '../public/assets/dni-template-official.png'),
      path.resolve('../public/assets/dni-template-official.png'),
      path.resolve('public/assets/dni-template-official.png'),
    ];
    const templatePath = templatePaths.find((p) => fs.existsSync(p));

    if (templatePath) {
      const tpl = await loadImage(templatePath);
      const canvas = createCanvas(tpl.width, tpl.height);
      const ctx = canvas.getContext('2d');

      // 1. Draw template background
      ctx.drawImage(tpl, 0, 0);

      // 2. Fetch and draw avatar on the right side
      let avatarImg = null;
      const photo = (dniData.photoUrl || dniData.photo_url || '').trim();
      const robloxUser = (dniData.robloxUsername || dniData.roblox_username || '').trim();

      if (photo) {
        try {
          if (photo.startsWith('data:image/')) {
            const b64 = photo.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
            avatarImg = await loadImage(Buffer.from(b64, 'base64'));
          } else {
            const resp = await fetch(photo);
            if (resp.ok) {
              const arr = await resp.arrayBuffer();
              avatarImg = await loadImage(Buffer.from(arr));
            }
          }
        } catch (e) {
          console.error('Error drawing photo on bot DNI:', e);
        }
      }

      if (!avatarImg && robloxUser) {
        try {
          const rInfo = await fetchRobloxUserAvatar(robloxUser);
          if (rInfo.avatarUrl) {
            const resp = await fetch(rInfo.avatarUrl);
            if (resp.ok) {
              const arr = await resp.arrayBuffer();
              avatarImg = await loadImage(Buffer.from(arr));
            }
          }
        } catch (e) {}
      }

      // Draw avatar bust on the right side
      if (avatarImg) {
        try {
          ctx.drawImage(avatarImg, 680, 140, 400, 420);
        } catch (e) {}
      }

      // 3. Texts matching official reference
      ctx.fillStyle = '#080808';
      ctx.textBaseline = 'middle';

      // CUI / DNI Number
      const dniNum = (dniData.dniNumber || dniData.dni_number || '00000000').toString().padStart(8, '0');
      ctx.font = 'bold 22px Arial, Helvetica, sans-serif';
      ctx.fillText(dniNum, 145, 149);

      // Names
      let pSurname = dniData.firstSurname || dniData.first_surname || '';
      let mSurname = dniData.secondSurname || dniData.second_surname || '';
      let names = dniData.givenNames || dniData.given_names || dniData.prenames || '';

      if (!pSurname && !mSurname && !names && (dniData.fullName || dniData.full_name)) {
        const parts = (dniData.fullName || dniData.full_name).trim().split(/\s+/);
        if (parts.length >= 3) {
          pSurname = parts[0];
          mSurname = parts[1];
          names = parts.slice(2).join(' ');
        } else if (parts.length === 2) {
          pSurname = parts[0];
          names = parts[1];
        } else {
          names = parts[0] || 'CIUDADANO';
        }
      }

      // Primer Apellido
      ctx.font = 'bold 24px Arial, Helvetica, sans-serif';
      ctx.fillText((pSurname || 'QUISPE').toUpperCase(), 350, 180);

      // Segundo Apellido
      ctx.fillText((mSurname || 'MAMANI').toUpperCase(), 350, 255);

      // Pronombre / Nombres
      ctx.fillText((names || 'JUAN').toUpperCase(), 350, 328);

      // Sexo
      const rawGen = (dniData.gender || dniData.sex || 'M').toUpperCase();
      const genderText = rawGen.startsWith('M') ? 'Masculino' : rawGen.startsWith('F') ? 'Femenino' : rawGen;
      ctx.font = 'bold 21px Arial, Helvetica, sans-serif';
      ctx.fillText(genderText, 345, 395);

      // Estado Civil
      const rawCivil = (dniData.civilStatus || dniData.civil_status || 'SOLTERO').toUpperCase();
      const civilText = rawCivil.startsWith('C') ? 'CASADO' : rawCivil.startsWith('D') ? 'DIVORCIADO' : rawCivil.startsWith('V') ? 'VIUDO' : 'SOLTERO';
      ctx.fillText(civilText, 570, 395);

      // Fecha de Nacimiento
      let bDate = dniData.birthDate || dniData.birth_date || '07/08/1986';
      if (/^\d{4}-\d{2}-\d{2}$/.test(bDate)) {
        const [y, m, d] = bDate.split('-');
        bDate = `${d}/${m}/${y}`;
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(bDate)) {
        bDate = bDate.replace(/-/g, '/');
      }
      ctx.fillText(bDate, 340, 458);

      // Serial code beside Peru map (12 digits)
      const serial = dniData.serialCode || dniData.serial_code || `000000000${dniNum.slice(-3)}`;
      ctx.font = 'bold 19px Arial, Helvetica, sans-serif';
      ctx.fillText(serial, 145, 468);

      // Fecha de Emisión
      const today = new Date();
      const emisionDefault = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
      const emisionText = dniData.issueDate || dniData.issue_date || emisionDefault;
      ctx.font = 'bold 21px Arial, Helvetica, sans-serif';
      ctx.fillText(emisionText, 340, 510);

      // Fecha de Caducidad (+8 years)
      const caducidadDefault = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear() + 8}`;
      const caducidadText = dniData.expiryDate || dniData.expiry_date || caducidadDefault;
      ctx.fillText(caducidadText, 570, 510);

      // Grupo de Votación (6 digits)
      const voteGroup = dniData.votingGroup || dniData.voting_group || dniNum.slice(0, 6);
      ctx.fillText(voteGroup, 345, 570);

      // Donación de Órganos
      const organText = (dniData.organDonation || dniData.organ_donation || 'NO').toUpperCase().includes('S') ? 'SI' : 'NO';
      ctx.fillText(organText, 570, 570);

      // Fingerprint date overlay (DD MM YYYY)
      const dateDigits = bDate.replace(/\//g, ' ').replace(/-/g, ' ');
      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 28px Arial, Helvetica, sans-serif';
      ctx.fillText(dateDigits, 92, 570);

      return canvas.toBuffer('image/png');
    }
  } catch (err) {
    console.error('Error in local canvas DNI renderer:', err);
  }

  // Fallback: API render
  try {
    const baseUrl = process.env.API_BASE_URL || 'https://ais-pre-iydhue5qk4b7wusoszmqp2-732238089491.us-east1.run.app';
    const params = new URLSearchParams({
      dni: dniData.dniNumber || dniData.dni_number || '',
      primer_apellido: dniData.firstSurname || dniData.first_surname || '',
      segundo_apellido: dniData.secondSurname || dniData.second_surname || '',
      nombres: dniData.givenNames || dniData.given_names || dniData.prenames || '',
      nacimiento: dniData.birthDate || dniData.birth_date || '',
      genero: (dniData.gender || dniData.sex || 'M').toUpperCase().startsWith('M') ? 'Masculino' : 'Femenino',
      estado_civil: dniData.civilStatus || dniData.civil_status || 'SOLTERO',
      donacion_organos: dniData.organDonation || dniData.organ_donation || 'NO',
      usuario: dniData.robloxUsername || dniData.roblox_username || '',
      foto: dniData.photoUrl || dniData.photo_url || '',
    });
    const res = await fetch(`${baseUrl}/api/dni/render?${params.toString()}`);
    if (res.ok) {
      const arr = await res.arrayBuffer();
      return Buffer.from(arr);
    }
  } catch (apiErr) {
    console.error('Error in API DNI render fallback:', apiErr);
  }

  return null;
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
      const prenames = (interaction.options.getString('prenombres') || interaction.options.getString('nombres'))?.trim() || '';
      const firstSurname = (interaction.options.getString('primer_apellido') || interaction.options.getString('apellido_paterno'))?.trim() || '';
      const secondSurname = (interaction.options.getString('segundo_apellido') || interaction.options.getString('apellido_materno'))?.trim() || '';
      let birthDate = interaction.options.getString('fecha_nacimiento')?.trim() || '';
      const gender = (interaction.options.getString('sexo') || 'Masculino').trim();
      const civilStatus = (interaction.options.getString('estado_civil') || 'SOLTERO').trim();
      const organDonation = (interaction.options.getString('donacion_organos') || 'NO').trim();

      if (!robloxUsername || !prenames || !firstSurname || !secondSurname || !birthDate) {
        return interaction.editReply({
          content: '❌ **Todos los campos son obligatorios para emitir tu DNI:**\n• Usuario o ID de Roblox\n• Primer Apellido\n• Segundo Apellido\n• Prenombres / Nombres\n• Sexo (Masculino o Femenino)\n• Estado Civil\n• Fecha de Nacimiento (DD/MM/AAAA)\n• Donación de Órganos (SÍ o NO)',
        });
      }

      // Normalizar fecha de nacimiento a DD/MM/AAAA
      if (/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
        const [y, m, d] = birthDate.split('-');
        birthDate = `${d}/${m}/${y}`;
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(birthDate)) {
        birthDate = birthDate.replace(/-/g, '/');
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
            gender: gender.startsWith('M') ? 'M' : 'F',
            civil_status: civilStatus,
            organ_donation: organDonation,
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
            givenNames: prenames.toUpperCase(),
            birthDate,
            gender: gender.startsWith('M') ? 'Masculino' : 'Femenino',
            civilStatus,
            organDonation,
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
          givenNames: prenames.toUpperCase(),
          birthDate,
          gender: gender.startsWith('M') ? 'Masculino' : 'Femenino',
          civilStatus,
          organDonation,
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

      const imgBuffer = await renderDniCardImage(dni);
      if (imgBuffer) {
        const attachment = new AttachmentBuilder(imgBuffer, { name: `dni-${dni.dniNumber}.png` });
        const embed = new EmbedBuilder()
          .setColor(0x0ea5e9)
          .setTitle(`🇵🇪 DNI ELECTRÓNICO EMITIDO — ${dni.dniNumber}`)
          .setDescription(`¡Felicidades, **${dni.fullName}**! Tu DNI oficial ha sido emitido con tu avatar de Roblox (@${dni.robloxUsername}) y registrado en RENIEC y Banco YA P.`)
          .setImage(`attachment://dni-${dni.dniNumber}.png`)
          .setFooter({ text: 'RENIEC PE:RP • Banco YA P Oficial' })
          .setTimestamp();

        await interaction.editReply({
          content: `🎉 **¡DNI tramitado con éxito!** N° **${dni.dniNumber}** (@${dni.robloxUsername}) • Bono de S/. 1,000 habilitado en Banco YA P.`,
          embeds: [embed],
          files: [attachment],
        });
      } else {
        await interaction.editReply({
          content: `🎉 **¡DNI tramitado con éxito!** N° **${dni.dniNumber}** (@${dni.robloxUsername}) con avatar oficial.`,
        });
      }
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

      const imgBuffer = await renderDniCardImage(dni);
      if (imgBuffer) {
        const attachment = new AttachmentBuilder(imgBuffer, { name: `dni-${dni.dniNumber}.png` });
        const embed = new EmbedBuilder()
          .setColor(0x0284c7)
          .setTitle(`🇵🇪 DOCUMENTO NACIONAL DE IDENTIDAD ELECTRÓNICO — ${dni.dniNumber}`)
          .setDescription(`**Titular:** ${dni.fullName} (@${dni.robloxUsername})\n**Estado:** 🟢 EMITIDO Y VIGENTE EN RENIEC`)
          .setImage(`attachment://dni-${dni.dniNumber}.png`)
          .setFooter({ text: 'Registro Nacional de Identificación y Estado Civil • PE:RP Streets' })
          .setTimestamp();

        await interaction.editReply({
          embeds: [embed],
          files: [attachment],
        });
      } else {
        await interaction.editReply({
          content: `📄 **DNI N° ${dni.dniNumber}** • Ciudadano: ${dni.fullName} (@${dni.robloxUsername})`,
        });
      }
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
        .setAuthor({
          name: `Banco YA P • @${acc.robloxUsername}`,
          iconURL: acc.avatarUrl,
        })
        .setTitle(`🏦 Estado de Cuenta Bancaria — @${acc.robloxUsername}`)
        .setDescription(`**Banco YA P & Billetera Móvil Oficial PE:RP**\nTitular: **${acc.fullName}** | DNI: \`${acc.dniNumber}\``)
        .setThumbnail(acc.avatarUrl)
        .addFields(
          { name: '💵 Dinero en Mano (Efectivo)', value: `\`S/. ${Number(acc.cashBalance).toFixed(2)}\``, inline: false },
          { name: '🏦 Dinero en Banco (Banco YA P)', value: `\`S/. ${Number(acc.bankBalance).toFixed(2)}\``, inline: false },
          { name: '💰 Dinero Total (Patrimonio)', value: `**\`S/. ${Number(totalBalance).toFixed(2)}\`**`, inline: false }
        )
        .setFooter({ text: 'Banco YA P PE:RP • Retira con /retirar o deposita con /depositar', iconURL: acc.avatarUrl })
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
