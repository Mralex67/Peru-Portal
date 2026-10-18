import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  User,
  Fingerprint,
  QrCode,
  Download,
  RotateCcw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
  Search,
  ExternalLink,
  CreditCard,
  Database,
  Upload,
  RefreshCw,
} from 'lucide-react';
import { useServer } from '../context/ServerContext';
import { PeruDni } from '../types/dni';
import { getUserDni, saveUserDni, deleteUserDni } from '../lib/supabase';
import { generateRandomPeruDniNumber, fetchRobloxAvatarUrl } from '../utils/roblox';
import { playClickSound, playSuccessSound } from '../utils/audio';

export const PeruDniSection: React.FC = () => {
  const { discordUser, setIsDiscordAuthOpen } = useServer();

  const [existingDni, setExistingDni] = useState<PeruDni | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);

  // Form states
  const [robloxUsername, setRobloxUsername] = useState('');
  const [robloxUserId, setRobloxUserId] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);

  const [firstSurname, setFirstSurname] = useState('');
  const [secondSurname, setSecondSurname] = useState('');
  const [givenNames, setGivenNames] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [birthYear, setBirthYear] = useState('2002');
  const [birthMonth, setBirthMonth] = useState('MAY');
  const [birthDay, setBirthDay] = useState('14');

  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if current discord user has a DNI registered
  useEffect(() => {
    if (!discordUser) {
      setExistingDni(null);
      return;
    }

    setLoadingCheck(true);
    setErrorMessage('');

    // Pre-fill names based on Discord user displayName
    const parts = (discordUser.displayName || discordUser.username || '').split(/[ _]/);
    if (parts.length >= 2) {
      setGivenNames(parts[0].toUpperCase());
      setFirstSurname(parts[1].toUpperCase());
      setSecondSurname('PEREZ');
    } else {
      setGivenNames(discordUser.displayName?.toUpperCase() || 'CIUDADANO');
      setFirstSurname('QUISPE');
      setSecondSurname('MAMANI');
    }

    // Default roblox username matching discord username
    setRobloxUsername(discordUser.username || '');

    getUserDni(discordUser.id)
      .then((dni) => {
        if (dni) {
          setExistingDni(dni);
          setAvatarPreview(dni.photoUrl);
        } else {
          setExistingDni(null);
          // Auto fetch Roblox avatar for initial username
          if (discordUser.username) {
            fetchRobloxAvatarUrl(discordUser.username)
              .then((res) => {
                if (res.avatarUrl) {
                  setAvatarPreview(res.avatarUrl);
                  if (res.userId) setRobloxUserId(res.userId);
                }
              })
              .catch(() => {});
          }
        }
      })
      .catch((err) => {
        console.error('Error verificando DNI:', err);
      })
      .finally(() => {
        setLoadingCheck(false);
      });
  }, [discordUser]);

  // Debounced auto-fetch Roblox avatar when username changes
  useEffect(() => {
    if (!robloxUsername.trim() || existingDni) return;
    const timeout = setTimeout(() => {
      fetchRobloxAvatarUrl(robloxUsername.trim())
        .then((res) => {
          if (res.avatarUrl) {
            setAvatarPreview(res.avatarUrl);
            if (res.userId) setRobloxUserId(res.userId);
          }
        })
        .catch(() => {});
    }, 800);
    return () => clearTimeout(timeout);
  }, [robloxUsername, existingDni]);

  // Manual fetch Roblox avatar button
  const handleFetchRobloxAvatar = async () => {
    if (!robloxUsername.trim()) return;
    setIsLoadingAvatar(true);
    setErrorMessage('');
    playClickSound();

    try {
      const res = await fetchRobloxAvatarUrl(robloxUsername.trim());
      if (res.avatarUrl) {
        setAvatarPreview(res.avatarUrl);
        if (res.userId) setRobloxUserId(res.userId);
        playSuccessSound();
      }
    } catch {
      setErrorMessage('No se pudo contactar a Roblox. Puedes ingresar tu ID numérico o subir tu foto.');
    } finally {
      setIsLoadingAvatar(false);
    }
  };

  // Upload custom photo from disk
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAvatarPreview(reader.result);
          playSuccessSound();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset user's DNI to allow re-creating
  const handleResetMyDni = async () => {
    if (!discordUser) return;
    if (window.confirm('¿Seguro que deseas reiniciar tu DNI para volver a crearlo con tu avatar de Roblox?')) {
      playClickSound();
      await deleteUserDni(discordUser.id);
      setExistingDni(null);
      setSuccessMessage('DNI reiniciado exitosamente. Ahora puedes tramitarlo de nuevo con tu foto de Roblox.');
      playSuccessSound();
    }
  };

  // Submit and create unique Peruvian DNI in Supabase
  const handleGenerateDni = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordUser) return;
    if (existingDni) {
      setErrorMessage('Ya posees un DNI emitido. No está permitido tramitar más de un DNI por ciudadano.');
      return;
    }

    if (!robloxUsername.trim()) {
      setErrorMessage('Por favor ingresa tu usuario o ID de Roblox.');
      return;
    }
    if (!firstSurname.trim() || !givenNames.trim()) {
      setErrorMessage('Por favor completa tus apellidos y nombres para el DNI.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    playClickSound();

    const { dni: dniNum, digit } = generateRandomPeruDniNumber();
    const cleanFirstSurname = firstSurname.trim().toUpperCase();
    const cleanSecondSurname = (secondSurname.trim() || 'PEREZ').toUpperCase();
    const cleanGivenNames = givenNames.trim().toUpperCase();
    const birthDateStr = `${birthDay.padStart(2, '0')} ${birthMonth} ${birthYear}`;

    const now = new Date();
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SET', 'OCT', 'NOV', 'DIC'];
    const currentDay = now.getDate().toString().padStart(2, '0');
    const currentMonth = months[now.getMonth()];
    const currentYear = now.getFullYear();
    const issueDateStr = `${currentDay} ${currentMonth} ${currentYear}`;
    const expiryDateStr = `${currentDay} ${currentMonth} ${currentYear + 8}`;

    const photoToUse =
      avatarPreview ||
      `https://www.roblox.com/headshot-thumbnail/image?userId=1&width=420&height=420&format=png`;

    const newDniPayload: PeruDni = {
      id: `dni-${Date.now()}`,
      discordId: discordUser.id,
      discordUsername: discordUser.username,
      discordDisplayName: discordUser.displayName,
      robloxUsername: robloxUsername.trim(),
      robloxUserId: robloxUserId || undefined,
      dniNumber: dniNum,
      verifyDigit: digit,
      fullName: `${cleanFirstSurname} ${cleanSecondSurname}, ${cleanGivenNames}`,
      firstSurname: cleanFirstSurname,
      secondSurname: cleanSecondSurname,
      givenNames: cleanGivenNames,
      birthDate: birthDateStr,
      issueDate: issueDateStr,
      expiryDate: expiryDateStr,
      gender,
      civilStatus: 'S',
      ubigeo: '150101',
      photoUrl: photoToUse,
      signatureText: `${cleanGivenNames.charAt(0)}.${cleanFirstSurname}`,
      createdAt: new Date().toISOString(),
    };

    try {
      const result = await saveUserDni(newDniPayload);
      if (result.success && result.dni) {
        setExistingDni(result.dni);
        setSuccessMessage('¡DNI emitido exitosamente con tu avatar de Roblox y registrado en Supabase!');
        playSuccessSound();
      } else {
        setErrorMessage(result.error || 'No se pudo registrar el DNI en Supabase.');
        if (result.dni) setExistingDni(result.dni);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al generar DNI.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Active DNI to render
  const currentDni: PeruDni = existingDni || {
    id: 'preview',
    discordId: discordUser?.id || '00000',
    discordUsername: discordUser?.username || 'Ciudadano',
    robloxUsername: robloxUsername.trim() || 'UsuarioRoblox',
    dniNumber: '74291850',
    verifyDigit: '6',
    fullName: `${firstSurname.toUpperCase() || 'QUISPE'} ${secondSurname.toUpperCase() || 'MAMANI'}, ${givenNames.toUpperCase() || 'ALEX'}`,
    firstSurname: firstSurname.toUpperCase() || 'QUISPE',
    secondSurname: secondSurname.toUpperCase() || 'MAMANI',
    givenNames: givenNames.toUpperCase() || 'ALEX',
    birthDate: `${birthDay} ${birthMonth} ${birthYear}`,
    issueDate: '18 OCT 2026',
    expiryDate: '18 OCT 2034',
    gender,
    civilStatus: 'S',
    ubigeo: '150101',
    photoUrl: avatarPreview || `https://www.roblox.com/headshot-thumbnail/image?userId=1&width=420&height=420&format=png`,
    signatureText: `${givenNames.charAt(0) || 'A'}.${firstSurname || 'Quispe'}`,
    createdAt: new Date().toISOString(),
  };

  return (
    <section id="dni" className="relative py-24 bg-[#06080e] border-y border-white/5 overflow-hidden">
      {/* Background illumination */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-sky-950/20 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-950/80 border border-sky-500/40 text-sky-300 text-xs font-bold uppercase tracking-widest shadow-md mb-4">
            <CreditCard className="w-4 h-4 text-sky-400" />
            <span>RENIEC OFICIAL PE:RP • REGISTRO CIVIL</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black font-condensed tracking-tight text-white uppercase leading-none">
            DNI PERUANO ELECTRÓNICO <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-200 to-white">EN VIVO</span>
          </h2>

          <p className="mt-4 text-sm sm:text-base text-slate-300">
            Genera tu Documento Nacional de Identidad con tu avatar oficial de Roblox.
            Cada documento es único, verificado y almacenado en la base de datos de <strong className="text-sky-300">Supabase</strong> para que la PNP y autoridades lo reconozcan en el servidor.
          </p>
        </div>

        {/* State 1: User NOT logged in with Discord */}
        {!discordUser ? (
          <div className="max-w-xl mx-auto rounded-3xl bg-[#0f1322] border border-sky-500/30 p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/40 text-sky-400 mx-auto flex items-center justify-center mb-5 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2 font-sans">
              Autenticación Requerida para Tramitar DNI
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
              Para garantizar que no existan multicuentas ni DNIs duplicados, debes iniciar sesión con tu cuenta de Discord antes de solicitar tu documento peruano oficial.
            </p>

            <button
              onClick={() => setIsDiscordAuthOpen(true)}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-sm tracking-wide shadow-xl shadow-indigo-950 transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              <span>Conectar con Discord para Tramitar DNI</span>
            </button>
          </div>
        ) : (
          /* State 2: User IS logged in */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Interactive DNI Card Display */}
            <div className="lg:col-span-7 flex flex-col items-center">
              
              {/* Controls bar */}
              <div className="w-full max-w-[500px] flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-slate-300">
                    {existingDni ? 'DNI EMITIDO Y VÁLIDO' : 'VISTA PREVIA EN VIVO'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsFlipped(!isFlipped);
                    playClickSound();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-semibold transition-colors cursor-pointer border border-white/10"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isFlipped ? 'Ver Anverso' : 'Ver Reverso'}</span>
                </button>
              </div>

              {/* PERUVIAN DNI CARD CONTAINER */}
              <div
                ref={cardRef}
                className="relative w-full max-w-[500px] aspect-[1.586/1] rounded-2xl shadow-2xl overflow-hidden border border-sky-400/30 transition-transform duration-500 select-none bg-gradient-to-br from-[#cce5f4] via-[#e2eef7] to-[#b3d4ea] text-slate-900 p-4 sm:p-5 flex flex-col justify-between font-sans shadow-sky-950/60"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.7) 0%, rgba(200,225,242,0.95) 100%)`,
                }}
              >
                {/* Watermark Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center font-black text-6xl rotate-[-25deg] text-slate-800">
                  RENIEC PERÚ
                </div>

                {!isFlipped ? (
                  /* FRONT SIDE (ANVERSO DNIe PERUANO) */
                  <>
                    {/* Header */}
                    <div className="relative z-10 flex items-start justify-between border-b border-sky-800/20 pb-2">
                      <div className="flex items-center gap-2">
                        {/* Escudo Nacional del Perú */}
                        <div className="w-9 h-9 rounded-full bg-red-700 border border-amber-300 flex items-center justify-center text-white text-[10px] font-black shadow-md shrink-0">
                          🇵🇪
                        </div>
                        <div>
                          <div className="text-[10px] sm:text-[11px] font-extrabold tracking-tight text-slate-900 leading-tight uppercase">
                            REPÚBLICA DEL PERÚ
                          </div>
                          <div className="text-[8px] sm:text-[9px] font-bold text-sky-900 leading-tight">
                            REGISTRO NACIONAL DE IDENTIFICACIÓN Y ESTADO CIVIL
                          </div>
                          <div className="text-[7px] font-bold text-red-700 tracking-wider uppercase">
                            DOCUMENTO NACIONAL DE IDENTIDAD ELECTRÓNICO
                          </div>
                        </div>
                      </div>

                      {/* DNI Number */}
                      <div className="text-right">
                        <span className="text-[8px] font-bold uppercase text-slate-600 block">DNI N°</span>
                        <span className="font-mono text-base sm:text-lg font-black text-red-700 tracking-wider">
                          {currentDni.dniNumber} - {currentDni.verifyDigit}
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="relative z-10 grid grid-cols-12 gap-3 my-auto items-center">
                      
                      {/* Left: Roblox Avatar Photo */}
                      <div className="col-span-4 sm:col-span-3 flex flex-col items-center">
                        <div className="relative w-24 h-28 sm:w-28 sm:h-32 rounded-lg bg-white border-2 border-slate-400 overflow-hidden shadow-md">
                          <img
                            src={currentDni.photoUrl}
                            alt="Avatar Roblox DNI"
                            className="w-full h-full object-cover object-center bg-slate-100"
                            crossOrigin="anonymous"
                          />
                          {/* Holographic watermark on photo */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-sky-300/20 to-white/30 pointer-events-none" />
                          <div className="absolute bottom-0 inset-x-0 bg-red-600/90 text-white text-[7px] font-mono text-center font-bold py-0.5">
                            PE:RP OFICIAL
                          </div>
                        </div>
                        <div className="text-[8px] font-mono font-bold text-slate-700 mt-1 truncate max-w-full">
                          @{currentDni.robloxUsername}
                        </div>
                      </div>

                      {/* Middle: Identity Data */}
                      <div className="col-span-8 sm:col-span-9 space-y-1 text-left pl-1">
                        <div>
                          <span className="text-[8px] font-bold text-slate-600 uppercase block">1. Primer Apellido:</span>
                          <span className="text-xs sm:text-sm font-black text-slate-900 font-mono tracking-wide">
                            {currentDni.firstSurname}
                          </span>
                        </div>

                        <div>
                          <span className="text-[8px] font-bold text-slate-600 uppercase block">2. Segundo Apellido:</span>
                          <span className="text-xs sm:text-sm font-black text-slate-900 font-mono tracking-wide">
                            {currentDni.secondSurname}
                          </span>
                        </div>

                        <div>
                          <span className="text-[8px] font-bold text-slate-600 uppercase block">3. Prenombres:</span>
                          <span className="text-xs sm:text-sm font-black text-slate-900 font-mono tracking-wide">
                            {currentDni.givenNames}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-sky-800/20 text-[9px]">
                          <div>
                            <span className="text-[7px] font-bold text-slate-600 uppercase block">Nacimiento:</span>
                            <span className="font-bold text-slate-800 font-mono">{currentDni.birthDate}</span>
                          </div>
                          <div>
                            <span className="text-[7px] font-bold text-slate-600 uppercase block">Sexo / Civil:</span>
                            <span className="font-bold text-slate-800 font-mono">{currentDni.gender} / {currentDni.civilStatus}</span>
                          </div>
                          <div>
                            <span className="text-[7px] font-bold text-slate-600 uppercase block">Caducidad:</span>
                            <span className="font-bold text-red-700 font-mono">{currentDni.expiryDate}</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Footer Front: Chip & Signature */}
                    <div className="relative z-10 flex items-center justify-between pt-1 border-t border-sky-800/20 text-[9px]">
                      {/* Golden Smartchip */}
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-6 rounded bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 border border-amber-700 shadow-inner flex items-center justify-center text-[7px] font-mono font-bold text-amber-950">
                          💳
                        </div>
                        <span className="text-[8px] font-bold text-slate-700">CHIP RENIEC DNIe</span>
                      </div>

                      {/* Citizen Signature */}
                      <div className="text-right">
                        <span className="text-[7px] font-bold text-slate-500 uppercase block">Firma del Titular</span>
                        <span className="font-serif italic font-bold text-xs text-slate-900 tracking-wider">
                          {currentDni.signatureText}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  /* REVERSE SIDE (REVERSO DNIe PERUANO) */
                  <>
                    <div className="relative z-10 flex items-center justify-between border-b border-sky-800/20 pb-1.5">
                      <div className="text-[9px] font-bold text-slate-800 uppercase">
                        REVERSO DE IDENTIFICACIÓN POLICIAL & CIUDADANA
                      </div>
                      <div className="text-[8px] font-mono text-slate-600">
                        UBIGEO: <span className="font-bold text-slate-900">{currentDni.ubigeo}</span>
                      </div>
                    </div>

                    <div className="relative z-10 grid grid-cols-12 gap-3 my-auto items-center">
                      {/* Left: Biometric Fingerprint & QR */}
                      <div className="col-span-4 flex items-center gap-2">
                        <div className="w-14 h-16 rounded bg-white/80 border border-slate-400 flex flex-col items-center justify-center p-1">
                          <Fingerprint className="w-8 h-8 text-slate-800" />
                          <span className="text-[6px] font-bold text-slate-600">HUELLA</span>
                        </div>
                        <div className="w-14 h-16 rounded bg-white/80 border border-slate-400 flex flex-col items-center justify-center p-1">
                          <QrCode className="w-8 h-8 text-slate-800" />
                          <span className="text-[6px] font-bold text-slate-600">QR OFICIAL</span>
                        </div>
                      </div>

                      {/* Right: Server details */}
                      <div className="col-span-8 text-[9px] space-y-1 text-slate-800">
                        <div>
                          <strong>Discord ID:</strong> <span className="font-mono">{currentDni.discordId}</span>
                        </div>
                        <div>
                          <strong>Usuario Roblox:</strong> <span className="font-mono text-red-800 font-bold">{currentDni.robloxUsername}</span>
                        </div>
                        <div>
                          <strong>Estado de Emisión:</strong> <span className="text-emerald-800 font-bold">Activo en Base de Datos Supabase</span>
                        </div>
                        <div className="text-[8px] text-slate-600">
                          Este documento es intransferible y certifica la ciudadanía oficial en el servidor PE:RP Streets en Roblox ERLC.
                        </div>
                      </div>
                    </div>

                    {/* MRZ Optical Zone */}
                    <div className="relative z-10 bg-white/60 p-1.5 rounded font-mono text-[8px] tracking-widest text-slate-900 leading-tight text-center font-bold">
                      IDPER{currentDni.dniNumber}&lt;{currentDni.verifyDigit}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;<br />
                      0205148M3410185PER&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;8<br />
                      {currentDni.firstSurname}&lt;&lt;{currentDni.givenNames}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
                    </div>
                  </>
                )}
              </div>

              {/* Status Badge below Card */}
              {existingDni && (
                <div className="mt-4 p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5 max-w-[500px] w-full shadow-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <strong className="block text-white font-bold">DNI Oficial Registrado en Supabase</strong>
                    <span>Tu identidad ya está asentada en el Registro Nacional PE:RP. Vinculado a tu avatar de Roblox.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Creation Form or Status Details */}
            <div className="lg:col-span-5 bg-[#0e1220] rounded-3xl border border-sky-500/20 p-6 sm:p-7 shadow-2xl relative">
              
              {/* If user ALREADY has a DNI */}
              {existingDni ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base font-sans">
                        Identidad Ciudadana Confirmada
                      </h3>
                      <p className="text-xs text-slate-400">
                        Vinculado a Discord: <span className="text-sky-300 font-bold">{discordUser.displayName || discordUser.username}</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs text-slate-300">
                    <div className="flex justify-between py-1.5 border-b border-white/5">
                      <span className="text-slate-400">Número de DNI:</span>
                      <span className="font-mono font-bold text-white text-sm">{existingDni.dniNumber} - {existingDni.verifyDigit}</span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-white/5">
                      <span className="text-slate-400">Usuario Roblox:</span>
                      <span className="font-mono font-bold text-sky-400">@{existingDni.robloxUsername}</span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-white/5">
                      <span className="text-slate-400">Titular de Rol:</span>
                      <span className="font-bold text-white">{existingDni.fullName}</span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-white/5">
                      <span className="text-slate-400">Base de Datos:</span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                        <Database className="w-3.5 h-3.5" /> Supabase Activo
                      </span>
                    </div>
                  </div>

                  {/* Reset button to allow creating anew */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleResetMyDni}
                      className="w-full py-2.5 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <RotateCcw className="w-4 h-4 text-rose-400" />
                      <span>Reiniciar mi DNI y Crear de Nuevo</span>
                    </button>
                    <span className="text-[10px] text-slate-400 block text-center mt-1.5">
                      Usa esta opción si deseas cambiar tu avatar de Roblox o corregir tu nombre.
                    </span>
                  </div>
                </div>
              ) : (
                /* Form to generate unique Peruvian DNI */
                <form onSubmit={handleGenerateDni} className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div>
                      <h3 className="font-bold text-white text-base font-sans flex items-center gap-2">
                        <User className="w-4 h-4 text-sky-400" />
                        Formulario de Emisión RENIEC
                      </h3>
                      <p className="text-xs text-slate-400">
                        Se registrará a nombre de tu Discord: <strong className="text-white">{discordUser.displayName || discordUser.username}</strong>
                      </p>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  {/* Field: Roblox Username */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Usuario o ID de Roblox <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        value={robloxUsername}
                        onChange={(e) => setRobloxUsername(e.target.value)}
                        placeholder="ej. MrAlex_Peru"
                        className="flex-1 px-3.5 py-2 rounded-xl bg-[#090b14] border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-sky-400"
                      />
                      <button
                        type="button"
                        onClick={handleFetchRobloxAvatar}
                        disabled={isLoadingAvatar}
                        className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 disabled:opacity-60 shadow-md"
                      >
                        {isLoadingAvatar ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                        <span>{isLoadingAvatar ? 'Cargando...' : 'Obtener Foto'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Photo Preview & Custom Upload Option */}
                  <div className="p-3 rounded-2xl bg-[#070912] border border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-14 rounded-lg bg-slate-800 border-2 border-sky-400 overflow-hidden shrink-0 shadow-md">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Avatar Roblox"
                            className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px]">
                            Sin foto
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Foto del Avatar Roblox</span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {avatarPreview.includes('rbxcdn') || avatarPreview.includes('roblox.com')
                            ? 'Avatar oficial de Roblox sincronizado'
                            : 'Avatar listo para el DNI'}
                        </p>
                      </div>
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-[11px] text-sky-300 hover:text-white font-medium flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir Imagen</span>
                    </button>
                  </div>

                  {/* Fields: First & Second Surname */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Primer Apellido <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={firstSurname}
                        onChange={(e) => setFirstSurname(e.target.value)}
                        placeholder="ej. QUISPE"
                        className="w-full px-3 py-2 rounded-xl bg-[#090b14] border border-white/15 text-white uppercase text-xs focus:outline-none focus:border-sky-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Segundo Apellido
                      </label>
                      <input
                        type="text"
                        value={secondSurname}
                        onChange={(e) => setSecondSurname(e.target.value)}
                        placeholder="ej. MAMANI"
                        className="w-full px-3 py-2 rounded-xl bg-[#090b14] border border-white/15 text-white uppercase text-xs focus:outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>

                  {/* Field: Given names */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Prenombres <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={givenNames}
                      onChange={(e) => setGivenNames(e.target.value)}
                      placeholder="ej. CARLOS DANIEL"
                      className="w-full px-3 py-2 rounded-xl bg-[#090b14] border border-white/15 text-white uppercase text-xs focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  {/* Field: Gender and Birth */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Sexo</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as 'M' | 'F')}
                        className="w-full px-3 py-2 rounded-xl bg-[#090b14] border border-white/15 text-white text-xs focus:outline-none focus:border-sky-400"
                      >
                        <option value="M">M - Masculino</option>
                        <option value="F">F - Femenino</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Año de Nacimiento</label>
                      <select
                        value={birthYear}
                        onChange={(e) => setBirthYear(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#090b14] border border-white/15 text-white text-xs focus:outline-none focus:border-sky-400"
                      >
                        {Array.from({ length: 30 }, (_, i) => 2008 - i).map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xl shadow-sky-950 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                    >
                      <Sparkles className="w-4 h-4 text-sky-200" />
                      <span>{isSubmitting ? 'Registrando en Supabase...' : 'Generar y Registrar DNI Único'}</span>
                    </button>
                    <span className="block text-[10px] text-center text-slate-400 mt-2">
                      ⚠️ Atención: Una vez generado, tu DNI quedará registrado de forma permanente.
                    </span>
                  </div>
                </form>
              )}

            </div>

          </div>
        )}

      </div>
    </section>
  );
};
