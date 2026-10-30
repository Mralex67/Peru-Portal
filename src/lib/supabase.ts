import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PeruDni, SupabaseConfig } from '../types/dni';

const STORAGE_URL_KEY = 'perp_supabase_url';
const STORAGE_KEY_KEY = 'perp_supabase_anon_key';
const LOCAL_DNIS_KEY = 'perp_local_dnis_v2';

// SQL table initialization script for Supabase
export const SUPABASE_SQL_INIT = `-- Script SQL Oficial para crear la tabla de DNIs en Supabase (RENIEC PE:RP)
CREATE TABLE IF NOT EXISTS peru_dnis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT UNIQUE NOT NULL,
  discord_username TEXT,
  discord_display_name TEXT,
  roblox_username TEXT NOT NULL,
  roblox_user_id TEXT,
  dni_number TEXT UNIQUE NOT NULL,
  verify_digit TEXT NOT NULL,
  full_name TEXT NOT NULL,
  first_surname TEXT NOT NULL,
  second_surname TEXT NOT NULL,
  given_names TEXT NOT NULL,
  birth_date TEXT,
  issue_date TEXT,
  expiry_date TEXT,
  gender TEXT DEFAULT 'M',
  civil_status TEXT DEFAULT 'S',
  ubigeo TEXT DEFAULT '150101',
  photo_url TEXT,
  signature_text TEXT,
  status TEXT DEFAULT 'active',
  suspension_reason TEXT,
  bank_status TEXT DEFAULT 'active',
  bank_freeze_reason TEXT,
  wanted_status BOOLEAN DEFAULT false,
  wanted_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security y políticas
ALTER TABLE peru_dnis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura de DNIs"
  ON peru_dnis FOR SELECT
  USING (true);

CREATE POLICY "Permitir crear DNI único por Discord"
  ON peru_dnis FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir actualizar DNIs"
  ON peru_dnis FOR UPDATE
  USING (true);

CREATE POLICY "Permitir eliminar DNIs"
  ON peru_dnis FOR DELETE
  USING (true);
`;

