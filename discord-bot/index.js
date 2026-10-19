import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

client.once('ready', () => {
  console.log(`🤖 Bot oficial PE:RP conectado exitosamente como ${client.user.tag}`);
  client.user.setActivity('Banco YA P | /ayuda', { type: 3 }); // Watching
});

// Helper: Make fetch request to the web API
async function apiRequest(endpoint, options = {}) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    return await res.json();
  } catch (err) {
    console.error(`Error connecting to API ${endpoint}:`, err);
    return { success: false, error: 'No se pudo contactar con la API central de PE:RP.' };
  }
}

// Helper: Build DNI Front Embed
function buildDniFrontEmbed(dni) {
  return new EmbedBuilder()
    .setColor(0x0284c7) // Sky blue (DNI electrónico)
    .setTitle('🇵🇪 REPÚBLICA DEL PERÚ — DOCUMENTO NACIONAL DE IDENTIDAD')
    .setDescription('**REGISTRO NACIONAL DE IDENTIFICACIÓN Y ESTADO CIVIL (RENIEC)**\n*DNI Electrónico Ciudadano Oficial PE:RP*')
    .setThumbnail(dni.photoUrl || 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-310966282D3529E36976BF6B07B1DC90-Png/420/420/AvatarHeadshot/Png/noFilter')
    .addFields(
      { name: '🆔 CÚI / N° DE DNI', value: `\`${dni.dniNumber}\``, inline: true },
      { name: '👤 CIUDADANO (ROBLOX)', value: `**@${dni.robloxUsername}**`, inline: true },
      { name: '⚧️ SEXO', value: dni.gender === 'F' ? 'FEMENINO' : 'MASCULINO', inline: true },
      { name: '📝 PRIMER APELLIDO', value: dni.firstSurname || 'QUISPE', inline: true },
      { name: '📝 SEGUNDO APELLIDO', value: dni.secondSurname || 'MAMANI', inline: true },
      { name: '📝 PRENOMBRES', value: dni.prenames || 'CARLOS DANIEL', inline: true },
      { name: '🎂 FECHA DE NACIMIENTO', value: dni.birthDate || '2000-01-01', inline: true },
      { name: '📍 UBICACIÓN', value: `${dni.district || 'MIRAFLORES'} / ${dni.department || 'LIMA'}`, inline: true },
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
  const cleanDni = (dni.dniNumber || '00000000').padStart(8, '0');
  const cleanName = (dni.firstSurname || 'CIUDADANO').toUpperCase().replace(/[^A-Z]/g, '');
  const mrzLine1 = `IDPER${cleanDni}<7<<<<<<<<<<<<<<<`;
  const mrzLine2 = `0205148M3010195PER<<<<<<<<<<<0`;
  const mrzLine3 = `${cleanName}<<CARLOS<DANIEL<<<<<<<<<<`;

  return new EmbedBuilder()
    .setColor(0x0369a1)
    .setTitle('🇵🇪 DOCUMENTO NACIONAL DE IDENTIDAD — [REVERSO]')
    .setDescription('**DATOS COMPLEMENTARIOS Y ZONA DE LECTURA MECÁNICA (MRZ)**')
    .addFields(
      { name: '📍 DOMICILIO', value: `${dni.district || 'MIRAFLORES'}, ${dni.province || 'LIMA'}, ${dni.department || 'LIMA'}`, inline: true },
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

// Helper: Navigation Buttons for DNI
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

// Interaction handling
client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;

    // 1. /crear-dni
    if (commandName === 'crear-dni') {
      await interaction.deferReply();

      const robloxUsername = interaction.options.getString('usuario_roblox');
      const prenames = interaction.options.getString('nombres');
      const firstSurname = interaction.options.getString('apellido_paterno');
      const secondSurname = interaction.options.getString('apellido_materno');
      const birthDate = interaction.options.getString('fecha_nacimiento') || '2000-01-01';
      const gender = interaction.options.getString('sexo') || 'M';

      const res = await apiRequest('/api/bot/dni/create', {
        method: 'POST',
        body: JSON.stringify({
          discordId: interaction.user.id,
          robloxUsername,
          prenames,
          firstSurname,
          secondSurname,
          birthDate,
          gender,
        }),
      });

      if (!res.success) {
        return interaction.editReply({
          content: `❌ **Error al tramitar DNI:** ${res.error || 'Ocurrió un error inesperado.'}`,
        });
      }

      const dni = res.dni;
      const embed = buildDniFrontEmbed(dni);
      const row = buildDniButtonRow('front');

      const reply = await interaction.editReply({
        content: `🎉 **¡DNI tramitado con éxito!** Se te ha asignado el DNI **${dni.dniNumber}** con tu avatar oficial de Roblox (@${dni.robloxUsername}) y se te acreditó un bono de bienvenida en tu **Banco YA P**.`,
        embeds: [embed],
        components: [row],
      });

      // Collector for flipping buttons
      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120000, // 2 minutes
      });

      collector.on('collect', async (i) => {
        if (i.customId === 'btn_dni_front') {
          await i.update({
            embeds: [buildDniFrontEmbed(dni)],
            components: [buildDniButtonRow('front')],
          });
        } else if (i.customId === 'btn_dni_back') {
          await i.update({
            embeds: [buildDniBackEmbed(dni)],
            components: [buildDniButtonRow('back')],
          });
        }
      });
    }

    // 2. /dni-ver
    else if (commandName === 'dni-ver') {
      await interaction.deferReply();
      const identifier = interaction.options.getString('usuario_o_dni') || interaction.user.id;

      const res = await apiRequest(`/api/bot/dni/${encodeURIComponent(identifier)}`);

      if (!res.success || !res.found) {
        return interaction.editReply({
          content: `❌ **No encontrado:** No se encontró ningún DNI registrado para \`${identifier}\`.\nPuedes registrarte con \`/crear-dni\` o en la página web oficial.`,
        });
      }

      const dni = res.dni;
      const embed = buildDniFrontEmbed(dni);
      const row = buildDniButtonRow('front');

      const reply = await interaction.editReply({
        embeds: [embed],
        components: [row],
      });

      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120000,
      });

      collector.on('collect', async (i) => {
        if (i.customId === 'btn_dni_front') {
          await i.update({
            embeds: [buildDniFrontEmbed(dni)],
            components: [buildDniButtonRow('front')],
          });
        } else if (i.customId === 'btn_dni_back') {
          await i.update({
            embeds: [buildDniBackEmbed(dni)],
            components: [buildDniButtonRow('back')],
          });
        }
      });
    }

    // 3. /saldo
    else if (commandName === 'saldo') {
      await interaction.deferReply();
      const identifier = interaction.options.getString('usuario_o_dni') || interaction.user.id;

      const res = await apiRequest(`/api/bot/bank/balance/${encodeURIComponent(identifier)}`);

      if (!res.success || !res.found) {
        return interaction.editReply({
          content: `❌ **Cuenta no encontrada:** ${res.message || `No hay cuenta en Banco YA P para ${identifier}.`}\nCrea tu DNI primero con \`/crear-dni\`.`,
        });
      }

      const acc = res.account;
      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6) // Purple YA P
        .setTitle(`🏦 Estado de Cuenta Bancaria — @${acc.robloxUsername}`)
        .setDescription(`**Banco YA P & Billetera Móvil Oficial PE:RP**\nTitular: **${acc.fullName}** | DNI: \`${acc.dniNumber}\``)
        .setThumbnail(acc.avatarUrl)
        .addFields(
          {
            name: '💵 Dinero en Mano (Efectivo)',
            value: `\`S/. ${acc.cashBalance.toFixed(2)}\``,
            inline: false,
          },
          {
            name: '🏦 Dinero en Banco (Banco YA P)',
            value: `\`S/. ${acc.bankBalance.toFixed(2)}\``,
            inline: false,
          },
          {
            name: '💰 Dinero Total (Patrimonio Neto)',
            value: `**\`S/. ${acc.totalBalance.toFixed(2)}\`**`,
            inline: false,
          }
        )
        .setFooter({
          text: 'Banco YA P PE:RP • Retira a la mano con /retirar o deposita con /depositar',
          iconURL: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png',
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }

    // 4. /transferir
    else if (commandName === 'transferir') {
      await interaction.deferReply();
      const destino = interaction.options.getString('destino');
      const monto = interaction.options.getNumber('monto');
      const motivo = interaction.options.getString('motivo') || 'Transferencia por YA P';

      const res = await apiRequest('/api/bot/bank/transfer', {
        method: 'POST',
        body: JSON.stringify({
          senderIdentifier: interaction.user.id,
          recipientIdentifier: destino,
          amount: monto,
          note: motivo,
        }),
      });

      if (!res.success) {
        return interaction.editReply({
          content: `❌ **Error en transferencia:** ${res.error || 'No se pudo completar el envío de dinero.'}`,
        });
      }

      const voucherEmbed = new EmbedBuilder()
        .setColor(0x10b981) // Green success
        .setTitle('✅ ¡YA P Enviado con Éxito!')
        .setDescription(`**COMPROBANTE ELECTRÓNICO OFICIAL DE BANCO YA P**\nOperación: \`${res.operationNumber}\``)
        .addFields(
          { name: '📤 Emisor', value: `@${res.sender.robloxUsername} (DNI: \`${res.sender.dniNumber}\`)`, inline: true },
          { name: '📥 Destinatario', value: `${res.recipient.fullName} (@${res.recipient.robloxUsername})\nDNI: \`${res.recipient.dniNumber}\``, inline: true },
          { name: '💸 Monto Transferido', value: `**S/. ${res.amount.toFixed(2)}**`, inline: false },
          { name: '📝 Motivo / Nota', value: res.note || 'Sin nota', inline: true },
          { name: '🏦 Nuevo Saldo en Banco', value: `S/. ${res.sender.newBankBalance.toFixed(2)}`, inline: true }
        )
        .setFooter({
          text: 'Banco YA P • Tu dinero seguro e instantáneo en PE:RP Streets',
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [voucherEmbed] });
    }

    // 5. /retirar
    else if (commandName === 'retirar') {
      await interaction.deferReply();
      const monto = interaction.options.getNumber('monto');

      const res = await apiRequest('/api/bot/bank/withdraw', {
        method: 'POST',
        body: JSON.stringify({
          identifier: interaction.user.id,
          amount: monto,
        }),
      });

      if (!res.success) {
        return interaction.editReply({
          content: `❌ **Error al retirar:** ${res.error || 'No se pudo retirar el dinero.'}`,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x14b8a6) // Teal
        .setTitle('🏧 Cajero Automático: Retiro Exitoso')
        .setDescription(`Has retirado **S/. ${monto.toFixed(2)}** de tu Banco YA P a tu mano.`)
        .addFields(
          { name: '💵 Efectivo en Mano', value: `S/. ${res.cashBalance.toFixed(2)}`, inline: true },
          { name: '🏦 Saldo en Banco YA P', value: `S/. ${res.bankBalance.toFixed(2)}`, inline: true },
          { name: '💰 Total', value: `S/. ${res.totalBalance.toFixed(2)}`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }

    // 6. /depositar
    else if (commandName === 'depositar') {
      await interaction.deferReply();
      const monto = interaction.options.getNumber('monto');

      const res = await apiRequest('/api/bot/bank/deposit', {
        method: 'POST',
        body: JSON.stringify({
          identifier: interaction.user.id,
          amount: monto,
        }),
      });

      if (!res.success) {
        return interaction.editReply({
          content: `❌ **Error al depositar:** ${res.error || 'No se pudo depositar el dinero.'}`,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0xa855f7)
        .setTitle('🏦 Depósito en Banco YA P Exitoso')
        .setDescription(`Has depositado **S/. ${monto.toFixed(2)}** de tu mano en tu cuenta bancaria.`)
        .addFields(
          { name: '💵 Efectivo en Mano', value: `S/. ${res.cashBalance.toFixed(2)}`, inline: true },
          { name: '🏦 Saldo en Banco YA P', value: `S/. ${res.bankBalance.toFixed(2)}`, inline: true },
          { name: '💰 Total', value: `S/. ${res.totalBalance.toFixed(2)}`, inline: true }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }

    // 7. /historial
    else if (commandName === 'historial') {
      await interaction.deferReply();
      const identifier = interaction.options.getString('usuario_o_dni') || interaction.user.id;

      const res = await apiRequest(`/api/bot/bank/history/${encodeURIComponent(identifier)}`);

      if (!res.success || !res.transactions || res.transactions.length === 0) {
        return interaction.editReply({
          content: `ℹ️ **Sin movimientos:** No se encontraron transacciones recientes para \`${identifier}\`.`,
        });
      }

      const txs = res.transactions;
      const lines = txs.map((t, idx) => {
        const isReceived = t.receiverDni === identifier || t.receiverRoblox?.toLowerCase() === identifier.toLowerCase();
        const sign = isReceived ? '+' : '-';
        return `**${idx + 1}.** \`${t.operationNumber}\` • **${sign}S/. ${t.amount.toFixed(2)}** • ${t.description} (<t:${Math.floor(new Date(t.timestamp).getTime() / 1000)}:R>)`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle(`📜 Últimos Movimientos — ${identifier}`)
        .setDescription(lines.join('\n\n'))
        .setFooter({ text: 'Banco YA P • PE:RP Streets' });

      await interaction.editReply({ embeds: [embed] });
    }

    // 8. /ayuda
    else if (commandName === 'ayuda') {
      const embed = new EmbedBuilder()
        .setColor(0xef4444) // Red PE:RP
        .setTitle('🇵🇪 Comandos Oficiales de PE:RP Streets & Banco YA P')
        .setDescription('Lista de comandos disponibles para ciudadanos en Discord:')
        .addFields(
          {
            name: '🪪 `/crear-dni`',
            value: 'Registra tus datos ciudadanos (nombres, apellidos, usuario de Roblox) y vincula tu avatar oficial de Roblox al DNI.',
          },
          {
            name: '📄 `/dni-ver [dni o usuario]`',
            value: 'Muestra tu DNI electrónico oficial peruano con botones interactivos para ver el **[Anverso]** y el **[Reverso]**.',
          },
          {
            name: '🏦 `/saldo [usuario opcional]`',
            value: 'Muestra tu desglose financiero estilo UnbelievaBoat: **En mano** (efectivo), **Banco YA P** y **Total**.',
          },
          {
            name: '💸 `/transferir <destino> <monto> [motivo]`',
            value: 'Envía Soles al instante a otro ciudadano usando su número de DNI de 8 dígitos o su usuario de Roblox.',
          },
          {
            name: '🏧 `/retirar <monto>`',
            value: 'Retira Soles de tu Banco YA P para tener efectivo en mano.',
          },
          {
            name: '📥 `/depositar <monto>`',
            value: 'Deposita efectivo de tu mano a tu cuenta segura en Banco YA P.',
          },
          {
            name: '📜 `/historial [usuario opcional]`',
            value: 'Muestra los últimos movimientos y números de operación.',
          }
        )
        .setFooter({
          text: 'Toda la administración y configuración se realiza desde el Panel Web de PE:RP.',
        });

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
  console.log('ℹ️ Bot de Discord listo para ser configurado con tu token en el archivo discord-bot/.env');
}
