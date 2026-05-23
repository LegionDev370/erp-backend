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
  AssignmentStatus,
  AttendanceStatus,
  CourseLevel,
  CourseStatus,
  ExamStatus,
  GroupFormat,
  GroupStatus,
  LessonStatus,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  StudentExamStatus,
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

// ============================================================
// ATTENDANCE + ASSIGNMENTS + EXAMS
// ============================================================
async function seedAcademics() {
  console.log('📝 Seeding attendance + assignments + exams...');

  const group = await prisma.group.findUnique({ where: { name: 'Frontend-01' } });
  const admin = await prisma.user.findUnique({ where: { email: 'admin@oquv.uz' } });
  const student = await prisma.student.findFirst({ where: { studentId: 'ST-0001' } });

  if (!group || !admin || !student) {
    console.log("  ⚠ Group/admin/student topilmadi - skip");
    return;
  }

  // Davomat — 1-darsda 'present' deb belgilaymiz
  const firstLesson = await prisma.lesson.findFirst({
    where: { groupId: group.id },
    orderBy: { date: 'asc' },
  });
  if (firstLesson) {
    const existsAtt = await prisma.attendance.findUnique({
      where: { lessonId_studentId: { lessonId: firstLesson.id, studentId: student.id } },
    });
    if (!existsAtt) {
      await prisma.attendance.create({
        data: {
          lessonId: firstLesson.id,
          studentId: student.id,
          status: AttendanceStatus.present,
          markedBy: admin.id,
          note: 'Faol qatnashdi',
        },
      });
      console.log(`  ✓ Attendance for ST-0001 (lesson 1: present)`);
    }
  }

  // Vazifa
  const existingAssign = await prisma.assignment.findFirst({
    where: { groupId: group.id, title: 'Vazifa 1: HTML loyiha' },
  });
  if (!existingAssign) {
    const assign = await prisma.assignment.create({
      data: {
        groupId: group.id,
        title: 'Vazifa 1: HTML loyiha',
        description: 'HTML5 va semantik teglar bilan oddiy portfolio sahifa yaratish',
        dueDate: new Date('2026-09-25T23:59:00Z'),
        maxScore: 100,
        createdBy: admin.id,
        submissions: {
          create: {
            studentId: student.id,
            status: AssignmentStatus.graded,
            grade: 85,
            comment: "Yaxshi ish, lekin alt atributlari yetishmadi",
            submittedAt: new Date('2026-09-24T20:00:00Z'),
          },
        },
      },
    });
    console.log(`  ✓ Assignment "${assign.title}" (1 submission graded: 85)`);
  }

  // Imtihon
  const existingExam = await prisma.exam.findFirst({
    where: { groupId: group.id, title: 'Oraliq imtihon' },
  });
  if (!existingExam) {
    const exam = await prisma.exam.create({
      data: {
        groupId: group.id,
        title: 'Oraliq imtihon',
        date: new Date('2026-11-15T10:00:00Z'),
        durationMinutes: 90,
        questionsCount: 30,
        maxScore: 100,
        status: ExamStatus.upcoming,
        results: {
          create: {
            studentId: student.id,
            status: StudentExamStatus.pending,
          },
        },
      },
    });
    console.log(`  ✓ Exam "${exam.title}" (upcoming, 1 pending result)`);
  }
}

// ============================================================
// PAYMENTS + EXPENSES
// ============================================================
async function seedFinance() {
  console.log('💰 Seeding payments + expense categories + expenses...');

  const group = await prisma.group.findUnique({ where: { name: 'Frontend-01' } });
  const student = await prisma.student.findFirst({ where: { studentId: 'ST-0001' } });
  const admin = await prisma.user.findUnique({ where: { email: 'admin@oquv.uz' } });

  if (!group || !student || !admin) {
    console.log("  ⚠ Group/student/admin topilmadi - skip");
    return;
  }

  // 2 ta to'lov: 1 paid (sentyabr), 1 pending (oktyabr)
  const sept = await prisma.payment.findFirst({
    where: { studentId: student.id, dueDate: new Date('2026-09-01') },
  });
  if (!sept) {
    await prisma.payment.create({
      data: {
        studentId: student.id,
        groupId: group.id,
        amount: 500000,
        method: PaymentMethod.click,
        status: PaymentStatus.paid,
        paidAt: new Date('2026-09-05T10:30:00Z'),
        dueDate: new Date('2026-09-01'),
        transactionId: 'CLK-2026090501',
        notes: "Sentyabr oyligi",
      },
    });
    console.log(`  ✓ Payment: ST-0001 Sep paid (500k)`);
  }
  const oct = await prisma.payment.findFirst({
    where: { studentId: student.id, dueDate: new Date('2026-10-01') },
  });
  if (!oct) {
    await prisma.payment.create({
      data: {
        studentId: student.id,
        groupId: group.id,
        amount: 500000,
        method: PaymentMethod.cash,
        status: PaymentStatus.pending,
        dueDate: new Date('2026-10-01'),
      },
    });
    console.log(`  ✓ Payment: ST-0001 Oct pending (500k)`);
  }

  // Xarajat kategoriyalari
  const categories = [
    { name: 'Ish haqi', color: '#10B981' },
    { name: 'Ijara', color: '#F59E0B' },
    { name: 'Marketing', color: '#2563EB' },
    { name: 'Kommunal', color: '#EF4444' },
    { name: 'Boshqa', color: '#6B7280' },
  ];
  for (const c of categories) {
    await prisma.expenseCategory.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
  }
  console.log(`  ✓ ${categories.length} expense categories upserted`);

  // 3 ta namuna xarajat (sentyabr 2026)
  const ijara = await prisma.expenseCategory.findUnique({ where: { name: 'Ijara' } });
  const ishHaqi = await prisma.expenseCategory.findUnique({ where: { name: 'Ish haqi' } });
  const marketing = await prisma.expenseCategory.findUnique({ where: { name: 'Marketing' } });

  if (ijara && ishHaqi && marketing) {
    const samples = [
      { category: ijara, description: "Ofis ijarasi - Sentyabr", amount: 5000000, date: '2026-09-01' },
      { category: ishHaqi, description: "O'qituvchilar maoshi", amount: 8000000, date: '2026-09-05' },
      { category: marketing, description: "Instagram reklamasi", amount: 1200000, date: '2026-09-10' },
    ];
    for (const s of samples) {
      const exists = await prisma.expense.findFirst({
        where: { description: s.description, date: new Date(s.date) },
      });
      if (!exists) {
        await prisma.expense.create({
          data: {
            categoryId: s.category.id,
            description: s.description,
            amount: s.amount,
            date: new Date(s.date),
            createdBy: admin.id,
          },
        });
      }
    }
    console.log(`  ✓ 3 sample expenses (Sep 2026)`);
  }
}

main()
  .then(() => seedCourses())
  .then(() => seedGroups())
  .then(() => seedAcademics())
  .then(() => seedFinance())
  .then(() => console.log('✅ All done.'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
