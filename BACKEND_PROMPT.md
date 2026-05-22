# 🎯 LOYIHA: O'quv Markaz Backend — NestJS + PostgreSQL

> Bu fayl AI'ga (Claude, ChatGPT, Cursor va h.k.) berilishi uchun mo'ljallangan to'liq texnik topshiriq.
> Frontend allaqachon HTML/CSS/Vanilla JS bilan yozilgan (38 sahifa). Endi backend ulanishi kerak.

---

## 📋 ASOSIY KONTEKST

O'quv markazini boshqarish tizimi uchun **to'liq backend API** yarating.

**Foydalanuvchi rollari (4 ta):**

- `super_admin` — barcha imkoniyatlarga ega
- `admin` — boshqaruvchi
- `teacher` — o'qituvchi
- `student` — talaba

**Frontend texnologiyasi (allaqachon yozilgan):**

- HTML5 + CSS3 + Vanilla JavaScript
- 38 sahifa (public, auth, admin, teacher, student panellari)
- Mock ma'lumotlar bilan to'ldirilgan — backend ulangach almashtiriladi

---

## 🛠️ TEXNOLOGIYALAR

- **Framework:** NestJS (TypeScript)
- **Database:** PostgreSQL 15+
- **ORM:** Prisma
- **Auth:** JWT
- **Validation:** class-validator + class-transformer
- **Documentation:** Swagger/OpenAPI (`/api/docs` da)
- **Real-time:** Socket.io (chat va bildirishnomalar uchun)
- **File upload:** Multer + lokal
- **Email:** Nodemailer
- **Password hash:** bcrypt
- **Logger:** Winston yoki Pino
- **Cache/Sessions:** Redis

---

## 📊 DATABASE SXEMASI

### 🧑 Foydalanuvchilar

**users**

```
id              UUID PK
email           VARCHAR UNIQUE
phone           VARCHAR UNIQUE
passwordHash    VARCHAR
role            ENUM (super_admin, admin, teacher, student)
status          ENUM (active, inactive, banned)
firstName       VARCHAR
lastName        VARCHAR
middleName      VARCHAR NULL
birthDate       DATE NULL
gender          ENUM (male, female) NULL
address         TEXT NULL
avatarUrl       VARCHAR NULL
emailVerifiedAt TIMESTAMP NULL
phoneVerifiedAt TIMESTAMP NULL
lastLoginAt     TIMESTAMP NULL
createdAt       TIMESTAMP
updatedAt       TIMESTAMP
deletedAt       TIMESTAMP NULL  -- soft delete
```

**students**

```
id              UUID PK
userId          UUID FK → users (UNIQUE)
studentId       VARCHAR UNIQUE  -- ST-0123
parentFirstName VARCHAR
parentLastName  VARCHAR
parentPhone     VARCHAR
motherName      VARCHAR NULL
motherPhone     VARCHAR NULL
enrolledAt      DATE
status          ENUM (active, inactive, graduated)
```

**teachers**

```
id            UUID PK
userId        UUID FK → users (UNIQUE)
teacherId     VARCHAR UNIQUE  -- TC-001
specialty     VARCHAR  -- "JavaScript / Frontend"
experience    INT  -- yillar
bio           TEXT
hireDate      DATE
salary        DECIMAL(15,2)
rating        DECIMAL(3,2)
socialLinks   JSON  -- {github, linkedin, telegram}
status        ENUM (active, on_leave, inactive)
```

### 📚 Kurslar va guruhlar

**courses**

```
id                UUID PK
name              VARCHAR
slug              VARCHAR UNIQUE
description       TEXT
longDescription   TEXT
category          VARCHAR  -- frontend, backend, design, mobile, ...
level             ENUM (beginner, intermediate, advanced)
price             DECIMAL(15,2)
oldPrice          DECIMAL(15,2) NULL
durationMonths    INT
lessonsCount      INT
imageUrl          VARCHAR
isFeatured        BOOLEAN
rating            DECIMAL(3,2)
ratingCount       INT
status            ENUM (draft, active, archived)
createdAt         TIMESTAMP
updatedAt         TIMESTAMP
```

**course_modules**

```
id        UUID PK
courseId  UUID FK → courses
title     VARCHAR
"order"   INT
```

**course_lessons**

```
id              UUID PK
moduleId        UUID FK → course_modules
title           VARCHAR
durationMinutes INT
"order"         INT
```

