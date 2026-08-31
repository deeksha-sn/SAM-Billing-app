import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';
import { getWhatsAppSettings, sendWhatsAppCloudMessage } from '../services/whatsappService';

export async function getWhatsAppConfigHandler(req: AuthRequest, res: Response) {
  try {
    const config = await getWhatsAppSettings();
    // Mask token for security
    const maskedToken = config.accessToken
      ? config.accessToken.slice(0, 6) + '...' + config.accessToken.slice(-4)
      : '';

    return res.json({
      config: {
        ...config,
        accessTokenMasked: maskedToken,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateWhatsAppConfigHandler(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only ADMIN users can update WhatsApp Business configuration' });
    }

    const {
      enabled,
      phoneNumberId,
      businessAccountId,
      accessToken,
      businessPhone,
      autoRemindersEnabled,
      upcomingDays,
      overdueDays,
      paymentReminderDays,
    } = req.body;

    const updates: { key: string; value: string }[] = [];

    if (enabled !== undefined) updates.push({ key: 'whatsapp_enabled', value: enabled ? 'YES' : 'NO' });
    if (phoneNumberId !== undefined) updates.push({ key: 'whatsapp_phone_number_id', value: phoneNumberId });
    if (businessAccountId !== undefined) updates.push({ key: 'whatsapp_business_account_id', value: businessAccountId });
    if (accessToken !== undefined && !accessToken.includes('...')) {
      updates.push({ key: 'whatsapp_access_token', value: accessToken });
    }
    if (businessPhone !== undefined) updates.push({ key: 'whatsapp_business_phone', value: businessPhone });
    if (autoRemindersEnabled !== undefined) updates.push({ key: 'whatsapp_auto_reminders_enabled', value: autoRemindersEnabled ? 'YES' : 'NO' });
    if (upcomingDays !== undefined) updates.push({ key: 'whatsapp_upcoming_days', value: upcomingDays });
    if (overdueDays !== undefined) updates.push({ key: 'whatsapp_overdue_days', value: overdueDays });
    if (paymentReminderDays !== undefined) updates.push({ key: 'whatsapp_payment_reminder_days', value: paymentReminderDays });

    for (const item of updates) {
      await prisma.systemSettings.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: { key: item.key, value: item.value, description: 'WhatsApp Config' },
      });
    }

    return res.json({ message: 'WhatsApp Business Settings updated successfully!' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function testWhatsAppConnectionHandler(req: AuthRequest, res: Response) {
  try {
    const { testPhone } = req.body;
    if (!testPhone) {
      return res.status(400).json({ error: 'Test phone number is required' });
    }

    const testMessage = `Test message from Smart Agro Machinerys Business Management System.\nConnection to WhatsApp Business API is working!`;

    const result = await sendWhatsAppCloudMessage({
      to: testPhone,
      text: testMessage,
    });

    if (result.success) {
      return res.json({
        success: true,
        message: `Test message sent successfully! Message ID: ${result.messageId}`,
        messageId: result.messageId,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to send test WhatsApp message',
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
