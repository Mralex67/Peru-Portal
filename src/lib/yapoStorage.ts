import { YapoAccount, YapoTransaction, YapoBankConfig } from '../types/yapo';
import { getUserDni, getSupabaseClient } from './supabase';
import { PeruDni } from '../types/dni';

const YAPO_ACCOUNTS_KEY = 'perp_yapo_accounts_v1';
const YAPO_TRANSACTIONS_KEY = 'perp_yapo_transactions_v1';
const YAPO_CONFIG_KEY = 'perp_yapo_config_v1';

export const DEFAULT_YAPO_CONFIG: YapoBankConfig = {
  welcomeBonus: 1000,
  maxTransferPerTx: 50000,
  currencySymbol: 'S/',
  currencyName: 'Soles Peruanos',
  discordBotWebhookUrl: '',
  discordBotToken: '',
  syncWithDiscordBot: true,
};

export const YAPO_SUPABASE_SQL = `-- Script SQL Oficial para Banco PE:RP & Yapo (Billetera Digital)
CREATE TABLE IF NOT EXISTS yapo_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT UNIQUE NOT NULL,
  discord_username TEXT,
  roblox_username TEXT NOT NULL,
  roblox_user_id TEXT,
  dni_number TEXT UNIQUE NOT NULL,
  verify_digit TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bank_balance NUMERIC DEFAULT 1000.00,
  cash_balance NUMERIC DEFAULT 250.00,
  status TEXT DEFAULT 'active',
  freeze_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS yapo_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_number TEXT NOT NULL,
  type TEXT NOT NULL,
  sender_dni TEXT,
  sender_roblox TEXT,
  sender_name TEXT,
  sender_avatar TEXT,
  receiver_dni TEXT,
  receiver_roblox TEXT,
  receiver_name TEXT,
  receiver_avatar TEXT,
  amount NUMERIC NOT NULL,
  description TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE yapo_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE yapo_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de Yapo" ON yapo_accounts FOR SELECT USING (true);
CREATE POLICY "Gestión pública de Yapo" ON yapo_accounts FOR ALL USING (true);
CREATE POLICY "Lectura transacciones Yapo" ON yapo_transactions FOR SELECT USING (true);
CREATE POLICY "Registro transacciones Yapo" ON yapo_transactions FOR INSERT WITH CHECK (true);
`;

