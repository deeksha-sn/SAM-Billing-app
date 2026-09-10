import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';

export const DEFAULT_INVOICE_FIELDS = {
  showLogo: true,
  showCompanyContact: true,
  showDocNumber: true,
  showDate: true,
  showCustomerName: true,
  showBillingAddress: true,
  showShippingAddress: true,
  showGstin: true,
  showPlaceOfSupply: true,
  showHsn: true,
  showItemName: true,
  showDescription: true,
  showSerialNumber: true,
  showQuantity: true,
  showFreeQuantity: false,
  showUnit: true,
  showRate: true,
  showDiscount: true,
  showGstRate: true,
  showCgst: true,
  showSgst: true,
  showIgst: true,
  showTaxAmount: true,
  showTotalAmount: true,
  showAmountInWords: true,
  showPaymentMode: true,
  showPaymentTerms: true,
  showDueDate: true,
  showPoNumber: true,
  showPoDate: true,
  showEwayBill: true,
  showTransport: true,
  showDeliveryLocation: true,
  showVehicleNumber: true,
  showNotes: true,
  showBankDetails: true,
  showTerms: true,
  showSignature: true,
};

export const DEFAULT_QUOTATION_FIELDS = {
  showLogo: true,
  showCompanyContact: true,
  showDocNumber: true,
  showDate: true,
  showCustomerName: true,
  showBillingAddress: true,
  showShippingAddress: true,
  showGstin: true,
  showPlaceOfSupply: true,
  showHsn: true,
  showItemName: true,
  showDescription: true,
  showSerialNumber: true,
  showQuantity: true,
  showFreeQuantity: false,
  showUnit: true,
  showRate: true,
  showDiscount: true,
  showGstRate: true,
  showCgst: true,
  showSgst: true,
  showIgst: true,
  showTaxAmount: true,
  showTotalAmount: true,
  showAmountInWords: true,
  showPaymentMode: false,
  showPaymentTerms: true,
  showDueDate: true,
  showPoNumber: false,
  showPoDate: false,
  showEwayBill: false,
  showTransport: true,
  showDeliveryLocation: true,
  showVehicleNumber: false,
  showNotes: true,
  showBankDetails: true,
  showTerms: true,
  showSignature: true,
};

export const DEFAULT_CHALLAN_FIELDS = {
  showLogo: true,
  showCompanyContact: true,
  showDocNumber: true,
  showDate: true,
  showCustomerName: true,
  showBillingAddress: true,
  showShippingAddress: true,
  showGstin: false,
  showPlaceOfSupply: true,
  showHsn: false,
  showItemName: true,
  showDescription: true,
  showSerialNumber: true,
  showQuantity: true,
  showFreeQuantity: true,
  showUnit: true,
  showRate: false,
  showDiscount: false,
  showGstRate: false,
  showCgst: false,
  showSgst: false,
  showIgst: false,
  showTaxAmount: false,
  showTotalAmount: false,
  showAmountInWords: false,
  showPaymentMode: false,
  showPaymentTerms: false,
  showDueDate: false,
  showPoNumber: true,
  showPoDate: true,
  showEwayBill: true,
  showTransport: true,
  showDeliveryLocation: true,
  showVehicleNumber: true,
  showNotes: true,
  showBankDetails: false,
  showTerms: true,
  showSignature: true,
};

export const DEFAULT_PURCHASE_FIELDS = {
  showLogo: true,
  showCompanyContact: true,
  showDocNumber: true,
  showDate: true,
  showCustomerName: true,
  showBillingAddress: true,
  showShippingAddress: false,
  showGstin: true,
  showPlaceOfSupply: true,
  showHsn: true,
  showItemName: true,
  showDescription: true,
  showSerialNumber: true,
  showQuantity: true,
  showFreeQuantity: false,
  showUnit: true,
  showRate: true,
  showDiscount: true,
  showGstRate: true,
  showCgst: true,
  showSgst: true,
  showIgst: true,
  showTaxAmount: true,
  showTotalAmount: true,
  showAmountInWords: true,
  showPaymentMode: true,
  showPaymentTerms: true,
  showDueDate: true,
  showPoNumber: true,
  showPoDate: true,
  showEwayBill: true,
  showTransport: true,
  showDeliveryLocation: true,
  showVehicleNumber: false,
  showNotes: true,
  showBankDetails: true,
  showTerms: true,
  showSignature: true,
};

export async function getTemplates(req: AuthRequest, res: Response) {
  try {
    const { documentType } = req.query;
    const where: any = {};
    if (documentType) {
      where.documentType = String(documentType).toUpperCase();
    }

    const templates = await prisma.billTemplate.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    return res.json({ templates });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getTemplateById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const template = await prisma.billTemplate.findUnique({ where: { id } });
    if (!template) return res.status(404).json({ error: 'Template not found' });
    return res.json({ template });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createTemplate(req: AuthRequest, res: Response) {
  try {
    const { name, documentType, fieldsConfig, isDefault } = req.body;

    if (!name || !documentType || !fieldsConfig) {
      return res.status(400).json({ error: 'Name, documentType, and fieldsConfig are required' });
    }

    const docType = String(documentType).toUpperCase();
    const isDef = Boolean(isDefault);
    const configStr = typeof fieldsConfig === 'string' ? fieldsConfig : JSON.stringify(fieldsConfig);

    const template = await prisma.$transaction(async (tx) => {
      if (isDef) {
        await tx.billTemplate.updateMany({
          where: { documentType: docType },
          data: { isDefault: false },
        });
      }

      return await tx.billTemplate.create({
        data: {
          name: name.trim(),
          documentType: docType,
          isDefault: isDef,
          fieldsConfig: configStr,
        },
      });
    });

    return res.status(201).json({ template });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateTemplate(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, fieldsConfig, isDefault } = req.body;

    const existing = await prisma.billTemplate.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Template not found' });

    const configStr = fieldsConfig !== undefined
      ? (typeof fieldsConfig === 'string' ? fieldsConfig : JSON.stringify(fieldsConfig))
      : existing.fieldsConfig;

    const isDef = isDefault !== undefined ? Boolean(isDefault) : existing.isDefault;

    const template = await prisma.$transaction(async (tx) => {
      if (isDef && !existing.isDefault) {
        await tx.billTemplate.updateMany({
          where: { documentType: existing.documentType },
          data: { isDefault: false },
        });
      }

      return await tx.billTemplate.update({
        where: { id },
        data: {
          name: name ? name.trim() : existing.name,
          fieldsConfig: configStr,
          isDefault: isDef,
        },
      });
    });

    return res.json({ template });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteTemplate(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const existing = await prisma.billTemplate.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Template not found' });

    await prisma.billTemplate.delete({ where: { id } });
    return res.json({ message: 'Template deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function setDefaultTemplate(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const existing = await prisma.billTemplate.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Template not found' });

    await prisma.$transaction(async (tx) => {
      await tx.billTemplate.updateMany({
        where: { documentType: existing.documentType },
        data: { isDefault: false },
      });
      await tx.billTemplate.update({
        where: { id },
        data: { isDefault: true },
      });
    });

    return res.json({ message: 'Default template updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
