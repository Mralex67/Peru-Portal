import React from 'react';
import { ShieldCheck, ExternalLink, FileCheck } from 'lucide-react';
import { useServer } from '../context/ServerContext';
import { InteractiveButton } from './InteractiveButton';

export const AdmissionSection: React.FC = () => {
  const { config, setIsWhitelistInfoOpen, setIsDiscordAuthOpen } = useServer();

  const handleOpenDiscord = () => {
    window.open(config.discordInviteUrl, '_blank');
  };

  return (
    <section id="admision" className="relative py-24 bg-[#0a0c14] border-y border-white/5">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-72 bg-red-600/5 blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest mb-3">
            GUÍA OFICIAL PE:RP
          </div>
          <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white font-sans">
            ¿Cómo Ingresar a los Servidores de <span className="text-red-500">PE:RP</span>?
          </h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base">
            Sigue las directivas oficiales de la administración para incorporarte al rol urbano en Roblox ERLC.
          </p>
        </div>

        {/* 3 Creative Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          
          {/* Directiva 1: Discord Oficial */}
          <div className="rounded-2xl bg-[#0e1019] border border-white/10 hover:border-indigo-500/50 p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-950/30 group">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">
                  Etapa 01
                </span>
                <span className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-xs">
                  #1
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-3 font-sans">
                Únete a la Comunidad
              </h3>

              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
                Ingresa al Discord oficial de PE:RP Streets ({config.discordMembers} miembros). En él recibirás el rol inicial de aspirante, acceso a comunicados, anuncios y postulaciones oficiales.
              </p>
            </div>

            <InteractiveButton
              variant="discord"
              size="sm"
              onClick={handleOpenDiscord}
              icon={<ExternalLink className="w-3.5 h-3.5" />}
              className="w-full"
            >
              Unirse al Discord Oficial
            </InteractiveButton>
          </div>

          {/* Directiva 2: Whitelist en Ticket */}
          <div className="rounded-2xl bg-[#0e1019] border border-white/10 hover:border-red-500/50 p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-red-950/30 group">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">
                  Etapa 02
                </span>
                <span className="w-8 h-8 rounded-lg bg-red-950/80 border border-red-500/30 text-red-400 flex items-center justify-center font-bold text-xs">
                  #2
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-3 font-sans">
                Postulación de Whitelist
              </h3>

              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
                El proceso de admisión es 100% oficial mediante ticket en Discord. Demuestra que conoces la normativa peruana, conceptos de rol (MG, VDM, FearRP) y la historia de tu personaje.
              </p>
            </div>

            <InteractiveButton
              variant="primary"
              size="sm"
              onClick={() => setIsWhitelistInfoOpen(true)}
              icon={<FileCheck className="w-3.5 h-3.5" />}
              className="w-full"
            >
              Ver Proceso de Whitelist
            </InteractiveButton>
          </div>

          {/* Directiva 3: Autorización y Registro */}
          <div className="rounded-2xl bg-[#0e1019] border border-white/10 hover:border-emerald-500/50 p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-950/30 group">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  Etapa 03
                </span>
                <span className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  #3
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-3 font-sans">
                Vincularte en la Web
              </h3>

              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
                Autoriza tu cuenta con Discord en 1 clic para publicar en el muro de opiniones de la comunidad y acceder con tu perfil oficial.
              </p>
            </div>

            <InteractiveButton
              variant="secondary"
              size="sm"
              onClick={() => setIsDiscordAuthOpen(true)}
              icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
              className="w-full"
            >
              Vincular Discord Aquí
            </InteractiveButton>
          </div>

        </div>

      </div>
    </section>
  );
};
