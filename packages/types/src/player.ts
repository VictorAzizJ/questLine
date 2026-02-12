// Player identification
export type PlayerId = string;
export type UserId = string;

// Player base interface
export interface Player {
  id: PlayerId;
  gameId: string;
  userId: UserId | null; // null for AI players
  name: string;
  avatarUrl?: string;
  isAI: boolean;
  aiDifficulty?: "easy" | "medium" | "hard";
  isConnected: boolean;
  joinedAt: number;
  lastActiveAt: number;
}

// User profile
export interface UserProfile {
  id: UserId;
  email: string;
  displayName: string;
  avatarUrl?: string;
  stats: PlayerStats;
  preferences: UserPreferences;
  createdAt: number;
}

// Player statistics
export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  rolesPlayed: Record<string, number>;
  totalFocusMinutes: number;
  focusSessionsCompleted: number;
  tokensEarned: number;
  tokensSpent: number;
}

// User preferences
export interface UserPreferences {
  theme: "light" | "dark" | "system";
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  defaultFocusDuration: number;
  defaultBreakDuration: number;
}

// Organization membership
export interface OrganizationMember {
  userId: UserId;
  organizationId: string;
  role: "owner" | "admin" | "member";
  joinedAt: number;
}

// Organization
export interface Organization {
  id: string;
  name: string;
  ownerId: UserId;
  description?: string;
  logoUrl?: string;
  settings: OrganizationSettings;
  memberCount: number;
  createdAt: number;
}

// Organization settings
export interface OrganizationSettings {
  allowPublicGames: boolean;
  defaultGameMode: string;
  maxPlayersPerGame: number;
  aiPlayersAllowed: boolean;
}