export const COMBINED_SUPABASE_SQL = `-- =========================================================================
-- SCRIPT SQL OFICIAL COMPLETO: PE:RP STREETS - RENIEC DNI & BANCO YA P
-- Ejecuta este script en Supabase > SQL Editor para crear todas las tablas
-- =========================================================================

-- 1. TABLA OFICIAL DE DNIS (RENIEC)
CREATE TABLE IF NOT EXISTS peru_dnis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT UNIQUE NOT NULL,
  discord_username TEXT,
  discord_display_name TEXT,
  roblox_username TEXT NOT NULL,
  roblox_user_id TEXT,
  dni_number TEXT UNIQUE NOT NULL,
  verify_digit TEXT NOT NULL,
  full_name TEXT NOT NULL,
  first_surname TEXT NOT NULL,
  second_surname TEXT NOT NULL,
  given_names TEXT NOT NULL,
  birth_date TEXT,
  issue_date TEXT,
  expiry_date TEXT,
  gender TEXT DEFAULT 'M',
  civil_status TEXT DEFAULT 'S',
  ubigeo TEXT DEFAULT '150101',
  photo_url TEXT,
  signature_text TEXT,
  status TEXT DEFAULT 'active',
  suspension_reason TEXT,
  bank_status TEXT DEFAULT 'active',
  bank_freeze_reason TEXT,
  wanted_status BOOLEAN DEFAULT false,
  wanted_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA OFICIAL DE BANCO YA P (CUENTAS Y SALDOS)
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

-- 3. TABLA DE HISTORIAL Y COMPROBANTES DE TRANSACCIONES
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

-- 4. TABLA DE ARRESTOS POLICIALES (PNP SIPOL)
CREATE TABLE IF NOT EXISTS pnp_arrests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  citizen_identifier TEXT NOT NULL,
  citizen_name TEXT NOT NULL,
  charges TEXT NOT NULL,
  duration_text TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 5,
  bail_amount NUMERIC DEFAULT 0,
  officer_name TEXT NOT NULL,
  officer_discord_id TEXT,
  evidence_url TEXT,
  status TEXT DEFAULT 'cumplido',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- 5. TABLA DE MULTAS DE TRÁNSITO (PNP)
CREATE TABLE IF NOT EXISTS pnp_fines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  citizen_identifier TEXT NOT NULL,
  citizen_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pendiente',
  officer_name TEXT NOT NULL,
  officer_discord_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- 6. TABLA DE SANCIONES ADMINISTRATIVAS
CREATE TABLE IF NOT EXISTS pnp_sanctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id TEXT NOT NULL,
  target_username TEXT NOT NULL,
  moderator_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  evidence_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE peru_dnis ENABLE ROW LEVEL SECURITY;
ALTER TABLE yapo_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE yapo_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnp_arrests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnp_fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnp_sanctions ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PARA peru_dnis
DROP POLICY IF EXISTS "Permitir lectura de DNIs" ON peru_dnis;
CREATE POLICY "Permitir lectura de DNIs" ON peru_dnis FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir crear DNI único por Discord" ON peru_dnis;
CREATE POLICY "Permitir crear DNI único por Discord" ON peru_dnis FOR ALL USING (true);

-- POLÍTICAS PARA yapo_accounts
DROP POLICY IF EXISTS "Lectura pública de Yapo" ON yapo_accounts;
CREATE POLICY "Lectura pública de Yapo" ON yapo_accounts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestión pública de Yapo" ON yapo_accounts;
CREATE POLICY "Gestión pública de Yapo" ON yapo_accounts FOR ALL USING (true);

-- POLÍTICAS PARA yapo_transactions
DROP POLICY IF EXISTS "Lectura transacciones Yapo" ON yapo_transactions;
CREATE POLICY "Lectura transacciones Yapo" ON yapo_transactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Registro transacciones Yapo" ON yapo_transactions;
CREATE POLICY "Registro transacciones Yapo" ON yapo_transactions FOR ALL USING (true);

-- POLÍTICAS PARA pnp_arrests
DROP POLICY IF EXISTS "Lectura pnp_arrests" ON pnp_arrests;
CREATE POLICY "Lectura pnp_arrests" ON pnp_arrests FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestion pnp_arrests" ON pnp_arrests;
CREATE POLICY "Gestion pnp_arrests" ON pnp_arrests FOR ALL USING (true);

-- POLÍTICAS PARA pnp_fines
DROP POLICY IF EXISTS "Lectura pnp_fines" ON pnp_fines;
CREATE POLICY "Lectura pnp_fines" ON pnp_fines FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestion pnp_fines" ON pnp_fines;
CREATE POLICY "Gestion pnp_fines" ON pnp_fines FOR ALL USING (true);

-- POLÍTICAS PARA pnp_sanctions
DROP POLICY IF EXISTS "Lectura pnp_sanctions" ON pnp_sanctions;
CREATE POLICY "Lectura pnp_sanctions" ON pnp_sanctions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestion pnp_sanctions" ON pnp_sanctions;
CREATE POLICY "Gestion pnp_sanctions" ON pnp_sanctions FOR ALL USING (true);
`;

export function getSupabaseConfig(): SupabaseConfig {
  let url = '';
  let anonKey = '';

  if (typeof window !== 'undefined') {
    url = localStorage.getItem(STORAGE_URL_KEY) || (import.meta.env.VITE_SUPABASE_URL as string) || '';
    anonKey = localStorage.getItem(STORAGE_KEY_KEY) || (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
  }

  return {
    url: url.trim(),
    anonKey: anonKey.trim(),
    configured: Boolean(url.trim() && anonKey.trim()),
  };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_URL_KEY, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
    // Auto-sync to server so other browsers/devices receive it
    fetch('/api/supabase/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() }),
    }).catch(() => {});
  }
}

/**
 * Synchronize Supabase configuration from server if not already in localStorage
 */
export async function syncSupabaseConfig(): Promise<SupabaseConfig> {
  let cfg = getSupabaseConfig();
  if (cfg.configured) return cfg;

  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/supabase/config');
      if (res.ok) {
        const json = await res.json();
        if (json && json.url && json.anonKey) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_URL_KEY, json.url.trim());
            localStorage.setItem(STORAGE_KEY_KEY, json.anonKey.trim());
          }
          cachedClient = null;
          return getSupabaseConfig();
        }
      }
    } catch {}
  }
  return cfg;
}

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.configured) return null;

  if (cachedClient && lastUsedUrl === config.url && lastUsedKey === config.anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: { persistSession: false },
    });
    lastUsedUrl = config.url;
    lastUsedKey = config.anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Error inicializando cliente de Supabase:', err);
    return null;
  }
}

