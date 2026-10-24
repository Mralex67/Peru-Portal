import React, { useState, useEffect } from 'react';
import { Activity, BarChart3, Wifi, RefreshCw, AlertTriangle, Server, Users, Wrench } from 'lucide-react';
import { useServer } from '../context/ServerContext';
import { playClickSound, playSuccessSound } from '../utils/audio';

export const ServerLiveMonitor: React.FC = () => {
  const { config } = useServer();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Live timer counting seconds since last update
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    playClickSound();
    setTimeout(() => {
      setIsRefreshing(false);
      setSecondsAgo(0);
      playSuccessSound();
    }, 500);
  };

  // SVG Gauge calculations
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference; // 0% fill

  return (
    <section id="estadisticas" className="relative py-24 bg-[#05060a] border-y border-white/5 overflow-hidden">
      {/* Anchor for backwards compatibility */}
      <div id="radar-operativo" className="absolute -top-24 pointer-events-none" />

      {/* Cyber Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#ef44440c_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-80 h-80 bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-900/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-400 text-xs font-bold uppercase tracking-widest mb-3">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              ESTADÍSTICAS DEL SERVIDOR • EN MANTENIMIENTO
            </div>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white font-sans">
              Estadística del Servidor <span className="text-red-500">PE:RP</span>
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
              Monitoreo en vivo de los servidores de PE:RP Streets. Los servidores se encuentran temporalmente en mantenimiento preventivo y actualización de sistemas.
            </p>
          </div>

          {/* Real-time Update Indicator */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-[#0d101a] border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Ping: <strong className="text-amber-400 font-bold">0 ms</strong></span>
            </div>

            {/* "actualizacion hace " ticker */}
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0d101a] border border-white/10 text-xs font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>
                Actualización: hace <strong className="text-white font-bold">{secondsAgo} seg</strong>
              </span>
              <button
                onClick={handleRefresh}
                title="Actualizar ahora"
                className="ml-1 p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Server Statistics Telemetry Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Column 1: Server Telemetry & Circular Gauge Display */}
          <div className="lg:col-span-5 rounded-3xl bg-[#090b12] border border-white/10 p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between shadow-2xl">
            {/* Top HUD info */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Wrench className="w-3.5 h-3.5" />
                MANTENIMIENTO TÉCNICO
              </span>
              <span className="text-amber-400 font-bold flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                EN MANTENIMIENTO
              </span>
            </div>

            {/* Circular Telemetry Gauge */}
            <div className="relative my-8 flex flex-col items-center justify-center">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
                  {/* Background Circle */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="10"
                    className="text-white/5"
                    fill="transparent"
                  />
                  {/* Progress Glow Ring (0% fill) */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="text-amber-400"
                    fill="transparent"
                  />
                </svg>

                {/* Inner Stat Counter */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-5xl font-black text-white font-sans tracking-tight">
                    0
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    DE 0 SLOTS
                  </span>
                  <span className="mt-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    0% AFORO
                  </span>
                </div>
              </div>

              {/* Sub-status label */}
              <div className="mt-4 text-center">
                <span className="text-xs font-semibold text-amber-300 block">
                  Servidor temporalmente cerrado por mantenimiento
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Roblox Emergency Response: Liberty County
                </span>
              </div>
            </div>

            {/* Server Maintenance Notice */}
            <div className="pt-3 border-t border-white/10">
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center gap-2.5 text-xs text-slate-300">
                <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-amber-300 font-bold block text-[11px]">Servidor en Mantenimiento</span>
                  <span className="text-[10px] text-slate-400 leading-tight block">
                    Actualizaciones de scripts y mapeo de calles en proceso.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Tactical Aforo Meter & Role Capacity */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-6">
            
            {/* Main Capacity Console Card */}
            <div className="rounded-3xl bg-[#0c0e17] border border-white/10 p-6 sm:p-8 shadow-2xl relative overflow-hidden flex-1 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                  <div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 block mb-1">
                      CENSO DE JUGADORES EN CALLE
                    </span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl sm:text-6xl font-black text-white font-sans tracking-tight">
                        0
                      </span>
                      <span className="text-xl sm:text-2xl font-bold text-slate-400 font-sans">
                        / 0 SLOTS
                      </span>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <div className="inline-flex sm:flex-col items-center sm:items-end gap-2">
                      <span className="px-3.5 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        SERVIDOR EN MANTENIMIENTO
                      </span>
                      <span className="text-xs text-slate-400">
                        Acceso temporalmente pausado
                      </span>
                    </div>
                  </div>
                </div>

                {/* Segmented LED Spectrum Bar (All in 0) */}
                <div className="py-6">
                  <div className="flex items-center justify-between text-xs font-mono mb-2 text-slate-300">
                    <span className="font-bold flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-amber-500" />
                      NIVEL DE OCUPACIÓN URBANA
                    </span>
                    <span className="text-amber-400 font-black text-sm">
                      0%
                    </span>
                  </div>

                  {/* 30 Individual High-Tech Illuminated Meter Cells (all off / 0) */}
                  <div className="grid grid-cols-30 gap-1 p-1.5 rounded-xl bg-[#06080d] border border-white/10 shadow-inner">
                    {Array.from({ length: 30 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-6 rounded-sm bg-white/5 transition-all duration-300"
                      />
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-2 px-1">
                    <span>MÍNIMO (0)</span>
                    <span className="text-slate-500">RITMO NORMAL</span>
                    <span className="text-slate-500">ALTA AFLUENCIA</span>
                    <span className="text-amber-400 font-bold">MANTENIMIENTO (0)</span>
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div className="p-4 rounded-2xl bg-[#141724]/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300 mt-4">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>El equipo de desarrollo se encuentra desplegando las nuevas características.</span>
                </div>
                <div className="font-mono text-slate-400 text-[11px] shrink-0">
                  ESTADO: <strong className="text-amber-400">MANTENIMIENTO</strong>
                </div>
              </div>
            </div>

            {/* Clean Server Telemetry Metrics (All in 0) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#0c0e18] border border-white/5">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>Aforo Actual</span>
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">En Línea</span>
                <span className="text-xs font-bold text-white">0 Jugadores</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0c0e18] border border-white/5">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
                  <Server className="w-3.5 h-3.5" />
                  <span>Capacidad</span>
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">Disponibles</span>
                <span className="text-xs font-bold text-white">0 Cupos</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0c0e18] border border-white/5">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Latencia</span>
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">Respuesta</span>
                <span className="text-xs font-bold text-white">0 ms</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0c0e18] border border-white/5">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Estado Servidor</span>
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">Operativo</span>
                <span className="text-xs font-bold text-amber-400">
                  En Mantenimiento
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
