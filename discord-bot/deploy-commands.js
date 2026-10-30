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
    .setDescription('Registra tus datos ciudadanos y genera tu DNI peruano oficial con tu avatar de Roblox')
    .addStringOption((option) =>
      option
        .setName('usuario_roblox')
        .setDescription('Tu nombre de usuario o ID en Roblox')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('primer_apellido')
        .setDescription('Tu primer apellido (ej. Arriola)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('segundo_apellido')
        .setDescription('Tu segundo apellido (ej. López)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('prenombres')
        .setDescription('Tus prenombres / nombres (ej. Augusto Fernando)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('sexo')
        .setDescription('Sexo ciudadano')
        .setRequired(true)
        .addChoices(
          { name: 'Masculino', value: 'Masculino' },
          { name: 'Femenino', value: 'Femenino' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('estado_civil')
        .setDescription('Estado civil')
        .setRequired(true)
        .addChoices(
          { name: 'Soltero(a)', value: 'SOLTERO' },
          { name: 'Casado(a)', value: 'CASADO' },
          { name: 'Divorciado(a)', value: 'DIVORCIADO' },
          { name: 'Viudo(a)', value: 'VIUDO' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('fecha_nacimiento')
        .setDescription('Fecha de nacimiento DD/MM/AAAA (ej. 07/08/1986 o 1986-08-07)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('donacion_organos')
        .setDescription('¿Donación de órganos?')
        .setRequired(true)
        .addChoices(
          { name: 'NO', value: 'NO' },
          { name: 'SÍ', value: 'SI' }
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

  // 8. /arrestar (Policía Nacional del Perú - Rol 1555384968086032394)
  new SlashCommandBuilder()
    .setName('arrestar')
    .setDescription('Registra un arresto policial oficial en SIPOL (Solo PNP)')
    .addStringOption((option) =>
      option
        .setName('usuario')
        .setDescription('Usuario de Roblox o mención de Discord del detenido (ej. @Tsaonomori)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('cargos')
        .setDescription('Cargos o delitos imputados (ej. Intento de Homicidio / Art. 106)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('tiempo')
        .setDescription('Tiempo de condena (ej. 3m, 5m, 10m)')
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName('fianza')
        .setDescription('Monto de fianza en Soles (ej. 5000)')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('oficial')
        .setDescription('Oficial a cargo (opcional, por defecto tu usuario)')
        .setRequired(false)
    )
    .addAttachmentOption((option) =>
      option
        .setName('archivo')
        .setDescription('Foto de evidencia o ficha del arresto (Mugshot en comisaría)')
        .setRequired(false)
    ),

  // 9. /multar (Policía Nacional del Perú - Rol 1555384968086032394)
  new SlashCommandBuilder()
    .setName('multar')
    .setDescription('Emite una multa de tránsito oficial a un usuario (Solo PNP)')
    .addStringOption((option) =>
      option
        .setName('usuario')
        .setDescription('Usuario sancionado de Roblox o mención de Discord')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('motivo')
        .setDescription('Motivo de la infracción (ej. Conduccion temeraria, Pasar semáforo en rojo)')
        .setRequired(true)
    )
    .addNumberOption((option) =>
      option
        .setName('monto')
        .setDescription('Monto de la multa en Soles S/. (ej. 700)')
        .setRequired(true)
    ),

  // 10. /antecedentes
  new SlashCommandBuilder()
    .setName('antecedentes')
    .setDescription('Consulta antecedentes penales, arrestos, multas y licencia de conducir')
    .addStringOption((option) =>
      option
        .setName('usuario')
        .setDescription('Usuario de Roblox, DNI o mención de Discord a consultar')
        .setRequired(true)
    ),

  // 11. /sancionar (Staff / Moderación - Solo Discord)
  new SlashCommandBuilder()
    .setName('sancionar')
    .setDescription('Aplica una sanción administrativa en Discord a un usuario (Solo Staff)')
    .addUserOption((option) =>
      option
        .setName('usuario')
        .setDescription('Usuario de Discord a sancionar')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('motivo')
        .setDescription('Motivo detallado de la sanción')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('pruebas')
        .setDescription('Enlace o descripción de pruebas (opcional)')
        .setRequired(false)
    ),

  // 12. /sanciones (Staff / Consulta - Solo Discord)
  new SlashCommandBuilder()
    .setName('sanciones')
    .setDescription('Consulta las sanciones administrativas registradas de un usuario en Discord')
    .addUserOption((option) =>
      option
        .setName('usuario')
        .setDescription('Usuario de Discord a consultar')
        .setRequired(true)
    ),

  // 13. /ticket-panel (Deploy de tickets)
  new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Despliega el panel interactivo de Ticket Master Pro en el canal actual'),

  // 14. /ayuda
  new SlashCommandBuilder()
    .setName('ayuda')
    .setDescription('Guía de comandos ciudadanos de PE:RP, Banco YA P y PNP'),
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
