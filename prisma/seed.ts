/**
 * Prisma seed — test foydalanuvchilarini yaratadi.
 *
 * Ishga tushirish:
 *   npm run prisma:seed
 *
 * Yaratiladigan akkauntlar (parol: "Admin123" / "Teacher123" / "Student123"):
 *   - super_admin@oquv.uz  / SuperAdmin123
 *   - admin@oquv.uz        / Admin123
 *   - teacher@oquv.uz      / Teacher123
 *   - student@oquv.uz      / Student123
 */
import {
  CourseLevel,
  CourseStatus,
  GroupFormat,
  GroupStatus,
  LessonStatus,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const rounds = 12;

  const accounts = [
    {
      email: 'super_admin@oquv.uz',
      phone: '+998900000001',
      password: 'SuperAdmin123',
      role: UserRole.super_admin,
      firstName: 'Super',
      lastName: 'Admin',
    },
    {
      email: 'admin@oquv.uz',
      phone: '+998900000002',
      password: 'Admin123',
      role: UserRole.admin,
      firstName: 'Olim',
      lastName: 'Karimov',
    },
    {
      email: 'teacher@oquv.uz',
      phone: '+998900000003',
      password: 'Teacher123',
      role: UserRole.teacher,
      firstName: 'Sardor',
      lastName: 'Mirzayev',
    },
    {
      email: 'student@oquv.uz',
      phone: '+998900000004',
      password: 'Student123',
      role: UserRole.student,
      firstName: 'Ali',
      lastName: 'Valiyev',
    },
  ];

  for (const acc of accounts) {
    const passwordHash = await bcrypt.hash(acc.password, rounds);

    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: {},
      create: {
        email: acc.email,
        phone: acc.phone,
        passwordHash,
        role: acc.role,
        firstName: acc.firstName,
        lastName: acc.lastName,
        emailVerifiedAt: new Date(),
      },
    });

    if (acc.role === UserRole.student) {
      await prisma.student.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          studentId: 'ST-0001',
          parentFirstName: 'Valijon',
          parentLastName: 'Valiyev',
          parentPhone: '+998901111111',
          enrolledAt: new Date(),
        },
      });
    }

    if (acc.role === UserRole.teacher) {
      await prisma.teacher.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          teacherId: 'TC-001',
          specialty: 'JavaScript / Frontend',
          experience: 5,
          bio: 'Frontend ustozi',
          hireDate: new Date('2022-01-15'),
          salary: 8000000,
          rating: 4.8,
        },
      });
    }

    console.log(`  ✓ ${acc.role}: ${acc.email}  (parol: ${acc.password})`);
  }

  console.log('✅ Seeding done.');
}

