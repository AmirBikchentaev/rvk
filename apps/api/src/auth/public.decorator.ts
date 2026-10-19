import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Skip JWT check (login, refresh, health). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
