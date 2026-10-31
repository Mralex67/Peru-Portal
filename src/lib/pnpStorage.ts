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
    const match = (a.arrestCode || (a as any).code || '').match(/A-(\d+)/i);
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
    const match = (f.fineCode || (f as any).code || '').match(/M-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > highest) highest = num;
    }
  }
  return `M-${String(highest + 1).padStart(4, '0')}`;
}

// Normalizer for raw arrest data from server or Supabase
function normalizeArrest(item: any): PnpArrest {
  const code = item.arrestCode || item.code || item.arrest_code || 'A-0018';
  const suspect = item.suspectRoblox || item.citizenIdentifier || item.citizen_identifier || item.citizenName || 'Ciudadano';
  const cleanSuspect = String(suspect).replace(/^@/, '').replace(/^\[/, '').replace(/\]$/, '').trim();
  const charges = item.charges || 'Infracción policial';
  const timeMin = Number(item.timeMinutes || item.durationMinutes || item.duration_minutes || 3);
  const bail = Number(item.bailAmount || item.bail_amount || 0);
  const officer = item.officerName || item.officer_name || '@Oficial_PNP';
  const evidence = item.evidenceImageUrl || item.evidenceUrl || item.evidence_image || item.evidence_url || '';
  const isActivo = item.status === 'activo' || item.status === 'active';
  const created = (item.createdAt || item.created_at || new Date().toISOString()).slice(0, 10);

  return {
    id: item.id || `arr-${code}-${Date.now()}`,
    arrestCode: code,
    suspectRoblox: cleanSuspect,
    suspectName: item.citizenName || item.citizen_name || `@ [ST-P] ${cleanSuspect}`,
    suspectDiscordId: item.suspectDiscordId || item.suspect_discord_id || '',
    suspectDni: item.suspectDni || item.suspect_dni || '',
    charges,
    timeMinutes: timeMin,
    timeDisplay: item.durationText || item.duration_text || `${timeMin}m (${timeMin} minutos)`,
    bailAmount: bail,
    bailDisplay: `S/${bail.toLocaleString()}`,
    officerName: officer.startsWith('@') ? officer : `@${officer}`,
    evidenceImageUrl: evidence,
    status: isActivo ? 'active' : 'served',
    createdAt: created,
    createdAtTime: item.createdAtTime || item.created_at_time || '22:45',
    releaseDateText: isActivo ? 'Activo' : 'Cumplido',
  };
}

// Normalizer for raw fine data from server or Supabase
function normalizeFine(item: any): PnpFine {
  const code = item.fineCode || item.code || item.fine_code || 'M-0005';
  const suspect = item.suspectRoblox || item.citizenIdentifier || item.citizen_identifier || item.citizenName || 'Ciudadano';
  const cleanSuspect = String(suspect).replace(/^@/, '').replace(/^\[/, '').replace(/\]$/, '').trim();
  const amount = Number(item.amount || 100);
  const reason = item.reason || item.motivo || 'Conduccion temeraria';
  const officer = item.issuedBy || item.issued_by || item.officerName || item.officer_name || 'Oficial_PNP';
  const issuedDate = (item.issuedDate || item.issued_date || item.createdAt || item.created_at || new Date().toISOString()).slice(0, 10);
  const isPaid = String(item.status || '').toLowerCase().includes('pag');

  return {
    id: item.id || `fine-${code}-${Date.now()}`,
    fineCode: code,
    suspectRoblox: cleanSuspect,
    suspectDiscordId: item.suspectDiscordId || item.suspect_discord_id || '',
    suspectDni: item.suspectDni || item.suspect_dni || '',
    amount,
    amountDisplay: `S/${amount.toLocaleString()}`,
    reason,
    status: isPaid ? 'Pagada' : 'Pendiente',
    issuedBy: officer,
    issuedDate,
    createdAt: item.createdAt || issuedDate,
  };
}

/**
 * Fetch and synchronize all arrests across all officers in real-time.
 * Checks Backend Server API + Supabase Cloud + Local Storage.
 */
export async function fetchSharedArrests(): Promise<PnpArrest[]> {
  const map = new Map<string, PnpArrest>();

  // 1. Add current local arrests
  for (const a of getLocalArrests()) {
    if (a.arrestCode) map.set(a.arrestCode.toUpperCase(), a);
  }

  // 2. Fetch from Backend server API
  try {
    const res = await fetch('/api/pnp/arrests');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.arrests)) {
        for (const item of data.arrests) {
          const norm = normalizeArrest(item);
          map.set(norm.arrestCode.toUpperCase(), norm);
        }
      }
    }
  } catch (err) {
    console.warn('Backend arrests fetch error:', err);
  }

  // 3. Fetch from Supabase Cloud table if available
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: supaArrests } = await supabase.from('pnp_arrests').select('*').order('created_at', { ascending: false });
      if (Array.isArray(supaArrests)) {
        for (const item of supaArrests) {
          const norm = normalizeArrest(item);
          map.set(norm.arrestCode.toUpperCase(), norm);
        }
      }
    } catch (err) {
      console.warn('Supabase arrests fetch notice:', err);
    }
  }

  const merged = Array.from(map.values()).sort((a, b) => {
    return (b.arrestCode || '').localeCompare(a.arrestCode || '');
  });

  saveLocalArrests(merged);
  return merged;
}

