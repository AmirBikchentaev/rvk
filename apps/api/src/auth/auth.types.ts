export type AppRole = 'admin' | 'viewer' | 'owner';

export interface JwtUser {
  sub: string;
  email: string;
  role: AppRole;
  ownerId?: string | null;
}