**groups**

```
id              UUID PK
name            VARCHAR UNIQUE  -- "Frontend-01"
courseId        UUID FK → courses
teacherId       UUID FK → teachers
startDate       DATE
endDate         DATE NULL
status          ENUM (upcoming, active, completed, cancelled)
maxStudents     INT
currentStudents INT
room            VARCHAR
format          ENUM (offline, online, hybrid)
scheduleDays    JSON  -- ["mon", "wed", "fri"]
scheduleTime    TIME  -- "09:00"
monthlyPrice    DECIMAL(15,2)
createdAt       TIMESTAMP
```

**group_students** (many-to-many)

```
groupId    UUID FK → groups
studentId  UUID FK → students
enrolledAt TIMESTAMP
leftAt     TIMESTAMP NULL
status     ENUM (active, left, completed)
PRIMARY KEY (groupId, studentId)
```

### 📅 Darslar va davomat

**lessons**

```
id         UUID PK
groupId    UUID FK → groups
date       DATE
startTime  TIME
endTime    TIME
room       VARCHAR
topic      VARCHAR
status     ENUM (scheduled, completed, cancelled)
notes      TEXT NULL
```

**attendances**

```
id        UUID PK
lessonId  UUID FK → lessons
studentId UUID FK → students
status    ENUM (present, late, absent)
note      VARCHAR NULL
markedAt  TIMESTAMP
markedBy  UUID FK → teachers
UNIQUE (lessonId, studentId)
```

### 📝 Vazifalar va imtihonlar

**assignments**

```
id          UUID PK
groupId     UUID FK → groups
title       VARCHAR
description TEXT
dueDate     TIMESTAMP
maxScore    INT  -- 100
createdAt   TIMESTAMP
createdBy   UUID FK → teachers
```

**student_assignments**

```
id           UUID PK
assignmentId UUID FK → assignments
studentId    UUID FK → students
submittedAt  TIMESTAMP NULL
grade        INT NULL
comment      TEXT NULL
status       ENUM (pending, submitted, graded)
UNIQUE (assignmentId, studentId)
```

**exams**

```
id              UUID PK
groupId         UUID FK → groups
title           VARCHAR
date            TIMESTAMP
durationMinutes INT
questionsCount  INT
maxScore        INT
status          ENUM (upcoming, active, completed, cancelled)
```

**student_exams**

```
id          UUID PK
examId      UUID FK → exams
studentId   UUID FK → students
grade       INT NULL
comment     TEXT NULL
completedAt TIMESTAMP NULL
status      ENUM (pending, completed, missed)
UNIQUE (examId, studentId)
```

### 💰 To'lovlar va moliya

**payments**

```
id            UUID PK
studentId     UUID FK → students
groupId       UUID FK → groups
amount        DECIMAL(15,2)
method        ENUM (payme, click, cash, card, bank)
status        ENUM (pending, paid, partial, refunded, failed)
paidAt        TIMESTAMP NULL
dueDate       DATE
transactionId VARCHAR NULL  -- to'lov tizimi ID
receiptUrl    VARCHAR NULL
notes         TEXT NULL
createdAt     TIMESTAMP
```

**expense_categories**

```
id    UUID PK
name  VARCHAR  -- "Ish haqi", "Ijara", "Marketing", ...
color VARCHAR  -- #2563EB
```

**expenses**

```
id            UUID PK
categoryId    UUID FK → expense_categories
description   VARCHAR
amount        DECIMAL(15,2)
date          DATE
createdBy     UUID FK → users
attachmentUrl VARCHAR NULL
```

### 💬 Xabarlar va bildirishnomalar

**conversations**

```
id            UUID PK
type          ENUM (direct, group)
name          VARCHAR NULL  -- guruh chat uchun
lastMessageAt TIMESTAMP
```

**conversation_participants**

```
conversationId UUID FK → conversations
userId         UUID FK → users
joinedAt       TIMESTAMP
leftAt         TIMESTAMP NULL
PRIMARY KEY (conversationId, userId)
```

**messages**

```
id             UUID PK
conversationId UUID FK → conversations
senderId       UUID FK → users
text           TEXT
attachmentUrl  VARCHAR NULL
readAt         TIMESTAMP NULL
createdAt      TIMESTAMP
editedAt       TIMESTAMP NULL
deletedAt      TIMESTAMP NULL
```

