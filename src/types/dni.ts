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
  gender: 'M' | 'F';
  civilStatus: 'S' | 'C' | 'V' | 'D';
  ubigeo: string;
  photoUrl: string;
  signatureText: string;
  createdAt: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  configured: boolean;
}
