import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

interface ReceiptData {
  receiptNumber: string;
  paidAt: Date | null;
  amount: string | number;
  method: string;
  status: string;
  student: {
    fullName: string;
    studentId: string;
    phone: string;
  };
  courseName: string;
  transactionId?: string | null;
  notes?: string | null;
}

@Injectable()
export class ReceiptGenerator {
  /**
   * To'lov uchun PDF kvitansiya stream'ini yaratadi.
   * Stream'ni response'ga pipe qilish mumkin: doc.pipe(response).
   */
  generate(data: ReceiptData): Readable {
    const doc = new PDFDocument({ size: 'A5', margin: 40 });

    // Header
    doc
      .fontSize(20)
      .fillColor('#2563EB')
      .text("O'QUV MARKAZ", { align: 'center' })
      .moveDown(0.2);

    doc
      .fontSize(10)
      .fillColor('#6B7280')
      .text("To'lov kvitansiyasi", { align: 'center' })
      .moveDown(1);

    // Separator
    this.drawLine(doc);
    doc.moveDown(0.5);

    // Receipt meta
    doc.fillColor('#000');
    this.row(doc, 'Kvitansiya №:', data.receiptNumber);
    this.row(
      doc,
      "To'langan vaqt:",
      data.paidAt ? this.formatDate(data.paidAt) : "To'lanmagan",
    );
    this.row(doc, 'Holat:', this.statusUz(data.status));
    doc.moveDown(0.5);

    // Student
    this.sectionTitle(doc, 'Talaba');
    this.row(doc, 'Ism familiya:', data.student.fullName);
    this.row(doc, 'Talaba ID:', data.student.studentId);
    this.row(doc, 'Telefon:', data.student.phone);
    doc.moveDown(0.5);

    // Course
    this.sectionTitle(doc, 'Kurs');
    this.row(doc, 'Kurs:', data.courseName);
    doc.moveDown(0.5);

    // Payment
    this.sectionTitle(doc, "To'lov tafsiloti");
    this.row(doc, 'Summa:', `${this.formatMoney(data.amount)} so'm`);
    this.row(doc, "To'lov usuli:", this.methodUz(data.method));
    if (data.transactionId) this.row(doc, 'Tranzaksiya ID:', data.transactionId);
    if (data.notes) this.row(doc, 'Izoh:', data.notes);

    doc.moveDown(1.5);
    this.drawLine(doc);
    doc.moveDown(0.5);

    doc
      .fontSize(8)
      .fillColor('#9CA3AF')
      .text(
        "Bu kvitansiya elektron tarzda yaratilgan va imzo talab qilmaydi.",
        { align: 'center' },
      );

    doc.end();
    return doc as unknown as Readable;
  }

  // ---------------- helpers ----------------
  private row(doc: PDFKit.PDFDocument, label: string, value: string) {
    doc.fontSize(10).fillColor('#6B7280').text(label, { continued: true });
    doc.fillColor('#000').text(`  ${value}`);
  }

  private sectionTitle(doc: PDFKit.PDFDocument, title: string) {
    doc
      .moveDown(0.3)
      .fontSize(11)
      .fillColor('#111827')
      .text(title, { underline: false })
      .moveDown(0.2);
  }

  private drawLine(doc: PDFKit.PDFDocument) {
    const y = doc.y;
    doc
      .moveTo(40, y)
      .lineTo(doc.page.width - 40, y)
      .strokeColor('#E5E7EB')
      .stroke();
  }

  private formatDate(d: Date | string): string {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleString('uz-UZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatMoney(n: number | string): string {
    const num = typeof n === 'string' ? Number(n) : n;
    return num.toLocaleString('uz-UZ');
  }

  private statusUz(s: string): string {
    const map: Record<string, string> = {
      paid: "To'langan",
      pending: 'Kutilmoqda',
      partial: 'Qisman',
      refunded: 'Qaytarilgan',
      failed: 'Muvaffaqiyatsiz',
    };
    return map[s] ?? s;
  }

  private methodUz(m: string): string {
    const map: Record<string, string> = {
      payme: 'Payme',
      click: 'Click',
      cash: 'Naqd',
      card: 'Bank karta',
      bank: 'Bank o\'tkazma',
    };
    return map[m] ?? m;
  }
}