**notifications**

```
id        UUID PK
userId    UUID FK → users
type      ENUM (payment, attendance, system, message, exam, grade, debt, info)
title     VARCHAR
message   TEXT
link      VARCHAR NULL  -- bosilganda yo'naltirish uchun
read      BOOLEAN
createdAt TIMESTAMP
```

### 📰 Kontent (Public)

**blog_categories**

```
id   UUID PK
name VARCHAR
slug VARCHAR UNIQUE
```

**blog_posts**

```
id           UUID PK
title        VARCHAR
slug         VARCHAR UNIQUE
excerpt      TEXT
content      TEXT  -- markdown yoki html
imageUrl     VARCHAR
authorId     UUID FK → users
categoryId   UUID FK → blog_categories
viewsCount   INT
readMinutes  INT
publishedAt  TIMESTAMP NULL
isFeatured   BOOLEAN
status       ENUM (draft, published, archived)
createdAt    TIMESTAMP
updatedAt    TIMESTAMP
```

**blog_comments**

```
id        UUID PK
postId    UUID FK → blog_posts
userId    UUID FK → users
parentId  UUID FK → blog_comments NULL  -- thread uchun
text      TEXT
status    ENUM (pending, approved, rejected)
createdAt TIMESTAMP
```

**reviews**

```
id        UUID PK
courseId  UUID FK → courses
studentId UUID FK → students
rating    INT  -- 1-5
text      TEXT
status    ENUM (pending, approved, rejected)
createdAt TIMESTAMP
```

**contact_messages**

```
id        UUID PK
name      VARCHAR
email     VARCHAR
phone     VARCHAR
subject   VARCHAR
message   TEXT
status    ENUM (new, read, replied)
createdAt TIMESTAMP
```

### ⚙️ Tizim

**documents**

```
id           UUID PK
userId       UUID FK → users
filename     VARCHAR
originalName VARCHAR
url          VARCHAR
type         VARCHAR  -- pdf, jpg, docx
size         BIGINT
category     ENUM (passport, diploma, contract, certificate, other)
uploadedAt   TIMESTAMP
```

**settings**

```
key       VARCHAR UNIQUE PK
value     TEXT
type      ENUM (string, number, boolean, json)
scope     ENUM (global, user)
updatedAt TIMESTAMP
```

**sessions**

```
id            UUID PK
userId        UUID FK → users
ipAddress     VARCHAR
userAgent     VARCHAR
device        VARCHAR  -- "MacBook Pro · Chrome"
refreshToken  VARCHAR
expiresAt     TIMESTAMP
lastActiveAt  TIMESTAMP
```

**audit_logs**

```
id         UUID PK
userId     UUID FK → users
action     VARCHAR  -- create, update, delete
entityType VARCHAR  -- student, group, payment
entityId   UUID
changes    JSON  -- before/after
ipAddress  VARCHAR
createdAt  TIMESTAMP
```

---

## 🔐 AUTH MODULI

### Endpointlar

- `POST /auth/register` — talaba ro'yxatdan o'tadi (default role: student)
- `POST /auth/login` — email/telefon + parol → access (15 min) + refresh (7 kun)
- `POST /auth/refresh` — refresh token bilan yangi access
- `POST /auth/logout` — sessiyani o'chirish
- `POST /auth/forgot-password` — email yuborish
- `POST /auth/reset-password` — token + yangi parol
- `POST /auth/verify-email` — email tasdiqlash
- `GET /auth/me` — joriy foydalanuvchi ma'lumotlari

### Guards

