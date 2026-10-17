import React, { createContext, useContext, useState, useEffect } from 'react';
import { ServerConfig, DiscordUser, CitizenReview } from '../types';
import { PERU_AVATARS } from '../utils/peruAvatars';

const DEFAULT_SERVER_CONFIG: ServerConfig = {
  serverName: 'PE:RP STREETS | PERÚ RP V3',
  seasonName: 'Temporada Oficial: Calles de Perú',
  heroHeadline: 'PERÚ ROLEPLAY',
  heroDescription:
    'La comunidad líder y oficial de simulación urbana en Roblox Emergency Response: Liberty County. Patrulla las calles peruanas con la Policía Nacional del Perú (PNP), Serenazgo y SAMU con economía en Soles y rol serio.',
  discordMembers: '18.450',
  currentPlayers: 48,
  maxPlayers: 50,
  serverStatus: 'online',
  announcementText: '🚨 Servidor oficial de PE:RP Streets activo en Roblox ERLC.',
  discordInviteUrl: 'https://discord.gg/NBwwDmrFwf',
  patrolAlert: 'Patrullaje Preventivo Nacional',
  customLogoUrl: '',
  customPatrolTruckUrl: '',
  albumUploadsLocked: true,
  erlcServerKey: '',
  erlcAutoSync: true,
  erlcJoinKey: '',
};

interface ServerContextType {
  config: ServerConfig;
  updateConfig: (newValues: Partial<ServerConfig>) => void;
  resetConfig: () => void;
  discordUser: DiscordUser | null;
  loginWithDiscord: (user: DiscordUser) => void;
  logoutDiscord: () => void;
  citizenReviews: CitizenReview[];
  addCitizenReview: (reviewData: { faction: string; message: string }) => void;
  likeCitizenReview: (id: string) => void;
  isAdminOpen: boolean;
  setIsAdminOpen: (open: boolean) => void;
  isAdminPasswordModalOpen: boolean;
  setIsAdminPasswordModalOpen: (open: boolean) => void;
  isAdminAuthenticated: boolean;
  requestAdminAccess: () => void;
  unlockAdminWithPassword: (pass: string) => boolean;
  lockAdmin: () => void;
  isDiscordAuthOpen: boolean;
  setIsDiscordAuthOpen: (open: boolean) => void;
  isWhitelistInfoOpen: boolean;
  setIsWhitelistInfoOpen: (open: boolean) => void;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

export const ServerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load config from localStorage
  const [config, setConfig] = useState<ServerConfig>(() => {
    try {
      const saved = localStorage.getItem('perp_server_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure no old Lima Metropolitana or activeDistrict persists
        delete parsed.activeDistrict;
        if (parsed.seasonName && parsed.seasonName.includes('Lima')) {
          parsed.seasonName = DEFAULT_SERVER_CONFIG.seasonName;
        }
        if (parsed.serverName && parsed.serverName.includes('CALLAO')) {
          parsed.serverName = DEFAULT_SERVER_CONFIG.serverName;
        }
        return { ...DEFAULT_SERVER_CONFIG, ...parsed };
      }
    } catch {
      // fallback
    }
    return DEFAULT_SERVER_CONFIG;
  });

