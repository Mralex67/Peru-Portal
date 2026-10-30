# 🤖 Bot de Discord PE:RP Streets — Guía de Configuración Paso a Paso

Este bot conecta la economía del servidor de Discord con el **Banco YA P** y el registro de **DNI Peruano con Avatar de Roblox** de la web oficial de PE:RP.

---

## 📋 Comandos Disponibles para Ciudadanos (Sin comandos admin en el bot)

| Comando | Descripción | Ejemplo |
|---|---|---|
| `/crear-dni` | Registra datos ciudadanos y asigna DNI con foto de Roblox | `/crear-dni usuario_roblox:MrAlex_Peru nombres:Juan Diego ...` |
| `/dni-ver` | Muestra el DNI con botones interactivos `[Anverso]` y `[Reverso]` | `/dni-ver usuario_o_dni:74829104` |
| `/saldo` | Ver desglose: En mano, Banco YA P y Total (estilo UnbelievaBoat) | `/saldo` |
| `/transferir` | Transfiere dinero a otro usuario usando su DNI o usuario de Roblox | `/transferir destino:74829104 monto:50 motivo:Gasolina` |
| `/retirar` | Retira dinero de Banco YA P a tu mano (efectivo en mano) | `/retirar monto:30` |
| `/depositar` | Deposita dinero de tu mano al Banco YA P | `/depositar monto:20` |
| `/historial` | Muestra los últimos movimientos de tu cuenta | `/historial` |
| `/arrestar` | Registra arresto policial SIPOL con foto mugshot (Rol PNP: `1555384968086032394`) | `/arrestar usuario:Tsaonomori cargos:Intento Homicidio tiempo:3m fianza:5000` |
| `/multar` | Emite una multa de tránsito oficial (Rol PNP: `1555384968086032394`) | `/multar usuario:.trakeandoloz motivo:Conduccion temeraria monto:700` |
| `/antecedentes` | Consulta antecedentes, multas, arrestos y Licencia de Conducir (`1556723203114668082`) | `/antecedentes usuario:Tsaonomori` |
| `/sancionar` | Sanción administrativa interna en Discord (Solo Staff) | `/sancionar usuario:@User motivo:Toxicidad pruebas:link` |
| `/sanciones` | Consulta historial de sanciones en Discord de un usuario | `/sanciones usuario:@User` |
| `$ticket-master-pro11896767-proro` | Comando secreto en el canal para desplegar el panel de Tickets | Escribir en cualquier canal de Discord |
| `/ayuda` | Despliega la guía de comandos en Discord | `/ayuda` |

> 👮 **Roles Oficiales del Sistema:**
> - **Policía Nacional del Perú (PNP):** `1555384968086032394` (permite usar `/arrestar`, `/multar` y acceder a canales policiales).
> - **Licencia de Conducir Vigente:** `1556723203114668082` (se refleja automáticamente en `/antecedentes` y en la Tablet SIPOL).
>
> 🔒 **Nota de Seguridad:** Las sanciones administrativas y tickets se gestionan de forma segura y privada.

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

---

## 🌐 CÓMO SUBIR EL BOT A UN HOSTING 24/7 (SIN APAGAR TU PC)

El bot incluye todos los archivos de configuración listos para los hostings más populares:

### Opción 1: Discloud (¡La más recomendada y fácil!)
Discloud tiene plan gratuito y está especializado en bots de Discord en Latinoamérica.
1. Entra a [discloud.com](https://discloud.com) e inicia sesión con Discord.
2. Comprime todos los archivos dentro de la carpeta `discord-bot` en un archivo `.zip` (o descarga el zip directo desde el Panel Web de PE:RP).
   *Asegúrate de que dentro del zip estén `index.js`, `package.json`, `discloud.config` y tu archivo `.env` configurado.*
3. En el dashboard de Discloud, haz clic en **"Add App"** o sube el `.zip`.
4. ¡Listo! Discloud lo iniciará automáticamente y estará online 24/7.

### Opción 2: Bot-Hosting.net (Panel Pterodactyl Gratis)
1. Entra a [bot-hosting.net](https://bot-hosting.net) e inicia sesión con Discord.
2. Crea un servidor gratuito seleccionando **Node.js**.
3. Ve al gestor de archivos (File Manager) y sube todos los archivos de la carpeta `discord-bot`.
4. En **Startup**, verifica que el comando de inicio sea `node index.js`.
5. Ve a la consola y pulsa **Start** (Iniciar).

### Opción 3: Railway.app o Render.com
1. Sube tu código a un repositorio de GitHub (puedes crear uno privado).
2. En Railway o Render, crea un nuevo servicio conectado a tu repositorio.
3. Elige **Background Worker** o servicio Docker (ya incluimos `Procfile` y `Dockerfile`).
4. En la sección **Variables de Entorno (Environment Variables)**, agrega:
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID`
   - `API_BASE_URL` (la URL pública de tu web)
5. Despliega y listo, se mantendrá activo 24/7.

### Opción 4: Servidor VPS propio (Ubuntu/Debian con PM2)
Si tienes un VPS (ej. Hostinger, DigitalOcean, Oracle Cloud Free Tier):
```bash
# 1. Clonar o subir la carpeta discord-bot
cd discord-bot
npm install
npm install -g pm2

# 2. Registrar los comandos
node deploy-commands.js

# 3. Encender 24/7 con reinicio automático
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```
El bot se mantendrá encendido 24/7 y se reiniciará automáticamente si el VPS se reinicia.

