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

  if (d.getDate() !== currentDay) {
    d.setDate(0); // Clamp to last day of month
  }

  return d;
}

export async function processDailyServiceReminders(): Promise<{ processed: number; sent: number; errors: number; skipped: number }> {
  let processed = 0;
  let sent = 0;
  let errors = 0;
  let skipped = 0;

  try {
    const config = await getWhatsAppSettings();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // Fetch active service tasks requiring service reminders (exclude COMPLETED & CANCELLED)
    const tasks = await prisma.serviceTask.findMany({
      where: {
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      include: {
        party: true,
        farmer: true,
        machine: { include: { machineItem: true } },
        assignedTechnician: true,
      },
    });

    for (const task of tasks) {
      processed++;
      const party = task.party;
      if (party && party.whatsappServiceReminders === false) {
        skipped++;
        continue;
      }
      const farmer = task.farmer;
      const recipientPhone = farmer?.mobile || party.mobile;
      const recipientName = farmer ? `${farmer.name} (${party.name})` : party.name;
      const fullAddress = farmer
        ? [farmer.address, farmer.village, farmer.taluk, farmer.district, farmer.state].filter(Boolean).join(', ')
        : [party.address, party.village, party.taluk, party.district, party.state].filter(Boolean).join(', ');
      const pincode = farmer?.pincode || party.pincode || 'N/A';
      const machineName = task.machine?.model || task.machine?.machineItem?.name || 'Agro Equipment';
      const technicianName = task.assignedTechnician?.name || 'Unassigned';

      const dueDate = new Date(task.serviceDueDate);
      dueDate.setHours(0, 0, 0, 0);

      // Difference in days between due date and today
      const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

      let stageKey: string | null = null;
      let stageLabel: string | null = null;

      if (diffDays === 20) {
        stageKey = '20_DAYS_BEFORE';
        stageLabel = '20 DAYS BEFORE SERVICE';
      } else if (diffDays === 10) {
        stageKey = '10_DAYS_BEFORE';
        stageLabel = '10 DAYS BEFORE SERVICE';
      } else if (diffDays === 7) {
        stageKey = '7_DAYS_BEFORE';
        stageLabel = '7 DAYS BEFORE SERVICE';
      } else if (diffDays === 3) {
        stageKey = '3_DAYS_BEFORE';
        stageLabel = '3 DAYS BEFORE SERVICE';
      } else if (diffDays === 0) {
        stageKey = 'SERVICE_DAY';
        stageLabel = 'SERVICE DAY REMINDER';
      } else if (diffDays < 0) {
        stageKey = 'OVERDUE_DAILY';
        stageLabel = `OVERDUE DAILY REMINDER (${Math.abs(diffDays)} DAYS OVERDUE)`;
      }

      if (!stageKey) {
        skipped++;
        continue;
      }

      // Snapshot details required by specification
      const reminderSnapshot = {
        customerName: party.name,
        farmerName: farmer?.name || party.name,
        phone: recipientPhone,
        fullAddress: fullAddress,
        pincode: pincode,
        machineName: machineName,
        serialNumber: task.serialNumber,
        serviceDate: dueDate.toISOString().split('T')[0],
        technician: technicianName,
        reminderStage: stageKey,
        stageLabel: stageLabel,
      };

      // Idempotency check: Do not send duplicate reminders for the same service and same stage
      if (stageKey === 'OVERDUE_DAILY') {
        const existingLogToday = await prisma.serviceReminderLog.findFirst({
          where: {
            serviceTaskId: task.id,
            reminderStage: 'OVERDUE_DAILY',
            createdAt: { gte: today, lte: todayEnd },
          },
        });
        if (existingLogToday) {
          skipped++;
          continue;
        }
      } else {
        const existingLogStage = await prisma.serviceReminderLog.findFirst({
          where: {
            serviceTaskId: task.id,
            reminderStage: stageKey,
            scheduledDate: task.serviceDueDate,
          },
        });
        if (existingLogStage) {
          skipped++;
          continue;
        }
      }

      // Check Customer Opt-in
      if (!party.whatsappServiceReminders) {
        await prisma.serviceReminderLog.create({
          data: {
            serviceTaskId: task.id,
            partyId: party.id,
            farmerId: farmer?.id || null,
            machineId: task.machineId,
            reminderStage: stageKey,
            reminderType: `SERVICE_${stageKey}`,
            recipientPhone: recipientPhone,
            recipientName: recipientName,
            scheduledDate: task.serviceDueDate,
            status: 'OPTED_OUT',
            messageText: 'Customer has opted out of WhatsApp service reminders.',
            reminderDetails: JSON.stringify(reminderSnapshot),
            isAutomatic: true,
          },
        });
        skipped++;
        continue;
      }

      const messageText = `Dear ${recipientName},\n\n*SERVICE REMINDER - SMART AGRO MACHINERYS*\nStatus: ${stageLabel}\n\n🚜 Machine: ${machineName}\n🔢 Serial No: ${task.serialNumber}\n📍 Service Location: ${fullAddress} (PIN: ${pincode})\n📅 Scheduled Service Date: ${dueDate.toLocaleDateString('en-IN')}\n👨‍🔧 Assigned Technician: ${technicianName}\n\n${
        diffDays === 0
          ? 'Your machine service is scheduled for TODAY.'
          : diffDays < 0
          ? `Your machine service is OVERDUE by ${Math.abs(diffDays)} day(s).`
          : `Your machine service is due in ${diffDays} day(s).`
      }\n\nPlease reach out to us if you need to reschedule.\nPhone: ${config.businessPhone || '+91 98765 43210'}\nThank you!`;

      let status = 'PENDING';
      let sentAt: Date | null = null;
      let whatsappMessageId: string | undefined;
      let failureReason: string | undefined;

      if (config.autoRemindersEnabled && config.enabled) {
        const sendRes = await sendWhatsAppCloudMessage({
          to: recipientPhone,
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
      } else {
        // Manual mode record
        status = 'MANUAL_GENERATED';
        sentAt = new Date();
        sent++;
      }

      await prisma.serviceReminderLog.create({
        data: {
          serviceTaskId: task.id,
          partyId: party.id,
          farmerId: farmer?.id || null,
          machineId: task.machineId,
          reminderStage: stageKey,
          reminderType: `SERVICE_${stageKey}`,
          recipientPhone: recipientPhone,
          recipientName: recipientName,
          scheduledDate: task.serviceDueDate,
          sentAt: sentAt,
          status: status,
          whatsappMessageId: whatsappMessageId,
          messageText: messageText,
          reminderDetails: JSON.stringify(reminderSnapshot),
          failureReason: failureReason,
          isAutomatic: true,
        },
      });
    }
  } catch (err: any) {
    console.error('Daily Service Reminder Scheduler Error:', err);
  }

  return { processed, sent, errors, skipped };
}
