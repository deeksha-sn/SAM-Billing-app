import { prisma } from '../db';

export interface SendWhatsAppParams {
  to: string; // Recipient phone number with country code e.g. "919844011223"
  text?: string;
  templateName?: string;
  languageCode?: string;
  components?: any[];
  isAutomatic?: boolean;
}

export async function getWhatsAppSettings() {
  const settings = await prisma.systemSettings.findMany({
    where: {
      key: {
        in: [
          'whatsapp_enabled',
          'whatsapp_phone_number_id',
          'whatsapp_business_account_id',
          'whatsapp_access_token',
          'whatsapp_business_phone',
          'whatsapp_auto_reminders_enabled',
          'service_reminder_upcoming_days',
          'service_reminder_overdue_days',
          'payment_reminder_days',
        ],
      },
    },
  });

  const config: Record<string, string> = {};
  settings.forEach((s) => {
    config[s.key] = s.value;
  });

  return {
    enabled: config.whatsapp_enabled === 'YES',
    phoneNumberId: config.whatsapp_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    businessAccountId: config.whatsapp_business_account_id || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    accessToken: config.whatsapp_access_token || process.env.WHATSAPP_ACCESS_TOKEN || '',
    businessPhone: config.whatsapp_business_phone || process.env.WHATSAPP_BUSINESS_PHONE || '+91 9844011223',
    autoRemindersEnabled: config.whatsapp_auto_reminders_enabled === 'YES',
    upcomingDays: config.service_reminder_upcoming_days || '7,3,1',
    overdueDays: config.service_reminder_overdue_days || '1,7',
    paymentReminderDays: config.payment_reminder_days || '3,0,3',
  };
}

export async function sendWhatsAppCloudMessage(params: SendWhatsAppParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getWhatsAppSettings();

  if (!config.enabled || !config.phoneNumberId || !config.accessToken) {
    return {
      success: false,
      error: 'WhatsApp Business Cloud API is not configured or disabled.',
    };
  }

  // Format phone number to international format (e.g. 919844011223)
  let cleanPhone = params.to.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }

  const url = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`;

  const payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
  };

  if (params.templateName) {
    payload.type = 'template';
    payload.template = {
      name: params.templateName,
      language: { code: params.languageCode || 'en_US' },
      components: params.components || [],
    };
  } else {
    payload.type = 'text';
    payload.text = { body: params.text || '' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: any = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || `HTTP Error ${response.status}`;
      return { success: false, error: errorMsg };
    }

    const messageId = data.messages?.[0]?.id;
    return { success: true, messageId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network request to Meta API failed' };
  }
}
