import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PeruDni, SupabaseConfig } from '../types/dni';

const STORAGE_URL_KEY = 'perp_supabase_url';
const STORAGE_KEY_KEY = 'perp_supabase_anon_key';
const LOCAL_DNIS_KEY = 'perp_local_dnis_v2';

// SQL table initialization script for Supabase
export const SUPABASE_SQL_INIT = `-- Script SQL Oficial para crear la tabla de DNIs en Supabase
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar lectura y escritura pública para ciudadanos PE:RP
ALTER TABLE peru_dnis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura de DNIs"
  ON peru_dnis FOR SELECT
  USING (true);

CREATE POLICY "Permitir crear DNI único por Discord"
  ON peru_dnis FOR INSERT
  WITH CHECK (true);
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
  }
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
function getLocalDnis(): PeruDni[] {
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
    const current = getLocalDnis().filter((d) => d.discordId !== dni.discordId);
    current.unshift(dni);
    localStorage.setItem(LOCAL_DNIS_KEY, JSON.stringify(current));
  } catch (err) {
    console.error('Error guardando DNI en localStorage:', err);
  }
}

/**
 * Consulta si un usuario de Discord ya tramitó su DNI (en Supabase o en local)
 */
export async function getUserDni(discordId: string): Promise<PeruDni | null> {
  if (!discordId) return null;

  // 1. Try Supabase first if configured
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('peru_dnis')
        .select('*')
        .eq('discord_id', discordId)
        .maybeSingle();

      if (!error && data) {
        const mapped: PeruDni = {
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
          createdAt: data.created_at || new Date().toISOString(),
        };
        // Keep local cache synced
        saveLocalDni(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('Fallo consulta a Supabase, intentando con caché local:', err);
    }
  }

  // 2. Fallback to local storage
  const locals = getLocalDnis();
  return locals.find((d) => d.discordId === discordId) || null;
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
  // Check if DNI already exists for this discordId
  const existing = await getUserDni(dni.discordId);
  if (existing) {
    return {
      success: false,
      error: 'Ya posees un DNI emitido. No está permitido tramitar más de un documento por ciudadano.',
      dni: existing,
    };
  }

  // Save to local storage first for resilience
  saveLocalDni(dni);

  // If Supabase is configured, insert into peru_dnis table
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
      };

      const { data, error } = await supabase
        .from('peru_dnis')
        .insert([payload])
        .select()
        .single();

      if (error) {
        // If unique constraint error
        if (error.code === '23505') {
          return {
            success: false,
            error: 'Ya existe un DNI registrado para esta cuenta en la base de datos de Supabase.',
          };
        }
        console.warn('Error al insertar en Supabase (DNI guardado localmente):', error.message);
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
 * Obtener todos los DNIs registrados (para uso de administración o policía)
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
        return data.map((d) => ({
          id: d.id,
          discordId: d.discord_id,
          discordUsername: d.discord_username || '',
          discordDisplayName: d.discord_display_name || '',
          robloxUsername: d.roblox_username,
          robloxUserId: d.roblox_user_id || '',
          dniNumber: d.dni_number,
          verifyDigit: d.verify_digit || '1',
          fullName: d.full_name,
          firstSurname: d.first_surname || '',
          secondSurname: d.second_surname || '',
          givenNames: d.given_names || '',
          birthDate: d.birth_date || '01 ENE 2002',
          issueDate: d.issue_date || '18 OCT 2026',
          expiryDate: d.expiry_date || '18 OCT 2034',
          gender: (d.gender as 'M' | 'F') || 'M',
          civilStatus: (d.civil_status as 'S' | 'C' | 'V' | 'D') || 'S',
          ubigeo: d.ubigeo || '150101',
          photoUrl: d.photo_url || '',
          signatureText: d.signature_text || d.full_name,
          createdAt: d.created_at || '',
        }));
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

/**
 * Elimina el DNI específico de un usuario (para permitir volver a tramitarlo)
 */
export async function deleteUserDni(discordId: string): Promise<boolean> {
  if (!discordId) return false;

  if (typeof window !== 'undefined') {
    try {
      const current = getLocalDnis().filter((d) => d.discordId !== discordId);
      localStorage.setItem(LOCAL_DNIS_KEY, JSON.stringify(current));
    } catch {}
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('peru_dnis').delete().eq('discord_id', discordId);
    } catch (e) {
      console.warn('Error eliminando DNI en Supabase:', e);
    }
  }

  return true;
}
