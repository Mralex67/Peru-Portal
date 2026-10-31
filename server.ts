import expressApp from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const archiver = require('archiver');
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = expressApp();
const PORT = process.env.PORT || 3000;

// Universal CORS middleware to allow requests from GitHub Pages and Discloud
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(expressApp.json({ limit: '50mb' }));
app.use(expressApp.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// SERVER ASSETS & CONFIGURATION PERSISTENCE
// ==========================================
const UPLOADS_DIR = path.resolve(__dirname, 'public/uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const ASSETS_DIR = path.resolve(__dirname, 'public/assets');

app.use('/assets', expressApp.static(ASSETS_DIR, {
  maxAge: '1h',
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));
app.use('/uploads', expressApp.static(UPLOADS_DIR, {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));
app.use(expressApp.static(PUBLIC_DIR, {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

const CONFIG_FILE = path.resolve(__dirname, '.data/server_config.json');

// Get persisted server configuration (Logos, Texts, Socials, Status)
app.get('/api/server-config', (req, res) => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      return res.json({ success: true, config: data });
    }
    return res.json({ success: true, config: null });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Save updated server configuration permanently to disk
app.post('/api/server-config', (req, res) => {
  try {
    let newConfig = req.body;
    if (!newConfig || typeof newConfig !== 'object') {
      return res.status(400).json({ error: 'Configuración inválida' });
    }
    if (newConfig.config && typeof newConfig.config === 'object') {
      newConfig = newConfig.config;
    }
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    let existing: any = {};
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        existing = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
        if (existing.config && typeof existing.config === 'object') {
          existing = existing.config;
        }
      } catch {}
    }
    const merged = { ...existing, ...newConfig, updatedAt: new Date().toISOString() };
    delete (merged as any).config; // prevent nested config property
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
    return res.json({ success: true, config: merged });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// SUPABASE SHARED CONFIGURATION & LIVE SYNC
// ==========================================
const SUPABASE_FILE = path.resolve(__dirname, '.data/supabase_config.json');
let serverSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
let serverSupabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

try {
  if (fs.existsSync(SUPABASE_FILE)) {
    const s = JSON.parse(fs.readFileSync(SUPABASE_FILE, 'utf-8'));
    if (s.url) serverSupabaseUrl = s.url;
    if (s.anonKey) serverSupabaseAnonKey = s.anonKey;
  }
} catch (e) {}

let serverSupabaseClient: any = null;
function getServerSupabase() {
  if (serverSupabaseClient) return serverSupabaseClient;
  if (serverSupabaseUrl && serverSupabaseAnonKey) {
    try {
      serverSupabaseClient = createClient(serverSupabaseUrl, serverSupabaseAnonKey, {
        auth: { persistSession: false },
      });
      return serverSupabaseClient;
    } catch (e) {
      console.error('Error inicializando Supabase en el servidor:', e);
    }
  }
  return null;
}

// Get shared Supabase credentials for web clients
app.get('/api/supabase/config', (req, res) => {
  res.json({
    configured: Boolean(serverSupabaseUrl && serverSupabaseAnonKey),
    url: serverSupabaseUrl,
    anonKey: serverSupabaseAnonKey,
  });
});

// Save Supabase credentials from admin panel permanently
app.post('/api/supabase/config', (req, res) => {
  try {
    const { url, anonKey } = req.body;
    if (typeof url === 'string') serverSupabaseUrl = url.trim();
    if (typeof anonKey === 'string') serverSupabaseAnonKey = anonKey.trim();

    fs.mkdirSync(path.dirname(SUPABASE_FILE), { recursive: true });
    fs.writeFileSync(
      SUPABASE_FILE,
      JSON.stringify({ url: serverSupabaseUrl, anonKey: serverSupabaseAnonKey, updatedAt: new Date().toISOString() }, null, 2)
    );

    // Also sync into discord-bot/config.env if exists
    try {
      const botEnvFile = path.resolve(__dirname, 'discord-bot/config.env');
      if (fs.existsSync(botEnvFile)) {
        let content = fs.readFileSync(botEnvFile, 'utf-8');
        content = content.replace(/^SUPABASE_URL=.*$/m, `SUPABASE_URL=${serverSupabaseUrl}`);
        content = content.replace(/^SUPABASE_ANON_KEY=.*$/m, `SUPABASE_ANON_KEY=${serverSupabaseAnonKey}`);
        fs.writeFileSync(botEnvFile, content);
      }
    } catch (botErr) {
      console.warn('Notice updating discord-bot/config.env:', botErr);
    }

    serverSupabaseClient = null;
    getServerSupabase();

    return res.json({
      success: true,
      configured: Boolean(serverSupabaseUrl && serverSupabaseAnonKey),
      url: serverSupabaseUrl,
      anonKey: serverSupabaseAnonKey,
      message: 'Credenciales de Supabase guardadas y sincronizadas para todos los navegadores y el Bot.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint to save original uploaded photos permanently to public/uploads
app.post('/api/upload-photo', (req, res) => {
  try {
    const { imageBase64, extension = 'png' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Falta imagen' });
    }
    const mimeMatch = imageBase64.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,/);
    const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    let safeExt = extension;
    if (mimeMatch && mimeMatch[1]) {
      safeExt = mimeMatch[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
    }
    safeExt = (safeExt || 'png').replace(/[^a-zA-Z0-9]/g, '');
    const filename = `foto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${safeExt || 'png'}`;
    
    // Save to public/uploads so it is always statically accessible in dev and prod
    const publicFilePath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(publicFilePath, buffer);

    // Also copy to src/assets/images for backwards compatibility if needed
    try {
      const srcImagesDir = path.resolve(__dirname, 'src/assets/images');
      if (fs.existsSync(srcImagesDir)) {
        fs.writeFileSync(path.join(srcImagesDir, filename), buffer);
      }
    } catch {}

    res.json({
      success: true,
      url: `/uploads/${filename}`,
      filename,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error al guardar foto' });
  }
});

// ==========================================
// ALBUM PHOTOS PERSISTENCE
// ==========================================
const ALBUM_FILE = path.resolve(__dirname, '.data/album_photos.json');
const DEFAULT_ALBUM = [
  { id: 'album-photo-1', src: '/assets/album/album_1.webp', date: 'Patrullaje Urbano PE:RP' },
  { id: 'album-photo-2', src: '/assets/album/album_2.webp', date: 'Operativo Policial ERLC' },
  { id: 'album-photo-3', src: '/assets/album/album_3.webp', date: 'Calles del Servidor' },
  { id: 'album-photo-4', src: '/assets/album/album_4.webp', date: 'Patrulla Nocturna' },
];

app.get('/api/album-photos', (req, res) => {
  try {
    if (fs.existsSync(ALBUM_FILE)) {
      const data = JSON.parse(fs.readFileSync(ALBUM_FILE, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) {
        const sanitized = data.map((item, idx) => {
          if (!item.src || item.src.includes('discordapp.com') || item.src.includes('discord.com/attachments')) {
            const fallbackIdx = (idx % 4) + 1;
            return { ...item, src: `/assets/album/album_${fallbackIdx}.webp` };
          }
          return item;
        });
        return res.json({ success: true, photos: sanitized });
      }
    }
    return res.json({ success: true, photos: DEFAULT_ALBUM });
  } catch (err: any) {
    return res.json({ success: true, photos: DEFAULT_ALBUM });
  }
});

app.post('/api/album-photos', (req, res) => {
  try {
    const { photos } = req.body;
    if (Array.isArray(photos)) {
      fs.mkdirSync(path.dirname(ALBUM_FILE), { recursive: true });
      fs.writeFileSync(ALBUM_FILE, JSON.stringify(photos, null, 2));
      return res.json({ success: true, photos });
    }
    return res.status(400).json({ success: false, error: 'Lista de fotos inválida' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint to proxy Roblox avatar lookup
app.get('/api/roblox/avatar/:username', async (req, res) => {
  try {
    const { username } = req.params;
    let clean = (username || '').trim().replace(/^@/, '');

    // Extract ID if full profile link was provided
    const profileMatch = clean.match(/roblox\.com\/users\/(\d+)/i);
    if (profileMatch) {
      clean = profileMatch[1];
    }

    let uId = clean;
    let displayName = clean;

    if (!/^\d+$/.test(clean)) {
      // 1. Try exact username lookup
      try {
        const userRes = await fetch('https://users.roblox.com/v1/usernames/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernames: [clean], excludeBannedUsers: false }),
        });
        if (userRes.ok) {
          const userData: any = await userRes.json();
          if (userData.data && userData.data.length > 0) {
            uId = userData.data[0].id.toString();
            displayName = userData.data[0].displayName || userData.data[0].name;
          }
        }
      } catch {}

      // 2. If not resolved, try user search API
      if (!/^\d+$/.test(uId) || uId === clean) {
        try {
          const searchRes = await fetch(
            `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(clean)}&limit=10`
          );
          if (searchRes.ok) {
            const searchData: any = await searchRes.json();
            if (searchData.data && searchData.data.length > 0) {
              const matched = searchData.data.find(
                (u: any) =>
                  u.name?.toLowerCase() === clean.toLowerCase() ||
                  u.displayName?.toLowerCase() === clean.toLowerCase()
              ) || searchData.data[0];
              uId = matched.id.toString();
              displayName = matched.displayName || matched.name;
            }
          }
        } catch {}
      }
    }

    if (!/^\d+$/.test(uId)) {
      return res.status(404).json({ error: `Usuario "${clean}" no encontrado en Roblox.` });
    }

    // Default fallback headshot URL for Roblox
    let avatarUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${uId}&width=420&height=420&format=png`;

    try {
      const bustRes = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-bust?userIds=${uId}&size=420x420&format=Png&isCircular=false`
      );
      if (bustRes.ok) {
        const bustData: any = await bustRes.json();
        if (bustData.data && bustData.data[0]?.imageUrl) {
          avatarUrl = bustData.data[0].imageUrl;
        }
      } else {
        const thumbRes = await fetch(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${uId}&size=420x420&format=Png&isCircular=false`
        );
        if (thumbRes.ok) {
          const thumbData: any = await thumbRes.json();
          if (thumbData.data && thumbData.data[0]?.imageUrl) {
            avatarUrl = thumbData.data[0].imageUrl;
          }
        }
      }
    } catch {}

    res.json({
      userId: uId.toString(),
      displayName,
      avatarUrl,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error consultando avatar de Roblox' });
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
  fs.mkdirSync(path.dirname(ERLC_FILE), { recursive: true });
  if (fs.existsSync(ERLC_FILE)) {
    const saved = JSON.parse(fs.readFileSync(ERLC_FILE, 'utf-8'));
    if (saved.serverKey) erlcServerKey = saved.serverKey;
  }
} catch (e) {
  // ignore
}

let erlcCache: { timestamp: number; data: any } | null = null;
const CACHE_TTL_MS = 15000; // 15 seconds cache to respect PRC rate limits

// Helper function to query ER:LC API across official v2 and v1 endpoints
// Grounded in official documentation at apidocs.erlc.gg / api.erlc.gg
async function queryErlcApi(key: string) {
  let cleanKey = key.trim().replace(/^['"]|['"]$/g, '');
  if (cleanKey.toLowerCase().startsWith('server-key:')) {
    cleanKey = cleanKey.slice(11).trim();
  }
  if (cleanKey.toLowerCase().startsWith('bearer ')) {
    cleanKey = cleanKey.slice(7).trim();
  }

  // Official documentation endpoints:
  // v2 with ?players=true gives both CurrentPlayers and the full active Players array
  const endpoints = [
    'https://api.erlc.gg/v2/server?players=true',
    'https://api.erlc.gg/v2/server',
    'https://api.erlc.gg/v1/server',
    'https://api.erlc.gg/v1/server/players',
  ];

  let lastStatus = 0;
  let lastError = '';

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'server-key': cleanKey,
          Accept: 'application/json',
        },
      });

      lastStatus = response.status;
      if (response.ok) {
        const data = await response.json();

        // ER:LC v2 returns an object; v1 /players returns an array
        let currentPlayers = 0;
        let maxPlayers = 50;
        let serverName = 'PE:RP Servidor';
        let joinKey = '';
        let accVerifiedReq = '';
        let teamBalance = true;
        let playersList: any[] = [];

        if (Array.isArray(data)) {
          // Array of players from /players endpoint
          playersList = data;
          currentPlayers = data.length;
        } else if (typeof data === 'object' && data !== null) {
          if (Array.isArray(data.Players)) {
            playersList = data.Players;
          } else if (Array.isArray(data.players)) {
            playersList = data.players;
          }

          if (typeof data.CurrentPlayers === 'number') {
            currentPlayers = data.CurrentPlayers;
          } else if (typeof data.currentPlayers === 'number') {
            currentPlayers = data.currentPlayers;
          } else if (typeof data.PlayerCount === 'number') {
            currentPlayers = data.PlayerCount;
          } else if (playersList.length > 0) {
            currentPlayers = playersList.length;
          }

          if (typeof data.MaxPlayers === 'number') {
            maxPlayers = data.MaxPlayers;
          } else if (typeof data.maxPlayers === 'number') {
            maxPlayers = data.maxPlayers;
          }

          serverName = data.Name || data.name || serverName;
          joinKey = data.JoinKey || data.joinKey || '';
          accVerifiedReq = data.AccVerifiedReq || data.accVerifiedReq || '';
          teamBalance = Boolean(data.TeamBalance ?? data.teamBalance ?? true);
        }

        return {
          ok: true,
          status: response.status,
          server: {
            name: serverName,
            ownerId: data.OwnerId || data.ownerId,
            currentPlayers,
            maxPlayers,
            joinKey,
            accVerifiedReq,
            teamBalance,
            isOnline: true,
            playersList,
            updatedAt: new Date().toISOString(),
          },
        };
      } else {
        const errorText = await response.text();
        lastError = errorText;

        // Check for specific ER:LC error codes
        try {
          const errObj = JSON.parse(errorText);
          // Code 3002: Server Offline / 0 players in Roblox (instance is sleeping)
          if (
            errObj.code === 3002 ||
            (typeof errObj.message === 'string' && errObj.message.toLowerCase().includes('server offline'))
          ) {
            return {
              ok: true,
              status: 200,
              isIdle: true,
              server: {
                name: 'PE:RP Servidor (ER:LC)',
                ownerId: 0,
                currentPlayers: 0,
                maxPlayers: 50,
                joinKey: '',
                accVerifiedReq: '',
                teamBalance: true,
                isOnline: false,
                isIdle: true,
                playersList: [],
                statusNote: 'Servidor sin jugadores activos en este momento (0 conectados)',
                updatedAt: new Date().toISOString(),
              },
            };
          }
        } catch {}
      }
    } catch (err: any) {
      lastError = err.message || 'Error de red con ER:LC';
    }
  }

  return {
    ok: false,
    status: lastStatus,
    error: lastError,
  };
}

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
    const result = await queryErlcApi(erlcServerKey);

    if (result.ok && result.server) {
      erlcCache = {
        timestamp: now,
        data: result.server,
      };

      return res.json({
        configured: true,
        ...result.server,
      });
    }

    let parsedError = result.error;
    if (result.error) {
      try {
        const j = JSON.parse(result.error);
        if (j.message) parsedError = j.message;
      } catch {}
    }

    return res.status(result.status || 500).json({
      configured: true,
      error: `Error al consultar API ER:LC (${result.status || '500'})`,
      message: parsedError,
      details: result.error,
    });
  } catch (err: any) {
    return res.status(500).json({
      configured: true,
      error: 'Error de conexión con la API de ER:LC',
      details: err.message,
    });
  }
});

// Check ER:LC configuration status & get saved key
app.get('/api/erlc/config', (req, res) => {
  return res.json({
    configured: Boolean(erlcServerKey),
    serverKey: erlcServerKey,
  });
});

// Update or test ER:LC Server Key from Admin Panel
app.post('/api/erlc/config', async (req, res) => {
  const { serverKey } = req.body;
  if (typeof serverKey !== 'string') {
    return res.status(400).json({ error: 'Falta serverKey' });
  }

  let cleanKey = serverKey.trim().replace(/^['"]|['"]$/g, '');
  if (cleanKey.toLowerCase().startsWith('server-key:')) {
    cleanKey = cleanKey.slice(11).trim();
  }
  if (cleanKey.toLowerCase().startsWith('bearer ')) {
    cleanKey = cleanKey.slice(7).trim();
  }

  erlcServerKey = cleanKey;
  erlcCache = null; // Invalidate cache

  try {
    fs.mkdirSync(path.dirname(ERLC_FILE), { recursive: true });
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

  // Test the key against ER:LC API (api.erlc.gg)
  try {
    const result = await queryErlcApi(cleanKey);

    if (result.ok && result.server) {
      let msg = `¡Conexión Exitosa con ER:LC! Servidor: "${result.server.name}" con ${result.server.currentPlayers}/${result.server.maxPlayers} jugadores en vivo.`;
      if (result.isIdle || result.server.isOnline === false) {
        msg = `¡Server-Key de ER:LC validada con éxito! Actualmente el servidor está en espera con 0 jugadores en Roblox. Cuando ingresen jugadores, la web marcará automáticamente la cantidad en vivo.`;
      }

      return res.json({
        success: true,
        configured: true,
        valid: true,
        isIdle: Boolean(result.isIdle),
        message: msg,
        server: result.server,
      });
    } else {
      let parsedError = result.error;
      if (result.error) {
        try {
          const j = JSON.parse(result.error);
          if (j.code === 2002) {
            parsedError = 'Server-Key inválida o expirada. Entra a tu servidor en Roblox > menú M > Settings > Developer/API y copia tu Server-Key.';
          } else if (j.code === 2000) {
            parsedError = 'No se proporcionó la Server-Key requerida.';
          } else if (j.code === 2005) {
            parsedError = 'Acceso denegado por ER:LC. Verifica que tu servidor tenga el API Pack activo en Roblox.';
          } else if (j.message) {
            parsedError = j.message;
          }
        } catch {}
      }

      return res.json({
        success: true,
        configured: true,
        valid: false,
        status: result.status,
        message: `ER:LC respondió: ${parsedError || 'Autenticación fallida. Verifica tu Server Key en ER:LC Settings > API.'}`,
        details: result.error,
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

// ==========================================
// BANCO YA P & DNI BOT API (FOR DISCORD BOT)
// ==========================================
const BANK_FILE = path.resolve(__dirname, '.data/bank_system.json');

interface BankSystemData {
  dnis: any[];
  accounts: any[];
  transactions: any[];
}

function loadBankSystem(): BankSystemData {
  try {
    if (!fs.existsSync(BANK_FILE)) {
      const initial: BankSystemData = {
        dnis: [],
        accounts: [],
        transactions: [],
      };
      const dir = path.dirname(BANK_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(BANK_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    const raw = fs.readFileSync(BANK_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading bank system data:', e);
    return { dnis: [], accounts: [], transactions: [] };
  }
}

function saveBankSystem(data: BankSystemData) {
  try {
    const dir = path.dirname(BANK_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BANK_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error saving bank system data:', e);
  }
}

// Helper to resolve Roblox avatar
async function fetchRobloxUserAvatar(usernameOrId: string) {
  const clean = usernameOrId.trim().replace(/^@/, '');
  let uId = clean;
  let displayName = clean;

  const defaultAvatar =
    'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-310966282D3529E36976BF6B07B1DC90-Png/420/420/AvatarHeadshot/Png/noFilter';

  try {
    if (!/^\d+$/.test(clean)) {
      const userRes = await fetch('https://users.roblox.com/v1/usernames/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: [clean], excludeBannedUsers: false }),
      });
      if (userRes.ok) {
        const userData: any = await userRes.json();
        if (userData.data && userData.data.length > 0) {
          uId = userData.data[0].id.toString();
          displayName = userData.data[0].displayName || userData.data[0].name;
        }
      }
    }

    const thumbRes = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${uId}&size=420x420&format=Png&isCircular=false`
    );
    if (thumbRes.ok) {
      const thumbData: any = await thumbRes.json();
      if (thumbData.data && thumbData.data[0]?.imageUrl) {
        return {
          userId: uId,
          displayName,
          avatarUrl: thumbData.data[0].imageUrl,
        };
      }
    }
  } catch (e) {
    // fallback
  }

  return {
    userId: uId,
    displayName,
    avatarUrl: defaultAvatar,
  };
}

// 0. Sync DNI from Web App to Server & Discord Bot
app.post('/api/bot/dni/sync', async (req, res) => {
  try {
    const dni = req.body;
    if (!dni || (!dni.dniNumber && !dni.robloxUsername)) {
      return res.status(400).json({ success: false, error: 'DNI inválido para sincronización.' });
    }

    const data = loadBankSystem();

    const cleanRoblox = (dni.robloxUsername || '').trim();
    const cleanDni = (dni.dniNumber || '').trim();
    const cleanDiscordId = (dni.discordId || '').trim();

    const existingIndex = data.dnis.findIndex(
      (d) =>
        (cleanDni && d.dniNumber === cleanDni) ||
        (cleanDiscordId && d.discordId === cleanDiscordId) ||
        (cleanRoblox && d.robloxUsername?.toLowerCase() === cleanRoblox.toLowerCase())
    );

    const formattedDni = {
      dniNumber: cleanDni || (Math.floor(10000000 + Math.random() * 90000000)).toString(),
      discordId: cleanDiscordId || `web-${Date.now()}`,
      robloxUsername: cleanRoblox || 'Ciudadano',
      fullName: (dni.fullName || `${dni.firstSurname || ''} ${dni.secondSurname || ''} ${dni.givenNames || ''}`).trim().toUpperCase(),
      firstSurname: (dni.firstSurname || '').toUpperCase(),
      secondSurname: (dni.secondSurname || '').toUpperCase(),
      prenames: (dni.givenNames || dni.prenames || '').toUpperCase(),
      birthDate: dni.birthDate || '2000-01-01',
      gender: (dni.gender || 'M').toUpperCase(),
      department: (dni.department || 'LIMA').toUpperCase(),
      province: (dni.province || 'LIMA').toUpperCase(),
      district: (dni.district || 'MIRAFLORES').toUpperCase(),
      photoUrl: dni.photoUrl || '',
      status: dni.status || 'active',
      createdAt: dni.createdAt || new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      data.dnis[existingIndex] = { ...data.dnis[existingIndex], ...formattedDni };
    } else {
      data.dnis.unshift(formattedDni);
    }

    // Auto-create or sync Banco YA P account
    let accIndex = data.accounts.findIndex(
      (a) =>
        (formattedDni.dniNumber && a.dniNumber === formattedDni.dniNumber) ||
        (formattedDni.discordId && a.discordId === formattedDni.discordId) ||
        (formattedDni.robloxUsername && a.robloxUsername?.toLowerCase() === formattedDni.robloxUsername.toLowerCase())
    );

    if (accIndex >= 0) {
      data.accounts[accIndex] = {
        ...data.accounts[accIndex],
        dniNumber: formattedDni.dniNumber,
        discordId: formattedDni.discordId,
        robloxUsername: formattedDni.robloxUsername,
        fullName: formattedDni.fullName,
        avatarUrl: formattedDni.photoUrl || data.accounts[accIndex].avatarUrl,
        updatedAt: new Date().toISOString(),
      };
    } else {
      const newAcc = {
        id: `acc-${Date.now()}`,
        dniNumber: formattedDni.dniNumber,
        discordId: formattedDni.discordId,
        robloxUsername: formattedDni.robloxUsername,
        fullName: formattedDni.fullName,
        avatarUrl: formattedDni.photoUrl,
        bankBalance: 1000.0,
        cashBalance: 250.0,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      data.accounts.unshift(newAcc);
      data.transactions.unshift({
        id: `tx-${Date.now()}`,
        operationNumber: `OP-${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'welcome_bonus',
        receiverDni: formattedDni.dniNumber,
        receiverRoblox: formattedDni.robloxUsername,
        receiverName: formattedDni.fullName,
        receiverAvatar: formattedDni.photoUrl,
        amount: 1000.0,
        description: 'Bono de Apertura y Bienvenida a YA P PE:RP',
        timestamp: new Date().toISOString(),
      });
    }

    saveBankSystem(data);
    return res.json({
      success: true,
      message: 'DNI y Banco YA P sincronizados en vivo con el Bot de Discord.',
      dni: formattedDni,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 1. Create Citizen DNI via Bot or Web
app.post('/api/bot/dni/create', async (req, res) => {
  try {
    const {
      discordId = `bot-${Date.now()}`,
      robloxUsername,
      prenames,
      firstSurname,
      secondSurname,
      birthDate = '2000-01-01',
      gender = 'M',
      department = 'LIMA',
      province = 'LIMA',
      district = 'MIRAFLORES',
    } = req.body;

    if (!robloxUsername || !prenames || !firstSurname || !secondSurname) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos obligatorios: robloxUsername, prenames, firstSurname, secondSurname.',
      });
    }

    const data = loadBankSystem();

    // Check if user already has a DNI registered by discordId or robloxUsername
    const existing = data.dnis.find(
      (d) =>
        d.discordId === discordId ||
        d.robloxUsername.toLowerCase() === robloxUsername.toLowerCase()
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        error: `El usuario ya cuenta con un DNI emitido: ${existing.dniNumber} (@${existing.robloxUsername})`,
        dni: existing,
      });
    }

    // Resolve avatar
    const robloxInfo = await fetchRobloxUserAvatar(robloxUsername);

    // Generate random 8-digit DNI number
    let dniNumber = '';
    do {
      dniNumber = (Math.floor(10000000 + Math.random() * 90000000)).toString();
    } while (data.dnis.some((d) => d.dniNumber === dniNumber));

    const fullName = `${firstSurname.toUpperCase()} ${secondSurname.toUpperCase()} ${prenames.toUpperCase()}`.trim();

    const newDni = {
      dniNumber,
      discordId,
      robloxUsername: robloxUsername.trim(),
      fullName,
      firstSurname: firstSurname.toUpperCase(),
      secondSurname: secondSurname.toUpperCase(),
      prenames: prenames.toUpperCase(),
      birthDate,
      gender: gender.toUpperCase(),
      department: department.toUpperCase(),
      province: province.toUpperCase(),
      district: district.toUpperCase(),
      photoUrl: robloxInfo.avatarUrl,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    data.dnis.unshift(newDni);

    // Also auto-register a Banco YA P account with welcome bonus
    let account = data.accounts.find((a) => a.dniNumber === dniNumber || a.discordId === discordId);
    if (!account) {
      account = {
        id: `acc-${Date.now()}`,
        dniNumber,
        discordId,
        robloxUsername: robloxUsername.trim(),
        fullName,
        avatarUrl: robloxInfo.avatarUrl,
        bankBalance: 50.0,
        cashBalance: 20.0,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      data.accounts.unshift(account);

      data.transactions.unshift({
        id: `tx-${Date.now()}`,
        operationNumber: `OP-${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'welcome_bonus',
        receiverDni: dniNumber,
        receiverRoblox: robloxUsername.trim(),
        receiverName: fullName,
        receiverAvatar: robloxInfo.avatarUrl,
        amount: 50.0,
        description: 'Bono de Apertura y Bienvenida a YA P PE:RP',
        timestamp: new Date().toISOString(),
      });
    }

    saveBankSystem(data);

    res.json({
      success: true,
      message: 'DNI creado y cuenta Banco YA P habilitada exitosamente.',
      dni: newDni,
      account,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error registrando DNI' });
  }
});

// 2. Lookup Citizen DNI (by DNI number, Discord ID, or Roblox username)
app.get('/api/bot/dni/:identifier', async (req, res) => {
  const { identifier } = req.params;
  const clean = identifier.trim().toLowerCase().replace(/^@/, '');
  const data = loadBankSystem();

  let found = data.dnis.find(
    (d) =>
      d.dniNumber?.toLowerCase() === clean ||
      d.discordId?.toLowerCase() === clean ||
      d.robloxUsername?.toLowerCase() === clean
  );

  // If not found in local system, query Supabase cloud database
  const supa = getServerSupabase();
  if (supa && !found) {
    try {
      const { data: supaRow } = await supa
        .from('peru_dnis')
        .select('*')
        .or(`discord_id.eq.${clean},roblox_username.ilike.${clean},dni_number.eq.${clean},discord_username.ilike.${clean}`)
        .maybeSingle();

      if (supaRow) {
        found = {
          dniNumber: supaRow.dni_number,
          discordId: supaRow.discord_id,
          robloxUsername: supaRow.roblox_username,
          fullName: supaRow.full_name,
          firstSurname: supaRow.first_surname || '',
          secondSurname: supaRow.second_surname || '',
          prenames: supaRow.given_names || '',
          birthDate: supaRow.birth_date || '2000-01-01',
          gender: supaRow.gender || 'M',
          civilStatus: supaRow.civil_status || 'SOLTERO',
          organDonation: supaRow.organ_donation || 'NO',
          department: 'LIMA',
          province: 'LIMA',
          district: 'MIRAFLORES',
          photoUrl: supaRow.photo_url || '',
          status: supaRow.status || 'active',
          createdAt: supaRow.created_at || new Date().toISOString(),
        };

        // Cache into local database for fast subsequent loads
        const idx = data.dnis.findIndex((d) => d.dniNumber === found.dniNumber);
        if (idx >= 0) {
          data.dnis[idx] = found;
        } else {
          data.dnis.unshift(found);
        }
        saveBankSystem(data);
      }
    } catch (supaErr) {
      console.warn('Aviso consultando Supabase en backend para DNI:', supaErr);
    }
  }

  if (!found) {
    return res.json({
      success: true,
      found: false,
      message: `No se encontró ningún DNI para el identificador: ${identifier}`,
    });
  }

  res.json({
    success: true,
    found: true,
    dni: found,
  });
});

// Helper: Render official DNI PNG with template and Roblox avatar
async function generateDniImageBuffer(dniData: {
  dniNumber: string;
  fullName?: string;
  firstSurname?: string;
  secondSurname?: string;
  givenNames?: string;
  birthDate?: string;
  gender?: string;
  civilStatus?: string;
  organDonation?: string;
  issueDate?: string;
  expiryDate?: string;
  votingGroup?: string;
  serialCode?: string;
  robloxUsername?: string;
  photoUrl?: string;
}) {
  const templatePaths = [
    path.resolve(__dirname, 'public/assets/dni-template-official.png'),
    path.resolve(__dirname, 'public/dni-template-official.png'),
    path.resolve(__dirname, 'src/assets/dni-template-official.png'),
    path.resolve(__dirname, 'discord-bot/assets/dni-template-official.png'),
    path.resolve(__dirname, 'public/assets/aistudio/image_a4325e74.png'),
  ];
  const templatePath = templatePaths.find((p) => fs.existsSync(p));
  let tpl: any;
  if (templatePath) {
    tpl = await loadImage(templatePath);
  } else {
    throw new Error('Plantilla DNI oficial no encontrada');
  }

  const canvas = createCanvas(tpl.width, tpl.height);
  const ctx = canvas.getContext('2d');

  // 1. Draw template background
  ctx.drawImage(tpl, 0, 0);

  // 2. Fetch & draw avatar on the right side
  let avatarImg: any = null;
  const photoUrl = (dniData.photoUrl || '').trim();
  const robloxUser = (dniData.robloxUsername || '').trim();

  if (photoUrl) {
    try {
      if (photoUrl.startsWith('data:image/')) {
        const base64Data = photoUrl.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
        const avatarBuf = Buffer.from(base64Data, 'base64');
        avatarImg = await loadImage(avatarBuf);
      } else {
        const resp = await fetch(photoUrl);
        if (resp.ok) {
          const arrBuf = await resp.arrayBuffer();
          avatarImg = await loadImage(Buffer.from(arrBuf));
        }
      }
    } catch (e) {
      console.error('Error loading avatar photo for DNI:', e);
    }
  }

  // If photo was not loaded or is default headshot, attempt to fetch Roblox bust directly
  if (!avatarImg && robloxUser) {
    try {
      let uId = robloxUser.replace(/^@/, '');
      if (!/^\d+$/.test(uId)) {
        const uRes = await fetch('https://users.roblox.com/v1/usernames/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernames: [uId], excludeBannedUsers: false }),
        });
        if (uRes.ok) {
          const uData: any = await uRes.json();
          if (uData.data && uData.data.length > 0) {
            uId = uData.data[0].id.toString();
          }
        }
      }

      if (/^\d+$/.test(uId)) {
        // Try avatar bust first (head + shoulders + suit)
        const bustRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-bust?userIds=${uId}&size=420x420&format=Png&isCircular=false`);
        if (bustRes.ok) {
          const bData: any = await bustRes.json();
          if (bData.data && bData.data[0]?.imageUrl) {
            const resp = await fetch(bData.data[0].imageUrl);
            if (resp.ok) {
              const arrBuf = await resp.arrayBuffer();
              avatarImg = await loadImage(Buffer.from(arrBuf));
            }
          }
        }
        if (!avatarImg) {
          const headRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${uId}&size=420x420&format=Png&isCircular=false`);
          if (headRes.ok) {
            const hData: any = await headRes.json();
            if (hData.data && hData.data[0]?.imageUrl) {
              const resp = await fetch(hData.data[0].imageUrl);
              if (resp.ok) {
                const arrBuf = await resp.arrayBuffer();
                avatarImg = await loadImage(Buffer.from(arrBuf));
              }
            }
          }
        }
      }
    } catch (rbxErr) {
      console.error('Error fetching Roblox avatar for DNI canvas:', rbxErr);
    }
  }

  // Draw avatar on right side (upper right quadrant, so it doesn't cover Ubigeo, blood group, or signature)
  if (avatarImg) {
    try {
      ctx.drawImage(avatarImg, 780, 115, 315, 315);
    } catch (e) {
      console.error('Error drawing avatar image on canvas:', e);
    }
  }

  // 3. Text setup - exact alignment matching official reference below labels
  ctx.fillStyle = '#080808';
  ctx.textBaseline = 'middle';

  // Format DNI / CUI
  const dniNum = (dniData.dniNumber || '00000000').padStart(8, '0');
  ctx.font = 'bold 22px Arial, Helvetica, sans-serif';
  ctx.fillText(dniNum, 147, 148);

  // Names decomposition
  let pSurname = dniData.firstSurname || '';
  let mSurname = dniData.secondSurname || '';
  let names = dniData.givenNames || '';

  if (!pSurname && !mSurname && !names && dniData.fullName) {
    const parts = dniData.fullName.trim().split(/\s+/);
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

  // Primer Apellido (positioned cleanly below label)
  ctx.font = 'bold 24px Arial, Helvetica, sans-serif';
  ctx.fillText((pSurname || 'QUISPE').toUpperCase(), 348, 177);

  // Segundo Apellido (positioned cleanly below label)
  ctx.fillText((mSurname || 'MAMANI').toUpperCase(), 348, 256);

  // Pronombre / Nombres (positioned cleanly below label)
  ctx.fillText((names || 'JUAN CARLOS').toUpperCase(), 348, 325);

  // Sexo (positioned cleanly below label)
  const rawGender = (dniData.gender || 'M').toUpperCase();
  const genderText = rawGender.startsWith('M') ? 'Masculino' : rawGender.startsWith('F') ? 'Femenino' : rawGender;
  ctx.font = 'bold 21px Arial, Helvetica, sans-serif';
  ctx.fillText(genderText, 346, 382);

  // Estado Civil (positioned cleanly below label)
  const rawCivil = (dniData.civilStatus || 'SOLTERO').toUpperCase();
  const civilText = rawCivil.startsWith('C') ? 'CASADO' : rawCivil.startsWith('D') ? 'DIVORCIADO' : rawCivil.startsWith('V') ? 'VIUDO' : 'SOLTERO';
  ctx.fillText(civilText, 567, 393);

  // Fecha de Nacimiento (positioned cleanly below label)
  let bDate = dniData.birthDate || '07/08/1986';
  if (/^\d{4}-\d{2}-\d{2}$/.test(bDate)) {
    const [y, m, d] = bDate.split('-');
    bDate = `${d}/${m}/${y}`;
  } else if (/^\d{2}-\d{2}-\d{4}$/.test(bDate)) {
    bDate = bDate.replace(/-/g, '/');
  }
  ctx.fillText(bDate, 344, 443);

  // Serial code beside Peru map (minimum 4 zeros, compact 7 digits e.g. 0000314 to never overlap)
  const rawSerial = (dniData.serialCode || '').trim();
  let serial = '';
  if (rawSerial && rawSerial.startsWith('0000') && rawSerial.length <= 8) {
    serial = rawSerial;
  } else {
    serial = `0000${dniNum.slice(-3)}`;
  }
  ctx.font = 'bold 19px Arial, Helvetica, sans-serif';
  ctx.fillText(serial, 146, 457);

  // Fecha de Emisión (positioned cleanly below label)
  const today = new Date();
  const emisionDefault = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  const emisionText = dniData.issueDate || emisionDefault;
  ctx.font = 'bold 21px Arial, Helvetica, sans-serif';
  ctx.fillText(emisionText, 344, 500);

  // Fecha de Caducidad (+8 years, positioned cleanly below label)
  const caducidadDefault = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear() + 8}`;
  const caducidadText = dniData.expiryDate || caducidadDefault;
  ctx.fillText(caducidadText, 574, 508);

  // Grupo de Votación (6 digits, positioned cleanly below label)
  const voteGroup = dniData.votingGroup || dniNum.slice(0, 6);
  ctx.fillText(voteGroup, 350, 558);

  // Donación de Órganos (positioned cleanly below label)
  const organText = (dniData.organDonation || 'NO').toUpperCase().includes('S') ? 'SI' : 'NO';
  ctx.fillText(organText, 588, 562);

  // Fingerprint date overlay (DD MM YYYY)
  const dateDigits = bDate.replace(/\//g, ' ').replace(/-/g, ' ');
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 28px Arial, Helvetica, sans-serif';
  ctx.fillText(dateDigits, 92, 570);

  return canvas.toBuffer('image/png');
}

// Endpoint to render DNI image by identifier (DNI number, Roblox username, Discord ID)
app.get('/api/dni/image/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const clean = identifier.trim().toLowerCase().replace(/^@/, '');
    const data = loadBankSystem();

    const found = data.dnis.find(
      (d: any) =>
        d.dniNumber?.toLowerCase() === clean ||
        d.discordId?.toLowerCase() === clean ||
        d.robloxUsername?.toLowerCase() === clean
    );

    if (!found) {
      return res.status(404).send('DNI no encontrado para este identificador');
    }

    const imgBuffer = await generateDniImageBuffer({
      dniNumber: found.dniNumber,
      fullName: found.fullName,
      firstSurname: found.firstSurname,
      secondSurname: found.secondSurname,
      givenNames: found.givenNames,
      birthDate: found.birthDate,
      gender: found.gender,
      civilStatus: found.civilStatus,
      organDonation: found.organDonation,
      issueDate: found.issueDate,
      expiryDate: found.expiryDate,
      votingGroup: found.votingGroup,
      serialCode: found.serialCode,
      robloxUsername: found.robloxUsername,
      photoUrl: found.photoUrl,
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.send(imgBuffer);
  } catch (err: any) {
    console.error('Error generating DNI image:', err);
    return res.status(500).send(err.message || 'Error generando imagen de DNI');
  }
});

// Endpoint to render custom DNI image on-the-fly via query parameters
app.get('/api/dni/render', async (req, res) => {
  try {
    const {
      dni,
      cui,
      nombre,
      primer_apellido,
      segundo_apellido,
      nombres,
      nacimiento,
      genero,
      sexo,
      estado_civil,
      donacion_organos,
      emision,
      caducidad,
      grupo_votacion,
      serial,
      usuario,
      foto,
    } = req.query;

    const imgBuffer = await generateDniImageBuffer({
      dniNumber: (dni as string) || (cui as string) || '28641982',
      firstSurname: (primer_apellido as string) || undefined,
      secondSurname: (segundo_apellido as string) || undefined,
      givenNames: (nombres as string) || undefined,
      fullName: (nombre as string) || undefined,
      birthDate: (nacimiento as string) || '07/08/1986',
      gender: (genero as string) || (sexo as string) || 'Masculino',
      civilStatus: (estado_civil as string) || 'SOLTERO',
      organDonation: (donacion_organos as string) || 'NO',
      issueDate: (emision as string) || undefined,
      expiryDate: (caducidad as string) || undefined,
      votingGroup: (grupo_votacion as string) || undefined,
      serialCode: (serial as string) || undefined,
      robloxUsername: (usuario as string) || 'UsuarioRoblox',
      photoUrl: (foto as string) || '',
    });

    res.setHeader('Content-Type', 'image/png');
    return res.send(imgBuffer);
  } catch (err: any) {
    console.error('Error in /api/dni/render:', err);
    return res.status(500).send(err.message || 'Error en generador de imagen DNI');
  }
});

// Endpoint to update official or custom DNI template image
app.post('/api/admin/template', async (req, res) => {
  try {
    const { imageBase64, imageUrl } = req.body;
    let imgBuf: Buffer | null = null;
    if (imageBase64) {
      const clean = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
      imgBuf = Buffer.from(clean, 'base64');
    } else if (imageUrl) {
      const resp = await fetch(imageUrl);
      if (resp.ok) {
        const arr = await resp.arrayBuffer();
        imgBuf = Buffer.from(arr);
      }
    }
    if (!imgBuf || imgBuf.length < 100) {
      return res.status(400).json({ success: false, error: 'Imagen no válida o vacía' });
    }

    const targetPaths = [
      path.resolve(__dirname, 'public/assets/dni-template-official.png'),
      path.resolve(__dirname, 'public/dni-template-official.png'),
      path.resolve(__dirname, 'discord-bot/assets/dni-template-official.png'),
      path.resolve(__dirname, 'src/assets/dni-template-official.png'),
    ];

    for (const p of targetPaths) {
      try {
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(p, imgBuf);
      } catch (err) {
        console.error('Error saving template to', p, err);
      }
    }

    return res.json({ success: true, message: 'Plantilla de DNI actualizada correctamente en el sistema y bot' });
  } catch (err: any) {
    console.error('Error updating template:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Delete / reset DNI by admin
app.delete('/api/bot/dni/:identifier', (req, res) => {
  const { identifier } = req.params;
  const clean = identifier.trim().toLowerCase().replace(/^@/, '');
  const data = loadBankSystem();

  const prevLen = data.dnis.length;
  data.dnis = data.dnis.filter(
    (d: any) =>
      d.dniNumber?.toLowerCase() !== clean &&
      d.discordId?.toLowerCase() !== clean &&
      d.robloxUsername?.toLowerCase() !== clean
  );
  saveBankSystem(data);

  res.json({ success: true, deleted: data.dnis.length < prevLen });
});

// 3. Lookup Balances (Cash en mano, Bank Banco YA P, Total)
app.get('/api/bot/bank/balance/:identifier', (req, res) => {
  const { identifier } = req.params;
  const clean = identifier.trim().toLowerCase().replace(/^@/, '');
  const data = loadBankSystem();

  const found = data.accounts.find(
    (a) =>
      a.dniNumber.toLowerCase() === clean ||
      a.discordId.toLowerCase() === clean ||
      a.robloxUsername.toLowerCase() === clean
  );

  if (!found) {
    // If not found in accounts, check if they have a DNI, then create account
    const dni = data.dnis.find(
      (d) =>
        d.dniNumber.toLowerCase() === clean ||
        d.discordId.toLowerCase() === clean ||
        d.robloxUsername.toLowerCase() === clean
    );

    if (dni) {
      const newAcc = {
        id: `acc-${Date.now()}`,
        dniNumber: dni.dniNumber,
        discordId: dni.discordId,
        robloxUsername: dni.robloxUsername,
        fullName: dni.fullName,
        avatarUrl: dni.photoUrl,
        bankBalance: 50.0,
        cashBalance: 20.0,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      data.accounts.unshift(newAcc);
      saveBankSystem(data);

      return res.json({
        success: true,
        found: true,
        account: {
          ...newAcc,
          totalBalance: newAcc.bankBalance + newAcc.cashBalance,
        },
      });
    }

    return res.json({
      success: true,
      found: false,
      message: `No se encontró cuenta en Banco YA P para "${identifier}". Primero debe tramitar su DNI.`,
    });
  }

  res.json({
    success: true,
    found: true,
    account: {
      ...found,
      totalBalance: found.bankBalance + found.cashBalance,
    },
  });
});

// 4. Transfer Money between citizens via DNI number or Roblox username
app.post('/api/bot/bank/transfer', (req, res) => {
  try {
    const { senderIdentifier, recipientIdentifier, amount, note = '' } = req.body;
    const transferAmount = parseFloat(amount);

    if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Monto de transferencia inválido.' });
    }

    const cleanSender = senderIdentifier?.trim().toLowerCase().replace(/^@/, '');
    const cleanRecipient = recipientIdentifier?.trim().toLowerCase().replace(/^@/, '');

    const data = loadBankSystem();

    const sender = data.accounts.find(
      (a) =>
        a.dniNumber.toLowerCase() === cleanSender ||
        a.discordId.toLowerCase() === cleanSender ||
        a.robloxUsername.toLowerCase() === cleanSender
    );

    if (!sender) {
      return res.status(404).json({
        success: false,
        error: `Emisor no encontrado o sin cuenta en Banco YA P: ${senderIdentifier}`,
      });
    }

    if (sender.status === 'frozen') {
      return res.status(403).json({
        success: false,
        error: 'Tu cuenta de Banco YA P se encuentra CONGELADA por orden judicial.',
      });
    }

    if (sender.bankBalance < transferAmount) {
      return res.status(400).json({
        success: false,
        error: `Saldo insuficiente en Banco YA P. Tienes S/. ${sender.bankBalance.toFixed(2)} pero intentas transferir S/. ${transferAmount.toFixed(2)}.`,
      });
    }

    const recipient = data.accounts.find(
      (a) =>
        a.dniNumber.toLowerCase() === cleanRecipient ||
        a.discordId.toLowerCase() === cleanRecipient ||
        a.robloxUsername.toLowerCase() === cleanRecipient
    );

    if (!recipient) {
      return res.status(404).json({
        success: false,
        error: `Cuenta inexistente. No se encontró ningún ciudadano registrado como "${recipientIdentifier}" en Banco YA P.`,
      });
    }

    if (recipient.dniNumber === sender.dniNumber || recipient.discordId === sender.discordId) {
      return res.status(400).json({
        success: false,
        error: 'No puedes transferirte dinero a ti mismo.',
      });
    }

    if (recipient.status === 'frozen') {
      return res.status(403).json({
        success: false,
        error: `La cuenta bancaria del destinatario (@${recipient.robloxUsername}) se encuentra congelada.`,
      });
    }

    // Execute transfer
    sender.bankBalance -= transferAmount;
    sender.updatedAt = new Date().toISOString();

    recipient.bankBalance += transferAmount;
    recipient.updatedAt = new Date().toISOString();

    const operationNumber = `OP-${Math.floor(100000 + Math.random() * 900000)}`;
    const tx = {
      id: `tx-${Date.now()}`,
      operationNumber,
      type: 'transfer_sent',
      senderDni: sender.dniNumber,
      senderRoblox: sender.robloxUsername,
      senderName: sender.fullName,
      senderAvatar: sender.avatarUrl,
      receiverDni: recipient.dniNumber,
      receiverRoblox: recipient.robloxUsername,
      receiverName: recipient.fullName,
      receiverAvatar: recipient.avatarUrl,
      amount: transferAmount,
      description: note?.trim() || 'Transferencia por YA P',
      timestamp: new Date().toISOString(),
    };

    data.transactions.unshift(tx);
    saveBankSystem(data);

    res.json({
      success: true,
      operationNumber,
      amount: transferAmount,
      sender: {
        robloxUsername: sender.robloxUsername,
        dniNumber: sender.dniNumber,
        newBankBalance: sender.bankBalance,
      },
      recipient: {
        robloxUsername: recipient.robloxUsername,
        dniNumber: recipient.dniNumber,
        fullName: recipient.fullName,
      },
      note: tx.description,
      timestamp: tx.timestamp,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error procesando transferencia' });
  }
});

// 5. Withdraw Cash (Retirar de Banco YA P a mano)
app.post('/api/bot/bank/withdraw', (req, res) => {
  try {
    const { identifier, amount } = req.body;
    const withdrawAmount = parseFloat(amount);

    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Monto de retiro inválido.' });
    }

    const clean = identifier?.trim().toLowerCase().replace(/^@/, '');
    const data = loadBankSystem();

    const account = data.accounts.find(
      (a) =>
        a.dniNumber.toLowerCase() === clean ||
        a.discordId.toLowerCase() === clean ||
        a.robloxUsername.toLowerCase() === clean
    );

    if (!account) {
      return res.status(404).json({ success: false, error: `Cuenta no encontrada: ${identifier}` });
    }

    if (account.bankBalance < withdrawAmount) {
      return res.status(400).json({
        success: false,
        error: `Saldo insuficiente en Banco YA P. Disponible: S/. ${account.bankBalance.toFixed(2)}`,
      });
    }

    account.bankBalance -= withdrawAmount;
    account.cashBalance += withdrawAmount;
    account.updatedAt = new Date().toISOString();

    data.transactions.unshift({
      id: `tx-${Date.now()}`,
      operationNumber: `OP-${Math.floor(100000 + Math.random() * 900000)}`,
      type: 'withdraw_cash',
      senderDni: account.dniNumber,
      senderRoblox: account.robloxUsername,
      senderName: account.fullName,
      senderAvatar: account.avatarUrl,
      amount: withdrawAmount,
      description: 'Retiro en cajero automático (a la mano)',
      timestamp: new Date().toISOString(),
    });

    saveBankSystem(data);

    res.json({
      success: true,
      message: `Has retirado S/. ${withdrawAmount.toFixed(2)} a tu mano exitosamente.`,
      cashBalance: account.cashBalance,
      bankBalance: account.bankBalance,
      totalBalance: account.cashBalance + account.bankBalance,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error procesando retiro' });
  }
});

// 6. Deposit Cash (Depositar de mano a Banco YA P)
app.post('/api/bot/bank/deposit', (req, res) => {
  try {
    const { identifier, amount } = req.body;
    const depositAmount = parseFloat(amount);

    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Monto de depósito inválido.' });
    }

    const clean = identifier?.trim().toLowerCase().replace(/^@/, '');
    const data = loadBankSystem();

    const account = data.accounts.find(
      (a) =>
        a.dniNumber.toLowerCase() === clean ||
        a.discordId.toLowerCase() === clean ||
        a.robloxUsername.toLowerCase() === clean
    );

    if (!account) {
      return res.status(404).json({ success: false, error: `Cuenta no encontrada: ${identifier}` });
    }

    if (account.cashBalance < depositAmount) {
      return res.status(400).json({
        success: false,
        error: `No tienes suficiente dinero en efectivo en mano. Efectivo disponible: S/. ${account.cashBalance.toFixed(2)}`,
      });
    }

    account.cashBalance -= depositAmount;
    account.bankBalance += depositAmount;
    account.updatedAt = new Date().toISOString();

    data.transactions.unshift({
      id: `tx-${Date.now()}`,
      operationNumber: `OP-${Math.floor(100000 + Math.random() * 900000)}`,
      type: 'deposit_cash',
      receiverDni: account.dniNumber,
      receiverRoblox: account.robloxUsername,
      receiverName: account.fullName,
      receiverAvatar: account.avatarUrl,
      amount: depositAmount,
      description: 'Depósito de dinero en mano al Banco YA P',
      timestamp: new Date().toISOString(),
    });

    saveBankSystem(data);

    res.json({
      success: true,
      message: `Has depositado S/. ${depositAmount.toFixed(2)} en tu Banco YA P exitosamente.`,
      cashBalance: account.cashBalance,
      bankBalance: account.bankBalance,
      totalBalance: account.cashBalance + account.bankBalance,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error procesando depósito' });
  }
});

// 7. Transaction History
app.get('/api/bot/bank/history/:identifier', (req, res) => {
  const { identifier } = req.params;
  const clean = identifier.trim().toLowerCase().replace(/^@/, '');
  const data = loadBankSystem();

  const userTxs = data.transactions.filter(
    (t) =>
      t.senderDni?.toLowerCase() === clean ||
      t.senderRoblox?.toLowerCase() === clean ||
      t.receiverDni?.toLowerCase() === clean ||
      t.receiverRoblox?.toLowerCase() === clean
  );

  res.json({
    success: true,
    transactions: userTxs.slice(0, 15),
  });
});

// 8. Download complete bot package as ZIP ready for 24/7 hosting
app.get('/api/bot/download-zip', (req, res) => {
  const prebuiltZip = path.resolve(__dirname, 'public/perp-discord-bot-24-7.zip');
  if (fs.existsSync(prebuiltZip)) {
    const stat = fs.statSync(prebuiltZip);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', 'attachment; filename="perp-discord-bot-24-7.zip"');
    const stream = fs.createReadStream(prebuiltZip);
    return stream.pipe(res);
  }

  const botDir = path.resolve(__dirname, 'discord-bot');
  if (!fs.existsSync(botDir)) {
    return res.status(404).json({ success: false, error: 'Directorio discord-bot no encontrado' });
  }

  res.attachment('perp-discord-bot-24-7.zip');
  const archive = new (archiver.ZipArchive || archiver)({ zlib: { level: 9 } });

  archive.on('error', (err: any) => {
    console.error('Error zipping discord bot:', err);
    if (!res.headersSent) {
      res.status(500).send({ error: err?.message || 'Error creating zip' });
    }
  });

  archive.pipe(res);
  archive.glob('**/*', {
    cwd: botDir,
    dot: true,
    ignore: ['node_modules/**', '.data/**', '.git/**'],
  });
  archive.finalize();
});

// 9. Get all bot files for in-browser review & copy
app.get('/api/bot/package-files', (req, res) => {
  try {
    const botDir = path.resolve(__dirname, 'discord-bot');
    const filesToRead = [
      '.env',
      'config.env',
      '.env.example',
      'index.js',
      'deploy-commands.js',
      'package.json',
      'discloud.config',
      'Procfile',
      'Dockerfile',
      'ecosystem.config.cjs',
      'start.sh',
      'start.bat',
      'README.md',
    ];

    const fileContents: Record<string, string> = {};
    for (const f of filesToRead) {
      const p = path.join(botDir, f);
      if (fs.existsSync(p)) {
        fileContents[f] = fs.readFileSync(p, 'utf-8');
      }
    }

    res.json({ success: true, files: fileContents });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// SISTEMA PNP SIPOL & TRANSITO (TABLET Y DISCORD)
// ==========================================
const PNP_FILE = path.resolve(__dirname, '.data/pnp_system.json');
const SECRETS_VAULT_FILE = path.resolve(__dirname, '.data/secrets_vault.json');

const GUILD_PERP_ID = '1554629558760775710';
const PNP_ROLE_ID = '1555384968086032394';
const LICENSE_ROLE_ID = '1556723203114668082';

function loadSecretsVault() {
  let fileVault: any = {};
  try {
    if (fs.existsSync(SECRETS_VAULT_FILE)) {
      fileVault = JSON.parse(fs.readFileSync(SECRETS_VAULT_FILE, 'utf-8'));
    }
  } catch {}

  // Prioritize environment variables injected by Google AI Studio Secrets (process.env)
  const envSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const envSupabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const envDiscordToken = process.env.DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
  const envDiscordClientId = process.env.DISCORD_CLIENT_ID || process.env.VITE_DISCORD_CLIENT_ID;
  const envDiscordClientSecret = process.env.DISCORD_CLIENT_SECRET;
  const envDiscordGuildId = process.env.DISCORD_GUILD_ID;
  const envPnpRoleId = process.env.PNP_ROLE_ID;
  const envLicenseRoleId = process.env.LICENSE_ROLE_ID;
  const envErlcKey = process.env.ERLC_SERVER_KEY || process.env.ERLC_API_KEY;

  const result = {
    supabaseUrl: envSupabaseUrl || fileVault.supabaseUrl || serverSupabaseUrl || '',
    supabaseAnonKey: envSupabaseAnonKey || fileVault.supabaseAnonKey || serverSupabaseAnonKey || '',
    discordToken: envDiscordToken || fileVault.discordToken || '',
    discordClientId: envDiscordClientId || fileVault.discordClientId || discordClientId || '',
    discordClientSecret: envDiscordClientSecret || fileVault.discordClientSecret || discordClientSecret || '',
    discordGuildId: envDiscordGuildId || fileVault.discordGuildId || GUILD_PERP_ID,
    pnpRoleId: envPnpRoleId || fileVault.pnpRoleId || PNP_ROLE_ID,
    licenseRoleId: envLicenseRoleId || fileVault.licenseRoleId || LICENSE_ROLE_ID,
    erlcServerKey: envErlcKey || fileVault.erlcServerKey || erlcServerKey || '',
  };

  // Keep in-memory server singletons synchronized
  if (result.supabaseUrl) serverSupabaseUrl = result.supabaseUrl;
  if (result.supabaseAnonKey) serverSupabaseAnonKey = result.supabaseAnonKey;
  if (result.discordClientId) discordClientId = result.discordClientId;
  if (result.discordClientSecret) discordClientSecret = result.discordClientSecret;
  if (result.erlcServerKey) erlcServerKey = result.erlcServerKey;

  return result;
}

interface PnpSystemData {
  arrests: any[];
  fines: any[];
  sanctions: any[];
  verifiedOfficers: string[];
  licensedUsers: string[];
}

function loadPnpSystem(): PnpSystemData {
  try {
    if (!fs.existsSync(PNP_FILE)) {
      const initial: PnpSystemData = {
        arrests: [],
        fines: [],
        sanctions: [],
        verifiedOfficers: ['1555384968086032394'],
        licensedUsers: ['1556723203114668082'],
      };
      const dir = path.dirname(PNP_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(PNP_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    const raw = fs.readFileSync(PNP_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading PNP system data:', e);
    return { arrests: [], fines: [], sanctions: [], verifiedOfficers: [], licensedUsers: [] };
  }
}

function savePnpSystem(data: PnpSystemData) {
  try {
    const dir = path.dirname(PNP_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PNP_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error saving PNP system data:', e);
  }
}

// 1. Get all arrests
app.get('/api/pnp/arrests', (req, res) => {
  const data = loadPnpSystem();
  res.json({ success: true, arrests: data.arrests });
});

// 2. Register arrest (SIPOL)
app.post('/api/pnp/arrests', (req, res) => {
  try {
    const { citizenIdentifier, citizenName, charges, durationText, bailAmount = 0, officerName, evidenceUrl } = req.body;
    if (!citizenIdentifier || !charges) {
      return res.status(400).json({ success: false, error: 'Falta usuario o cargos del arresto' });
    }

    const data = loadPnpSystem();
    const nextNum = data.arrests.length + 18;
    const code = `A-00${nextNum}`;

    const newArrest = {
      id: `arr-${Date.now()}`,
      code,
      citizenIdentifier: citizenIdentifier.trim().replace(/^@/, ''),
      citizenName: citizenName?.trim() || `@ ${citizenIdentifier.trim().replace(/^@/, '')}`,
      charges: charges.trim(),
      durationText: durationText?.trim() || '3m (3 minutos)',
      durationMinutes: parseInt(durationText) || 3,
      bailAmount: Number(bailAmount) || 0,
      officerName: officerName?.trim() || '@Oficial_PNP',
      evidenceUrl: evidenceUrl || '',
      status: 'activo',
      createdAt: new Date().toISOString(),
    };

    data.arrests.unshift(newArrest);
    savePnpSystem(data);

    res.json({ success: true, arrest: newArrest });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Get all fines
app.get('/api/pnp/fines', (req, res) => {
  const data = loadPnpSystem();
  res.json({ success: true, fines: data.fines });
});

// 4. Register fine
app.post('/api/pnp/fines', (req, res) => {
  try {
    const { citizenIdentifier, citizenName, reason, amount, officerName } = req.body;
    if (!citizenIdentifier || !reason || amount === undefined) {
      return res.status(400).json({ success: false, error: 'Falta usuario, motivo o monto de la multa' });
    }

    const data = loadPnpSystem();
    const nextNum = data.fines.length + 6;
    const code = `M-00${nextNum < 10 ? '0' + nextNum : nextNum}`;

    const newFine = {
      id: `fine-${Date.now()}`,
      code,
      citizenIdentifier: citizenIdentifier.trim().replace(/^@/, ''),
      citizenName: citizenName?.trim() || `@ [${citizenIdentifier.trim().replace(/^@/, '')}]`,
      reason: reason.trim(),
      amount: Number(amount) || 100,
      status: 'pendiente',
      officerName: officerName?.trim() || 'Oficial_PNP',
      createdAt: new Date().toISOString(),
    };

    data.fines.unshift(newFine);
    savePnpSystem(data);

    res.json({ success: true, fine: newFine });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Pay fine
app.put('/api/pnp/fines/:code/pay', (req, res) => {
  const { code } = req.params;
  const data = loadPnpSystem();
  const fine = data.fines.find((f) => f.code.toLowerCase() === code.toLowerCase());
  if (!fine) {
    return res.status(404).json({ success: false, error: 'Multa no encontrada' });
  }
  fine.status = 'pagada';
  fine.paidAt = new Date().toISOString();
  savePnpSystem(data);
  res.json({ success: true, fine });
});

// 6. Get Antecedentes & Citizen Record (matching image 3)
app.get('/api/pnp/records/:identifier', (req, res) => {
  const { identifier } = req.params;
  const clean = identifier.trim().toLowerCase().replace(/^@/, '');
  const data = loadPnpSystem();
  const bankData = loadBankSystem();

  // Match citizen by identifier in DNI, Roblox, or Discord
  const dniMatch = bankData.dnis.find(
    (d: any) =>
      d.dniNumber?.toLowerCase() === clean ||
      d.discordId?.toLowerCase() === clean ||
      d.robloxUsername?.toLowerCase() === clean
  );

  const matchedArrests = data.arrests.filter(
    (a) =>
      a.citizenIdentifier.toLowerCase() === clean ||
      a.citizenName.toLowerCase().includes(clean) ||
      (dniMatch && (a.citizenIdentifier.toLowerCase() === dniMatch.robloxUsername.toLowerCase() || a.citizenIdentifier === dniMatch.dniNumber))
  );

  const matchedFines = data.fines.filter(
    (f) =>
      f.citizenIdentifier.toLowerCase() === clean ||
      f.citizenName.toLowerCase().includes(clean) ||
      (dniMatch && (f.citizenIdentifier.toLowerCase() === dniMatch.robloxUsername.toLowerCase() || f.citizenIdentifier === dniMatch.dniNumber))
  );

  const unpaidFines = matchedFines.filter((f) => f.status === 'pendiente');
  const unpaidTotal = unpaidFines.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const activeArrests = matchedArrests.filter((a) => a.status === 'activo');

  // Check Driver License (Role 1556723203114668082 or known registered)
  const hasLicense =
    data.licensedUsers.some((u) => u.toLowerCase() === clean || (dniMatch && u === dniMatch.discordId)) ||
    clean === '61187362818282827' ||
    clean === '1556723203114668082';

  const hasRecords = matchedArrests.length > 0 || matchedFines.length > 0;

  res.json({
    success: true,
    identifier,
    citizenName: dniMatch ? dniMatch.fullName : identifier,
    robloxUsername: dniMatch ? dniMatch.robloxUsername : identifier,
    dniNumber: dniMatch ? dniMatch.dniNumber : null,
    hasRecords,
    summary: {
      statusText: hasRecords ? 'Con antecedentes' : 'Limpio',
      multasCount: matchedFines.length,
      multasPendientes: unpaidFines.length,
      multasTotalPorPagar: unpaidTotal,
      arrestosCount: matchedArrests.length,
      arrestosActivos: activeArrests.length,
      hasLicense,
      licenseRole: '1556723203114668082',
    },
    arrests: matchedArrests,
    fines: matchedFines,
  });
});

// 7. Verify Police Officer Role & Badge (Checks Discord Guilds and Police Roles dynamically)
app.get('/api/pnp/verify-role/:identifier', async (req, res) => {
  const { identifier } = req.params;
  const clean = identifier.trim().replace(/^@/, '');
  const data = loadPnpSystem();
  const vault = loadSecretsVault();
  const botToken = vault.discordToken || process.env.DISCORD_TOKEN || '';

  // Valid Discord snowflake ID check (16-22 digits)
  const isSnowflake = /^\d{16,22}$/.test(clean);

  if (!isSnowflake) {
    return res.status(400).json({
      success: false,
      isOfficer: false,
      error: 'Debes ingresar tu ID de Usuario de Discord (17-20 dígitos numéricos). No se admiten claves genéricas ni PINs.',
    });
  }

  // Already verified in local cache
  if (data.verifiedOfficers.includes(clean)) {
    return res.json({
      success: true,
      isOfficer: true,
      badge: `PNP-OFICIAL-${clean.slice(-4)}`,
      message: 'Oficial PNP Autorizado por registro activo de servidor.',
    });
  }

  // Candidate Guilds: Prioritize configured secrets
  const candidateGuilds = [
    vault.discordGuildId,
    process.env.DISCORD_GUILD_ID,
    '1156413773242957915',
    '1554629558760775710',
    '1070092818476978196',
  ].filter((g, idx, arr) => Boolean(g) && arr.indexOf(g) === idx) as string[];

  // Candidate Police Roles: Prioritize configured secrets
  const candidatePoliceRoles = [
    vault.pnpRoleId,
    process.env.PNP_ROLE_ID,
    '1444846762874372187',
    '1555384968086032394',
  ].filter((r, idx, arr) => Boolean(r) && arr.indexOf(r) === idx) as string[];

  if (botToken && botToken !== 'tu_token_de_bot_aqui') {
    let lastFoundMember: any = null;
    let foundInAnyGuild = false;

    for (const gid of candidateGuilds) {
      try {
        const guildRes = await fetch(`https://discord.com/api/v10/guilds/${gid}/members/${clean}`, {
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (guildRes.ok) {
          foundInAnyGuild = true;
          const memberData: any = await guildRes.json();
          lastFoundMember = memberData;
          const roles: string[] = memberData.roles || [];
          const matchedRole = roles.find((r) => candidatePoliceRoles.includes(r));

          if (matchedRole) {
            if (!data.verifiedOfficers.includes(clean)) {
              data.verifiedOfficers.push(clean);
              savePnpSystem(data);
            }
            return res.json({
              success: true,
              isOfficer: true,
              policeRoleId: matchedRole,
              guildId: gid,
              badge: `PNP-OFICIAL-${clean.slice(-4)}`,
              member: {
                username: memberData.user?.username,
                displayName: memberData.nick || memberData.user?.global_name || memberData.user?.username,
                avatar: memberData.user?.avatar,
              },
              message: `¡Identidad Policial Verificada! Rol PNP (${matchedRole}) confirmado en el servidor oficial.`,
            });
          }
        }
      } catch (err: any) {
        console.error(`Error verificando guild ${gid}:`, err.message);
      }
    }

    if (foundInAnyGuild && lastFoundMember) {
      return res.json({
        success: true,
        isOfficer: false,
        error: `Acceso denegado: El usuario "${lastFoundMember.user?.username || clean}" está en el servidor de Discord pero NO tiene el Rol Policial PNP autorizado.`,
      });
    }

    return res.json({
      success: true,
      isOfficer: false,
      error: `Acceso denegado: El ID de Discord "${clean}" no pertenece a los servidores configurados de PE:RP donde está el bot.`,
    });
  }

  // Fallback
  return res.json({
    success: true,
    isOfficer: false,
    error: `Acceso denegado: No se pudo verificar el rol de Discord en este momento.`,
  });
});

// 8. Check Driver's License Role (Checks Discord Guilds and License Roles)
app.get('/api/pnp/check-license/:identifier', async (req, res) => {
  const { identifier } = req.params;
  const clean = identifier.trim().replace(/^@/, '');
  const data = loadPnpSystem();
  const vault = loadSecretsVault();
  const botToken = vault.discordToken || process.env.DISCORD_TOKEN || '';

  if (data.licensedUsers.includes(clean)) {
    return res.json({ success: true, hasLicense: true });
  }

  const candidateGuilds = [
    vault.discordGuildId,
    process.env.DISCORD_GUILD_ID,
    '1156413773242957915',
    '1554629558760775710',
  ].filter((g, idx, arr) => Boolean(g) && arr.indexOf(g) === idx) as string[];

  const candidateLicenseRoles = [
    vault.licenseRoleId,
    process.env.LICENSE_ROLE_ID,
    '1444861817863274506',
    '1556723203114668082',
  ].filter((r, idx, arr) => Boolean(r) && arr.indexOf(r) === idx) as string[];

  if (botToken && /^\d{16,22}$/.test(clean)) {
    for (const gid of candidateGuilds) {
      try {
        const guildRes = await fetch(`https://discord.com/api/v10/guilds/${gid}/members/${clean}`, {
          headers: {
            Authorization: `Bot ${botToken}`,
            'Content-Type': 'application/json',
          },
        });
        if (guildRes.ok) {
          const m: any = await guildRes.json();
          const roles: string[] = m.roles || [];
          const hasLic = roles.some((r) => candidateLicenseRoles.includes(r));
          if (hasLic) {
            if (!data.licensedUsers.includes(clean)) {
              data.licensedUsers.push(clean);
              savePnpSystem(data);
            }
            return res.json({ success: true, hasLicense: true });
          }
        }
      } catch {}
    }
  }

  return res.json({ success: true, hasLicense: false });
});

// ==========================================
// BÓVEDA DE SECRETS & BASES DE DATOS (API SERVER-SIDE)
// ==========================================
app.get('/api/secrets/config', (req, res) => {
  const vault = loadSecretsVault();
  res.json({
    success: true,
    configured: {
      supabaseUrl: Boolean(vault.supabaseUrl),
      supabaseAnonKey: Boolean(vault.supabaseAnonKey),
      discordToken: Boolean(vault.discordToken && vault.discordToken !== 'tu_token_de_bot_aqui'),
      discordClientId: Boolean(vault.discordClientId),
      discordClientSecret: Boolean(vault.discordClientSecret),
      erlcServerKey: Boolean(vault.erlcServerKey),
    },
    guildId: vault.discordGuildId || GUILD_PERP_ID,
    pnpRoleId: vault.pnpRoleId || PNP_ROLE_ID,
    licenseRoleId: vault.licenseRoleId || LICENSE_ROLE_ID,
    masked: {
      supabaseUrl: vault.supabaseUrl ? vault.supabaseUrl.replace(/(https:\/\/[^.]+).*/, '$1.supabase.co') : '',
      supabaseAnonKey: vault.supabaseAnonKey ? `${vault.supabaseAnonKey.slice(0, 8)}...${vault.supabaseAnonKey.slice(-6)}` : '',
      discordToken: vault.discordToken && vault.discordToken !== 'tu_token_de_bot_aqui' ? `${vault.discordToken.slice(0, 6)}...${vault.discordToken.slice(-4)}` : '',
      discordClientId: vault.discordClientId || '',
      erlcServerKey: vault.erlcServerKey ? `${vault.erlcServerKey.slice(0, 4)}...${vault.erlcServerKey.slice(-4)}` : '',
    },
  });
});

app.post('/api/secrets/save', (req, res) => {
  try {
    const {
      supabaseUrl,
      supabaseAnonKey,
      discordToken,
      discordClientId: newClientId,
      discordClientSecret: newClientSecret,
      discordGuildId,
      pnpRoleId,
      licenseRoleId,
      erlcServerKey: newErlcKey,
    } = req.body;

    const currentVault = loadSecretsVault();
    const updatedVault = {
      ...currentVault,
      supabaseUrl: typeof supabaseUrl === 'string' && supabaseUrl.trim() ? supabaseUrl.trim() : currentVault.supabaseUrl,
      supabaseAnonKey: typeof supabaseAnonKey === 'string' && supabaseAnonKey.trim() ? supabaseAnonKey.trim() : currentVault.supabaseAnonKey,
      discordToken: typeof discordToken === 'string' && discordToken.trim() ? discordToken.trim() : currentVault.discordToken,
      discordClientId: typeof newClientId === 'string' && newClientId.trim() ? newClientId.trim() : currentVault.discordClientId,
      discordClientSecret: typeof newClientSecret === 'string' && newClientSecret.trim() ? newClientSecret.trim() : currentVault.discordClientSecret,
      discordGuildId: typeof discordGuildId === 'string' && discordGuildId.trim() ? discordGuildId.trim() : currentVault.discordGuildId || GUILD_PERP_ID,
      pnpRoleId: typeof pnpRoleId === 'string' && pnpRoleId.trim() ? pnpRoleId.trim() : currentVault.pnpRoleId || PNP_ROLE_ID,
      licenseRoleId: typeof licenseRoleId === 'string' && licenseRoleId.trim() ? licenseRoleId.trim() : currentVault.licenseRoleId || LICENSE_ROLE_ID,
      erlcServerKey: typeof newErlcKey === 'string' && newErlcKey.trim() ? newErlcKey.trim() : currentVault.erlcServerKey,
      updatedAt: new Date().toISOString(),
    };

    fs.mkdirSync(path.dirname(SECRETS_VAULT_FILE), { recursive: true });
    fs.writeFileSync(SECRETS_VAULT_FILE, JSON.stringify(updatedVault, null, 2));

    // Update Supabase file & active client
    if (updatedVault.supabaseUrl && updatedVault.supabaseAnonKey) {
      serverSupabaseUrl = updatedVault.supabaseUrl;
      serverSupabaseAnonKey = updatedVault.supabaseAnonKey;
      serverSupabaseClient = null;
      getServerSupabase();
      fs.writeFileSync(
        SUPABASE_FILE,
        JSON.stringify({ url: serverSupabaseUrl, anonKey: serverSupabaseAnonKey, updatedAt: new Date().toISOString() }, null, 2)
      );
    }

    // Update Discord auth in memory
    if (updatedVault.discordClientId) discordClientId = updatedVault.discordClientId;
    if (updatedVault.discordClientSecret) discordClientSecret = updatedVault.discordClientSecret;
    if (updatedVault.discordToken) process.env.DISCORD_TOKEN = updatedVault.discordToken;
    if (updatedVault.erlcServerKey) erlcServerKey = updatedVault.erlcServerKey;

    // Sync to discord-bot/config.env & .env
    const envContent = [
      `DISCORD_TOKEN=${updatedVault.discordToken || ''}`,
      `CLIENT_ID=${updatedVault.discordClientId || ''}`,
      `CLIENT_SECRET=${updatedVault.discordClientSecret || ''}`,
      `GUILD_ID=${updatedVault.discordGuildId || GUILD_PERP_ID}`,
      `POLICE_ROLE_ID=${updatedVault.pnpRoleId || PNP_ROLE_ID}`,
      `LICENSE_ROLE_ID=${updatedVault.licenseRoleId || LICENSE_ROLE_ID}`,
      `SUPABASE_URL=${updatedVault.supabaseUrl || ''}`,
      `SUPABASE_ANON_KEY=${updatedVault.supabaseAnonKey || ''}`,
      `API_BASE_URL=http://localhost:${PORT}`,
    ].join('\n');

    try {
      fs.writeFileSync(path.resolve(__dirname, 'discord-bot/config.env'), envContent);
      fs.writeFileSync(path.resolve(__dirname, 'discord-bot/.env'), envContent);
    } catch {}

    res.json({
      success: true,
      message: '¡Secrets y Bases de Datos guardados exitosamente en el servidor! Sincronizados de forma universal para todos los dispositivos y oficiales.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Discord Only: Sanctions (/sancionar, /sanciones)
app.get('/api/pnp/sanctions/:userId', (req, res) => {
  const { userId } = req.params;
  const clean = userId.trim().toLowerCase().replace(/^@/, '');
  const data = loadPnpSystem();

  const userSanctions = data.sanctions.filter((s) => s.targetUserId.toLowerCase() === clean);
  res.json({ success: true, sanctions: userSanctions });
});

app.post('/api/pnp/sanctions', (req, res) => {
  try {
    const { targetUserId, targetUsername, moderatorName, reason, evidenceUrl } = req.body;
    if (!targetUserId || !reason) {
      return res.status(400).json({ success: false, error: 'Faltan parámetros de sanción' });
    }

    const data = loadPnpSystem();
    const sanction = {
      id: `sanc-${Date.now()}`,
      targetUserId: targetUserId.trim(),
      targetUsername: targetUsername?.trim() || targetUserId.trim(),
      moderatorName: moderatorName?.trim() || 'Staff PE:RP',
      reason: reason.trim(),
      evidenceUrl: evidenceUrl || '',
      createdAt: new Date().toISOString(),
    };

    data.sanctions.unshift(sanction);
    savePnpSystem(data);

    res.json({ success: true, sanction });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
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
