import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';

export const BASE_FULL_FIELDS = {
  // COMPANY / HEADER
  showLogo: true,
  showCompanyName: true,
  showCompanyAddress: true,
  showCompanyPhone: true,
  showCompanyEmail: true,
  showCompanyWebsite: true,
  showCompanyGstin: true,
  showCompanyContact: true,

  // DOCUMENT DETAILS
  showDocNumber: true,
  showDocDate: true,
  showDate: true,
  showDueDate: true,
  showPaymentTerms: true,
  showPaymentMode: true,
  showRefNumber: true,
  showPoNumber: true,
  showPoDate: true,
  showEwayBill: true,

  // CUSTOMER / PARTY
  showCustomerName: true,
  showCustomerPhone: true,
  showCustomerGstin: true,
  showBillingAddress: true,
  showShippingAddress: true,
  showCustomerState: true,
  showCustomerStateCode: true,
  showPlaceOfSupply: true,

  // FARMER / CONTACT
  showFarmerName: true,
  showFarmerPhone: true,
  showFarmerAddress: true,
  showFarmerPincode: true,

  // ITEM TABLE
  showItemName: true,
  showDescription: true,
  showHsn: true,
  showSerialNumber: true,
  showQuantity: true,
  showFreeQuantity: false,
  showUnit: true,
  showRate: true,
  showDiscount: true,
  showGstRate: true,
  showTaxableAmount: true,
  showCgst: true,
  showSgst: true,
  showIgst: true,
  showTaxAmount: true,
  showItemTotal: true,
  showTotalAmount: true,

  // TOTALS
  showSubtotal: true,
  showDiscountTotal: true,
  showCgstTotal: true,
  showSgstTotal: true,
  showIgstTotal: true,
  showTotalTax: true,
  showRoundOff: true,
  showGrandTotal: true,
  showAmountInWords: true,
  showBalanceDue: true,

  // TRANSPORT / DELIVERY
  showTransportName: true,
  showTransport: true,
  showDeliveryLocation: true,
  showVehicleNumber: true,
  showDeliveryDate: true,
  showReasonForDelivery: true,
  showDispatchDetails: true,

  // PAYMENT / BANK
  showBankDetails: true,
  showBankName: true,
  showAccountName: true,
  showAccountNumber: true,
  showIfsc: true,
  showUpiId: true,
  showPaymentInstructions: true,

  // FOOTER
  showNotes: true,
  showTerms: true,
  showCustomerSignature: true,
  showAuthSignature: true,
  showSignature: true,
  showCompanySeal: true,
};

// 1. STANDARD TAX INVOICE
export const DEFAULT_INVOICE_FIELDS = {
  ...BASE_FULL_FIELDS,
  showFreeQuantity: false,
};

// 2. DETAILED MACHINERY INVOICE (SAM Machines & Equipment Specs)
export const DETAILED_MACHINERY_FIELDS = {
  ...BASE_FULL_FIELDS,
  showDescription: true,
  showSerialNumber: true,
  showFreeQuantity: true,
  showPoNumber: true,
  showPoDate: true,
  showEwayBill: true,
  showTransport: true,
  showVehicleNumber: true,
  showCompanySeal: true,
};

// 3. SIMPLE INVOICE (Clean & Minimalist)
export const SIMPLE_INVOICE_FIELDS = {
  ...BASE_FULL_FIELDS,
  showCompanyEmail: false,
  showCompanyWebsite: false,
  showShippingAddress: false,
  showFarmerName: false,
  showFarmerPhone: false,
  showFarmerAddress: false,
  showFarmerPincode: false,
  showFreeQuantity: false,
  showSerialNumber: false,
  showDiscount: false,
  showPoNumber: false,
  showPoDate: false,
  showEwayBill: false,
  showTransportName: false,
  showVehicleNumber: false,
  showReasonForDelivery: false,
  showDispatchDetails: false,
  showCompanySeal: false,
};

// 4. QUOTATION (Quotation Layout & Wording)
export const DEFAULT_QUOTATION_FIELDS = {
  ...BASE_FULL_FIELDS,
  showPaymentMode: false,
  showPoNumber: false,
  showPoDate: false,
  showEwayBill: false,
  showVehicleNumber: false,
};

// 5. DELIVERY CHALLAN (DC Layout & Transport Info, no price/GST)
export const DEFAULT_CHALLAN_FIELDS = {
  ...BASE_FULL_FIELDS,
  showCompanyGstin: false,
  showHsn: false,
  showRate: false,
  showDiscount: false,
  showGstRate: false,
  showCgst: false,
  showSgst: false,
  showIgst: false,
  showTaxableAmount: false,
  showTaxAmount: false,
  showItemTotal: false,
  showTotalAmount: false,
  showSubtotal: false,
  showDiscountTotal: false,
  showCgstTotal: false,
  showSgstTotal: false,
  showIgstTotal: false,
  showTotalTax: false,
  showGrandTotal: false,
  showAmountInWords: false,
  showBalanceDue: false,
  showBankDetails: false,
  showPaymentMode: false,
  showFreeQuantity: true,
  showReasonForDelivery: true,
  showVehicleNumber: true,
  showTransport: true,
};

// 6. PURCHASE INVOICE
export const DEFAULT_PURCHASE_FIELDS = {
  ...BASE_FULL_FIELDS,
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

export async function resolveTemplateSnapshot(
  documentType: string,
  billTemplateId?: string,
  fieldsConfigSnapshot?: any
): Promise<{ billTemplateId: string | null; fieldsConfigSnapshot: string }> {
  if (fieldsConfigSnapshot) {
    const configStr = typeof fieldsConfigSnapshot === 'string'
      ? fieldsConfigSnapshot
      : JSON.stringify(fieldsConfigSnapshot);
    return {
      billTemplateId: billTemplateId || null,
      fieldsConfigSnapshot: configStr,
    };
  }

  if (billTemplateId) {
    const tmpl = await prisma.billTemplate.findUnique({ where: { id: billTemplateId } });
    if (tmpl) {
      return {
        billTemplateId: tmpl.id,
        fieldsConfigSnapshot: tmpl.fieldsConfig,
      };
    }
  }

  const docType = documentType.toUpperCase();
  const defaultTmpl = await prisma.billTemplate.findFirst({
    where: { documentType: docType, isDefault: true },
  });

  if (defaultTmpl) {
    return {
      billTemplateId: defaultTmpl.id,
      fieldsConfigSnapshot: defaultTmpl.fieldsConfig,
    };
  }

  const anyTmpl = await prisma.billTemplate.findFirst({
    where: { documentType: docType },
  });

  if (anyTmpl) {
    return {
      billTemplateId: anyTmpl.id,
      fieldsConfigSnapshot: anyTmpl.fieldsConfig,
    };
  }

  let fallbackPreset = BASE_FULL_FIELDS;
  if (docType === 'INVOICE') fallbackPreset = DEFAULT_INVOICE_FIELDS;
  else if (docType === 'QUOTATION') fallbackPreset = DEFAULT_QUOTATION_FIELDS;
  else if (docType === 'DELIVERY_CHALLAN') fallbackPreset = DEFAULT_CHALLAN_FIELDS;
  else if (docType === 'PURCHASE') fallbackPreset = DEFAULT_PURCHASE_FIELDS;

  return {
    billTemplateId: null,
    fieldsConfigSnapshot: JSON.stringify(fallbackPreset),
  };
}
