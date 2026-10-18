/**
 * Helper para resolver avatares y usuarios de Roblox
 */

export const PRESET_ROBLOX_AVATARS = [
  {
    id: 'roblox-citizen-1',
    name: 'Ciudadano Elegante',
    url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'roblox-pnp-1',
    name: 'Cadete PNP',
    url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'roblox-civil-2',
    name: 'Conductor / Transportista',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
  },
];

/**
 * Genera un número de DNI peruano auténtico de 8 dígitos con su dígito verificador
 */
export function generateRandomPeruDniNumber(): { dni: string; digit: string } {
  // Typical series: 7xxxxxxx or 4xxxxxxx
  const prefixes = ['7', '4', '6', '8'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const rest = Math.floor(1000000 + Math.random() * 9000000).toString().substring(0, 7);
  const dni = `${prefix}${rest}`;
  
  // Algoritmo de dígito verificador módulo 11 de RENIEC
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
 * Intenta obtener la imagen de Roblox mediante el username
 */
export async function fetchRobloxAvatarUrl(username: string): Promise<{
  avatarUrl: string;
  userId?: string;
}> {
  const cleanUsername = username.trim();
  if (!cleanUsername) {
    return { avatarUrl: PRESET_ROBLOX_AVATARS[0].url };
  }

  // 1. Try public Roblox avatar thumbnail service or proxy
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(
      `https://users.roblox.com/v1/usernames/users`
    )}`;

    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernames: [cleanUsername],
        excludeBannedUsers: false,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.contents) {
        const parsed = JSON.parse(data.contents);
        if (parsed.data && parsed.data.length > 0) {
          const uId = parsed.data[0].id;
          return {
            userId: uId.toString(),
            avatarUrl: `https://www.roblox.com/headshot-thumbnail/image?userId=${uId}&width=420&height=420&format=png`,
          };
        }
      }
    }
  } catch (err) {
    // fallback
  }

  // 2. Direct headshot thumbnail (many browsers resolve this directly)
  // If user enters an ID instead of a name:
  if (/^\d+$/.test(cleanUsername)) {
    return {
      userId: cleanUsername,
      avatarUrl: `https://www.roblox.com/headshot-thumbnail/image?userId=${cleanUsername}&width=420&height=420&format=png`,
    };
  }

  // 3. Fallback to nice avatar with their initial and Peruvian style
  return {
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}&backgroundColor=0c0e18`,
  };
}
