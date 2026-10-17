import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Key, Check, Copy, AlertCircle, ShieldCheck, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useServer } from '../context/ServerContext';
import { OfficialPeruLogo } from './OfficialPeruLogo';
import { playSuccessSound } from '../utils/audio';

export const DiscordAuthModal: React.FC = () => {
  const { isDiscordAuthOpen, setIsDiscordAuthOpen } = useServer();

  const [isConfigured, setIsConfigured] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showConfigInputs, setShowConfigInputs] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isStaticHost, setIsStaticHost] = useState(false);

  // Compute clean redirect URI based on environment
  useEffect(() => {
    if (!isDiscordAuthOpen) return;
    setErrorMessage('');

    const hostname = window.location.hostname;
    const isStatic = hostname.includes('github.io') || (!hostname.includes('localhost') && !hostname.includes('run.app'));
    setIsStaticHost(isStatic);

    // For static hosts (GitHub Pages), redirect back to the app itself!
    // For full-stack dev/backend, redirect to /api/auth/callback/discord
    let currentRedirect = '';
    if (isStatic) {
      currentRedirect = window.location.origin + window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') + '/';
    } else {
      currentRedirect = `${window.location.origin}/api/auth/callback/discord`;
    }
    setRedirectUri(currentRedirect);

    // Pre-fill from localStorage if available
    const savedClientId = localStorage.getItem('perp_discord_client_id');
    if (savedClientId) {
      setClientId(savedClientId);
      setIsConfigured(true);
    }

    // Attempt to query backend config if available (without failing on HTML)
    fetch('/api/auth/discord/config')
      .then(async (res) => {
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          return res.json();
        }
        return null;
      })
      .then((data) => {
        if (data) {
          setIsConfigured(Boolean(data.configured || savedClientId));
          if (data.redirectUri && !isStatic) setRedirectUri(data.redirectUri);
          if (data.clientId) setClientId(data.clientId);
          if (!data.configured && !savedClientId) {
            setShowConfigInputs(true);
          }
        } else if (!savedClientId) {
          setShowConfigInputs(true);
        }
      })
      .catch(() => {
        if (!savedClientId) setShowConfigInputs(true);
      });

    const handleAuthMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'DISCORD_OAUTH_ERROR') {
        setErrorMessage(
          typeof e.data.error === 'string'
            ? `Discord rechazó la autenticación: ${e.data.error}`
            : 'Error en la autorización de Discord. Verifica el Client ID y la Redirect URI en Discord.'
        );
        setLoading(false);
      }
    };
    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [isDiscordAuthOpen]);

  if (!isDiscordAuthOpen) return null;

  const handleCopyUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    playSuccessSound();
    setTimeout(() => setCopied(false), 2500);
  };

  const handleStartOfficialDiscordOAuth = async () => {
    setLoading(true);
    setErrorMessage('');

    const cleanClientId = clientId.trim();
    if (!cleanClientId) {
      setErrorMessage('Por favor ingresa el CLIENT ID de tu aplicación en Discord Developer Portal.');
      setLoading(false);
      return;
    }

    // Save client ID to localStorage so it persists on GitHub Pages / static
    try {
      localStorage.setItem('perp_discord_client_id', cleanClientId);
      setIsConfigured(true);
    } catch {}

    try {
      let finalAuthUrl = '';

      // If we are on static host (GitHub Pages) or no client secret, use direct client-side Implicit Grant!
      if (isStaticHost || !clientSecret.trim()) {
        finalAuthUrl = `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(
          cleanClientId
        )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=identify`;
      } else {
        // Attempt backend flow if available
        try {
          const saveRes = await fetch('/api/auth/discord/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: cleanClientId, clientSecret: clientSecret.trim() }),
          });
          const contentType = saveRes.headers.get('content-type') || '';
          if (saveRes.ok && contentType.includes('application/json')) {
            const res = await fetch(`/api/auth/discord/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
            if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
              const urlData = await res.json();
              finalAuthUrl = urlData.url;
            }
          }
        } catch {
          // fallback to client-side
        }

        // Fallback to direct client-side URL if backend wasn't reachable
        if (!finalAuthUrl) {
          finalAuthUrl = `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(
            cleanClientId
          )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=identify`;
        }
      }

      // Open official Discord authorization popup
      const popup = window.open(
        finalAuthUrl,
        'discord_oauth_popup',
        'width=580,height=820,menubar=no,toolbar=no,location=no,status=no'
      );

      if (!popup) {
        setErrorMessage('La ventana emergente fue bloqueada por el navegador. Permite ventanas emergentes para continuar.');
      } else {
        popup.focus();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con Discord.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#313338] text-slate-100 rounded-3xl shadow-2xl overflow-hidden border border-[#1e1f22] my-8">
        
        {/* Top bar with Discord Banner */}
        <div className="h-16 bg-[#5865F2] relative flex items-center justify-between px-6">
          <div className="flex items-center gap-2.5 text-white font-black text-sm tracking-wide">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            <span className="uppercase font-sans tracking-wider">Discord OAuth2 Oficial</span>
          </div>

          <button
            onClick={() => setIsDiscordAuthOpen(false)}
            className="text-white/80 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-black/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* Header with PE:RP Logo */}
          <div className="flex flex-col items-center text-center pb-4 border-b border-[#3f4147]">
            <div className="w-16 h-16 rounded-full bg-[#111422] border-2 border-red-500 shadow-xl flex items-center justify-center p-1 overflow-hidden mb-3">
              <OfficialPeruLogo size="sm" showSubtitle={false} />
            </div>

            <h3 className="font-bold text-white text-lg font-sans">
              Autenticación Oficial con Discord
            </h3>
            <p className="text-xs text-[#949ba4] mt-1 max-w-sm">
              Conéctate directamente con tu cuenta real de Discord. Se importará tu nombre oficial de Discord y tu foto de perfil.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Case 1: Configured -> Direct One-Click Launch */}
          {isConfigured && !showConfigInputs ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#2b2d31] border border-[#3f4147] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">OAuth2 Configurado y Listo</div>
                  <div className="text-[11px] text-slate-400">
                    Client ID guardado: <span className="font-mono text-emerald-400">{clientId}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleStartOfficialDiscordOAuth}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-sm font-bold transition-all shadow-lg shadow-indigo-950 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-75"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Abriendo Discord...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                      </svg>
                      <span>Abrir Ventana Oficial de Discord</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigInputs(true)}
                  className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Cambiar o editar Client ID
                </button>
              </div>
            </div>
          ) : (
            /* Case 2: Enter Client ID from Discord Developer Portal */
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#2b2d31] border border-[#3f4147] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#dbdee1] flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[#5865F2]" />
                    Paso 1: Copia esta Redirect URI
                  </span>
                  <a
                    href="https://discord.com/developers/applications"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-indigo-300 hover:text-white flex items-center gap-1 underline"
                  >
                    Abrir Portal Discord <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={redirectUri}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#1e1f22] border border-[#4e5058] text-[11px] font-mono text-emerald-400 font-bold select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUri}
                    className="px-3 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="text-[10px] text-[#949ba4] leading-relaxed">
                  Pega esta URL en tu aplicación de Discord: <strong>OAuth2 &gt; Redirects</strong>.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#dbdee1] mb-1">
                    Paso 2: CLIENT ID de tu Aplicación en Discord
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="ej. 1560384206612336793"
                    className="w-full px-3 py-2 rounded-xl bg-[#1e1f22] border border-[#4e5058] text-white text-xs font-mono font-bold focus:outline-none focus:border-[#5865F2]"
                  />
                </div>

                {!isStaticHost && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#dbdee1] mb-1">
                      Paso 3: CLIENT SECRET (Opcional)
                    </label>
                    <input
                      type="password"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      placeholder="Client Secret (Opcional)"
                      className="w-full px-3 py-2 rounded-xl bg-[#1e1f22] border border-[#4e5058] text-white text-xs font-mono focus:outline-none focus:border-[#5865F2]"
                    />
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-[#1e1f22]/70 border border-white/5 text-[11px] text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>En GitHub Pages la autenticación es directa y segura con tu <strong>Client ID</strong>.</span>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleStartOfficialDiscordOAuth}
                className="w-full py-3 px-6 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Conectando con Discord...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Conectar y Abrir Ventana Oficial de Discord</span>
                  </>
                )}
              </button>

              {isConfigured && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfigInputs(false)}
                    className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                  >
                    Volver al botón de inicio directo
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
