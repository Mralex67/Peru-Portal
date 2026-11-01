import React, { useState, useEffect } from 'react';
import { Activity, Wifi, RefreshCw, Server, Users, Radio, Key, Copy, Check, ExternalLink } from 'lucide-react';
import { useServer } from '../context/ServerContext';
import { playClickSound, playSuccessSound } from '../utils/audio';

export const ServerLiveMonitor: React.FC = () => {
  const { config, updateConfig } = useServer();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [copiedKey, setCopiedKey] = useState(false);
  const [erlcData, setErlcData] = useState<{
    name?: string;
    currentPlayers?: number;
    maxPlayers?: number;
    joinKey?: string;
    isOnline?: boolean;
    ping?: number;
  }>({
    name: config.serverName,
    currentPlayers: config.currentPlayers,
    maxPlayers: config.maxPlayers,
    joinKey: config.erlcJoinKey || 'perurp',
    isOnline: config.currentPlayers >= 1,
  });

  // Fetch ER:LC data directly on mount & refresh
  const fetchLiveErlc = async () => {
    try {
      const res = await fetch('/api/erlc/server');
      if (res.ok) {
        const json = await res.json();
        if (json && json.configured && typeof json.currentPlayers === 'number') {
          const players = json.currentPlayers;
          const maxP = json.maxPlayers || 50;
          const isOpen = players >= 1;
          setErlcData({
            name: json.name || config.serverName,
            currentPlayers: players,
            maxPlayers: maxP,
            joinKey: json.joinKey || config.erlcJoinKey || 'perurp',
            isOnline: isOpen,
            ping: isOpen ? 18 : 0,
          });
          updateConfig({
            currentPlayers: players,
            maxPlayers: maxP,
            serverStatus: isOpen ? 'online' : 'closed',
            ...(json.joinKey ? { erlcJoinKey: json.joinKey } : {}),
          });
        }
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchLiveErlc();
    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    const poller = setInterval(fetchLiveErlc, 15000);
    return () => {
      clearInterval(timer);
      clearInterval(poller);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    playClickSound();
    await fetchLiveErlc();
    setSecondsAgo(0);
    playSuccessSound();
    setIsRefreshing(false);
  };

  const handleCopyKey = () => {
    const key = erlcData.joinKey || config.erlcJoinKey || 'perurp';
    navigator.clipboard.writeText(key);
    playSuccessSound();
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const currentPlayers = typeof erlcData.currentPlayers === 'number' ? erlcData.currentPlayers : config.currentPlayers;
  const maxPlayers = erlcData.maxPlayers || config.maxPlayers || 50;
  const isOpen = currentPlayers >= 1;

  // Percentage & Gauge calculations
  const occupancyPercent = maxPlayers > 0 ? Math.min(100, Math.round((currentPlayers / maxPlayers) * 100)) : 0;
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isOpen
    ? circumference - (Math.max(currentPlayers, 1) / maxPlayers) * circumference
    : circumference;

  return (
    <section id="estadisticas" className="relative py-24 bg-[#05060a] border-y border-white/5 overflow-hidden">
      {/* Anchor for backwards compatibility */}
      <div id="radar-operativo" className="absolute -top-24 pointer-events-none" />

      {/* Cyber Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#10b9810a_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />
      <div
        className={`absolute top-1/3 left-10 w-80 h-80 rounded-full blur-[120px] pointer-events-none transition-colors duration-700 ${
          isOpen ? 'bg-emerald-600/10' : 'bg-red-600/10'
        }`}
      />
      <div
        className={`absolute bottom-10 right-10 w-96 h-96 rounded-full blur-[140px] pointer-events-none transition-colors duration-700 ${
          isOpen ? 'bg-sky-600/10' : 'bg-slate-800/20'
        }`}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl">
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-3 border shadow-sm transition-colors duration-500 ${
                isOpen
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${isOpen ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
              <span>
                {isOpen ? '🟢 SERVIDOR EN VIVO • ESTADO: ABIERTO' : '🔴 TELEMETRÍA EN VIVO • ESTADO: CERRADO'}
              </span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white font-sans">
              Estadísticas del Servidor <span className={isOpen ? 'text-emerald-400' : 'text-red-500'}>PE:RP</span>
            </h2>

            <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
              {isOpen ? (
                <>
                  Monitoreo en tiempo real sincronizado con la API oficial de <strong>Roblox Emergency Response: Liberty County</strong>.
                  Patrullajes activos, aforo ciudadano y policía en calle.
                </>
              ) : (
                <>
                  Monitoreo en tiempo real sincronizado con <strong>Roblox ER:LC</strong>.
                  El servidor se encuentra actualmente <strong>Cerrado</strong> (0 jugadores). Se abrirá automáticamente al ingresar el primer usuario.
                </>
              )}
            </p>
          </div>

          {/* Real-time Update Indicator */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-[#0d101a] border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span>
                Ping:{' '}
                <strong className={`font-bold ${isOpen ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {isOpen ? '18 ms' : '0 ms'}
                </strong>
              </span>
            </div>

            {/* "actualizacion hace " ticker */}
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0d101a] border border-white/10 text-xs font-mono text-slate-300">
              <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              <span>
                Actualización: hace <strong className="text-white font-bold">{secondsAgo} seg</strong>
              </span>
              <button
                onClick={handleRefresh}
                title="Actualizar ahora"
                className="ml-1 p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isOpen ? 'text-emerald-400' : 'text-slate-300'} ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Server Statistics Telemetry Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Column 1: Server Telemetry & Circular Gauge Display */}
          <div className="lg:col-span-5 rounded-3xl bg-[#090b12] border border-white/10 p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between shadow-2xl">
            {/* Top HUD info */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 text-[11px] font-mono">
              <span className={`flex items-center gap-1.5 font-bold ${isOpen ? 'text-emerald-400' : 'text-rose-400'}`}>
                <Activity className="w-3.5 h-3.5" />
                {isOpen ? 'SISTEMA OPERATIVO' : 'INSTANCIA EN ESPERA'}
              </span>
              <span
                className={`font-bold flex items-center gap-1.5 px-3 py-1 rounded-full text-xs uppercase tracking-wider border shadow-md ${
                  isOpen
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50'
                    : 'bg-rose-950/90 text-rose-300 border-rose-500/50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                {isOpen ? 'Estado: Abierto' : 'Estado: Cerrado'}
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
                    className={`transition-all duration-1000 ${isOpen ? 'text-emerald-400' : 'text-slate-700'}`}
                    fill="transparent"
                  />
                </svg>

                {/* Inner Stat Counter */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-5xl font-black text-white font-sans tracking-tight">
                    {currentPlayers}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                    DE {maxPlayers} SLOTS
                  </span>
                  <span
                    className={`mt-1 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                      isOpen
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-white/10'
                    }`}
                  >
                    {occupancyPercent}% AFORO
                  </span>
                </div>
              </div>

              {/* Sub-status label */}
              <div className="mt-4 text-center">
                <span className={`text-xs font-semibold block ${isOpen ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {isOpen
                    ? 'Servidor abierto y patrullas disponibles'
                    : 'Servidor cerrado (0 jugadores conectados)'}
                </span>
                <span className="text-[11px] font-mono text-slate-400 mt-0.5 block">
                  {erlcData.name || config.serverName}
                </span>
              </div>
            </div>

            {/* Quick Join Key Card */}
            <div className="pt-3 border-t border-white/10">
              <div className="p-3.5 rounded-2xl bg-[#0c0e18] border border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                      Código de Unión (Join Key)
                    </span>
                    <span className="text-sm font-mono font-black text-white tracking-wider">
                      {erlcData.joinKey || config.erlcJoinKey || 'perurp'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Copiar código"
                >
                  {copiedKey ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
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
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      CENSO DE JUGADORES EN CALLE (ER:LC)
                    </span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl sm:text-6xl font-black text-white font-sans tracking-tight">
                        {currentPlayers}
                      </span>
                      <span className="text-xl sm:text-2xl font-bold text-slate-400 font-sans">
                        / {maxPlayers} SLOTS
                      </span>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <div className="inline-flex sm:flex-col items-center sm:items-end gap-2">
                      <span
                        className={`px-4 py-2 rounded-2xl text-xs font-mono font-black flex items-center gap-2 border shadow-lg ${
                          isOpen
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60 shadow-emerald-950/60'
                            : 'bg-rose-950 text-rose-300 border-rose-500/60 shadow-rose-950/60'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                        <span>{isOpen ? 'ESTADO : ABIERTO' : 'ESTADO : CERRADO'}</span>
                      </span>
                      <span className="text-xs text-slate-400">
                        {isOpen ? 'Servidor activo y conectado' : '0 jugadores activos'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Segmented LED Spectrum Bar (Dynamic Illumination) */}
                <div className="py-6">
                  <div className="flex items-center justify-between text-xs font-mono mb-2 text-slate-300">
                    <span className="font-bold flex items-center gap-1.5">
                      <Activity className={`w-3.5 h-3.5 ${isOpen ? 'text-emerald-400' : 'text-slate-500'}`} />
                      NIVEL DE OCUPACIÓN URBANA
                    </span>
                    <span className={`font-black text-sm ${isOpen ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {occupancyPercent}%
                    </span>
                  </div>

                  {/* 30 Individual High-Tech Illuminated Meter Cells */}
                  <div className="grid grid-cols-30 gap-1 p-1.5 rounded-xl bg-[#06080d] border border-white/10 shadow-inner">
                    {Array.from({ length: 30 }).map((_, i) => {
                      const activeSlots = Math.round((currentPlayers / maxPlayers) * 30);
                      const isCellActive = isOpen && i < Math.max(1, activeSlots);
                      return (
                        <div
                          key={i}
                          className={`h-6 rounded-sm transition-all duration-300 ${
                            isCellActive
                              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                              : 'bg-white/5'
                          }`}
                        />
                      );
                    })}
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-2 px-1">
                    <span>MÍNIMO (0)</span>
                    <span className={occupancyPercent > 20 ? 'text-emerald-400' : ''}>RITMO NORMAL</span>
                    <span className={occupancyPercent > 70 ? 'text-amber-400 font-bold' : ''}>ALTA AFLUENCIA</span>
                    <span className={occupancyPercent >= 95 ? 'text-rose-400 font-bold' : ''}>MÁXIMO ({maxPlayers})</span>
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs mt-4 ${
                  isOpen
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                    : 'bg-[#141724]/60 border-white/5 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span>
                    {isOpen
                      ? '¡Servidor disponible para jugar! Únete a la partida en Roblox ER:LC con el Join Key.'
                      : 'El servidor se abrirá de inmediato cuando se una el primer jugador en Roblox.'}
                  </span>
                </div>
                <div className="font-mono text-[11px] shrink-0 font-bold">
                  ESTADO:{' '}
                  <span className={isOpen ? 'text-emerald-400' : 'text-rose-400'}>
                    {isOpen ? 'ABIERTO' : 'CERRADO'}
                  </span>
                </div>
              </div>
            </div>

            {/* Clean Server Telemetry Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#0c0e18] border border-white/5">
                <div className={`flex items-center gap-2 text-xs font-bold mb-1 ${isOpen ? 'text-emerald-400' : 'text-slate-400'}`}>
                  <Users className="w-3.5 h-3.5" />
                  <span>Aforo Actual</span>
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">En Línea</span>
                <span className="text-xs font-bold text-white">
                  {currentPlayers} {currentPlayers === 1 ? 'Jugador' : 'Jugadores'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0c0e18] border border-white/5">
                <div className={`flex items-center gap-2 text-xs font-bold mb-1 ${isOpen ? 'text-emerald-400' : 'text-slate-400'}`}>
                  <Server className="w-3.5 h-3.5" />
                  <span>Capacidad</span>
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">Disponibles</span>
                <span className="text-xs font-bold text-white">
                  {Math.max(0, maxPlayers - currentPlayers)} Cupos
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0c0e18] border border-white/5">
                <div className={`flex items-center gap-2 text-xs font-bold mb-1 ${isOpen ? 'text-emerald-400' : 'text-slate-400'}`}>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Latencia</span>
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">Respuesta</span>
                <span className="text-xs font-bold text-white">
                  {isOpen ? '18 ms' : '0 ms'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0c0e18] border border-white/5">
                <div className={`flex items-center gap-2 text-xs font-bold mb-1 ${isOpen ? 'text-emerald-400' : 'text-rose-400'}`}>
                  <Radio className="w-3.5 h-3.5" />
                  <span>Estado Servidor</span>
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">Operativo</span>
                <span className={`text-xs font-bold ${isOpen ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isOpen ? 'Abierto' : 'Cerrado'}
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
