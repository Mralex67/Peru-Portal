import { PnpArrest, PnpFine, PnpSanction } from '../types/pnp';
import { getSupabaseClient } from './supabase';

const PNP_ARRESTS_KEY = 'perp_pnp_arrests_v2';
const PNP_FINES_KEY = 'perp_pnp_fines_v2';
const PNP_SANCTIONS_KEY = 'perp_pnp_sanctions_v2';

// Reset all initial arrests and fines to 0 as requested
export const INITIAL_PNP_ARRESTS: PnpArrest[] = [];
export const INITIAL_PNP_FINES: PnpFine[] = [];

export function getLocalArrests(): PnpArrest[] {
  if (typeof window === 'undefined') return INITIAL_PNP_ARRESTS;
  try {
    const raw = localStorage.getItem(PNP_ARRESTS_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch {}
  return INITIAL_PNP_ARRESTS;
}

export function saveLocalArrests(list: PnpArrest[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PNP_ARRESTS_KEY, JSON.stringify(list));
  } catch {}
}

export function getLocalFines(): PnpFine[] {
  if (typeof window === 'undefined') return INITIAL_PNP_FINES;
  try {
    const raw = localStorage.getItem(PNP_FINES_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch {}
  return INITIAL_PNP_FINES;
}

export function saveLocalFines(list: PnpFine[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PNP_FINES_KEY, JSON.stringify(list));
  } catch {}
}

export function getLocalSanctions(): PnpSanction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PNP_SANCTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalSanctions(list: PnpSanction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PNP_SANCTIONS_KEY, JSON.stringify(list));
  } catch {}
}

// Generate sequential IDs e.g. A-0018, M-0006
export function getNextArrestCode(existingList: PnpArrest[]): string {
  let highest = 17;
  for (const a of existingList) {
    const match = (a.arrestCode || '').match(/A-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > highest) highest = num;
    }
  }
  return `A-${String(highest + 1).padStart(4, '0')}`;
}

export function getNextFineCode(existingList: PnpFine[]): string {
  let highest = 5;
  for (const f of existingList) {
    const match = (f.fineCode || '').match(/M-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > highest) highest = num;
    }
  }
  return `M-${String(highest + 1).padStart(4, '0')}`;
}

// Add arrest to local storage & server
export async function registerArrest(payload: Omit<PnpArrest, 'id' | 'arrestCode'>): Promise<PnpArrest> {
  const current = getLocalArrests();
  const arrestCode = getNextArrestCode(current);
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newArrest: PnpArrest = {
    ...payload,
    id: `arrest-${Date.now()}`,
    arrestCode,
    createdAt: payload.createdAt || dateStr,
    createdAtTime: payload.createdAtTime || timeStr,
    releaseDateText: 'Activo',
  };

  current.unshift(newArrest);
  saveLocalArrests(current);

  // Sync to server backend
  try {
    fetch('/api/pnp/arrests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newArrest),
    }).catch(() => {});
  } catch {}

  // Sync to Supabase if connected
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('pnp_arrests').insert([
        {
          arrest_code: newArrest.arrestCode,
          suspect_roblox: newArrest.suspectRoblox,
          suspect_discord_id: newArrest.suspectDiscordId || null,
          suspect_dni: newArrest.suspectDni || null,
          charges: newArrest.charges,
          time_minutes: newArrest.timeMinutes,
          bail_amount: newArrest.bailAmount,
          officer_name: newArrest.officerName,
          officer_discord_id: newArrest.officerDiscordId || null,
          evidence_image: newArrest.evidenceImageUrl || null,
          status: newArrest.status,
        },
      ]);
    } catch (e) {
      console.warn('Notice saving arrest to Supabase:', e);
    }
  }

  return newArrest;
}

// Add fine to local storage & server
export async function registerFine(payload: Omit<PnpFine, 'id' | 'fineCode'>): Promise<PnpFine> {
  const current = getLocalFines();
  const fineCode = getNextFineCode(current);
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  const newFine: PnpFine = {
    ...payload,
    id: `fine-${Date.now()}`,
    fineCode,
    createdAt: new Date().toISOString(),
    issuedDate: payload.issuedDate || dateStr,
  };

  current.unshift(newFine);
  saveLocalFines(current);

  // Sync to server backend
  try {
    fetch('/api/pnp/fines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newFine),
    }).catch(() => {});
  } catch {}

  // Sync to Supabase if connected
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('pnp_fines').insert([
        {
          fine_code: newFine.fineCode,
          suspect_roblox: newFine.suspectRoblox,
          suspect_discord_id: newFine.suspectDiscordId || null,
          suspect_dni: newFine.suspectDni || null,
          amount: newFine.amount,
          reason: newFine.reason,
          status: newFine.status,
          issued_by: newFine.issuedBy,
          issued_date: newFine.issuedDate,
        },
      ]);
    } catch (e) {
      console.warn('Notice saving fine to Supabase:', e);
    }
  }

  return newFine;
}

// Look up criminal record for citizen
export async function getCitizenPoliceRecord(identifier: string) {
  const clean = identifier.trim().toLowerCase().replace(/^@/, '');
  const arrests = getLocalArrests();
  const fines = getLocalFines();

  // Try fetching fresh data from backend if available
  try {
    const res = await fetch(`/api/pnp/records/${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return data.record;
      }
    }
  } catch {}

  const userArrests = arrests.filter(
    (a) =>
      a.suspectRoblox?.toLowerCase() === clean ||
      a.suspectRoblox?.toLowerCase().includes(clean) ||
      a.suspectDni === clean ||
      a.suspectDiscordId === clean
  );

  const userFines = fines.filter(
    (f) =>
      f.suspectRoblox?.toLowerCase() === clean ||
      f.suspectRoblox?.toLowerCase().includes(clean) ||
      f.suspectDni === clean ||
      f.suspectDiscordId === clean
  );

  const pendingFines = userFines.filter((f) => f.status === 'Pendiente');
  const activeArrests = userArrests.filter((a) => a.status === 'active');
  const totalFineDebt = pendingFines.reduce((sum, f) => sum + f.amount, 0);

  const hasRecord = userArrests.length > 0 || userFines.length > 0;

  return {
    suspectIdentifier: clean,
    hasRecord,
    statusText: hasRecord ? 'Con antecedentes' : 'Sin antecedentes penales (Limpio)',
    arrestsCount: userArrests.length,
    activeArrestsCount: activeArrests.length,
    finesCount: userFines.length,
    pendingFinesCount: pendingFines.length,
    pendingFinesTotal: totalFineDebt,
    arrests: userArrests,
    fines: userFines,
  };
}