// Local storage fallback helpers
export function getLocalDnis(): PeruDni[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_DNIS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalDni(dni: PeruDni): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalDnis().filter((d) => d.discordId !== dni.discordId && d.dniNumber !== dni.dniNumber);
    current.unshift(dni);
    localStorage.setItem(LOCAL_DNIS_KEY, JSON.stringify(current));
  } catch (err) {
    console.error('Error guardando DNI en localStorage:', err);
  }
}

function mapSupabaseRow(data: any): PeruDni {
  return {
    id: data.id,
    discordId: data.discord_id,
    discordUsername: data.discord_username || '',
    discordDisplayName: data.discord_display_name || '',
    robloxUsername: data.roblox_username,
    robloxUserId: data.roblox_user_id || '',
    dniNumber: data.dni_number,
    verifyDigit: data.verify_digit || '1',
    fullName: data.full_name,
    firstSurname: data.first_surname || '',
    secondSurname: data.second_surname || '',
    givenNames: data.given_names || '',
    birthDate: data.birth_date || '01 ENE 2002',
    issueDate: data.issue_date || '18 OCT 2026',
    expiryDate: data.expiry_date || '18 OCT 2034',
    gender: (data.gender as 'M' | 'F') || 'M',
    civilStatus: (data.civil_status as 'S' | 'C' | 'V' | 'D') || 'S',
    ubigeo: data.ubigeo || '150101',
    photoUrl: data.photo_url || '',
    signatureText: data.signature_text || data.full_name,
    status: (data.status as 'active' | 'suspended' | 'revoked') || 'active',
    suspensionReason: data.suspension_reason || '',
    bankStatus: (data.bank_status as 'active' | 'frozen') || 'active',
    bankFreezeReason: data.bank_freeze_reason || '',
    wantedStatus: Boolean(data.wanted_status),
    wantedReason: data.wanted_reason || '',
    createdAt: data.created_at || new Date().toISOString(),
  };
}

/**
 * Consulta si un usuario ya tramitó su DNI en Supabase, servidor o local
 * Soporta consulta por Discord ID, Roblox Username, Discord Username o N° DNI
 */
