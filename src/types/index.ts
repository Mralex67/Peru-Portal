export interface ServerConfig {
  serverName: string;
  seasonName: string;
  heroHeadline: string;
  heroDescription: string;
  discordMembers: string;
  currentPlayers: number;
  maxPlayers: number;
  serverStatus: 'online' | 'maintenance' | 'event';
  announcementText: string;
  discordInviteUrl: string;
  patrolAlert: string;
  customLogoUrl?: string;
  yapoLogoUrl?: string;
  customPatrolTruckUrl?: string;
  heroCardImage?: string;
  albumUploadsLocked?: boolean;
  erlcServerKey?: string;
  erlcAutoSync?: boolean;
  erlcJoinKey?: string;
}

export interface DiscordUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  role: string;
  discriminator: string;
  isStaff?: boolean;
}

export interface CitizenReview {
  id: string;
  authorDiscord: string;
  avatar: string;
  faction: string;
  message: string;
  createdAt: string;
  verifiedCitizen: boolean;
  likes: number;
}