export function getYapoConfig(): YapoBankConfig {
  if (typeof window === 'undefined') return DEFAULT_YAPO_CONFIG;
  try {
    const raw = localStorage.getItem(YAPO_CONFIG_KEY);
    if (raw) return { ...DEFAULT_YAPO_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_YAPO_CONFIG;
}

export function saveYapoConfig(cfg: Partial<YapoBankConfig>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getYapoConfig();
    const updated = { ...current, ...cfg };
    localStorage.setItem(YAPO_CONFIG_KEY, JSON.stringify(updated));
  } catch {}
}

export function getLocalYapoAccounts(): YapoAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(YAPO_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalYapoAccounts(accounts: YapoAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(YAPO_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {}
}

export function getLocalYapoTransactions(): YapoTransaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(YAPO_TRANSACTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalYapoTransactions(txs: YapoTransaction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(YAPO_TRANSACTIONS_KEY, JSON.stringify(txs));
  } catch {}
}

export function generateOperationNumber(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `OP-${num}`;
}

/**
 * Consulta la cuenta de Yapo por Discord ID
 */
export async function getYapoAccountByDiscordId(discordId: string): Promise<YapoAccount | null> {
  if (!discordId) return null;
  const list = getLocalYapoAccounts();
  const found = list.find((a) => a.discordId === discordId);
  if (found) return found;

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('yapo_accounts')
        .select('*')
        .eq('discord_id', discordId)
        .maybeSingle();

      if (!error && data) {
        const mapped: YapoAccount = {
          id: data.id,
          discordId: data.discord_id,
          discordUsername: data.discord_username,
          robloxUsername: data.roblox_username,
          robloxUserId: data.roblox_user_id,
          dniNumber: data.dni_number,
          verifyDigit: data.verify_digit || '1',
          fullName: data.full_name,
          avatarUrl: data.avatar_url || '',
          bankBalance: Number(data.bank_balance) || 0,
          cashBalance: Number(data.cash_balance) || 0,
          status: data.status || 'active',
          freezeReason: data.freeze_reason,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        const all = getLocalYapoAccounts().filter((a) => a.discordId !== mapped.discordId);
        all.unshift(mapped);
        saveLocalYapoAccounts(all);
        return mapped;
      }
    } catch {}
  }

  return null;
}

/**
 * Busca una cuenta de Yapo por número de DNI o por usuario de Roblox
 */
export async function findYapoAccount(identifier: string): Promise<YapoAccount | null> {
  const clean = identifier.trim().toLowerCase().replace(/^@/, '');
  if (!clean) return null;

  const list = getLocalYapoAccounts();
  const local = list.find(
    (a) =>
      a.dniNumber === clean ||
      a.robloxUsername.toLowerCase() === clean ||
      (a.robloxUserId && a.robloxUserId === clean)
  );
  if (local) return local;

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('yapo_accounts')
        .select('*')
        .or(`dni_number.eq.${clean},roblox_username.ilike.${clean},roblox_user_id.eq.${clean}`)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          discordId: data.discord_id,
          discordUsername: data.discord_username,
          robloxUsername: data.roblox_username,
          robloxUserId: data.roblox_user_id,
          dniNumber: data.dni_number,
          verifyDigit: data.verify_digit || '1',
          fullName: data.full_name,
          avatarUrl: data.avatar_url || '',
          bankBalance: Number(data.bank_balance) || 0,
          cashBalance: Number(data.cash_balance) || 0,
          status: data.status || 'active',
          freezeReason: data.freeze_reason,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch {}
  }

  return null;
}

/**
 * Registra o afilia la cuenta de Yapo verificando estrictamente contra el DNI oficial del usuario
 */
export async function registerYapoAccount(params: {
  discordId: string;
  discordUsername?: string;
  dniNumberInput: string;
}): Promise<{
  success: boolean;
  error?: string;
  account?: YapoAccount;
}> {
  const { discordId, discordUsername, dniNumberInput } = params;
  const cleanInputDni = dniNumberInput.trim();

  if (!cleanInputDni || cleanInputDni.length !== 8) {
    return {
      success: false,
      error: 'Por favor ingresa un número de DNI válido de 8 dígitos.',
    };
  }

  // 1. Verificar si ya tiene cuenta de Yapo
  const existing = await getYapoAccountByDiscordId(discordId);
  if (existing) {
    return {
      success: true,
      account: existing,
    };
  }

  // 2. Obtener el DNI oficial del usuario registrado en RENIEC PE:RP
  const userDni = await getUserDni(discordId);
  if (!userDni) {
    return {
      success: false,
      error: 'No se encontró un DNI emitido para tu cuenta de Discord. Primero debes tramitar tu DNI Peruano en la sección RENIEC.',
    };
  }

  // 3. Validar que el DNI ingresado coincida exactamente con el de su DNI
  if (userDni.dniNumber !== cleanInputDni) {
    return {
      success: false,
      error: `El número de DNI ingresado (${cleanInputDni}) no coincide con tu DNI emitido por RENIEC (${userDni.dniNumber}). Solo puedes afiliar tu propio documento.`,
    };
  }

  const config = getYapoConfig();
  const initialBank = config.welcomeBonus || 1000;
  const initialCash = 250; // Efectivo en mano inicial para rol

  const newAccount: YapoAccount = {
    id: `yapo-${Date.now()}`,
    discordId,
    discordUsername: discordUsername || userDni.discordUsername,
    robloxUsername: userDni.robloxUsername,
    robloxUserId: userDni.robloxUserId,
    dniNumber: userDni.dniNumber,
    verifyDigit: userDni.verifyDigit,
    fullName: userDni.fullName,
    avatarUrl: userDni.photoUrl,
    bankBalance: initialBank,
    cashBalance: initialCash,
    status: userDni.bankStatus === 'frozen' ? 'frozen' : 'active',
    freezeReason: userDni.bankFreezeReason,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Guardar en localStorage
  const list = getLocalYapoAccounts().filter((a) => a.discordId !== discordId);
  list.unshift(newAccount);
  saveLocalYapoAccounts(list);

  // Registrar bono de bienvenida en transacciones
  const welcomeTx: YapoTransaction = {
    id: `tx-${Date.now()}`,
    operationNumber: generateOperationNumber(),
    type: 'welcome_bonus',
    receiverDni: newAccount.dniNumber,
    receiverRoblox: newAccount.robloxUsername,
    receiverName: newAccount.fullName,
    receiverAvatar: newAccount.avatarUrl,
    amount: initialBank,
    description: 'Bono de Apertura y Bienvenida a Yapo PE:RP',
    timestamp: new Date().toISOString(),
  };
  const txs = getLocalYapoTransactions();
  txs.unshift(welcomeTx);
  saveLocalYapoTransactions(txs);

  // Guardar en Supabase si está disponible
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('yapo_accounts').insert([
        {
          discord_id: newAccount.discordId,
          discord_username: newAccount.discordUsername,
          roblox_username: newAccount.robloxUsername,
          roblox_user_id: newAccount.robloxUserId,
          dni_number: newAccount.dniNumber,
          verify_digit: newAccount.verifyDigit,
          full_name: newAccount.fullName,
          avatar_url: newAccount.avatarUrl,
          bank_balance: newAccount.bankBalance,
          cash_balance: newAccount.cashBalance,
          status: newAccount.status,
          freeze_reason: newAccount.freezeReason,
        },
      ]);

      await supabase.from('yapo_transactions').insert([
        {
          operation_number: welcomeTx.operationNumber,
          type: welcomeTx.type,
          receiver_dni: welcomeTx.receiverDni,
          receiver_roblox: welcomeTx.receiverRoblox,
          receiver_name: welcomeTx.receiverName,
          receiver_avatar: welcomeTx.receiverAvatar,
          amount: welcomeTx.amount,
          description: welcomeTx.description,
        },
      ]);
    } catch (e) {
      console.warn('Error sincronizando Yapo con Supabase:', e);
    }
  }

  return {
    success: true,
    account: newAccount,
  };
}

