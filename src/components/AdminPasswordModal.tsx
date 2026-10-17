import React, { useState } from 'react';
import { X, Lock, KeyRound, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useServer } from '../context/ServerContext';
import { playSuccessSound, playClickSound } from '../utils/audio';

export const AdminPasswordModal: React.FC = () => {
  const {
    isAdminPasswordModalOpen,
    setIsAdminPasswordModalOpen,
    unlockAdminWithPassword,
  } = useServer();

  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(false);

  if (!isAdminPasswordModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();

    const success = unlockAdminWithPassword(password);
    if (success) {
      playSuccessSound();
      setPassword('');
      setErrorMsg(false);
    } else {
      setErrorMsg(true);
    }
  };

  const handleClose = () => {
    setIsAdminPasswordModalOpen(false);
    setPassword('');
    setErrorMsg(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0c0e18] border border-red-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-red-950/60">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Security Header */}
        <div className="flex flex-col items-center text-center pb-6 border-b border-white/10">
          <div className="w-14 h-14 rounded-2xl bg-red-600/20 border-2 border-red-500/50 flex items-center justify-center text-red-500 shadow-lg shadow-red-950/50 mb-3">
            <Lock className="w-7 h-7" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 bg-red-950 px-2 py-0.5 rounded border border-red-500/30 mb-1">
            ACCESO RESTRINGIDO AL STAFF
          </span>
          <h3 className="text-xl font-black text-white uppercase font-sans">
            Panel de Administrador PE:RP
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Ingresa la contraseña del Alto Mando para modificar el servidor
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="pt-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-red-400" />
              Contraseña de Administrador
            </label>
            <input
              type="password"
              autoFocus
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMsg) setErrorMsg(false);
              }}
              className="w-full px-4 py-3 rounded-xl bg-[#141726] border border-white/10 text-white font-mono text-sm tracking-wider focus:outline-none focus:border-red-500 placeholder:text-slate-600"
              placeholder="••••••••••••"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Contraseña incorrecta. Acceso denegado.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-red-950 transition-all cursor-pointer"
            >
              Desbloquear Panel
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
