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
  Bot,
  Copy,
  Palette,
  Image,
  Trash2,
  X,
} from 'lucide-react';
import { useServer } from '../context/ServerContext';
import { PeruDni } from '../types/dni';
import { getUserDni, saveUserDni, deleteUserDni, updateUserDniPhoto, getLocalDnis, syncSupabaseConfig, lookupCitizenDni } from '../lib/supabase';
import { generateRandomPeruDniNumber, fetchRobloxAvatarUrl, DEFAULT_ROBLOX_AVATAR } from '../utils/roblox';
import { PERU_AVATARS } from '../utils/peruAvatars';
import { playClickSound, playSuccessSound } from '../utils/audio';
import { OFFICIAL_DNI_TEMPLATE_BASE64 } from '../assets/dniTemplateBase64';

export const PeruDniSection: React.FC = () => {
  const { config, discordUser, setIsDiscordAuthOpen, loginWithDiscord } = useServer();

  const [existingDni, setExistingDni] = useState<PeruDni | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingDni, setIsSearchingDni] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);

  // Avatar sync for existing DNI
  const [isSyncingAvatar, setIsSyncingAvatar] = useState(false);
  const [showAvatarSyncModal, setShowAvatarSyncModal] = useState(false);
  const [newRobloxInput, setNewRobloxInput] = useState('');
  const [photoUpdateTab, setPhotoUpdateTab] = useState<'roblox' | 'upload' | 'url'>('roblox');
  const [customPhotoUrlInput, setCustomPhotoUrlInput] = useState('');
  const [tempPreviewUrl, setTempPreviewUrl] = useState('');
  const [isSearchingAvatar, setIsSearchingAvatar] = useState(false);

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
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const templateFileInputRef = useRef<HTMLInputElement>(null);

  // Template custom state (Loaded from disk PNG, custom uploaded, or guaranteed Base64 fallback)
  const [templateSrc, setTemplateSrc] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('perp_custom_dni_template');
      if (saved && saved.startsWith('data:image')) return saved;
    } catch {}
    return '/assets/dni-template-official.png';
  });
  const formatCivilStatus = (status?: string) => {
    if (!status) return 'SOLTERO';
    const upper = status.toUpperCase().trim();
    if (upper === 'S' || upper === 'SOLTERO') return 'SOLTERO';
    if (upper === 'C' || upper === 'CASADO') return 'CASADO';
    if (upper === 'V' || upper === 'VIUDO') return 'VIUDO';
    if (upper === 'D' || upper === 'DIVORCIADO') return 'DIVORCIADO';
    return upper;
  };

  const formatSerialCode = (serial?: string, dniNum?: string) => {
    if (serial && serial.startsWith('0000') && serial.length <= 8) {
      return serial;
    }
    const cleanDni = (dniNum || '112').replace(/\D/g, '');
    const suffix = cleanDni.slice(-3) || '112';
    return `0000${suffix}`;
  };

  // Sync template when updated from Admin Panel
  useEffect(() => {
    const handleTemplateChange = () => {
      const saved = localStorage.getItem('perp_custom_dni_template');
      setTemplateSrc(saved || OFFICIAL_DNI_TEMPLATE_BASE64);
    };
    window.addEventListener('storage', handleTemplateChange);
    window.addEventListener('perp_dni_template_updated', handleTemplateChange);
    return () => {
      window.removeEventListener('storage', handleTemplateChange);
      window.removeEventListener('perp_dni_template_updated', handleTemplateChange);
    };
  }, []);

  // Auto-sync any existing local DNIs to backend server & Discord Bot
  useEffect(() => {
    try {
      const locals = getLocalDnis();
      syncSupabaseConfig().catch(() => {});
      if (locals && locals.length > 0) {
        locals.forEach((d: any) => {
          fetch('/api/bot/dni/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(d),
          }).catch(() => {});
        });
      }
    } catch {}
  }, []);

  const handleDirectCitizenSearch = async (queryText?: string) => {
    const q = (queryText || searchQuery).trim().replace(/^@/, '');
    if (!q) {
      setSearchFeedback({ success: false, message: 'Por favor escribe tu usuario de Roblox, Discord o N° de DNI.' });
      return;
    }
    setIsSearchingDni(true);
    setSearchFeedback(null);
    playClickSound();

    try {
      const found = await lookupCitizenDni(q);
      if (found) {
        setExistingDni(found);
        if (found.photoUrl) setAvatarPreview(found.photoUrl);
        if (!discordUser) {
          loginWithDiscord({
            id: found.discordId,
            username: found.discordUsername || found.robloxUsername,
            displayName: found.fullName || found.robloxUsername,
            avatar: found.photoUrl || PERU_AVATARS.peruCitizen,
            role: 'Ciudadano',
            discriminator: '0',
            isStaff: false,
          });
        }
        playSuccessSound();
        setSearchFeedback({
          success: true,
          message: `¡DNI localizado con éxito! Titular: ${found.fullName} (@${found.robloxUsername}).`,
        });
      } else {
        setSearchFeedback({
          success: false,
          message: `No se encontró ningún DNI para "${q}" en Supabase ni en el servidor. Asegúrate de haber ejecutado /crear-dni en el servidor de Discord.`,
        });
      }
    } catch (err) {
      setSearchFeedback({
        success: false,
        message: 'Error de red al consultar el registro civil en Supabase.',
      });
    } finally {
      setIsSearchingDni(false);
    }
  };

  // Check if current discord user has a DNI registered
  useEffect(() => {
    // Purge any legacy mock or test DNIs from localStorage
    try {
      const raw = localStorage.getItem('perp_local_dnis_v2');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const cleaned = list.filter(
            (d) => d && d.dniNumber !== '28641982' && !d.fullName?.includes('ARRIOLA') && d.discordId !== '00000'
          );
          localStorage.setItem('perp_local_dnis_v2', JSON.stringify(cleaned));
        }
      }
    } catch {}

    if (!discordUser) {
      setExistingDni(null);
      setAvatarPreview('');
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

    getUserDni(discordUser.id, discordUser.username)
      .then((dni) => {
        if (dni) {
          setExistingDni(dni);
          setAvatarPreview(dni.photoUrl);
          // Auto-sync to server bot database so Discord bot always has it
          fetch('/api/bot/dni/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dni),
          }).catch(() => {});
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

  // Save custom or uploaded photo for existing DNI
  const handleSavePhotoDirectly = async (photoUrlToSave: string, robloxName?: string) => {
    if (!discordUser || !existingDni) return;
    const finalPhoto = photoUrlToSave.trim();
    if (!finalPhoto) return;

    setIsSyncingAvatar(true);
    setErrorMessage('');
    setSuccessMessage('');
    playClickSound();

    try {
      const userToUse = (robloxName || existingDni.robloxUsername).trim();
      await updateUserDniPhoto(discordUser.id, finalPhoto, userToUse);
      const updated: PeruDni = {
        ...existingDni,
        photoUrl: finalPhoto,
        robloxUsername: userToUse,
      };
      setExistingDni(updated);
      setAvatarPreview(finalPhoto);

      fetch('/api/bot/dni/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});

      setSuccessMessage('¡Foto del DNI actualizada con éxito y registrada en Supabase!');
      setShowAvatarSyncModal(false);
      setTempPreviewUrl('');
      setCustomPhotoUrlInput('');
      playSuccessSound();
    } catch {
      setErrorMessage('Error al actualizar la foto en la base de datos.');
    } finally {
      setIsSyncingAvatar(false);
    }
  };

  // Sync / update Roblox Avatar for already issued DNI
  const handleSyncExistingAvatar = async (targetUsername?: string) => {
    if (!discordUser || !existingDni) return;
    const userToFetch = (targetUsername || newRobloxInput || existingDni.robloxUsername).trim();
    if (!userToFetch) {
      setErrorMessage('Ingresa un usuario o ID de Roblox.');
      return;
    }

    setIsSyncingAvatar(true);
    setErrorMessage('');
    setSuccessMessage('');
    playClickSound();

    try {
      const res = await fetchRobloxAvatarUrl(userToFetch);
      if (res.avatarUrl) {
        await updateUserDniPhoto(discordUser.id, res.avatarUrl, userToFetch);
        const updated: PeruDni = {
          ...existingDni,
          photoUrl: res.avatarUrl,
          robloxUsername: userToFetch,
          robloxUserId: res.userId || existingDni.robloxUserId,
        };
        setExistingDni(updated);
        setAvatarPreview(res.avatarUrl);

        fetch('/api/bot/dni/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        }).catch(() => {});

        setSuccessMessage(`¡Foto de avatar de Roblox (@${userToFetch}) actualizada correctamente en tu DNI!`);
        setShowAvatarSyncModal(false);
        setNewRobloxInput('');
        setTempPreviewUrl('');
        playSuccessSound();
      } else {
        setErrorMessage(res.message || 'No se pudo obtener el avatar de Roblox. Revisa el usuario o escribe tu ID.');
      }
    } catch {
      setErrorMessage('Error al sincronizar avatar con Roblox.');
    } finally {
      setIsSyncingAvatar(false);
    }
  };

  // Submit and create unique Peruvian DNI in Supabase (All fields strictly required)
  const handleGenerateDni = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordUser) return;
    if (existingDni) {
      setErrorMessage('Ya posees un DNI emitido. No está permitido tramitar más de un DNI por ciudadano.');
      return;
    }

    if (!robloxUsername.trim()) {
      setErrorMessage('El usuario o ID de Roblox es obligatorio.');
      return;
    }
    if (!firstSurname.trim()) {
      setErrorMessage('El Primer Apellido es obligatorio.');
      return;
    }
    if (!secondSurname.trim()) {
      setErrorMessage('El Segundo Apellido es obligatorio.');
      return;
    }
    if (!givenNames.trim()) {
      setErrorMessage('Los Prenombres son obligatorios.');
      return;
    }
    if (!birthDay || !birthMonth || !birthYear) {
      setErrorMessage('La fecha de nacimiento completa (Día, Mes y Año) es obligatoria.');
      return;
    }
    if (!gender) {
      setErrorMessage('El Sexo (M / F) es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    playClickSound();

    const { dni: dniNum, digit } = generateRandomPeruDniNumber();
    const cleanFirstSurname = firstSurname.trim().toUpperCase();
    const cleanSecondSurname = secondSurname.trim().toUpperCase();
    const cleanGivenNames = givenNames.trim().toUpperCase();
    const birthDateStr = `${birthDay.padStart(2, '0')} ${birthMonth} ${birthYear}`;

    const now = new Date();
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SET', 'OCT', 'NOV', 'DIC'];
    const currentDay = now.getDate().toString().padStart(2, '0');
    const currentMonth = months[now.getMonth()];
    const currentYear = now.getFullYear();
    const issueDateStr = `${currentDay} ${currentMonth} ${currentYear}`;
    const expiryDateStr = `${currentDay} ${currentMonth} ${currentYear + 8}`;

    const photoToUse = avatarPreview || DEFAULT_ROBLOX_AVATAR;

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

  // Active DNI to render (strictly null if not yet created)
  const currentDni: PeruDni | null = existingDni;

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
          <div className="max-w-xl mx-auto rounded-3xl bg-[#0f1322] border border-sky-500/30 p-7 sm:p-9 text-center shadow-2xl relative overflow-hidden space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/40 text-sky-400 mx-auto flex items-center justify-center shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold text-white font-sans">
                Registro Nacional de Identidad PE:RP
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                Para consultar o emitir tu Documento Nacional de Identidad con tu personaje de Roblox, conéctate con Discord o consulta tu DNI si ya lo creaste en el servidor.
              </p>
            </div>

            {/* Option: Connect with Discord */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsDiscordAuthOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-sm tracking-wide shadow-xl shadow-indigo-950 transition-all cursor-pointer transform hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                <span>Conectar con Discord</span>
              </button>
            </div>
          </div>
        ) : loadingCheck ? (
          <div className="max-w-xl mx-auto rounded-3xl bg-[#0f1322] border border-sky-500/30 p-10 text-center shadow-2xl">
            <div className="w-12 h-12 border-3 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-1 font-sans">Consultando RENIEC PE:RP...</h3>
            <p className="text-xs text-slate-400">Verificando si posees un DNI oficial emitido en el sistema.</p>
          </div>
        ) : existingDni && currentDni ? (
          /* State 2: Real DNI exists -> Display real DNI card */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Interactive DNI Card Display */}
            <div className="lg:col-span-7 flex flex-col items-center">
              
              {/* Controls bar */}
              <div className="w-full max-w-[560px] flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-slate-300">
                    {existingDni ? 'DNI EMITIDO Y VÁLIDO' : 'VISTA PREVIA EN VIVO'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    const downloadUrl = `/api/dni/render?cui=${encodeURIComponent(currentDni.dniNumber)}&primer_apellido=${encodeURIComponent(currentDni.firstSurname)}&segundo_apellido=${encodeURIComponent(currentDni.secondSurname)}&nombres=${encodeURIComponent(currentDni.givenNames)}&nacimiento=${encodeURIComponent(currentDni.birthDate)}&genero=${encodeURIComponent(currentDni.gender === 'M' || currentDni.gender === 'Masculino' ? 'Masculino' : 'Femenino')}&estado_civil=${encodeURIComponent(formatCivilStatus(currentDni.civilStatus))}&donacion_organos=${encodeURIComponent(currentDni.organDonation || 'NO')}&serial=${encodeURIComponent(formatSerialCode(currentDni.serialCode, currentDni.dniNumber))}&usuario=${encodeURIComponent(currentDni.robloxUsername)}&foto=${encodeURIComponent(currentDni.photoUrl)}`;
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = `DNI-PERP-${currentDni.dniNumber}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    playSuccessSound();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar DNI (PNG)</span>
                </button>
              </div>

              {/* PERUVIAN DNI CARD CONTAINER (Official Template Aesthetic - 1119x669) */}
              <div
                ref={cardRef}
                className="relative w-full max-w-[580px] aspect-[1119/669] rounded-2xl shadow-2xl overflow-hidden border border-sky-400/30 select-none shadow-sky-950/60 bg-[#e7edf5]"
              >
                {/* Official Card Template Background with Guaranteed Base64 Fallback */}
                <img
                  src={templateSrc || '/assets/dni-template-official.png'}
                  alt="Plantilla Oficial DNI PE:RP"
                  className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    const step = parseInt(target.dataset.retry || '0', 10);
                    target.dataset.retry = String(step + 1);
                    if (step === 0) {
                      target.src = '/assets/dni-template-official.png';
                    } else if (step === 1) {
                      target.src = './assets/dni-template-official.png';
                    } else if (step === 2) {
                      target.src = '/dni-template-official.png';
                    } else {
                      target.src = OFFICIAL_DNI_TEMPLATE_BASE64;
                    }
                  }}
                />

                {/* Suspension overlay watermark if active */}
                {currentDni.status === 'suspended' && (
                  <div className="absolute inset-0 z-40 bg-red-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center border-4 border-red-600 rounded-2xl animate-in fade-in duration-200">
                    <div className="px-4 py-2 rounded-xl bg-red-600 text-white font-black text-xs sm:text-sm uppercase tracking-widest shadow-2xl rotate-[-8deg] border-2 border-white flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span>🚫 DNI SUSPENDIDO (POLICÍA / RENIEC)</span>
                    </div>
                    <p className="text-white text-[11px] font-bold mt-3 bg-black/70 px-4 py-1.5 rounded-xl border border-red-500/50 max-w-sm">
                      {currentDni.suspensionReason || 'Documento suspendido por orden administrativa o judicial en PE:RP.'}
                    </p>
                  </div>
                )}

                {/* Right Side Avatar Bust (Roblox) - Scaled to upper right so it never covers labels or blood group */}
                <div
                  className="absolute pointer-events-none overflow-hidden flex items-end justify-center"
                  style={{
                    right: '1.5%',
                    top: '16.0%',
                    width: '28.0%',
                    height: '46.0%',
                  }}
                >
                  <img
                    src={currentDni.photoUrl || DEFAULT_ROBLOX_AVATAR}
                    alt="Avatar Roblox DNI"
                    className="w-full h-full object-contain object-bottom"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_ROBLOX_AVATAR;
                    }}
                  />
                </div>

                {/* Field 1: CUI / DNI NUMBER */}
                <div
                  className="absolute font-sans font-bold text-slate-950 tracking-normal"
                  style={{
                    left: '13.1%',
                    top: '21.4%',
                    fontSize: 'clamp(10px, 2.0vw, 15px)',
                  }}
                >
                  {currentDni.dniNumber}
                </div>

                {/* Field 2: PRIMER APELLIDO */}
                <div
                  className="absolute font-sans font-bold text-slate-950 uppercase tracking-normal truncate"
                  style={{
                    left: '31.1%',
                    top: '25.6%',
                    maxWidth: '36%',
                    fontSize: 'clamp(10px, 2.1vw, 16px)',
                  }}
                >
                  {currentDni.firstSurname || 'ARRIOLA'}
                </div>

                {/* Field 3: SEGUNDO APELLIDO */}
                <div
                  className="absolute font-sans font-bold text-slate-950 uppercase tracking-normal truncate"
                  style={{
                    left: '31.1%',
                    top: '37.2%',
                    maxWidth: '36%',
                    fontSize: 'clamp(10px, 2.1vw, 16px)',
                  }}
                >
                  {currentDni.secondSurname || 'LÓPEZ'}
                </div>

                {/* Field 4: PRONOMBRE / NOMBRES */}
                <div
                  className="absolute font-sans font-bold text-slate-950 uppercase tracking-normal truncate"
                  style={{
                    left: '31.1%',
                    top: '47.5%',
                    maxWidth: '36%',
                    fontSize: 'clamp(10px, 2.1vw, 16px)',
                  }}
                >
                  {currentDni.givenNames || 'AUGUSTO FERNANDO'}
                </div>

                {/* Field 5: SEXO */}
                <div
                  className="absolute font-sans font-bold text-slate-950 tracking-normal"
                  style={{
                    left: '30.8%',
                    top: '56.3%',
                    fontSize: 'clamp(9px, 1.8vw, 14px)',
                  }}
                >
                  {currentDni.gender === 'F' || currentDni.gender === 'Femenino' ? 'Femenino' : 'Masculino'}
                </div>

                {/* Field 6: ESTADO CIVIL */}
                <div
                  className="absolute font-sans font-bold text-slate-950 uppercase tracking-normal"
                  style={{
                    left: '50.7%',
                    top: '58.0%',
                    fontSize: 'clamp(9px, 1.8vw, 14px)',
                  }}
                >
                  {formatCivilStatus(currentDni.civilStatus)}
                </div>

                {/* Field 7: FECHA DE NACIMIENTO */}
                <div
                  className="absolute font-sans font-bold text-slate-950 tracking-normal"
                  style={{
                    left: '30.8%',
                    top: '65.3%',
                    fontSize: 'clamp(9px, 1.8vw, 14px)',
                  }}
                >
                  {currentDni.birthDate}
                </div>

                {/* Field 8: SERIAL NUMBER (beside Peru map - min 4 zeros, compact to never overlap) */}
                <div
                  className="absolute font-sans font-bold text-slate-950 tracking-normal select-none pointer-events-none truncate"
                  style={{
                    left: '13.0%',
                    top: '67.5%',
                    maxWidth: '16%',
                    fontSize: 'clamp(8px, 1.4vw, 12px)',
                  }}
                >
                  {formatSerialCode(currentDni.serialCode, currentDni.dniNumber)}
                </div>

                {/* Field 9: FECHA DE EMISIÓN */}
                <div
                  className="absolute font-sans font-bold text-slate-950 tracking-normal"
                  style={{
                    left: '30.8%',
                    top: '73.8%',
                    fontSize: 'clamp(9px, 1.8vw, 14px)',
                  }}
                >
                  {currentDni.issueDate || '26/10/2026'}
                </div>

                {/* Field 10: FECHA DE CADUCIDAD */}
                <div
                  className="absolute font-sans font-bold text-slate-950 tracking-normal"
                  style={{
                    left: '50.9%',
                    top: '74.1%',
                    fontSize: 'clamp(9px, 1.8vw, 14px)',
                  }}
                >
                  {currentDni.expiryDate || '26/10/2034'}
                </div>

                {/* Field 11: GRUPO DE VOTACIÓN */}
                <div
                  className="absolute font-sans font-bold text-slate-950 tracking-normal"
                  style={{
                    left: '31.3%',
                    top: '82.6%',
                    fontSize: 'clamp(9px, 1.8vw, 14px)',
                  }}
                >
                  {currentDni.votingGroup || (currentDni.dniNumber || '').slice(0, 6) || '041186'}
                </div>

                {/* Field 12: DONACIÓN DE ÓRGANOS */}
                <div
                  className="absolute font-sans font-bold text-slate-950 tracking-normal"
                  style={{
                    left: '52.5%',
                    top: '83.1%',
                    fontSize: 'clamp(9px, 1.8vw, 14px)',
                  }}
                >
                  {currentDni.organDonation || 'NO'}
                </div>

                {/* Field 13: HUELLA DATE OVERLAY */}
                <div
                  className="absolute font-sans font-black text-blue-900 tracking-wider pointer-events-none"
                  style={{
                    left: '7.8%',
                    top: '82.8%',
                    fontSize: 'clamp(11px, 2.3vw, 17px)',
                  }}
                >
                  {(currentDni.birthDate || '').replace(/[\/\-]/g, ' ')}
                </div>
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
              
              {/* Confirmed Citizen Status & Avatar Sync */}
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
                      <span className="text-slate-400">Estado del DNI:</span>
                      <span className={`font-bold ${existingDni.status === 'suspended' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {existingDni.status === 'suspended' ? '🚫 Suspendido' : '✅ Vigente Oficial'}
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-white/5">
                      <span className="text-slate-400">Cuenta Bancaria:</span>
                      <span className={`font-bold ${existingDni.bankStatus === 'frozen' ? 'text-sky-300' : 'text-emerald-400'}`}>
                        {existingDni.bankStatus === 'frozen' ? '❄️ Congelada (Embargo)' : '💳 Activa (S/.)'}
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-white/5">
                      <span className="text-slate-400">Requisitoria PNP:</span>
                      <span className={`font-bold ${existingDni.wantedStatus ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>
                        {existingDni.wantedStatus ? '🚨 ORDEN DE CAPTURA VIGENTE' : 'Sin antecedentes'}
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-white/5">
                      <span className="text-slate-400">Base de Datos:</span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                        <Database className="w-3.5 h-3.5" /> Supabase Activo
                      </span>
                    </div>
                  </div>

                  {/* Feedback banners */}
                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  {/* Action: Sync / Update Avatar on DNI */}
                  <div className="p-4 rounded-2xl bg-[#090d18] border border-sky-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Foto del DNI</div>
                          <div className="text-[10px] text-slate-400">Roblox: @{existingDni.robloxUsername}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setShowAvatarSyncModal(!showAvatarSyncModal);
                          setNewRobloxInput(existingDni.robloxUsername);
                          setTempPreviewUrl(existingDni.photoUrl);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-md"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-sky-200" />
                        <span>{showAvatarSyncModal ? 'Ocultar Opciones' : 'Actualizar Foto'}</span>
                      </button>
                    </div>

                    {showAvatarSyncModal && (
                      <div className="pt-3 border-t border-white/10 space-y-3 animate-in fade-in duration-200">
                        {/* Tabs */}
                        <div className="grid grid-cols-3 gap-1.5 bg-[#05070f] p-1 rounded-xl border border-white/10 text-[11px] font-bold">
                          <button
                            type="button"
                            onClick={() => setPhotoUpdateTab('roblox')}
                            className={`py-1 rounded-lg transition-colors cursor-pointer ${
                              photoUpdateTab === 'roblox'
                                ? 'bg-sky-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Roblox
                          </button>
                          <button
                            type="button"
                            onClick={() => setPhotoUpdateTab('upload')}
                            className={`py-1 rounded-lg transition-colors cursor-pointer ${
                              photoUpdateTab === 'upload'
                                ? 'bg-sky-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Subir Archivo
                          </button>
                          <button
                            type="button"
                            onClick={() => setPhotoUpdateTab('url')}
                            className={`py-1 rounded-lg transition-colors cursor-pointer ${
                              photoUpdateTab === 'url'
                                ? 'bg-sky-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Enlace URL
                          </button>
                        </div>

                        {/* Tab Content: Roblox */}
                        {photoUpdateTab === 'roblox' && (
                          <div className="space-y-2">
                            <label className="text-[11px] text-slate-300 font-semibold block">
                              Usuario o ID numérico de Roblox:
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newRobloxInput}
                                onChange={(e) => setNewRobloxInput(e.target.value)}
                                placeholder="ej. MrAlex_Peru o 3051711533"
                                className="flex-1 px-3 py-1.5 rounded-xl bg-[#060812] border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-sky-400"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!newRobloxInput.trim()) return;
                                  setIsSearchingAvatar(true);
                                  setErrorMessage('');
                                  try {
                                    const res = await fetchRobloxAvatarUrl(newRobloxInput.trim());
                                    if (res.avatarUrl) {
                                      setTempPreviewUrl(res.avatarUrl);
                                      playSuccessSound();
                                    } else {
                                      setErrorMessage(res.message || 'No se pudo encontrar el avatar.');
                                    }
                                  } catch {
                                    setErrorMessage('Error al consultar Roblox.');
                                  } finally {
                                    setIsSearchingAvatar(false);
                                  }
                                }}
                                disabled={isSearchingAvatar || !newRobloxInput.trim()}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-sky-500/30 disabled:opacity-50"
                              >
                                {isSearchingAvatar ? (
                                  <div className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Search className="w-3.5 h-3.5" />
                                )}
                                <span>Buscar</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Tab Content: Upload File */}
                        {photoUpdateTab === 'upload' && (
                          <div className="space-y-2">
                            <label className="text-[11px] text-slate-300 font-semibold block">
                              Selecciona una imagen desde tu PC o celular:
                            </label>
                            <input
                              type="file"
                              ref={modalFileInputRef}
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    if (typeof reader.result === 'string') {
                                      setTempPreviewUrl(reader.result);
                                      playSuccessSound();
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => modalFileInputRef.current?.click()}
                              className="w-full py-2.5 px-3 rounded-xl bg-[#060812] hover:bg-white/5 border border-dashed border-sky-500/40 text-xs text-sky-300 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                            >
                              <Upload className="w-4 h-4 text-sky-400" />
                              <span>Elegir archivo de imagen (PNG / JPG)</span>
                            </button>
                          </div>
                        )}

                        {/* Tab Content: URL */}
                        {photoUpdateTab === 'url' && (
                          <div className="space-y-2">
                            <label className="text-[11px] text-slate-300 font-semibold block">
                              Pega el enlace directo de tu imagen:
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="url"
                                value={customPhotoUrlInput}
                                onChange={(e) => {
                                  setCustomPhotoUrlInput(e.target.value);
                                  setTempPreviewUrl(e.target.value);
                                }}
                                placeholder="https://ejemplo.com/mi-avatar.png"
                                className="flex-1 px-3 py-1.5 rounded-xl bg-[#060812] border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-sky-400"
                              />
                            </div>
                          </div>
                        )}

                        {/* Live Preview & Apply Button */}
                        {tempPreviewUrl && (
                          <div className="p-2.5 rounded-xl bg-[#05070e] border border-white/10 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={tempPreviewUrl}
                                alt="Vista previa avatar"
                                className="w-10 h-12 object-cover rounded-lg border border-sky-400/50 bg-slate-900"
                              />
                              <div className="text-[10px] text-slate-300">
                                <span className="font-bold text-white block">Vista Previa Lista</span>
                                <span>Lista para guardar en tu DNI</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSavePhotoDirectly(tempPreviewUrl, newRobloxInput || existingDni.robloxUsername)}
                              disabled={isSyncingAvatar}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isSyncingAvatar ? 'Guardando...' : 'Guardar Foto'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {existingDni.status === 'suspended' && (
                    <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs">
                      <strong>⚠️ DNI Suspendido:</strong> {existingDni.suspensionReason || 'Tu documento ha sido suspendido temporalmente por orden de la autoridad policial o judicial de PE:RP.'}
                    </div>
                  )}

                  {existingDni.bankStatus === 'frozen' && (
                    <div className="p-3.5 rounded-2xl bg-sky-950/60 border border-sky-500/50 text-sky-200 text-xs">
                      <strong>❄️ Cuenta Bancaria Congelada:</strong> {existingDni.bankFreezeReason || 'Tus fondos bancarios se encuentran congelados por orden judicial o administrativa.'}
                    </div>
                  )}

                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 text-[11px] text-slate-400 flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Registro Oficial de Identidad:</strong> La emisión de tu DNI es única y personal. Si requieres actualizar o reiniciar tus datos ciudadanos, consulta con el equipo de soporte oficial de PE:RP.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* State: DNI not yet created. Exclusively issued via Discord Bot /crear-dni */
            <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-[#090c18] border border-sky-500/30 text-center space-y-5 animate-in fade-in shadow-2xl">
                  <div className="w-16 h-16 rounded-3xl bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#5865F2] flex items-center justify-center mx-auto shadow-lg shadow-indigo-950/50">
                    <Bot className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400 bg-sky-950/80 px-3 py-1 rounded-full border border-sky-500/30">
                      TRÁMITE EXCLUSIVO EN DISCORD
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white uppercase font-sans">
                      Emisión de DNI en Discord
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                      Hola, <strong className="text-white">{discordUser.displayName || discordUser.username}</strong>. Para verificar tu identidad y avatar de Roblox, la emisión del DNI oficial se realiza <strong>únicamente</strong> mediante nuestro bot en Discord.
                    </p>
                  </div>

                  {/* Command box */}
                  <div className="p-4 rounded-2xl bg-black/60 border border-white/10 max-w-md mx-auto text-left space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300">Comando para emitir tu DNI:</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText('/crear-dni');
                          playSuccessSound();
                          alert('¡Comando /crear-dni copiado!');
                        }}
                        className="text-[10px] text-sky-400 hover:text-white flex items-center gap-1 cursor-pointer underline"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copiar comando</span>
                      </button>
                    </div>

                    <div className="px-3.5 py-2.5 rounded-xl bg-[#141726] border border-sky-500/30 text-sky-300 font-mono text-sm font-bold flex items-center justify-between">
                      <span>/crear-dni</span>
                      <span className="text-[10px] text-emerald-400 font-sans">1 DNI por ciudadano</span>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-normal">
                      Ejecuta <code className="text-sky-300 font-mono">/crear-dni</code> en cualquier canal de comandos de nuestro Discord. El bot registrará tus nombres y tu avatar de Roblox, y te otorgará tu cuenta del Banco YA P.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                      href={config.discordInviteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-950 transition-all cursor-pointer"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                      </svg>
                      <span>Abrir Discord Oficial</span>
                    </a>

                    <button
                      type="button"
                      disabled={isSearchingDni}
                      onClick={() => {
                        setIsSearchingDni(true);
                        getUserDni(discordUser.id, discordUser.username)
                          .then((dni) => {
                            if (dni) {
                              setExistingDni(dni);
                              if (dni.photoUrl) setAvatarPreview(dni.photoUrl);
                              playSuccessSound();
                            } else {
                              alert(`Aún no se ha detectado DNI para tu cuenta (${discordUser.username}). Si en Roblox usaste otro usuario, puedes escribirlo abajo para localizarlo al instante.`);
                            }
                          })
                          .catch(() => alert('Error de conexión con Supabase.'))
                          .finally(() => setIsSearchingDni(false));
                      }}
                      className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isSearchingDni ? 'animate-spin' : ''}`} />
                      <span>{isSearchingDni ? 'Verificando...' : 'Ya lo creé, verificar ahora'}</span>
                    </button>
                  </div>
                </div>
          )}

      </div>
    </section>
  );
};