/**
 * Realizar un Yapeo / Transferencia a otro usuario por usuario de Roblox o DNI
 */
export async function transferYapo(params: {
  senderDiscordId: string;
  recipientIdentifier: string;
  amount: number;
  note?: string;
}): Promise<{
  success: boolean;
  error?: string;
  transaction?: YapoTransaction;
  senderAccount?: YapoAccount;
  recipientAccount?: YapoAccount;
}> {
  const { senderDiscordId, recipientIdentifier, amount, note } = params;

  if (amount <= 0 || isNaN(amount)) {
    return { success: false, error: 'Por favor ingresa un monto válido mayor a S/. 0.00' };
  }

  const sender = await getYapoAccountByDiscordId(senderDiscordId);
  if (!sender) {
    return { success: false, error: 'Tu cuenta de Yapo no está activa. Debes afiliarte primero.' };
  }

  if (sender.status === 'frozen') {
    return {
      success: false,
      error: `Tu cuenta se encuentra CONGELADA por orden judicial/policial. Motivo: ${sender.freezeReason || 'Investigación en curso'}.`,
    };
  }

  if (sender.bankBalance < amount) {
    return {
      success: false,
      error: `Saldo insuficiente. Tu saldo en Yapo es de S/. ${sender.bankBalance.toFixed(2)}, pero intentas transferir S/. ${amount.toFixed(2)}.`,
    };
  }

  // Buscar destinatario
  const recipient = await findYapoAccount(recipientIdentifier);
  if (!recipient) {
    return {
      success: false,
      error: `Cuenta inexistente. No se encontró ningún usuario o DNI registrado como "${recipientIdentifier}" en Yapo.`,
    };
  }

  if (recipient.discordId === sender.discordId || recipient.dniNumber === sender.dniNumber) {
    return {
      success: false,
      error: 'No puedes transferirte dinero a ti mismo.',
    };
  }

  if (recipient.status === 'frozen') {
    return {
      success: false,
      error: `No es posible transferir. La cuenta bancaria del destinatario (@${recipient.robloxUsername}) se encuentra congelada.`,
    };
  }

  // Ejecutar transferencia
  const updatedSender: YapoAccount = {
    ...sender,
    bankBalance: sender.bankBalance - amount,
    updatedAt: new Date().toISOString(),
  };

  const updatedRecipient: YapoAccount = {
    ...recipient,
    bankBalance: recipient.bankBalance + amount,
    updatedAt: new Date().toISOString(),
  };

  const opNumber = generateOperationNumber();
  const tx: YapoTransaction = {
    id: `tx-${Date.now()}`,
    operationNumber: opNumber,
    type: 'transfer_sent',
    senderDni: sender.dniNumber,
    senderRoblox: sender.robloxUsername,
    senderName: sender.fullName,
    senderAvatar: sender.avatarUrl,
    receiverDni: recipient.dniNumber,
    receiverRoblox: recipient.robloxUsername,
    receiverName: recipient.fullName,
    receiverAvatar: recipient.avatarUrl,
    amount,
    description: note?.trim() || 'Transferencia por Yapo PE:RP',
    timestamp: new Date().toISOString(),
  };

  // Guardar cuentas actualizadas en local
  const accounts = getLocalYapoAccounts().map((a) => {
    if (a.discordId === updatedSender.discordId) return updatedSender;
    if (a.discordId === updatedRecipient.discordId) return updatedRecipient;
    return a;
  });
  saveLocalYapoAccounts(accounts);

  // Guardar transacciones
  const txs = getLocalYapoTransactions();
  txs.unshift(tx);
  saveLocalYapoTransactions(txs);

  // Guardar en Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from('yapo_accounts')
        .update({ bank_balance: updatedSender.bankBalance, updated_at: updatedSender.updatedAt })
        .eq('discord_id', updatedSender.discordId);

      await supabase
        .from('yapo_accounts')
        .update({ bank_balance: updatedRecipient.bankBalance, updated_at: updatedRecipient.updatedAt })
        .eq('discord_id', updatedRecipient.discordId);

      await supabase.from('yapo_transactions').insert([
        {
          operation_number: tx.operationNumber,
          type: tx.type,
          sender_dni: tx.senderDni,
          sender_roblox: tx.senderRoblox,
          sender_name: tx.senderName,
          sender_avatar: tx.senderAvatar,
          receiver_dni: tx.receiverDni,
          receiver_roblox: tx.receiverRoblox,
          receiver_name: tx.receiverName,
          receiver_avatar: tx.receiverAvatar,
          amount: tx.amount,
          description: tx.description,
        },
      ]);
    } catch (e) {
      console.warn('Error actualizando Supabase en transferencia:', e);
    }
  }

  return {
    success: true,
    transaction: tx,
    senderAccount: updatedSender,
    recipientAccount: updatedRecipient,
  };
}

