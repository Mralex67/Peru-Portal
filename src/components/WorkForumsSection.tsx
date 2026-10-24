import React from 'react';
import {
  Briefcase,
  Clock,
  Sparkles,
  Users,
  Shield,
  Flame,
  Truck,
  Store,
  ArrowRight,
  Bell
} from 'lucide-react';
import { useServer } from '../context/ServerContext';
import { playClickSound } from '../utils/audio';

export const WorkForumsSection: React.FC = () => {
  const { config } = useServer();

  return (
    <section id="trabajos" className="relative py-24 bg-[#06070a] border-t border-white/5 overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-emerald-600/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-80 h-80 bg-red-600/5 rounded-full blur-[130px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold tracking-wider shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>BOLSA DE TRABAJO CIUDADANA PE:RP</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white font-sans">
            Foros de Trabajo
          </h2>

          <div className="inline-block">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-red-500/20 to-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-sm uppercase tracking-widest shadow-xl animate-pulse">
              <Clock className="w-4 h-4 text-amber-400" />
              ⚡ PRÓXIMAMENTE — CONVOCATORIAS EN APERTURA
            </span>
          </div>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Plataforma laboral oficial de PE:RP Streets. Próximamente se publicarán aquí las convocatorias y vacantes oficiales para las instituciones de seguridad, salud, transporte y comercio.
          </p>
        </div>

        {/* Spacious Placeholder Area (No jobs yet, clean breathing space as requested) */}
        <div className="max-w-4xl mx-auto my-8 p-10 sm:p-14 rounded-3xl bg-[#0a0d18]/80 border border-dashed border-white/15 text-center relative overflow-hidden backdrop-blur-sm shadow-2xl">
          {/* Subtle icon backdrop */}
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Briefcase className="w-10 h-10" />
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight mb-3">
            Bolsa de Empleo en Preparación
          </h3>

          <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed mb-8">
            Las postulaciones oficiales abrirán muy pronto. Las convocatorias para la <strong className="text-slate-200">Policía Nacional (PNP 105)</strong>, <strong className="text-slate-200">Serenazgo</strong>, <strong className="text-slate-200">SAMU / Bomberos</strong> y transporte civil se anunciarán con cupos limitados y sueldos quincenales en Soles en el Banco YA P.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-slate-400">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <Shield className="w-3.5 h-3.5 text-blue-400" /> Seguridad & PNP
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <Flame className="w-3.5 h-3.5 text-red-400" /> SAMU & Bomberos
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <Truck className="w-3.5 h-3.5 text-amber-400" /> Transporte & Talleres
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <Store className="w-3.5 h-3.5 text-emerald-400" /> Comercio & Negocios
            </span>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={config.discordInviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={playClickSound}
              className="px-6 py-3 rounded-2xl bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-950 transition-all cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Avisos de Convocatoria en Discord</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

      </div>
    </section>
  );
};
