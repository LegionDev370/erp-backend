import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomBytes } from 'crypto';
import * as fs from 'fs';

export interface UploadOptions {
  /** masalan: 'avatars', 'documents', 'courses' */
  subDir: string;
  /** ruxsat etilgan MIME prefiksi yoki turlar */
  allowedMimes: string[];
  /** bayt sifatida max o'lcham */
  maxSize: number;
}

/**
 * Lokal diskka faylni xavfsiz nom bilan saqlash uchun multer config.
 * Foydalanish: @UseInterceptors(FileInterceptor('file', buildMulterOptions({...})))
 */
export function buildMulterOptions(opts: UploadOptions) {
  const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
  const targetDir = `${uploadDir}/${opts.subDir}`;
  fs.mkdirSync(targetDir, { recursive: true });

  return {
    storage: diskStorage({
      destination: targetDir,
      filename: (_req, file, cb) => {
        const safeExt = extname(file.originalname).toLowerCase().slice(0, 8);
        const random = randomBytes(16).toString('hex');
        cb(null, `${Date.now()}-${random}${safeExt}`);
      },
    }),
    limits: { fileSize: opts.maxSize },
    fileFilter: (
      _req: Express.Request,
      file: Express.Multer.File,
      cb: (err: Error | null, ok: boolean) => void,
    ) => {
      if (!opts.allowedMimes.some((m) => file.mimetype.startsWith(m))) {
        cb(
          new BadRequestException(
            `Fayl turi qabul qilinmaydi. Ruxsat etilganlar: ${opts.allowedMimes.join(', ')}`,
          ),
          false,
        );
        return;
      }
      cb(null, true);
    },
  };
}

export const AVATAR_OPTIONS: UploadOptions = {
  subDir: 'avatars',
  allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
  maxSize: 2 * 1024 * 1024, // 2 MB
};

export const DOCUMENT_OPTIONS: UploadOptions = {
  subDir: 'documents',
  allowedMimes: [
    'image/jpeg',
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  maxSize: 10 * 1024 * 1024, // 10 MB
};

export const COURSE_IMAGE_OPTIONS: UploadOptions = {
  subDir: 'courses',
  allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
  maxSize: 5 * 1024 * 1024, // 5 MB
};

/** Yuklangan faylni URL'ga aylantirish (clientga qaytarish uchun) */
export function fileToUrl(file: Express.Multer.File, subDir: string): string {
  return `/uploads/${subDir}/${file.filename}`;
}