/**
 * Fetch and synchronize all fines across all officers in real-time.
 * Checks Backend Server API + Supabase Cloud + Local Storage.
 */
export async function fetchSharedFines(): Promise<PnpFine[]> {
  const map = new Map<string, PnpFine>();

  // 1. Add current local fines
  for (const f of getLocalFines()) {
    if (f.fineCode) map.set(f.fineCode.toUpperCase(), f);
  }

  // 2. Fetch from Backend server API
  try {
    const res = await fetch('/api/pnp/fines');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.fines)) {
        for (const item of data.fines) {
          const norm = normalizeFine(item);
          map.set(norm.fineCode.toUpperCase(), norm);
        }
      }
    }
  } catch (err) {
    console.warn('Backend fines fetch error:', err);
  }

  // 3. Fetch from Supabase Cloud table if available
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: supaFines } = await supabase.from('pnp_fines').select('*').order('created_at', { ascending: false });
      if (Array.isArray(supaFines)) {
        for (const item of supaFines) {
          const norm = normalizeFine(item);
          map.set(norm.fineCode.toUpperCase(), norm);
        }
      }
    } catch (err) {
      console.warn('Supabase fines fetch notice:', err);
    }
  }

  const merged = Array.from(map.values()).sort((a, b) => {
    return (b.fineCode || '').localeCompare(a.fineCode || '');
  });

  saveLocalFines(merged);
  return merged;
}

// Add arrest to local storage, backend server, and Supabase
export async function registerArrest(payload: Omit<PnpArrest, 'id' | 'arrestCode'>): Promise<PnpArrest> {
  const current = getLocalArrests();
  const arrestCode = getNextArrestCode(current);
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const cleanSuspect = (payload.suspectRoblox || '').trim().replace(/^@/, '');

  const newArrest: PnpArrest = {
    ...payload,
    id: `arrest-${Date.now()}`,
    arrestCode,
    suspectRoblox: cleanSuspect,
    suspectName: payload.suspectName || `@ [ST-P] ${cleanSuspect}`,
    createdAt: payload.createdAt || dateStr,
    createdAtTime: payload.createdAtTime || timeStr,
    releaseDateText: 'Activo',
  };

  current.unshift(newArrest);
  saveLocalArrests(current);

  // Sync to server backend with compatible keys
  try {
    fetch('/api/pnp/arrests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: newArrest.arrestCode,
        arrestCode: newArrest.arrestCode,
        citizenIdentifier: cleanSuspect,
        suspectRoblox: cleanSuspect,
        citizenName: newArrest.suspectName,
        charges: newArrest.charges,
        durationText: newArrest.timeDisplay,
        durationMinutes: newArrest.timeMinutes,
        timeMinutes: newArrest.timeMinutes,
        bailAmount: newArrest.bailAmount,
        officerName: newArrest.officerName,
        evidenceUrl: newArrest.evidenceImageUrl || '',
        evidenceImageUrl: newArrest.evidenceImageUrl || '',
        status: newArrest.status,
      }),
    }).catch(() => {});
  } catch {}

  // Sync to Supabase if connected
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('pnp_arrests').insert([
        {
          code: newArrest.arrestCode,
          arrest_code: newArrest.arrestCode,
          citizen_identifier: cleanSuspect,
          suspect_roblox: cleanSuspect,
          citizen_name: newArrest.suspectName,
          charges: newArrest.charges,
          duration_text: newArrest.timeDisplay,
          duration_minutes: newArrest.timeMinutes,
          time_minutes: newArrest.timeMinutes,
          bail_amount: newArrest.bailAmount,
          officer_name: newArrest.officerName,
          officer_discord_id: newArrest.officerDiscordId || null,
          evidence_url: newArrest.evidenceImageUrl || null,
          evidence_image: newArrest.evidenceImageUrl || null,
          status: 'activo',
        },
      ]);
    } catch (e) {
      console.warn('Notice saving arrest to Supabase:', e);
    }
  }

  return newArrest;
}

