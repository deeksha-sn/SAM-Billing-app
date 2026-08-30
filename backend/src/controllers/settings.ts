import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';

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
