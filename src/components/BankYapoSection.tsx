import React, { useState, useEffect, useRef } from 'react';
import {
  Wallet,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  EyeOff,
  Search,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  History,
  Lock,
  ExternalLink,
  Coins,
  Send,
  Building2,
  Download,
  Share2,
  Bot,
  Sparkles,
  Smartphone,
  RefreshCw,
  HelpCircle,
  Snowflake,
} from 'lucide-react';
import { YapoLogo } from './YapoLogo';
import { useServer } from '../context/ServerContext';
import {
  YapoAccount,
  YapoTransaction,
  YapoBankConfig,
} from '../types/yapo';
import {
  getYapoAccountByDiscordId,
  findYapoAccount,
  registerYapoAccount,
  transferYapo,
  withdrawCash,
  depositCash,
  getAccountTransactions,
  getYapoConfig,
} from '../lib/yapoStorage';
import { getUserDni } from '../lib/supabase';
import { PeruDni } from '../types/dni';
import { playClickSound, playSuccessSound, playYapeChimeSound } from '../utils/audio';

export const BankYapoSection: React.FC = () => {
  const { discordUser, setIsDiscordAuthOpen } = useServer();

  const [loading, setLoading] = useState(true);
  const [userDni, setUserDni] = useState<PeruDni | null>(null);
  const [account, setAccount] = useState<YapoAccount | null>(null);
  const [transactions, setTransactions] = useState<YapoTransaction[]>([]);
  const [bankConfig, setBankConfig] = useState<YapoBankConfig>(getYapoConfig());

  // Show/Hide balances
  const [showBalance, setShowBalance] = useState(true);

  // Registration form
  const [inputDni, setInputDni] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Active view in Yapo App
  const [activeTab, setActiveTab] = useState<'home' | 'transfer' | 'cash' | 'history' | 'bot'>('home');

  // Transfer flow states
  const [recipientInput, setRecipientInput] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [isSearchingRecipient, setIsSearchingRecipient] = useState(false);
  const [recipientFound, setRecipientFound] = useState<YapoAccount | null>(null);
  const [transferError, setTransferError] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Receipt voucher state (Comprobante Yapo)
  const [lastVoucher, setLastVoucher] = useState<YapoTransaction | null>(null);
  const [copiedVoucher, setCopiedVoucher] = useState(false);

  // Cash withdrawal / deposit states
  const [cashAmount, setCashAmount] = useState('');
  const [cashAction, setCashAction] = useState<'withdraw' | 'deposit'>('withdraw');
  const [cashFeedback, setCashFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isProcessingCash, setIsProcessingCash] = useState(false);

  // Load account and DNI data
  const loadData = async () => {
    if (!discordUser) {
      setUserDni(null);
      setAccount(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const dni = await getUserDni(discordUser.id);
      setUserDni(dni);

      const yapoAcc = await getYapoAccountByDiscordId(discordUser.id);
      setAccount(yapoAcc);

      if (yapoAcc) {
        const txs = getAccountTransactions(yapoAcc.dniNumber);
        setTransactions(txs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setBankConfig(getYapoConfig());
  }, [discordUser]);

  // Handle DNI Affiliation / Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordUser) return;
    setRegisterError('');
    setRegisterSuccess('');
    setIsRegistering(true);
    playClickSound();

    try {
      const res = await registerYapoAccount({
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        dniNumberInput: inputDni.trim(),
      });

      if (res.success && res.account) {
        setAccount(res.account);
        setRegisterSuccess(`¡Cuenta de YA P creada y verificada exitosamente! Se acreditaron S/. ${bankConfig.welcomeBonus.toFixed(2)} de bienvenida.`);
        playYapeChimeSound();
        const txs = getAccountTransactions(res.account.dniNumber);
        setTransactions(txs);
      } else {
        setRegisterError(res.error || 'No se pudo verificar el DNI para crear la cuenta.');
      }
    } catch (err: any) {
      setRegisterError(err.message || 'Error al conectar con la base de datos.');
    } finally {
      setIsRegistering(false);
    }
  };

  // Search recipient by Roblox Username or DNI
  const handleSearchRecipient = async () => {
    const q = recipientInput.trim().replace(/^@/, '');
    if (!q) {
      setTransferError('Ingresa el usuario de Roblox o número de DNI del destinatario.');
      return;
    }
    setTransferError('');
    setIsSearchingRecipient(true);
    playClickSound();

    try {
      const found = await findYapoAccount(q);
      if (!found) {
        setRecipientFound(null);
        setTransferError('Cuenta inexistente. El usuario de Roblox o número de DNI no está registrado en YA P PE:RP.');
      } else if (found.discordId === account?.discordId || found.dniNumber === account?.dniNumber) {
        setRecipientFound(null);
        setTransferError('No puedes transferirte dinero a tu propia cuenta.');
      } else if (found.status === 'frozen') {
        setRecipientFound(null);
        setTransferError(`La cuenta del usuario @${found.robloxUsername} se encuentra CONGELADA por investigación policial/judicial.`);
      } else {
        setRecipientFound(found);
        playSuccessSound();
      }
    } catch {
      setTransferError('Error al buscar la cuenta en el sistema.');
    } finally {
      setIsSearchingRecipient(false);
    }
  };

  // Confirm and execute Yapo transfer
  const handleConfirmTransfer = async () => {
    if (!account || !recipientFound) return;
    const amountNum = parseFloat(transferAmount);

    if (isNaN(amountNum) || amountNum <= 0) {
      setTransferError('Ingresa un monto válido mayor a S/. 0.00');
      return;
    }
    if (amountNum > account.bankBalance) {
      setTransferError(`Saldo insuficiente en Banco YA P. Saldo disponible: S/. ${account.bankBalance.toFixed(2)}`);
      return;
    }

    setIsTransferring(true);
    setTransferError('');

    try {
      const res = await transferYapo({
        senderDiscordId: account.discordId,
        recipientIdentifier: recipientFound.dniNumber,
        amount: amountNum,
        note: transferNote,
      });

      if (res.success && res.transaction && res.senderAccount) {
        setAccount(res.senderAccount);
        setLastVoucher(res.transaction);
        setTransactions((prev) => [res.transaction!, ...prev]);
        playYapeChimeSound();
        // Reset inputs
        setTransferAmount('');
        setTransferNote('');
        setRecipientFound(null);
        setRecipientInput('');
      } else {
        setTransferError(res.error || 'No se pudo completar la transferencia.');
      }
    } catch (e: any) {
      setTransferError(e.message || 'Error inesperado durante la transacción.');
    } finally {
      setIsTransferring(false);
    }
  };

  // Handle cash withdrawal / deposit
  const handleProcessCash = async () => {
    if (!account) return;
    const amountNum = parseFloat(cashAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setCashFeedback({ success: false, message: 'Ingresa un monto válido.' });
      return;
    }

    setIsProcessingCash(true);
    setCashFeedback(null);
    playClickSound();

    try {
      if (cashAction === 'withdraw') {
        const res = await withdrawCash(account.discordId, amountNum);
        if (res.success && res.account) {
          setAccount(res.account);
          if (res.transaction) setTransactions((prev) => [res.transaction!, ...prev]);
          setCashFeedback({
            success: true,
            message: `¡Retiro exitoso! Retiraste S/. ${amountNum.toFixed(2)} de YA P a tu Mano.`,
          });
          playSuccessSound();
          setCashAmount('');
        } else {
          setCashFeedback({ success: false, message: res.error || 'Error al retirar efectivo.' });
        }
      } else {
        const res = await depositCash(account.discordId, amountNum);
        if (res.success && res.account) {
          setAccount(res.account);
          if (res.transaction) setTransactions((prev) => [res.transaction!, ...prev]);
          setCashFeedback({
            success: true,
            message: `¡Depósito exitoso! Depositaste S/. ${amountNum.toFixed(2)} de tu Mano a tu cuenta YA P.`,
          });
          playSuccessSound();
          setCashAmount('');
        } else {
          setCashFeedback({ success: false, message: res.error || 'Error al depositar efectivo.' });
        }
      }
    } catch (err: any) {
      setCashFeedback({ success: false, message: err.message || 'Error al procesar la operación.' });
    } finally {
      setIsProcessingCash(false);
    }
  };

  return (
    <section id="banco" className="relative py-20 bg-[#090b14] border-t border-white/5 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-purple-700/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider mb-4 shadow-lg">
            <Building2 className="w-4 h-4 text-purple-400" />
            <span>Sistema Financiero Oficial PE:RP</span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <YapoLogo size="md" />
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              BANCO <span className="text-purple-400">YA P</span>
            </h2>
          </div>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            La billetera digital y sistema bancario oficial de <strong className="text-white">Peru Roleplay</strong>. 
            Transfiere dinero en Soles (S/.) al instante entre ciudadanos usando tu usuario de Roblox o DNI, retira dinero a la mano y sincroniza tu economía con Discord.
          </p>
        </div>

        {/* STATE 1: NO DISCORD SESSION */}
        {!discordUser && (
          <div className="max-w-xl mx-auto p-8 rounded-3xl bg-[#0f1222] border border-white/10 text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center">
              <Lock className="w-8 h-8 text-purple-400" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-2">Inicia Sesión para Acceder a tu Cuenta Bancaria</h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Tu cuenta bancaria YA P está vinculada directamente a tu identidad ciudadana verificada por Discord y tu DNI Peruano de RENIEC.
              </p>
            </div>

            <button
              onClick={() => setIsDiscordAuthOpen(true)}
              className="w-full py-3.5 px-6 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              <span>Conectar con Discord</span>
            </button>
          </div>
        )}

        {/* STATE 2: LOGGED IN BUT HAS NO DNI */}
        {discordUser && !userDni && !loading && (
          <div className="max-w-xl mx-auto p-8 rounded-3xl bg-[#0f1222] border border-amber-500/30 text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-950/60 border border-amber-500/30 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-400" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-2">Requisito Previo: Tramita tu DNI Peruano</h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Para aperturar tu cuenta bancaria y registrarte en <strong className="text-cyan-300">YA P</strong>, es obligatorio poseer primero tu DNI Peruano emitido por RENIEC con tu avatar de Roblox.
              </p>
            </div>

            <a
              href="#dni"
              className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-sm shadow-lg transition-all"
            >
              <span>Ir a Emitir mi DNI Peruano</span>
              <Coins className="w-4 h-4 text-amber-300" />
            </a>
          </div>
        )}

        {/* STATE 3: HAS DNI BUT NOT YET REGISTERED TO YA P */}
        {discordUser && userDni && !account && !loading && (
          <div className="max-w-lg mx-auto p-8 rounded-3xl bg-[#111425] border-2 border-purple-500/40 shadow-2xl relative overflow-hidden">
            {/* Top Badge */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <YapoLogo size="sm" />
                <div>
                  <h3 className="text-lg font-black text-white">Afiliación a YA P PE:RP</h3>
                  <p className="text-[11px] text-purple-300">Vincula tu número de DNI oficial</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-[10px] font-bold text-emerald-300">
                Bono S/. {bankConfig.welcomeBonus.toFixed(2)}
              </span>
            </div>

            {/* Citizen Preview */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-black/40 border border-white/10 mb-6">
              <img
                src={userDni.photoUrl}
                alt="Avatar"
                className="w-12 h-12 rounded-xl object-cover bg-black border border-white/20 shrink-0"
              />
              <div className="min-w-0">
                <div className="font-bold text-white text-xs truncate">{userDni.fullName}</div>
                <div className="text-[11px] text-slate-400">
                  Usuario Roblox: <strong className="text-purple-300">@{userDni.robloxUsername}</strong>
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">DNI Verificado en RENIEC</div>
              </div>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5">
                  Número de DNI (8 Dígitos)
                </label>
                <input
                  type="text"
                  maxLength={8}
                  value={inputDni}
                  onChange={(e) => setInputDni(e.target.value.replace(/\D/g, ''))}
                  placeholder="ej. 74829104"
                  className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-base tracking-widest focus:outline-none focus:border-purple-400 text-center"
                />
                <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                  * El sistema verificará que el número coincida exactamente con tu DNI oficial registrado.
                </p>
              </div>

              {registerError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{registerError}</span>
                </div>
              )}

              {registerSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{registerSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-purple-900/40 cursor-pointer transition-all disabled:opacity-50"
              >
                <YapoLogo size="sm" withContainer={false} className="w-5 h-5" />
                <span>{isRegistering ? 'Verificando con RENIEC...' : 'Crear Mi Cuenta YA P'}</span>
              </button>
            </form>
          </div>
        )}

        {/* STATE 4: ACTIVE YA P ACCOUNT DASHBOARD */}
        {discordUser && account && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT / MOBILE MOCKUP CONTAINER (Smartphone App Interface) */}
            <div className="lg:col-span-5 w-full max-w-sm mx-auto">
              <div className="rounded-[40px] bg-[#0c0d18] border-4 border-[#1f233b] p-4 shadow-2xl shadow-purple-950/60 relative overflow-hidden">
                
                {/* Phone Speaker Notch */}
                <div className="w-24 h-4 bg-[#1f233b] rounded-full mx-auto mb-3" />

                {/* YA P App Header */}
                <div className="rounded-3xl bg-gradient-to-b from-[#6b12b5] to-[#4c0a85] p-5 text-white shadow-xl relative overflow-hidden mb-4">
                  {/* Background Accents */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <YapoLogo size="sm" />
                      <span className="font-extrabold text-base tracking-wide font-mono text-cyan-300">YA P</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowBalance(!showBalance)}
                        title={showBalance ? 'Ocultar saldo' : 'Mostrar saldo'}
                        className="p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white cursor-pointer transition-colors"
                      >
                        {showBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Citizen Info Header */}
                  <div className="flex items-center gap-3 mb-5">
                    <img
                      src={account.avatarUrl}
                      alt="Avatar"
                      className="w-11 h-11 rounded-full object-cover bg-black border-2 border-[#20edd1] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] text-purple-200">Hola,</p>
                      <h4 className="font-bold text-sm text-white truncate">{account.fullName}</h4>
                      <p className="text-[10px] text-teal-300 font-mono">@{account.robloxUsername} • DNI {account.dniNumber}</p>
                    </div>
                  </div>

                  {/* Bank & Cash Balances (UnbelievaBoat Style Economy) */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] text-purple-200 font-medium">Saldo en Banco (YA P):</span>
                      <span className="text-xl font-black text-white font-mono">
                        {showBalance ? `S/ ${account.bankBalance.toFixed(2)}` : 'S/ ••••••'}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-[11px] text-teal-200 flex items-center gap-1">
                        <Coins className="w-3 h-3 text-teal-300" />
                        <span>En Mano (Efectivo):</span>
                      </span>
                      <span className="font-bold text-teal-300 font-mono">
                        {showBalance ? `S/ ${account.cashBalance.toFixed(2)}` : 'S/ ••••'}
                      </span>
                    </div>

                    <div className="pt-1.5 border-t border-white/10 flex items-baseline justify-between text-[11px]">
                      <span className="text-purple-200">Patrimonio Total:</span>
                      <span className="font-extrabold text-amber-300 font-mono">
                        {showBalance ? `S/ ${(account.bankBalance + account.cashBalance).toFixed(2)}` : 'S/ ••••••'}
                      </span>
                    </div>
                  </div>

                  {account.status === 'frozen' && (
                    <div className="mt-3 p-2 rounded-xl bg-rose-950/90 border border-rose-500/50 text-[10px] text-rose-200 flex items-center gap-1.5">
                      <Snowflake className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>Cuenta Congelada por Orden Judicial</span>
                    </div>
                  )}
                </div>

                {/* Smartphone Quick Actions */}
                <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                  <button
                    onClick={() => {
                      setActiveTab('transfer');
                      playClickSound();
                    }}
                    className={`p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      activeTab === 'transfer'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-[#151726] hover:bg-[#1a1d30] text-slate-300'
                    }`}
                  >
                    <Send className="w-4 h-4 text-purple-300" />
                    <span className="text-[10px] font-bold">Yapear</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('cash');
                      playClickSound();
                    }}
                    className={`p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      activeTab === 'cash'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-[#151726] hover:bg-[#1a1d30] text-slate-300'
                    }`}
                  >
                    <ArrowRightLeft className="w-4 h-4 text-teal-300" />
                    <span className="text-[10px] font-bold">Cajero</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('history');
                      playClickSound();
                    }}
                    className={`p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      activeTab === 'history'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-[#151726] hover:bg-[#1a1d30] text-slate-300'
                    }`}
                  >
                    <History className="w-4 h-4 text-amber-300" />
                    <span className="text-[10px] font-bold">Historial</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('bot');
                      playClickSound();
                    }}
                    className={`p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      activeTab === 'bot'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-[#151726] hover:bg-[#1a1d30] text-slate-300'
                    }`}
                  >
                    <Bot className="w-4 h-4 text-sky-400" />
                    <span className="text-[10px] font-bold">Bot</span>
                  </button>
                </div>

                {/* Recent mini activity */}
                <div className="bg-[#121422] rounded-2xl p-3 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-300">Últimos Movimientos</span>
                    <button
                      onClick={() => setActiveTab('history')}
                      className="text-[10px] text-purple-400 hover:underline cursor-pointer"
                    >
                      Ver todos
                    </button>
                  </div>

                  {transactions.length === 0 ? (
                    <p className="text-[10px] text-slate-500 text-center py-3">Aún no hay transacciones registradas.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {transactions.slice(0, 3).map((tx) => {
                        const isIncome =
                          tx.receiverDni === account.dniNumber ||
                          tx.type === 'deposit_cash' ||
                          tx.type === 'welcome_bonus';
                        return (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                  isIncome ? 'bg-emerald-950 text-emerald-400' : 'bg-purple-950 text-purple-400'
                                }`}
                              >
                                {isIncome ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-medium text-white truncate max-w-[120px]">
                                  {tx.description}
                                </p>
                                <span className="text-[9px] text-slate-500 font-mono">{tx.operationNumber}</span>
                              </div>
                            </div>
                            <span
                              className={`text-xs font-bold font-mono ${
                                isIncome ? 'text-emerald-400' : 'text-slate-200'
                              }`}
                            >
                              {isIncome ? '+' : '-'}S/ {tx.amount.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* RIGHT CONTAINER: INTERACTIVE PANELS (Yapear, Cajero, Historial, Bot) */}
            <div className="lg:col-span-7 bg-[#0f1222] rounded-3xl border border-white/10 p-6 shadow-2xl relative">
              
              {/* TAB 1: YAPEAR / TRANSFERIR */}
              {activeTab === 'transfer' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-950 border border-purple-500/30 flex items-center justify-center">
                        <Send className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">Yapear a un Ciudadano</h3>
                        <p className="text-xs text-slate-400">Transfiere Soles mediante usuario de Roblox o DNI</p>
                      </div>
                    </div>
                    <span className="text-xs text-purple-300 font-mono font-bold">
                      Disponible: S/ {account.bankBalance.toFixed(2)}
                    </span>
                  </div>

                  {/* Step 1: Search Recipient */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Destinatario (Usuario de Roblox o Número de DNI)
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={recipientInput}
                          onChange={(e) => {
                            setRecipientInput(e.target.value);
                            setRecipientFound(null);
                            setTransferError('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSearchRecipient();
                            }
                          }}
                          placeholder="ej. @StumbleRoblox, AlexPeru o 74829104"
                          className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-purple-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSearchRecipient}
                        disabled={isSearchingRecipient}
                        className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shrink-0 transition-all"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>{isSearchingRecipient ? 'Buscando...' : 'Buscar'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Error if not found: "Cuenta inexistente" */}
                  {transferError && (
                    <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2.5 animate-in fade-in">
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      <div>
                        <p className="font-bold">{transferError}</p>
                      </div>
                    </div>
                  )}

                  {/* Recipient Found: Confirmation Card */}
                  {recipientFound && (
                    <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/40 space-y-4 animate-in fade-in">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                        <span>Destinatario Verificado</span>
                      </div>

                      <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/10">
                        <img
                          src={recipientFound.avatarUrl}
                          alt="Destinatario"
                          className="w-12 h-12 rounded-xl object-cover bg-black border-2 border-teal-400 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-white text-sm truncate">{recipientFound.fullName}</h4>
                          <p className="text-xs text-purple-300 font-mono">@{recipientFound.robloxUsername}</p>
                          <p className="text-[11px] text-slate-400 font-mono">DNI: {recipientFound.dniNumber}-{recipientFound.verifyDigit}</p>
                        </div>
                      </div>

                      {/* Amount & Note Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                            Monto a Yapear (S/.)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-400 font-bold font-mono">S/</span>
                            <input
                              type="number"
                              min="0.50"
                              step="0.50"
                              value={transferAmount}
                              onChange={(e) => setTransferAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-base font-bold focus:outline-none focus:border-teal-400"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                            Mensaje / Motivo (Opcional)
                          </label>
                          <input
                            type="text"
                            value={transferNote}
                            onChange={(e) => setTransferNote(e.target.value)}
                            placeholder="ej. Gasolina, comida, pago de auto..."
                            className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400"
                          />
                        </div>
                      </div>

                      {/* Quick preset amounts */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {[10, 50, 100, 200, 500].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setTransferAmount(amt.toString())}
                            className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 hover:text-white cursor-pointer transition-colors"
                          >
                            +S/ {amt}
                          </button>
                        ))}
                      </div>

                      {/* Confirm and Send Button */}
                      <button
                        type="button"
                        onClick={handleConfirmTransfer}
                        disabled={isTransferring || !transferAmount || parseFloat(transferAmount) <= 0}
                        className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-black font-black text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer transition-all disabled:opacity-50"
                      >
                        <YapoLogo size="sm" withContainer={false} className="w-5 h-5 text-black" />
                        <span>{isTransferring ? 'Enviando YA P...' : `Confirmar y Enviar YA P S/ ${transferAmount || '0.00'}`}</span>
                      </button>
                    </div>
                  )}

                  {/* Last Transaction Voucher Modal / Screen */}
                  {lastVoucher && (
                    <div className="p-5 rounded-2xl bg-gradient-to-b from-[#1b1035] to-[#110822] border-2 border-teal-400/50 text-center space-y-4 shadow-2xl relative">
                      <div className="w-12 h-12 mx-auto rounded-full bg-teal-400/20 text-teal-400 flex items-center justify-center border border-teal-400">
                        <Check className="w-6 h-6 stroke-[3]" />
                      </div>

                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-300 block mb-1">
                          ¡Transferencia YA P Exitosa!
                        </span>
                        <div className="text-3xl font-black text-white font-mono">
                          S/ {lastVoucher.amount.toFixed(2)}
                        </div>
                        <p className="text-xs text-slate-300 mt-1">
                          Enviado a <strong className="text-white">{lastVoucher.receiverName}</strong> (@{lastVoucher.receiverRoblox})
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-left text-xs space-y-1 font-mono">
                        <div className="flex justify-between text-slate-400 text-[11px]">
                          <span>N° de Operación:</span>
                          <strong className="text-white">{lastVoucher.operationNumber}</strong>
                        </div>
                        <div className="flex justify-between text-slate-400 text-[11px]">
                          <span>Fecha y Hora:</span>
                          <span className="text-white">{new Date(lastVoucher.timestamp).toLocaleString()}</span>
                        </div>
                        {lastVoucher.description && (
                          <div className="flex justify-between text-slate-400 text-[11px] pt-1 border-t border-white/5">
                            <span>Motivo:</span>
                            <span className="text-purple-300">{lastVoucher.description}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const text = `Comprobante YA P PE:RP | Monto: S/ ${lastVoucher.amount.toFixed(2)} | Destinatario: @${lastVoucher.receiverRoblox} (${lastVoucher.receiverName}) | Operación: ${lastVoucher.operationNumber} | Fecha: ${new Date(lastVoucher.timestamp).toLocaleString()}`;
                            navigator.clipboard.writeText(text);
                            setCopiedVoucher(true);
                            setTimeout(() => setCopiedVoucher(false), 2000);
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>{copiedVoucher ? '¡Copiado!' : 'Copiar Comprobante'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setLastVoucher(null)}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* TAB 2: CAJERO ATM - RETIRAR A MANO / DEPOSITAR */}
              {activeTab === 'cash' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-teal-950 border border-teal-500/30 flex items-center justify-center">
                        <ArrowRightLeft className="w-4 h-4 text-teal-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">Cajero ATM PE:RP (Dinero en Mano)</h3>
                        <p className="text-xs text-slate-400">Pasa dinero entre tu cuenta de Banco y tu Bolsillo / Efectivo físico</p>
                      </div>
                    </div>
                  </div>

                  {/* Balance Comparison */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30">
                      <span className="text-[10px] uppercase font-bold text-purple-300">En Banco (YA P)</span>
                      <div className="text-xl font-black text-white font-mono mt-0.5">
                        S/ {account.bankBalance.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-slate-400">Fondos electrónicos seguros</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-teal-950/40 border border-teal-500/30">
                      <span className="text-[10px] uppercase font-bold text-teal-300">En Mano (Efectivo)</span>
                      <div className="text-xl font-black text-teal-300 font-mono mt-0.5">
                        S/ {account.cashBalance.toFixed(2)}
                      </div>
                      <span className="text-[10px] text-slate-400">Billetes en mano para rolear</span>
                    </div>
                  </div>

                  {/* Operation Mode Selector */}
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-black/40 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setCashAction('withdraw')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        cashAction === 'withdraw'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      <span>Retirar a Mano</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCashAction('deposit')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        cashAction === 'deposit'
                          ? 'bg-teal-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Depositar al Banco</span>
                    </button>
                  </div>

                  {/* Amount input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                      {cashAction === 'withdraw' ? 'Monto a Retirar a la Mano (S/.)' : 'Monto a Depositar al Banco (S/.)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold font-mono">S/</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-base font-bold focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {[50, 100, 250, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCashAmount(amt.toString())}
                        className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 hover:text-white cursor-pointer transition-colors"
                      >
                        S/ {amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const maxAmt = cashAction === 'withdraw' ? account.bankBalance : account.cashBalance;
                        setCashAmount(maxAmt.toString());
                      }}
                      className="px-3 py-1 rounded-lg bg-purple-950 text-purple-300 border border-purple-500/30 text-xs font-bold hover:bg-purple-900 cursor-pointer"
                    >
                      Todo el saldo
                    </button>
                  </div>

                  {cashFeedback && (
                    <div
                      className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                        cashFeedback.success
                          ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                          : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                      }`}
                    >
                      {cashFeedback.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>{cashFeedback.message}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleProcessCash}
                    disabled={isProcessingCash || !cashAmount || parseFloat(cashAmount) <= 0}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer transition-all disabled:opacity-50"
                  >
                    <span>
                      {isProcessingCash
                        ? 'Procesando en Cajero...'
                        : cashAction === 'withdraw'
                        ? `Retirar S/ ${cashAmount || '0.00'} a Mano`
                        : `Depositar S/ ${cashAmount || '0.00'} al Banco`}
                    </span>
                  </button>
                </div>
              )}

              {/* TAB 3: HISTORIAL DE TRANSACCIONES */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-950 border border-amber-500/30 flex items-center justify-center">
                        <History className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">Historial de Transacciones</h3>
                        <p className="text-xs text-slate-400">Registro de yapeos, transferencias y retiros</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {transactions.length} movimientos
                    </span>
                  </div>

                  {transactions.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs">
                      No hay transacciones registradas aún.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                      {transactions.map((tx) => {
                        const isIncome =
                          tx.receiverDni === account.dniNumber ||
                          tx.type === 'deposit_cash' ||
                          tx.type === 'welcome_bonus';
                        return (
                          <div
                            key={tx.id}
                            className="p-3 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                  isIncome
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-purple-950 text-purple-400 border border-purple-500/30'
                                }`}
                              >
                                {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-white text-xs truncate">{tx.description}</h4>
                                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                                  <span>{tx.operationNumber}</span>
                                  <span>•</span>
                                  <span>{new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span
                                className={`font-mono text-sm font-black ${
                                  isIncome ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {isIncome ? '+' : '-'}S/ {tx.amount.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: DISCORD BOT ECONOMY SYNC (UnbelievaBoat Style) */}
              {activeTab === 'bot' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-sky-950 border border-sky-500/30 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-sky-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">Integración con Bot de Discord</h3>
                        <p className="text-xs text-slate-400">Sincronización de economía estilo UnbelievaBoat</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      ● Sincronizado
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    El sistema bancario de <strong className="text-white">Banco YA P</strong> está diseñado para reflejarse automáticamente en los comandos de economía de Discord. Tu dinero en mano, banco y total están unificados en tiempo real.
                  </p>

                  {/* Economy breakdown preview */}
                  <div className="p-4 rounded-2xl bg-[#080a14] border border-sky-500/30 font-mono text-xs space-y-2">
                    <div className="text-slate-400 text-[11px] pb-1 border-b border-white/10 flex items-center justify-between">
                      <span>Vista previa de comando: <strong>/saldo @{account.robloxUsername}</strong></span>
                      <span className="text-sky-400">Bot Oficial PE:RP</span>
                    </div>

                    <div className="text-white font-bold flex justify-between">
                      <span className="text-slate-300">💵 Dinero en Mano (Cash):</span>
                      <span className="text-teal-300">S/ {account.cashBalance.toFixed(2)}</span>
                    </div>

                    <div className="text-white font-bold flex justify-between">
                      <span className="text-slate-300">🏦 Dinero en Banco YA P (Bank):</span>
                      <span className="text-purple-300">S/ {account.bankBalance.toFixed(2)}</span>
                    </div>

                    <div className="text-white font-bold flex justify-between pt-1 border-t border-white/10">
                      <span className="text-amber-300">💰 Dinero Total (Net Worth):</span>
                      <span className="text-amber-300">S/ {(account.bankBalance + account.cashBalance).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Discord Commands Cheat Sheet */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Comandos de Discord para Usuarios:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <strong className="text-purple-400">/saldo</strong> o <strong className="text-purple-400">/ver-saldo</strong>
                        <p className="text-[10px] text-slate-400 font-sans mt-0.5">Muestra tu dinero en mano, banco y total en Soles.</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <strong className="text-teal-400">/retirar &lt;monto&gt;</strong>
                        <p className="text-[10px] text-slate-400 font-sans mt-0.5">Saca dinero del Banco YA P a tu mano.</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <strong className="text-teal-400">/depositar &lt;monto&gt;</strong>
                        <p className="text-[10px] text-slate-400 font-sans mt-0.5">Deposita dinero de tu mano al Banco YA P.</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <strong className="text-amber-400">/transferir &lt;dni o @usuario&gt; &lt;monto&gt;</strong>
                        <p className="text-[10px] text-slate-400 font-sans mt-0.5">Envía dinero por YA P con número de DNI o usuario de Roblox.</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <strong className="text-sky-400">/dni-ver &lt;dni o @usuario&gt;</strong>
                        <p className="text-[10px] text-slate-400 font-sans mt-0.5">Muestra la foto del DNI con botones [Anverso] y [Reverso].</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <strong className="text-emerald-400">/crear-dni</strong>
                        <p className="text-[10px] text-slate-400 font-sans mt-0.5">Registra tus datos ciudadanos y foto de Roblox.</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 bg-white/5 p-3 rounded-xl border border-white/5">
                    ⚙️ <em>Configuración de Administrador:</em> Todo lo referente a tokens, webhooks, base de datos y comandos se gestiona exclusivamente desde el <strong>Panel de Administración</strong> (no hay comandos administrativos en el bot).
                  </div>
                </div>
              )}

              {/* DEFAULT TAB: HOME */}
              {activeTab === 'home' && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <YapoLogo size="md" />
                    <div>
                      <h3 className="font-extrabold text-white text-lg">Billetera Digital YA P PE:RP</h3>
                      <p className="text-xs text-slate-300">Tu cuenta bancaria está activa y lista para operar.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      onClick={() => setActiveTab('transfer')}
                      className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/60 to-purple-900/20 border border-purple-500/30 hover:border-purple-400 transition-all cursor-pointer shadow-lg group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                        <Send className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-white text-sm mb-1">Transferir por YA P</h4>
                      <p className="text-xs text-slate-400">Transfiere Soles mediante número de DNI o usuario de Roblox al instante.</p>
                    </div>

                    <div
                      onClick={() => setActiveTab('cash')}
                      className="p-5 rounded-2xl bg-gradient-to-br from-teal-950/60 to-teal-900/20 border border-teal-500/30 hover:border-teal-400 transition-all cursor-pointer shadow-lg group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-teal-500 text-black flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                        <ArrowRightLeft className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-white text-sm mb-1">Cajero ATM: Retirar a la Mano</h4>
                      <p className="text-xs text-slate-400">Lleva efectivo físico en tu bolsillo para el servidor de Roblox.</p>
                    </div>
                  </div>

                  {/* Security Banner */}
                  <div className="p-4 rounded-2xl bg-[#080912] border border-white/10 flex items-center gap-3.5">
                    <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div className="text-xs text-slate-300">
                      <strong className="text-white">Transacciones Seguras y Respaldadas:</strong> Todas las operaciones quedan registradas en la base de datos de Supabase con número de comprobante único para el rol.
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

      </div>
    </section>
  );
};
