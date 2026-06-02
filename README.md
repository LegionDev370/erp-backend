# O'quv Markaz Backend API

NestJS + PostgreSQL + Prisma asosida qurilgan o'quv markazni boshqarish tizimi uchun REST API.

## 🚀 Texnologiyalar

- **NestJS 10** (TypeScript, strict mode)
- **PostgreSQL 15** + **Prisma 5** ORM
- **JWT** auth (access 15m + refresh 7d, DB'da saqlanadi)
- **Passport-JWT** + **bcrypt** (12 round)
- **class-validator** / **class-transformer** validation
- **Swagger** (`/api/docs`)
- **Helmet** + **Throttler** xavfsizlik
- **Pino** logger (production-grade, sensitive data redaction bilan)

---

## ⚙️ Ishga tushirish

### 1. Talablar

- Node.js 20+
- Docker (PostgreSQL va Redis uchun)

> **Diqqat:** Postgres porti **5433** ishlatiladi (chunki ko'p Windows mashinalarda 5432'da
> native Postgres allaqachon ishlamoqda). Agar sizda native Postgres yo'q bo'lsa,
> `docker-compose.yml`'da `5433:5432` ni `5432:5432` ga va `.env`'da DATABASE_URL
> portni 5432'ga o'zgartirsangiz bo'ladi.

### 2. O'rnatish

```bash
# Dependencies
npm install

# .env faylini sozlash
cp .env.example .env
# .env ichidagi qiymatlarni o'zgartiring

# Postgres + Redis ishga tushirish
docker compose up -d postgres redis

# Prisma client generate qilish
npm run prisma:generate

# Migration ishga tushirish (Bosqich 1 jadvallari)
npm run prisma:migrate -- --name init

# Test ma'lumotlarni yuklash (super_admin, admin, teacher, student)
npm run prisma:seed
```

### 3. Dev server

```bash
npm run start:dev
```

Server: <http://localhost:3000/api/v1>
Swagger: <http://localhost:3000/api/docs>
Adminer (DB UI): <http://localhost:8080>

---

## 🔑 Test akkauntlari (seed orqali yaratiladi)

| Rol | Email | Parol |
| --- | --- | --- |
| super_admin | super_admin@oquv.uz | SuperAdmin123 |
| admin | admin@oquv.uz | Admin123 |
| teacher | teacher@oquv.uz | Teacher123 |
| student | student@oquv.uz | Student123 |

---

## 📡 Hozirgi endpointlar (Bosqich 1 + 2 + 3 + 4 + 5)

### Public

- `POST /api/v1/auth/register` — yangi talaba ro'yxatdan o'tadi
- `POST /api/v1/auth/login` — email/telefon + parol bilan kirish
- `POST /api/v1/auth/refresh` — refresh token bilan yangi access
- `POST /api/v1/auth/forgot-password` — parolni tiklash so'rovi
- `POST /api/v1/auth/reset-password` — token + yangi parol
- `POST /api/v1/auth/verify-email` — email tasdiqlash
- `GET /health` — sog'lomlik tekshiruvi

### Public (Bosqich 2 - auth talab qilmaydi)

- `GET /api/v1/public/courses` — faol kurslar (filter: `category`, `level`, `priceMin`, `priceMax`, `featured`, `search`)
- `GET /api/v1/public/courses/:slug` — kurs tafsiloti (modullar+darslar bilan)
- `GET /api/v1/public/teachers` — faol o'qituvchilar (rating bo'yicha)
- `GET /api/v1/public/teachers/:id` — o'qituvchi profili (ommaviy maydonlar)
- `GET /api/v1/public/stats` — talabalar/o'qituvchilar/kurslar/bitiruvchilar soni

### Auth talab qiladi (har qanday rol)

- `GET /api/v1/auth/me` — joriy foydalanuvchi
- `POST /api/v1/auth/logout` — sessiyani tugatish
- `PATCH /api/v1/user/password` — parolni o'zgartirish
- `GET /api/v1/user/sessions` — faol sessiyalar
- `DELETE /api/v1/user/sessions/:id` — sessiyani tugatish

### Admin / Super Admin (Bosqich 2)

**Students:**
- `GET /api/v1/admin/students` — pagination + filter (status, search)
- `POST /api/v1/admin/students` — yangi talaba (user + student transactionda)
- `GET /api/v1/admin/students/:id` — to'liq profil
- `PATCH /api/v1/admin/students/:id` — yangilash
- `DELETE /api/v1/admin/students/:id` — soft delete
- `POST /api/v1/admin/students/:id/avatar` — avatar yuklash (multipart, 2 MB, JPG/PNG/WEBP)

