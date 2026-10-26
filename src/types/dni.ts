export interface PeruDni {
  id: string;
  discordId: string;
  discordUsername: string;
  discordDisplayName?: string;
  robloxUsername: string;
  robloxUserId?: string;
  dniNumber: string;
  verifyDigit: string;
  fullName: string;
  firstSurname: string;
  secondSurname: string;
  givenNames: string;
  birthDate: string;
  issueDate: string;
  expiryDate: string;
  gender: 'M' | 'F' | 'Masculino' | 'Femenino';
  civilStatus: 'S' | 'C' | 'V' | 'D' | 'SOLTERO' | 'CASADO' | 'DIVORCIADO' | 'VIUDO';
  organDonation?: 'SI' | 'NO';
  votingGroup?: string;
  serialCode?: string;
  ubigeo: string;
  photoUrl: string;
  signatureText: string;
  createdAt: string;

  // Administrative Control & Judicial statuses
  status?: 'active' | 'suspended' | 'revoked';
  suspensionReason?: string;
  bankStatus?: 'active' | 'frozen';
  bankFreezeReason?: string;
  wantedStatus?: boolean;
  wantedReason?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  configured: boolean;
}
