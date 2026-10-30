import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ShieldCheck,
  Search,
  AlertTriangle,
  FileText,
  CreditCard,
  User,
  Clock,
  DollarSign,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Minimize2,
  Radio,
  Wifi,
  Battery,
  Lock,
  Unlock,
  RefreshCw,
  Plus,
  Car,
  BadgeAlert,
  Send,
  Eye,
  Trash2,
} from 'lucide-react';
import { useServer } from '../context/ServerContext';
import { PnpArrest, PnpFine, PnpSanction, PNP_PENAL_CODE } from '../types/pnp';
import {
  getLocalArrests,
  getLocalFines,
  registerArrest,
  registerFine,
  getCitizenPoliceRecord,
} from '../lib/pnpStorage';
import { lookupCitizenDni } from '../lib/supabase';
import { PeruDni } from '../types/dni';
import { playClickSound, playSuccessSound } from '../utils/audio';

export const PnpTabletModal: React.FC = () => {
  const {
    isPnpTabletOpen,
    closePnpTablet,
    discordUser,
    isPnpAuthenticated,
    setIsPnpAuthenticated,
    pnpOfficerBadge,
    setPnpOfficerBadge,
  } = useServer();

  // Tablet UI state
  const [activeTab, setActiveTab] = useState<'search' | 'arrest' | 'fine' | 'penal' | 'registry'>('search');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Authentication & Verification
  const [badgeCodeInput, setBadgeCodeInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isVerifyingDiscord, setIsVerifyingDiscord] = useState(false);

  // Search & Profile state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchedCitizen, setSearchedCitizen] = useState<PeruDni | null>(null);
  const [citizenRecord, setCitizenRecord] = useState<any>(null);
  const [hasLicense, setHasLicense] = useState<boolean | null>(null);
  const [searchFeedback, setSearchFeedback] = useState('');

  // Arrest form state (/arrestar matching Image 1)
  const [arrestSuspect, setArrestSuspect] = useState('');
  const [arrestCharges, setArrestCharges] = useState('Intento de Homicidio');
  const [arrestTimeMinutes, setArrestTimeMinutes] = useState(3);
  const [arrestBail, setArrestBail] = useState(5000);
  const [arrestOfficer, setArrestOfficer] = useState('');
  const [arrestEvidenceUrl, setArrestEvidenceUrl] = useState('/assets/aistudio/image_26cb457c.png');
  const [arrestSubmitted, setArrestSubmitted] = useState<PnpArrest | null>(null);
  const [isSubmittingArrest, setIsSubmittingArrest] = useState(false);

  // Fine form state (/multar matching Image 2)
  const [fineSuspect, setFineSuspect] = useState('');
  const [fineReason, setFineReason] = useState('Conduccion temeraria');
  const [fineAmount, setFineAmount] = useState(700);
  const [fineOfficer, setFineOfficer] = useState('');
  const [fineSubmitted, setFineSubmitted] = useState<PnpFine | null>(null);
  const [isSubmittingFine, setIsSubmittingFine] = useState(false);

  // Registry state
  const [allArrests, setAllArrests] = useState<PnpArrest[]>([]);
  const [allFines, setAllFines] = useState<PnpFine[]>([]);
  const [registryFilter, setRegistryFilter] = useState<'all' | 'arrests' | 'fines'>('all');

  // Evidence file upload ref
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  // Clock in tablet
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Pre-fill officer name from logged-in discord user
  useEffect(() => {
    if (discordUser) {
      const name = discordUser.displayName || discordUser.username;
      setArrestOfficer(name.startsWith('@') ? name : `@${name}`);
      setFineOfficer(discordUser.username || name);
    } else {
      setArrestOfficer('@Jhair');
      setFineOfficer('jhair9813');
    }
  }, [discordUser]);

  // Load registry on open
  useEffect(() => {
    if (isPnpTabletOpen) {
      setAllArrests(getLocalArrests());
      setAllFines(getLocalFines());
      // Default to search pre-filled with sample or citizen
      if (!searchedCitizen && !searchQuery) {
        handleSearchCitizen('Tsaonomori');
      }
    }
  }, [isPnpTabletOpen]);

  if (!isPnpTabletOpen) return null;

  // Verification logic:
  // Role ID PNP: 1555384968086032394
  // Driver License Role ID: 1556723203114668082
  const handleVerifyDiscordRole = async () => {
    setIsVerifyingDiscord(true);
    setAuthError('');
    playClickSound();

    try {
      if (discordUser) {
        // Query backend server to check if user has the official PNP role 1555384968086032394
        const res = await fetch(`/api/pnp/verify-role/${encodeURIComponent(discordUser.id)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.hasPoliceRole) {
            setIsPnpAuthenticated(true);
            setPnpOfficerBadge(data.badgeNumber || `PNP-${discordUser.id.slice(-4)}`);
            playSuccessSound();
            return;
          }
        }
        
        // If OAuth role check allows bypass or user is verified
        if (discordUser.isStaff || discordUser.role === 'Comandante PNP' || discordUser.role === 'Policía') {
          setIsPnpAuthenticated(true);
          setPnpOfficerBadge(`PNP-${discordUser.id.slice(-4)}`);
          playSuccessSound();
          return;
        }

        // If not having the Discord role yet, notify clearly
        setAuthError(
          `Tu cuenta de Discord (@${discordUser.username}) no cuenta con el rol oficial de la PNP (ID: 1555384968086032394). Puedes ingresar usando tu Clave de Placa o PIN de Oficial abajo.`
        );
      } else {
        setAuthError('Inicia sesión con Discord primero o ingresa directamente con tu Clave de Placa Policial.');
      }
    } catch {
      setAuthError('Error conectando con el servidor de Discord.');
    } finally {
      setIsVerifyingDiscord(false);
    }
  };

  const handleVerifyWithBadgePin = () => {
    const clean = badgeCodeInput.trim().toUpperCase();
    if (!clean) {
      setAuthError('Ingresa tu clave de placa policial.');
      return;
    }
    playClickSound();

    // Standard police credentials: 105, PNP105, 0105, ST-P, 1555384968086032394, or any 4+ char alphanumeric badge
    if (
      clean === '105' ||
      clean === 'PNP105' ||
      clean === '0105' ||
      clean === 'ST-P' ||
      clean === 'JHAIR' ||
      clean === 'POLICIA' ||
      clean === '1555384968086032394' ||
      clean.length >= 4
    ) {
      setIsPnpAuthenticated(true);
      setPnpOfficerBadge(clean.startsWith('PNP') ? clean : `PNP-${clean}`);
      playSuccessSound();
      setAuthError('');
    } else {
      setAuthError('Clave de placa policial inválida. Intenta con "105" o tu código asignado.');
    }
  };

  // Search citizen & antecedentes
  const handleSearchCitizen = async (queryText?: string) => {
    const q = (queryText || searchQuery).trim().replace(/^@/, '');
    if (!q) {
      setSearchFeedback('Escribe un usuario de Roblox, DNI o ID de Discord.');
      return;
    }
    setIsSearching(true);
    setSearchFeedback('');
    playClickSound();

    try {
      // 1. Fetch DNI data from Supabase/Server
      const dni = await lookupCitizenDni(q);
      setSearchedCitizen(dni);

      // 2. Fetch Criminal Record (Arrests & Fines)
      const record = await getCitizenPoliceRecord(q);
      setCitizenRecord(record);

      // 3. Check Driver's License (Discord Role 1556723203114668082)
      // Check if target user has driver's license
      try {
        const licRes = await fetch(`/api/pnp/check-license/${encodeURIComponent(dni?.discordId || q)}`);
        if (licRes.ok) {
          const licData = await licRes.json();
          setHasLicense(Boolean(licData.hasLicense));
        } else {
          // Default heuristic: if they have a DNI, check if they have fine M-0004
          const hasUnlicensedFine = record?.fines?.some((f: any) => f.reason.toLowerCase().includes('licencia'));
          setHasLicense(!hasUnlicensedFine);
        }
      } catch {
        setHasLicense(true);
      }

      setSearchFeedback('');
      playSuccessSound();
    } catch {
      setSearchFeedback('Error al consultar antecedentes en SIPOL.');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Submit Arrest (/arrestar)
  const handleSubmitArrest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arrestSuspect.trim()) {
      alert('Ingresa el usuario o DNI del detenido.');
      return;
    }
    setIsSubmittingArrest(true);
    playClickSound();

    try {
      const timeDisplay = `${arrestTimeMinutes}m (${arrestTimeMinutes} minutos)`;
      const bailDisplay = `S/${arrestBail.toLocaleString('es-PE')}`;

      const newArrest = await registerArrest({
        suspectRoblox: arrestSuspect.trim().replace(/^@/, ''),
        suspectName: `@ [ST-P] ${arrestSuspect.trim().replace(/^@/, '')}`,
        charges: arrestCharges.trim(),
        timeMinutes: arrestTimeMinutes,
        timeDisplay,
        bailAmount: arrestBail,
        bailDisplay,
        officerName: arrestOfficer.trim() || '@Jhair',
        evidenceImageUrl: arrestEvidenceUrl,
        status: 'served',
        createdAt: new Date().toISOString().split('T')[0],
        createdAtTime: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        releaseDateText: 'hace unos momentos',
      });

      setArrestSubmitted(newArrest);
      setAllArrests(getLocalArrests());
      playSuccessSound();
    } catch (err: any) {
      alert(err?.message || 'Error registrando arresto');
    } finally {
      setIsSubmittingArrest(false);
    }
  };

  // Handle Submit Fine (/multar)
  const handleSubmitFine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fineSuspect.trim()) {
      alert('Ingresa el usuario infractor.');
      return;
    }
    setIsSubmittingFine(true);
    playClickSound();

    try {
      const newFine = await registerFine({
        suspectRoblox: fineSuspect.trim().replace(/^@/, ''),
        amount: fineAmount,
        amountDisplay: `S/${fineAmount}`,
        reason: fineReason.trim(),
        status: 'Pendiente',
        issuedBy: fineOfficer.trim() || 'jhair9813',
        issuedDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      });

      setFineSubmitted(newFine);
      setAllFines(getLocalFines());
      playSuccessSound();
    } catch (err: any) {
      alert(err?.message || 'Error registrando multa');
    } finally {
      setIsSubmittingFine(false);
    }
  };

  // Upload evidence image for arrest
  const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setArrestEvidenceUrl(reader.result);
        playSuccessSound();
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto ${isFullscreen ? 'p-0' : ''}`}>
      {/* Tactical Police MDT Tablet Frame */}
      <div className={`relative w-full ${isFullscreen ? 'h-full max-w-none rounded-none' : 'max-w-6xl max-h-[94vh] rounded-3xl'} bg-[#0a0d14] border-2 border-emerald-500/40 shadow-[0_0_50px_rgba(16,185,129,0.2)] flex flex-col overflow-hidden text-slate-100 font-sans`}>
        
        {/* Rugged Tablet Top Bezel */}
        <div className="h-12 bg-gradient-to-r from-[#0d131f] via-[#101b2a] to-[#0d131f] border-b border-emerald-500/30 flex items-center justify-between px-4 sm:px-6 shrink-0 select-none">
          {/* Status indicators */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img
                src="/assets/pnp-emblem.png"
                alt="PNP"
                className="w-6 h-6 object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <span className="font-sans font-black text-xs text-white tracking-widest uppercase">
                POLICÍA NACIONAL DEL PERÚ
              </span>
            </div>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-mono text-emerald-400 font-bold">
              MDT SIPOL V3.8
            </span>
          </div>

          {/* Telemetry info */}
          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <div className="hidden md:flex items-center gap-1.5 text-emerald-400">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>CH-105 PNP</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-slate-300">
              <Wifi className="w-3.5 h-3.5 text-sky-400" />
              <span>4G LTE</span>
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentTime}</span>
            </div>

            {/* Controls */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={closePnpTablet}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              title="Cerrar MDT"
            >
              <X className="w-5 h-5 text-rose-400 hover:text-rose-300" />
            </button>
          </div>
        </div>

        {/* AUTHENTICATION SCREEN: If not verified */}
        {!isPnpAuthenticated ? (
          <div className="flex-1 p-6 sm:p-12 flex flex-col items-center justify-center text-center overflow-y-auto">
            <div className="max-w-md w-full space-y-6">
              
              {/* Official PNP Emblem */}
              <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
                <img
                  src="/assets/pnp-emblem.png"
                  alt="Emblema PNP"
                  className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] relative z-10"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/40">
                  ACCESO RESTRINGIDO A OFICIALES
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase font-sans tracking-wide">
                  Verificar Identidad Policial
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Terminal Móvil de Datos de la <strong>Policía Nacional del Perú (PE:RP)</strong>. El sistema valida automáticamente tu <strong>Rol Oficial de la PNP (ID: 1555384968086032394)</strong> o tu Clave de Placa Policial.
                </p>
              </div>

              {/* Error box */}
              {authError && (
                <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs text-left flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Option 1: Discord Role Verification */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  disabled={isVerifyingDiscord}
                  onClick={handleVerifyDiscordRole}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-950/80 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isVerifyingDiscord ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verificando rol policial en Discord...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verificar con mi Cuenta de Discord</span>
                    </>
                  )}
                </button>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-white/10 w-full" />
                  <span className="bg-[#0a0d14] px-3 text-[10px] uppercase font-bold text-slate-400">
                    O Ingreso con Clave de Placa
                  </span>
                  <div className="border-t border-white/10 w-full" />
                </div>

                {/* Option 2: Badge / PIN Code */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={badgeCodeInput}
                      onChange={(e) => setBadgeCodeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyWithBadgePin()}
                      placeholder="Ej. 105 o tu N° de Placa..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#121724] border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyWithBadgePin}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer border border-white/10 transition-colors"
                  >
                    Ingresar
                  </button>
                </div>
              </div>

              {/* Quick tip */}
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-300/80 text-left">
                💡 <strong>Comandos sincronizados con Discord:</strong> Las multas y arrestos emitidos en esta tablet se integran con los comandos <code className="text-white font-mono">/arrestar</code>, <code className="text-white font-mono">/multar</code> y <code className="text-white font-mono">/antecedentes</code>.
              </div>

            </div>
          </div>
        ) : (
          /* AUTHENTICATED TACTICAL MDT INTERFACE */
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Tablet Navigation Bar */}
            <div className="bg-[#0e1422] border-b border-white/10 px-4 py-2 flex items-center justify-between gap-3 overflow-x-auto shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setActiveTab('search'); playClickSound(); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === 'search'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Búsqueda SIPOL</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('arrest'); playClickSound(); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === 'arrest'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-950'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <BadgeAlert className="w-3.5 h-3.5" />
                  <span>/arrestar</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('fine'); playClickSound(); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === 'fine'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-950'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>/multar</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('penal'); playClickSound(); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === 'penal'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-950'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Código Penal</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveTab('registry'); playClickSound(); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === 'registry'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Padrón General</span>
                </button>
              </div>

              {/* Officer badge info & Lock */}
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{pnpOfficerBadge}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsPnpAuthenticated(false)}
                  className="px-2 py-1 rounded-lg text-slate-400 hover:text-rose-300 text-xs font-semibold hover:bg-rose-950/30 cursor-pointer"
                  title="Bloquear terminal"
                >
                  Salir
                </button>
              </div>
            </div>

            {/* TAB CONTENT CONTAINER */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
              
              {/* ========================================================================= */}
              {/* TAB 1: BÚSQUEDA SIPOL & ANTECEDENTES (MATCHING IMAGE 3 EXACTLY) */}
              {/* ========================================================================= */}
              {activeTab === 'search' && (
                <div className="space-y-6 max-w-5xl mx-auto">
                  {/* Search Bar */}
                  <div className="p-4 rounded-2xl bg-[#0f1424] border border-emerald-500/30 space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      <span>Consulta de Ciudadano / Antecedentes Penales</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearchCitizen()}
                          placeholder="Ingresa usuario de Roblox (ej. Tsaonomori), DNI o ID de Discord..."
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#080b12] border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isSearching}
                        onClick={() => handleSearchCitizen()}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md"
                      >
                        {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        <span>{isSearching ? 'Consultando...' : 'Consultar'}</span>
                      </button>
                    </div>

                    {searchFeedback && (
                      <p className="text-xs text-rose-400">{searchFeedback}</p>
                    )}
                  </div>

                  {/* Citizen Record Results (Matching Image 3 Embed) */}
                  {citizenRecord && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      
                      {/* Left: Citizen Card & Driver's License verification */}
                      <div className="lg:col-span-5 space-y-4">
                        <div className="p-5 rounded-2xl bg-[#0c101c] border border-white/10 space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-black/60 border border-emerald-500/40 p-1 flex items-center justify-center overflow-hidden shrink-0">
                              <img
                                src={
                                  searchedCitizen?.photoUrl ||
                                  `https://www.roblox.com/headshot-thumbnail/image?userId=310966282&width=420&height=420&format=png`
                                }
                                alt="Suspect Avatar"
                                className="w-full h-full object-cover rounded-xl"
                              />
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono">
                                REGISTRO CIUDADANO
                              </div>
                              <h3 className="text-lg font-black text-white uppercase font-sans">
                                {searchedCitizen?.fullName || citizenRecord.suspectIdentifier}
                              </h3>
                              <div className="text-xs text-slate-400 font-mono">
                                Roblox: @{searchedCitizen?.robloxUsername || citizenRecord.suspectIdentifier}
                              </div>
                              <div className="text-xs text-sky-400 font-mono">
                                DNI: {searchedCitizen?.dniNumber || '74829104'}
                              </div>
                            </div>
                          </div>

                          {/* Driver's License Verification (Role 1556723203114668082) */}
                          <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                            hasLicense
                              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                          }`}>
                            <div className="flex items-center gap-2.5">
                              <Car className="w-5 h-5 shrink-0" />
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider">
                                  Licencia de Conducir (Rol 1556723203114668082)
                                </div>
                                <div className="text-xs font-bold font-sans">
                                  {hasLicense ? 'LICENCIA VIGENTE Y REGISTRADA ✅' : 'SIN LICENCIA / NO REGISTRADA ❌'}
                                </div>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              hasLicense ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'
                            }`}>
                              {hasLicense ? 'ACTIVO' : 'MULTA M-02'}
                            </span>
                          </div>

                          {/* Quick Actions for Officer */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setArrestSuspect(searchedCitizen?.robloxUsername || citizenRecord.suspectIdentifier);
                                setActiveTab('arrest');
                                playClickSound();
                              }}
                              className="px-3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                            >
                              <BadgeAlert className="w-3.5 h-3.5" />
                              <span>Emitir Arresto</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setFineSuspect(searchedCitizen?.robloxUsername || citizenRecord.suspectIdentifier);
                                setActiveTab('fine');
                                playClickSound();
                              }}
                              className="px-3 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Emitir Multa</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right: Exact Discord Embed Reproduction (Image 3) */}
                      <div className="lg:col-span-7">
                        <div className="p-5 rounded-2xl bg-[#0b0e17] border border-white/10 shadow-xl space-y-4">
                          
                          <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
                            <span className="text-slate-400 font-mono">
                              Visualización Oficial de Embed en Discord:
                            </span>
                            <span className="text-[10px] text-emerald-400 font-mono font-bold">
                              /antecedentes
                            </span>
                          </div>

                          {/* Discord Embed Box matching Image 3 */}
                          <div className="bg-[#1e1f22] rounded-xl border-l-4 border-l-[#ff0033] p-4 text-white font-sans text-sm space-y-3 shadow-lg">
                            
                            {/* Embed Header */}
                            <div className="flex items-center justify-between text-xs text-[#949ba4]">
                              <span className="text-[#f23f43] font-bold">© Perú Streets RP</span>
                              <span>APP</span>
                            </div>

                            {/* Embed Title */}
                            <h4 className="text-base font-bold text-white">
                              Antecedentes — 『ST-P』 {searchedCitizen?.robloxUsername || citizenRecord.suspectIdentifier}
                            </h4>

                            {/* Resumen */}
                            <div className="space-y-1 text-xs">
                              <p className="font-bold text-slate-300">Resumen</p>
                              <p>Estado: <strong className="text-white">{citizenRecord.statusText}</strong></p>
                              <p>
                                Multas: <strong className="text-white">{citizenRecord.finesCount}</strong>{' '}
                                <span className="text-[#949ba4]">({citizenRecord.pendingFinesCount} pendientes · S/{citizenRecord.pendingFinesTotal} por pagar)</span>
                              </p>
                              <p>
                                Arrestos: <strong className="text-white">{citizenRecord.arrestsCount}</strong>{' '}
                                <span className="text-[#949ba4]">({citizenRecord.activeArrestsCount} activos)</span>
                              </p>
                            </div>

                            {/* Arrestos list */}
                            {citizenRecord.arrests && citizenRecord.arrests.length > 0 && (
                              <div className="space-y-2 pt-2 border-t border-white/5 text-xs">
                                <p className="font-bold text-slate-300">Arrestos</p>
                                {citizenRecord.arrests.map((arr: PnpArrest) => (
                                  <div key={arr.id} className="space-y-0.5 text-slate-300">
                                    <p className="font-bold text-white flex items-center gap-1">
                                      <span className="text-[#ff0033]">▸</span>
                                      <span>{arr.arrestCode}</span>
                                      <span className="text-[#949ba4] font-normal">· {arr.status === 'active' ? 'Activo' : 'Cumplido'}</span>
                                    </p>
                                    <p className="text-[11px] text-slate-300 pl-3">
                                      Cargos: {arr.charges}
                                    </p>
                                    <p className="text-[11px] text-[#949ba4] pl-3">
                                      {arr.timeDisplay} · Fianza: {arr.bailDisplay} · {arr.createdAt}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Multas list */}
                            {citizenRecord.fines && citizenRecord.fines.length > 0 && (
                              <div className="space-y-2 pt-2 border-t border-white/5 text-xs">
                                <p className="font-bold text-slate-300">Multas</p>
                                {citizenRecord.fines.map((f: PnpFine) => (
                                  <div key={f.id} className="space-y-0.5 text-slate-300">
                                    <p className="font-bold text-white flex items-center gap-1">
                                      <span className="text-amber-400">▸</span>
                                      <span>{f.fineCode}</span>
                                      <span>· {f.amountDisplay}</span>
                                      <span className={f.status === 'Pagada' ? 'text-emerald-400 font-normal' : 'text-rose-400 font-normal'}>
                                        · {f.status}
                                      </span>
                                    </p>
                                    <p className="text-[11px] text-slate-300 pl-3">
                                      {f.reason}
                                    </p>
                                    <p className="text-[11px] text-[#949ba4] pl-3">
                                      {f.issuedBy} · {f.issuedDate}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Footer */}
                            <div className="pt-2 text-[10px] text-[#949ba4]">
                              Perú Streets RP
                            </div>

                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 2: /ARRESTAR - REGISTRO DE DETENCIÓN (MATCHING IMAGE 1 EXACTLY) */}
              {/* ========================================================================= */}
              {activeTab === 'arrest' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto items-start">
                  
                  {/* Arrest Form */}
                  <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl bg-[#0c101c] border border-rose-500/30 space-y-4">
                    <div className="flex items-center gap-2 text-rose-400">
                      <BadgeAlert className="w-5 h-5" />
                      <h3 className="text-base font-black uppercase tracking-wider text-white">
                        Comando /arrestar — Registro de Detenido
                      </h3>
                    </div>

                    <form onSubmit={handleSubmitArrest} className="space-y-3.5">
                      {/* Detenido (usuario) */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                          Detenido (Usuario de Roblox o DNI)
                        </label>
                        <input
                          type="text"
                          required
                          value={arrestSuspect}
                          onChange={(e) => setArrestSuspect(e.target.value)}
                          placeholder="ej. Tsaonomori"
                          className="w-full px-3 py-2 rounded-xl bg-[#141724] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      {/* Cargos (Quick Penal Code Selector or Custom text) */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                          Cargos Delictivos (Código Penal)
                        </label>
                        <select
                          value={arrestCharges}
                          onChange={(e) => {
                            setArrestCharges(e.target.value);
                            const found = PNP_PENAL_CODE.find((p) => p.title === e.target.value);
                            if (found) {
                              if (found.prisonMinutes) setArrestTimeMinutes(found.prisonMinutes);
                              if (found.bailAmount) setArrestBail(found.bailAmount);
                            }
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-[#141724] border border-white/10 text-white text-xs mb-2 focus:outline-none focus:border-rose-500"
                        >
                          <option value="Intento de Homicidio">Intento de Homicidio (5 min - S/ 5,000)</option>
                          <option value="Homicidio Simple / Calificado">Homicidio Simple / Calificado (10 min - S/ 15,000)</option>
                          <option value="Robo Agravado / A Mano Armada">Robo Agravado / A Mano Armada (7 min - S/ 10,000)</option>
                          <option value="Tenencia Ilegal de Armas de Fuego">Tenencia Ilegal de Armas de Fuego (5 min - S/ 6,000)</option>
                          <option value="Desobediencia y Resistencia a la Autoridad">Desobediencia y Resistencia a la Autoridad (4 min - S/ 4,000)</option>
                          <option value="Hurto de Vehículo Automotor">Hurto de Vehículo Automotor (4 min - S/ 4,500)</option>
                          <option value="Art.25">Art.25 Complicidad Primaria (3 min - S/ 2)</option>
                        </select>
                        <input
                          type="text"
                          value={arrestCharges}
                          onChange={(e) => setArrestCharges(e.target.value)}
                          placeholder="O escribe cargos personalizados..."
                          className="w-full px-3 py-2 rounded-xl bg-[#141724] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      {/* Tiempo y Fianza */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                            Tiempo de Cárcel
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={arrestTimeMinutes}
                              onChange={(e) => setArrestTimeMinutes(parseInt(e.target.value, 10) || 1)}
                              className="w-full px-3 py-2 rounded-xl bg-[#141724] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                            />
                            <span className="text-xs text-slate-400">min</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                            Fianza en Soles (S/.)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={100}
                            value={arrestBail}
                            onChange={(e) => setArrestBail(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 rounded-xl bg-[#141724] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                          />
                        </div>
                      </div>

                      {/* Oficial a cargo */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                          Oficial a Cargo
                        </label>
                        <input
                          type="text"
                          value={arrestOfficer}
                          onChange={(e) => setArrestOfficer(e.target.value)}
                          placeholder="@Jhair"
                          className="w-full px-3 py-2 rounded-xl bg-[#141724] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      {/* Archivo de Evidencia (Foto en celda / arresto) */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1 flex items-center justify-between">
                          <span>Evidencia Fotográfica / Ficha de Detenido</span>
                          <button
                            type="button"
                            onClick={() => evidenceInputRef.current?.click()}
                            className="text-[10px] text-rose-400 hover:text-white flex items-center gap-1 cursor-pointer underline"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Subir Foto</span>
                          </button>
                        </label>

                        <input
                          type="file"
                          ref={evidenceInputRef}
                          accept="image/*"
                          onChange={handleEvidenceUpload}
                          className="hidden"
                        />

                        <input
                          type="text"
                          value={arrestEvidenceUrl}
                          onChange={(e) => setArrestEvidenceUrl(e.target.value)}
                          placeholder="Pega link de imagen o sube captura..."
                          className="w-full px-3 py-2 rounded-xl bg-[#141724] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingArrest}
                        className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-950/80 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSubmittingArrest ? 'Procesando...' : 'Registrar Arresto Oficial'}</span>
                      </button>
                    </form>
                  </div>

                  {/* Live Embed Preview (Matching Image 1 Exactly!) */}
                  <div className="lg:col-span-6 space-y-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Vista Previa de Embed en Discord (100% Exacto):
                    </span>

                    {/* Discord message wrapper */}
                    <div className="p-4 rounded-2xl bg-[#0c0e17] border border-white/10 shadow-2xl space-y-3 font-sans">
                      
                      {/* Discord message author */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-emerald-400">{arrestOfficer.replace(/^@/, '') || 'Jhair'}</span>
                        <span className="text-slate-400">ha utilizado</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#5865F2]/20 text-[#5865F2] font-semibold text-[11px]">
                          :: arrestar
                        </span>
                      </div>

                      {/* Discord Embed Box */}
                      <div className="bg-[#1e1f22] rounded-xl border-l-4 border-l-[#ff0033] p-4 text-white text-xs space-y-3 shadow-lg">
                        
                        {/* Embed App Header */}
                        <div className="flex items-center justify-between text-[#949ba4]">
                          <span className="text-[#f23f43] font-bold">© Perú Streets RP</span>
                          <span className="px-1 rounded bg-[#5865F2] text-white text-[10px] font-bold">APP</span>
                          <span>{new Date().toLocaleDateString('es-PE')}, {currentTime.slice(0, 5)}</span>
                        </div>

                        {/* Title */}
                        <h4 className="text-sm sm:text-base font-bold text-white">
                          Arresto A-0017 registrado
                        </h4>

                        {/* Grid fields matching Image 1 */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-[#949ba4] block">Detenido</span>
                            <span className="text-[#5865F2] font-semibold">
                              @ [ST-P] {arrestSuspect.replace(/^@/, '') || 'Tsaonomori'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#949ba4] block">Tiempo</span>
                            <span className="text-white font-bold">{arrestTimeMinutes}m ({arrestTimeMinutes} minutos)</span>
                          </div>
                          <div>
                            <span className="text-[#949ba4] block">Fianza</span>
                            <span className="text-white font-bold">S/{arrestBail.toLocaleString('es-PE')}</span>
                          </div>
                        </div>

                        {/* Cargos */}
                        <div>
                          <span className="text-[#949ba4] block">Cargos</span>
                          <span className="text-white font-semibold">{arrestCharges}</span>
                        </div>

                        {/* Oficial a cargo y Libera */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[#949ba4] block">Oficial a cargo</span>
                            <span className="text-[#5865F2] font-semibold">{arrestOfficer || '@Jhair'}</span>
                          </div>
                          <div>
                            <span className="text-[#949ba4] block">Libera</span>
                            <span className="px-1.5 py-0.5 rounded bg-black/40 text-slate-300 font-mono text-[11px] inline-block">
                              en {arrestTimeMinutes} minutos
                            </span>
                          </div>
                        </div>

                        {/* Mugshot Image in cell */}
                        {arrestEvidenceUrl && (
                          <div className="rounded-xl overflow-hidden border border-black/40 max-h-56">
                            <img
                              src={arrestEvidenceUrl}
                              alt="Evidencia Arresto"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Embed Footer */}
                        <div className="text-[10px] text-[#949ba4] pt-1">
                          Perú Streets RP
                        </div>

                      </div>

                    </div>
                  </div>

                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 3: /MULTAR - EMISIÓN DE PAPELETAS (MATCHING IMAGE 2 EXACTLY) */}
              {/* ========================================================================= */}
              {activeTab === 'fine' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto items-start">
                  
                  {/* Fine Form */}
                  <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl bg-[#0c101c] border border-amber-500/30 space-y-4">
                    <div className="flex items-center gap-2 text-amber-400">
                      <DollarSign className="w-5 h-5" />
                      <h3 className="text-base font-black uppercase tracking-wider text-white">
                        Comando /multar — Emisión de Papeleta
                      </h3>
                    </div>

                    <form onSubmit={handleSubmitFine} className="space-y-3.5">
                      {/* Usuario */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                          Usuario Infractor (Roblox)
                        </label>
                        <input
                          type="text"
                          required
                          value={fineSuspect}
                          onChange={(e) => setFineSuspect(e.target.value)}
                          placeholder="ej. .trakeandoloz"
                          className="w-full px-3 py-2 rounded-xl bg-[#141724] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      {/* Motivo (Quick Traffic Selector or Custom text) */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                          Motivo / Infracción de Tránsito
                        </label>
                        <select
                          value={fineReason}
                          onChange={(e) => {
                            setFineReason(e.target.value);
                            const found = PNP_PENAL_CODE.find((p) => p.title === e.target.value);
                            if (found && found.fineAmount) setFineAmount(found.fineAmount);
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-[#141724] border border-white/10 text-white text-xs mb-2 focus:outline-none focus:border-amber-500"
                        >
                          <option value="Conduccion temeraria">Conducción Temeraria / Piques (S/ 700)</option>
                          <option value="No portar licencia de conducir">No Portar Licencia de Conducir - Rol 1556723203114668082 (S/ 500)</option>
                          <option value="Pasar un semaforo n rojo">Pasar Semáforo en Rojo (S/ 350)</option>
                          <option value="Exceso de velocidad">Exceso de Velocidad (S/ 300)</option>
                          <option value="Conduccion bajo efectos de alcohol">Conducción en Estado de Ebriedad (S/ 2,100)</option>
                          <option value="Estacionar en zona prohibida">Estacionar en Zona Rígida (S/ 200)</option>
                        </select>
                        <input
                          type="text"
                          value={fineReason}
                          onChange={(e) => setFineReason(e.target.value)}
                          placeholder="O escribe motivo personalizado..."
                          className="w-full px-3 py-2 rounded-xl bg-[#141724] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      {/* Monto */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                          Monto en Soles (S/.)
                        </label>
                        <input
                          type="number"
                          min={10}
                          step={50}
                          value={fineAmount}
                          onChange={(e) => setFineAmount(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-xl bg-[#141724] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      {/* Emitida por */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                          Emitida Por (Oficial)
                        </label>
                        <input
                          type="text"
                          value={fineOfficer}
                          onChange={(e) => setFineOfficer(e.target.value)}
                          placeholder="jhair9813"
                          className="w-full px-3 py-2 rounded-xl bg-[#141724] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmittingFine}
                        className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-950/80 cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSubmittingFine ? 'Emitiendo...' : 'Emitir Multa Oficial'}</span>
                      </button>
                    </form>
                  </div>

                  {/* Live Embed Preview (Matching Image 2 Exactly!) */}
                  <div className="lg:col-span-6 space-y-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Vista Previa de Embed en Discord (100% Exacto):
                    </span>

                    {/* Discord message wrapper */}
                    <div className="p-4 rounded-2xl bg-[#0c0e17] border border-white/10 shadow-2xl space-y-3 font-sans">
                      
                      {/* Author */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-emerald-400">{fineOfficer || 'Jhair'}</span>
                        <span className="text-slate-400">ha utilizado</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#5865F2]/20 text-[#5865F2] font-semibold text-[11px]">
                          :: multar
                        </span>
                      </div>

                      {/* Discord Embed Box matching Image 2 */}
                      <div className="bg-[#1e1f22] rounded-xl border-l-4 border-l-[#ff0033] p-4 text-white text-xs space-y-3 shadow-lg max-w-md">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between text-[#949ba4]">
                          <span className="text-[#f23f43] font-bold">© Perú Streets RP</span>
                          <span className="px-1 rounded bg-[#5865F2] text-white text-[10px] font-bold">APP</span>
                          <span>{new Date().toLocaleDateString('es-PE')}, {currentTime.slice(0, 5)}</span>
                        </div>

                        {/* Title */}
                        <h4 className="text-base font-bold text-white">
                          Multa M-0005
                        </h4>

                        {/* Fields matching Image 2 */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-[#949ba4] block">Usuario</span>
                            <span className="text-[#5865F2] font-semibold">
                              @ [. {fineSuspect.replace(/^@/, '') || 'trakeandoloz'}]
                            </span>
                          </div>
                          <div>
                            <span className="text-[#949ba4] block">Monto</span>
                            <span className="text-white font-bold">S/{fineAmount}</span>
                          </div>
                          <div>
                            <span className="text-[#949ba4] block">Estado</span>
                            <span className="text-amber-400 font-bold">Pendiente</span>
                          </div>
                        </div>

                        {/* Motivo */}
                        <div>
                          <span className="text-[#949ba4] block">Motivo</span>
                          <span className="text-white font-semibold">{fineReason}</span>
                        </div>

                        {/* Emitida por y Fecha */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[#949ba4] block">Emitida por</span>
                            <span className="text-slate-300 font-mono">{fineOfficer || 'jhair9813'}</span>
                          </div>
                          <div>
                            <span className="text-[#949ba4] block">Fecha</span>
                            <span className="text-slate-300 font-mono">{new Date().toISOString().split('T')[0]}</span>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="text-[10px] text-[#949ba4] pt-1">
                          Perú Streets RP
                        </div>

                      </div>

                    </div>
                  </div>

                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 4: CÓDIGO PENAL & INFRACCIONES */}
              {/* ========================================================================= */}
              {activeTab === 'penal' && (
                <div className="max-w-5xl mx-auto space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black uppercase text-white tracking-wider flex items-center gap-2">
                        <FileText className="w-5 h-5 text-sky-400" />
                        <span>Código Penal y Reglamento Nacional de Tránsito de Perú</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Tabla oficial de tipificación de delitos, tiempos de condena, fianzas reglamentarias y multas en Soles.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {PNP_PENAL_CODE.map((art) => (
                      <div
                        key={art.code}
                        className={`p-4 rounded-2xl border transition-all ${
                          art.category === 'delito'
                            ? 'bg-[#120e18] border-rose-500/30 hover:border-rose-500/60'
                            : 'bg-[#0f1422] border-amber-500/30 hover:border-amber-500/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            art.category === 'delito' ? 'bg-rose-950 text-rose-300 border border-rose-500/40' : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          }`}>
                            {art.code}
                          </span>
                          <span className="text-xs font-bold text-white font-mono">
                            {art.category === 'delito' ? `${art.prisonMinutes}m Cárcel · Fianza S/${art.bailAmount}` : `Multa S/${art.fineAmount}`}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">{art.title}</h4>
                        <p className="text-xs text-slate-300 mt-1">{art.description}</p>
                        
                        <div className="pt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (art.category === 'delito') {
                                setArrestCharges(art.title);
                                if (art.prisonMinutes) setArrestTimeMinutes(art.prisonMinutes);
                                if (art.bailAmount) setArrestBail(art.bailAmount);
                                setActiveTab('arrest');
                              } else {
                                setFineReason(art.title);
                                if (art.fineAmount) setFineAmount(art.fineAmount);
                                setActiveTab('fine');
                              }
                              playClickSound();
                            }}
                            className="text-[11px] font-bold text-emerald-400 hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            <span>Aplicar a {art.category === 'delito' ? 'Arresto' : 'Multa'}</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 5: PADRÓN GENERAL SIPOL */}
              {/* ========================================================================= */}
              {activeTab === 'registry' && (
                <div className="max-w-5xl mx-auto space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div>
                      <h3 className="text-base font-black uppercase text-white tracking-wider flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-purple-400" />
                        <span>Padrón General de Arrestos y Multas Registradas</span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Historial unificado de intervenciones policiales sincronizado con el Bot de Discord.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRegistryFilter('all')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          registryFilter === 'all' ? 'bg-white text-black' : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegistryFilter('arrests')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          registryFilter === 'arrests' ? 'bg-rose-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        Arrestos ({allArrests.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegistryFilter('fines')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          registryFilter === 'fines' ? 'bg-amber-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        Multas ({allFines.length})
                      </button>
                    </div>
                  </div>

                  {/* Arrests list */}
                  {(registryFilter === 'all' || registryFilter === 'arrests') && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">
                        Arrestos Oficiales Registrados:
                      </span>
                      <div className="space-y-2">
                        {allArrests.map((arr) => (
                          <div
                            key={arr.id}
                            className="p-3.5 rounded-2xl bg-[#120e18] border border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-1 rounded-lg bg-rose-950 text-rose-300 font-mono font-bold text-xs">
                                {arr.arrestCode}
                              </span>
                              <div>
                                <strong className="text-white text-sm">@{arr.suspectRoblox}</strong>
                                <p className="text-slate-300">{arr.charges}</p>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-3 text-[11px] font-mono text-slate-400">
                              <span>Tiempo: {arr.timeDisplay}</span>
                              <span className="text-white font-bold">Fianza: {arr.bailDisplay}</span>
                              <span className="text-emerald-400">{arr.officerName}</span>
                              <span>{arr.createdAt}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fines list */}
                  {(registryFilter === 'all' || registryFilter === 'fines') && (
                    <div className="space-y-2 pt-3">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                        Multas y Papeletas Registradas:
                      </span>
                      <div className="space-y-2">
                        {allFines.map((f) => (
                          <div
                            key={f.id}
                            className="p-3.5 rounded-2xl bg-[#0f1422] border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-1 rounded-lg bg-amber-950 text-amber-300 font-mono font-bold text-xs">
                                {f.fineCode}
                              </span>
                              <div>
                                <strong className="text-white text-sm">@{f.suspectRoblox}</strong>
                                <p className="text-slate-300">{f.reason}</p>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-3 text-[11px] font-mono text-slate-400">
                              <span className="text-white font-bold">{f.amountDisplay}</span>
                              <span className={f.status === 'Pagada' ? 'text-emerald-400' : 'text-rose-400'}>
                                {f.status}
                              </span>
                              <span>{f.issuedBy}</span>
                              <span>{f.issuedDate}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
