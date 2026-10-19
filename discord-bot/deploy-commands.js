import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error('❌ Error: Falta DISCORD_TOKEN o CLIENT_ID en el archivo .env');
  process.exit(1);
}

const commands = [
  // 1. /crear-dni
  new SlashCommandBuilder()
    .setName('crear-dni')
    .setDescription('Registra tus datos ciudadanos y genera tu DNI peruano con tu avatar de Roblox')
    .addStringOption((option) =>
      option
        .setName('usuario_roblox')
        .setDescription('Tu nombre de usuario exacto en Roblox')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('nombres')
        .setDescription('Tus prenombers (ej. Carlos Daniel)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('apellido_paterno')
        .setDescription('Tu primer apellido (ej. Quispe)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('apellido_materno')
        .setDescription('Tu segundo apellido (ej. Mamani)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('fecha_nacimiento')
        .setDescription('Fecha de nacimiento en formato AAAA-MM-DD (ej. 2002-05-14)')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('sexo')
        .setDescription('Sexo ciudadano (M o F)')
        .setRequired(false)
        .addChoices(
          { name: 'Masculino (M)', value: 'M' },
          { name: 'Femenino (F)', value: 'F' }
        )
    ),

  // 2. /dni-ver
  new SlashCommandBuilder()
    .setName('dni-ver')
    .setDescription('Muestra el DNI peruano oficial con foto de Roblox y botones de Anverso/Reverso')
    .addStringOption((option) =>
      option
        .setName('usuario_o_dni')
        .setDescription('Número de DNI (8 dígitos) o usuario de Roblox (opcional, por defecto el tuyo)')
        .setRequired(false)
    ),

  // 3. /saldo (o /ver-saldo)
  new SlashCommandBuilder()
    .setName('saldo')
    .setDescription('Consulta tu dinero: en mano (cash), banco (Banco YA P) y total')
    .addStringOption((option) =>
      option
        .setName('usuario_o_dni')
        .setDescription('Usuario de Roblox o número de DNI a consultar (opcional)')
        .setRequired(false)
    ),

  // 4. /transferir
  new SlashCommandBuilder()
    .setName('transferir')
    .setDescription('Transfiere Soles mediante Banco YA P a otro ciudadano por DNI o usuario de Roblox')
    .addStringOption((option) =>
      option
        .setName('destino')
        .setDescription('Número de DNI (8 dígitos) o usuario de Roblox del destinatario')
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName('monto')
        .setDescription('Cantidad de Soles (S/.) a transferir')
        .setRequired(true)
        .setMinValue(0.1)
    )
    .addStringOption((option) =>
      option
        .setName('motivo')
        .setDescription('Motivo o concepto de la transferencia (opcional)')
        .setRequired(false)
    ),

  // 5. /retirar
  new SlashCommandBuilder()
    .setName('retirar')
    .setDescription('Retira dinero de tu cuenta de Banco YA P hacia tu mano (efectivo en mano)')
    .addNumberOption((option) =>
      option
        .setName('monto')
        .setDescription('Cantidad en Soles a retirar')
        .setRequired(true)
        .setMinValue(0.1)
    ),

  // 6. /depositar
  new SlashCommandBuilder()
    .setName('depositar')
    .setDescription('Deposita dinero en efectivo de tu mano hacia tu cuenta de Banco YA P')
    .addNumberOption((option) =>
      option
        .setName('monto')
        .setDescription('Cantidad en Soles a depositar')
        .setRequired(true)
        .setMinValue(0.1)
    ),

  // 7. /historial
  new SlashCommandBuilder()
    .setName('historial')
    .setDescription('Revisa los últimos movimientos y comprobantes de tu Banco YA P')
    .addStringOption((option) =>
      option
        .setName('usuario_o_dni')
        .setDescription('Usuario de Roblox o DNI (opcional)')
        .setRequired(false)
    ),

  // 8. /ayuda
  new SlashCommandBuilder()
    .setName('ayuda')
    .setDescription('Guía de comandos ciudadanos de PE:RP y Banco YA P'),
].map((command) => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`🚀 Iniciando registro de ${commands.length} comandos Slash en Discord...`);

    let data;
    if (guildId) {
      // Registrar en el servidor específico (instantáneo)
      data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      console.log(`✅ ¡Éxito! Se registraron ${data.length} comandos en el servidor (Guild ID: ${guildId}).`);
    } else {
      // Registrar globalmente (puede tardar hasta 1 hora)
      data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      console.log(`✅ ¡Éxito! Se registraron ${data.length} comandos globalmente.`);
    }
  } catch (error) {
    console.error('❌ Error registrando comandos:', error);
  }
})();
