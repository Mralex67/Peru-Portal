/**
 * Helper para resolver avatares y usuarios de Roblox
 */

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
 * Intenta obtener la imagen real del avatar de Roblox mediante username o user ID
 */
export async function fetchRobloxAvatarUrl(username: string): Promise<{
  avatarUrl: string;
  userId?: string;
  displayName?: string;
}> {
  const cleanUsername = username.trim().replace(/^@/, '');
  if (!cleanUsername) {
    return { avatarUrl: PRESET_ROBLOX_AVATARS[0].url };
  }

  // Caso 1: Si el usuario ingresó un ID numérico de Roblox directamente (ej. 1560384206)
  if (/^\d+$/.test(cleanUsername)) {
    try {
      const thumbRes = await fetch(
        `https://thumbnails.roproxy.com/v1/users/avatar-headshot?userIds=${cleanUsername}&size=420x420&format=Png&isCircular=false`
      );
      if (thumbRes.ok) {
        const thumbData = await thumbRes.json();
        if (thumbData.data && thumbData.data.length > 0 && thumbData.data[0].imageUrl) {
          return {
            userId: cleanUsername,
            avatarUrl: thumbData.data[0].imageUrl,
          };
        }
      }
    } catch {}

    return {
      userId: cleanUsername,
      avatarUrl: `https://www.roblox.com/headshot-thumbnail/image?userId=${cleanUsername}&width=420&height=420&format=png`,
    };
  }

  // Caso 2: Intentar con el endpoint de backend si está disponible
  try {
    const backendRes = await fetch(`/api/roblox/avatar/${encodeURIComponent(cleanUsername)}`);
    if (backendRes.ok && backendRes.headers.get('content-type')?.includes('application/json')) {
      const data = await backendRes.json();
      if (data.avatarUrl) {
        return {
          userId: data.userId,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl,
        };
      }
    }
  } catch {}

  // Caso 3: RoProxy CORS API para buscar usuario por username
  try {
    const userRes = await fetch('https://users.roproxy.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernames: [cleanUsername],
        excludeBannedUsers: false,
      }),
    });

    if (userRes.ok) {
      const userData = await userRes.json();
      if (userData.data && userData.data.length > 0) {
        const found = userData.data[0];
        const uId = found.id.toString();

        // Obtener avatar headshot oficial en alta resolución
        try {
          const thumbRes = await fetch(
            `https://thumbnails.roproxy.com/v1/users/avatar-headshot?userIds=${uId}&size=420x420&format=Png&isCircular=false`
          );
          if (thumbRes.ok) {
            const thumbData = await thumbRes.json();
            if (thumbData.data && thumbData.data.length > 0 && thumbData.data[0].imageUrl) {
              return {
                userId: uId,
                displayName: found.displayName || found.name,
                avatarUrl: thumbData.data[0].imageUrl,
              };
            }
          }
        } catch {}

        // Fallback a Roblox headshot CDN directo
        return {
          userId: uId,
          displayName: found.displayName || found.name,
          avatarUrl: `https://www.roblox.com/headshot-thumbnail/image?userId=${uId}&width=420&height=420&format=png`,
        };
      }
    }
  } catch (err) {
    console.warn('Error resolviendo avatar con RoProxy:', err);
  }

  // Caso 4: Fallback con avatar representativo de Roblox en uniforme o estilo civil
  return {
    avatarUrl: `https://www.roblox.com/headshot-thumbnail/image?userId=1&width=420&height=420&format=png`,
  };
}
