import { jsPDF } from 'jspdf';
import { Ticket, TicketComment, TaskItem, WorkLog, User } from '../types';

export interface TicketPdfOptions {
  ticket: Ticket;
  comments?: TicketComment[];
  tasks?: TaskItem[];
  workLogs?: WorkLog[];
  users?: User[];
  organizationName?: string;
  triggerBrowserPrint?: boolean;
}

/**
 * Generates an official, publication-quality PDF report for an individual IT support ticket.
 * Also safely invokes window.print() if supported and requested, with fallback to PDF download.
 */
export function generateTicketPdf({
  ticket,
  comments = [],
  tasks = [],
  workLogs = [],
  users = [],
  organizationName = 'Lakhan Tech IT Helpdesk',
  triggerBrowserPrint = true,
}: TicketPdfOptions): { success: boolean; filename: string } {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 16;

    // Helper for adding new page when content overflows
    const checkPageBreak = (requiredSpace: number) => {
      if (currentY + requiredSpace > pageHeight - 16) {
        doc.addPage();
        currentY = 18;
        // Mini page header
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`${ticket.id} — ${ticket.subject.slice(0, 50)}`, 14, currentY);
        doc.text(organizationName, pageWidth - 14, currentY, { align: 'right' });
        doc.setDrawColor(226, 232, 240);
        doc.line(14, currentY + 2, pageWidth - 14, currentY + 2);
        currentY += 8;
      }
    };

    // 1. Top Decorative Header Banner
    doc.setFillColor(14, 165, 233); // Cyan 600
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(organizationName.toUpperCase(), 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('OFFICIAL IT SUPPORT TICKET AUDIT & SERVICE REPORT', 14, 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`TICKET: ${ticket.id}`, pageWidth - 14, 15, { align: 'right' });

    currentY = 32;

    // 2. Ticket Status & Subject Header
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const subjectLines = doc.splitTextToSize(ticket.subject, pageWidth - 28);
    doc.text(subjectLines, 14, currentY);
    currentY += subjectLines.length * 5.5 + 2;

    // 3. Metadata Ribbon Grid
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY, pageWidth - 28, 26, 2, 2, 'FD');

    const col1 = 18;
    const col2 = 65;
    const col3 = 115;
    const col4 = 158;

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);

    doc.text('STATUS', col1, currentY + 6);
    doc.text('PRIORITY', col2, currentY + 6);
    doc.text('CATEGORY', col3, currentY + 6);
    doc.text('SLA STATUS', col4, currentY + 6);

    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);

    doc.text(ticket.status.replace(/_/g, ' ').toUpperCase(), col1, currentY + 11);
    doc.text(ticket.priority.toUpperCase(), col2, currentY + 11);
    doc.text((ticket.category || 'General').slice(0, 22), col3, currentY + 11);
    doc.text((ticket.slaStatus || 'ON TRACK').toUpperCase(), col4, currentY + 11);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);

    doc.text('CREATED DATE', col1, currentY + 18);
    doc.text('UPDATED DATE', col2, currentY + 18);
    doc.text('REQUEST TYPE', col3, currentY + 18);
    doc.text('CHANNEL', col4, currentY + 18);

    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);

    doc.text(new Date(ticket.createdAt).toLocaleDateString(), col1, currentY + 23);
    doc.text(new Date(ticket.updatedAt).toLocaleDateString(), col2, currentY + 23);
    doc.text((ticket.type || 'incident').toUpperCase(), col3, currentY + 23);
    doc.text((ticket.channel || 'web portal').toUpperCase(), col4, currentY + 23);

    currentY += 32;

    // 4. Logistics & Personnel Block
    checkPageBreak(30);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, currentY, pageWidth - 28, 22, 2, 2, 'FD');

    const matchedUser = users.find((u) => u.email === ticket.requesterEmail || u.id === ticket.requesterId);
    const empCode = ticket.requesterEmployeeCode || matchedUser?.employeeCode || (ticket.requesterName?.toLowerCase().includes('lakhan') ? 'CBPL2045' : 'CBPL1010');
    const techUser = users.find((u) => u.id === ticket.assignedTechnicianId || u.name === ticket.assignedTechnicianName);
    const techCode = techUser?.employeeCode || 'CBPL1002';
    const techName = ticket.assignedTechnicianName || techUser?.name || 'Unassigned Queue';

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);

    doc.text('REQUESTER INFORMATION', 18, currentY + 6);
    doc.text('ASSIGNED TECHNICIAN', col3, currentY + 6);

    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`[${empCode}] ${ticket.requesterName}`, 18, currentY + 11);
    doc.text(ticket.assignedTechnicianName ? `[${techCode}] ${techName}` : 'Unassigned', col3, currentY + 11);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Email: ${ticket.requesterEmail}   |   Desk: ${ticket.locationDesk || 'Standard Office'}`, 18, currentY + 17);
    doc.text(`Support Team: Level 1 ITSM Operations Desk`, col3, currentY + 17);

    currentY += 28;

    // 5. Full Description Box
    checkPageBreak(35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('INCIDENT DESCRIPTION / USER BRIEF', 14, currentY);
    currentY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const descLines = doc.splitTextToSize(ticket.description || 'No detailed description provided.', pageWidth - 32);

    const descBoxHeight = descLines.length * 4.5 + 6;
    checkPageBreak(descBoxHeight + 8);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, currentY, pageWidth - 28, descBoxHeight, 1.5, 1.5, 'FD');

    doc.text(descLines, 18, currentY + 5);
    currentY += descBoxHeight + 6;

    // 6. Resolution Details (if ticket is resolved or closed)
    if (ticket.resolutionSummary || ticket.status === 'resolved' || ticket.status === 'closed') {
      checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(16, 185, 129); // Emerald 600
      doc.text('RESOLUTION & SATISFACTION SUMMARY', 14, currentY);
      currentY += 4;

      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      const resSummaryText = ticket.resolutionSummary || (ticket.resolutionCode ? `Resolution Code: ${ticket.resolutionCode}` : 'Incident resolved and verified by technical staff.');
      const resLines = doc.splitTextToSize(resSummaryText, pageWidth - 32);
      const resHeight = resLines.length * 4.5 + (ticket.satisfactionRating ? 12 : 7);

      doc.roundedRect(14, currentY, pageWidth - 28, resHeight, 1.5, 1.5, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(22, 101, 52);
      doc.text(resLines, 18, currentY + 5);

      if (ticket.satisfactionRating) {
        doc.setFont('helvetica', 'bold');
        doc.text(
          `User Satisfaction: ${ticket.satisfactionRating.rating}/5 Stars (${'★'.repeat(ticket.satisfactionRating.rating)})${
            ticket.satisfactionRating.comment ? ` — "${ticket.satisfactionRating.comment}"` : ''
          }`,
          18,
          currentY + resHeight - 3
        );
      }
      currentY += resHeight + 6;
    }

    // 7. Custom Fields & Attributes (if any)
    if (ticket.customFields && Object.keys(ticket.customFields).length > 0) {
      checkPageBreak(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('CUSTOM TICKET ATTRIBUTES', 14, currentY);
      currentY += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);

      Object.entries(ticket.customFields).forEach(([k, v]) => {
        checkPageBreak(6);
        doc.text(`• ${k}: ${String(v)}`, 18, currentY);
        currentY += 4.5;
      });
      currentY += 3;
    }

    // 8. Tasks & Action Checklist (if any)
    if (tasks && tasks.length > 0) {
      checkPageBreak(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`CHECKLIST / SUBTASKS (${tasks.filter((t) => t.completed).length}/${tasks.length} Completed)`, 14, currentY);
      currentY += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      tasks.forEach((t) => {
        checkPageBreak(5);
        const mark = t.completed ? '[X]' : '[ ]';
        doc.setTextColor(t.completed ? 16 : 71, t.completed ? 185 : 85, t.completed ? 129 : 105);
        doc.text(`${mark} ${t.title}`, 18, currentY);
        currentY += 4.5;
      });
      currentY += 3;
    }

    // 9. Attachments List (if any)
    if (ticket.attachments && ticket.attachments.length > 0) {
      checkPageBreak(18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`ATTACHED FILES & CAPTURED SNIPS (${ticket.attachments.length})`, 14, currentY);
      currentY += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      ticket.attachments.forEach((att) => {
        checkPageBreak(5);
        const kb = Math.round((att.size || 0) / 1024);
        doc.text(`📎 ${att.name} (${kb} KB, ${att.type || 'file'})`, 18, currentY);
        currentY += 4.5;
      });
      currentY += 3;
    }

    // 10. Conversation / Activity Log (Latest comments)
    if (comments && comments.length > 0) {
      checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`COMMUNICATION TIMELINE & AUDIT LOG (${comments.length} Entries)`, 14, currentY);
      currentY += 5;

      const recentComments = comments.slice(-8); // Show latest 8 messages
      recentComments.forEach((c) => {
        checkPageBreak(14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);

        const timeStr = new Date(c.createdAt).toLocaleString();
        doc.text(`${c.authorName} (${c.authorRole.toUpperCase()}) — ${timeStr}${c.isInternal ? ' [INTERNAL NOTE]' : ''}`, 18, currentY);
        currentY += 4;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        const cLines = doc.splitTextToSize(c.content, pageWidth - 36);
        doc.text(cLines, 18, currentY);
        currentY += cLines.length * 3.8 + 3;
      });
    }

    // 11. Footer on last page
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Printed from ${organizationName} on ${new Date().toLocaleString()} • IT Ticket ID: ${ticket.id} • Confidential Document`,
      14,
      pageHeight - 8
    );

    // Filename
    const filename = `Ticket_${ticket.id}_${new Date().toISOString().slice(0, 10)}.pdf`;

    // Save and download PDF
    doc.save(filename);

    // Try browser print as secondary if requested
    if (triggerBrowserPrint) {
      try {
        window.print();
      } catch (err) {
        console.warn('Browser print blocked or unsupported in current environment, PDF was downloaded instead:', err);
      }
    }

    return { success: true, filename };
  } catch (error) {
    console.error('Error generating ticket PDF:', error);
    // Even if jsPDF failed, try window.print()
    if (triggerBrowserPrint) {
      try {
        window.print();
      } catch (e) {
        console.error('Browser window.print failed:', e);
      }
    }
    return { success: false, filename: '' };
  }
}