- `JwtAuthGuard` — token tekshiruvi
- `RolesGuard` — `@Roles('admin', 'teacher')` decorator orqali
- `OwnerGuard` — o'z ma'lumotlariga kirish (talaba faqat o'z profili)

### Xavfsizlik

- **Throttling:** login uchun 5 urinish / 15 daqiqa
- **bcrypt:** 12 round
- **Access token:** 15 daqiqa
- **Refresh token:** 7 kun + DB'da saqlanadi (revoke imkoniyati uchun)
- **2FA** (ixtiyoriy): SMS yoki TOTP

---

## 🌐 PUBLIC API (auth talab qilmaydigan)

- `GET /public/courses` — barcha faol kurslar
  - Query: `category`, `level`, `priceMin`, `priceMax`, `search`, `page`, `limit`, `sortBy`, `order`
- `GET /public/courses/:slug` — kurs tafsiloti + modullar + reviewlar
- `GET /public/teachers` — barcha o'qituvchilar
- `GET /public/teachers/:id` — o'qituvchi profili
- `GET /public/blog` — blog postlar (pagination + filter)
- `GET /public/blog/:slug` — blog posti + comments
- `POST /public/blog/:slug/comments` — izoh (moderation orqali)
- `POST /public/contact` — aloqa forma yuborish
- `GET /public/stats` — landing uchun: bitiruvchilar/kurslar/o'qituvchilar soni
- `GET /public/testimonials` — landing uchun sharhlar

---

## 👤 ADMIN API (role: admin / super_admin)

### Dashboard

- `GET /admin/dashboard/stats` — 4 stat (talabalar, guruhlar, daromad, davomat)
- `GET /admin/dashboard/revenue-chart` — oxirgi 12 oy daromad
- `GET /admin/dashboard/students-growth` — talaba o'sishi
- `GET /admin/dashboard/today-lessons` — bugungi darslar

### Talabalar (CRUD)

- `GET /admin/students` — pagination + filter (group, status, search)
- `POST /admin/students` — yangi talaba (user + student create transactionda)
- `GET /admin/students/:id` — to'liq profil
- `PATCH /admin/students/:id` — yangilash
- `DELETE /admin/students/:id` — soft delete
- `POST /admin/students/:id/avatar` — avatar yuklash (multer)
- `GET /admin/students/:id/attendance` — davomat tarixi
- `GET /admin/students/:id/grades` — baholar
- `GET /admin/students/:id/payments` — to'lovlar
- `GET /admin/students/:id/documents` — hujjatlar
- `POST /admin/students/:id/documents` — hujjat yuklash

### O'qituvchilar (CRUD) — talabalarga o'xshash

- Qo'shimcha: `GET /admin/teachers/:id/salary` — maosh tarixi

### Guruhlar (CRUD)

- `GET /admin/groups` — filter (course, teacher, status)
- `POST /admin/groups` — yangi guruh
- `GET /admin/groups/:id` — guruh tafsiloti
- `PATCH /admin/groups/:id`
- `DELETE /admin/groups/:id`
- `POST /admin/groups/:id/students` — guruhga talaba qo'shish
- `DELETE /admin/groups/:id/students/:studentId` — chiqarish
- `GET /admin/groups/:id/attendance-matrix` — davomat matritsasi

### Jadval

- `GET /admin/schedule` — query: `from`, `to`, `teacher`, `group`, `room`
- `POST /admin/schedule/lessons` — dars qo'shish
- `PATCH /admin/schedule/lessons/:id`
- `DELETE /admin/schedule/lessons/:id`
- `GET /admin/schedule/rooms` — xonalar holati

### Davomat

- `GET /admin/attendance` — `groupId` + `date` bo'yicha
- `POST /admin/attendance` — bulk save (talabalar + holatlar)
- `PATCH /admin/attendance/:id`

### Baholar

- `GET /admin/assignments` — vazifalar ro'yxati
- `POST /admin/assignments` — yangi vazifa
- `GET /admin/assignments/:id/grades` — talabalar va baholar
- `PATCH /admin/assignments/:id/grades/:studentId` — baho qo'yish
- `GET /admin/exams`, `POST/PATCH/DELETE` — imtihonlar uchun

### To'lovlar

- `GET /admin/payments` — pagination + filter (month, student, status, method)
- `POST /admin/payments` — to'lov qabul qilish
- `GET /admin/payments/:id` — bitta to'lov
- `PATCH /admin/payments/:id/status` — holatni o'zgartirish
- `GET /admin/payments/:id/receipt` — PDF kvitansiya
- `POST /admin/payments/:id/refund` — qaytarish

### Moliya

- `GET /admin/finance/kpis` — 4 KPI (daromad/xarajat/foyda/foiz)
- `GET /admin/finance/revenue-vs-expense` — line chart data (12 oy)
- `GET /admin/finance/expense-categories` — pie chart data
- `GET /admin/finance/expenses` — xarajatlar ro'yxati
- `POST /admin/finance/expenses` — xarajat qo'shish
- `PATCH /admin/finance/expenses/:id`
- `DELETE /admin/finance/expenses/:id`

### Xabarlar (chat)

- `GET /admin/conversations` — suhbatlar ro'yxati (oxirgi xabar bilan)
- `GET /admin/conversations/:id/messages` — pagination
- `POST /admin/conversations/:id/messages` — yangi xabar
- `POST /admin/conversations` — yangi suhbat boshlash
- `PATCH /admin/conversations/:id/read` — o'qildi deb belgilash
- **WebSocket:** `/ws/chat` — real-time + typing indicator

### Bildirishnomalar

- `GET /admin/notifications` — pagination + filter (type, read)
- `PATCH /admin/notifications/:id/read`
- `PATCH /admin/notifications/read-all`
- `DELETE /admin/notifications/:id`
- **WebSocket:** push uchun

### Hisobotlar

- `POST /admin/reports/generate` — `type` + `dateRange` bilan
  - Response: chart data + summary + table
- `GET /admin/reports/:id/pdf` — PDF eksport (puppeteer/pdfkit)
- `GET /admin/reports/:id/excel` — Excel eksport (exceljs)

### Sozlamalar

- `GET /admin/settings` — barcha sozlamalar
- `PATCH /admin/settings` — bulk update
- `GET /admin/settings/users` — admin foydalanuvchilar
- `POST /admin/settings/users` — yangi admin qo'shish
- `PATCH /admin/settings/users/:id/role` — rolni o'zgartirish

### Blog (admin tomonidan boshqariladi)

- `GET /admin/blog/posts` — CRUD
- `POST /admin/blog/posts`
- `PATCH /admin/blog/posts/:id`
- `DELETE /admin/blog/posts/:id`
- `POST /admin/blog/posts/:id/publish`
- `GET /admin/blog/comments` — moderation queue
- `PATCH /admin/blog/comments/:id/status`

---

## 👨‍🏫 TEACHER API (role: teacher)

- `GET /teacher/dashboard/stats` — talabalar/guruhlar/o'rta baho
- `GET /teacher/dashboard/today-lessons`
- `GET /teacher/dashboard/pending-homework` — tekshirilishi kerak
- `GET /teacher/my-groups` — faqat o'ziga tegishli
- `GET /teacher/my-groups/:id` — guruh tafsiloti
- `POST /teacher/groups/:id/attendance` — davomat belgilash
- `GET /teacher/homework` — vazifalar
- `POST /teacher/homework` — yangi vazifa
- `PATCH /teacher/homework/:id`
- `POST /teacher/homework/:id/grade/:studentId` — bahalash
- `GET /teacher/exams` — imtihonlar
- `POST /teacher/exams` — yaratish
- `GET /teacher/schedule` — haftalik jadval
- `GET /teacher/salary` — maosh tarixi

---

## 🎓 STUDENT API (role: student)

- `GET /student/dashboard/stats` — o'rta baho, davomat, keyingi to'lov
- `GET /student/dashboard/today-lessons`
- `GET /student/dashboard/upcoming-exams`
- `GET /student/dashboard/recent-grades`
- `GET /student/dashboard/progress` — yo'nalishlar bo'yicha
- `GET /student/schedule` — o'z guruhi jadvali
- `GET /student/grades` — fanlar bo'yicha (accordion uchun)
- `GET /student/grades/gpa` — umumiy reyting + GPA
- `GET /student/payments` — to'lov tarixi + kelgusi
- `POST /student/payments/pay` — to'lov boshlash (Payme/Click integration)
- `GET /student/payments/:id/receipt` — PDF
- `GET /student/profile` — o'z profili
- `PATCH /student/profile`
- `POST /student/profile/avatar`

---

## 🤝 SHARED API (har qanday auth foydalanuvchi)

- `GET /user/notifications`
- `GET /user/conversations`
- `POST /user/messages`
- `PATCH /user/password` — parol o'zgartirish
- `GET /user/sessions` — aktiv sessiyalar
- `DELETE /user/sessions/:id` — sessiyani tugatish
- `POST /user/2fa/enable` — 2FA yoqish
- `POST /user/2fa/verify` — 2FA kod

---

## ⚙️ VALIDATSIYA QOIDALARI

Har bir DTO uchun:

- **Email:** `IsEmail()` + unique check
- **Telefon:** O'zbekiston formati `^\+998\d{9}$` regex
- **Parol:** min 8 belgi, kamida 1 katta harf + 1 raqam
- **Sanalar:** ISO 8601 (`@IsDateString()`)
- **Summalar:** musbat raqam, `decimal(15,2)` (`@IsPositive()`)
- **Pagination:**
  - `page` (default 1, min 1)
  - `limit` (default 20, min 1, max 100)
- **Sort:** `sortBy=field&order=asc|desc`
- **Search:** `search` parametri — `ILIKE` qisman moslik
- **UUID:** `@IsUUID()` route parametrlar uchun

---

## 📁 LOYIHA STRUKTURASI

```
src/
├── main.ts
├── app.module.ts
├── config/
│   ├── database.config.ts
│   ├── jwt.config.ts
│   └── app.config.ts
├── common/
│   ├── decorators/         (@Roles, @CurrentUser, @Public)
│   ├── guards/             (JwtAuthGuard, RolesGuard, OwnerGuard)
│   ├── interceptors/       (LoggingInterceptor, TransformInterceptor)
│   ├── filters/            (AllExceptionsFilter)
│   ├── pipes/              (ValidationPipe)
│   ├── dto/                (PaginationDto, BaseResponseDto)
│   └── utils/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/         (jwt.strategy.ts, local.strategy.ts)
│   └── dto/
├── users/
├── students/
├── teachers/
├── courses/
├── groups/
├── schedule/
├── attendance/
├── assignments/
├── exams/
├── grades/
├── payments/
├── finance/
├── messages/
├── notifications/
├── blog/
├── reports/
├── settings/
├── public/                 (auth talab qilmaydigan)
├── uploads/                (file upload xizmati)
└── websockets/             (chat, notifications gateway)

prisma/ yoki migrations/
test/
docker-compose.yml
.env.example
README.md
```

Har bir modul ichida: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.entity.ts`, `dto/`, `tests/`

---

## 🔒 XAVFSIZLIK

- **Helmet** middleware (XSS, clickjacking)
- **CORS** — frontend URL'iga ruxsat
- **Rate limiting** — `@nestjs/throttler`
- **Input sanitization** — class-validator
- **SQL injection** — TypeORM/Prisma orqali parametrized queries
- **CSRF** — token bilan (agar cookie-based auth bo'lsa)
- **bcrypt** — parol uchun 12 round
- **Sensitive data masking** loglarda (parol, token)
- **Soft delete** — muhim ma'lumotlar uchun
- **Audit log** — admin amallar uchun
- **HTTPS only** production'da

---

## 📤 FAYL YUKLASH

- **Avatarlar:** max 2 MB, JPG/PNG
- **Hujjatlar:** max 10 MB, PDF/JPG/PNG/DOCX
- **Materiallar:** max 50 MB
- **Storage:** lokal (boshlanishi uchun), keyin AWS S3 / Yandex Cloud
- **Virus scan:** ClamAV (ixtiyoriy)
- **Image resize:** sharp library (avatar uchun 200x200, 80x80)

---

## 💳 TO'LOV TIZIMI INTEGRATSIYASI

- **Payme** API
- **Click** API
- **Uzcard** API (kartlar bilan to'lov)
- Webhook endpointlar to'lov tasdiqlash uchun:
  - `POST /webhooks/payme`
  - `POST /webhooks/click`
- **Idempotency key** bilan qabul qilish
- To'lov tarixi `payments` jadvalida saqlanadi

---

## 📧 EMAIL XIZMATLARI

### Yuboriladigan emaillar:

- Ro'yxatdan o'tish tasdig'i
- Parolni tiklash
- To'lov kvitansiyasi
- Yangi vazifa/imtihon haqida
- Kunlik hisobot (admin uchun)
- Davomat ogohlantirish

### Template engine:

- **handlebars** yoki **mjml**
- Templates `src/templates/` ichida

---

## 🧪 TEST

- **Unit testlar** — service'lar uchun (Jest)
- **E2E testlar** — har bir controller uchun (supertest)
- **Coverage minimum:** 70%
- **CI/CD:** GitHub Actions

```bash
npm run test
npm run test:e2e
npm run test:cov
```

---

## 📚 DOKUMENTATSIYA

- **Swagger UI** — `/api/docs` da
- Har bir DTO uchun `@ApiProperty()`
- Har bir endpoint uchun `@ApiOperation()`, `@ApiResponse()`
- Tag'lar bo'yicha guruhlash: `@ApiTags('Students')`
- Auth misollari: `@ApiBearerAuth()`

---

## 🐳 DEPLOY

### `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: oquv_markaz
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  app:
    build: .
    depends_on: [postgres, redis]
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/oquv_markaz
    ports: ["3000:3000"]

  adminer:
    image: adminer
    ports: ["8080:8080"]

volumes:
  pgdata:
```

### `.env.example` o'zgaruvchilari:

```
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/oquv_markaz
REDIS_URL=redis://localhost:6379

JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="O'quv Markaz <noreply@oquv.uz>"

PAYME_MERCHANT_ID=your-merchant-id
PAYME_KEY=your-payme-key
CLICK_SERVICE_ID=your-service-id
CLICK_SECRET=your-click-secret

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

FRONTEND_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:8000,https://oquv.uz
```

---

## 📋 BERILISHI KERAK NARSALAR

1. ✅ To'liq ishlaydigan NestJS loyihasi
2. ✅ PostgreSQL migration fayllari + seed data (test ma'lumotlar)
3. ✅ Swagger documentation
4. ✅ `.env.example`
5. ✅ `docker-compose.yml`
6. ✅ README — qanday ishga tushirish
7. ✅ Postman collection (ixtiyoriy)
8. ✅ Test coverage 70%+
9. ✅ TypeScript strict mode
10. ✅ ESLint + Prettier konfiguratsiyasi

---

## 🎯 BOSQICHMA-BOSQICH YO'L XARITASI

### Bosqich 1: Loyiha asoslari + Auth

- NestJS loyiha init
- TypeORM/Prisma sozlash
- `users`, `students`, `teachers`, `sessions` migration
- Auth modul (register/login/refresh/logout/me)
- Guards (JwtAuthGuard, RolesGuard)
- Swagger sozlash

### Bosqich 2: Foydalanuvchilar va kurslar

- Students CRUD
- Teachers CRUD
- Courses CRUD (admin)
- Public courses API

### Bosqich 3: Guruhlar va jadval

- Groups CRUD
- Group-Students many-to-many
- Lessons (schedule)
- Schedule grid endpoint

### Bosqich 4: Davomat va baholar

- Attendances bulk save
- Assignments CRUD
- Student-Assignments (grading)
- Exams CRUD

### Bosqich 5: Moliya

- Payments CRUD
- Expense categories + Expenses
- Finance KPIs va chartlar
- PDF kvitansiya generate

### Bosqich 6: Chat va bildirishnomalar

- Conversations + Messages
- WebSocket gateway
- Notifications (CRUD + push)
- Email yuborish

### Bosqich 7: Public kontent

- Blog posts CRUD
- Blog comments (moderation)
- Reviews
- Contact messages

### Bosqich 8: Hisobotlar va sozlamalar

- Reports generator
- PDF/Excel eksport
- Settings (key-value)
- Audit log

### Bosqich 9: Test, Doc, Deploy

- Unit + E2E testlar
- Swagger to'liq dokumentatsiya
- Docker compose
- Deploy script
- Production checklist

---

**Boshlanglar!**

Birinchi bosqichdan boshlang va menga ko'rsating. Har bir bosqichdan keyin
kodni tasdiqlayman, keyin keyingisiga o'tamiz.

Har bir modul uchun quyidagilarni yarating:

1. **Entity** (TypeORM)
2. **Migration**
3. **DTO** (CreateXxxDto, UpdateXxxDto, XxxResponseDto)
4. **Service** (biznes-logika)
5. **Controller** (HTTP endpointlar)
6. **Module** (DI sozlash)
7. **Guards/Decorators** (kerak bo'lsa)
8. **Swagger annotations**
9. **Unit testlar**

---

## 🔗 FRONTEND BILAN ULASH

Frontend (`oquv-markaz/` papkasi) `data-*` atributlar bilan ulanadi.
Quyidagi yordamchini frontend `scripts/api.js` ga qo'shish kerak:

```javascript
const API_BASE = "http://localhost:3000/api/v1";

async function api(url, options = {}) {
  const token = localStorage.getItem("access_token");
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Refresh token bilan urinish, agar bo'lmasa login'ga
    const refreshed = await tryRefresh();
    if (!refreshed) {
      window.location.href = "/pages/auth/login.html";
      return;
    }
    return api(url, options); // retry
  }

  return response.json();
}
```

---

**Eslatma:** Bu prompt loyihaning to'liq talabi. AI'ga berishda
butun matnni nusxalang va yopishtiring.
