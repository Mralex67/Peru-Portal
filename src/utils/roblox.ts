/**
 * Helper para resolver avatares y usuarios de Roblox de forma robusta
 */

// Avatar oficial por defecto de Roblox (100% garantizado en CDN de Roblox)
export const DEFAULT_ROBLOX_AVATAR =
  'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-310966282D3529E36976BF6B07B1DC90-Png/420/420/AvatarHeadshot/Png/noFilter';

export const PRESET_ROBLOX_AVATARS = [
  {
    id: 'roblox-official-1',
    name: 'Oficial PNP',
    url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'roblox-official-2',
    name: 'Ciudadano Elegante',
    url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'roblox-default-user',
    name: 'Avatar Roblox Clásico',
    url: DEFAULT_ROBLOX_AVATAR,
  },
];

/**
 * Genera un número de DNI peruano auténtico de 8 dígitos con su dígito verificador
 */
export function generateRandomPeruDniNumber(): { dni: string; digit: string } {
  const prefixes = ['7', '4', '6', '8'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const rest = Math.floor(1000000 + Math.random() * 9000000).toString().substring(0, 7);
  const dni = `${prefix}${rest}`;

  const multipliers = [3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(dni[i], 10) * multipliers[i];
  }
  const remainder = 11 - (sum % 11);
  let digit = 'K';
  if (remainder === 11) digit = '0';
  else if (remainder === 10) digit = '1';
  else digit = remainder.toString();

  return { dni, digit };
}

/**
 * Consulta la URL del avatar headshot directamente por User ID de Roblox
 */
export async function getRobloxHeadshotByUserId(userId: string | number): Promise<string | null> {
  const uId = userId.toString().trim();
  if (!uId) return null;

  // Método 1: thumbnails.roblox.com directo (CORS enabled para navegador)
  try {
    const res = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${uId}&size=420x420&format=Png&isCircular=false`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.data && data.data.length > 0 && data.data[0].imageUrl) {
        return data.data[0].imageUrl;
      }
    }
  } catch {}

  // Método 2: thumbnails.roproxy.com
  try {
    const res = await fetch(
      `https://thumbnails.roproxy.com/v1/users/avatar-headshot?userIds=${uId}&size=420x420&format=Png&isCircular=false`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.data && data.data.length > 0 && data.data[0].imageUrl) {
        return data.data[0].imageUrl;
      }
    }
  } catch {}

  return null;
}

/**
 * Intenta obtener la imagen real del avatar de Roblox mediante username o user ID
 */
export async function fetchRobloxAvatarUrl(username: string): Promise<{
  avatarUrl: string;
  userId?: string;
  displayName?: string;
  success: boolean;
  message?: string;
}> {
  let cleanInput = username.trim().replace(/^@/, '');
  // Extraer ID si el usuario pegó un link de perfil ej. https://www.roblox.com/users/3051711533/profile
  const profileMatch = cleanInput.match(/roblox\.com\/users\/(\d+)/i);
  if (profileMatch) {
    cleanInput = profileMatch[1];
  }

  if (!cleanInput) {
    return {
      avatarUrl: DEFAULT_ROBLOX_AVATAR,
      success: false,
      message: 'Ingresa un usuario o ID de Roblox.',
    };
  }

  // Caso 1: El usuario ingresó un ID numérico de Roblox directamente (ej. 3051711533)
  if (/^\d+$/.test(cleanInput)) {
    const headshot = await getRobloxHeadshotByUserId(cleanInput);
    if (headshot) {
      return {
        userId: cleanInput,
        avatarUrl: headshot,
        success: true,
      };
    }
  }

  // Caso 2: Intentar con el endpoint de backend de Node.js si está corriendo
  try {
    const backendRes = await fetch(`/api/roblox/avatar/${encodeURIComponent(cleanInput)}`);
    if (backendRes.ok && backendRes.headers.get('content-type')?.includes('application/json')) {
      const data = await backendRes.json();
      if (data.avatarUrl) {
        return {
          userId: data.userId,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl,
          success: true,
        };
      }
    }
  } catch {}

  // Caso 3: RoProxy API para buscar usuario por username
  try {
    const userRes = await fetch('https://users.roproxy.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernames: [cleanInput],
        excludeBannedUsers: false,
      }),
    });

    if (userRes.ok) {
      const userData = await userRes.json();
      if (userData.data && userData.data.length > 0) {
        const found = userData.data[0];
        const uId = found.id.toString();

        const headshot = await getRobloxHeadshotByUserId(uId);
        if (headshot) {
          return {
            userId: uId,
            displayName: found.displayName || found.name,
            avatarUrl: headshot,
            success: true,
          };
        }
      }
    }
  } catch (err) {
    console.warn('Error en consulta RoProxy:', err);
  }

  // Fallback seguro: Avatar oficial funcional de Roblox
  return {
    avatarUrl: DEFAULT_ROBLOX_AVATAR,
    success: false,
    message: `No se pudo encontrar a "${cleanInput}" en Roblox. Puedes ingresar tu ID numérico de Roblox.`,
  };
}
