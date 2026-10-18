export interface FactionItem {
  id: string;
  name: string;
  badge: string;
  color: string;
  shortDesc: string;
  vehicles: string[];
  responsibilities: string[];
  requirements: string[];
}

export const SERVER_STATS = {
  currentPlayers: 4,
  maxPlayers: 50,
  discordMembers: '18.450',
  serverName: 'PE:RP STREETS | PERÚ RP V3',
  joinCode: 'PERP-PERU-2026',
  robloxPlaceId: '2534724415',
  serverRegion: 'Perú Oficial (LATAM Oeste)',
  ping: '24ms',
  season: 'Temporada Oficial: Calles de Perú',
};

export const FACTIONS: FactionItem[] = [
  {
    id: 'pnp',
    name: 'Policía Nacional del Perú (PNP)',
    badge: 'Fuerza de Orden Público',
    color: 'from-emerald-700 to-green-950',
    shortDesc: 'Encargados de mantener el orden interno, patrullar las calles peruanas, interceptar infractores y garantizar la convivencia pacífica.',
    vehicles: ['Toyota Hilux PNP 4x4', 'Dodge Charger Interceptor', 'Motos Halcones', 'Blindado SUAT'],
    responsibilities: [
      'Patrullaje preventivo y respuesta a llamados de emergencia 105',
      'Operativos viales y control de identidad',
      'Intervenciones tácticas y custodia judicial',
    ],
    requirements: [
      'Whitelist aprobada en PE:RP',
      'Conocer protocolos oficiales de rol policial',
      'Mínimo 15 años y micrófono claro en Discord',
    ],
  },
  {
    id: 'serenazgo',
    name: 'Serenazgo Municipal del Perú',
    badge: 'Cuerpo Municipal',
    color: 'from-sky-700 to-blue-950',
    shortDesc: 'Fuerza municipal encargada de la prevención vecinal, auxilio a peatones, fiscalización comercial y apoyo logístico a la PNP.',
    vehicles: ['Camioneta Serenazgo 4x2', 'Motos de patrullaje rápido', 'Ambulancia Municipal'],
    responsibilities: [
      'Vigilancia en zonas comerciales y peatonales',
      'Apoyo preventivo en cortes de tránsito urbano',
      'Primera respuesta y derivación a comisarías',
    ],
    requirements: [
      'Whitelist básica aprobada',
      'Compromiso de rol respetuoso y cívico',
      'Disponibilidad para patrullaje regular',
    ],
  },
  {
    id: 'samu',
    name: 'SAMU 106 & Bomberos Voluntarios',
    badge: 'Atención Médica y Rescate',
    color: 'from-red-700 to-rose-950',
    shortDesc: 'Atención pre-hospitalaria inmediata, rescate vehicular en accidentes de tránsito y respuesta a emergencias médicas en la ciudad.',
    vehicles: ['Ambulancia SAMU Tipo II', 'Camión Autobomba CGBVP', 'Unidad de Rescate R-4'],
    responsibilities: [
      'Atención de heridos por armas o colisiones de tránsito',
      'Reanimación y traslado de emergencia al hospital',
      'Gestión de zonas de emergencia o rescate urbano',
    ],
    requirements: [
      'Conocimiento de protocolos de rol médico (/me, /do)',
      'Actitud serena bajo presión',
      'Tiempo de respuesta rápida en emergencias',
    ],
  },
  {
    id: 'civiles',
    name: 'Sector Civil & Emprendedores',
    badge: 'Vida Urbana & Economía',
    color: 'from-amber-700 to-yellow-950',
    shortDesc: 'El corazón de la comunidad. Negocios locales, transporte público (combis y taxis), talleres mecánicos, periodismo y vida cotidiana.',
    vehicles: ['Combi Toyota HiAce', 'Taxi Tico & Yaris', 'Camión Grúa', 'Sedán Particular'],
    responsibilities: [
      'Comercio, talleres mecánicos y restaurantes peruanos',
      'Transporte urbano formal e informal',
      'Generación de dinámicas e historias de rol social',
    ],
    requirements: [
      'Respetar normas de convivencia y leyes de tránsito',
      'Mantener rol coherente en todo momento',
    ],
  },
];

export const RADIO_CODES = [
  { code: '10-4', meaning: 'Mensaje comprendido y enterado' },
  { code: '10-7', meaning: 'Fuera de servicio temporal' },
  { code: '10-8', meaning: 'En servicio y disponible para llamados' },
  { code: '10-10', meaning: 'Negativo / No procede' },
  { code: '10-20', meaning: 'Ubicación actual de la unidad' },
  { code: '10-33', meaning: '¡EMERGENCIA MÁXIMA! Oficial en peligro grave' },
  { code: '10-50', meaning: 'Accidente de tránsito con daños' },
  { code: '10-76', meaning: 'En camino hacia el lugar del incidente' },
  { code: '10-80', meaning: 'Persecución activa de vehículo en curso' },
  { code: '10-97', meaning: 'Unidad arribó a la escena' },
];