  // Load discord user from localStorage
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(() => {
    try {
      const saved = localStorage.getItem('perp_discord_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return null;
  });

  // Citizen reviews: ZERO fake reviews. Only reviews published by real logged-in users.
  const [citizenReviews, setCitizenReviews] = useState<CitizenReview[]>(() => {
    try {
      const saved = localStorage.getItem('perp_citizen_reviews');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Keep ONLY real user submissions
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (r: CitizenReview) =>
              r &&
              typeof r.id === 'string' &&
              r.id.startsWith('cr-user-') &&
              r.authorDiscord !== 'Comandante_PNP_105' &&
              r.authorDiscord !== 'Serenazgo_Lima_Central' &&
              r.authorDiscord !== 'Ciudadano_Peruano' &&
              r.authorDiscord !== 'thedestving'
          );
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  // Admin authentication state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Other modals
  const [isDiscordAuthOpen, setIsDiscordAuthOpen] = useState(false);
  const [isWhitelistInfoOpen, setIsWhitelistInfoOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('perp_server_config', JSON.stringify(config));
    } catch {
      // ignore
    }
  }, [config]);

  useEffect(() => {
    try {
      if (discordUser) {
        localStorage.setItem('perp_discord_user', JSON.stringify(discordUser));
      } else {
        localStorage.removeItem('perp_discord_user');
      }
    } catch {
      // ignore
    }
  }, [discordUser]);

  useEffect(() => {
    try {
      localStorage.setItem('perp_citizen_reviews', JSON.stringify(citizenReviews));
    } catch {
      // ignore
    }
  }, [citizenReviews]);

  // Listen to postMessage from OAuth popup or URL query parameters
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'DISCORD_OAUTH_SUCCESS' && event.data.user) {
        setDiscordUser(event.data.user);
        setIsDiscordAuthOpen(false);
      }
    };
    window.addEventListener('message', handleMessage);

    // Also check query param if redirected in the main window
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const authUserJson = params.get('discord_user');
      if (authUserJson) {
        try {
          const parsedUser = JSON.parse(decodeURIComponent(authUserJson));
          if (parsedUser && parsedUser.displayName) {
            setDiscordUser(parsedUser);
            setIsDiscordAuthOpen(false);
          }
        } catch {
          // ignore
        }
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const updateConfig = (newValues: Partial<ServerConfig>) => {
    setConfig((prev) => ({ ...prev, ...newValues }));
  };

  const resetConfig = () => {
    setConfig(DEFAULT_SERVER_CONFIG);
  };

  const loginWithDiscord = (user: DiscordUser) => {
    setDiscordUser(user);
    setIsDiscordAuthOpen(false);
  };

  const logoutDiscord = () => {
    setDiscordUser(null);
  };

  const addCitizenReview = ({ faction, message }: { faction: string; message: string }) => {
    if (!discordUser) return;
    const newRev: CitizenReview = {
      id: `cr-user-${Date.now()}`,
      authorDiscord: discordUser.displayName || discordUser.username,
      avatar: discordUser.avatar || PERU_AVATARS.peruCitizen,
      faction,
      message,
      createdAt: 'hace unos momentos',
      verifiedCitizen: true,
      likes: 1,
    };
    setCitizenReviews((prev) => [newRev, ...prev]);
  };

  const likeCitizenReview = (id: string) => {
    setCitizenReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, likes: r.likes + 1 } : r))
    );
  };

  // Request admin access (requires CheilaRamirez password)
  const requestAdminAccess = () => {
    if (isAdminAuthenticated) {
      setIsAdminOpen(true);
    } else {
      setIsAdminPasswordModalOpen(true);
    }
  };

  const unlockAdminWithPassword = (password: string): boolean => {
    if (password === 'CheilaRamirez') {
      setIsAdminAuthenticated(true);
      setIsAdminPasswordModalOpen(false);
      setIsAdminOpen(true);
      return true;
    }
    return false;
  };

  const lockAdmin = () => {
    setIsAdminAuthenticated(false);
    setIsAdminOpen(false);
  };

  return (
    <ServerContext.Provider
      value={{
        config,
        updateConfig,
        resetConfig,
        discordUser,
        loginWithDiscord,
        logoutDiscord,
        citizenReviews,
        addCitizenReview,
        likeCitizenReview,
        isAdminOpen,
        setIsAdminOpen,
        isAdminPasswordModalOpen,
        setIsAdminPasswordModalOpen,
        isAdminAuthenticated,
        requestAdminAccess,
        unlockAdminWithPassword,
        lockAdmin,
        isDiscordAuthOpen,
        setIsDiscordAuthOpen,
        isWhitelistInfoOpen,
        setIsWhitelistInfoOpen,
      }}
    >
      {children}
    </ServerContext.Provider>
  );
};

export const useServer = () => {
  const context = useContext(ServerContext);
  if (!context) {
    throw new Error('useServer must be used within a ServerProvider');
  }
  return context;
};
