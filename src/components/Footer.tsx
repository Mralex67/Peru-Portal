import React from 'react';
import { OfficialPeruLogo } from './OfficialPeruLogo';
import { useServer } from '../context/ServerContext';
import { Shield, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  const { config, requestAdminAccess, setIsWhitelistInfoOpen, setIsDiscordAuthOpen } = useServer();

  const handleOpenDiscord = () => {
    window.open(config.discordInviteUrl, '_blank');
  };

  return (
    <footer className="relative bg-[#06070a] border-t border-white/5 pt-16 pb-12 text-slate-400 text-sm">
      {/* Peru flag bottom accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] peru-flag-gradient opacity-90" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          
          {/* Col 1: Brand & Desc */}
          <div className="md:col-span-2 space-y-4">
            <OfficialPeruLogo size="lg" showSubtitle={true} />
            <p className="text-slate-400 text-xs sm:text-sm max-w-md leading-relaxed">
              La comunidad oficial de roleplay hispanohablante en Emergency Response: Liberty County (Roblox). Diseñada con dedicación para ofrecer patrullas realistas con la Policía Nacional del Perú, Serenazgo, SAMU y economía peruana en Soles.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>🇵🇪 Servidor Oficial de PE:RP Streets</span>
              <span>·</span>
              <span>Comunidad Verificada</span>
            </div>
          </div>

          {/* Col 2: Accesos Rápidos */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Navegación
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="#inicio" className="hover:text-red-400 transition-colors">
                  Inicio del Servidor
                </a>
              </li>
              <li>
                <a href="#estado-servidor" className="hover:text-red-400 transition-colors">
                  Telemetría & Estado en Vivo
                </a>
              </li>
              <li>
                <a href="#admision" className="hover:text-red-400 transition-colors">
                  Guía de Admisión
                </a>
              </li>
              <li>
                <button
                  onClick={() => setIsWhitelistInfoOpen(true)}
                  className="hover:text-red-400 transition-colors cursor-pointer text-left"
                >
                  Postulación de Whitelist
                </button>
              </li>
              <li>
                <a href="#opiniones" className="hover:text-red-400 transition-colors">
                  Muro de Opinión Ciudadana
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Comunidad y Servidor */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">
              Comunidad & Enlaces
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={handleOpenDiscord}
                  className="hover:text-indigo-400 transition-colors cursor-pointer text-left flex items-center gap-1.5"
                >
                  <span>Discord Oficial ({config.discordMembers})</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => setIsDiscordAuthOpen(true)}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Vincular Cuenta de Discord
                </button>
              </li>
              <li>
                <span className="text-slate-500">{config.seasonName}</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Disclaimer & Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} PE:RP STREETS / PERÚ RP OFICIAL. Todos los derechos reservados.</span>
            <button
              onClick={requestAdminAccess}
              title="Portal Seguro"
              aria-label="Portal de Seguridad"
              className="p-1 rounded text-slate-700 hover:text-slate-400 transition-colors cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-center md:text-right max-w-xl text-[10px] leading-tight">
            PE:RP es una comunidad independiente creada para fans de Emergency Response: Liberty County en Roblox.
          </div>
        </div>

      </div>
    </footer>
  );
};
