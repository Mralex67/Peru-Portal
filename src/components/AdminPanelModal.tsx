import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  RotateCcw,
  ShieldCheck,
  Users,
  Radio,
  MessageSquare,
  Key,
  Check,
  Copy,
  ExternalLink,
  Lock,
  Unlock,
  Upload,
  Image as ImageIcon,
  Trash2,
  Camera,
  Car,
  Sparkles,
  Link as LinkIcon,
  AlertCircle,
  Database,
  FileCode,
  Search,
  Ban,
  Snowflake,
  AlertTriangle,
  Zap,
  Coins,
  Bot
} from 'lucide-react';
import { useServer } from '../context/ServerContext';
import { playClickSound, playSuccessSound } from '../utils/audio';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  SUPABASE_SQL_INIT,
  getAllRegisteredDnis,
  resetAllDnis,
  updateDniAdministrativeStatus,
  deleteDniByAdmin
} from '../lib/supabase';
import { PeruDni } from '../types/dni';
import { YapoLogo } from './YapoLogo';
import { YapoAccount, YapoTransaction, YapoBankConfig } from '../types/yapo';
import {
  getLocalYapoAccounts,
  getLocalYapoTransactions,
  getYapoConfig,
  saveYapoConfig,
  adminUpdateBalances,
  adminToggleFreezeAccount,
  resetYapoAccount,
  resetAllYapo,
  YAPO_SUPABASE_SQL,
} from '../lib/yapoStorage';

interface AlbumItem {
  id: string;
  src: string;
  date: string;
}

