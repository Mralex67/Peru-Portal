import React from 'react';
import {
  FileText,
  Users,
  ShieldCheck,
  Coins,
  ChevronRight,
  ExternalLink,
  Flame,
  Radio,
  Sparkles,
} from 'lucide-react';
import { InteractiveButton } from './InteractiveButton';
import { OfficialPeruLogo } from './OfficialPeruLogo';
import { useServer } from '../context/ServerContext';

export const Hero: React.FC = () => {
  const { config, setIsWhitelistInfoOpen } = useServer();

  const handleOpenDiscordDirect = () => {
    window.open(config.discordInviteUrl, '_blank');
  };

  return (
    <section id="inicio" className="relative min-h-[78vh] flex items-center pt-8 pb-16 overflow-hidden">
      {/* Background Hero with dynamic user upload or clean tactical ambient mesh */}
      <div className="absolute inset-0 z-0">
        {/* Subtle tactical grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        {/* Ambient Peruvian red/crimson atmospheric glow */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-red-800/10 rounded-full blur-[140px] pointer-events-none" />

        {/* Layered dark gradients for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07080c] via-[#07080c]/60 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Main Hero Column */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            
            {/* Top kicker tag */}
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-bold tracking-wider uppercase">
                <Flame className="w-3.5 h-3.5 text-red-500" />
                {config.seasonName}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                · {config.discordMembers} Miembros Oficiales
              </span>
            </div>

            {/* Official Logo Banner Badge */}
            <div className="mb-4">
              <OfficialPeruLogo size="hero" showSubtitle={false} />
            </div>

            {/* Hero Title */}
            <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight leading-[1] font-sans mb-5">
              <span className="block text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                {config.heroHeadline}
              </span>
              <span className="block bg-gradient-to-r from-red-500 via-rose-500 to-red-600 bg-clip-text text-transparent text-glow-red">
                STREETS HUB
              </span>
            </h1>

            {/* Dynamic Description editable from Admin */}
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl font-normal mb-8">
              {config.heroDescription}
            </p>

            {/* Action Buttons: 
                1. EMPEZAR WHITELIST 
                2. Direct link to https://discord.gg/NBwwDmrFwf
            */}
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <InteractiveButton
                variant="primary"
                size="lg"
                onClick={() => setIsWhitelistInfoOpen(true)}
                icon={<FileText className="w-5 h-5 text-white" />}
                iconRight={<ChevronRight className="w-5 h-5 text-red-200" />}
                className="w-full sm:w-auto"
              >
                EMPEZAR WHITELIST
              </InteractiveButton>

              <InteractiveButton
                variant="discord"
                size="lg"
                onClick={handleOpenDiscordDirect}
                icon={
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                }
                iconRight={<ExternalLink className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                UNIRSE A DISCORD
              </InteractiveButton>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium text-slate-300">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111420]/80 border border-white/5 hover:border-red-500/30 transition-colors">
                <Users className="w-3.5 h-3.5 text-red-400" />
                {config.discordMembers} Miembros en Discord
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111420]/80 border border-white/5 hover:border-red-500/30 transition-colors">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                Economía en Soles (S/.)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111420]/80 border border-white/5 hover:border-red-500/30 transition-colors">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Policía Nacional del Perú
              </span>
            </div>

          </div>

          {/* Right Column: Hero Visual Showcase (Creative & Original) */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden border border-red-500/30 p-2 bg-[#0c0e18]/80 backdrop-blur-xl shadow-2xl shadow-red-950/40 group">
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
                <img
                  src="/src/assets/images/roblox_sunset_pier_1792185364963.jpg"
                  alt="Roblox ERLC Atardecer en el Muelle PE:RP"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#090b12] via-transparent to-transparent" />
                
                {/* Floating Badge */}
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/50 text-red-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-red-400" />
                  OFICIAL PE:RP
                </div>

                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white">
                  <div>
                    <span className="font-black text-sm block tracking-wide">COMUNIDAD PERUANA</span>
                    <span className="text-[11px] text-slate-300">Roblox ERLC Roleplay Oficial</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[11px] font-mono font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ACTIVO
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