export async function getUserDni(
  identifier: string,
  secondaryIdentifier?: string
): Promise<PeruDni | null> {
  const clean = (identifier || '').trim().replace(/^@/, '');
  const cleanSec = (secondaryIdentifier || '').trim().replace(/^@/, '');
  if (!clean && !cleanSec) return null;

  // Make sure configuration is synced from server
  await syncSupabaseConfig();

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const orConditions: string[] = [];
      if (clean) {
        orConditions.push(
          `discord_id.eq.${clean}`,
          `roblox_username.ilike.${clean}`,
          `dni_number.eq.${clean}`,
          `discord_username.ilike.${clean}`
        );
      }
      if (cleanSec && cleanSec !== clean) {
        orConditions.push(
          `discord_id.eq.${cleanSec}`,
          `roblox_username.ilike.${cleanSec}`,
          `dni_number.eq.${cleanSec}`,
          `discord_username.ilike.${cleanSec}`
        );
      }

      const { data, error } = await supabase
        .from('peru_dnis')
        .select('*')
        .or(orConditions.join(','))
        .maybeSingle();

      if (!error && data) {
        const mapped = mapSupabaseRow(data);
        saveLocalDni(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('Fallo consulta a Supabase, intentando con backend y caché local:', err);
    }
  }

  // Check local cache
  const locals = getLocalDnis();
  const foundLocal = locals.find(
    (d) =>
      (clean && (
        d.discordId === clean ||
        d.dniNumber === clean ||
        d.robloxUsername?.toLowerCase() === clean.toLowerCase() ||
        d.discordUsername?.toLowerCase() === clean.toLowerCase()
      )) ||
      (cleanSec && (
        d.discordId === cleanSec ||
        d.dniNumber === cleanSec ||
        d.robloxUsername?.toLowerCase() === cleanSec.toLowerCase() ||
        d.discordUsername?.toLowerCase() === cleanSec.toLowerCase()
      ))
  );
  if (foundLocal) return foundLocal;

  // Fallback to Backend Server API (which also queries Supabase in real-time)
  if (typeof window !== 'undefined') {
    const targets = [clean, cleanSec].filter(Boolean);
    for (const t of targets) {
      try {
        const res = await fetch(`/api/bot/dni/${encodeURIComponent(t)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.found && json.dni) {
            const s = json.dni;
            const mapped: PeruDni = {
              id: `server-${s.dniNumber}`,
              discordId: s.discordId,
              discordUsername: s.discordUsername || s.robloxUsername || 'Ciudadano',
              discordDisplayName: s.fullName || '',
              robloxUsername: s.robloxUsername,
              robloxUserId: '',
              dniNumber: s.dniNumber,
              verifyDigit: '7',
              fullName: s.fullName,
              firstSurname: s.firstSurname || '',
              secondSurname: s.secondSurname || '',
              givenNames: s.prenames || '',
              birthDate: s.birthDate || '2000-01-01',
              issueDate: s.issueDate || '18 OCT 2026',
              expiryDate: s.expiryDate || '18 OCT 2034',
              gender: (s.gender as 'M' | 'F') || 'M',
              civilStatus: (s.civilStatus as any) || 'S',
              ubigeo: '150101',
              photoUrl: s.photoUrl || '',
              signatureText: `${(s.prenames || 'A')[0] || 'C'}.${s.firstSurname || 'PERU'}`,
              status: (s.status as any) || 'active',
              createdAt: s.createdAt || new Date().toISOString(),
            };
            saveLocalDni(mapped);
            return mapped;
          }
        }
      } catch {}
    }
  }

  return null;
}

/**
 * Consulta directa por cualquier término (Roblox username, Discord ID, N° DNI)
 */
export async function lookupCitizenDni(query: string): Promise<PeruDni | null> {
  const clean = (query || '').trim().replace(/^@/, '');
  if (!clean) return null;
  return getUserDni(clean);
}

/**
 * Guarda el DNI emitido en Supabase y localmente.
 * Bloquea estrictamente si el usuario de Discord ya tiene uno creado.
 */
export async function saveUserDni(dni: PeruDni): Promise<{
  success: boolean;
  error?: string;
  dni?: PeruDni;
}> {
  const existing = await getUserDni(dni.discordId);
  if (existing) {
    return {
      success: false,
      error: 'Ya posees un DNI emitido. No está permitido tramitar más de un documento por ciudadano.',
      dni: existing,
    };
  }

  dni.status = dni.status || 'active';
  dni.bankStatus = dni.bankStatus || 'active';
  saveLocalDni(dni);

  // Sincronización en tiempo real con el servidor central y el Bot de Discord
  if (typeof window !== 'undefined') {
    try {
      fetch('/api/bot/dni/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dni),
      }).catch((e) => console.warn('Sync DNI error:', e));
    } catch {}
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const payload = {
        discord_id: dni.discordId,
        discord_username: dni.discordUsername,
        discord_display_name: dni.discordDisplayName,
        roblox_username: dni.robloxUsername,
        roblox_user_id: dni.robloxUserId,
        dni_number: dni.dniNumber,
        verify_digit: dni.verifyDigit,
        full_name: dni.fullName,
        first_surname: dni.firstSurname,
        second_surname: dni.secondSurname,
        given_names: dni.givenNames,
        birth_date: dni.birthDate,
        issue_date: dni.issueDate,
        expiry_date: dni.expiryDate,
        gender: dni.gender,
        civil_status: dni.civilStatus,
        ubigeo: dni.ubigeo,
        photo_url: dni.photoUrl,
        signature_text: dni.signatureText,
        status: dni.status || 'active',
        suspension_reason: dni.suspensionReason || null,
        bank_status: dni.bankStatus || 'active',
        bank_freeze_reason: dni.bankFreezeReason || null,
        wanted_status: Boolean(dni.wantedStatus),
        wanted_reason: dni.wantedReason || null,
      };

      const { data, error } = await supabase
        .from('peru_dnis')
        .insert([payload])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return {
            success: false,
            error: 'Ya existe un DNI registrado para esta cuenta en Supabase.',
          };
        }
        console.warn('Error al insertar en Supabase (guardado en local):', error.message);
      } else if (data) {
        dni.id = data.id;
      }
    } catch (err: unknown) {
      console.warn('Error conectando a Supabase:', err);
    }
  }

  return { success: true, dni };
}

/**
 * Actualiza el estado administrativo de un DNI (Suspender, Congelar Cuenta, Requisitoria)
 */
export async function updateDniAdministrativeStatus(
  identifier: string,
  updates: Partial<PeruDni>
): Promise<boolean> {
  if (!identifier) return false;

  // Actualizar en localStorage
  if (typeof window !== 'undefined') {
    try {
      const list = getLocalDnis();
      const updated = list.map((item) => {
        if (
          item.discordId === identifier ||
          item.dniNumber === identifier ||
          item.robloxUsername.toLowerCase() === identifier.toLowerCase()
        ) {
          return { ...item, ...updates };
        }
        return item;
      });
      localStorage.setItem(LOCAL_DNIS_KEY, JSON.stringify(updated));
    } catch {}
  }

  // Actualizar en Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const payload: any = {};
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.suspensionReason !== undefined) payload.suspension_reason = updates.suspensionReason;
      if (updates.bankStatus !== undefined) payload.bank_status = updates.bankStatus;
      if (updates.bankFreezeReason !== undefined) payload.bank_freeze_reason = updates.bankFreezeReason;
      if (updates.wantedStatus !== undefined) payload.wanted_status = updates.wantedStatus;
      if (updates.wantedReason !== undefined) payload.wanted_reason = updates.wantedReason;
      if (updates.photoUrl !== undefined) payload.photo_url = updates.photoUrl;
      if (updates.robloxUsername !== undefined) payload.roblox_username = updates.robloxUsername;
      if (updates.robloxUserId !== undefined) payload.roblox_user_id = updates.robloxUserId;

      await supabase
        .from('peru_dnis')
        .update(payload)
        .or(`discord_id.eq.${identifier},dni_number.eq.${identifier},roblox_username.ilike.${identifier}`);
    } catch (e) {
      console.warn('Error actualizando en Supabase:', e);
    }
  }

  return true;
}

/**
 * Actualiza la foto del avatar de Roblox del usuario en su DNI
 */
export async function updateUserDniPhoto(
  discordId: string,
  photoUrl: string,
  robloxUsername?: string
): Promise<boolean> {
  const updates: Partial<PeruDni> = { photoUrl };
  if (robloxUsername) updates.robloxUsername = robloxUsername;
  return updateDniAdministrativeStatus(discordId, updates);
}

/**
 * Elimina o reinicia un DNI específico por usuario de Roblox, DNI o Discord ID (Solo Administradores)
 */
export async function deleteDniByAdmin(identifier: string): Promise<boolean> {
  if (!identifier) return false;

  if (typeof window !== 'undefined') {
    try {
      const list = getLocalDnis().filter(
        (item) =>
          item.discordId !== identifier &&
          item.dniNumber !== identifier &&
          item.robloxUsername.toLowerCase() !== identifier.toLowerCase()
      );
      localStorage.setItem(LOCAL_DNIS_KEY, JSON.stringify(list));
    } catch {}
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase
        .from('peru_dnis')
        .delete()
        .or(`discord_id.eq.${identifier},dni_number.eq.${identifier},roblox_username.ilike.${identifier}`);
    } catch (e) {
      console.warn('Error eliminando DNI en Supabase:', e);
    }
  }

  // Sincronizar eliminación con el backend del bot
  fetch(`/api/bot/dni/${encodeURIComponent(identifier)}`, { method: 'DELETE' }).catch(() => {});

  return true;
}

/**
 * Elimina el DNI del usuario autenticado (para permitir rehacerlo)
 */
export async function deleteUserDni(discordId: string): Promise<boolean> {
  return deleteDniByAdmin(discordId);
}

/**
 * Obtener todos los DNIs registrados (para uso del Panel de Administración)
 */
export async function getAllRegisteredDnis(): Promise<PeruDni[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('peru_dnis')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map(mapSupabaseRow);
      }
    } catch (e) {
      console.error(e);
    }
  }

  return getLocalDnis();
}

/**
 * Reinicia todos los DNIs registrados (tanto en Supabase como en localStorage)
 */
export async function resetAllDnis(): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(LOCAL_DNIS_KEY);
      localStorage.removeItem('perp_local_dnis_v1');
    } catch {}
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('peru_dnis').delete().neq('dni_number', '00000000');
    } catch (e) {
      console.warn('Error limpiando DNIs en Supabase:', e);
    }
  }

  return true;
}