**Teachers:**
- `GET /api/v1/admin/teachers` — filter (status, specialty, search)
- `POST /api/v1/admin/teachers`
- `GET /api/v1/admin/teachers/:id`
- `PATCH /api/v1/admin/teachers/:id`
- `DELETE /api/v1/admin/teachers/:id` — soft delete
- `POST /api/v1/admin/teachers/:id/avatar`

**Courses:**
- `GET /api/v1/admin/courses` — barcha statuslar (filter: status, category, level, search)
- `POST /api/v1/admin/courses` — kurs + modullar + darslar (nested create)
- `GET /api/v1/admin/courses/:id`
- `PATCH /api/v1/admin/courses/:id` — `modules` berilsa, eskilar replace bo'ladi
- `DELETE /api/v1/admin/courses/:id` — cascade
- `POST /api/v1/admin/courses/:id/image` — muqova yuklash (5 MB)

### Bosqich 3: Guruhlar va Jadval

**Groups:**
- `GET /api/v1/admin/groups` — pagination + filter (courseId, teacherId, status, format, room, search)
- `POST /api/v1/admin/groups` — yangi guruh (course+teacher mavjudligi avto-tekshiriladi)
- `GET /api/v1/admin/groups/:id` — guruh tafsiloti (course+teacher info bilan)
- `PATCH /api/v1/admin/groups/:id` — yangilash (maxStudents < currentStudents validatsiyasi)
- `DELETE /api/v1/admin/groups/:id` — cascade (group_students, lessons)
- `GET /api/v1/admin/groups/:id/students` — guruh tarkibi
- `POST /api/v1/admin/groups/:id/students` — talaba qo'shish (currentStudents avto-increment, sig'imi tekshiriladi)
- `DELETE /api/v1/admin/groups/:id/students/:studentId` — chiqarish (soft: status='left', leftAt)

**Schedule (Lessons):**
- `GET /api/v1/admin/schedule` — calendar grid (filter: from, to, teacherId, groupId, room, status)
- `GET /api/v1/admin/schedule/rooms` — xonalar bandlik holati (xonalar bo'yicha guruhlangan)
- `GET /api/v1/admin/schedule/lessons/:id` — bitta dars tafsiloti
- `POST /api/v1/admin/schedule/lessons` — yangi dars (xona vaqt konflikti avto-tekshiriladi)
- `PATCH /api/v1/admin/schedule/lessons/:id` — yangilash (yana konflikt tekshiruvi)
- `DELETE /api/v1/admin/schedule/lessons/:id`

### Bosqich 4: Davomat va Baholar

**Attendance:**
- `GET /api/v1/admin/attendance?groupId=...&date=...` — davomat ro'yxati
- `POST /api/v1/admin/attendance` — bulk save (upsert, bir darsga barcha talabalar uchun)
- `PATCH /api/v1/admin/attendance/:id` — bitta yozuvni yangilash
- `GET /api/v1/admin/groups/:id/attendance-matrix?from=...&to=...` — davomat matritsasi (talaba × dars)
- `GET /api/v1/admin/students/:id/attendance` — talaba davomat tarixi (stats: present/late/absent)

**Assignments:**
- `GET /api/v1/admin/assignments` — vazifalar (filter: groupId)
- `POST /api/v1/admin/assignments` — yangi vazifa (guruh active talabalariga pending submissionlar avto-yaratiladi)
- `GET /api/v1/admin/assignments/:id` — tafsilot
- `PATCH /api/v1/admin/assignments/:id` — yangilash
- `DELETE /api/v1/admin/assignments/:id` — cascade
- `GET /api/v1/admin/assignments/:id/grades` — barcha submissionlar va baholar
- `PATCH /api/v1/admin/assignments/:id/grades/:studentId` — baho qo'yish (maxScore tekshiruvi)
- `GET /api/v1/admin/students/:id/grades` — talaba baholar tarixi

**Exams:**
- `GET /api/v1/admin/exams` — imtihonlar (filter: groupId, status)
- `POST /api/v1/admin/exams` — yangi imtihon (active talabalar uchun pending natijalar avto-yaratiladi)
- `GET /api/v1/admin/exams/:id`
- `PATCH /api/v1/admin/exams/:id`
- `DELETE /api/v1/admin/exams/:id`
- `GET /api/v1/admin/exams/:id/grades` — natijalar
- `PATCH /api/v1/admin/exams/:id/grades/:studentId` — baho + status (completed/missed)

### Bosqich 5: Moliya

**Payments:**
- `GET /api/v1/admin/payments` — pagination + filter (studentId, groupId, status, method, year+month)
- `POST /api/v1/admin/payments` — to'lov qabul qilish
- `GET /api/v1/admin/payments/:id`
- `PATCH /api/v1/admin/payments/:id/status` — holatni o'zgartirish (paid bo'lsa paidAt avto-set)
- `POST /api/v1/admin/payments/:id/refund` — paid/partial to'lovni qaytarish
- `GET /api/v1/admin/payments/:id/receipt` — **PDF kvitansiya yuklab olish** (pdfkit)
- `GET /api/v1/admin/students/:id/payments` — talaba to'lov tarixi (totalPaid/totalPending bilan)

