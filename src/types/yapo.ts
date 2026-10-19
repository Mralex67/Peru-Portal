export interface YapoAccount {
  id: string;
  discordId: string;
  discordUsername?: string;
  robloxUsername: string;
  robloxUserId?: string;
  dniNumber: string;
  verifyDigit: string;
  fullName: string;
  avatarUrl: string;
  bankBalance: number; // Dinero en Banco / Yapo (S/.)
  cashBalance: number; // Dinero en Mano / Efectivo (S/.)
  status: 'active' | 'frozen';
  freezeReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type YapoTransactionType =
  | 'transfer_sent'
  | 'transfer_received'
  | 'withdraw_cash'
  | 'deposit_cash'
  | 'admin_adjustment'
  | 'welcome_bonus';

export interface YapoTransaction {
  id: string;
  operationNumber: string;
  type: YapoTransactionType;
  senderDni?: string;
  senderRoblox?: string;
  senderName?: string;
  senderAvatar?: string;
  receiverDni?: string;
  receiverRoblox?: string;
  receiverName?: string;
  receiverAvatar?: string;
  amount: number;
  description: string;
  timestamp: string;
}

export interface YapoBankConfig {
  welcomeBonus: number;
  maxTransferPerTx: number;
  currencySymbol: string;
  currencyName: string;
  discordBotWebhookUrl?: string;
  discordBotToken?: string;
  syncWithDiscordBot: boolean;
}
