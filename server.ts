import expressApp from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const archiver = require('archiver');

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
      const thumbRes = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${uId}&size=420x420&format=Png&isCircular=false`
      );
      if (thumbRes.ok) {
        const thumbData: any = await thumbRes.json();
        if (thumbData.data && thumbData.data[0]?.imageUrl) {
          avatarUrl = thumbData.data[0].imageUrl;
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
app.get('/api/bot/dni/:identifier', (req, res) => {
  const { identifier } = req.params;
  const clean = identifier.trim().toLowerCase().replace(/^@/, '');
  const data = loadBankSystem();

  const found = data.dnis.find(
    (d) =>
      d.dniNumber.toLowerCase() === clean ||
      d.discordId.toLowerCase() === clean ||
      d.robloxUsername.toLowerCase() === clean
  );

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
    return res.download(prebuiltZip, 'perp-discord-bot-24-7.zip');
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
