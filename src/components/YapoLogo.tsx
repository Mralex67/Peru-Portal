import React from 'react';
import { useServer } from '../context/ServerContext';

interface YapoLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withContainer?: boolean;
}

export const YapoLogo: React.FC<YapoLogoProps> = ({
  className = '',
  size = 'md',
  withContainer = true,
}) => {
  const { config } = useServer();

  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-20 h-20 text-base',
    xl: 'w-32 h-32 text-xl',
  };

  const yapoLogoSrc = config?.yapoLogoUrl || '/assets/yapo-logo.png';

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${sizeMap[size]} ${className}`}>
      <img
        src={yapoLogoSrc}
        alt="Banco YA P"
        onError={(e) => {
          const target = e.currentTarget as HTMLImageElement;
          if (target.src !== '/assets/yapo-logo.png' && !target.src.endsWith('/assets/yapo-logo.png')) {
            target.src = '/assets/yapo-logo.png';
          }
        }}
        className={`w-full h-full object-contain ${withContainer ? 'rounded-2xl p-1 bg-[#5b0fa0] border border-purple-400/40' : ''} drop-shadow-md select-none`}
      />
    </div>
  );

  const svgContent = (
    <svg
      viewBox="0 0 200 200"
      className="w-full h-full drop-shadow-md select-none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background Rounded Squircle */}
      {withContainer && (
        <rect
          width="200"
          height="200"
          rx="52"
          fill="url(#yapo-purple-grad)"
        />
      )}

      <defs>
        <linearGradient id="yapo-purple-grad" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7a14c7" />
          <stop offset="0.5" stopColor="#670fb0" />
          <stop offset="1" stopColor="#4f088a" />
        </linearGradient>
        <linearGradient id="yapo-cyan-grad" x1="85" y1="28" x2="135" y2="78" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22f0d0" />
          <stop offset="1" stopColor="#00cca8" />
        </linearGradient>
        <filter id="yapo-shadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Cyan Speech Bubble with S/ */}
      <g filter="url(#yapo-shadow)">
        {/* Bubble circle */}
        <circle cx="108" cy="54" r="26" fill="url(#yapo-cyan-grad)" />
        {/* Bubble pointer pointing down-left */}
        <path
          d="M90 62 L80 78 L99 68 Z"
          fill="url(#yapo-cyan-grad)"
        />
        {/* S/ text inside speech bubble */}
        <text
          x="108"
          y="62"
          textAnchor="middle"
          fill="#5b0fa0"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="900"
          fontSize="24"
          letterSpacing="-1"
        >
          S/
        </text>
      </g>

      {/* Stylized 'yapo' Script Logo */}
      <g filter="url(#yapo-shadow)">
        {/* 'y' letter */}
        <path
          d="M 52 92 C 55 90 61 95 62 108 C 63 120 58 126 53 126 C 47 126 42 121 42 110 C 42 98 48 93 52 92 Z"
          fill="white"
        />
        <path
          d="M 68 93 C 65 110 59 135 48 152 C 40 165 31 170 24 163 C 18 156 22 146 30 137 C 40 126 47 114 50 93 C 51 86 58 87 68 93 Z"
          fill="white"
        />

        {/* 'a' letter */}
        <path
          d="M 88 103 C 80 102 73 109 72 118 C 71 127 77 132 84 132 C 92 132 98 125 99 116 C 100 108 95 103 88 103 Z M 85 112 C 87 112 89 114 89 118 C 89 122 86 124 83 124 C 80 124 79 121 79 117 C 80 114 82 112 85 112 Z"
          fill="white"
        />
        <path
          d="M 98 104 C 98 112 97 122 97 131 C 97 135 101 135 104 133 C 104 125 105 115 105 105 Z"
          fill="white"
        />

        {/* 'p' letter */}
        <path
          d="M 112 94 C 110 110 106 138 103 158 C 102 163 107 163 111 161 C 114 145 118 122 121 106 C 122 98 116 93 112 94 Z"
          fill="white"
        />
        <path
          d="M 118 106 C 123 102 131 102 136 107 C 141 113 140 123 134 129 C 128 134 120 133 115 128 C 117 120 118 112 118 106 Z M 126 113 C 123 113 122 116 122 120 C 122 123 124 125 127 125 C 130 125 131 122 131 118 C 131 115 129 113 126 113 Z"
          fill="white"
        />

        {/* 'o' letter */}
        <path
          d="M 157 101 C 146 101 139 110 138 121 C 138 131 146 138 156 138 C 168 138 175 128 175 118 C 175 107 167 101 157 101 Z M 156 111 C 160 111 163 115 163 120 C 163 125 160 128 156 128 C 151 128 148 125 148 120 C 148 115 151 111 156 111 Z"
          fill="white"
        />

        {/* Dynamic underline sweep under 'po' */}
        <path
          d="M 98 143 C 122 139 146 134 172 127 C 176 126 177 129 174 132 C 148 143 121 148 95 150 C 92 150 93 145 98 143 Z"
          fill="white"
        />
      </g>
    </svg>
  );

  return (
    <div className={`inline-flex items-center justify-center shrink-0 ${sizeMap[size]} ${className}`}>
      {svgContent}
    </div>
  );
};
