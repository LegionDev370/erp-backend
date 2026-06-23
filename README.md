# O'quv Markaz — Online LMS Backend API

Online ta'lim platformasi uchun backend API. **Faqat online ta'lim (LMS):** kurslar katalogi,
video darslar, kursga yozilish (enrollment), dars progressi, sertifikatlar, kurs sharhlari va
online to'lovlar. Offline o'quv markaz qismi (guruh, dars jadvali, davomat, imtihon, markaz
moliyasi) **olib tashlangan**.

---

## 🚀 Texnologiyalar

- **NestJS 10** (TypeScript)
- **PostgreSQL 15** + **Prisma 5** (ORM)
- **JWT** auth (access + refresh, sessiyalar DB'da)
- **Swagger** (`/api/docs`)
- **bcrypt**, **helmet**, **class-validator**, **pino** log, **pdfkit** (kvitansiya)

---

## ⚙️ Ishga tushirish

### 1. Talablar
- Node.js 18+
- Docker (PostgreSQL uchun) yoki lokal PostgreSQL 15

### 2. O'rnatish

```bash
# Dependencies
npm install

# .env (allaqachon mavjud — kerak bo'lsa o'zgartiring)
# DATABASE_URL=postgresql://postgres:postgres@localhost:5433/oquv_markaz?schema=public

# PostgreSQL'ni ishga tushirish (faqat postgres servisi)
docker compose up -d postgres

# Prisma client generate
npm run prisma:generate

# Migration qo'llash
npx prisma migrate deploy
```

> **Demo ma'lumotlar avtomatik yuklanadi.** Server birinchi marta ishga tushganda (baza bo'sh bo'lsa)
> o'qituvchilar, kurslar, talabalar, enrollmentlar, sharhlar, blog va aloqa namunalari avtomatik
> qo'shiladi (`SeederService`). O'chirish uchun `.env` da `AUTO_SEED=false`.
> Qo'lda qayta yuklash ham mumkin: `npm run prisma:seed`.

### 3. Dev server

```bash
npm run start:dev
# Server:  http://localhost:3000/api/v1
# Docs:    http://localhost:3000/api/docs
```

> **Eslatma:** Bazani noldan tiklash uchun `npx prisma migrate reset --force`
> (migration qaytadan qo'llanadi + seed avtomatik ishlaydi).

---

## 🔑 Test akkauntlari (seed orqali)

| Rol | Email | Parol |
|---|---|---|
| Super admin | `super_admin@oquv.uz` | `SuperAdmin123` (yoki `SEED_ADMIN_PASSWORD`) |
| Admin | `admin@oquv.uz` | `Admin123` |
| Instructor | `instructor@oquv.uz` | `Instructor123` |
| Student | `student@oquv.uz` | `Student123` |

Qo'shimcha o'qituvchilar (`Instructor123`): `dilnoza@`, `sardor@`, `madina@`, `jasur@` `oquv.uz`.
Qo'shimcha talabalar (`Student123`): `zilola@`, `jamshid@`, `nigora@`, `aziz@` `oquv.uz`.

Demo hajmi: **5 o'qituvchi, 9 kurs** (8 active + 1 draft, video darslar bilan), **5 talaba**,
enrollmentlar + to'lovlar + dars progressi, **5 tasdiqlangan sharh** (testimonials), 3 sertifikat,
**5 blog maqola** (kategoriyalar + izohlar) va aloqa murojaatlari.

> ⚠️ Bu demo ma'lumotlar **o'quvchilar uchun**. Real production'da `AUTO_SEED=false` qiling va
> parollarni o'zgartiring.

---

## 📡 Endpointlar

Barchasi `/api/v1` prefiksi bilan.

### Auth (`/auth`)
- `POST /auth/register` — talaba ro'yxatdan o'tadi (user + student)
- `POST /auth/login` — email/telefon + parol → access + refresh
- `POST /auth/refresh`, `POST /auth/logout`
- `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/verify-email`
- `GET /auth/me`

### Foydalanuvchi (`/user`)
- `PATCH /user/password` — parol o'zgartirish
- `GET /user/sessions`, `DELETE /user/sessions/:id`

### Public (auth talab qilmaydi) (`/public`)
- `GET /public/courses` — faol kurslar (filter: category, level, priceMin/Max, featured, search, sort)
- `GET /public/courses/:slug` — kurs tafsiloti + instructor + modullar/darslar + tasdiqlangan sharhlar
- `GET /public/instructors`, `GET /public/instructors/:id`
- `GET /public/stats` — landing statistikasi (students, graduates, instructors, courses, certificates)
- `GET /public/testimonials?limit=9` — talabalar fikri (tasdiqlangan sharhlar)
- `GET /public/blog` — chop etilgan maqolalar (filter: category, featured, search)
- `GET /public/blog/categories` — kategoriyalar (post soni bilan)
- `GET /public/blog/:slug` — maqola + tasdiqlangan izohlar
- `POST /public/blog/:slug/comments` — izoh qoldirish (moderatsiyaga tushadi)
- `POST /public/contact` — aloqa formasini yuborish

### Talaba — Online ta'lim
- `POST /student/enrollments/checkout` — **kurs sotib olish** (to'lov + yozilish)
- `GET /student/enrollments` — mening kurslarim (progress bilan)
- `GET /student/enrollments/:courseId` — kurs ichki ko'rinishi (modullar, darslar, progress holati)
- `POST /student/lessons/:lessonId/progress` — darsni tugatildi deb belgilash (progress recompute)
- `GET /student/certificates` — sertifikatlarim
- `POST /student/certificates/claim/:courseId` — tugatilgan kurs uchun sertifikat olish
- `POST /student/reviews` — kursga sharh (moderatsiyaga tushadi)
- `GET /student/reviews/mine`

### Admin (role: admin / super_admin)
- **Kurslar (konstruktor):** `GET/POST/PATCH/DELETE /admin/courses`, `POST /admin/courses/:id/image`
- **O'quvchilar:** `GET/POST/PATCH/DELETE /admin/students`, `GET /admin/students/:id/enrollments`, `GET /admin/students/:id/payments`, `POST /admin/students/:id/avatar`
- **O'qituvchilar:** `GET/POST/PATCH/DELETE /admin/instructors`, `POST /admin/instructors/:id/avatar`
- **To'lovlar:** `GET/POST /admin/payments`, `GET /admin/payments/:id`, `PATCH /admin/payments/:id/status`, `POST /admin/payments/:id/refund`, `GET /admin/payments/:id/receipt` (PDF)
- **Yozilishlar:** `GET /admin/enrollments` (filter: courseId, status)
- **Sertifikatlar:** `GET /admin/certificates`, `PATCH /admin/certificates/:id/revoke`
- **Sharhlar:** `GET /admin/reviews` (filter: status), `PATCH /admin/reviews/:id/moderate`
- **Blog:** `GET/POST /admin/blog/posts`, `GET/PATCH/DELETE /admin/blog/posts/:id`, `PATCH /admin/blog/posts/:id/publish`, `POST /admin/blog/categories`, `GET /admin/blog/comments` (filter: status), `PATCH /admin/blog/comments/:id/moderate`
- **Murojaatlar:** `GET /admin/contact` (filter: status), `PATCH /admin/contact/:id/status`

---

## 🗃️ Ma'lumotlar modeli (LMS)

`User` · `Student` · `Instructor` · `Session` · auth tokenlar ·
`Course` → `CourseModule` → `CourseLesson` (videoUrl, isPreview) ·
`Enrollment` (progress %, status) · `LessonProgress` · `Certificate` · `Review` · `Payment` (kurs asosida) ·
`BlogCategory` · `BlogPost` · `BlogComment` (thread + moderatsiya) · `ContactMessage`.

To'liq sxema: [`prisma/schema.prisma`](prisma/schema.prisma).

### Asosiy oqim
1. Talaba ro'yxatdan o'tadi yoki kirish qiladi.
2. `/public/courses` orqali katalogni ko'radi.
3. `POST /student/enrollments/checkout` — kursni sotib oladi (Payment `paid` + Enrollment `active`).
4. Darslarni ko'radi va `POST /student/lessons/:id/progress` orqali belgilaydi → enrollment progressi avtomatik hisoblanadi.
5. 100% bo'lganda enrollment `completed` → `POST /student/certificates/claim/:courseId`.
6. `POST /student/reviews` — sharh qoldiradi (admin moderatsiyasidan keyin kurs reytingiga qo'shiladi).

---

## 🔒 Xavfsizlik
- Global `JwtAuthGuard` + `RolesGuard` (`@Public()` va `@Roles()` bilan boshqariladi)
- Access token 15 min, refresh 7 kun (DB sessiyalarida, revoke imkoniyati bilan)
- bcrypt (12 round), helmet, CORS, global ValidationPipe (whitelist)

---

## 📜 Skriptlar

```bash
npm run start:dev          # dev (watch)
npm run build              # build
npm run start:prod         # dist/main.js
npm run lint               # eslint + autofix
npm run prisma:generate    # Prisma client
npm run prisma:migrate     # migration (dev)
npm run prisma:seed        # test ma'lumotlar
npm run db:reset           # reset + migration + seed
```

---

## 🛣️ Keyingi bosqichlar (hali qilinmagan)
- Email yuborish (verify/reset/checkout kvitansiyasi)
- To'lov tizimi webhooklari (Payme/Click real integratsiya)
- Sertifikat PDF generatsiyasi
- Admin dashboard/daromad statistikasi endpointlari
- Unit / E2E testlar
