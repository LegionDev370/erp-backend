import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.useLogger(app.get(Logger));

  const apiPrefix = config.get<string>('app.apiPrefix') ?? 'api/v1';
  app.setGlobalPrefix(apiPrefix, { exclude: ['health', 'docs'] });

  // Security
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());

  // CORS
  const corsOrigins = (config.get<string>('app.corsOrigins') ?? '').split(',').filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global filters + interceptors
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle("O'quv Markaz API")
    .setDescription("O'quv markazini boshqarish tizimi uchun REST API")
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .addTag('Auth', 'Ro\'yxatdan o\'tish, kirish va sessiyalar')
    .addTag('Users', 'Foydalanuvchilar')
    .addTag('Public', 'Auth talab qilmaydigan endpointlar (katalog, instructorlar)')
    .addTag('Public · Blog', 'Blog maqolalari va izohlar')
    .addTag('Public · Contact', 'Aloqa formasi')
    .addTag('Student · Enrollments', 'Kurs sotib olish va mening kurslarim')
    .addTag('Student · Progress', 'Dars progressi')
    .addTag('Student · Certificates', 'Sertifikatlar')
    .addTag('Student · Reviews', 'Kurs sharhlari')
    .addTag('Admin · Courses', 'Kurs konstruktori (CRUD)')
    .addTag('Admin · Students', 'O\'quvchilar')
    .addTag('Admin · Instructors', 'O\'qituvchilar')
    .addTag('Admin · Payments', 'To\'lovlar')
    .addTag('Admin · Enrollments', 'Yozilishlar')
    .addTag('Admin · Certificates', 'Sertifikatlar')
    .addTag('Admin · Reviews', 'Sharhlar moderatsiyasi')
    .addTag('Admin · Blog', 'Blog boshqaruvi va izoh moderatsiyasi')
    .addTag('Admin · Contact', 'Murojaatlar')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.get<number>('app.port') ?? 3000;
  await app.listen(port);

  const url = await app.getUrl();
  console.log(`🚀  Server: ${url}/${apiPrefix}`);
  console.log(`📚  Docs:   ${url}/api/docs`);
}

bootstrap();
