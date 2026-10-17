import React, { useRef, useState } from 'react';
import { playHoverSound, playClickSound } from '../utils/audio';

interface InteractiveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'discord' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const InteractiveButton: React.FC<InteractiveButtonProps> = ({
  variant = 'primary',
  size = 'md',
  glow = true,
  children,
  icon,
  iconRight,
  className = '',
  onClick,
  onMouseEnter,
  ...props
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsHovered(true);
    playHoverSound();
    onMouseEnter?.(e);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    playClickSound();
    onClick?.(e);
  };

  const sizeStyles = {
    sm: 'px-3.5 py-1.5 text-xs font-semibold gap-1.5 rounded-lg',
    md: 'px-5 py-2.5 text-sm font-semibold gap-2.5 rounded-xl',
    lg: 'px-7 py-3.5 text-base font-bold gap-3 rounded-2xl',
  }[size];

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-red-600 via-red-600 to-rose-700 text-white shadow-lg shadow-red-950/60 border border-red-500/40 hover:border-red-400 hover:shadow-red-600/50 hover:shadow-[0_0_28px_rgba(220,38,38,0.5)]',
    discord:
      'bg-[#5865F2] hover:bg-[#4752c4] text-white shadow-lg shadow-indigo-950/50 border border-indigo-400/30 hover:shadow-[0_0_25px_rgba(88,101,242,0.45)]',
    secondary:
      'bg-[#12141f] text-slate-100 hover:text-white border border-slate-700/60 hover:border-red-500/50 shadow-md shadow-black/40 hover:bg-[#181b29] hover:shadow-[0_0_20px_rgba(220,38,38,0.25)]',
    ghost:
      'bg-transparent text-slate-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10',
    outline:
      'bg-transparent text-white border border-red-500/60 hover:bg-red-600/10 hover:border-red-400 hover:shadow-[0_0_22px_rgba(220,38,38,0.35)]',
  }[variant];

  return (
    <button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={`relative group inline-flex items-center justify-center font-sans tracking-wide transition-all duration-200 ease-out transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] select-none cursor-pointer overflow-hidden ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {/* Dynamic Cursor Spotlight Overlay */}
      {isHovered && (
        <span
          className="pointer-events-none absolute inset-0 opacity-40 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 80px at ${mousePos.x}% ${mousePos.y}%, rgba(255, 255, 255, 0.4), transparent)`,
          }}
        />
      )}

      {/* Shimmer sweep line */}
      <span className="pointer-events-none absolute -inset-full top-0 block transform -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-none transition-all duration-700" />

      {/* Content */}
      {icon && <span className="shrink-0 transition-transform duration-200 group-hover:scale-110">{icon}</span>}
      <span className="relative z-10 whitespace-nowrap">{children}</span>
      {iconRight && (
        <span className="shrink-0 transition-transform duration-200 group-hover:translate-x-1">
          {iconRight}
        </span>
      )}
    </button>
  );
};
