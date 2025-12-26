import { jsPDF } from 'jspdf';

interface LessonData {
  title: string;
  content: string | null;
  order_index: number;
}

interface CourseData {
  title: string;
  description: string | null;
  lessons: LessonData[];
}

export const exportCourseToPDF = (course: CourseData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let yPosition = 20;

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(course.title, maxWidth);
  doc.text(titleLines, margin, yPosition);
  yPosition += titleLines.length * 10 + 10;

  // Description
  if (course.description) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    const descLines = doc.splitTextToSize(course.description, maxWidth);
    doc.text(descLines, margin, yPosition);
    yPosition += descLines.length * 6 + 15;
    doc.setTextColor(0);
  }

  // Lessons
  course.lessons.forEach((lesson, index) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Lesson title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const lessonTitle = `${lesson.order_index}. ${lesson.title}`;
    const lessonTitleLines = doc.splitTextToSize(lessonTitle, maxWidth);
    doc.text(lessonTitleLines, margin, yPosition);
    yPosition += lessonTitleLines.length * 8 + 8;

    // Lesson content
    if (lesson.content) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      // Split content into paragraphs
      const paragraphs = lesson.content.split(/\n\n+/);
      
      paragraphs.forEach((paragraph) => {
        const cleanParagraph = paragraph.replace(/\n/g, ' ').trim();
        if (!cleanParagraph) return;

        const lines = doc.splitTextToSize(cleanParagraph, maxWidth);
        
        // Check if we need a new page
        const linesHeight = lines.length * 5;
        if (yPosition + linesHeight > 280) {
          doc.addPage();
          yPosition = 20;
        }

        doc.text(lines, margin, yPosition);
        yPosition += linesHeight + 6;
      });
    }

    yPosition += 10;
  });

  // Save the PDF
  const filename = `${course.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
};

export const exportLessonToPDF = (lesson: LessonData, courseTitle: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let yPosition = 20;

  // Course title (smaller)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(courseTitle, margin, yPosition);
  yPosition += 10;
  doc.setTextColor(0);

  // Lesson title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(`Leçon ${lesson.order_index}: ${lesson.title}`, maxWidth);
  doc.text(titleLines, margin, yPosition);
  yPosition += titleLines.length * 10 + 15;

  // Content
  if (lesson.content) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const paragraphs = lesson.content.split(/\n\n+/);
    
    paragraphs.forEach((paragraph) => {
      const cleanParagraph = paragraph.replace(/\n/g, ' ').trim();
      if (!cleanParagraph) return;

      const lines = doc.splitTextToSize(cleanParagraph, maxWidth);
      
      const linesHeight = lines.length * 5;
      if (yPosition + linesHeight > 280) {
        doc.addPage();
        yPosition = 20;
      }

      doc.text(lines, margin, yPosition);
      yPosition += linesHeight + 6;
    });
  }

  const filename = `${courseTitle}_Lecon_${lesson.order_index}.pdf`.replace(/[^a-zA-Z0-9_]/g, '_');
  doc.save(filename);
};