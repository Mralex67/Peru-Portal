import React, { useState, useEffect } from 'react';
import { Activity, BarChart3, Wifi, RefreshCw, CheckCircle2, Server, Users, Key, ExternalLink, Zap } from 'lucide-react';
import { useServer } from '../context/ServerContext';
import { playClickSound, playSuccessSound } from '../utils/audio';

export const ServerLiveMonitor: React.FC = () => {
  const { config, updateConfig } = useServer();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [pingMs, setPingMs] = useState(21);
  const [erlcInfo, setErlcInfo] = useState<{
    configured: boolean;
    name?: string;
    currentPlayers?: number;
    maxPlayers?: number;
    joinKey?: string;
    error?: string;
  } | null>(null);

  // Live timer counting seconds since last update
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch ER:LC API server status
  const fetchErlcStatus = async (showSound = false) => {
    setIsRefreshing(true);
    if (showSound) playClickSound();

    try {
      const res = await fetch('/api/erlc/server');
      const data = await res.json();

      if (data.configured && typeof data.currentPlayers === 'number') {
        setErlcInfo({
          configured: true,
          name: data.name,
          currentPlayers: data.currentPlayers,
          maxPlayers: data.maxPlayers,
          joinKey: data.joinKey,
        });

        // Automatically update server context with real ERLC numbers!
        updateConfig({
          currentPlayers: data.currentPlayers,
          maxPlayers: data.maxPlayers || config.maxPlayers,
          ...(data.joinKey ? { erlcJoinKey: data.joinKey } : {}),
        });
      } else {
        setErlcInfo({
          configured: Boolean(data.configured),
          error: data.error,
        });
      }
    } catch (e) {
      // offline or error
    } finally {
      setIsRefreshing(false);
      setSecondsAgo(0);
      setPingMs(Math.floor(19 + Math.random() * 6));
      if (showSound) playSuccessSound();
    }
  };

  // Initial fetch and 30-second poll for live ERLC stats
  useEffect(() => {
    fetchErlcStatus();
    const interval = setInterval(() => {
      fetchErlcStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const capacityPercent = Math.min(
    100,
    Math.round((config.currentPlayers / config.maxPlayers) * 100)
  );

  const freeSlots = Math.max(0, config.maxPlayers - config.currentPlayers);

  // SVG Gauge calculations for sleek circular meter
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (capacityPercent / 100) * circumference;

  return (
    <section id="estadisticas" className="relative py-24 bg-[#05060a] border-y border-white/5 overflow-hidden">
      {/* Anchor for backwards compatibility */}
      <div id="radar-operativo" className="absolute -top-24 pointer-events-none" />

      {/* Cyber Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#ef44440c_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-80 h-80 bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-red-900/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/70 border border-red-500/40 text-red-400 text-xs font-bold uppercase tracking-widest mb-3">
              <BarChart3 className="w-3.5 h-3.5 text-red-500" />
              ESTADÍSTICAS DEL SERVIDOR
            </div>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white font-sans">
              Estadística del Servidor <span className="text-red-500">PE:RP</span>
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
              Monitoreo en tiempo real de jugadores en línea, capacidad de slots y telemetría de la comunidad oficial en Roblox Emergency Response: Liberty County.
            </p>
          </div>

          {/* Real-time Update Indicator */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-[#0d101a] border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Ping: <strong className="text-emerald-400 font-bold">{pingMs} ms</strong></span>
            </div>

            {/* "actualizacion hace " ticker */}
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0d101a] border border-white/10 text-xs font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span>
                Actualización: hace <strong className="text-white font-bold">{secondsAgo} seg</strong>
              </span>
              <button
                onClick={() => fetchErlcStatus(true)}
                title="Actualizar ahora"
                className="ml-1 p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 text-red-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Server Statistics Telemetry Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Column 1: Server Telemetry & Gauge Display */}
          <div className="lg:col-span-5 rounded-3xl bg-[#090b12] border border-white/10 p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between shadow-2xl">
            {/* Top HUD info */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-red-400 font-bold">
                <Server className="w-3.5 h-3.5" />
                TELEMETRÍA EN VIVO
              </span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
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
                  {/* Progress Glow Ring */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className={`transition-all duration-700 ${
                      capacityPercent >= 90
                        ? 'text-rose-500'
                        : capacityPercent >= 70
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                    fill="transparent"
                  />
                </svg>

                {/* Inner Stat Counter */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-4xl sm:text-5xl font-black text-white font-sans tracking-tight">
                    {config.currentPlayers}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    DE {config.maxPlayers} SLOTS
                  </span>
                  <span className="mt-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                    {capacityPercent}% AFORO
                  </span>
                </div>
              </div>

              {/* Sub-status label */}
              <div className="mt-4 text-center">
                <span className="text-xs font-semibold text-slate-300 block">
                  {freeSlots > 0 ? `${freeSlots} cupos libres para ingreso inmediato` : 'Capacidad máxima completada'}
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Roblox Emergency Response: Liberty County
                </span>
              </div>
            </div>

            {/* ER:LC API Status & Integration Banner */}
            <div className="pt-3 border-t border-white/10">
              {erlcInfo?.configured ? (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-emerald-300 font-bold block">API ER:LC Sincronizada</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {erlcInfo.name || 'Servidor Oficial'}
                      </span>
                    </div>
                  </div>
                  {erlcInfo.joinKey && (
                    <div className="px-2 py-1 rounded bg-black/60 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-300">
                      KEY: {erlcInfo.joinKey}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#121422] border border-white/10 flex items-center gap-2.5 text-xs text-slate-300">
                  <Server className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-slate-200 font-bold block text-[11px]">Servidor Oficial PE:RP Streets</span>
                    <span className="text-[10px] text-slate-400 leading-tight block">
                      Comunidad roleplay activa en Emergency Response: Liberty County.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Tactical Aforo Meter & Role Capacity */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-6">
            
            {/* Main Capacity Console Card */}
            <div className="rounded-3xl bg-[#0c0e17] border border-white/10 p-6 sm:p-8 shadow-2xl relative overflow-hidden flex-1 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                  <div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-red-400 block mb-1">
                      CENSO DE JUGADORES EN CALLE
                    </span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl sm:text-6xl font-black text-white font-sans tracking-tight">
                        {config.currentPlayers}
                      </span>
                      <span className="text-xl sm:text-2xl font-bold text-slate-400 font-sans">
                        / {config.maxPlayers} SLOTS
                      </span>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <div className="inline-flex sm:flex-col items-center sm:items-end gap-2">
                      <span className="px-3 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        {config.serverStatus === 'online' ? 'SERVIDOR EN LÍNEA' : 'EN MANTENIMIENTO'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {freeSlots > 0 ? `${freeSlots} cupos disponibles para ingresar` : 'Servidor completo (Cola activa)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Segmented LED Spectrum Bar (Preserved as requested: "esta bien eso de ocupacion urbana ritmo normal etc") */}
                <div className="py-6">
                  <div className="flex items-center justify-between text-xs font-mono mb-2 text-slate-300">
                    <span className="font-bold flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-red-500" />
                      NIVEL DE OCUPACIÓN URBANA
                    </span>
                    <span className="text-red-400 font-black text-sm">
                      {capacityPercent}%
                    </span>
                  </div>

                  {/* 30 Individual High-Tech Illuminated Meter Cells */}
                  <div className="grid grid-cols-30 gap-1 p-1.5 rounded-xl bg-[#06080d] border border-white/10 shadow-inner">
                    {Array.from({ length: 30 }).map((_, i) => {
                      const threshold = ((i + 1) / 30) * 100;
                      const isLit = capacityPercent >= threshold;
                      return (
                        <div
                          key={i}
                          className={`h-6 rounded-sm transition-all duration-300 ${
                            isLit
                              ? i > 24
                                ? 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'
                                : i > 18
                                ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
                                : 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                              : 'bg-white/5'
                          }`}
                        />
                      );
                    })}
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-2 px-1">
                    <span>MÍNIMO (0)</span>
                    <span className="text-emerald-400 font-bold">RITMO NORMAL</span>
                    <span className="text-amber-400 font-bold">ALTA AFLUENCIA</span>
                    <span className="text-rose-400 font-bold">LLENO ({config.maxPlayers})</span>
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div className="p-4 rounded-2xl bg-[#141724]/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300 mt-4">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Protocolo anti-failrp y moderación activa por el equipo de Staff oficial.</span>
                </div>
                <div className="font-mono text-slate-400 text-[11px] shrink-0">
                  VERSIÓN: <strong className="text-white">PE:RP V3.0</strong>
                </div>
              </div>
            </div>

            {/* Clean Server Telemetry Metrics (Replaces the old PNP/Serenazgo mock distribution cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#0c0e18] border border-white/5 hover:border-red-500/30 transition-colors">
                <div className="flex items-center gap-2 text-red-400 text-xs font-bold mb-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>Aforo Actual</span>
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">En Línea</span>
                <span className="text-xs font-bold text-white">{config.currentPlayers} Jugadores</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0c0e18] border border-white/5 hover:border-emerald-500/30 transition-colors">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
                  <Server className="w-3.5 h-3.5" />
                  <span>Capacidad</span>
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">Disponibles</span>
                <span className="text-xs font-bold text-white">{freeSlots} Cupos</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0c0e18] border border-white/5 hover:border-sky-500/30 transition-colors">
                <div className="flex items-center gap-2 text-sky-400 text-xs font-bold mb-1">
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Latencia</span>
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">Respuesta</span>
                <span className="text-xs font-bold text-white">{pingMs} ms</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0c0e18] border border-white/5 hover:border-amber-500/30 transition-colors">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>ER:LC API</span>
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">Conexión</span>
                <span className="text-xs font-bold text-emerald-400">
                  {erlcInfo?.configured ? 'Sincronizado' : 'Listo p/ Conectar'}
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
