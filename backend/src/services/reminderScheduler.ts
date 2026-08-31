import { prisma } from '../db';
import { getWhatsAppSettings, sendWhatsAppCloudMessage } from './whatsappService';

/**
 * Accurately calculates next date based on calendar rules
 * E.g., 31/08/2026 + 3 Months = 30/11/2026 (Nov has 30 days)
 */
export function addIntervalToDate(startDate: Date | string, value: number, unit: string): Date {
  const d = new Date(startDate);
  const v = Number(value) || 1;
  const u = (unit || 'MONTHS').toUpperCase();

  if (u === 'DAYS') {
    d.setDate(d.getDate() + v);
    return d;
  }

  if (u === 'WEEKS') {
    d.setDate(d.getDate() + v * 7);
    return d;
  }

  if (u === 'YEARS') {
    d.setFullYear(d.getFullYear() + v);
    return d;
  }

  // Default: MONTHS
  const currentDay = d.getDate();
  d.setMonth(d.getMonth() + v);

  // If day overflowed (e.g. Aug 31 -> Nov 31 becomes Dec 1), clamp to last day of target month
  if (d.getDate() !== currentDay) {
    d.setDate(0); // Sets to last day of previous month
  }

  return d;
}

export async function processDailyServiceReminders(): Promise<{ processed: number; sent: number; errors: number }> {
  let processed = 0;
  let sent = 0;
  let errors = 0;

  try {
    const config = await getWhatsAppSettings();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch active service tasks due today or overdue or upcoming within window
    const tasks = await prisma.serviceTask.findMany({
      where: {
        status: { in: ['SCHEDULED', 'ASSIGNED', 'CONFIRMED'] },
      },
      include: {
        party: true,
        machine: true,
        assignedTechnician: true,
      },
    });

    for (const task of tasks) {
      processed++;
      const party = task.party;
      const dueDate = new Date(task.serviceDueDate);
      dueDate.setHours(0, 0, 0, 0);

      const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

      let reminderType: string | null = null;
      if (diffDays === 0) {
        reminderType = 'SERVICE_DUE_TODAY';
      } else if (diffDays > 0 && config.upcomingDays.split(',').map(Number).includes(diffDays)) {
        reminderType = `SERVICE_UPCOMING_${diffDays}D`;
      } else if (diffDays < 0 && config.overdueDays.split(',').map(Number).includes(Math.abs(diffDays))) {
        reminderType = `SERVICE_OVERDUE_${Math.abs(diffDays)}D`;
      }

      if (!reminderType) continue;

      // Check customer opt-in
      if (!party.whatsappServiceReminders) {
        await prisma.serviceReminderLog.create({
          data: {
            serviceTaskId: task.id,
            partyId: party.id,
            machineId: task.machineId,
            reminderType: reminderType,
            recipientPhone: party.mobile,
            recipientName: party.name,
            scheduledDate: task.serviceDueDate,
            status: 'OPTED_OUT',
            messageText: 'Customer has opted out of WhatsApp service reminders.',
            isAutomatic: true,
          },
        });
        continue;
      }

      // Check if reminder was already sent today for this task and reminderType
      const existingLog = await prisma.serviceReminderLog.findFirst({
        where: {
          serviceTaskId: task.id,
          reminderType: reminderType,
          createdAt: {
            gte: today,
          },
        },
      });

      if (existingLog) continue; // Duplicate prevention

      const messageText = `Dear ${party.name},\n\nThis is a service reminder from Smart Agro Machinerys.\n\nMachine: ${task.machine?.model || 'Equipment'}\nSerial No: ${task.serialNumber}\nService Due Date: ${dueDate.toLocaleDateString('en-IN')}\n\n${
        diffDays === 0 ? 'Your machine service is due TODAY.' : diffDays < 0 ? 'Your machine service is OVERDUE.' : `Your machine service is due in ${diffDays} day(s).`
      }\n\nPlease contact us to schedule your service.\n\nSmart Agro Machinerys\nPhone: ${config.businessPhone}\nThank you!`;

      let status = 'PENDING';
      let sentAt: Date | null = null;
      let whatsappMessageId: string | undefined;
      let failureReason: string | undefined;

      if (config.autoRemindersEnabled && config.enabled) {
        const sendRes = await sendWhatsAppCloudMessage({
          to: party.mobile,
          text: messageText,
          isAutomatic: true,
        });

        if (sendRes.success) {
          status = 'SENT';
          sentAt = new Date();
          whatsappMessageId = sendRes.messageId;
          sent++;
        } else {
          status = 'FAILED';
          failureReason = sendRes.error;
          errors++;
        }
      }

      await prisma.serviceReminderLog.create({
        data: {
          serviceTaskId: task.id,
          partyId: party.id,
          machineId: task.machineId,
          reminderType: reminderType,
          recipientPhone: party.mobile,
          recipientName: party.name,
          scheduledDate: task.serviceDueDate,
          sentAt: sentAt,
          status: status,
          whatsappMessageId: whatsappMessageId,
          messageText: messageText,
          failureReason: failureReason,
          isAutomatic: true,
        },
      });
    }
  } catch (err: any) {
    console.error('Daily Service Reminder Scheduler Error:', err);
  }

  return { processed, sent, errors };
}
