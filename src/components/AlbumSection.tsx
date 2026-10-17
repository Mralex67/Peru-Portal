import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  X,
  Maximize2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Link as LinkIcon,
  Lock,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { playClickSound, playSuccessSound } from '../utils/audio';
import { useServer } from '../context/ServerContext';

export interface SimplePhoto {
  id: string;
  src: string;
  date: string;
}

export const AlbumSection: React.FC = () => {
  const { config, isAdminAuthenticated } = useServer();
  const isLocked = config.albumUploadsLocked !== false;
  const canUpload = !isLocked || isAdminAuthenticated;

  const [photos, setPhotos] = useState<SimplePhoto[]>(() => {
    try {
      // Clear old v1 AI photos if present
      localStorage.removeItem('perp_album_photos_v1');
      const saved = localStorage.getItem('perp_album_photos_v2');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('perp_album_photos_v2', JSON.stringify(photos));
    } catch (e) {
      console.error(e);
    }
  }, [photos]);

  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('perp_album_photos_v2');
        if (saved) setPhotos(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('perp_album_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('perp_album_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Upload a photo file to server / save locally
  const uploadPhotoData = async (dataUrl: string) => {
    try {
      const res = await fetch('/api/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl }),
      });
      const data = await res.json();
      if (data.url) {
        return data.url as string;
      }
    } catch (err) {
      console.error('Server upload fallback to dataUrl:', err);
    }
    return dataUrl;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    playClickSound();

    const newItems: SimplePhoto[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const finalSrc = await uploadPhotoData(dataUrl);

      newItems.push({
        id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        src: finalSrc,
        date: new Date().toLocaleDateString('es-PE'),
      });
    }

    if (newItems.length > 0) {
      setPhotos((prev) => [...newItems, ...prev]);
      playSuccessSound();
    }
    setIsUploading(false);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    playClickSound();

    const newPhoto: SimplePhoto = {
      id: `photo-${Date.now()}`,
      src: inputUrl.trim(),
      date: new Date().toLocaleDateString('es-PE'),
    };

    setPhotos((prev) => [newPhoto, ...prev]);
    playSuccessSound();
    setInputUrl('');
    setIsUrlModalOpen(false);
  };

  const handleDeletePhoto = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playClickSound();
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    if (lightboxIndex !== null) setLightboxIndex(null);
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev! > 0 ? prev! - 1 : photos.length - 1));
      }
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev! < photos.length - 1 ? prev! + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, photos.length]);

  const currentPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null;

  return (
    <section id="album" className="relative py-20 bg-[#080910] border-t border-white/5 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-red-600/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
              <span className="text-xs font-bold uppercase tracking-widest text-red-500">
                Galería de la Comunidad
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white font-sans">
              Álbum <span className="text-red-500">PE:RP</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Fotos originales del servidor. Sube tus capturas directamente sin formularios ni textos.
            </p>
          </div>

          {/* Header Action / Locked State */}
          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />

            {isAdminAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/80 border border-red-500/40 text-[11px] font-bold text-red-300 uppercase">
                  <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
                  Admin
                </span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-950/60 transition-all cursor-pointer active:scale-95"
                >
                  {isUploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Subiendo...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Añadir Fotos</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    playClickSound();
                    setIsUrlModalOpen(true);
                  }}
                  title="Añadir por enlace de imagen"
                  className="p-2 rounded-xl bg-[#131625] hover:bg-[#1a1f33] border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : isLocked ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#121524] border border-amber-500/30 text-amber-300 text-xs font-semibold shadow-inner">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Subidas cerradas por Administración</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-950/60 hover:shadow-red-600/30 transition-all cursor-pointer active:scale-95"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Subiendo...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Subir Fotos</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    playClickSound();
                    setIsUrlModalOpen(true);
                  }}
                  title="Añadir por enlace de imagen"
                  className="p-2.5 rounded-xl bg-[#131625] hover:bg-[#1a1f33] border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <LinkIcon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Drag and Drop Zone / Empty State */}
        {photos.length === 0 ? (
          canUpload ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-12 sm:p-16 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                isDragging
                  ? 'border-red-500 bg-red-600/10'
                  : 'border-white/15 bg-[#0e101a] hover:border-white/30 hover:bg-[#111422]'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 mb-4 shadow-lg shadow-red-950/40">
                <ImageIcon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Sube fotos originales al Álbum
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
                Haz clic para seleccionar fotos de tu computadora o celular, o arrástralas y suéltalas en este espacio.
              </p>
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md">
                <Plus className="w-4 h-4" />
                <span>Seleccionar Fotos</span>
              </span>
            </div>
          ) : (
            <div className="rounded-3xl p-12 sm:p-16 text-center bg-[#0e101a] border border-white/10 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-[#141726] border border-white/10 flex items-center justify-center text-slate-400 mb-4 shadow-lg">
                <Lock className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Galería Oficial del Servidor
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed">
                El álbum está cerrado para subidas públicas. La administración publicará nuevas capturas y fotografías autorizadas.
              </p>
            </div>
          )
        ) : (
          <div>
            {/* Photos Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  onClick={() => {
                    playClickSound();
                    setLightboxIndex(index);
                  }}
                  className="group relative rounded-2xl overflow-hidden bg-[#0c0e18] border border-white/10 aspect-square cursor-pointer shadow-lg hover:border-red-500/60 transition-all hover:shadow-[0_8px_25px_rgba(220,38,38,0.2)]"
                >
                  <img
                    src={photo.src}
                    alt="Foto del servidor"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 select-none"
                  />

                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Top-right delete button - Admin only */}
                  {isAdminAuthenticated && (
                    <button
                      onClick={(e) => handleDeletePhoto(photo.id, e)}
                      title="Eliminar foto (Admin)"
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 hover:bg-red-600 text-slate-300 hover:text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Bottom-left expand icon */}
                  <div className="absolute bottom-2 left-2 p-1.5 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>

            {/* Quick add more bar at bottom */}
            <div className="mt-8 flex items-center justify-between p-4 rounded-2xl bg-[#0d0f19] border border-white/5 text-xs text-slate-400">
              <span className="font-mono text-slate-400 flex items-center gap-2">
                <span>{photos.length} {photos.length === 1 ? 'foto original' : 'fotos originales'}</span>
                {isLocked && (
                  <span className="text-[10px] text-amber-400/90 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Subida bloqueada
                  </span>
                )}
              </span>
              {canUpload && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir más fotos</span>
                </button>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Lightbox Fullscreen Modal */}
      {currentPhoto && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-white/10 hover:bg-red-600 text-white transition-all cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Left Arrow */}
          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                playClickSound();
                setLightboxIndex((prev) => (prev! > 0 ? prev! - 1 : photos.length - 1));
              }}
              className="absolute left-4 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer hidden sm:flex items-center justify-center"
              title="Foto anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Right Arrow */}
          {photos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                playClickSound();
                setLightboxIndex((prev) => (prev! < photos.length - 1 ? prev! + 1 : 0));
              }}
              className="absolute right-4 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer hidden sm:flex items-center justify-center"
              title="Siguiente foto"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Photo container */}
          <div
            className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentPhoto.src}
              alt="Foto ampliada"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl select-none"
            />
            
            <div className="mt-3 flex items-center justify-between w-full px-2 text-xs text-slate-400">
              <span className="font-mono text-white/70">
                {lightboxIndex + 1} de {photos.length}
              </span>
              {isAdminAuthenticated && (
                <button
                  onClick={(e) => handleDeletePhoto(currentPhoto.id, e)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar esta foto (Admin)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* URL Input Modal (for Discord CDN or web links) */}
      {isUrlModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsUrlModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#0e101a] border border-white/15 rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-red-500" />
                <span>Añadir por enlace de imagen</span>
              </h3>
              <button
                onClick={() => setIsUrlModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <input
                type="url"
                required
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Pega aquí el enlace de Discord o imagen..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-red-500"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Añadir al Álbum
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
