import React, { useState } from 'react';
import { Shield, Car, Siren, CheckCircle2 } from 'lucide-react';
import { FACTIONS } from '../data/mockData';
import { InteractiveButton } from './InteractiveButton';
import { useServer } from '../context/ServerContext';
import defaultPatrolTruckImg from '../assets/images/peru_police_patrol_night_1792084208478.jpg';

export const FactionsSection: React.FC = () => {
  const { config, setIsWhitelistInfoOpen } = useServer();
  const [selectedFactionId, setSelectedFactionId] = useState('pnp');

  const activeFaction = FACTIONS.find((f) => f.id === selectedFactionId) || FACTIONS[0];

  return (
    <section id="facciones" className="relative py-24 bg-[#07080c] overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
              <span className="text-xs font-bold uppercase tracking-widest text-red-500">
                Fuerzas del Orden & Ciudadanía
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white font-sans">
              Facciones Oficiales <span className="text-red-500">PE:RP</span>
            </h2>
          </div>
        </div>

        {/* Faction Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {FACTIONS.map((faction) => {
            const isSelected = faction.id === selectedFactionId;
            return (
              <button
                key={faction.id}
                onClick={() => setSelectedFactionId(faction.id)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#151928] border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.25)]'
                    : 'bg-[#0e1019] border-white/5 hover:border-white/20 hover:bg-[#121422]'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  {faction.badge}
                </div>
                <div className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                  {faction.name.split('(')[0]}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Faction Showcase Card */}
        <div className="rounded-3xl bg-[#0c0e18] border border-white/10 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-bold tracking-wider uppercase">
                {activeFaction.badge}
              </div>

              <h3 className="text-3xl sm:text-4xl font-black text-white font-sans tracking-tight">
                {activeFaction.name}
              </h3>

              <p className="text-slate-300 text-base leading-relaxed">
                {activeFaction.shortDesc}
              </p>

              {/* Responsibilities list */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-500" />
                  Funciones en el Servidor Oficial:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeFaction.responsibilities.map((resp, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-white/5 p-2.5 rounded-xl border border-white/5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{resp}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vehicles */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4 text-amber-500" />
                  Flota vehicular autorizada:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {activeFaction.vehicles.map((veh, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-lg bg-[#141726] border border-white/10 text-xs font-mono text-slate-200"
                    >
                      {veh}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="pt-2">
                <InteractiveButton
                  variant="primary"
                  size="md"
                  onClick={() => setIsWhitelistInfoOpen(true)}
                  icon={<Siren className="w-4 h-4" />}
                >
                  Postular a esta Facción en Discord
                </InteractiveButton>
              </div>
            </div>

            {/* Right Media Preview */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border border-white/15 aspect-[16/10] shadow-2xl bg-[#090b14]">
                <img
                  src={config?.customPatrolTruckUrl || defaultPatrolTruckImg}
                  alt="Patrulla de la Policía Nacional del Perú"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white">
                  <span className="font-bold drop-shadow-md">Unidad de Patrullaje PE:RP V3</span>
                  <span className="px-2 py-0.5 rounded bg-red-600/80 font-mono text-[10px] font-bold">105 PNP</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
