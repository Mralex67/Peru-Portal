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
  Bot,
  Download,
  Palette
} from 'lucide-react';
import { useServer } from '../context/ServerContext';
import { playClickSound, playSuccessSound } from '../utils/audio';
import { OFFICIAL_DNI_TEMPLATE_BASE64 } from '../assets/dniTemplateBase64';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  syncSupabaseConfig,
  SUPABASE_SQL_INIT,
  COMBINED_SUPABASE_SQL,
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
  const { config, updateConfig, resetConfig, isAdminOpen, setIsAdminOpen, lockAdmin, adminRole } = useServer();

  const [formData, setFormData] = useState({ ...config });
  const [activeTab, setActiveTab] = useState<'general' | 'erlc' | 'multimedia' | 'discord' | 'supabase' | 'bank' | 'bot' | 'template' | 'secrets'>('general');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  // Secrets Vault & Encryptor State
  const [secretsVault, setSecretsVault] = useState({
    supabaseUrl: '',
    supabaseAnonKey: '',
    discordToken: '',
    discordClientId: '',
    discordClientSecret: '',
    discordGuildId: '1554629558760775710',
    pnpRoleId: '1555384968086032394',
    licenseRoleId: '1556723203114668082',
    erlcServerKey: '',
  });
  const [secretsConfigured, setSecretsConfigured] = useState(false);
  const [isSavingSecrets, setIsSavingSecrets] = useState(false);
  const [secretsFeedback, setSecretsFeedback] = useState('');
  const [showSecretField, setShowSecretField] = useState<{ [key: string]: boolean }>({});

  // Encryption tool states
  const [encryptRawInput, setEncryptRawInput] = useState('');
  const [encryptSecretKey, setEncryptSecretKey] = useState('');
  const [encryptResultText, setEncryptResultText] = useState('');
  const [encryptCopied, setEncryptCopied] = useState(false);

  // DNI Template customization state in Admin Panel
  const [adminTemplateSrc, setAdminTemplateSrc] = useState<string>(() => {
    return localStorage.getItem('perp_custom_dni_template') || OFFICIAL_DNI_TEMPLATE_BASE64;
  });
  const [adminCanvaUrlInput, setAdminCanvaUrlInput] = useState('');
  const [adminTemplateMessage, setAdminTemplateMessage] = useState('');
  const [isAdminSavingTemplate, setIsAdminSavingTemplate] = useState(false);
  const adminTemplateFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adminRole === 'db_manager') {
      setActiveTab('supabase');
    }
  }, [adminRole]);

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

  // Discord Bot Simulator State
  const [simCommand, setSimCommand] = useState<'saldo' | 'dni-ver' | 'transferir' | 'crear-dni' | 'retirar' | 'depositar' | 'ayuda'>('saldo');
  const [simUser, setSimUser] = useState('');
  const [simAmount, setSimAmount] = useState('25.00');
  const [simDest, setSimDest] = useState('');
  const [simNote, setSimNote] = useState('Pago de servicio');
  const [simDniSide, setSimDniSide] = useState<'front' | 'back'>('front');
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [copiedBotEnv, setCopiedBotEnv] = useState(false);
  const [botFiles, setBotFiles] = useState<{ [filename: string]: string } | null>(null);
  const [selectedBotFile, setSelectedBotFile] = useState<string>('index.js');
  const [showBotFilesModal, setShowBotFilesModal] = useState(false);
  const [isLoadingBotFiles, setIsLoadingBotFiles] = useState(false);
  const [copiedFileKey, setCopiedFileKey] = useState<string | null>(null);

  // File upload refs
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const heroCardInputRef = useRef<HTMLInputElement | null>(null);
  const truckInputRef = useRef<HTMLInputElement | null>(null);
  const yapoLogoInputRef = useRef<HTMLInputElement | null>(null);
  const albumAdminInputRef = useRef<HTMLInputElement | null>(null);

  const handleAdminUploadTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const base64Data = reader.result;
        setAdminTemplateSrc(base64Data);
        localStorage.setItem('perp_custom_dni_template', base64Data);
        window.dispatchEvent(new Event('perp_dni_template_updated'));
        setAdminTemplateMessage('¡Plantilla de DNI actualizada y guardada con éxito!');
        playSuccessSound();

        try {
          await fetch('/api/admin/template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64Data }),
          });
        } catch {}
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAdminApplyCanvaUrl = async () => {
    if (!adminCanvaUrlInput.trim()) return;
    setIsAdminSavingTemplate(true);
    playClickSound();
    try {
      setAdminTemplateSrc(adminCanvaUrlInput.trim());
      localStorage.setItem('perp_custom_dni_template', adminCanvaUrlInput.trim());
      window.dispatchEvent(new Event('perp_dni_template_updated'));
      await fetch('/api/admin/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: adminCanvaUrlInput.trim() }),
      });
      setAdminTemplateMessage('¡Enlace de plantilla / Canva aplicado correctamente!');
      playSuccessSound();
      setAdminCanvaUrlInput('');
    } catch {
      setAdminTemplateMessage('Plantilla guardada en navegador.');
    } finally {
      setIsAdminSavingTemplate(false);
    }
  };

  const handleAdminResetTemplate = async () => {
    playClickSound();
    setAdminTemplateSrc(OFFICIAL_DNI_TEMPLATE_BASE64);
    localStorage.removeItem('perp_custom_dni_template');
    window.dispatchEvent(new Event('perp_dni_template_updated'));
    try {
      await fetch('/api/admin/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: OFFICIAL_DNI_TEMPLATE_BASE64 }),
      });
    } catch {}
    setAdminTemplateMessage('Restablecida a la plantilla oficial de RENIEC PE:RP.');
    playSuccessSound();
  };

  // Image loading indicators
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingHeroCard, setIsUploadingHeroCard] = useState(false);
  const [isUploadingTruck, setIsUploadingTruck] = useState(false);
  const [isUploadingYapoLogo, setIsUploadingYapoLogo] = useState(false);
  const [isUploadingAlbum, setIsUploadingAlbum] = useState(false);
  const [isDownloadingBot, setIsDownloadingBot] = useState(false);

  // Direct URL inputs
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [heroCardUrlInput, setHeroCardUrlInput] = useState('');
  const [truckUrlInput, setTruckUrlInput] = useState('');
  const [yapoLogoUrlInput, setYapoLogoUrlInput] = useState('');

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
    fetch('/api/album-photos')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.success && Array.isArray(data.photos) && data.photos.length > 0) {
          setAlbumPhotos(data.photos);
        } else {
          const saved = localStorage.getItem('perp_album_photos_v4');
          if (saved) setAlbumPhotos(JSON.parse(saved));
        }
      })
      .catch(() => {
        const saved = localStorage.getItem('perp_album_photos_v4');
        if (saved) setAlbumPhotos(JSON.parse(saved));
      });

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
    syncSupabaseConfig().then((sConf) => {
      setSupabaseUrl(sConf.url);
      setSupabaseKey(sConf.anonKey);
    }).catch(() => {});
    getAllRegisteredDnis().then(setRegisteredDnis).catch(() => {});

    // Synchronize form with latest server config whenever opening panel
    setFormData({ ...config });
    setLogoUrlInput(config.customLogoUrl || '');
    setHeroCardUrlInput(config.heroCardImage || '');
    setTruckUrlInput(config.customPatrolTruckUrl || '');
    setYapoLogoUrlInput(config.yapoLogoUrl || '');

    // Load Yapo banking accounts, transactions and config
    setYapoAccounts(getLocalYapoAccounts());
    setYapoTransactions(getLocalYapoTransactions());
    setYapoBankConfig(getYapoConfig());

    // Fetch saved ER:LC key from server
    fetch('/api/erlc/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.serverKey) {
          setErlcKeyInput(data.serverKey);
          setIsErlcConfigured(true);
        }
      })
      .catch(() => {});

    // Check ER:LC API live status
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

    // Load server secrets vault config
    fetch('/api/secrets/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setSecretsConfigured(Boolean(data.configured));
          setSecretsVault((prev) => ({
            ...prev,
            supabaseUrl: data.supabaseUrl || prev.supabaseUrl,
            discordClientId: data.discordClientId || prev.discordClientId,
            discordGuildId: data.discordGuildId || '1554629558760775710',
            pnpRoleId: data.pnpRoleId || '1555384968086032394',
            licenseRoleId: data.licenseRoleId || '1556723203114668082',
          }));
        }
      })
      .catch(() => {});
  }, [isAdminOpen]);

  if (!isAdminOpen) return null;

  // Encriptador & Desencriptador para Tokens y Claves
  const perpEncrypt = (text: string, pass: string): string => {
    if (!text) return '';
    const key = pass || 'PERP_POLICIA_SECRETS_2026';
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    try {
      return btoa(unescape(encodeURIComponent(result)));
    } catch {
      return btoa(result);
    }
  };

  const perpDecrypt = (encoded: string, pass: string): string => {
    if (!encoded) return '';
    try {
      let raw = '';
      try {
        raw = decodeURIComponent(escape(atob(encoded.trim())));
      } catch {
        raw = atob(encoded.trim());
      }
      const key = pass || 'PERP_POLICIA_SECRETS_2026';
      let result = '';
      for (let i = 0; i < raw.length; i++) {
        const charCode = raw.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
      }
      return result;
    } catch (e) {
      return 'Error: Clave o texto encriptado inválido.';
    }
  };

  const handleSaveSecretsVault = async () => {
    setIsSavingSecrets(true);
    setSecretsFeedback('');
    playClickSound();

    try {
      const res = await fetch('/api/secrets/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(secretsVault),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSecretsConfigured(true);
        setSecretsFeedback('✅ ¡Bóveda de Secrets guardada permanentemente en el servidor! Base de datos y credenciales integradas en la nube.');
        playSuccessSound();
        if (secretsVault.supabaseUrl && secretsVault.supabaseAnonKey) {
          saveSupabaseConfig(secretsVault.supabaseUrl, secretsVault.supabaseAnonKey);
          setSupabaseUrl(secretsVault.supabaseUrl);
          setSupabaseKey(secretsVault.supabaseAnonKey);
        }
      } else {
        setSecretsFeedback('❌ ' + (data.message || 'Error al guardar los secrets en el servidor.'));
      }
    } catch (err: any) {
      setSecretsFeedback('❌ Error de conexión al guardar secrets: ' + (err.message || 'desconocido'));
    } finally {
      setIsSavingSecrets(false);
    }
  };

  // Compress image to standard dimensions before upload to keep loads fast and avoid quota limits
  const optimizeImageFile = (file: File, maxDim = 1280): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        if (!src) return resolve('');
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.88));
          } else {
            resolve(src);
          }
        };
        img.onerror = () => resolve(src);
        img.src = src;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  // Upload helper using server API
  const uploadToServer = async (dataUrl: string): Promise<string> => {
    try {
      const res = await fetch('/api/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.url) return data.url;
      }
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

    try {
      const dataUrl = await optimizeImageFile(file, 1280);
      const finalUrl = await uploadToServer(dataUrl);
      setLogoUrlInput(finalUrl);
      setFormData((prev) => ({ ...prev, customLogoUrl: finalUrl }));
      updateConfig({ customLogoUrl: finalUrl });
      playSuccessSound();
    } catch (err) {
      console.error('Error al subir logo:', err);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Upload Hero Card Image from local file
  const handleHeroCardFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingHeroCard(true);
    playClickSound();

    try {
      const dataUrl = await optimizeImageFile(file, 1280);
      const finalUrl = await uploadToServer(dataUrl);
      setHeroCardUrlInput(finalUrl);
      setFormData((prev) => ({ ...prev, heroCardImage: finalUrl }));
      updateConfig({ heroCardImage: finalUrl });
      playSuccessSound();
    } catch (err) {
      console.error('Error al subir portada:', err);
    } finally {
      setIsUploadingHeroCard(false);
    }
  };

  // Upload Truck from local file
  const handleTruckFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingTruck(true);
    playClickSound();

    try {
      const dataUrl = await optimizeImageFile(file, 1280);
      const finalUrl = await uploadToServer(dataUrl);
      setTruckUrlInput(finalUrl);
      setFormData((prev) => ({ ...prev, customPatrolTruckUrl: finalUrl }));
      updateConfig({ customPatrolTruckUrl: finalUrl });
      playSuccessSound();
    } catch (err) {
      console.error('Error al subir camioneta:', err);
    } finally {
      setIsUploadingTruck(false);
    }
  };

  // Download Discord Bot 24/7 package cleanly as binary blob
  const handleDownloadBotZip = async () => {
    setIsDownloadingBot(true);
    playClickSound();
    try {
      // First try direct prebuilt endpoint
      const res = await fetch('/perp-discord-bot-24-7.zip');
      if (!res.ok) throw new Error('Error al descargar ZIP');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'perp-discord-bot-24-7.zip';
      document.body.appendChild(a);
      a.click();
      // Keep blob URL alive for 45s to avoid aborting download in Windows / Chrome
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 45000);
      playSuccessSound();
    } catch (err) {
      console.error('Error downloading bot zip:', err);
      window.open('/perp-discord-bot-24-7.zip', '_blank');
    } finally {
      setIsDownloadingBot(false);
    }
  };

  // Open interactive bot files viewer
  const handleOpenBotFiles = async () => {
    setShowBotFilesModal(true);
    playClickSound();
    if (!botFiles) {
      setIsLoadingBotFiles(true);
      try {
        const res = await fetch('/api/bot/package-files');
        const data = await res.json();
        if (data && data.files) {
          setBotFiles(data.files);
        }
      } catch (err) {
        console.error('Error fetching bot files:', err);
      } finally {
        setIsLoadingBotFiles(false);
      }
    }
  };

  // Upload YA P Logo from local file
  const handleYapoLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingYapoLogo(true);
    playClickSound();

    try {
      const dataUrl = await optimizeImageFile(file, 800);
      const finalUrl = await uploadToServer(dataUrl);
      setYapoLogoUrlInput(finalUrl);
      setFormData((prev) => ({ ...prev, yapoLogoUrl: finalUrl }));
      updateConfig({ yapoLogoUrl: finalUrl });
      playSuccessSound();
    } catch (err) {
      console.error('Error al subir logo yapo:', err);
    } finally {
      setIsUploadingYapoLogo(false);
    }
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
      localStorage.setItem('perp_album_photos_v4', JSON.stringify(updated));
      fetch('/api/album-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: updated }),
      }).catch(() => {});
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
    localStorage.setItem('perp_album_photos_v4', JSON.stringify(updated));
    fetch('/api/album-photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photos: updated }),
    }).catch(() => {});
    window.dispatchEvent(new Event('perp_album_updated'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = {
      ...formData,
      customLogoUrl: logoUrlInput.trim() !== '' ? logoUrlInput.trim() : formData.customLogoUrl,
      heroCardImage: heroCardUrlInput.trim() !== '' ? heroCardUrlInput.trim() : formData.heroCardImage,
      customPatrolTruckUrl: truckUrlInput.trim() !== '' ? truckUrlInput.trim() : formData.customPatrolTruckUrl,
      yapoLogoUrl: yapoLogoUrlInput.trim() !== '' ? yapoLogoUrlInput.trim() : formData.yapoLogoUrl,
    };
    updateConfig(finalData);

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

    try {
      const res = await fetch('/api/erlc/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverKey: cleanKey }),
      });

      const data = await res.json();

      if (data.success && data.valid && data.server) {
        setIsErlcConfigured(true);
        setErlcFeedback({
          success: true,
          message: data.message || `¡Conexión Exitosa con ER:LC! Servidor: "${data.server.name}" con ${data.server.currentPlayers}/${data.server.maxPlayers} jugadores en vivo.`,
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
          message: data.message || 'No se pudo validar la clave de ER:LC. Verifica que la copiaste de Roblox > Menú M > Settings > Developer / API.',
        });
      }
    } catch (err: any) {
      setIsErlcConfigured(true);
      setErlcFeedback({
        success: false,
        message: 'No se pudo conectar con el servidor local para verificar la clave de ER:LC.',
      });
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

  // Handler for Discord Bot simulator
  const handleRunSimulation = async () => {
    setSimLoading(true);
    playClickSound();

    try {
      if (simCommand === 'saldo') {
        const target = simUser.trim() || (yapoAccounts[0]?.robloxUsername || 'MrAlex_Peru');
        const found = yapoAccounts.find(
          (a) => a.robloxUsername.toLowerCase() === target.toLowerCase() || a.dniNumber === target
        );
        if (found) {
          setSimResult({
            type: 'saldo',
            account: found,
            total: found.bankBalance + found.cashBalance,
          });
        } else {
          setSimResult({
            type: 'saldo',
            account: {
              robloxUsername: target,
              fullName: 'QUISPE MAMANI JUAN DIEGO',
              dniNumber: '74829104',
              avatarUrl: 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-310966282D3529E36976BF6B07B1DC90-Png/420/420/AvatarHeadshot/Png/noFilter',
              cashBalance: 45.0,
              bankBalance: 150.0,
            },
            total: 195.0,
          });
        }
      } else if (simCommand === 'dni-ver') {
        const target = simUser.trim() || (registeredDnis[0]?.robloxUsername || 'MrAlex_Peru');
        const found = registeredDnis.find(
          (d) => d.robloxUsername.toLowerCase() === target.toLowerCase() || d.dniNumber === target
        );
        if (found) {
          setSimResult({
            type: 'dni-ver',
            dni: found,
          });
        } else {
          setSimResult({
            type: 'dni-ver',
            dni: {
              dniNumber: '74829104',
              robloxUsername: target,
              fullName: 'QUISPE MAMANI JUAN DIEGO',
              firstSurname: 'QUISPE',
              secondSurname: 'MAMANI',
              prenames: 'JUAN DIEGO',
              birthDate: '2002-05-14',
              gender: 'M',
              department: 'LIMA',
              province: 'LIMA',
              district: 'MIRAFLORES',
              photoUrl: 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-310966282D3529E36976BF6B07B1DC90-Png/420/420/AvatarHeadshot/Png/noFilter',
              status: 'active',
            },
          });
        }
      } else if (simCommand === 'transferir') {
        const amountNum = parseFloat(simAmount) || 25;
        const sender = yapoAccounts[0] || {
          robloxUsername: 'MrAlex_Peru',
          dniNumber: '74829104',
          bankBalance: 200,
        };
        const dest = simDest.trim() || '82910432';
        setSimResult({
          type: 'transferir',
          operationNumber: `OP-${Math.floor(100000 + Math.random() * 900000)}`,
          sender,
          dest,
          amount: amountNum,
          note: simNote.trim() || 'Transferencia por YA P',
          timestamp: new Date().toLocaleTimeString(),
        });
      } else if (simCommand === 'retirar') {
        const amountNum = parseFloat(simAmount) || 20;
        setSimResult({
          type: 'retirar',
          amount: amountNum,
          cashBalance: 40.0,
          bankBalance: 120.0,
          total: 160.0,
        });
      } else if (simCommand === 'depositar') {
        const amountNum = parseFloat(simAmount) || 20;
        setSimResult({
          type: 'depositar',
          amount: amountNum,
          cashBalance: 10.0,
          bankBalance: 150.0,
          total: 160.0,
        });
      } else if (simCommand === 'crear-dni') {
        const cleanUser = simUser.trim() || 'MrAlex_Peru';
        setSimResult({
          type: 'crear-dni',
          dni: {
            dniNumber: `${Math.floor(10000000 + Math.random() * 90000000)}`,
            robloxUsername: cleanUser,
            fullName: 'QUISPE MAMANI JUAN DIEGO',
            firstSurname: 'QUISPE',
            secondSurname: 'MAMANI',
            prenames: 'JUAN DIEGO',
            birthDate: '2002-05-14',
            gender: 'M',
            district: 'MIRAFLORES',
            department: 'LIMA',
            photoUrl: 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-310966282D3529E36976BF6B07B1DC90-Png/420/420/AvatarHeadshot/Png/noFilter',
          },
          bonus: yapoBankConfig.welcomeBonus || 50,
        });
      } else if (simCommand === 'ayuda') {
        setSimResult({ type: 'ayuda' });
      }
      playSuccessSound();
    } catch (e) {
      console.error(e);
    } finally {
      setSimLoading(false);
    }
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
            <div className={`p-3 rounded-2xl border ${
              adminRole === 'db_manager'
                ? 'bg-sky-600/20 border-sky-500/40 text-sky-400'
                : 'bg-red-600/20 border-red-500/40 text-red-500'
            }`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                  adminRole === 'db_manager'
                    ? 'text-sky-300 bg-sky-950 border-sky-500/40'
                    : 'text-red-500 bg-red-950 border-red-500/30'
                }`}>
                  {adminRole === 'db_manager' ? 'OPERADOR DE BASE DE DATOS' : 'STAFF AUTORIZADO'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {adminRole === 'db_manager' ? 'DNI RENIEC & BANCO YA P' : 'Panel Central'}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white uppercase font-sans mt-0.5">
                {adminRole === 'db_manager' ? 'Panel de Base de Datos y Registro Civil' : 'Panel de Administración PE:RP'}
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
          {adminRole === 'db_manager' ? (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('supabase')}
                className={`pb-2.5 px-4 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'supabase' ? 'border-sky-500 text-white bg-sky-950/40 rounded-t-lg' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Database className="w-4 h-4 text-sky-400" />
                <span>Base de Datos DNI (RENIEC)</span>
                {registeredDnis.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-500/40 text-[10px] font-mono">
                    {registeredDnis.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('bank')}
                className={`pb-2.5 px-4 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'bank' ? 'border-purple-500 text-white bg-purple-950/40 rounded-t-lg' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <YapoLogo size="sm" withContainer={false} className="w-4 h-4" />
                <span>Base de Datos Banco YA P</span>
                {yapoAccounts.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 text-[10px] font-mono">
                    {yapoAccounts.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveTab('secrets');
                }}
                className={`pb-2.5 px-4 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'secrets' ? 'border-amber-400 text-white bg-amber-950/40 rounded-t-lg' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Key className="w-4 h-4 text-amber-400" />
                <span>Bóveda & Encriptador</span>
                {secretsConfigured && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            </>
          ) : (
            <>
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
                Banco YA P
                {yapoAccounts.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 text-[10px] font-mono">
                    {yapoAccounts.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('bot')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'bot' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
                Bot de Discord & Comandos
                <span className="px-1.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/40 text-[10px] font-mono">
                  Slash
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveTab('template');
                  setAdminTemplateMessage('');
                }}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'template' ? 'border-sky-400 text-white bg-sky-950/30 rounded-t-lg' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-sky-400" />
                Plantilla DNI (Canva)
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveTab('secrets');
                }}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'secrets' ? 'border-amber-400 text-white bg-amber-950/30 rounded-t-lg' : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Bóveda & Encriptador</span>
                {secretsConfigured && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            </>
          )}
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
                            <strong className={erlcFeedback.serverInfo.isOnline === false ? 'text-amber-400' : 'text-emerald-400'}>
                              {erlcFeedback.serverInfo.isOnline === false ? 'En espera (0 jug.)' : '100% Online'}
                            </strong>
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
                      href="https://apidocs.erlc.gg"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:text-amber-300 text-[10px] flex items-center gap-1 underline"
                    >
                      Documentación api.erlc.gg <ExternalLink className="w-2.5 h-2.5" />
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
                    ¿Cómo obtener y usar tu Server-Key oficial de ER:LC?
                  </h5>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                    <li>Ingresa a Roblox y entra a tu servidor privado de Emergency Response: Liberty County.</li>
                    <li>Abre el menú del servidor (tecla <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-white text-[10px]">M</kbd> &gt; Server Settings).</li>
                    <li>Ve a la pestaña <strong>Developer / API</strong> (requiere el API Pack activo en tu servidor).</li>
                    <li>Genera o copia tu <strong>Server Key</strong> y pégala exactamente en esta casilla.</li>
                    <li>Haz clic en <strong>Guardar y Probar Conexión</strong>. La web conectará con <code>api.erlc.gg/v2/server?players=true</code>. Si tu servidor no tiene jugadores en este momento, marcará 0 jugadores en espera (código 3002). Apenas ingrese un jugador en Roblox, la web actualizará la cifra automáticamente en vivo.</li>
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
                            setLogoUrlInput('');
                            updateConfig({ customLogoUrl: '' });
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
                        onChange={(e) => {
                          const val = e.target.value;
                          setLogoUrlInput(val);
                          setFormData((prev) => ({ ...prev, customLogoUrl: val }));
                        }}
                        placeholder="Pega enlace de imagen (Discord/Imgur/https://...)..."
                        className="flex-1 px-3 py-2 rounded-xl bg-[#0a0c14] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const url = logoUrlInput.trim();
                          setFormData((prev) => ({ ...prev, customLogoUrl: url }));
                          updateConfig({ customLogoUrl: url });
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

              {/* SECTION 2: FOTO DE PORTADA PE:RP STREETS */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#141726] border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <Camera className="w-4 h-4 text-red-500" />
                      2. Foto de Portada (PE:RP Streets Hub)
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cambia la foto principal que se muestra en el inicio al costado del título Streets Hub con la etiqueta PE:RP Streets (Activo).
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 self-start sm:self-auto ${
                    formData.heroCardImage
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                      : 'bg-white/5 text-slate-400 border border-white/10'
                  }`}>
                    {formData.heroCardImage ? 'Portada Personalizada' : 'Portada Original'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Preview */}
                  <div className="relative w-40 h-28 sm:w-48 sm:h-32 shrink-0 rounded-2xl bg-black/60 border border-white/15 overflow-hidden shadow-lg group">
                    <img
                      src={formData.heroCardImage || "/assets/hero-card.png"}
                      alt="Vista previa Portada"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (!target.src.endsWith('/assets/hero-card.png')) {
                          target.src = '/assets/hero-card.png';
                        }
                      }}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 right-2 bg-black/80 text-[9px] font-mono font-bold text-emerald-400 px-1.5 py-0.5 rounded">
                      ACTIVO
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex-1 w-full space-y-3">
                    <input
                      type="file"
                      ref={heroCardInputRef}
                      accept="image/*"
                      onChange={handleHeroCardFileChange}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => heroCardInputRef.current?.click()}
                        disabled={isUploadingHeroCard}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-red-950"
                      >
                        {isUploadingHeroCard ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Cargando portada...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Subir Foto de Portada</span>
                          </>
                        )}
                      </button>

                      {formData.heroCardImage && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, heroCardImage: '' }));
                            setHeroCardUrlInput('');
                            updateConfig({ heroCardImage: '/assets/hero-card.png' });
                            playClickSound();
                          }}
                          className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Restablecer Portada Original
                        </button>
                      )}
                    </div>

                    {/* Direct URL input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={heroCardUrlInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHeroCardUrlInput(val);
                          setFormData((prev) => ({ ...prev, heroCardImage: val }));
                        }}
                        placeholder="Pega enlace de imagen (Discord/Imgur/https://...)..."
                        className="flex-1 px-3 py-2 rounded-xl bg-[#0a0c14] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const url = heroCardUrlInput.trim();
                          setFormData((prev) => ({ ...prev, heroCardImage: url }));
                          updateConfig({ heroCardImage: url });
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

              {/* SECTION 3: FOTO DE CAMIONETA DE PATRULLAJE PNP / SERENAZGO */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#141726] border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <Car className="w-4 h-4 text-blue-400" />
                      3. Foto de Camioneta de Patrullaje Oficial (PNP / Serenazgo)
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cambia la foto de la patrulla oficial en la sección de Facciones Oficiales (Policía Nacional del Perú - 105 PNP).
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 self-start sm:self-auto ${
                    formData.customPatrolTruckUrl
                      ? 'bg-blue-950/80 text-blue-300 border border-blue-500/40'
                      : 'bg-white/5 text-slate-400 border border-white/10'
                  }`}>
                    {formData.customPatrolTruckUrl ? 'Patrulla Personalizada' : 'Patrulla Original'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Preview */}
                  <div className="relative w-40 h-28 sm:w-48 sm:h-32 shrink-0 rounded-2xl bg-black/60 border border-white/15 overflow-hidden shadow-lg group">
                    <img
                      src={formData.customPatrolTruckUrl || "/src/assets/images/peru_police_patrol_night_1792084208478.jpg"}
                      alt="Vista previa Patrulla PNP"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 right-2 bg-black/80 text-[9px] font-mono font-bold text-blue-400 px-1.5 py-0.5 rounded">
                      105 PNP
                    </div>
                  </div>

                  {/* Controls */}
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
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-blue-950"
                      >
                        {isUploadingTruck ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Cargando patrulla...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Subir Foto de Patrulla PNP</span>
                          </>
                        )}
                      </button>

                      {formData.customPatrolTruckUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, customPatrolTruckUrl: '' }));
                            setTruckUrlInput('');
                            updateConfig({ customPatrolTruckUrl: '' });
                            playClickSound();
                          }}
                          className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Restablecer Patrulla Original
                        </button>
                      )}
                    </div>

                    {/* Direct URL input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={truckUrlInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTruckUrlInput(val);
                          setFormData((prev) => ({ ...prev, customPatrolTruckUrl: val }));
                        }}
                        placeholder="Pega enlace de imagen de patrulla (Discord/Imgur/https://...)..."
                        className="flex-1 px-3 py-2 rounded-xl bg-[#0a0c14] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const url = truckUrlInput.trim();
                          setFormData((prev) => ({ ...prev, customPatrolTruckUrl: url }));
                          updateConfig({ customPatrolTruckUrl: url });
                          playSuccessSound();
                        }}
                        className="px-3 py-2 rounded-xl bg-[#14233e] hover:bg-[#1a3055] text-blue-200 hover:text-white text-xs font-bold cursor-pointer"
                      >
                        Aplicar URL
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: LOGO OFICIAL DEL BANCO YA P (S/.) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#141726] border border-purple-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      4. Logo Oficial del Banco YA P (S/.)
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Personaliza o sube una imagen para el logo de YA P. Se actualizará en la billetera virtual, transferencias y barra de navegación.
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 self-start sm:self-auto ${
                    formData.yapoLogoUrl
                      ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                      : 'bg-white/5 text-slate-400 border border-white/10'
                  }`}>
                    {formData.yapoLogoUrl ? 'Logo YA P Personalizado' : 'Logo YA P Original'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Preview */}
                  <div className="relative w-28 h-28 shrink-0 rounded-2xl bg-[#090b14] border border-purple-500/40 flex items-center justify-center p-2 shadow-lg overflow-hidden">
                    {formData.yapoLogoUrl ? (
                      <img
                        src={formData.yapoLogoUrl}
                        alt="Logo YA P"
                        className="w-full h-full object-contain drop-shadow-md select-none rounded-xl"
                      />
                    ) : (
                      <YapoLogo size="lg" />
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex-1 w-full space-y-3">
                    <input
                      type="file"
                      ref={yapoLogoInputRef}
                      accept="image/*"
                      onChange={handleYapoLogoFileChange}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => yapoLogoInputRef.current?.click()}
                        disabled={isUploadingYapoLogo}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-purple-950"
                      >
                        {isUploadingYapoLogo ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Cargando logo...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Subir Logo de YA P</span>
                          </>
                        )}
                      </button>

                      {formData.yapoLogoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, yapoLogoUrl: '' }));
                            setYapoLogoUrlInput('');
                            updateConfig({ yapoLogoUrl: '' });
                            playClickSound();
                          }}
                          className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Restablecer Original
                        </button>
                      )}
                    </div>

                    {/* Direct URL input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={yapoLogoUrlInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setYapoLogoUrlInput(val);
                          setFormData((prev) => ({ ...prev, yapoLogoUrl: val }));
                        }}
                        placeholder="Pega enlace directo de imagen (Discord/Imgur/https://...)..."
                        className="flex-1 px-3 py-2 rounded-xl bg-[#0a0c14] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const url = yapoLogoUrlInput.trim();
                          setFormData((prev) => ({ ...prev, yapoLogoUrl: url }));
                          updateConfig({ yapoLogoUrl: url });
                          playSuccessSound();
                        }}
                        className="px-3 py-2 rounded-xl bg-[#2a1742] hover:bg-[#39215c] text-purple-200 hover:text-white text-xs font-bold cursor-pointer"
                      >
                        Aplicar URL
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5: SEGURIDAD Y GESTIÓN DEL ÁLBUM */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#141726] border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <Camera className="w-4 h-4 text-red-500" />
                      5. Seguridad y Gestión del Álbum Comunitario
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
                          onError={(e) => {
                            const fallbackIdx = (i % 4) + 1;
                            const target = e.currentTarget as HTMLImageElement;
                            target.src = `/assets/album/album_${fallbackIdx}.webp`;
                          }}
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
              {adminRole === 'db_manager' ? (
                <div className="p-4 rounded-2xl bg-[#091522] border border-sky-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Database className="w-5 h-5 text-sky-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-sky-300">
                        Base de Datos Ciudadana RENIEC (DNI Peruano)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Padrón oficial de ciudadanos de PE:RP. Consulta de registros, aplicación de medidas cautelares y reinicio administrativo de documentos.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-sky-950 border border-sky-500/40 text-[10px] font-mono text-sky-300 font-bold shrink-0">
                    MODO OPERADOR DB
                  </span>
                </div>
              ) : (
                <>
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

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(COMBINED_SUPABASE_SQL);
                            setCopiedSql(true);
                            playSuccessSound();
                            setTimeout(() => setCopiedSql(false), 2500);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-purple-500/40"
                          title="Copia el script SQL completo que crea tanto peru_dnis como yapo_accounts y yapo_transactions"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>{copiedSql ? '¡SQL Completo Copiado!' : 'Copiar SQL Completo (DNI + YA P)'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

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

                        <div className="flex items-center gap-2">
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

                          {/* Direct Reiniciar DNI Button on Row */}
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (window.confirm(`¿Seguro que deseas reiniciar el DNI de @${dni.robloxUsername}? El ciudadano podrá volver a tramitarlo.`)) {
                                await deleteDniByAdmin(dni.discordId);
                                setRegisteredDnis((prev) => prev.filter((d) => d.id !== dni.id));
                                if (selectedCitizen?.id === dni.id) setSelectedCitizen(null);
                                playSuccessSound();
                                setAdminFeedback(`DNI de @${dni.robloxUsername} reiniciado exitosamente.`);
                              }
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                            title="Reiniciar este DNI"
                          >
                            <RotateCcw className="w-3 h-3 text-rose-400" />
                            <span>Reiniciar DNI</span>
                          </button>
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
                        Administración Central: Banco YA P (PE:RP)
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
                        setYapoFeedback(`No se encontró ninguna cuenta de Banco YA P con el usuario o DNI "@${q}".`);
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
                          Saldo en Banco YA P (S/.)
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
                          setYapoFeedback(nextFreeze ? '❄️ Cuenta de Banco YA P CONGELADA correctamente.' : '🔓 Cuenta de Banco YA P DESCONGELADA.');
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
                          if (window.confirm(`¿Seguro que deseas reiniciar la cuenta Banco YA P de @${selectedYapoAccount.robloxUsername}? Se borrarán sus fondos y podrá afiliarse nuevamente.`)) {
                            resetYapoAccount(selectedYapoAccount.dniNumber);
                            setYapoAccounts((prev) => prev.filter((a) => a.id !== selectedYapoAccount.id));
                            setSelectedYapoAccount(null);
                            playSuccessSound();
                            setYapoFeedback(`Cuenta Banco YA P de @${selectedYapoAccount.robloxUsername} reiniciada exitosamente.`);
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

              {/* GENERAL BANK & BOT CONFIGURATION (Superadmin Only - Hidden for DB Manager) */}
              {adminRole !== 'db_manager' && (
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
                      <span>{copiedYapoSql ? '¡SQL Copiado!' : 'Copiar SQL Tablas Banco YA P'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* REGISTERED YAPO ACCOUNTS PADRÓN */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                      Padrón de Cuentas Banco YA P Afiliadas ({yapoAccounts.length})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Haz clic en cualquier ciudadano para editar su saldo o congelar su cuenta.
                    </span>
                  </div>

                  {yapoAccounts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('¿Seguro que deseas reiniciar y borrar TODAS las cuentas de Banco YA P y sus saldos? Los usuarios deberán afiliarse de nuevo.')) {
                          resetAllYapo();
                          setYapoAccounts([]);
                          setSelectedYapoAccount(null);
                          playSuccessSound();
                          alert('Todas las cuentas de Banco YA P han sido reiniciadas.');
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reiniciar Todas las Cuentas Banco YA P</span>
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
                    Aún no hay cuentas de Banco YA P creadas. Los ciudadanos que verifiquen su DNI y se afilien a YA P aparecerán aquí en tiempo real.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 7: DISCORD BOT & SLASH COMMANDS CONFIGURATION & SIMULATOR */}
          {activeTab === 'bot' && (
            <div className="space-y-6">
              
              {/* Header Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-[#10142b] to-black border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold uppercase tracking-wider text-white">
                        Configuración del Bot de Discord & Comandos Slash
                      </h4>
                      <p className="text-xs text-slate-300">
                        Sincronización completa con Banco YA P, DNI con Avatar de Roblox y economía estilo UnbelievaBoat.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/40 text-[10px] font-mono font-bold">
                    discord.js v14
                  </span>
                </div>
              </div>

              {/* Security Banner */}
              <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-white">🔒 Seguridad Garantizada — Sin Comandos Administrativos en el Bot:</strong>
                  <br />
                  Para proteger la economía y orden del servidor PE:RP, los comandos de Discord son <strong>100% ciudadanos</strong> (/crear-dni, /dni-ver, /saldo, /transferir, /retirar, /depositar, /historial, /ayuda).
                  Todas las funciones de <em>congelar cuentas, editar saldos, reiniciar bases de datos o suspender ciudadanos</em> se gestionan <strong>exclusivamente desde este panel web con contraseña</strong>.
                </div>
              </div>

              {/* STEP BY STEP GUIDE ("QUÉ SE DEBE HACER PARA CONFIGURAR CADA COSA") */}
              <div className="p-4 rounded-2xl bg-[#090b16] border border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h5 className="font-bold text-white text-xs uppercase tracking-wider">
                      Guía Paso a Paso: ¿Qué se debe hacer para configurar el Bot?
                    </h5>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadBotZip}
                      disabled={isDownloadingBot}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                      title="Descargar paquete completo en .ZIP para subir a Discloud, Bot-Hosting o VPS"
                    >
                      {isDownloadingBot ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                          <span>Descargando...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Descargar Bot (.ZIP 24/7)</span>
                        </>
                      )}
                    </button>
                    <a
                      href="/perp-discord-bot-24-7.zip"
                      download="perp-discord-bot-24-7.zip"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-teal-600/30 hover:bg-teal-600/50 text-teal-300 border border-teal-500/40 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Descarga directa directa sin bloqueos de navegador"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Enlace Directo</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleOpenBotFiles}
                      className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Ver y copiar todos los archivos del bot directamente en pantalla sin necesidad de descargar ZIP"
                    >
                      <FileCode className="w-3 h-3" />
                      <span>{showBotFilesModal ? 'Ocultar Archivos' : 'Ver Código de Archivos'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const envText = `DISCORD_TOKEN=${yapoBankConfig.discordBotToken || 'tu_token_aqui'}\nCLIENT_ID=${clientId || 'tu_client_id_aqui'}\nGUILD_ID=id_de_tu_servidor\nAPI_BASE_URL=http://localhost:3000`;
                        navigator.clipboard.writeText(envText);
                        setCopiedBotEnv(true);
                        playSuccessSound();
                        setTimeout(() => setCopiedBotEnv(false), 2500);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedBotEnv ? '¡.env Copiado!' : 'Copiar Plantilla .env'}</span>
                    </button>
                  </div>
                </div>

                {/* INTERACTIVE IN-BROWSER BOT FILE EXPLORER */}
                {showBotFilesModal && (
                  <div className="p-4 rounded-2xl bg-[#070810] border border-purple-500/40 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-purple-400" />
                        <h6 className="text-xs font-bold text-white uppercase tracking-wider">
                          Explorador de Archivos del Bot (Copiar y Pegar Directo)
                        </h6>
                      </div>
                      <div className="flex items-center gap-2">
                        {botFiles && botFiles[selectedBotFile] && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(botFiles[selectedBotFile]);
                              setCopiedFileKey(selectedBotFile);
                              playSuccessSound();
                              setTimeout(() => setCopiedFileKey(null), 2500);
                            }}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedFileKey === selectedBotFile ? '¡Copiado al Portapapeles!' : `Copiar ${selectedBotFile}`}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowBotFilesModal(false)}
                          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white text-xs cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isLoadingBotFiles ? (
                      <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        <span>Cargando archivos del bot...</span>
                      </div>
                    ) : botFiles ? (
                      <div className="space-y-3">
                        {/* File Tabs */}
                        <div className="flex flex-wrap gap-1.5 pb-1 border-b border-white/5">
                          {Object.keys(botFiles).sort().map((fname) => (
                            <button
                              key={fname}
                              type="button"
                              onClick={() => {
                                setSelectedBotFile(fname);
                                playClickSound();
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                                selectedBotFile === fname
                                  ? 'bg-purple-600 text-white shadow'
                                  : 'bg-black/40 text-slate-400 hover:text-white border border-white/5 hover:border-white/20'
                              }`}
                            >
                              {fname}
                            </button>
                          ))}
                        </div>

                        {/* File Code Display */}
                        <div className="relative">
                          <pre className="p-3.5 rounded-xl bg-black/80 border border-white/10 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-80 select-all leading-relaxed whitespace-pre-wrap">
                            {botFiles[selectedBotFile] || '// Archivo vacío'}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 py-3 text-center">
                        No se pudieron cargar los archivos. Usa el botón de Descargar ZIP o Enlace Directo.
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3 text-xs text-slate-300">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                    <div className="font-bold text-indigo-300 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-[10px] text-white">1</span>
                      Crear la Aplicación en Discord Developer Portal
                    </div>
                    <p className="text-slate-400 pl-7 text-[11px] leading-relaxed">
                      Entra a <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline font-semibold">Discord Developer Portal</a>, crea una aplicación llamada <strong>Banco YA P - PE:RP</strong>. En la pestaña <em>Bot</em>, haz clic en <strong>Reset Token</strong> y copia tu <strong>DISCORD_TOKEN</strong>. En <em>General Information</em> copia tu <strong>Application ID</strong> (es tu <strong>CLIENT_ID</strong>).
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                    <div className="font-bold text-sky-300 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-sky-950 border border-sky-500/40 flex items-center justify-center text-[10px] text-white">2</span>
                      Activar Privileged Gateway Intents
                    </div>
                    <p className="text-slate-400 pl-7 text-[11px] leading-relaxed">
                      En la pestaña <em>Bot</em> del Developer Portal, baja hasta la sección <strong>Privileged Gateway Intents</strong> y activa <strong>Server Members Intent</strong> y <strong>Message Content Intent</strong> para que el bot pueda leer interacciones de usuarios en el servidor.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                    <div className="font-bold text-purple-300 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-950 border border-purple-500/40 flex items-center justify-center text-[10px] text-white">3</span>
                      Invitar el Bot a tu Servidor con Permisos Slash
                    </div>
                    <p className="text-slate-400 pl-7 text-[11px] leading-relaxed">
                      En <em>OAuth2</em> → <em>URL Generator</em>, marca <code>bot</code> y <code>applications.commands</code>. En permisos selecciona: <em>Send Messages</em>, <em>Embed Links</em>, <em>Attach Files</em> y <em>Read Message History</em>. Abre el enlace en tu navegador para invitarlo al servidor de tu comunidad PE:RP.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
                    <div className="font-bold text-emerald-300 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-[10px] text-white">4</span>
                      Desplegar Comandos Slash y Encender el Bot en Node.js
                    </div>
                    <div className="pl-7 font-mono text-[11px] space-y-1 text-slate-300">
                      <div className="p-2 rounded-lg bg-black/60 border border-white/10 text-emerald-400">
                        cd discord-bot<br />
                        npm install<br />
                        npm run deploy <span className="text-slate-500"># Registra instantáneamente los comandos Slash</span><br />
                        npm start <span className="text-slate-500"># Enciende el bot conectado a Banco YA P</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-sans">
                        Los archivos ya están creados en la carpeta <code>discord-bot/</code> (<code>index.js</code>, <code>deploy-commands.js</code>, <code>package.json</code> y <code>README.md</code>).
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-amber-500/20 space-y-1.5">
                    <div className="font-bold text-amber-300 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-950 border border-amber-500/40 flex items-center justify-center text-[10px] text-white">5</span>
                      Subir a Hosting 24/7 (Sin necesidad de tener tu PC encendida)
                    </div>
                    <div className="pl-7 text-[11px] text-slate-300 space-y-2 leading-relaxed">
                      <p>
                        Haz clic en el botón superior <strong className="text-emerald-400">"Descargar Bot (.ZIP 24/7)"</strong> para obtener todos los archivos empaquetados listos para subir:
                      </p>
                      <ul className="list-disc list-inside text-slate-400 space-y-1 text-[10.5px]">
                        <li><strong className="text-white">Discloud (Recomendado & Gratis):</strong> Inicia sesión en <a href="https://discloud.com" target="_blank" rel="noreferrer" className="text-amber-400 underline font-semibold">discloud.com</a> y sube el archivo <code>.zip</code> (ya viene con <code>discloud.config</code> configurado con RAM optimizada y auto-reinicio).</li>
                        <li><strong className="text-white">Bot-Hosting.net (Pterodactyl Gratis):</strong> Crea un servidor Node.js y sube los archivos al File Manager. Comando: <code>node index.js</code>.</li>
                        <li><strong className="text-white">Render / Railway:</strong> Conecta tu repo y arranca como Background Worker (ya incluye <code>Procfile</code> y <code>Dockerfile</code>).</li>
                        <li><strong className="text-white">VPS Propio (Linux/Ubuntu):</strong> Ejecuta <code>pm2 start ecosystem.config.cjs</code> para que permanezca activo sin interrupciones.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* LIST OF BOT COMMANDS */}
              <div className="p-4 rounded-2xl bg-[#090b16] border border-white/10 space-y-3">
                <h5 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <Coins className="w-4 h-4 text-purple-400" />
                  Comandos de Discord Disponibles para los Ciudadanos:
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-black/40 border border-purple-500/20 space-y-1">
                    <strong className="text-purple-300">/saldo [usuario_o_dni]</strong>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Desglose idéntico a UnbelievaBoat: 💵 <strong>En mano</strong>, 🏦 <strong>Banco YA P</strong> y 💰 <strong>Total</strong>.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-sky-500/20 space-y-1">
                    <strong className="text-sky-300">/dni-ver [usuario_o_dni]</strong>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Muestra la foto del DNI con botones interactivos <strong>[📄 Anverso]</strong> y <strong>[🔄 Reverso]</strong> con código MRZ.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/20 space-y-1">
                    <strong className="text-emerald-300">/crear-dni &lt;datos&gt;</strong>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Registra nombres, apellidos y usuario de Roblox. Asigna DNI peruano y foto de avatar automáticamente.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-amber-500/20 space-y-1">
                    <strong className="text-amber-300">/transferir &lt;dni o @user&gt; &lt;monto&gt;</strong>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Envía Soles por YA P. Valida saldo en banco, transfiere y genera comprobante con número de operación.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-teal-500/20 space-y-1">
                    <strong className="text-teal-300">/retirar &lt;monto&gt;</strong>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Retira dinero de tu Banco YA P para tenerlo en efectivo (en mano) para el roleplay.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-black/40 border border-teal-500/20 space-y-1">
                    <strong className="text-teal-300">/depositar &lt;monto&gt;</strong>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Deposita efectivo de tu mano a tu cuenta de Banco YA P.
                    </p>
                  </div>
                </div>
              </div>

              {/* LIVE DISCORD COMMAND SIMULATOR & TESTER */}
              <div className="p-4 rounded-2xl bg-[#090b16] border border-indigo-500/40 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                    <div>
                      <h5 className="font-bold text-white text-xs uppercase tracking-wider">
                        Probador y Simulador en Vivo de Comandos de Discord
                      </h5>
                      <p className="text-[10px] text-slate-400">
                        Prueba aquí mismo en pantalla cómo responderá el bot a los usuarios en Discord.
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono">
                    Live Embed Tester
                  </span>
                </div>

                {/* Command Selector & Parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Comando a Probar:
                    </label>
                    <select
                      value={simCommand}
                      onChange={(e: any) => {
                        setSimCommand(e.target.value);
                        setSimResult(null);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-indigo-400 cursor-pointer"
                    >
                      <option value="saldo">/saldo (En mano, Banco, Total)</option>
                      <option value="dni-ver">/dni-ver (Foto DNI + Botones Anverso/Reverso)</option>
                      <option value="transferir">/transferir (Envío YA P + Comprobante)</option>
                      <option value="crear-dni">/crear-dni (Registro ciudadano + Avatar)</option>
                      <option value="retirar">/retirar (De Banco a Mano)</option>
                      <option value="depositar">/depositar (De Mano a Banco)</option>
                      <option value="ayuda">/ayuda (Guía de comandos)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Usuario de Roblox o DNI:
                    </label>
                    <input
                      type="text"
                      value={simUser}
                      onChange={(e) => setSimUser(e.target.value)}
                      placeholder="ej. MrAlex_Peru o 74829104"
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Monto (S/. Soles):
                    </label>
                    <input
                      type="number"
                      value={simAmount}
                      onChange={(e) => setSimAmount(e.target.value)}
                      placeholder="25.00"
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>

                {simCommand === 'transferir' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Destinatario (DNI o Usuario Roblox):
                      </label>
                      <input
                        type="text"
                        value={simDest}
                        onChange={(e) => setSimDest(e.target.value)}
                        placeholder="ej. 82910432 o StumbleAlex"
                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Motivo / Concepto:
                      </label>
                      <input
                        type="text"
                        value={simNote}
                        onChange={(e) => setSimNote(e.target.value)}
                        placeholder="ej. Pago de gasolina"
                        className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleRunSimulation}
                    disabled={simLoading}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-950 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{simLoading ? 'Simulando respuesta...' : '▶️ Probar y Simular Comando en Discord'}</span>
                  </button>
                </div>

                {/* DISCORD MESSAGE INTERFACE MOCKUP */}
                {simResult && (
                  <div className="rounded-2xl bg-[#313338] border border-[#1e1f22] p-4 text-slate-200 font-sans shadow-2xl space-y-3">
                    {/* Discord Author Header */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow">
                        YA
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-sm">Banco YA P</span>
                        <span className="px-1 py-0.2 rounded bg-[#5865F2] text-white text-[9px] font-bold uppercase">
                          BOT
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono ml-1">Hoy a las {new Date().toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* Discord Embed Output */}
                    <div className="ml-11">
                      
                      {/* 1. SIMULATION: /saldo */}
                      {simResult.type === 'saldo' && (
                        <div className="p-3.5 rounded-lg bg-[#2b2d31] border-l-4 border-purple-500 space-y-2.5 max-w-lg">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-bold text-white text-sm">
                                🏦 Estado de Cuenta Bancaria — @{simResult.account.robloxUsername}
                              </div>
                              <p className="text-[11px] text-slate-300">
                                <strong>Banco YA P & Billetera Móvil Oficial PE:RP</strong><br />
                                Titular: {simResult.account.fullName} • DNI: <code className="bg-black/40 px-1 py-0.5 rounded text-purple-300">{simResult.account.dniNumber}</code>
                              </p>
                            </div>
                            <img
                              src={simResult.account.avatarUrl}
                              alt="Avatar"
                              className="w-12 h-12 rounded-lg bg-black border border-white/20 shrink-0"
                            />
                          </div>

                          <div className="space-y-1.5 font-mono text-xs pt-1 border-t border-white/10">
                            <div className="flex justify-between p-2 rounded bg-black/40">
                              <span className="text-slate-300 font-sans">💵 Dinero en Mano (Cash):</span>
                              <span className="text-teal-300 font-bold">S/ {simResult.account.cashBalance.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between p-2 rounded bg-black/40">
                              <span className="text-slate-300 font-sans">🏦 Dinero en Banco (Banco YA P):</span>
                              <span className="text-purple-300 font-bold">S/ {simResult.account.bankBalance.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between p-2 rounded bg-purple-950/40 border border-purple-500/30">
                              <span className="text-amber-300 font-sans font-bold">💰 Patrimonio Total:</span>
                              <span className="text-amber-300 font-black text-sm">S/ {simResult.total.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between">
                            <span>Banco YA P PE:RP • Retira con /retirar o deposita con /depositar</span>
                          </div>
                        </div>
                      )}

                      {/* 2. SIMULATION: /dni-ver (WITH INTERACTIVE BUTTONS!) */}
                      {simResult.type === 'dni-ver' && (
                        <div className="space-y-2.5 max-w-lg">
                          <div className="p-3.5 rounded-lg bg-[#2b2d31] border-l-4 border-sky-500 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-bold text-white text-sm">
                                  🇵🇪 REPÚBLICA DEL PERÚ — {simDniSide === 'front' ? 'DOCUMENTO NACIONAL DE IDENTIDAD [ANVERSO]' : 'DOCUMENTO NACIONAL DE IDENTIDAD [REVERSO]'}
                                </div>
                                <p className="text-[11px] text-slate-300">
                                  <strong>REGISTRO NACIONAL DE IDENTIFICACIÓN Y ESTADO CIVIL (RENIEC)</strong><br />
                                  DNI Electrónico Oficial PE:RP • Ciudadano: @{simResult.dni.robloxUsername}
                                </p>
                              </div>
                              <img
                                src={simResult.dni.photoUrl}
                                alt="Avatar"
                                className="w-14 h-14 rounded-lg bg-black border border-sky-400 shrink-0"
                              />
                            </div>

                            {simDniSide === 'front' ? (
                              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-black/30 p-2.5 rounded-lg">
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-sans">🆔 CÚI / N° DNI:</span>
                                  <span className="text-white font-bold">{simResult.dni.dniNumber}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-sans">⚧️ SEXO:</span>
                                  <span className="text-white font-bold">{simResult.dni.gender === 'F' ? 'FEMENINO' : 'MASCULINO'}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-sans">PRIMER APELLIDO:</span>
                                  <span className="text-white font-bold">{simResult.dni.firstSurname}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-sans">SEGUNDO APELLIDO:</span>
                                  <span className="text-white font-bold">{simResult.dni.secondSurname}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-[10px] text-slate-400 block font-sans">PRENOMBRES:</span>
                                  <span className="text-white font-bold">{simResult.dni.prenames}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-sans">NACIMIENTO:</span>
                                  <span className="text-white font-bold">{simResult.dni.birthDate}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-sans">ESTADO:</span>
                                  <span className="text-emerald-400 font-bold">🟢 EMITIDO Y VÁLIDO</span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2 text-xs font-mono bg-black/30 p-2.5 rounded-lg">
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-sans">📍 DOMICILIO & UBIGEO:</span>
                                  <span className="text-white font-bold">{simResult.dni.district || 'MIRAFLORES'}, {simResult.dni.department || 'LIMA'}</span>
                                </div>
                                <div className="p-2 rounded bg-black/60 border border-white/10 font-mono text-[10px] text-sky-300">
                                  IDPER{simResult.dni.dniNumber}&lt;7&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;<br />
                                  0205148M3010195PER&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;0<br />
                                  {simResult.dni.firstSurname}&lt;&lt;{simResult.dni.prenames.split(' ')[0]}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
                                </div>
                                <span className="text-[10px] text-emerald-400">🔏 Huella digital y firma electrónica registradas</span>
                              </div>
                            )}

                            <div className="text-[10px] text-slate-400 pt-1">
                              PE:RP Streets • Vista activa: <strong>{simDniSide === 'front' ? '[ANVERSO FRONTAL]' : '[REVERSO POSTERIOR]'}</strong>
                            </div>
                          </div>

                          {/* Interactive Discord ActionRow Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSimDniSide('front');
                                playClickSound();
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                simDniSide === 'front'
                                  ? 'bg-[#5865F2] text-white shadow'
                                  : 'bg-[#4e5058] hover:bg-[#6d6f78] text-slate-200'
                              }`}
                            >
                              📄 Ver Anverso
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSimDniSide('back');
                                playClickSound();
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                simDniSide === 'back'
                                  ? 'bg-[#5865F2] text-white shadow'
                                  : 'bg-[#4e5058] hover:bg-[#6d6f78] text-slate-200'
                              }`}
                            >
                              🔄 Ver Reverso
                            </button>
                            <span className="text-[10px] text-slate-400 italic">
                              (Botones interactivos en vivo)
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 3. SIMULATION: /transferir */}
                      {simResult.type === 'transferir' && (
                        <div className="p-3.5 rounded-lg bg-[#2b2d31] border-l-4 border-emerald-500 space-y-2.5 max-w-lg">
                          <div className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                            <span>✅ ¡YA P Enviado con Éxito!</span>
                          </div>
                          <p className="text-[11px] text-slate-300">
                            <strong>COMPROBANTE ELECTRÓNICO OFICIAL DE BANCO YA P</strong><br />
                            Operación: <code className="bg-black/40 px-1 py-0.5 rounded text-white">{simResult.operationNumber}</code>
                          </p>

                          <div className="p-2.5 rounded bg-black/40 space-y-1.5 text-xs font-mono">
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-sans">📤 Emisor:</span>
                              <span className="text-white font-bold">@{simResult.sender.robloxUsername}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-sans">📥 Destinatario:</span>
                              <span className="text-purple-300 font-bold">{simResult.dest}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-white/10 text-sm">
                              <span className="text-slate-300 font-sans">💸 Monto Enviado:</span>
                              <span className="text-emerald-300 font-black">S/. {simResult.amount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-sans">📝 Motivo:</span>
                              <span className="text-slate-300">{simResult.note}</span>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-400">
                            Banco YA P • Tu dinero seguro e instantáneo en PE:RP Streets
                          </div>
                        </div>
                      )}

                      {/* 4. SIMULATION: /retirar or /depositar */}
                      {(simResult.type === 'retirar' || simResult.type === 'depositar') && (
                        <div className="p-3.5 rounded-lg bg-[#2b2d31] border-l-4 border-teal-500 space-y-2.5 max-w-lg">
                          <div className="font-bold text-teal-300 text-sm">
                            {simResult.type === 'retirar' ? '🏧 Cajero ATM: Retiro a la Mano Exitoso' : '🏦 Depósito en Banco YA P Exitoso'}
                          </div>
                          <p className="text-xs text-slate-200">
                            Has {simResult.type === 'retirar' ? 'retirado' : 'depositado'} <strong>S/. {simResult.amount.toFixed(2)}</strong> exitosamente.
                          </p>
                          <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-black/40 p-2.5 rounded">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-sans">💵 En Mano:</span>
                              <span className="text-teal-300 font-bold">S/ {simResult.cashBalance.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-sans">🏦 Banco:</span>
                              <span className="text-purple-300 font-bold">S/ {simResult.bankBalance.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-sans">💰 Total:</span>
                              <span className="text-amber-300 font-bold">S/ {simResult.total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 5. SIMULATION: /crear-dni */}
                      {simResult.type === 'crear-dni' && (
                        <div className="p-3.5 rounded-lg bg-[#2b2d31] border-l-4 border-sky-500 space-y-2.5 max-w-lg">
                          <div className="font-bold text-sky-300 text-sm">
                            🎉 ¡DNI Tramitado y Emitido con Éxito!
                          </div>
                          <p className="text-xs text-slate-200">
                            Se ha generado tu DNI electrónico oficial <strong>{simResult.dni.dniNumber}</strong> vinculado a tu avatar de Roblox (@{simResult.dni.robloxUsername}) y se te acreditó un bono de <strong>S/. {simResult.bonus.toFixed(2)}</strong> en tu cuenta de Banco YA P.
                          </p>
                          <div className="flex items-center gap-3 p-2 bg-black/40 rounded">
                            <img src={simResult.dni.photoUrl} alt="Avatar" className="w-10 h-10 rounded border border-sky-400" />
                            <div className="text-xs">
                              <strong className="text-white">{simResult.dni.fullName}</strong>
                              <span className="text-[10px] text-slate-400 block">DNI: {simResult.dni.dniNumber} • {simResult.dni.district}, {simResult.dni.department}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 6. SIMULATION: /ayuda */}
                      {simResult.type === 'ayuda' && (
                        <div className="p-3.5 rounded-lg bg-[#2b2d31] border-l-4 border-red-500 space-y-2 max-w-lg text-xs">
                          <div className="font-bold text-red-400 text-sm">
                            🇵🇪 Comandos Oficiales de PE:RP Streets & Banco YA P
                          </div>
                          <p className="text-[11px] text-slate-300">
                            Usa estos comandos en cualquier canal autorizado de Discord:
                          </p>
                          <ul className="space-y-1 font-mono text-[11px] text-slate-300">
                            <li><strong className="text-purple-300">/saldo</strong> — Consulta en mano, banco y total.</li>
                            <li><strong className="text-sky-300">/dni-ver</strong> — Muestra foto de DNI con botones Anverso/Reverso.</li>
                            <li><strong className="text-emerald-300">/crear-dni</strong> — Registra tus datos ciudadanos y Roblox.</li>
                            <li><strong className="text-amber-300">/transferir</strong> — Envía Soles por YA P por DNI o usuario.</li>
                            <li><strong className="text-teal-300">/retirar</strong> — Saca Soles de tu Banco a tu mano.</li>
                            <li><strong className="text-teal-300">/depositar</strong> — Guarda efectivo en tu Banco YA P.</li>
                          </ul>
                        </div>
                      )}

                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 8: DNI TEMPLATE MANAGEMENT (CANVA / CUSTOM PNG / OFFICIAL) */}
          {activeTab === 'template' && (
            <div className="space-y-6">
              
              {/* Header Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/80 via-[#0e1628] to-black border border-sky-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center">
                      <Palette className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white font-sans uppercase">
                        Gestión de Plantilla de DNI Oficial (Panel de Administración)
                      </h3>
                      <p className="text-[11px] text-slate-300">
                        Esta sección es de acceso exclusivo de administradores. La plantilla que configures aquí se aplicará en vivo a toda la web y al generador del bot de Discord.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feedback Alert */}
              {adminTemplateMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2.5 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{adminTemplateMessage}</span>
                </div>
              )}

              {/* Live Preview Box */}
              <div className="p-5 rounded-2xl bg-[#0a0d18] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    Vista Previa de la Plantilla Activa (1119 x 669 px):
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    Sincronizada con Web & Bot
                  </span>
                </div>

                <div className="max-w-[500px] mx-auto aspect-[1119/669] rounded-2xl overflow-hidden border border-sky-400/30 bg-[#e7edf5] shadow-2xl relative">
                  <img
                    src={adminTemplateSrc || OFFICIAL_DNI_TEMPLATE_BASE64}
                    alt="Plantilla DNI Admin"
                    className="w-full h-full object-fill pointer-events-none"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = OFFICIAL_DNI_TEMPLATE_BASE64;
                    }}
                  />
                </div>
              </div>

              {/* Upload & Link Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Method 1: Upload file */}
                <div className="p-4 rounded-2xl bg-[#0d1222] border border-sky-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <Upload className="w-4 h-4 text-sky-400" />
                    <span>Opción A: Subir archivo PNG/JPG (Canva)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Sube directamente tu plantilla exportada de Canva o diseño local. Se procesará y guardará en el sistema.
                  </p>
                  <input
                    ref={adminTemplateFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleAdminUploadTemplate}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => adminTemplateFileInputRef.current?.click()}
                    className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Seleccionar imagen de plantilla</span>
                  </button>
                </div>

                {/* Method 2: Canva or Direct URL */}
                <div className="p-4 rounded-2xl bg-[#0d1222] border border-sky-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <LinkIcon className="w-4 h-4 text-purple-400" />
                    <span>Opción B: Enlace directo o Canva</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Pega una URL directa de tu plantilla (enlace de imagen Canva, Discord o hosting externo).
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://ejemplo.com/plantilla.png"
                      value={adminCanvaUrlInput}
                      onChange={(e) => setAdminCanvaUrlInput(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                    />
                    <button
                      type="button"
                      onClick={handleAdminApplyCanvaUrl}
                      disabled={isAdminSavingTemplate || !adminCanvaUrlInput.trim()}
                      className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer shadow-md"
                    >
                      {isAdminSavingTemplate ? 'Cargando...' : 'Aplicar'}
                    </button>
                  </div>
                </div>

              </div>

              {/* Reset to official template */}
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 flex items-center justify-between">
                <div>
                  <strong className="block text-white text-xs">Plantilla Oficial de RENIEC PE:RP</strong>
                  <span className="text-[11px] text-slate-400">
                    Si modificaste la plantilla y deseas volver a la versión original por defecto, haz clic en restaurar.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAdminResetTemplate}
                  className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar Oficial</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB: SECRETS VAULT & ENCRIPTADOR */}
          {activeTab === 'secrets' && (
            <div className="space-y-6">
              
              {/* Header Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#101426] to-amber-950/20 border border-amber-500/30">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
                    <Key className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black uppercase text-amber-300 tracking-wider">
                        Bóveda Central de Secrets & Bases de Datos
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        GLOBAL & PERSISTENTE
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Guarda aquí los tokens y credenciales de Supabase, Discord y ER:LC para que queden guardados en el servidor globalmente. De este modo, <strong>ningún oficial ni usuario tiene que configurar bases de datos en su dispositivo personal</strong>; todo queda conectado directamente en la web.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION A: ENCRIPTADOR / DESENCRIPTADOR */}
              <div className="p-5 rounded-2xl bg-[#0c1020] border border-amber-500/20 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <h5 className="text-xs font-bold uppercase tracking-wider text-white">
                      Herramienta: Encriptador / Desencriptador de Tokens
                    </h5>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Protección de Tokens y Claves
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  Usa esta herramienta si deseas cifrar u ocultar tokens o contraseñas antes de compartirlas o guardarlas.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                      Texto / Token a Procesar
                    </label>
                    <textarea
                      rows={2}
                      value={encryptRawInput}
                      onChange={(e) => setEncryptRawInput(e.target.value)}
                      placeholder="Pega aquí tu token de Discord, API key o contraseña..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                      Contraseña Secreta de Cifrado (Opcional - por defecto usa salt PE:RP)
                    </label>
                    <input
                      type="password"
                      value={encryptSecretKey}
                      onChange={(e) => setEncryptSecretKey(e.target.value)}
                      placeholder="Ej: mi_clave_secreta_policial_2026"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        const enc = perpEncrypt(encryptRawInput, encryptSecretKey);
                        setEncryptResultText(enc);
                        setEncryptCopied(false);
                      }}
                      disabled={!encryptRawInput.trim()}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>🔒 Encriptar Clave</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        const dec = perpDecrypt(encryptRawInput, encryptSecretKey);
                        setEncryptResultText(dec);
                        setEncryptCopied(false);
                      }}
                      disabled={!encryptRawInput.trim()}
                      className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>🔓 Desencriptar Clave</span>
                    </button>
                  </div>

                  {encryptResultText && (
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 space-y-2 mt-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-amber-400">
                          Resultado Procesado:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(encryptResultText);
                            setEncryptCopied(true);
                            playSuccessSound();
                            setTimeout(() => setEncryptCopied(false), 2500);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          {encryptCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{encryptCopied ? '¡Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                      <div className="text-xs font-mono text-emerald-400 break-all select-all p-2 rounded bg-black/60 border border-white/5">
                        {encryptResultText}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION B: BÓVEDA DE CONFIGURACIÓN DE BASE DE DATOS Y SECRETS */}
              <div className="p-5 rounded-2xl bg-[#0c1020] border border-white/10 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-sky-400" />
                    <h5 className="text-xs font-bold uppercase tracking-wider text-white">
                      Configuración de Servidor & Base de Datos
                    </h5>
                  </div>
                  {secretsConfigured && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                      Servidor Conectado
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Supabase URL */}
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                      URL del Proyecto Supabase
                    </label>
                    <input
                      type="url"
                      placeholder="https://xyzabcdefg.supabase.co"
                      value={secretsVault.supabaseUrl}
                      onChange={(e) => setSecretsVault({ ...secretsVault, supabaseUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  {/* Supabase Anon Key */}
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold uppercase text-slate-300">
                        Supabase Anon Key (API Pública)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSecretField(p => ({ ...p, anonKey: !p.anonKey }))}
                        className="text-[10px] text-slate-400 hover:text-white"
                      >
                        {showSecretField.anonKey ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                    <input
                      type={showSecretField.anonKey ? 'text' : 'password'}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={secretsVault.supabaseAnonKey}
                      onChange={(e) => setSecretsVault({ ...secretsVault, supabaseAnonKey: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  {/* Discord Bot Token */}
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold uppercase text-slate-300">
                        Token del Bot de Discord
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSecretField(p => ({ ...p, botToken: !p.botToken }))}
                        className="text-[10px] text-slate-400 hover:text-white"
                      >
                        {showSecretField.botToken ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                    <input
                      type={showSecretField.botToken ? 'text' : 'password'}
                      placeholder="MTI... (Token de Discord Developer Portal)"
                      value={secretsVault.discordToken}
                      onChange={(e) => setSecretsVault({ ...secretsVault, discordToken: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  {/* Discord Client ID */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                      Discord Client ID (Application ID)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 1105356730516377694"
                      value={secretsVault.discordClientId}
                      onChange={(e) => setSecretsVault({ ...secretsVault, discordClientId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  {/* Discord Client Secret */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold uppercase text-slate-300">
                        Discord Client Secret (OAuth2)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSecretField(p => ({ ...p, clientSecret: !p.clientSecret }))}
                        className="text-[10px] text-slate-400 hover:text-white"
                      >
                        {showSecretField.clientSecret ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                    <input
                      type={showSecretField.clientSecret ? 'text' : 'password'}
                      placeholder="Client Secret de Discord"
                      value={secretsVault.discordClientSecret}
                      onChange={(e) => setSecretsVault({ ...secretsVault, discordClientSecret: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  {/* Discord Server ID */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                      ID del Servidor Discord PE:RP
                    </label>
                    <input
                      type="text"
                      placeholder="1554629558760775710"
                      value={secretsVault.discordGuildId}
                      onChange={(e) => setSecretsVault({ ...secretsVault, discordGuildId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-400"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Servidor oficial donde opera el bot.</p>
                  </div>

                  {/* PNP Role ID */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                      ID del Rol PNP (Policía Nacional)
                    </label>
                    <input
                      type="text"
                      placeholder="1555384968086032394"
                      value={secretsVault.pnpRoleId}
                      onChange={(e) => setSecretsVault({ ...secretsVault, pnpRoleId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-rose-400"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Requerido para entrar a la Tablet MDT PNP.</p>
                  </div>

                  {/* License Role ID */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                      ID Rol Licencia de Conducir
                    </label>
                    <input
                      type="text"
                      placeholder="1556723203114668082"
                      value={secretsVault.licenseRoleId}
                      onChange={(e) => setSecretsVault({ ...secretsVault, licenseRoleId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Verificación automática de licencia.</p>
                  </div>

                  {/* ER:LC Server Key */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold uppercase text-slate-300">
                        API Key ER:LC (Roblox)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSecretField(p => ({ ...p, erlcKey: !p.erlcKey }))}
                        className="text-[10px] text-slate-400 hover:text-white"
                      >
                        {showSecretField.erlcKey ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </div>
                    <input
                      type={showSecretField.erlcKey ? 'text' : 'password'}
                      placeholder="Server API Key de ER:LC"
                      value={secretsVault.erlcServerKey}
                      onChange={(e) => setSecretsVault({ ...secretsVault, erlcServerKey: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Para jugadores y aforo en vivo.</p>
                  </div>
                </div>

                {/* Feedback */}
                {secretsFeedback && (
                  <div className={`p-3 rounded-xl text-xs font-semibold ${
                    secretsFeedback.startsWith('✅')
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
                  }`}>
                    {secretsFeedback}
                  </div>
                )}

                {/* Save Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveSecretsVault}
                    disabled={isSavingSecrets}
                    className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-950/50 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingSecrets ? 'Guardando en Servidor...' : '💾 Guardar en Bóveda del Servidor (Persistente Global)'}</span>
                  </button>
                </div>
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