/**
 * Retirar dinero del Banco a la Mano (ATM / Cajero PE:RP)
 */
export async function withdrawCash(
  discordId: string,
  amount: number
): Promise<{
  success: boolean;
  error?: string;
  account?: YapoAccount;
  transaction?: YapoTransaction;
}> {
  if (amount <= 0 || isNaN(amount)) {
    return { success: false, error: 'Monto inválido para retirar.' };
  }

  const account = await getYapoAccountByDiscordId(discordId);
  if (!account) return { success: false, error: 'Cuenta no encontrada.' };

  if (account.status === 'frozen') {
    return { success: false, error: 'Tu cuenta bancaria está congelada.' };
  }

  if (account.bankBalance < amount) {
    return {
      success: false,
      error: `Saldo insuficiente en banco. Saldo disponible: S/. ${account.bankBalance.toFixed(2)}`,
    };
  }

  const updated: YapoAccount = {
    ...account,
    bankBalance: account.bankBalance - amount,
    cashBalance: account.cashBalance + amount,
    updatedAt: new Date().toISOString(),
  };

  const tx: YapoTransaction = {
    id: `tx-${Date.now()}`,
    operationNumber: generateOperationNumber(),
    type: 'withdraw_cash',
    senderDni: account.dniNumber,
    senderRoblox: account.robloxUsername,
    senderName: account.fullName,
    senderAvatar: account.avatarUrl,
    amount,
    description: 'Retiro de efectivo a la mano (Cajero ATM PE:RP)',
    timestamp: new Date().toISOString(),
  };

  const list = getLocalYapoAccounts().map((a) => (a.discordId === discordId ? updated : a));
  saveLocalYapoAccounts(list);

  const txs = getLocalYapoTransactions();
  txs.unshift(tx);
  saveLocalYapoTransactions(txs);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from('yapo_accounts')
        .update({
          bank_balance: updated.bankBalance,
          cash_balance: updated.cashBalance,
          updated_at: updated.updatedAt,
        })
        .eq('discord_id', discordId);

      await supabase.from('yapo_transactions').insert([
        {
          operation_number: tx.operationNumber,
          type: tx.type,
          sender_dni: tx.senderDni,
          sender_roblox: tx.senderRoblox,
          sender_name: tx.senderName,
          amount: tx.amount,
          description: tx.description,
        },
      ]);
    } catch {}
  }

  return { success: true, account: updated, transaction: tx };
}

