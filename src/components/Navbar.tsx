import React, { useState } from 'react';
import { Volume2, VolumeX, Menu, X, Settings, LogOut, Camera } from 'lucide-react';
import { OfficialPeruLogo } from './OfficialPeruLogo';
import { InteractiveButton } from './InteractiveButton';
import { useServer } from '../context/ServerContext';
import { toggleSound, isSoundEnabled } from '../utils/audio';

export const Navbar: React.FC = () => {
  const {
    config,
    discordUser,
    logoutDiscord,
    requestAdminAccess,
    setIsDiscordAuthOpen,
    setIsWhitelistInfoOpen,
  } = useServer();

  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleSoundToggle = () => {
    const nextState = toggleSound();
    setSoundOn(nextState);
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#08090ddb] border-b border-white/5 transition-all">
      {/* Top Banner with Real-Time Announcement */}
      {config.announcementText && (
        <div className="bg-gradient-to-r from-red-950 via-red-900 to-black px-4 py-1 text-center border-b border-red-500/20">
          <p className="text-[11px] font-bold tracking-wide text-red-200 truncate">
            {config.announcementText}
          </p>
        </div>
      )}

      {/* Flag accent stripe */}
      <div className="h-[2px] w-full peru-flag-gradient opacity-90" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-8">
        
        {/* Zone 1: Official PE:RP Streets Wordmark & Shield */}
        <a href="#inicio" className="flex items-center group whitespace-nowrap shrink-0">
          <OfficialPeruLogo size="sm" showSubtitle={true} />
        </a>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs sm:text-sm font-semibold text-slate-300">
          <a
            href="#inicio"
            className="hover:text-white transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] whitespace-nowrap shrink-0"
          >
            Inicio
          </a>
          <a
            href="#admision"
            className="hover:text-white transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] whitespace-nowrap shrink-0"
          >
            Admisión
          </a>
          <button
            onClick={() => setIsWhitelistInfoOpen(true)}
            className="hover:text-red-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Whitelist
          </button>
          <a
            href="#facciones"
            className="hover:text-white transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] whitespace-nowrap shrink-0"
          >
            Facciones
          </a>
          <a
            href="#estadisticas"
            className="hover:text-white transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Estadística Servidor</span>
          </a>
          <a
            href="#album"
            className="hover:text-white transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] whitespace-nowrap shrink-0 flex items-center gap-1.5 text-amber-400 hover:text-amber-300"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Álbum</span>
          </a>
          <a
            href="#opiniones"
            className="hover:text-white transition-colors hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] whitespace-nowrap shrink-0"
          >
            Muro Ciudadano
          </a>
        </nav>

        {/* Zone 3: Actions (Sound, Admin Panel, Discord Auth Profile) */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Sound FX Toggle */}
          <button
            onClick={handleSoundToggle}
            title={soundOn ? 'Sonido activado' : 'Sonido silenciado'}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Toggle sound"
          >
            {soundOn ? (
              <Volume2 className="w-4 h-4 text-red-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Admin Panel Button (requires password CheilaRamirez) */}
          <button
            onClick={requestAdminAccess}
            title="Abrir Panel de Administrador de PE:RP"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-950/70 border border-red-500/30 text-red-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Admin Panel</span>
          </button>

          {/* Discord Button or Authenticated Profile Display */}
          {!discordUser ? (
            /* Unauthenticated: Button to open Discord Authorization Modal */
            <InteractiveButton
              variant="discord"
              size="sm"
              onClick={() => setIsDiscordAuthOpen(true)}
              icon={
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              }
            >
              Unirse a Discord
            </InteractiveButton>
          ) : (
            /* Authenticated: Shows Discord Avatar & Username */
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full bg-[#141724] hover:bg-[#1a1e30] border border-white/10 hover:border-red-500/50 transition-all cursor-pointer"
              >
                <div className="relative">
                  <img
                    src={discordUser.avatar}
                    alt={discordUser.displayName}
                    className="w-7 h-7 rounded-full object-cover border border-emerald-500"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-black" />
                </div>
                <span className="text-xs font-bold text-white max-w-[120px] truncate">
                  {discordUser.displayName}
                </span>
              </button>

              {/* Profile Dropdown */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#0f121d] border border-white/10 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in duration-150">
                  <div className="px-3 py-2 border-b border-white/5">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Sesión iniciada</p>
                    <p className="text-xs font-bold text-white truncate">{discordUser.displayName}</p>
                    <span className="text-[10px] text-emerald-400 font-medium">● Verificado por Discord</span>
                  </div>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      requestAdminAccess();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-red-400" />
                    Panel de Administración
                  </button>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logoutDiscord();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-300 hover:text-white"
            aria-label="Menú"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* Mobile drop menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-white/10 bg-[#0c0e17] px-5 py-4 space-y-3">
          <a
            href="#inicio"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-white py-1"
          >
            Inicio
          </a>
          <a
            href="#admision"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-white py-1"
          >
            Admisión
          </a>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setIsWhitelistInfoOpen(true);
            }}
            className="block w-full text-left text-red-400 font-semibold py-1"
          >
            Whitelist Oficial
          </button>
          <a
            href="#facciones"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-white py-1"
          >
            Facciones Oficiales
          </a>
          <a
            href="#estadisticas"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-white py-1 flex items-center gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Estadística Servidor</span>
          </a>
          <a
            href="#album"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-amber-400 hover:text-amber-300 font-semibold py-1 flex items-center gap-2"
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span>Álbum Fotográfico PE:RP</span>
          </a>
          <a
            href="#opiniones"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-white py-1"
          >
            Muro de Opinión Ciudadana
          </a>
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                requestAdminAccess();
              }}
              className="text-xs text-red-400 font-bold underline"
            >
              Abrir Panel Admin
            </button>
            <span className="text-xs text-emerald-400 font-mono">
              ● {config.currentPlayers}/{config.maxPlayers} Jugadores
            </span>
          </div>
        </div>
      )}
    </header>
  );
};