// Add fine to local storage, backend server, and Supabase
export async function registerFine(payload: Omit<PnpFine, 'id' | 'fineCode'>): Promise<PnpFine> {
  const current = getLocalFines();
  const fineCode = getNextFineCode(current);
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  const cleanSuspect = (payload.suspectRoblox || '').trim().replace(/^@/, '');

  const newFine: PnpFine = {
    ...payload,
    id: `fine-${Date.now()}`,
    fineCode,
    suspectRoblox: cleanSuspect,
    createdAt: new Date().toISOString(),
    issuedDate: payload.issuedDate || dateStr,
  };

  current.unshift(newFine);
  saveLocalFines(current);

  // Sync to server backend with compatible keys
  try {
    fetch('/api/pnp/fines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: newFine.fineCode,
        fineCode: newFine.fineCode,
        citizenIdentifier: cleanSuspect,
        suspectRoblox: cleanSuspect,
        citizenName: `@ [${cleanSuspect}]`,
        reason: newFine.reason,
        amount: newFine.amount,
        officerName: newFine.issuedBy,
        issuedBy: newFine.issuedBy,
        status: newFine.status,
      }),
    }).catch(() => {});
  } catch {}

  // Sync to Supabase if connected
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('pnp_fines').insert([
        {
          code: newFine.fineCode,
          fine_code: newFine.fineCode,
          citizen_identifier: cleanSuspect,
          suspect_roblox: cleanSuspect,
          amount: newFine.amount,
          reason: newFine.reason,
          status: newFine.status,
          issued_by: newFine.issuedBy,
          officer_name: newFine.issuedBy,
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

  // 1. Fetch fresh arrests and fines from backend/cloud
  let arrests = await fetchSharedArrests().catch(() => getLocalArrests());
  let fines = await fetchSharedFines().catch(() => getLocalFines());

  // 2. Also try backend record endpoint
  try {
    const res = await fetch(`/api/pnp/records/${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.record) {
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

// Delete an arrest
export async function deleteArrest(codeOrId: string): Promise<boolean> {
  const current = getLocalArrests();
  const updated = current.filter(
    (a) => (a.id || '').toLowerCase() !== codeOrId.toLowerCase() && (a.arrestCode || '').toLowerCase() !== codeOrId.toLowerCase()
  );
  saveLocalArrests(updated);

  try {
    const res = await fetch(`/api/pnp/arrests/${encodeURIComponent(codeOrId)}`, { method: 'DELETE' });
    const json = await res.json();
    return Boolean(json?.success);
  } catch {
    return false;
  }
}

// Delete a fine
export async function deleteFine(codeOrId: string): Promise<boolean> {
  const current = getLocalFines();
  const updated = current.filter(
    (f) => (f.id || '').toLowerCase() !== codeOrId.toLowerCase() && (f.fineCode || '').toLowerCase() !== codeOrId.toLowerCase()
  );
  saveLocalFines(updated);

  try {
    const res = await fetch(`/api/pnp/fines/${encodeURIComponent(codeOrId)}`, { method: 'DELETE' });
    const json = await res.json();
    return Boolean(json?.success);
  } catch {
    return false;
  }
}

// Delete a sanction
export async function deleteSanction(sanctionId: string): Promise<boolean> {
  const current = getLocalSanctions();
  const updated = current.filter((s) => (s.id || '').toLowerCase() !== sanctionId.toLowerCase());
  saveLocalSanctions(updated);

  try {
    const res = await fetch(`/api/pnp/sanctions/${encodeURIComponent(sanctionId)}`, { method: 'DELETE' });
    const json = await res.json();
    return Boolean(json?.success);
  } catch {
    return false;
  }
}

// Clear all records / antecedentes for a citizen
export async function clearCitizenPoliceRecords(identifier: string): Promise<boolean> {
  const clean = identifier.trim().toLowerCase().replace(/^@/, '');
  const arrests = getLocalArrests().filter(
    (a) =>
      a.suspectRoblox?.toLowerCase() !== clean &&
      a.suspectDni !== clean &&
      a.suspectDiscordId !== clean &&
      !a.suspectName?.toLowerCase().includes(clean)
  );
  saveLocalArrests(arrests);

  const fines = getLocalFines().filter(
    (f) =>
      f.suspectRoblox?.toLowerCase() !== clean &&
      f.suspectDni !== clean &&
      f.suspectDiscordId !== clean
  );
  saveLocalFines(fines);

  try {
    const res = await fetch(`/api/pnp/records/${encodeURIComponent(clean)}`, { method: 'DELETE' });
    const json = await res.json();
    return Boolean(json?.success);
  } catch {
    return false;
  }
}

// Purge all PNP records
export async function resetAllPnpRecords(): Promise<boolean> {
  saveLocalArrests([]);
  saveLocalFines([]);
  saveLocalSanctions([]);
  try {
    const res = await fetch('/api/pnp/reset-all', { method: 'POST' });
    const json = await res.json();
    return Boolean(json?.success);
  } catch {
    return false;
  }
}