/**
 * Depositar dinero de la Mano al Banco
 */
export async function depositCash(
  discordId: string,
  amount: number
): Promise<{
  success: boolean;
  error?: string;
  account?: YapoAccount;
  transaction?: YapoTransaction;
}> {
  if (amount <= 0 || isNaN(amount)) {
    return { success: false, error: 'Monto inválido para depositar.' };
  }

  const account = await getYapoAccountByDiscordId(discordId);
  if (!account) return { success: false, error: 'Cuenta no encontrada.' };

  if (account.cashBalance < amount) {
    return {
      success: false,
      error: `No tienes suficiente dinero en efectivo en mano. Efectivo disponible: S/. ${account.cashBalance.toFixed(2)}`,
    };
  }

  const updated: YapoAccount = {
    ...account,
    bankBalance: account.bankBalance + amount,
    cashBalance: account.cashBalance - amount,
    updatedAt: new Date().toISOString(),
  };

  const tx: YapoTransaction = {
    id: `tx-${Date.now()}`,
    operationNumber: generateOperationNumber(),
    type: 'deposit_cash',
    receiverDni: account.dniNumber,
    receiverRoblox: account.robloxUsername,
    receiverName: account.fullName,
    receiverAvatar: account.avatarUrl,
    amount,
    description: 'Depósito de dinero en mano al Banco Yapo',
    timestamp: new Date().toISOString(),
  };

  const list = getLocalYapoAccounts().map((a) => (a.discordId === discordId ? updated : a));
  saveLocalYapoAccounts(list);

  const txs = getLocalYapoTransactions();
  txs.unshift(tx);
  saveLocalYapoTransactions(txs);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from('yapo_accounts')
        .update({
          bank_balance: updated.bankBalance,
          cash_balance: updated.cashBalance,
          updated_at: updated.updatedAt,
        })
        .eq('discord_id', discordId);
    } catch {}
  }

  return { success: true, account: updated, transaction: tx };
}

