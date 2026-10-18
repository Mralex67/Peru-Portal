import expressApp from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = expressApp();
const PORT = process.env.PORT || 3000;

app.use(expressApp.json({ limit: '50mb' }));
app.use(expressApp.urlencoded({ limit: '50mb', extended: true }));

// Endpoint to save original uploaded photos directly to disk
app.post('/api/upload-photo', (req, res) => {
  try {
    const { imageBase64, extension = 'png' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Falta imagen' });
    }
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const safeExt = extension.replace(/[^a-zA-Z0-9]/g, '') || 'png';
    const filename = `foto_original_${Date.now()}.${safeExt}`;
    const targetDir = path.resolve(__dirname, 'src/assets/images');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const filePath = path.join(targetDir, filename);
    fs.writeFileSync(filePath, buffer);
    res.json({
      success: true,
      url: `/src/assets/images/${filename}`,
      filename,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al guardar foto' });
  }
});

// Endpoint to proxy Roblox avatar lookup
app.get('/api/roblox/avatar/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const userRes = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
    });
    if (!userRes.ok) {
      return res.status(404).json({ error: 'Usuario no encontrado en Roblox' });
    }
    const userData = await userRes.json();
    if (!userData.data || userData.data.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const user = userData.data[0];
    const uId = user.id;
    const thumbRes = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${uId}&size=420x420&format=Png&isCircular=false`
    );
    let avatarUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${uId}&width=420&height=420&format=png`;
    if (thumbRes.ok) {
      const thumbData = await thumbRes.json();
      if (thumbData.data && thumbData.data[0]?.imageUrl) {
        avatarUrl = thumbData.data[0].imageUrl;
      }
    }
    res.json({
      userId: uId.toString(),
      displayName: user.displayName || user.name,
      avatarUrl,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error consultando Roblox' });
  }
});

const AUTH_FILE = path.resolve(__dirname, '.discord-auth.json');

// In-memory or env configuration for Discord OAuth
let discordClientId = process.env.DISCORD_CLIENT_ID || '';
let discordClientSecret = process.env.DISCORD_CLIENT_SECRET || '';

try {
  if (fs.existsSync(AUTH_FILE)) {
    const saved = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    if (saved.clientId) discordClientId = saved.clientId;
    if (saved.clientSecret) discordClientSecret = saved.clientSecret;
  }
} catch (e) {
  // ignore
}

// Determine base URL
function getBaseUrl(req: expressApp.Request): string {
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const host = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${protocol}://${host}`;
}

// Check Discord OAuth configuration status & return redirect URI
app.get('/api/auth/discord/config', (req, res) => {
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/callback/discord`;
  res.json({
    configured: Boolean(discordClientId && discordClientSecret),
    clientId: discordClientId || null,
    redirectUri,
  });
});

// Update Discord OAuth credentials from Admin Panel or Modal
app.post('/api/auth/discord/config', (req, res) => {
  const { clientId, clientSecret } = req.body;
  if (typeof clientId === 'string') discordClientId = clientId.trim();
  if (typeof clientSecret === 'string') discordClientSecret = clientSecret.trim();

  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ clientId: discordClientId, clientSecret: discordClientSecret }, null, 2));
  } catch (e) {
    // ignore
  }

  res.json({
    success: true,
    configured: Boolean(discordClientId && discordClientSecret),
    clientId: discordClientId,
  });
});

// Generate authorization URL for Discord OAuth
app.get('/api/auth/discord/url', (req, res) => {
  const reqRedirect = req.query.redirect_uri as string | undefined;
  const baseUrl = getBaseUrl(req);
  const redirectUri = reqRedirect || `${baseUrl}/api/auth/callback/discord`;

  if (!discordClientId) {
    return res.status(400).json({
      error: 'DISCORD_CLIENT_ID no configurado',
      configured: false,
      redirectUri,
    });
  }

  const params = new URLSearchParams({
    client_id: discordClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify guilds',
    prompt: 'consent',
  });

  const url = `https://discord.com/oauth2/authorize?${params.toString()}`;
  res.json({ url, redirectUri, configured: true });
});

// Discord OAuth Callback Handler - Handles official Discord OAuth redirection
app.get(['/api/auth/callback/discord', '/api/auth/callback/discord/'], async (req, res) => {
  const { code, error, error_description } = req.query;
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/callback/discord`;

  if (error) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8" /><title>Discord OAuth</title></head>
        <body style="background:#07080c;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;padding:28px;max-width:400px;background:#170f14;border-radius:24px;border:1px solid #ef4444;">
            <div style="font-size:36px;margin-bottom:8px;">⚠️</div>
            <h3 style="color:#ef4444;margin:0 0 8px 0;font-size:18px;">Autorización Cancelada</h3>
            <p style="font-size:13px;color:#94a3b8;margin:0;">${error_description || error}</p>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({ type: 'DISCORD_OAUTH_ERROR', error: '${error}' }, '*');
              }
            } catch (e) {}
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send('No authorization code provided by Discord.');
  }

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: discordClientId,
        client_secret: discordClientSecret,
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('Discord OAuth Token Exchange Error:', tokenResponse.status, errText);
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8" /><title>Error Discord OAuth</title></head>
          <body style="background:#07080c;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
            <div style="text-align:center;padding:28px;max-width:440px;background:#14121a;border-radius:24px;border:1px solid #f43f5e;box-shadow:0 10px 40px rgba(0,0,0,0.8);">
              <div style="font-size:36px;margin-bottom:8px;">❌</div>
              <h3 style="color:#f43f5e;margin:0 0 8px 0;font-size:18px;">Error al verificar con Discord</h3>
              <p style="font-size:13px;color:#cbd5e1;margin:0 0 14px 0;">Discord rechazó el canje del código de autorización.</p>
              <div style="background:#1f1b2b;padding:12px;border-radius:12px;font-family:monospace;font-size:11px;color:#fca5a5;word-break:break-all;text-align:left;margin-bottom:14px;">
                ${errText}
              </div>
              <p style="font-size:12px;color:#94a3b8;margin:0;">Verifica que el Client Secret y la Redirect URI en el <b>Discord Developer Portal</b> coincidan exactamente con esta app.</p>
            </div>
            <script>
              try {
                if (window.opener) {
                  window.opener.postMessage({ type: 'DISCORD_OAUTH_ERROR', error: ${JSON.stringify(errText)} }, '*');
                }
              } catch (e) {}
            </script>
          </body>
        </html>
      `);
    }

    const tokenData = await tokenResponse.json();
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('No se pudo obtener el perfil de usuario de Discord');
    }

    const discordProfile = await userResponse.json();

    // Construct authentic Discord avatar URL
    let avatarUrl = '';
    if (discordProfile.avatar) {
      const isAnimated = discordProfile.avatar.startsWith('a_');
      avatarUrl = `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.${isAnimated ? 'gif' : 'png'}?size=256`;
    } else {
      const defaultIndex = (parseInt(discordProfile.id || '0', 10) >> 22) % 6;
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
    }

    const userPayload = {
      id: discordProfile.id,
      username: discordProfile.username,
      displayName: discordProfile.global_name || discordProfile.username,
      avatar: avatarUrl,
      role: 'Ciudadano PE:RP',
      discriminator: discordProfile.discriminator || '0',
      email: discordProfile.email,
    };

    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Autenticación PE:RP Exitosa</title>
        </head>
        <body style="background:#07080c;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;padding:28px;max-width:380px;background:#0f121d;border-radius:24px;border:1px solid #10b981;box-shadow:0 10px 40px rgba(0,0,0,0.8);">
            <img src="${avatarUrl}" alt="Avatar" style="width:72px;height:72px;border-radius:50%;border:2px solid #10b981;margin-bottom:12px;object-fit:cover;display:inline-block;" />
            <h3 style="color:#10b981;margin:0 0 6px 0;font-size:18px;">¡Sesión Oficial Iniciada!</h3>
            <p style="font-size:14px;color:#cbd5e1;margin:0;">Bienvenido, <b style="color:#fff;">${userPayload.displayName}</b></p>
            <p style="font-size:12px;color:#64748b;margin-top:12px;">Conectando con PE:RP Streets...</p>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'DISCORD_OAUTH_SUCCESS',
                  user: ${JSON.stringify(userPayload)}
                }, '*');
                setTimeout(() => window.close(), 700);
              } else {
                window.location.href = '/?discord_user=' + encodeURIComponent(JSON.stringify(${JSON.stringify(userPayload)}));
              }
            } catch (e) {
              window.location.href = '/?discord_user=' + encodeURIComponent(JSON.stringify(${JSON.stringify(userPayload)}));
            }
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Fatal Discord OAuth callback error:', err);
    return res.status(500).send('Error interno en autenticación de Discord');
  }
});

