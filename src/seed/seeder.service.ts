import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BlogStatus,
  CourseLevel,
  CourseStatus,
  PaymentMethod,
  PaymentStatus,
  ReviewStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Demo ma'lumotlarni bazaga joylaydigan seeder.
 * Server ishga tushganda avtomatik ishlaydi (idempotent — qayta-qayta xavfsiz).
 * O'chirish uchun: .env da AUTO_SEED=false
 */
@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.AUTO_SEED === 'false') {
      this.logger.log('AUTO_SEED=false — seed o\'tkazib yuborildi');
      return;
    }
    await this.run();
  }

  async run() {
    const already = await this.prisma.course.count();
    if (already > 0) {
      this.logger.log(`Seed o'tkazib yuborildi (bazada allaqachon ${already} kurs bor)`);
      return;
    }

    this.logger.log('🌱 Demo ma\'lumotlar yuklanmoqda...');
    await this.seedAdmins();
    await this.seedInstructors();
    await this.seedCourses();
    await this.seedStudents();
    await this.seedLearning();
    await this.seedBlog();
    await this.seedContact();
    this.logger.log('✅ Demo ma\'lumotlar tayyor');
  }

  // ============================================================
  private async hash(pw: string) {
    const rounds = this.config.get<number>('app.bcryptRounds') ?? 12;
    return bcrypt.hash(pw, rounds);
  }

  private async upsertUser(data: {
    email: string;
    phone: string;
    password: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  }) {
    return this.prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        email: data.email,
        phone: data.phone,
        passwordHash: await this.hash(data.password),
        role: data.role,
        firstName: data.firstName,
        lastName: data.lastName,
        avatarUrl: data.avatarUrl,
        emailVerifiedAt: new Date(),
      },
    });
  }

  // ============================================================
  // ADMINLAR
  // ============================================================
  private async seedAdmins() {
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'SuperAdmin123';
    await this.upsertUser({
      email: 'super_admin@oquv.uz',
      phone: '+998900000001',
      password: adminPassword,
      role: UserRole.super_admin,
      firstName: 'Super',
      lastName: 'Admin',
    });
    await this.upsertUser({
      email: 'admin@oquv.uz',
      phone: '+998900000002',
      password: 'Admin123',
      role: UserRole.admin,
      firstName: 'Anvar',
      lastName: "Yo'ldoshev",
      avatarUrl: 'https://i.pravatar.cc/160?img=12',
    });
  }

  // ============================================================
  // O'QITUVCHILAR (instructors)
  // ============================================================
  private async seedInstructors() {
    const list = [
      { id: 'IN-001', firstName: 'Akmal', lastName: 'Karimov', email: 'instructor@oquv.uz', phone: '+998900000003', specialty: 'JavaScript / Frontend', experience: 7, rating: 4.9, img: 11 },
      { id: 'IN-002', firstName: 'Dilnoza', lastName: 'Yusupova', email: 'dilnoza@oquv.uz', phone: '+998900000005', specialty: 'Python / Backend', experience: 6, rating: 4.8, img: 32 },
      { id: 'IN-003', firstName: 'Sardor', lastName: 'Aliyev', email: 'sardor@oquv.uz', phone: '+998900000006', specialty: 'UX/UI Design', experience: 5, rating: 4.7, img: 15 },
      { id: 'IN-004', firstName: 'Madina', lastName: 'Rashidova', email: 'madina@oquv.uz', phone: '+998900000007', specialty: 'Digital Marketing', experience: 5, rating: 4.6, img: 25 },
      { id: 'IN-005', firstName: 'Jasur', lastName: 'Bekmurodov', email: 'jasur@oquv.uz', phone: '+998900000008', specialty: 'Mobile / Flutter', experience: 6, rating: 4.8, img: 51 },
    ];

    for (const t of list) {
      const user = await this.upsertUser({
        email: t.email,
        phone: t.phone,
        password: 'Instructor123',
        role: UserRole.instructor,
        firstName: t.firstName,
        lastName: t.lastName,
        avatarUrl: `https://i.pravatar.cc/160?img=${t.img}`,
      });
      await this.prisma.instructor.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          instructorId: t.id,
          specialty: t.specialty,
          experience: t.experience,
          bio: `${t.specialty} yo'nalishi bo'yicha tajribali online mentor.`,
          rating: t.rating,
          socialLinks: { telegram: `@${t.firstName.toLowerCase()}` },
        },
      });
    }
    this.logger.log(`  ✓ ${list.length} o'qituvchi`);
  }

  // ============================================================
  // KURSLAR
  // ============================================================
  private async seedCourses() {
    const byId = async (instructorId: string) =>
      (await this.prisma.instructor.findUnique({ where: { instructorId } }))?.id;

    const reactModules = [
      {
        title: 'Modul 1 · Komponentlar',
        order: 1,
        lessons: [
          { title: 'JSX sintaksisi', durationMinutes: 12, order: 1, isPreview: true, videoUrl: 'https://cdn.example.com/react/jsx.mp4' },
          { title: 'Props bilan ishlash', durationMinutes: 16, order: 2, videoUrl: 'https://cdn.example.com/react/props.mp4' },
        ],
      },
      {
        title: 'Modul 2 · Hooklar',
        order: 2,
        lessons: [
          { title: 'Hooklarga kirish', durationMinutes: 10, order: 1, videoUrl: 'https://cdn.example.com/react/hooks.mp4' },
          { title: 'useState va useEffect', durationMinutes: 18, order: 2, videoUrl: 'https://cdn.example.com/react/state.mp4' },
          { title: 'useContext va Context API', durationMinutes: 16, order: 3, videoUrl: 'https://cdn.example.com/react/context.mp4' },
        ],
      },
    ];

    const courses = [
      { name: 'React.js — zamonaviy frontend', slug: 'react-zamonaviy-frontend', category: 'frontend', level: CourseLevel.intermediate, price: 690000, oldPrice: 890000, durationMonths: 4, isFeatured: true, instructor: 'IN-001', img: 'photo-1633356122544-f134324a6cee', modules: reactModules },
      { name: 'Python asoslari', slug: 'python-asoslari', category: 'backend', level: CourseLevel.beginner, price: 590000, durationMonths: 3, isFeatured: true, instructor: 'IN-002', img: 'photo-1526379095098-d400fd0bf935', modules: [{ title: 'Modul 1 · Kirish', order: 1, lessons: [{ title: 'Python o\'rnatish', durationMinutes: 8, order: 1, isPreview: true }, { title: 'O\'zgaruvchilar va tiplar', durationMinutes: 14, order: 2 }, { title: 'Funksiyalar', durationMinutes: 16, order: 3 }] }] },
      { name: 'UX/UI dizayn asoslari', slug: 'ux-ui-dizayn-asoslari', category: 'design', level: CourseLevel.beginner, price: 490000, oldPrice: 650000, durationMonths: 3, isFeatured: true, instructor: 'IN-003', img: 'photo-1561070791-2526d30994b5', modules: [{ title: 'Modul 1 · Figma', order: 1, lessons: [{ title: 'Figma bilan tanishuv', durationMinutes: 10, order: 1, isPreview: true }, { title: 'Auto-layout', durationMinutes: 15, order: 2 }] }] },
      { name: 'Node.js va Express', slug: 'nodejs-express', category: 'backend', level: CourseLevel.intermediate, price: 750000, durationMonths: 4, isFeatured: true, instructor: 'IN-002', img: 'photo-1555066931-4365d14bab8c', modules: [{ title: 'Modul 1 · Server', order: 1, lessons: [{ title: 'Node.js asoslari', durationMinutes: 12, order: 1, isPreview: true }, { title: 'Express routing', durationMinutes: 18, order: 2 }] }] },
      { name: 'TypeScript chuqur', slug: 'typescript-chuqur', category: 'frontend', level: CourseLevel.advanced, price: 690000, durationMonths: 3, isFeatured: false, instructor: 'IN-001', img: 'photo-1517180102446-f3ece451e9d8', modules: [] },
      { name: 'Flutter mobil ilovalar', slug: 'flutter-mobil-ilovalar', category: 'mobile', level: CourseLevel.intermediate, price: 820000, durationMonths: 5, isFeatured: true, instructor: 'IN-005', img: 'photo-1512941937669-90a1b58e7e9c', modules: [{ title: 'Modul 1 · Dart', order: 1, lessons: [{ title: 'Dart asoslari', durationMinutes: 14, order: 1, isPreview: true }, { title: 'Widgetlar', durationMinutes: 20, order: 2 }] }] },
      { name: 'SMM va raqamli marketing', slug: 'smm-raqamli-marketing', category: 'marketing', level: CourseLevel.beginner, price: 450000, durationMonths: 2, isFeatured: false, instructor: 'IN-004', img: 'photo-1460925895917-afdab827c52f', modules: [] },
      { name: 'SQL va ma\'lumotlar bazasi', slug: 'sql-malumotlar-bazasi', category: 'data', level: CourseLevel.beginner, price: 540000, durationMonths: 3, isFeatured: false, instructor: 'IN-002', img: 'photo-1551288049-bebda4e38f71', modules: [] },
      { name: 'Cybersecurity asoslari', slug: 'cybersecurity-asoslari', category: 'security', level: CourseLevel.advanced, price: 980000, durationMonths: 5, isFeatured: false, instructor: undefined, img: 'photo-1550751827-4bd374c3f58b', status: CourseStatus.draft, modules: [] },
    ];

    for (const c of courses) {
      const existing = await this.prisma.course.findUnique({ where: { slug: c.slug } });
      if (existing) continue;
      const lessonsCount = c.modules?.reduce((s, m) => s + (m.lessons?.length ?? 0), 0) ?? 0;
      await this.prisma.course.create({
        data: {
          name: c.name,
          slug: c.slug,
          description: `${c.name} — amaliy va zamonaviy online kurs.`,
          longDescription: `${c.name} bo'yicha to'liq dastur: nazariya, amaliyot va real loyihalar. Har bir modul video darslar bilan jihozlangan.`,
          category: c.category,
          level: c.level,
          price: c.price,
          oldPrice: c.oldPrice,
          durationMonths: c.durationMonths,
          lessonsCount,
          imageUrl: `https://images.unsplash.com/${c.img}?w=640&h=400&fit=crop`,
          isFeatured: c.isFeatured ?? false,
          status: c.status ?? CourseStatus.active,
          instructorId: c.instructor ? await byId(c.instructor) : undefined,
          modules: c.modules?.length
            ? { create: c.modules.map((m) => ({ title: m.title, order: m.order, lessons: m.lessons?.length ? { create: m.lessons } : undefined })) }
            : undefined,
        },
      });
    }
    this.logger.log(`  ✓ ${courses.length} kurs`);
  }

  // ============================================================
  // TALABALAR
  // ============================================================
  private async seedStudents() {
    const list = [
      { id: 'ST-0001', firstName: 'Bobur', lastName: 'Tojiev', email: 'student@oquv.uz', phone: '+998900000004', img: 44 },
      { id: 'ST-0002', firstName: 'Zilola', lastName: 'Ahmedova', email: 'zilola@oquv.uz', phone: '+998900000010', img: 47 },
      { id: 'ST-0003', firstName: 'Jamshid', lastName: 'Qodirov', email: 'jamshid@oquv.uz', phone: '+998900000011', img: 53 },
      { id: 'ST-0004', firstName: 'Nigora', lastName: 'Saidova', email: 'nigora@oquv.uz', phone: '+998900000012', img: 45 },
      { id: 'ST-0005', firstName: 'Aziz', lastName: 'Rahimov', email: 'aziz@oquv.uz', phone: '+998900000013', img: 60 },
    ];

    const result: { id: string; email: string }[] = [];
    for (const s of list) {
      const user = await this.upsertUser({
        email: s.email,
        phone: s.phone,
        password: 'Student123',
        role: UserRole.student,
        firstName: s.firstName,
        lastName: s.lastName,
        avatarUrl: `https://i.pravatar.cc/160?img=${s.img}`,
      });
      const student = await this.prisma.student.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, studentId: s.id, enrolledAt: new Date() },
      });
      result.push({ id: student.id, email: s.email });
    }
    this.logger.log(`  ✓ ${list.length} talaba`);
    return result;
  }

  // ============================================================
  // ENROLLMENT + TO'LOV + PROGRESS + SHARH + SERTIFIKAT
  // ============================================================
  private async seedLearning() {
    // (studentEmail, courseSlug, progress%, reviewText, method)
    const plan: { email: string; slug: string; progress: number; review?: string; method: PaymentMethod }[] = [
      { email: 'student@oquv.uz', slug: 'react-zamonaviy-frontend', progress: 60, method: PaymentMethod.payme },
      { email: 'student@oquv.uz', slug: 'python-asoslari', progress: 100, review: "Juda tushunarli va amaliy kurs. Tavsiya qilaman!", method: PaymentMethod.click },
      { email: 'zilola@oquv.uz', slug: 'ux-ui-dizayn-asoslari', progress: 100, review: "UX/UI kursi mening hayotimni o'zgartirdi. Hozir xalqaro kompaniyada dizayner bo'lib ishlayman.", method: PaymentMethod.payme },
      { email: 'jamshid@oquv.uz', slug: 'react-zamonaviy-frontend', progress: 100, review: "JavaScript va React kursini tugatib, 2 hafta ichida ishga kirdim. Rahmat!", method: PaymentMethod.card },
      { email: 'nigora@oquv.uz', slug: 'python-asoslari', progress: 45, review: "Mentorlar har bir savolga sabr bilan javob berishadi. Zo'r platforma.", method: PaymentMethod.click },
      { email: 'aziz@oquv.uz', slug: 'nodejs-express', progress: 30, review: "Amaliy loyihalar ko'p, bilimni mustahkamlaydi.", method: PaymentMethod.payme },
    ];

    let certSeq = 1;
    for (const p of plan) {
      const student = await this.prisma.student.findFirst({ where: { user: { email: p.email } } });
      const course = await this.prisma.course.findUnique({
        where: { slug: p.slug },
        include: { modules: { include: { lessons: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } } },
      });
      if (!student || !course) continue;

      const exists = await this.prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
      });
      if (exists) continue;

      await this.prisma.payment.create({
        data: {
          studentId: student.id,
          courseId: course.id,
          amount: course.price,
          method: p.method,
          status: PaymentStatus.paid,
          paidAt: new Date(),
          transactionId: `DEMO-${course.slug.slice(0, 6)}-${student.studentId}`,
        },
      });

      const allLessons = course.modules.flatMap((m) => m.lessons);
      const completeCount = Math.round((p.progress / 100) * allLessons.length);
      const completed = allLessons.slice(0, completeCount);
      for (const l of completed) {
        await this.prisma.lessonProgress.create({
          data: { studentId: student.id, lessonId: l.id, completed: true, completedAt: new Date() },
        });
      }
      const isComplete = p.progress >= 100;

      await this.prisma.enrollment.create({
        data: {
          studentId: student.id,
          courseId: course.id,
          status: isComplete ? 'completed' : 'active',
          progress: p.progress,
          completedAt: isComplete ? new Date() : null,
          lastViewedLessonId: completed[completed.length - 1]?.id,
        },
      });
      await this.prisma.course.update({ where: { id: course.id }, data: { studentsCount: { increment: 1 } } });

      if (isComplete) {
        await this.prisma.certificate.create({
          data: {
            studentId: student.id,
            courseId: course.id,
            serialNo: `CERT-2026-${String(certSeq++).padStart(4, '0')}`,
          },
        });
      }

      if (p.review) {
        await this.prisma.review.create({
          data: { courseId: course.id, studentId: student.id, rating: 5, text: p.review, status: ReviewStatus.approved },
        });
      }
    }

    // Tasdiqlangan sharhlar bo'yicha kurs reytinglarini yangilash
    const courses = await this.prisma.course.findMany({ select: { id: true } });
    for (const c of courses) {
      const agg = await this.prisma.review.aggregate({
        where: { courseId: c.id, status: ReviewStatus.approved },
        _avg: { rating: true },
        _count: { _all: true },
      });
      await this.prisma.course.update({
        where: { id: c.id },
        data: { rating: agg._avg.rating ?? 0, ratingCount: agg._count._all },
      });
    }
    this.logger.log('  ✓ enrollmentlar, to\'lovlar, progress, sharhlar, sertifikatlar');
  }

  // ============================================================
  // BLOG
  // ============================================================
  private async seedBlog() {
    const admin = await this.prisma.user.findUnique({ where: { email: 'admin@oquv.uz' } });

    const categories = [
      { name: 'Dasturlash', slug: 'dasturlash' },
      { name: 'Dizayn', slug: 'dizayn' },
      { name: 'Karyera', slug: 'karyera' },
    ];
    for (const c of categories) {
      await this.prisma.blogCategory.upsert({ where: { slug: c.slug }, update: {}, create: c });
    }
    const cat = async (slug: string) => (await this.prisma.blogCategory.findUnique({ where: { slug } }))?.id;

    const posts = [
      { title: "Frontend o'rganishni qayerdan boshlash kerak", slug: 'frontend-organishni-qayerdan-boshlash', cat: 'dasturlash', featured: true, read: 6, img: 'photo-1633356122544-f134324a6cee' },
      { title: 'IT sohasida birinchi ishga qanday kirish mumkin', slug: 'it-sohasida-birinchi-ish', cat: 'karyera', read: 5, img: 'photo-1521737604893-d14cc237f11d' },
      { title: '2026-yilda eng talabgir dasturlash tillari', slug: '2026-talabgir-dasturlash-tillari', cat: 'dasturlash', featured: true, read: 7, img: 'photo-1517180102446-f3ece451e9d8' },
      { title: 'UX va UI o\'rtasidagi farq nima', slug: 'ux-va-ui-farqi', cat: 'dizayn', read: 4, img: 'photo-1561070791-2526d30994b5' },
      { title: 'Online o\'qishda motivatsiyani qanday saqlash', slug: 'online-oqishda-motivatsiya', cat: 'karyera', read: 5, img: 'photo-1499750310107-5fef28a66643' },
    ];

    for (const p of posts) {
      const exists = await this.prisma.blogPost.findUnique({ where: { slug: p.slug } });
      if (exists) continue;
      const post = await this.prisma.blogPost.create({
        data: {
          title: p.title,
          slug: p.slug,
          excerpt: `${p.title} — amaliy maslahatlar va yo'l xaritasi.`,
          content: `${p.title}.\n\nUshbu maqolada mavzu bo'yicha amaliy ko'rsatmalar, foydali resurslar va keng tarqalgan xatolardan qochish bo'yicha tavsiyalar keltirilgan...`,
          imageUrl: `https://images.unsplash.com/${p.img}?w=800&h=480&fit=crop`,
          categoryId: await cat(p.cat),
          authorId: admin?.id,
          readMinutes: p.read,
          isFeatured: p.featured ?? false,
          status: BlogStatus.published,
          publishedAt: new Date(),
          viewsCount: Math.floor(Math.random() * 400) + 50,
        },
      });
      await this.prisma.blogComment.create({
        data: { postId: post.id, authorName: 'Dilnoza', authorEmail: 'dilnoza@example.com', text: 'Juda foydali maqola, rahmat!', status: 'approved' },
      });
    }
    this.logger.log(`  ✓ ${posts.length} blog maqola`);
  }

  // ============================================================
  // CONTACT
  // ============================================================
  private async seedContact() {
    const samples = [
      { name: 'Jasur Eshonov', email: 'jasur.lead@example.com', phone: '+998901234567', subject: 'Kurslar haqida', message: 'React kursi qachon boshlanadi va narxi qancha?' },
      { name: 'Malika Yunusova', email: 'malika.lead@example.com', phone: '+998907654321', subject: 'To\'lov', message: "To'lovni bo'lib-bo'lib qilsa bo'ladimi?" },
    ];
    for (const s of samples) {
      const exists = await this.prisma.contactMessage.findFirst({ where: { email: s.email } });
      if (!exists) await this.prisma.contactMessage.create({ data: s });
    }
    this.logger.log(`  ✓ ${samples.length} aloqa murojaati`);
  }
}
