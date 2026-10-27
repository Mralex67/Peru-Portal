import React from 'react';
import { useServer } from '../context/ServerContext';

interface OfficialPeruLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
  showSubtitle?: boolean;
}

export const OfficialPeruLogo: React.FC<OfficialPeruLogoProps> = ({
  size = 'md',
  className = '',
  showSubtitle = true,
}) => {
  const { config } = useServer();
  const customLogoUrl =
    config?.customLogoUrl &&
    !config.customLogoUrl.includes('peru_street_logo.svg') &&
    !config.customLogoUrl.includes('placeholder')
      ? config.customLogoUrl
      : '/assets/logo-peru.png';

  // Sizing variants
  const scaleClass = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-24 h-24',
    hero: 'w-32 h-32 sm:w-40 sm:h-40',
  }[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none group ${className}`}>
      {/* 3D Official PE:RP Streets Emblem or Custom Admin Logo */}
      <div className={`relative ${scaleClass} shrink-0 drop-shadow-[0_8px_20px_rgba(220,38,38,0.35)] transition-transform duration-300 group-hover:scale-105 flex items-center justify-center`}>
        {customLogoUrl ? (
          <img
            src={customLogoUrl}
            alt="Logo Oficial PE:RP"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (target.src !== '/assets/logo-peru.png' && !target.src.endsWith('/assets/logo-peru.png')) {
                target.src = '/assets/logo-peru.png';
              }
            }}
            className="w-full h-full object-contain drop-shadow-[0_6px_16px_rgba(220,38,38,0.4)]"
          />
        ) : (
        <svg
          viewBox="0 0 240 240"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradients for metallic 3D feel */}
            <linearGradient id="shieldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            <linearGradient id="peWhite" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>

            <linearGradient id="rpRed" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            <linearGradient id="streetsRed" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>

            <filter id="shadow3d" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.85" />
            </filter>
          </defs>

          {/* Background Shield Outline (Peruvian Police Style Crest) */}
          <path
            d="M120 18 L155 35 L190 42 C192 110 162 165 120 188 C78 165 48 110 50 42 L85 35 L120 18 Z"
            fill="#141724"
            stroke="url(#shieldBorder)"
            strokeWidth="8"
            strokeLinejoin="round"
          />

          {/* Inner Crest Chevron with Peruvian Flag Colors (Red & White) */}
          <path
            d="M85 38 L120 25 L120 52 L85 58 Z"
            fill="#dc2626"
            opacity="0.9"
          />
          <path
            d="M120 25 L155 38 L155 58 L120 52 Z"
            fill="#f8fafc"
            opacity="0.95"
          />

          {/* Bold 3D Letters 'PE:RP' */}
          <g filter="url(#shadow3d)" style={{ fontWeight: 900 }}>
            {/* 'PE:' in Textured Metallic White */}
            <text
              x="25"
              y="130"
              fill="#0a0a0c"
              fontSize="78"
              fontFamily="Impact, 'Barlow Condensed', sans-serif"
              letterSpacing="-2"
              stroke="#0a0a0c"
              strokeWidth="12"
              strokeLinejoin="miter"
            >
              PE:
            </text>
            <text
              x="25"
              y="126"
              fill="url(#peWhite)"
              fontSize="78"
              fontFamily="Impact, 'Barlow Condensed', sans-serif"
              letterSpacing="-2"
            >
              PE:
            </text>

            {/* 'RP' in Deep Peruvian Crimson Red */}
            <text
              x="126"
              y="130"
              fill="#0a0a0c"
              fontSize="78"
              fontFamily="Impact, 'Barlow Condensed', sans-serif"
              letterSpacing="-2"
              stroke="#0a0a0c"
              strokeWidth="12"
              strokeLinejoin="miter"
            >
              RP
            </text>
            <text
              x="126"
              y="126"
              fill="url(#rpRed)"
              fontSize="78"
              fontFamily="Impact, 'Barlow Condensed', sans-serif"
              letterSpacing="-2"
            >
              RP
            </text>
          </g>

          {/* 'STREETS' 3D Bottom Banner (Peruvian Flag S-T-R-E-E-T-S) */}
          <g filter="url(#shadow3d)">
            {/* Heavy black backing shadow */}
            <path
              d="M32 144 H208 L198 186 H42 L32 144 Z"
              fill="#08090d"
              stroke="#1e2235"
              strokeWidth="3"
            />

            {/* Letters with exact coloring: S(red) T(red) R(white) E(white) E(red) T(red) S(red) */}
            <text
              x="38"
              y="180"
              fontSize="38"
              fontFamily="Impact, 'Barlow Condensed', sans-serif"
              letterSpacing="2"
              fontWeight="900"
            >
              <tspan fill="#dc2626">S</tspan>
              <tspan fill="#dc2626">T</tspan>
              <tspan fill="#ffffff">R</tspan>
              <tspan fill="#ffffff">E</tspan>
              <tspan fill="#dc2626">E</tspan>
              <tspan fill="#dc2626">T</tspan>
              <tspan fill="#dc2626">S</tspan>
            </text>
          </g>
        </svg>
        )}
      </div>

      {/* Typography Label */}
      {showSubtitle && (
        <div className="flex flex-col justify-center leading-none">
          <div className="flex items-center gap-1.5">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans uppercase">
              PE<span className="text-red-500">:</span>RP
            </span>
            <span className="text-xl sm:text-2xl font-black tracking-tight text-red-500 font-sans uppercase">
              STREETS
            </span>
            <span className="text-[10px] font-bold text-red-300 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-500/40 uppercase">
              OFICIAL
            </span>
          </div>
          <span className="text-[10px] tracking-[0.25em] font-extrabold uppercase text-slate-400 mt-0.5">
            PERÚ ROLEPLAY · ERLC
          </span>
        </div>
      )}
    </div>
  );
};
