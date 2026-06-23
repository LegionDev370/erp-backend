/**
 * Manual seed — `npm run prisma:seed`.
 *
 * Seed mantig'i SeederService ichida (src/seed/seeder.service.ts) — server ishga
 * tushganda avtomatik ham ishlaydi (AUTO_SEED=false bilan o'chiriladi).
 * Bu skript o'sha xizmatni qayta ishlatadi, shunda mantiq bitta joyda turadi.
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';

import { AppModule } from '../src/app.module';
import { SeederService } from '../src/seed/seeder.service';

async function main() {
  // Bootstrap auto-seed'ni o'chiramiz — quyida qo'lda chaqiramiz (ikki marta bo'lmasligi uchun)
  process.env.AUTO_SEED = 'false';

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    await app.get(SeederService).run();
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  new Logger('Seed').error(e);
  process.exit(1);
});