export const AdminPanelModal: React.FC = () => {
  const { config, updateConfig, resetConfig, isAdminOpen, setIsAdminOpen, lockAdmin } = useServer();

  const [formData, setFormData] = useState({ ...config });
  const [activeTab, setActiveTab] = useState<'general' | 'erlc' | 'multimedia' | 'discord' | 'supabase' | 'bank'>('general');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  // Supabase state
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [supabaseSaved, setSupabaseSaved] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [registeredDnis, setRegisteredDnis] = useState<PeruDni[]>([]);

  // Roblox Citizen Administration (Suspension, Bank Freeze, Reset)
  const [dniSearchQuery, setDniSearchQuery] = useState('');
  const [selectedCitizen, setSelectedCitizen] = useState<PeruDni | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [adminFeedback, setAdminFeedback] = useState('');

  // Yapo & Bank states
  const [yapoAccounts, setYapoAccounts] = useState<YapoAccount[]>([]);
  const [yapoTransactions, setYapoTransactions] = useState<YapoTransaction[]>([]);
  const [yapoBankConfig, setYapoBankConfig] = useState<YapoBankConfig>(getYapoConfig());
  const [yapoSearchQuery, setYapoSearchQuery] = useState('');
  const [selectedYapoAccount, setSelectedYapoAccount] = useState<YapoAccount | null>(null);
  const [editBankAmount, setEditBankAmount] = useState('');
  const [editCashAmount, setEditCashAmount] = useState('');
  const [yapoFeedback, setYapoFeedback] = useState('');
  const [copiedYapoSql, setCopiedYapoSql] = useState(false);
  const [yapoConfigSaved, setYapoConfigSaved] = useState(false);

  // File upload refs
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const truckInputRef = useRef<HTMLInputElement | null>(null);
  const albumAdminInputRef = useRef<HTMLInputElement | null>(null);

  // Image loading indicators
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingTruck, setIsUploadingTruck] = useState(false);
  const [isUploadingAlbum, setIsUploadingAlbum] = useState(false);

  // Direct URL inputs
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [truckUrlInput, setTruckUrlInput] = useState('');

  // Album photos state
  const [albumPhotos, setAlbumPhotos] = useState<AlbumItem[]>([]);

  // ER:LC API integration state
  const [erlcKeyInput, setErlcKeyInput] = useState('');
  const [isErlcConfigured, setIsErlcConfigured] = useState(false);
  const [isTestingErlc, setIsTestingErlc] = useState(false);
  const [erlcFeedback, setErlcFeedback] = useState<{
    success: boolean;
    message: string;
    serverInfo?: any;
  } | null>(null);

  // Discord OAuth backend config state
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState(
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/auth/callback/discord`
      : 'https://ais-dev-iydhue5qk4b7wusoszmqp2-732238089491.us-east1.run.app/api/auth/callback/discord'
  );
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    if (!isAdminOpen) return;
    setFormData({ ...config });

    // Determine redirect URI: for static hosts, use site root URL
    const isStatic = typeof window !== 'undefined' && (window.location.hostname.includes('github.io') || (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('run.app')));
    if (isStatic) {
      setRedirectUri(window.location.origin + window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') + '/');
    }

    const savedClientId = localStorage.getItem('perp_discord_client_id');
    if (savedClientId) {
      setClientId(savedClientId);
      setIsConfigured(true);
    }

    const savedErlcKey = localStorage.getItem('perp_erlc_key');
    if (savedErlcKey) {
      setErlcKeyInput(savedErlcKey);
      setIsErlcConfigured(true);
    }

    // Load album photos
    try {
      const saved = localStorage.getItem('perp_album_photos_v2');
      if (saved) setAlbumPhotos(JSON.parse(saved));
      else setAlbumPhotos([]);
    } catch {
      setAlbumPhotos([]);
    }

    // Load Discord OAuth config safely
    fetch('/api/auth/discord/config')
      .then(async (res) => {
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.includes('application/json')) return res.json();
        return null;
      })
      .then((data) => {
        if (data) {
          setIsConfigured(Boolean(data.configured || savedClientId));
          if (data.redirectUri && !isStatic) setRedirectUri(data.redirectUri);
          if (data.clientId) setClientId(data.clientId);
        }
      })
      .catch(() => {});

    // Load Supabase configuration & registered DNIs
    const sConf = getSupabaseConfig();
    setSupabaseUrl(sConf.url);
    setSupabaseKey(sConf.anonKey);
    getAllRegisteredDnis().then(setRegisteredDnis).catch(() => {});

    // Load Yapo banking accounts, transactions and config
    setYapoAccounts(getLocalYapoAccounts());
    setYapoTransactions(getLocalYapoTransactions());
    setYapoBankConfig(getYapoConfig());

    // Check ER:LC API status
    fetch('/api/erlc/server')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.configured) {
          setIsErlcConfigured(true);
          if (data.name) {
            setErlcFeedback({
              success: true,
              message: `Conectado a "${data.name}" (${data.currentPlayers}/${data.maxPlayers} jugadores en vivo)`,
              serverInfo: data,
            });
          }
        }
      })
      .catch(() => {});
  }, [isAdminOpen, config]);

  if (!isAdminOpen) return null;

  // Upload helper using server API
  const uploadToServer = async (dataUrl: string): Promise<string> => {
    try {
      const res = await fetch('/api/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl }),
      });
      const data = await res.json();
      if (data && data.url) return data.url;
    } catch (err) {
      console.warn('Fallback to direct data URL for image upload:', err);
    }
    return dataUrl;
  };

  // 1. Upload Logo from local file
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    playClickSound();

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const finalUrl = await uploadToServer(dataUrl);
      setFormData((prev) => ({ ...prev, customLogoUrl: finalUrl }));
      setIsUploadingLogo(false);
      playSuccessSound();
    };
    reader.readAsDataURL(file);
  };

  // 2. Upload Truck from local file
  const handleTruckFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingTruck(true);
    playClickSound();

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const finalUrl = await uploadToServer(dataUrl);
      setFormData((prev) => ({ ...prev, customPatrolTruckUrl: finalUrl }));
      setIsUploadingTruck(false);
      playSuccessSound();
    };
    reader.readAsDataURL(file);
  };

  // 3. Admin adds photo directly to Album
  const handleAdminAlbumFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingAlbum(true);
    playClickSound();

    const newItems: AlbumItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const finalUrl = await uploadToServer(dataUrl);
      newItems.push({
        id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        src: finalUrl,
        date: new Date().toLocaleDateString('es-PE'),
      });
    }

    if (newItems.length > 0) {
      const updated = [...newItems, ...albumPhotos];
      setAlbumPhotos(updated);
      localStorage.setItem('perp_album_photos_v2', JSON.stringify(updated));
      window.dispatchEvent(new Event('perp_album_updated'));
      playSuccessSound();
    }
    setIsUploadingAlbum(false);
  };

  // Delete photo from album directly in admin panel
  const handleDeleteAlbumPhoto = (id: string) => {
    playClickSound();
    const updated = albumPhotos.filter((p) => p.id !== id);
    setAlbumPhotos(updated);
    localStorage.setItem('perp_album_photos_v2', JSON.stringify(updated));
    window.dispatchEvent(new Event('perp_album_updated'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig(formData);

    // Save Discord credentials
    if (clientId.trim()) {
      try {
        localStorage.setItem('perp_discord_client_id', clientId.trim());
        setIsConfigured(true);
      } catch {}

      try {
        await fetch('/api/auth/discord/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: clientId.trim(), clientSecret }),
        });
      } catch {
        // ignore if on static host
      }
    }

    setSaveSuccess(true);
    playSuccessSound();
    setTimeout(() => {
      setSaveSuccess(false);
      setIsAdminOpen(false);
    }, 1200);
  };

  const handleSaveErlc = async () => {
    const cleanKey = erlcKeyInput.trim();
    if (!cleanKey) {
      setErlcFeedback({
        success: false,
        message: 'Por favor ingresa una Server-Key de ER:LC válida.',
      });
      return;
    }

    setIsTestingErlc(true);
    playClickSound();

    // Persist key locally
    try {
      localStorage.setItem('perp_erlc_key', cleanKey);
      setIsErlcConfigured(true);
    } catch {}

    const isStatic =
      typeof window !== 'undefined' &&
      (window.location.hostname.includes('github.io') ||
        (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('run.app')));

    if (isStatic) {
      setIsErlcConfigured(true);
      setErlcFeedback({
        success: true,
        message:
          '🔑 Server-Key guardada correctamente. Nota: En GitHub Pages (hosting estático sin backend Node.js), la API de ER:LC no permite conexiones directas por CORS. Puedes configurar y mantener los jugadores (ej: 41/50) directamente en la pestaña "Información & Textos" para que todos tus visitantes lo vean actualizado en vivo.',
      });
      playSuccessSound();
      setIsTestingErlc(false);
      return;
    }

    try {
      const res = await fetch('/api/erlc/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverKey: cleanKey }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        throw new Error('Respuesta estática sin backend');
      }

      const data = await res.json();

      if (data.success && data.valid && data.server) {
        setIsErlcConfigured(true);
        setErlcFeedback({
          success: true,
          message: `¡Conexión Exitosa con ER:LC! Servidor: "${data.server.name}" con ${data.server.currentPlayers}/${data.server.maxPlayers} jugadores en vivo.`,
          serverInfo: data.server,
        });

        // Update form and server context immediately
        setFormData((prev) => ({
          ...prev,
          currentPlayers: data.server.currentPlayers,
          maxPlayers: data.server.maxPlayers || prev.maxPlayers,
          ...(data.server.joinKey ? { erlcJoinKey: data.server.joinKey } : {}),
        }));

        updateConfig({
          currentPlayers: data.server.currentPlayers,
          maxPlayers: data.server.maxPlayers || config.maxPlayers,
          ...(data.server.joinKey ? { erlcJoinKey: data.server.joinKey } : {}),
        });

        playSuccessSound();
      } else if (data.success && data.configured) {
        setIsErlcConfigured(true);
        setErlcFeedback({
          success: false,
          message:
            data.message ||
            'Clave guardada, pero la API de ER:LC devolvió error 401/403. Verifica que la key pertenezca a tu servidor.',
        });
      } else {
        setIsErlcConfigured(false);
        setErlcFeedback({
          success: false,
          message: data.message || 'No se pudo validar la clave de ER:LC.',
        });
      }
    } catch (err: any) {
      setIsErlcConfigured(true);
      setErlcFeedback({
        success: true,
        message:
          '🔑 Server-Key guardada localmente. En hosting estático (GitHub Pages), los jugadores se configuran y actualizan directamente desde la pestaña "Información & Textos".',
      });
      playSuccessSound();
    } finally {
      setIsTestingErlc(false);
    }
  };

  const handleCopyRedirect = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedRedirect(true);
    playSuccessSound();
    setTimeout(() => setCopiedRedirect(false), 2500);
  };

  const handleReset = () => {
    if (window.confirm('¿Seguro que deseas restaurar los valores por defecto del servidor?')) {
      resetConfig();
      setFormData({ ...config });
      playSuccessSound();
    }
  };

  const handleLock = () => {
    lockAdmin();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#0c0e18] border border-red-500/30 rounded-3xl p-5 sm:p-8 shadow-2xl shadow-red-950/60 my-6 max-h-[92vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={() => setIsAdminOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10 pr-10 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 bg-red-950 px-2 py-0.5 rounded border border-red-500/30">
                  STAFF AUTORIZADO
                </span>
                <span className="text-xs text-slate-400 font-mono">Panel Central</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white uppercase font-sans mt-0.5">
                Panel de Administración PE:RP
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLock}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-950/40 border border-white/10 hover:border-rose-500/40 text-xs font-semibold text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
            title="Bloquear y salir del modo administrador"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bloquear</span>
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-white/10 mb-5 gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'general' ? 'border-red-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Información & Textos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('erlc')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'erlc' ? 'border-amber-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            API ER:LC (Aforo en Vivo)
            {isErlcConfigured && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('multimedia')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'multimedia' ? 'border-red-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-red-400" />
            Fotos: Logo, Camioneta & Álbum
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('discord')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'discord' ? 'border-[#5865F2] text-white' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-[#5865F2]" />
            Credenciales Discord
            {isConfigured && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'supabase' ? 'border-sky-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-sky-400" />
            Supabase & DNIs
            {registeredDnis.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-500/40 text-[10px] font-mono">
                {registeredDnis.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'bank' ? 'border-purple-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <YapoLogo size="sm" withContainer={false} className="w-3.5 h-3.5" />
            Banco & Yapo
            {yapoAccounts.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 text-[10px] font-mono">
                {yapoAccounts.length}
              </span>
            )}
          </button>
        </div>

        {/* Admin Form */}
        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto flex-1 pr-1">
          
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <>
              {/* Section 1: Estadísticas y Capacidad */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  1. Estadísticas en Vivo y Jugadores
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                      Jugadores En Línea
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={formData.maxPlayers}
                      value={formData.currentPlayers}
                      onChange={(e) => setFormData({ ...formData, currentPlayers: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-[#141726] border border-white/10 text-white font-mono font-bold text-sm focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                      Capacidad Máxima
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formData.maxPlayers}
                      onChange={(e) => setFormData({ ...formData, maxPlayers: parseInt(e.target.value) || 50 })}
                      className="w-full px-3 py-2 rounded-xl bg-[#141726] border border-white/10 text-white font-mono font-bold text-sm focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                      Miembros de Discord
                    </label>
                    <input
                      type="text"
                      value={formData.discordMembers}
                      onChange={(e) => setFormData({ ...formData, discordMembers: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#141726] border border-white/10 text-white font-mono font-bold text-sm focus:outline-none focus:border-red-500"
                      placeholder="ej. 18.450"
                    />
                  </div>
                </div>

                <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200/95 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>¿Quieres que los jugadores (ej. 41/50) se actualicen solos? Conecta tu <strong>Server-Key de ER:LC</strong>.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('erlc')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] shrink-0 border border-amber-500/40 transition-colors cursor-pointer"
                  >
                    Vincular API ER:LC →
                  </button>
                </div>
              </div>

              {/* Section 2: Estado Operativo del Servidor */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-3 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" />
                  2. Estado Operativo del Servidor & Alerta PNP
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                      Estado Operativo
                    </label>
                    <select
                      value={formData.serverStatus}
                      onChange={(e) => setFormData({ ...formData, serverStatus: e.target.value as 'online' | 'maintenance' | 'event' })}
                      className="w-full px-3 py-2 rounded-xl bg-[#141726] border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-red-500 cursor-pointer"
                    >
                      <option value="online">● Servidor En Vivo (Online)</option>
                      <option value="event">⚡ Evento Especial Activo</option>
                      <option value="maintenance">🛠 En Mantenimiento</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                      Alerta Policial PNP
                    </label>
                    <input
                      type="text"
                      value={formData.patrolAlert}
                      onChange={(e) => setFormData({ ...formData, patrolAlert: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#141726] border border-white/10 text-white text-xs focus:outline-none focus:border-red-500"
                      placeholder="Patrullaje Preventivo"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Textos Principales de la Web */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-3 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  3. Textos y Mensajes de la Web
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                      Nombre del Servidor
                    </label>
                    <input
                      type="text"
                      value={formData.serverName}
                      onChange={(e) => setFormData({ ...formData, serverName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#141726] border border-white/10 text-white text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                      Nombre de la Temporada
                    </label>
                    <input
                      type="text"
                      value={formData.seasonName}
                      onChange={(e) => setFormData({ ...formData, seasonName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#141726] border border-white/10 text-white text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                      Anuncio Global (Marquee Superior)
                    </label>
                    <input
                      type="text"
                      value={formData.announcementText}
                      onChange={(e) => setFormData({ ...formData, announcementText: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#141726] border border-white/10 text-white text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                      Enlace de Invitación de Discord
                    </label>
                    <input
                      type="url"
                      value={formData.discordInviteUrl}
                      onChange={(e) => setFormData({ ...formData, discordInviteUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#141726] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB: API ER:LC (ROBLOX EMERGENCY RESPONSE) */}
          {activeTab === 'erlc' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-[#141726] border border-amber-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Sincronización Automática con ER:LC (Roblox)
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Conecta la API de tu servidor para que la web actualice en tiempo real cuántos jugadores hay en la calle (ej. 41/50 slots) sin cambiarlo a mano.
                    </p>
                  </div>
                  <div className="shrink-0">
                    {isErlcConfigured ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        API ACTIVA
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold">
                        PENDIENTE DE VINCULAR
                      </span>
                    )}
                  </div>
                </div>

                {/* Feedback message */}
                {erlcFeedback && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                      erlcFeedback.success
                        ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    {erlcFeedback.success ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">{erlcFeedback.message}</p>
                      {erlcFeedback.serverInfo && (
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-300">
                          <div className="bg-black/40 p-2 rounded-lg">
                            <span className="text-slate-400 block">Servidor:</span>
                            <strong className="text-white">{erlcFeedback.serverInfo.name}</strong>
                          </div>
                          <div className="bg-black/40 p-2 rounded-lg">
                            <span className="text-slate-400 block">Jugadores:</span>
                            <strong className="text-emerald-400 font-bold">
                              {erlcFeedback.serverInfo.currentPlayers} / {erlcFeedback.serverInfo.maxPlayers}
                            </strong>
                          </div>
                          <div className="bg-black/40 p-2 rounded-lg">
                            <span className="text-slate-400 block">Join Key:</span>
                            <strong className="text-white">{erlcFeedback.serverInfo.joinKey || 'N/A'}</strong>
                          </div>
                          <div className="bg-black/40 p-2 rounded-lg">
                            <span className="text-slate-400 block">Estado:</span>
                            <strong className="text-emerald-400">100% Online</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Key Input */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Server-Key de Emergency Response: Liberty County</span>
                    <a
                      href="https://policeroleplay.community"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:text-amber-300 text-[10px] lowercase flex items-center gap-1 underline"
                    >
                      policeroleplay.community <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={erlcKeyInput}
                      onChange={(e) => setErlcKeyInput(e.target.value)}
                      placeholder="Pega aquí tu Server-Key de ER:LC..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0a0c14] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveErlc}
                      disabled={isTestingErlc}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-950/40 shrink-0 flex items-center justify-center gap-2"
                    >
                      {isTestingErlc ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>Verificando...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-slate-950" />
                          <span>Guardar y Probar Conexión</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Instructions */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2 text-xs text-slate-300">
                  <h5 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    ¿Cómo obtener tu Server-Key de ER:LC?
                  </h5>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                    <li>Abre Roblox y únete a tu servidor de Emergency Response: Liberty County.</li>
                    <li>Abre el panel del servidor (tecla <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-white text-[10px]">M</kbd> &gt; Server Settings).</li>
                    <li>Ve a la pestaña <strong>Developer / API</strong>.</li>
                    <li>Genera o copia tu <strong>Server Key</strong> y pégala en esta casilla.</li>
                    <li>Haz clic en <strong>Guardar y Probar Conexión</strong>. La web sincronizará automáticamente los jugadores (ej. 41/50) cada 30 segundos.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MULTIMEDIA & FOTOS (LOGO, CAMIONETA, ALBUM) */}
          {activeTab === 'multimedia' && (
            <div className="space-y-6">
              
              {/* SECTION A: LOGO OFICIAL DE LA WEB */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#141726] border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-red-500" />
                      1. Foto del Logo Oficial (PE:RP Streets)
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sube una imagen para el logo. Se actualizará en la Barra Superior (Navbar), Hero y Footer.
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 self-start sm:self-auto ${
                    formData.customLogoUrl
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                      : 'bg-white/5 text-slate-400 border border-white/10'
                  }`}>
                    {formData.customLogoUrl ? 'Logo Personalizado Activo' : 'Logo 3D Original'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Logo Preview */}
                  <div className="relative w-28 h-28 shrink-0 rounded-2xl bg-black/60 border border-white/15 p-2 flex items-center justify-center shadow-lg overflow-hidden group">
                    {formData.customLogoUrl ? (
                      <img
                        src={formData.customLogoUrl}
                        alt="Vista previa Logo"
                        className="w-full h-full object-contain rounded-xl"
                      />
                    ) : (
                      <div className="text-center p-2">
                        <div className="w-10 h-10 mx-auto rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 font-black text-sm mb-1">
                          PE:RP
                        </div>
                        <span className="text-[9px] uppercase font-bold text-slate-400">Emblema 3D</span>
                      </div>
                    )}
                  </div>

                  {/* Logo Controls */}
                  <div className="flex-1 w-full space-y-3">
                    <input
                      type="file"
                      ref={logoInputRef}
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={isUploadingLogo}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-red-950"
                      >
                        {isUploadingLogo ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Cargando imagen...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Subir Archivo de Logo</span>
                          </>
                        )}
                      </button>

                      {formData.customLogoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, customLogoUrl: '' }));
                            playClickSound();
                          }}
                          className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Restablecer Logo 3D Original
                        </button>
                      )}
                    </div>

                    {/* Direct URL input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={logoUrlInput}
                        onChange={(e) => setLogoUrlInput(e.target.value)}
                        placeholder="O pega enlace directo de imagen (Discord/Imgur)..."
                        className="flex-1 px-3 py-2 rounded-xl bg-[#0a0c14] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!logoUrlInput.trim()) return;
                          setFormData((prev) => ({ ...prev, customLogoUrl: logoUrlInput.trim() }));
                          setLogoUrlInput('');
                          playSuccessSound();
                        }}
                        className="px-3 py-2 rounded-xl bg-[#1b1f33] hover:bg-[#232942] text-slate-200 hover:text-white text-xs font-bold cursor-pointer"
                      >
                        Aplicar URL
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION B: CAMIONETA DE FACCIONES PNP */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#141726] border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <Car className="w-4 h-4 text-red-500" />
                      2. Foto de la Camioneta de Patrullaje (105 PNP)
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Sube la foto que se exhibirá en la sección de Facciones Oficiales para la Policía Nacional.
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 self-start sm:self-auto ${
                    formData.customPatrolTruckUrl
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                      : 'bg-white/5 text-slate-400 border border-white/10'
                  }`}>
                    {formData.customPatrolTruckUrl ? 'Camioneta Personalizada' : 'Patrulla Original 105'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Truck Preview */}
                  <div className="relative w-40 h-24 sm:w-44 sm:h-28 shrink-0 rounded-2xl bg-black/60 border border-white/15 overflow-hidden shadow-lg group">
                    <img
                      src={formData.customPatrolTruckUrl || "/src/assets/images/peru_police_patrol_night_1792084208478.jpg"}
                      alt="Vista previa Camioneta"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 right-2 bg-black/80 text-[9px] font-mono font-bold text-red-300 px-1.5 py-0.5 rounded">
                      105 PNP
                    </div>
                  </div>

                  {/* Truck Controls */}
                  <div className="flex-1 w-full space-y-3">
                    <input
                      type="file"
                      ref={truckInputRef}
                      accept="image/*"
                      onChange={handleTruckFileChange}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => truckInputRef.current?.click()}
                        disabled={isUploadingTruck}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-red-950"
                      >
                        {isUploadingTruck ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Cargando foto...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Subir Foto de la Camioneta</span>
                          </>
                        )}
                      </button>

                      {formData.customPatrolTruckUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, customPatrolTruckUrl: '' }));
                            playClickSound();
                          }}
                          className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Restablecer Camioneta Original
                        </button>
                      )}
                    </div>

                    {/* Direct URL input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={truckUrlInput}
                        onChange={(e) => setTruckUrlInput(e.target.value)}
                        placeholder="O pega enlace directo de imagen..."
                        className="flex-1 px-3 py-2 rounded-xl bg-[#0a0c14] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!truckUrlInput.trim()) return;
                          setFormData((prev) => ({ ...prev, customPatrolTruckUrl: truckUrlInput.trim() }));
                          setTruckUrlInput('');
                          playSuccessSound();
                        }}
                        className="px-3 py-2 rounded-xl bg-[#1b1f33] hover:bg-[#232942] text-slate-200 hover:text-white text-xs font-bold cursor-pointer"
                      >
                        Aplicar URL
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION C: SEGURIDAD Y GESTIÓN DEL ÁLBUM */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#141726] border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <Camera className="w-4 h-4 text-red-500" />
                      3. Seguridad y Gestión del Álbum Comunitario
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Controla quién puede subir fotos y gestiona la galería actual.
                    </p>
                  </div>
                  
                  {/* Lock Switch */}
                  <label className="flex items-center gap-2.5 p-2 px-3 rounded-xl bg-black/40 border border-white/10 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.albumUploadsLocked !== false}
                      onChange={(e) => {
                        setFormData({ ...formData, albumUploadsLocked: e.target.checked });
                        playClickSound();
                      }}
                      className="w-4 h-4 text-red-600 rounded bg-white/10 border-white/20 focus:ring-0 cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      {formData.albumUploadsLocked !== false ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-amber-300">Subidas Bloqueadas</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Subidas Públicas</span>
                        </>
                      )}
                    </div>
                  </label>
                </div>

                {/* Status Notice */}
                <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
                  formData.albumUploadsLocked !== false
                    ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                    : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    {formData.albumUploadsLocked !== false
                      ? '🔒 Álbum Protegido: Los visitantes solo pueden observar la galería. Nadie nuevo podrá subir fotos salvo tú como Administrador.'
                      : '🔓 Álbum Abierto: Los visitantes pueden subir fotos directamente a la galería.'}
                  </span>
                </div>

                {/* Admin Quick Upload to Album */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-300 font-semibold">
                    Fotos actuales en el álbum: <span className="font-mono text-white">{albumPhotos.length}</span>
                  </span>

                  <input
                    type="file"
                    ref={albumAdminInputRef}
                    multiple
                    accept="image/*"
                    onChange={handleAdminAlbumFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => albumAdminInputRef.current?.click()}
                    disabled={isUploadingAlbum}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
                  >
                    {isUploadingAlbum ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Subiendo...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Subir Foto al Álbum (Admin)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Album Miniature List with Delete Action */}
                {albumPhotos.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-2 max-h-48 overflow-y-auto p-1 bg-black/40 rounded-xl border border-white/5">
                    {albumPhotos.map((photo, i) => (
                      <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-square border border-white/10 bg-[#090b14]">
                        <img
                          src={photo.src}
                          alt="Foto del álbum"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteAlbumPhoto(photo.id)}
                          title="Eliminar del álbum"
                          className="absolute top-1 right-1 p-1 rounded-md bg-black/80 hover:bg-red-600 text-slate-300 hover:text-white transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] font-mono text-white/80 px-1 py-0.5 truncate text-center">
                          #{i + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic text-center py-2">
                    No hay fotos en el álbum actualmente. Puedes subir fotos usando el botón superior.
                  </p>
                )}

              </div>

            </div>
          )}

          {/* TAB 3: DISCORD OAUTH2 */}
          {activeTab === 'discord' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#141726] border border-indigo-500/30">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Key className="w-4 h-4" />
                    Redirect URI para Discord
                  </h4>
                  <a
                    href="https://discord.com/developers/applications"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-indigo-300 hover:text-white flex items-center gap-1 underline"
                  >
                    Abrir Portal <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={redirectUri}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#0a0c14] border border-white/10 text-xs font-mono text-emerald-400 font-bold select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyRedirect}
                    className="px-3 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedRedirect ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedRedirect ? 'Copiado' : 'Copiar URI'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                    DISCORD CLIENT ID (Application ID)
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="ej. 1433560156909863084"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#141726] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#5865F2]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                    DISCORD CLIENT SECRET
                  </label>
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Pega aquí el Client Secret generado en Discord"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#141726] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#5865F2]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SUPABASE & PERU DNIS */}
          {activeTab === 'supabase' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-[#091522] border border-sky-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-sky-400" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-sky-300">
                        Base de Datos Supabase (DNI Peruano & Ciudadanos)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Los DNIs generados por los usuarios se almacenan en Supabase con regla estricta de 1 DNI por Discord.
                      </p>
                    </div>
                  </div>

                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-sky-300 hover:text-white flex items-center gap-1 underline shrink-0"
                  >
                    Abrir Supabase <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Supabase inputs */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                    PROJECT URL DE SUPABASE
                  </label>
                  <input
                    type="text"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://xyzabcdefghijklm.supabase.co"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#141726] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                    ANON / PUBLIC API KEY
                  </label>
                  <input
                    type="password"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2.5 rounded-xl bg-[#141726] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      saveSupabaseConfig(supabaseUrl, supabaseKey);
                      setSupabaseSaved(true);
                      playSuccessSound();
                      setTimeout(() => setSupabaseSaved(false), 2500);
                    }}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    {supabaseSaved ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{supabaseSaved ? '¡Credenciales Guardadas!' : 'Guardar Credenciales Supabase'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(SUPABASE_SQL_INIT);
                      setCopiedSql(true);
                      playSuccessSound();
                      setTimeout(() => setCopiedSql(false), 2500);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-white/10"
                  >
                    <FileCode className="w-3.5 h-3.5 text-amber-400" />
                    <span>{copiedSql ? '¡Script SQL Copiado!' : 'Copiar SQL para Crear Tabla'}</span>
                  </button>
                </div>
              </div>

              {/* Control Policial & Judicial por Usuario de Roblox */}
              <div className="p-4 rounded-2xl bg-[#0e1424] border border-sky-500/30 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      Gestión Policial y Judicial por Usuario de Roblox
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Suspender • Congelar Banco • Reiniciar</span>
                </div>

                {/* Search input by Roblox username or DNI */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={dniSearchQuery}
                    onChange={(e) => setDniSearchQuery(e.target.value)}
                    placeholder="Escribe el usuario de Roblox o DNI del ciudadano..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#070a14] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-sky-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const q = dniSearchQuery.trim().toLowerCase().replace(/^@/, '');
                      if (!q) return;
                      const found = registeredDnis.find(
                        (d) =>
                          d.robloxUsername.toLowerCase() === q ||
                          d.robloxUsername.toLowerCase().includes(q) ||
                          d.dniNumber.includes(q) ||
                          d.discordUsername.toLowerCase().includes(q)
                      );
                      if (found) {
                        setSelectedCitizen(found);
                        setAdminFeedback(`Ciudadano localizado: @${found.robloxUsername} (DNI ${found.dniNumber})`);
                        playSuccessSound();
                      } else {
                        setAdminFeedback(`No se encontró ningún ciudadano con el usuario o DNI "@${q}".`);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shrink-0"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Buscar</span>
                  </button>
                </div>

                {adminFeedback && (
                  <div className="text-[11px] font-bold text-sky-300 bg-sky-950/40 p-2 rounded-lg border border-sky-500/20">
                    {adminFeedback}
                  </div>
                )}

                {/* Selected Citizen Management Card */}
                {selectedCitizen && (
                  <div className="p-4 rounded-xl bg-[#070914] border border-sky-400/40 space-y-3.5 shadow-xl">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <img
                          src={selectedCitizen.photoUrl}
                          alt="Avatar"
                          className="w-12 h-12 rounded-xl bg-black object-cover border-2 border-sky-400/50 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <span>{selectedCitizen.fullName}</span>
                            <span className="font-mono text-xs text-sky-400 font-bold">DNI {selectedCitizen.dniNumber}-{selectedCitizen.verifyDigit}</span>
                          </div>
                          <div className="text-[11px] text-slate-300">
                            Usuario Roblox: <strong className="text-white font-mono">@{selectedCitizen.robloxUsername}</strong> • Discord: {selectedCitizen.discordUsername}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedCitizen(null)}
                        className="text-slate-400 hover:text-white text-xs cursor-pointer px-2 py-1 rounded hover:bg-white/5"
                      >
                        ✕ Cerrar
                      </button>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                      <span className={`px-2 py-0.5 rounded-md border ${
                        selectedCitizen.status === 'suspended'
                          ? 'bg-rose-950 text-rose-300 border-rose-500/50'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                      }`}>
                        DNI: {selectedCitizen.status === 'suspended' ? '🚫 Suspendido' : '✅ Vigente'}
                      </span>

                      <span className={`px-2 py-0.5 rounded-md border ${
                        selectedCitizen.bankStatus === 'frozen'
                          ? 'bg-sky-950 text-sky-300 border-sky-500/50'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                      }`}>
                        Banco: {selectedCitizen.bankStatus === 'frozen' ? '❄️ Cuenta Congelada' : '💳 Cuenta Activa (S/.)'}
                      </span>

                      <span className={`px-2 py-0.5 rounded-md border ${
                        selectedCitizen.wantedStatus
                          ? 'bg-red-950 text-red-200 border-red-500/50 animate-pulse'
                          : 'bg-slate-900 text-slate-400 border-white/10'
                      }`}>
                        PNP: {selectedCitizen.wantedStatus ? '🚨 ORDEN DE CAPTURA VIGENTE' : 'Sin Requisitoria'}
                      </span>
                    </div>

                    {/* Reason input for actions */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Motivo / Justificación Policial o Judicial (Opcional):
                      </label>
                      <input
                        type="text"
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        placeholder="ej. Sospecha de asalto a banco en ER:LC / Orden de Fiscalía / Error de datos..."
                        className="w-full px-3 py-1.5 rounded-lg bg-[#05070e] border border-white/10 text-white text-xs focus:outline-none focus:border-sky-400"
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {/* Action 1: Suspender / Reactivar DNI */}
                      <button
                        type="button"
                        onClick={async () => {
                          const nextStatus = selectedCitizen.status === 'suspended' ? 'active' : 'suspended';
                          await updateDniAdministrativeStatus(selectedCitizen.discordId, {
                            status: nextStatus,
                            suspensionReason: nextStatus === 'suspended' ? (actionReason || 'Orden policial administrativa.') : '',
                          });
                          const updated: PeruDni = {
                            ...selectedCitizen,
                            status: nextStatus,
                            suspensionReason: nextStatus === 'suspended' ? actionReason : '',
                          };
                          setSelectedCitizen(updated);
                          setRegisteredDnis((prev) => prev.map((d) => d.id === updated.id ? updated : d));
                          playSuccessSound();
                          setAdminFeedback(nextStatus === 'suspended' ? '🚫 DNI suspendido correctamente.' : '✅ Suspensión del DNI levantada.');
                        }}
                        className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          selectedCitizen.status === 'suspended'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-rose-900 hover:bg-rose-800 text-rose-100 border border-rose-500/40'
                        }`}
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>{selectedCitizen.status === 'suspended' ? 'Reactivar DNI' : 'Suspender DNI'}</span>
                      </button>

                      {/* Action 2: Congelar / Descongelar Cuenta Bancaria */}
                      <button
                        type="button"
                        onClick={async () => {
                          const nextBank = selectedCitizen.bankStatus === 'frozen' ? 'active' : 'frozen';
                          await updateDniAdministrativeStatus(selectedCitizen.discordId, {
                            bankStatus: nextBank,
                            bankFreezeReason: nextBank === 'frozen' ? (actionReason || 'Embargo judicial de fondos.') : '',
                          });
                          const updated: PeruDni = {
                            ...selectedCitizen,
                            bankStatus: nextBank,
                            bankFreezeReason: nextBank === 'frozen' ? actionReason : '',
                          };
                          setSelectedCitizen(updated);
                          setRegisteredDnis((prev) => prev.map((d) => d.id === updated.id ? updated : d));
                          playSuccessSound();
                          setAdminFeedback(nextBank === 'frozen' ? '❄️ Cuenta bancaria congelada.' : '🔓 Cuenta bancaria descongelada.');
                        }}
                        className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          selectedCitizen.bankStatus === 'frozen'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-sky-900 hover:bg-sky-800 text-sky-100 border border-sky-500/40'
                        }`}
                      >
                        <Snowflake className="w-3.5 h-3.5" />
                        <span>{selectedCitizen.bankStatus === 'frozen' ? 'Descongelar Banco' : 'Congelar Banco'}</span>
                      </button>

                      {/* Action 3: Requisitoria PNP */}
                      <button
                        type="button"
                        onClick={async () => {
                          const nextWanted = !selectedCitizen.wantedStatus;
                          await updateDniAdministrativeStatus(selectedCitizen.discordId, {
                            wantedStatus: nextWanted,
                            wantedReason: nextWanted ? (actionReason || 'Requisitoria policial activa.') : '',
                          });
                          const updated: PeruDni = {
                            ...selectedCitizen,
                            wantedStatus: nextWanted,
                            wantedReason: nextWanted ? actionReason : '',
                          };
                          setSelectedCitizen(updated);
                          setRegisteredDnis((prev) => prev.map((d) => d.id === updated.id ? updated : d));
                          playSuccessSound();
                          setAdminFeedback(nextWanted ? '🚨 Orden de captura emitida.' : '✅ Requisitoria retirada.');
                        }}
                        className={`px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          selectedCitizen.wantedStatus
                            ? 'bg-slate-700 hover:bg-slate-600 text-white'
                            : 'bg-red-950 hover:bg-red-900 text-red-200 border border-red-500/50'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{selectedCitizen.wantedStatus ? 'Retirar Captura' : 'Dictar Captura'}</span>
                      </button>

                      {/* Action 4: Reiniciar DNI (Permitir volver a crearlo) */}
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm(`¿Seguro que deseas reiniciar el DNI de @${selectedCitizen.robloxUsername}? Podrá tramitar un nuevo DNI desde cero con su avatar de Roblox.`)) {
                            await deleteDniByAdmin(selectedCitizen.discordId);
                            setRegisteredDnis((prev) => prev.filter((d) => d.id !== selectedCitizen.id));
                            setSelectedCitizen(null);
                            playSuccessSound();
                            setAdminFeedback(`DNI de @${selectedCitizen.robloxUsername} reiniciado exitosamente. Ahora puede volver a crearlo.`);
                          }
                        }}
                        className="px-2.5 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Reiniciar DNI</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Registered DNIs list */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                      Padrón Ciudadano de DNIs ({registeredDnis.length})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Haz clic en cualquier ciudadano para gestionarlo o suspenderlo.
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm('¿Seguro que deseas reiniciar y borrar TODOS los DNIs emitidos para que los usuarios puedan crearlos de nuevo?')) {
                          await resetAllDnis();
                          setRegisteredDnis([]);
                          setSelectedCitizen(null);
                          playSuccessSound();
                          alert('Todos los DNIs han sido reiniciados.');
                        }
                      }}
                      className="text-[11px] text-rose-400 hover:text-rose-300 underline cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reiniciar Todos los DNIs</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        getAllRegisteredDnis().then(setRegisteredDnis).catch(() => {});
                        playClickSound();
                      }}
                      className="text-[11px] text-sky-400 hover:text-white underline cursor-pointer"
                    >
                      Actualizar Lista
                    </button>
                  </div>
                </div>

                {registeredDnis.length > 0 ? (
                  <div className="max-h-56 overflow-y-auto space-y-2 p-1">
                    {registeredDnis.map((dni) => (
                      <div
                        key={dni.id}
                        onClick={() => {
                          setSelectedCitizen(dni);
                          setAdminFeedback(`Ciudadano seleccionado: @${dni.robloxUsername}`);
                          playClickSound();
                        }}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                          selectedCitizen?.id === dni.id
                            ? 'bg-sky-950/60 border-sky-400'
                            : 'bg-[#141726] hover:bg-[#191d30] border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={dni.photoUrl}
                            alt="Foto Roblox"
                            className="w-10 h-10 rounded-lg bg-black object-cover border border-white/10 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{dni.fullName}</span>
                              <span className="font-mono text-sky-400 font-bold">DNI {dni.dniNumber}-{dni.verifyDigit}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Roblox: <strong className="text-white font-mono">@{dni.robloxUsername}</strong> • Discord: {dni.discordUsername}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {dni.status === 'suspended' && (
                            <span className="text-[9px] font-mono text-rose-400 font-bold px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/40">
                              SUSPENDIDO
                            </span>
                          )}
                          {dni.bankStatus === 'frozen' && (
                            <span className="text-[9px] font-mono text-sky-400 font-bold px-1.5 py-0.5 rounded bg-sky-950/80 border border-sky-500/40">
                              BANCO ❄️
                            </span>
                          )}
                          {dni.wantedStatus && (
                            <span className="text-[9px] font-mono text-red-400 font-bold px-1.5 py-0.5 rounded bg-red-950/80 border border-red-500/40">
                              CAPTURAR
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30">
                            {dni.status === 'suspended' ? 'BLOQUEADO' : 'ACTIVO'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-center text-xs text-slate-400">
                    Aún no se han emitido DNIs. Los ciudadanos registrados aparecerán aquí automáticamente.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: BANCO CENTRAL & YAPO */}
          {activeTab === 'bank' && (
            <div className="space-y-5">
              
              {/* Header Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/70 via-indigo-950/50 to-[#0e101f] border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <YapoLogo size="sm" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                        Administración Central: Banco & Yapo (PE:RP)
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        Gestiona los fondos de los ciudadanos por usuario de Roblox, congela cuentas bancarias, edita saldos en mano/banco y sincroniza con el bot de Discord.
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-200 border border-purple-500/40 text-[10px] font-mono">
                    {yapoAccounts.length} Cuentas Activas
                  </span>
                </div>
              </div>

              {/* SEARCH & MANAGE CITIZEN BY ROBLOX USERNAME */}
              <div className="p-4 rounded-2xl bg-[#0b0e1c] border border-purple-500/30 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      Gestor de Fondos por Usuario de Roblox o DNI
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Editar Saldo • Congelar Fondos • Reiniciar</span>
                </div>

                {/* Search input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={yapoSearchQuery}
                    onChange={(e) => setYapoSearchQuery(e.target.value)}
                    placeholder="Escribe el usuario de Roblox o DNI del ciudadano..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#060812] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const q = yapoSearchQuery.trim().toLowerCase().replace(/^@/, '');
                      if (!q) return;
                      const found = yapoAccounts.find(
                        (a) =>
                          a.robloxUsername.toLowerCase() === q ||
                          a.robloxUsername.toLowerCase().includes(q) ||
                          a.dniNumber.includes(q) ||
                          (a.discordUsername && a.discordUsername.toLowerCase().includes(q))
                      );
                      if (found) {
                        setSelectedYapoAccount(found);
                        setEditBankAmount(found.bankBalance.toString());
                        setEditCashAmount(found.cashBalance.toString());
                        setYapoFeedback(`Cuenta localizada: @${found.robloxUsername} (DNI ${found.dniNumber})`);
                        playSuccessSound();
                      } else {
                        setSelectedYapoAccount(null);
                        setYapoFeedback(`No se encontró ninguna cuenta de Yapo con el usuario o DNI "@${q}".`);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shrink-0"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Buscar</span>
                  </button>
                </div>

                {yapoFeedback && (
                  <div className="text-[11px] font-bold text-purple-300 bg-purple-950/40 p-2 rounded-lg border border-purple-500/20">
                    {yapoFeedback}
                  </div>
                )}

                {/* Selected Yapo Account Card */}
                {selectedYapoAccount && (
                  <div className="p-4 rounded-xl bg-[#070914] border border-purple-400/40 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <img
                          src={selectedYapoAccount.avatarUrl}
                          alt="Avatar"
                          className="w-12 h-12 rounded-xl bg-black object-cover border-2 border-purple-400 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <span>{selectedYapoAccount.fullName}</span>
                            <span className="font-mono text-xs text-purple-300 font-bold">DNI {selectedYapoAccount.dniNumber}-{selectedYapoAccount.verifyDigit}</span>
                          </div>
                          <div className="text-[11px] text-slate-300">
                            Usuario Roblox: <strong className="text-white font-mono">@{selectedYapoAccount.robloxUsername}</strong>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedYapoAccount(null)}
                        className="text-slate-400 hover:text-white text-xs cursor-pointer px-2 py-1 rounded hover:bg-white/5"
                      >
                        ✕ Cerrar
                      </button>
                    </div>

                    {/* Status badges */}
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        selectedYapoAccount.status === 'frozen'
                          ? 'bg-rose-950 text-rose-300 border-rose-500/50'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                      }`}>
                        Estado de Cuenta: {selectedYapoAccount.status === 'frozen' ? '❄️ CONGELADA' : '✅ VIGENTE'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Patrimonio Total: S/ {(selectedYapoAccount.bankBalance + selectedYapoAccount.cashBalance).toFixed(2)}
                      </span>
                    </div>

                    {/* Balance Modifier Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-purple-300 uppercase mb-1">
                          Saldo en Banco / Yapo (S/.)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={editBankAmount}
                          onChange={(e) => setEditBankAmount(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#05070e] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-teal-300 uppercase mb-1">
                          Saldo en Mano / Efectivo (S/.)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={editCashAmount}
                          onChange={(e) => setEditCashAmount(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#05070e] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-teal-400"
                        />
                      </div>
                    </div>

                    {/* Action buttons for selected user */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      {/* Save Balances */}
                      <button
                        type="button"
                        onClick={() => {
                          const bankVal = parseFloat(editBankAmount);
                          const cashVal = parseFloat(editCashAmount);
                          adminUpdateBalances(selectedYapoAccount.dniNumber, bankVal, cashVal);
                          const updated = {
                            ...selectedYapoAccount,
                            bankBalance: bankVal,
                            cashBalance: cashVal,
                          };
                          setSelectedYapoAccount(updated);
                          setYapoAccounts((prev) => prev.map((a) => a.id === updated.id ? updated : a));
                          playSuccessSound();
                          setYapoFeedback(`✅ Saldos de @${selectedYapoAccount.robloxUsername} actualizados: Banco S/ ${bankVal.toFixed(2)}, Mano S/ ${cashVal.toFixed(2)}`);
                        }}
                        className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Guardar Saldos</span>
                      </button>

                      {/* Freeze / Unfreeze */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextFreeze = selectedYapoAccount.status !== 'frozen';
                          adminToggleFreezeAccount(
                            selectedYapoAccount.dniNumber,
                            nextFreeze,
                            nextFreeze ? (actionReason || 'Medida cautelar policial.') : undefined
                          );
                          const updated = {
                            ...selectedYapoAccount,
                            status: (nextFreeze ? 'frozen' : 'active') as 'frozen' | 'active',
                          };
                          setSelectedYapoAccount(updated);
                          setYapoAccounts((prev) => prev.map((a) => a.id === updated.id ? updated : a));
                          playSuccessSound();
                          setYapoFeedback(nextFreeze ? '❄️ Cuenta de Yapo CONGELADA correctamente.' : '🔓 Cuenta de Yapo DESCONGELADA.');
                        }}
                        className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          selectedYapoAccount.status === 'frozen'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        <Snowflake className="w-3.5 h-3.5" />
                        <span>{selectedYapoAccount.status === 'frozen' ? 'Descongelar Cuenta' : 'Congelar Cuenta'}</span>
                      </button>

                      {/* Reset Account */}
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`¿Seguro que deseas reiniciar la cuenta Yapo de @${selectedYapoAccount.robloxUsername}? Se borrarán sus fondos y podrá afiliarse nuevamente.`)) {
                            resetYapoAccount(selectedYapoAccount.dniNumber);
                            setYapoAccounts((prev) => prev.filter((a) => a.id !== selectedYapoAccount.id));
                            setSelectedYapoAccount(null);
                            playSuccessSound();
                            setYapoFeedback(`Cuenta Yapo de @${selectedYapoAccount.robloxUsername} reiniciada exitosamente.`);
                          }
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                        <span>Reiniciar Cuenta</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* GENERAL BANK & BOT CONFIGURATION */}
              <div className="p-4 rounded-2xl bg-[#0b0e1c] border border-white/10 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-sky-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      Configuración de Economía & Bot de Discord
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400">Tipo UnbelievaBoat / Economía Virtual</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                      Bono de Bienvenida al Afiliarse (S/.)
                    </label>
                    <input
                      type="number"
                      value={yapoBankConfig.welcomeBonus}
                      onChange={(e) => setYapoBankConfig({ ...yapoBankConfig, welcomeBonus: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-[#070912] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                      Límite Máximo por Transferencia (S/.)
                    </label>
                    <input
                      type="number"
                      value={yapoBankConfig.maxTransferPerTx}
                      onChange={(e) => setYapoBankConfig({ ...yapoBankConfig, maxTransferPerTx: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl bg-[#070912] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Webhook URL de Discord (Registro de Transacciones en Vivo)
                  </label>
                  <input
                    type="url"
                    value={yapoBankConfig.discordBotWebhookUrl || ''}
                    onChange={(e) => setYapoBankConfig({ ...yapoBankConfig, discordBotWebhookUrl: e.target.value })}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="w-full px-3 py-2 rounded-xl bg-[#070912] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Cada vez que un ciudadano haga un Yapeo o retiro en efectivo, se enviará una notificación a tu canal de Discord configurado.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Token o Endpoint del Bot de Discord (Opcional - Para vincular economía)
                  </label>
                  <input
                    type="password"
                    value={yapoBankConfig.discordBotToken || ''}
                    onChange={(e) => setYapoBankConfig({ ...yapoBankConfig, discordBotToken: e.target.value })}
                    placeholder="OTkyNz..."
                    className="w-full px-3 py-2 rounded-xl bg-[#070912] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      saveYapoConfig(yapoBankConfig);
                      setYapoConfigSaved(true);
                      playSuccessSound();
                      setTimeout(() => setYapoConfigSaved(false), 2500);
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{yapoConfigSaved ? '¡Configuración Guardada!' : 'Guardar Configuración de Banco'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(YAPO_SUPABASE_SQL);
                      setCopiedYapoSql(true);
                      playSuccessSound();
                      setTimeout(() => setCopiedYapoSql(false), 2500);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-white/10"
                  >
                    <FileCode className="w-3.5 h-3.5 text-purple-300" />
                    <span>{copiedYapoSql ? '¡SQL Copiado!' : 'Copiar SQL Tablas Yapo'}</span>
                  </button>
                </div>
              </div>

              {/* REGISTERED YAPO ACCOUNTS PADRÓN */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                      Padrón de Cuentas Yapo Afiliadas ({yapoAccounts.length})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Haz clic en cualquier ciudadano para editar su saldo o congelar su cuenta.
                    </span>
                  </div>

                  {yapoAccounts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('¿Seguro que deseas reiniciar y borrar TODAS las cuentas de Yapo y sus saldos? Los usuarios deberán afiliarse de nuevo.')) {
                          resetAllYapo();
                          setYapoAccounts([]);
                          setSelectedYapoAccount(null);
                          playSuccessSound();
                          alert('Todas las cuentas de Yapo han sido reiniciadas.');
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reiniciar Todas las Cuentas Yapo</span>
                    </button>
                  )}
                </div>

                {yapoAccounts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                    {yapoAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        onClick={() => {
                          setSelectedYapoAccount(acc);
                          setEditBankAmount(acc.bankBalance.toString());
                          setEditCashAmount(acc.cashBalance.toString());
                          playClickSound();
                        }}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          selectedYapoAccount?.id === acc.id
                            ? 'bg-purple-950/60 border-purple-400 ring-1 ring-purple-400'
                            : 'bg-[#0b0e1b] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={acc.avatarUrl}
                            alt="Avatar"
                            className="w-9 h-9 rounded-lg bg-black object-cover border border-white/20 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-white text-xs truncate">{acc.fullName}</div>
                            <div className="text-[10px] text-slate-400">
                              @{acc.robloxUsername} • DNI {acc.dniNumber}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono text-xs font-black text-purple-300">
                            S/ {acc.bankBalance.toFixed(2)}
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            acc.status === 'frozen'
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {acc.status === 'frozen' ? '❄️ CONGELADA' : 'ACTIVA'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-center text-xs text-slate-400">
                    Aún no hay cuentas de Yapo creadas. Los ciudadanos que verifiquen su DNI y se afilien a Yapo aparecerán aquí en tiempo real.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Action buttons */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restablecer Todo
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsAdminOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-950 transition-all cursor-pointer"
              >
                {saveSuccess ? <Check className="w-4 h-4 text-emerald-200" /> : <Save className="w-4 h-4" />}
                {saveSuccess ? '¡Cambios Guardados!' : 'Guardar y Publicar en la Web'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