// ==========================================
// EMERGENCY RESPONSE: LIBERTY COUNTY (ER:LC) API
// ==========================================
const ERLC_FILE = path.resolve(__dirname, '.erlc-config.json');
let erlcServerKey = process.env.ERLC_SERVER_KEY || '';

try {
  if (fs.existsSync(ERLC_FILE)) {
    const saved = JSON.parse(fs.readFileSync(ERLC_FILE, 'utf-8'));
    if (saved.serverKey) erlcServerKey = saved.serverKey;
  }
} catch (e) {
  // ignore
}

let erlcCache: { timestamp: number; data: any } | null = null;
const CACHE_TTL_MS = 15000; // 15 seconds cache to respect PRC rate limits

// Get current ER:LC server status & players
app.get('/api/erlc/server', async (req, res) => {
  if (!erlcServerKey) {
    return res.json({
      configured: false,
      message: 'Server-Key de ER:LC no configurada aún. Ingresa tu key en el panel de administración.',
    });
  }

  // Check cache
  const now = Date.now();
  if (erlcCache && now - erlcCache.timestamp < CACHE_TTL_MS) {
    return res.json({
      configured: true,
      cached: true,
      ...erlcCache.data,
    });
  }

  try {
    const response = await fetch('https://api.policeroleplay.community/v1/server', {
      method: 'GET',
      headers: {
        'Server-Key': erlcServerKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        configured: true,
        error: `Error al consultar API ER:LC (${response.status})`,
        details: errText,
      });
    }

    const data = await response.json();
    const result = {
      name: data.Name || 'PE:RP Servidor',
      ownerId: data.OwnerId,
      currentPlayers: Number(data.CurrentPlayers) || 0,
      maxPlayers: Number(data.MaxPlayers) || 50,
      joinKey: data.JoinKey || '',
      accVerifiedReq: data.AccVerifiedReq || '',
      teamBalance: Boolean(data.TeamBalance),
      updatedAt: new Date().toISOString(),
    };

    erlcCache = {
      timestamp: now,
      data: result,
    };

    return res.json({
      configured: true,
      ...result,
    });
  } catch (err: any) {
    return res.status(500).json({
      configured: true,
      error: 'Error de conexión con la API de ER:LC',
      details: err.message,
    });
  }
});