// ============================================================
// COURSES — namuna kurslar
// ============================================================
async function seedCourses() {
  console.log('🎓 Seeding courses...');

  const courses = [
    {
      name: 'Frontend Bootcamp',
      slug: 'frontend-bootcamp',
      description: "HTML, CSS, JavaScript va React asoslari",
      longDescription:
        "To'liq frontend yo'nalishi: HTML5, CSS3, JavaScript ES2024, React, Next.js, va loyihalar.",
      category: 'frontend',
      level: CourseLevel.beginner,
      price: 1500000,
      oldPrice: 2000000,
      durationMonths: 6,
      isFeatured: true,
      status: CourseStatus.active,
      modules: [
        {
          title: '1-modul: HTML va CSS',
          order: 1,
          lessons: [
            { title: 'HTML asoslari', durationMinutes: 90, order: 1 },
            { title: 'CSS tanlanmasi va box-model', durationMinutes: 90, order: 2 },
            { title: 'Flexbox va Grid', durationMinutes: 120, order: 3 },
          ],
        },
        {
          title: '2-modul: JavaScript',
          order: 2,
          lessons: [
            { title: 'O\'zgaruvchilar, tip va funksiyalar', durationMinutes: 120, order: 1 },
            { title: 'DOM va eventlar', durationMinutes: 120, order: 2 },
            { title: 'Fetch va Promise', durationMinutes: 90, order: 3 },
          ],
        },
      ],
    },
    {
      name: 'Backend with Node.js',
      slug: 'backend-nodejs',
      description: "Node.js, Express, NestJS va PostgreSQL",
      longDescription: "Server tomon API'larini ishlab chiqish, autentifikatsiya, ma'lumotlar bazasi.",
      category: 'backend',
      level: CourseLevel.intermediate,
      price: 1800000,
      durationMonths: 5,
      isFeatured: true,
      status: CourseStatus.active,
    },
    {
      name: 'UI/UX Design',
      slug: 'ui-ux-design',
      description: "Figma, dizayn tizimi va foydalanuvchi tajribasi",
      longDescription: "Figma, prototip, color theory, typography va dizayn tafakkuri.",
      category: 'design',
      level: CourseLevel.beginner,
      price: 1200000,
      durationMonths: 4,
      status: CourseStatus.active,
    },
    {
      name: 'Mobile (Flutter)',
      slug: 'flutter-mobile',
      description: "Flutter va Dart bilan iOS/Android ilovalar",
      longDescription: "Dart, Flutter widget'lar, state management va Firebase integratsiyasi.",
      category: 'mobile',
      level: CourseLevel.intermediate,
      price: 1700000,
      durationMonths: 5,
      status: CourseStatus.active,
    },
    {
      name: 'Cybersecurity Asoslari',
      slug: 'cybersecurity-basics',
      description: "Kiberxavfsizlik, pentest va himoya",
      longDescription:
        "Tarmoq xavfsizligi, OWASP Top 10, sniffer, brute-force va himoya texnikalari.",
      category: 'security',
      level: CourseLevel.advanced,
      price: 2200000,
      durationMonths: 7,
      status: CourseStatus.draft,
    },
  ];

  for (const c of courses) {
    const { modules, ...rest } = c;
    const lessonsCount =
      modules?.reduce((s, m) => s + (m.lessons?.length ?? 0), 0) ?? 0;

    const existing = await prisma.course.findUnique({ where: { slug: c.slug } });
    if (existing) {
      console.log(`  ↺ ${c.slug} (mavjud, o'tkazib yuborildi)`);
      continue;
    }

    await prisma.course.create({
      data: {
        ...rest,
        lessonsCount,
        modules: modules?.length
          ? {
              create: modules.map((m) => ({
                title: m.title,
                order: m.order,
                lessons: m.lessons?.length
                  ? { create: m.lessons }
                  : undefined,
              })),
            }
          : undefined,
      },
    });
    console.log(`  ✓ ${c.slug}`);
  }
}

// ============================================================
// GROUPS + LESSONS
// ============================================================
async function seedGroups() {
  console.log('👥 Seeding groups + lessons...');

  const course = await prisma.course.findUnique({ where: { slug: 'frontend-bootcamp' } });
  const teacher = await prisma.teacher.findFirst({ where: { teacherId: 'TC-001' } });
  const student = await prisma.student.findFirst({ where: { studentId: 'ST-0001' } });

  if (!course || !teacher || !student) {
    console.log("  ⚠ Kurs/o'qituvchi/talaba topilmadi - skip");
    return;
  }

  const existingGroup = await prisma.group.findUnique({ where: { name: 'Frontend-01' } });
  if (existingGroup) {
    console.log("  ↺ Frontend-01 (mavjud)");
    return;
  }

  const group = await prisma.group.create({
    data: {
      name: 'Frontend-01',
      courseId: course.id,
      teacherId: teacher.id,
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-03-01'),
      status: GroupStatus.active,
      maxStudents: 20,
      currentStudents: 0,
      room: 'A-101',
      format: GroupFormat.offline,
      scheduleDays: ['mon', 'wed', 'fri'],
      scheduleTime: '09:00',
      monthlyPrice: 500000,
    },
  });

  // Talabani guruhga qo'shamiz
  await prisma.groupStudent.create({
    data: { groupId: group.id, studentId: student.id },
  });
  await prisma.group.update({
    where: { id: group.id },
    data: { currentStudents: 1 },
  });

  // 3 ta namuna dars
  const lessons = [
    { date: '2026-09-07', topic: 'HTML asoslari', status: LessonStatus.scheduled },
    { date: '2026-09-09', topic: 'CSS box-model', status: LessonStatus.scheduled },
    { date: '2026-09-11', topic: 'Flexbox amaliyot', status: LessonStatus.scheduled },
  ];
  for (const l of lessons) {
    await prisma.lesson.create({
      data: {
        groupId: group.id,
        date: new Date(l.date),
        startTime: '09:00',
        endTime: '11:00',
        room: 'A-101',
        topic: l.topic,
        status: l.status,
      },
    });
  }
  console.log(`  ✓ Frontend-01 + 1 student + 3 lessons`);
}

main()
  .then(() => seedCourses())
  .then(() => seedGroups())
  .then(() => console.log('✅ All done.'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
