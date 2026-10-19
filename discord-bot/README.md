# 🤖 Bot de Discord PE:RP Streets — Guía de Configuración Paso a Paso

Este bot conecta la economía del servidor de Discord con el **Banco YA P** y el registro de **DNI Peruano con Avatar de Roblox** de la web oficial de PE:RP.

---

## 📋 Comandos Disponibles para Ciudadanos (Sin comandos admin en el bot)

| Comando | Descripción | Ejemplo |
|---|---|---|
| `/crear-dni` | Registra datos ciudadanos y asigna DNI con foto de Roblox | `/crear-dni usuario_roblox:MrAlex_Peru nombres:Carlos Daniel ...` |
| `/dni-ver` | Muestra el DNI con botones interactivos `[Anverso]` y `[Reverso]` | `/dni-ver usuario_o_dni:74829104` |
| `/saldo` | Ver desglose: En mano, Banco YA P y Total (estilo UnbelievaBoat) | `/saldo` |
| `/transferir` | Transfiere dinero a otro usuario usando su DNI o usuario de Roblox | `/transferir destino:74829104 monto:50 motivo:Gasolina` |
| `/retirar` | Retira dinero de Banco YA P a tu mano (efectivo en mano) | `/retirar monto:30` |
| `/depositar` | Deposita dinero de tu mano al Banco YA P | `/depositar monto:20` |
| `/historial` | Muestra los últimos movimientos de tu cuenta | `/historial` |
| `/ayuda` | Despliega la guía de comandos en Discord | `/ayuda` |

> 🔒 **Nota de Seguridad:** Todos los comandos y funciones administrativas (congelar cuentas, reiniciar fondos, editar saldos, cambiar fotos) se realizan **exclusivamente desde el Panel de Administración Web**, no en el bot de Discord.

---

## 🚀 Pasos para Configurar y Ejecutar el Bot

### Paso 1: Crear la Aplicación en Discord Developer Portal
1. Entra a [Discord Developer Portal](https://discord.com/developers/applications).
2. Haz clic en **"New Application"** y ponle de nombre `Banco YA P - PE:RP`.
3. Ve a la pestaña **"Bot"** en el menú izquierdo:
   - Haz clic en **"Add Bot"** o **"Reset Token"** para copiar tu **Token de Bot**.
   - Activa las opciones **Server Members Intent** y **Message Content Intent** si lo deseas.
4. Ve a la pestaña **"General Information"** y copia tu **Application ID** (este es tu `CLIENT_ID`).

### Paso 2: Invitar el Bot a tu Servidor
1. En el Developer Portal, ve a **OAuth2** -> **URL Generator**.
2. En *Scopes*, selecciona:
   - `bot`
   - `applications.commands`
3. En *Bot Permissions*, selecciona:
   - `Send Messages`
   - `Embed Links`
   - `Attach Files`
   - `Read Message History`
   - `Use External Emojis`
4. Copia el enlace generado al final y ábrelo en tu navegador para invitar al bot a tu servidor de Discord.

### Paso 3: Configurar el archivo `.env`
1. Entra a la carpeta `discord-bot/`.
2. Crea una copia de `.env.example` y nómbrala `.env`:
   ```bash
   DISCORD_TOKEN=tu_token_aqui
   CLIENT_ID=tu_application_id_aqui
   GUILD_ID=id_de_tu_servidor_de_discord
   API_BASE_URL=http://localhost:3000
   ```
   *(Nota: Si pones `GUILD_ID`, los comandos slash se registran de inmediato en tu servidor).*

### Paso 4: Instalar dependencias y desplegar comandos
Ejecuta en la terminal:
```bash
cd discord-bot
npm install
npm run deploy
```
Verás: `✅ ¡Éxito! Se registraron los comandos en el servidor.`

### Paso 5: Encender el Bot
```bash
npm start
```
Verás en consola:
`🤖 Bot oficial PE:RP conectado exitosamente como Banco YA P#0000`

¡Listo! Los usuarios ya pueden usar `/crear-dni`, `/dni-ver`, `/saldo`, `/transferir`, etc.
