import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';
import { getIndianFinancialYear, getDefaultPatternForDocType } from '../utils/numbering';

export async function getCompanyProfile(req: AuthRequest, res: Response) {
  try {
    let company = await prisma.companyProfile.findUnique({ where: { id: 'default' } });
    if (!company) {
      company = await prisma.companyProfile.create({
        data: {
          id: 'default',
          businessName: 'Smart Agro Machinerys',
          address: 'Industrial Area, Main Road',
          phone: '+91 98765 43210',
          email: 'info@smartagromachinerys.com',
          gstin: '29ABCDE1234F1Z5',
          pan: 'ABCDE1234F',
          state: 'Karnataka',
          stateCode: '29',
          pincode: '581110',
          bankName: 'State Bank of India',
          bankAccountNo: '12345678901',
          ifsc: 'SBIN0001234',
          upiId: 'smartagro@sbi',
        },
      });
    }
    return res.json({ company });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateCompanyProfile(req: AuthRequest, res: Response) {
  try {
    const data = req.body;
    const company = await prisma.companyProfile.upsert({
      where: { id: 'default' },
      update: data,
      create: { id: 'default', ...data },
    });
    return res.json({ company });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getSystemSettings(req: AuthRequest, res: Response) {
  try {
    const settings = await prisma.systemSettings.findMany();
    const map: Record<string, string> = {
      delivery_challan_affects_stock: 'YES',
      allow_negative_stock: 'NO',
    };
    settings.forEach((s) => {
      map[s.key] = s.value;
    });
    return res.json({ settings: map });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateSystemSetting(req: AuthRequest, res: Response) {
  try {
    const { key, value, description } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    const setting = await prisma.systemSettings.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });

    return res.json({ setting });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getDocumentNumberConfigs(req: AuthRequest, res: Response) {
  try {
    const docTypes = ['INVOICE', 'PURCHASE', 'DELIVERY_CHALLAN', 'QUOTATION', 'SERVICE'];
    const configs = await prisma.documentNumberConfig.findMany();
    const fyInfo = getIndianFinancialYear();

    const resultList: any[] = [];
    for (const dt of docTypes) {
      let cfg = configs.find((c) => c.documentType === dt);
      if (!cfg) {
        const defaults = getDefaultPatternForDocType(dt);
        cfg = await prisma.documentNumberConfig.create({
          data: {
            documentType: dt,
            prefix: defaults.prefix,
            pattern: defaults.pattern,
            paddingDigits: defaults.paddingDigits,
            nextNumber: 1,
          },
        });
      }

      const seq = await prisma.sequenceNumber.findUnique({
        where: {
          documentType_financialYear: {
            documentType: dt,
            financialYear: fyInfo.fyFull,
          },
        },
      });

      resultList.push({
        ...cfg,
        currentFY: fyInfo.fyFull,
        fyShort: fyInfo.fy,
        nextNumber: seq ? seq.nextNumber : cfg.nextNumber,
      });
    }

    return res.json({ configs: resultList, financialYear: fyInfo });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateDocumentNumberConfig(req: AuthRequest, res: Response) {
  try {
    const { documentType } = req.params;
    const { pattern, paddingDigits, nextNumber, prefix } = req.body;
    const uppercaseType = documentType.toUpperCase();

    if (!pattern || !pattern.includes('{NUMBER}')) {
      return res.status(400).json({ error: 'Pattern must include the {NUMBER} placeholder' });
    }

    const padding = Math.max(1, Math.min(8, Number(paddingDigits) || 4));
    const nextSeq = Math.max(1, Number(nextNumber) || 1);

    const config = await prisma.documentNumberConfig.upsert({
      where: { documentType: uppercaseType },
      update: {
        pattern,
        paddingDigits: padding,
        prefix: prefix || 'SAM',
      },
      create: {
        documentType: uppercaseType,
        pattern,
        paddingDigits: padding,
        prefix: prefix || 'SAM',
        nextNumber: nextSeq,
      },
    });

    const fyInfo = getIndianFinancialYear();

    const seq = await prisma.sequenceNumber.upsert({
      where: {
        documentType_financialYear: {
          documentType: uppercaseType,
          financialYear: fyInfo.fyFull,
        },
      },
      update: {
        pattern,
        paddingDigits: padding,
        nextNumber: nextSeq,
      },
      create: {
        documentType: uppercaseType,
        financialYear: fyInfo.fyFull,
        pattern,
        paddingDigits: padding,
        nextNumber: nextSeq,
      },
    });

    return res.json({ config, sequence: seq });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