/**
 * Obtener transacciones relacionadas a una cuenta
 */
export function getAccountTransactions(dniNumber: string): YapoTransaction[] {
  const all = getLocalYapoTransactions();
  return all.filter((t) => t.senderDni === dniNumber || t.receiverDni === dniNumber);
}

/**
 * Funciones de Administración para el Panel Admin
 */
export function adminUpdateBalances(
  identifier: string,
  bankBalance: number,
  cashBalance: number
): boolean {
  const clean = identifier.trim().toLowerCase().replace(/^@/, '');
  const list = getLocalYapoAccounts();
  const updated = list.map((a) => {
    if (
      a.dniNumber === clean ||
      a.robloxUsername.toLowerCase() === clean ||
      a.discordId === clean
    ) {
      return {
        ...a,
        bankBalance: isNaN(bankBalance) ? a.bankBalance : bankBalance,
        cashBalance: isNaN(cashBalance) ? a.cashBalance : cashBalance,
        updatedAt: new Date().toISOString(),
      };
    }
    return a;
  });
  saveLocalYapoAccounts(updated);

  const supabase = getSupabaseClient();
  if (supabase) {
    (async () => {
      try {
        await supabase
          .from('yapo_accounts')
          .update({ bank_balance: bankBalance, cash_balance: cashBalance, updated_at: new Date().toISOString() })
          .or(`dni_number.eq.${clean},roblox_username.ilike.${clean},discord_id.eq.${clean}`);
      } catch {}
    })();
  }
  return true;
}

export function adminToggleFreezeAccount(
  identifier: string,
  freeze: boolean,
  reason?: string
): boolean {
  const clean = identifier.trim().toLowerCase().replace(/^@/, '');
  const list = getLocalYapoAccounts();
  const updated = list.map((a) => {
    if (
      a.dniNumber === clean ||
      a.robloxUsername.toLowerCase() === clean ||
      a.discordId === clean
    ) {
      return {
        ...a,
        status: (freeze ? 'frozen' : 'active') as 'frozen' | 'active',
        freezeReason: freeze ? (reason || 'Congelamiento administrativo') : undefined,
        updatedAt: new Date().toISOString(),
      };
    }
    return a;
  });
  saveLocalYapoAccounts(updated);

  const supabase = getSupabaseClient();
  if (supabase) {
    (async () => {
      try {
        await supabase
          .from('yapo_accounts')
          .update({
            status: freeze ? 'frozen' : 'active',
            freeze_reason: freeze ? (reason || 'Congelamiento administrativo') : null,
            updated_at: new Date().toISOString(),
          })
          .or(`dni_number.eq.${clean},roblox_username.ilike.${clean},discord_id.eq.${clean}`);
      } catch {}
    })();
  }
  return true;
}

export function resetYapoAccount(identifier: string): boolean {
  const clean = identifier.trim().toLowerCase().replace(/^@/, '');
  const list = getLocalYapoAccounts().filter(
    (a) =>
      a.dniNumber !== clean &&
      a.robloxUsername.toLowerCase() !== clean &&
      a.discordId !== clean
  );
  saveLocalYapoAccounts(list);

  const supabase = getSupabaseClient();
  if (supabase) {
    (async () => {
      try {
        await supabase
          .from('yapo_accounts')
          .delete()
          .or(`dni_number.eq.${clean},roblox_username.ilike.${clean},discord_id.eq.${clean}`);
      } catch {}
    })();
  }
  return true;
}

export function resetAllYapo(): boolean {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(YAPO_ACCOUNTS_KEY);
    localStorage.removeItem(YAPO_TRANSACTIONS_KEY);
  }
  const supabase = getSupabaseClient();
  if (supabase) {
    (async () => {
      try {
        await supabase.from('yapo_accounts').delete().neq('dni_number', '00000000');
        await supabase.from('yapo_transactions').delete().neq('operation_number', '000000');
      } catch {}
    })();
  }
  return true;
}
