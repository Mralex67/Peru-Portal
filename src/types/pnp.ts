export interface PnpArrest {
  id: string;
  arrestCode: string; // e.g. "A-0017"
  suspectRoblox: string;
  suspectDiscordId?: string;
  suspectDni?: string;
  suspectName?: string;
  charges: string; // e.g. "Intento de Homicidio"
  timeMinutes: number; // e.g. 3
  timeDisplay: string; // e.g. "3m (3 minutos)"
  bailAmount: number; // e.g. 5000
  bailDisplay: string; // e.g. "S/5,000"
  officerName: string; // e.g. "@Jhair"
  officerDiscordId?: string;
  evidenceImageUrl?: string;
  status: 'active' | 'served' | 'bailed';
  createdAt: string; // e.g. "2026-10-24"
  createdAtTime?: string; // e.g. "22:45"
  releaseDateText?: string; // e.g. "hace 6 días" o "Activo"
}

export interface PnpFine {
  id: string;
  fineCode: string; // e.g. "M-0005"
  suspectRoblox: string;
  suspectDiscordId?: string;
  suspectDni?: string;
  amount: number; // e.g. 700
  amountDisplay: string; // e.g. "S/700"
  reason: string; // e.g. "Conduccion temeraria"
  status: 'Pendiente' | 'Pagada';
  issuedBy: string; // e.g. "jhair9813"
  issuedDate: string; // e.g. "2026-10-24"
  createdAt: string;
}

export interface PnpSanction {
  id: string;
  userRoblox: string;
  userDiscordId?: string;
  reason: string;
  proofUrl?: string;
  issuedBy: string;
  createdAt: string;
}

export interface PnpPenalArticle {
  code: string;
  category: 'delito' | 'infraccion';
  title: string;
  description: string;
  prisonMinutes?: number;
  fineAmount?: number;
  bailAmount?: number;
}

export const PNP_PENAL_CODE: PnpPenalArticle[] = [
  {
    code: 'Art. 106',
    category: 'delito',
    title: 'Homicidio Simple / Calificado',
    description: 'Atentar contra la vida de un ciudadano u oficial de policía.',
    prisonMinutes: 10,
    bailAmount: 15000,
  },
  {
    code: 'Art. 108',
    category: 'delito',
    title: 'Intento de Homicidio',
    description: 'Tentativa deliberada de causar la muerte a otra persona.',
    prisonMinutes: 5,
    bailAmount: 5000,
  },
  {
    code: 'Art. 188',
    category: 'delito',
    title: 'Robo Agravado / A Mano Armada',
    description: 'Asalto a mano armada a banco, joyería, tienda o transeúnte.',
    prisonMinutes: 7,
    bailAmount: 10000,
  },
  {
    code: 'Art. 279',
    category: 'delito',
    title: 'Tenencia Ilegal de Armas de Fuego',
    description: 'Portar armamento sin el permiso reglamentario de SUCAMEC.',
    prisonMinutes: 5,
    bailAmount: 6000,
  },
  {
    code: 'Art. 365',
    category: 'delito',
    title: 'Desobediencia y Resistencia a la Autoridad',
    description: 'Darse a la fuga en persecución vehicular o evadir comandos policiales.',
    prisonMinutes: 4,
    bailAmount: 4000,
  },
  {
    code: 'Art. 185',
    category: 'delito',
    title: 'Hurto de Vehículo Automotor',
    description: 'Sustracción ilegítima de vehículos civiles o estatales.',
    prisonMinutes: 4,
    bailAmount: 4500,
  },
  {
    code: 'Art. 25',
    category: 'delito',
    title: 'Complicidad Primaria en Delito',
    description: 'Cooperación o auxilio directo en la comisión de un delito.',
    prisonMinutes: 3,
    bailAmount: 3000,
  },
  {
    code: 'M-01',
    category: 'infraccion',
    title: 'Conducción Bajo Efectos de Sustancias',
    description: 'Manejar bajo influencia de alcohol o estupefacientes.',
    fineAmount: 2100,
  },
  {
    code: 'M-02',
    category: 'infraccion',
    title: 'No Portar Licencia de Conducir (Rol 1556723203114668082)',
    description: 'Operar vehículo automotor sin contar con brevete oficial activo.',
    fineAmount: 500,
  },
  {
    code: 'M-03',
    category: 'infraccion',
    title: 'Pasar Semáforo en Rojo',
    description: 'Cruzar intersección vial cuando la señal luminosa está en rojo.',
    fineAmount: 350,
  },
  {
    code: 'M-04',
    category: 'infraccion',
    title: 'Exceso de Velocidad',
    description: 'Superar los límites de velocidad establecidos en la vía urbana.',
    fineAmount: 300,
  },
  {
    code: 'M-05',
    category: 'infraccion',
    title: 'Conducción Temeraria / Piques Ilegales',
    description: 'Maniobras peligrosas, contra el tráfico o carreras callejeras.',
    fineAmount: 700,
  },
  {
    code: 'M-06',
    category: 'infraccion',
    title: 'Estacionar en Zona Prohibida / Bloqueo Vial',
    description: 'Obstrucción del libre tránsito o estacionar en línea amarilla.',
    fineAmount: 200,
  },
];
