import React, { useState } from 'react';
import { X, ShieldCheck, ExternalLink, Check, Copy, AlertCircle, FileText } from 'lucide-react';
import { useServer } from '../context/ServerContext';
import { InteractiveButton } from './InteractiveButton';
import { playSuccessSound } from '../utils/audio';

export const WhitelistInfoModal: React.FC = () => {
  const { config, isWhitelistInfoOpen, setIsWhitelistInfoOpen } = useServer();
  const [copied, setCopied] = useState(false);

  if (!isWhitelistInfoOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(config.discordInviteUrl);
    setCopied(true);
    playSuccessSound();
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenDiscord = () => {
    window.open(config.discordInviteUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0c0e18] border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-red-950/60 my-8">
        
        {/* Close Button */}
        <button
          onClick={() => setIsWhitelistInfoOpen(false)}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="p-3 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-500">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 bg-red-950 px-2 py-0.5 rounded border border-red-500/30">
              ADMISIÓN OFICIAL
            </span>
            <h3 className="text-2xl font-black text-white uppercase font-sans mt-0.5">
              Proceso de Whitelist PE:RP
            </h3>
          </div>
        </div>

        {/* Message body */}
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed mb-6">
          <p>
            Para garantizar que los servidores de <strong className="text-white">PE:RP STREETS</strong> mantengan el estándar de rol más alto de habla hispana, el proceso de whitelist es evaluado directamente por nuestro equipo de examinadores en nuestro servidor oficial de Discord.
          </p>

          {/* Steps Card */}
          <div className="p-4 rounded-2xl bg-[#141726] border border-white/5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-400" />
              Pasos para obtener tu Whitelist:
            </h4>
            
            <div className="flex items-start gap-3 text-xs">
              <span className="w-5 h-5 rounded-full bg-red-600 text-white font-bold flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <span>
                Ingresa al servidor oficial de Discord (<strong className="text-indigo-300">discord.gg/NBwwDmrFwf</strong>).
              </span>
            </div>

            <div className="flex items-start gap-3 text-xs">
              <span className="w-5 h-5 rounded-full bg-red-600 text-white font-bold flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <span>
                Dirígete a la sección <strong className="text-white">#postulaciones-whitelist</strong> o abre un ticket de admisión.
              </span>
            </div>

            <div className="flex items-start gap-3 text-xs">
              <span className="w-5 h-5 rounded-full bg-red-600 text-white font-bold flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <span>
                Completa tu formulario con la historia de tu personaje (Civil, PNP, Serenazgo o SAMU) y responde las preguntas de normativa urbana.
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Revisión rápida:</strong> Los tickets de Whitelist se revisan de forma continua todos los días por el staff activo de PE:RP.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '¡Enlace Copiado!' : 'Copiar Enlace'}
          </button>

          <InteractiveButton
            variant="discord"
            size="md"
            onClick={handleOpenDiscord}
            icon={<ExternalLink className="w-4 h-4" />}
          >
            Ir al Discord Oficial
          </InteractiveButton>
        </div>

      </div>
    </div>
  );
};
