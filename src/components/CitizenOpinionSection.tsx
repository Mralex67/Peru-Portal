import React, { useState } from 'react';
import { ShieldCheck, Heart, Send, MessageSquareDashed } from 'lucide-react';
import { useServer } from '../context/ServerContext';
import { InteractiveButton } from './InteractiveButton';
import { playSuccessSound } from '../utils/audio';

export const CitizenOpinionSection: React.FC = () => {
  const {
    discordUser,
    citizenReviews,
    addCitizenReview,
    likeCitizenReview,
    setIsDiscordAuthOpen,
  } = useServer();

  const [message, setMessage] = useState('');
  const [faction, setFaction] = useState('Civil');
  const [justPublished, setJustPublished] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !discordUser) return;

    addCitizenReview({
      faction,
      message: message.trim(),
    });

    setMessage('');
    setJustPublished(true);
    playSuccessSound();
    setTimeout(() => setJustPublished(false), 3000);
  };

  return (
    <section id="opiniones" className="relative py-24 bg-[#090b12] border-t border-white/5">
      {/* Ambient background light */}
      <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-red-600/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
            REGISTRO CIUDADANO OFICIAL
          </div>
          <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white font-sans">
            Muro de Opinión & Experiencias en <span className="text-red-500">PE:RP</span>
          </h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Espacio oficial donde miembros verificados de la comunidad pueden compartir sus testimonios y vivencias en el servidor.
          </p>
        </div>

        {/* Submission Box */}
        <div className="max-w-3xl mx-auto mb-16">
          {!discordUser ? (
            /* State 1: Prompt to authorize with Discord */
            <div className="rounded-3xl bg-[#0f121e] border border-indigo-500/30 p-8 text-center relative overflow-hidden shadow-2xl shadow-indigo-950/40">
              <div className="w-14 h-14 rounded-2xl bg-[#5865F2]/20 border border-[#5865F2]/40 text-[#5865F2] flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-white uppercase font-sans mb-2">
                ¿Quieres dejar tu opinión de ciudadano?
              </h3>
              <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto mb-6">
                Para garantizar que cada mensaje provenga de un miembro real, autoriza tu cuenta de Discord en 1 solo clic.
              </p>
              <InteractiveButton
                variant="discord"
                size="md"
                onClick={() => setIsDiscordAuthOpen(true)}
              >
                Autorizar en Discord
              </InteractiveButton>
            </div>
          ) : (
            /* State 2: Active form for authenticated Discord user */
            <div className="rounded-3xl bg-[#0c0e18] border border-white/10 p-6 sm:p-8 shadow-2xl">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <img
                    src={discordUser.avatar}
                    alt={discordUser.displayName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-white">
                        {discordUser.displayName}
                      </span>
                      <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded font-bold border border-emerald-500/40">
                        VERIFICADO
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      Sesión activa con Discord
                    </span>
                  </div>
                </div>

                {justPublished && (
                  <span className="text-xs text-emerald-400 font-bold animate-in fade-in">
                    ✓ ¡Opinión publicada con éxito!
                  </span>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Tu Facción o Rol en PE:RP
                  </label>
                  <select
                    value={faction}
                    onChange={(e) => setFaction(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141726] border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-red-500 cursor-pointer"
                  >
                    <option value="Civil">Civil</option>
                    <option value="Oficial PNP">Policía Nacional (PNP)</option>
                    <option value="Serenazgo">Serenazgo</option>
                    <option value="Conductor">Conductor</option>
                    <option value="SAMU">SAMU / Bomberos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Tu Mensaje o Experiencia
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribe tu testimonio u opinión sobre el servidor PE:RP..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[#141726] border border-white/10 text-white text-xs leading-relaxed focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <InteractiveButton
                    variant="primary"
                    size="sm"
                    type="submit"
                    icon={<Send className="w-3.5 h-3.5" />}
                  >
                    Publicar Opinión
                  </InteractiveButton>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Real User Reviews Grid or Clean Empty State (Zero Fake Reviews) */}
        {citizenReviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {citizenReviews.map((rev) => (
              <div
                key={rev.id}
                className="rounded-2xl bg-[#0c0e18] border border-white/10 p-6 flex flex-col justify-between hover:border-red-500/40 transition-all duration-300 hover:-translate-y-1 group"
              >
                <div>
                  {/* Header: Author + Verified Tag */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={rev.avatar}
                        alt={rev.authorDiscord}
                        className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-red-500/50 transition-colors"
                      />
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-1.5">
                          {rev.authorDiscord}
                          <span title="Verificado con Discord">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          </span>
                        </div>
                        <div className="text-[11px] text-red-400 font-semibold">{rev.faction}</div>
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
                    "{rev.message}"
                  </p>
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{rev.createdAt}</span>
                  <button
                    onClick={() => likeCitizenReview(rev.id)}
                    className="flex items-center gap-1 text-slate-400 hover:text-red-400 transition-colors cursor-pointer group/like"
                  >
                    <Heart className="w-3.5 h-3.5 group-hover/like:fill-red-500 transition-all" />
                    <span>{rev.likes}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Clean Empty State without any fake reviews */
          <div className="text-center py-12 px-4 rounded-3xl bg-[#0c0e18]/60 border border-white/5 max-w-lg mx-auto">
            <MessageSquareDashed className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <h4 className="text-base font-bold text-white mb-1">
              Aún no hay opiniones publicadas
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Sé el primer ciudadano en publicar tu opinión tras autorizar tu cuenta con Discord arriba.
            </p>
          </div>
        )}

      </div>
    </section>
  );
};