// Update or test ER:LC Server Key from Admin Panel
app.post('/api/erlc/config', async (req, res) => {
  const { serverKey } = req.body;
  if (typeof serverKey !== 'string') {
    return res.status(400).json({ error: 'Falta serverKey' });
  }

  const cleanKey = serverKey.trim();
  erlcServerKey = cleanKey;
  erlcCache = null; // Invalidate cache

  try {
    fs.writeFileSync(ERLC_FILE, JSON.stringify({ serverKey: erlcServerKey }, null, 2));
  } catch (e) {
    // ignore
  }

  if (!cleanKey) {
    return res.json({
      success: true,
      configured: false,
      message: 'Server-Key eliminada',
    });
  }

  // Test the key against ER:LC API
  try {
    const testResp = await fetch('https://api.policeroleplay.community/v1/server', {
      method: 'GET',
      headers: {
        'Server-Key': cleanKey,
        Accept: 'application/json',
      },
    });

    if (testResp.ok) {
      const data = await testResp.json();
      return res.json({
        success: true,
        configured: true,
        valid: true,
        server: {
          name: data.Name,
          currentPlayers: data.CurrentPlayers,
          maxPlayers: data.MaxPlayers,
          joinKey: data.JoinKey,
        },
      });
    } else {
      const errText = await testResp.text();
      return res.json({
        success: true,
        configured: true,
        valid: false,
        status: testResp.status,
        message: 'La key fue guardada, pero ER:LC devolvió un error de autenticación. Verifica que sea correcta en el panel de tu servidor ER:LC.',
        details: errText,
      });
    }
  } catch (err: any) {
    return res.json({
      success: true,
      configured: true,
      valid: false,
      message: 'Key guardada, pero no se pudo conectar temporalmente con los servidores de ER:LC.',
    });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(expressApp.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
