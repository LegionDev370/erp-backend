import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Auth talab qilmaydigan endpointlar uchun.
 * JwtAuthGuard ushbu metadata bo'yicha tekshirishni o'tkazib yuboradi.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