**Finance:**
- `GET /api/v1/admin/finance/kpis?year=...` — 4 KPI (daromad, xarajat, foyda, foyda%)
- `GET /api/v1/admin/finance/revenue-vs-expense?year=...` — line chart (12 oy)
- `GET /api/v1/admin/finance/expense-categories?year=...` — pie chart (kategoriya bo'yicha)
- `GET /api/v1/admin/finance/categories` — xarajat kategoriyalari
- `POST /api/v1/admin/finance/categories` — yangi kategoriya
- `GET /api/v1/admin/finance/expenses` — xarajatlar (filter: categoryId, year/month, from/to)
- `POST /api/v1/admin/finance/expenses` — yangi xarajat
- `PATCH /api/v1/admin/finance/expenses/:id`
- `DELETE /api/v1/admin/finance/expenses/:id`

---

## 🧪 Swagger orqali sinash

1. <http://localhost:3000/api/docs>
2. `POST /auth/login`'ni ishga tushiring:
   ```json
   { "identifier": "student@oquv.uz", "password": "Student123" }
   ```
3. Javobdagi `accessToken`'ni nusxalang.
4. Yuqori o'ngdagi **Authorize** tugmasi → tokenni qo'ying.
5. `GET /auth/me`'ni ishga tushiring.

---

## 📁 Loyiha strukturasi (Bosqich 1)

```
src/
├── main.ts                       # bootstrap (Swagger, helmet, CORS, validation)
├── app.module.ts
├── health.controller.ts
├── config/
│   ├── app.config.ts
│   ├── jwt.config.ts
│   └── database.config.ts
├── common/
│   ├── decorators/
│   │   ├── public.decorator.ts         (@Public)
│   │   ├── roles.decorator.ts          (@Roles)
│   │   └── current-user.decorator.ts   (@CurrentUser)
│   ├── guards/
│   │   ├── jwt-auth.guard.ts           (global JWT guard)
│   │   └── roles.guard.ts              (global roles guard)
│   ├── filters/
│   │   └── all-exceptions.filter.ts    (Prisma + HTTP errors)
│   ├── interceptors/
│   │   └── transform.interceptor.ts    (success: true, data, timestamp)
│   └── dto/
│       └── pagination.dto.ts
├── prisma/
│   ├── prisma.module.ts (global)
│   └── prisma.service.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/jwt.strategy.ts
│   └── dto/ (register, login, refresh, forgot/reset password, verify-email, response)
└── users/
    ├── users.module.ts
    ├── users.controller.ts             # /user/password, /user/sessions
    ├── users.service.ts
    └── dto/change-password.dto.ts

prisma/
├── schema.prisma         # users, students, teachers, sessions + auth tokens
└── seed.ts               # 4 test akkaunt
```

---

## 🔒 Xavfsizlik

- **Global JwtAuthGuard** — `@Public()` bilan ochiq endpointlar
- **Global RolesGuard** — `@Roles('admin', 'super_admin')` bilan rolga asoslangan
- **Throttler** — global limit + login uchun 5 urinish / 15 daqiqa
- **bcrypt 12 round** — parol hash
- **Refresh token rotation** — har refresh'da eski sessiya o'chadi
- **Parol o'zgartirilganda** barcha sessiyalar tugatiladi
- **Pino redaction** — `password`, `passwordHash`, `authorization`, `cookie` loglarda ko'rinmaydi
- **Helmet + CORS** middleware

---

## 🛣️ Keyingi bosqichlar

- **Bosqich 2:** Students/Teachers/Courses CRUD + Public courses API
- **Bosqich 3:** Groups + Lessons + Schedule
- **Bosqich 4:** Attendance + Assignments + Exams
- **Bosqich 5:** Payments + Finance + PDF generate
- **Bosqich 6:** Chat (WebSocket) + Notifications + Email
- **Bosqich 7:** Blog + Reviews + Contact
- **Bosqich 8:** Reports + Audit log
- **Bosqich 9:** Test + Deploy

---

## 📜 Skriptlar

```bash
npm run start:dev          # dev (watch)
npm run build              # build
npm run start:prod         # dist/main.js
npm run lint               # eslint + autofix
npm run format             # prettier
npm run test               # unit testlar
npm run test:e2e           # e2e
npm run test:cov           # coverage

npm run prisma:generate    # Prisma client
npm run prisma:migrate     # migration dev
npm run prisma:studio      # Prisma Studio
npm run prisma:seed        # test ma'lumotlar
npm run db:reset           # DB tozalash + qayta migrate + seed
```
