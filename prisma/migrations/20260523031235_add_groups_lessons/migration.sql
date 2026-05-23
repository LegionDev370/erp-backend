-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('upcoming', 'active', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "GroupFormat" AS ENUM ('offline', 'online', 'hybrid');

-- CreateEnum
CREATE TYPE "GroupStudentStatus" AS ENUM ('active', 'left', 'completed');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('scheduled', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "groups" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "course_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "status" "GroupStatus" NOT NULL DEFAULT 'upcoming',
    "max_students" INTEGER NOT NULL DEFAULT 20,
    "current_students" INTEGER NOT NULL DEFAULT 0,
    "room" TEXT,
    "format" "GroupFormat" NOT NULL DEFAULT 'offline',
    "schedule_days" JSONB NOT NULL,
    "schedule_time" TEXT NOT NULL,
    "monthly_price" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_students" (
    "group_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "status" "GroupStudentStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "group_students_pkey" PRIMARY KEY ("group_id","student_id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "room" TEXT,
    "topic" TEXT NOT NULL,
    "status" "LessonStatus" NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "groups_name_key" ON "groups"("name");

-- CreateIndex
CREATE INDEX "groups_course_id_idx" ON "groups"("course_id");

-- CreateIndex
CREATE INDEX "groups_teacher_id_idx" ON "groups"("teacher_id");

-- CreateIndex
CREATE INDEX "groups_status_idx" ON "groups"("status");

-- CreateIndex
CREATE INDEX "group_students_student_id_idx" ON "group_students"("student_id");

-- CreateIndex
CREATE INDEX "group_students_status_idx" ON "group_students"("status");

-- CreateIndex
CREATE INDEX "lessons_group_id_idx" ON "lessons"("group_id");

-- CreateIndex
CREATE INDEX "lessons_date_idx" ON "lessons"("date");

-- CreateIndex
CREATE INDEX "lessons_status_idx" ON "lessons"("status");

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_students" ADD CONSTRAINT "group_students_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_students" ADD CONSTRAINT "group_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
