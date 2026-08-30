import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';

export async function globalSearch(req: AuthRequest, res: Response) {
  try {
    const { query } = req.query;
    if (!query || String(query).trim().length === 0) {
      return res.json({ results: [] });
    }

    const q = String(query).trim();

    const parties = await prisma.party.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { mobile: { contains: q } },
          { gstin: { contains: q } },
        ],
      },
      take: 5,
    });

    const items = await prisma.item.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { sku: { contains: q } },
          { hsnSac: { contains: q } },
        ],
      },
      take: 5,
    });

    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { invoiceNumber: { contains: q } },
          { party: { name: { contains: q } } },
        ],
      },
      take: 5,
      include: { party: true },
    });

    const machines = await prisma.machine.findMany({
      where: {
        OR: [
          { serialNumber: { contains: q } },
          { model: { contains: q } },
          { party: { name: { contains: q } } },
        ],
      },
      take: 5,
      include: { party: true },
    });

    const services = await prisma.serviceTask.findMany({
      where: {
        OR: [
          { serviceNo: { contains: q } },
          { serialNumber: { contains: q } },
          { party: { name: { contains: q } } },
        ],
      },
      take: 5,
      include: { party: true },
    });

    return res.json({
      results: {
        parties,
        items,
        invoices,
        machines,
        services,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createBackup(req: AuthRequest, res: Response) {
  try {
    const users = await prisma.user.findMany();
    const company = await prisma.companyProfile.findUnique({ where: { id: 'default' } });
    const settings = await prisma.systemSettings.findMany();
    const sequenceNumbers = await prisma.sequenceNumber.findMany();
    const parties = await prisma.party.findMany();
    const categories = await prisma.category.findMany();
    const units = await prisma.unit.findMany();
    const items = await prisma.item.findMany();
    const bomHeaders = await prisma.bOMHeader.findMany({ include: { components: true } });
    const invoices = await prisma.invoice.findMany({ include: { items: true } });
    const deliveryChallans = await prisma.deliveryChallan.findMany({ include: { items: true } });
    const purchases = await prisma.purchaseInvoice.findMany({ include: { items: true } });
    const payments = await prisma.payment.findMany();
    const stockMovements = await prisma.stockMovement.findMany();
    const machines = await prisma.machine.findMany();
    const services = await prisma.serviceTask.findMany({ include: { parts: true } });
    const expenses = await prisma.expense.findMany();
    const auditLogs = await prisma.auditLog.findMany();

    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      company,
      settings,
      sequenceNumbers,
      users,
      parties,
      categories,
      units,
      items,
      bomHeaders,
      invoices,
      deliveryChallans,
      purchases,
      payments,
      stockMovements,
      machines,
      services,
      expenses,
      auditLogs,
    };

    return res.json({ backup: backupData });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function resetDemoData(req: AuthRequest, res: Response) {
  try {
    // Admin only
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only Admin can delete demo data' });
    }

    await prisma.$transaction([
      prisma.servicePart.deleteMany(),
      prisma.serviceTask.deleteMany(),
      prisma.machine.deleteMany(),
      prisma.stockMovement.deleteMany(),
      prisma.payment.deleteMany(),
      prisma.purchaseItem.deleteMany(),
      prisma.purchaseInvoice.deleteMany(),
      prisma.deliveryChallanItem.deleteMany(),
      prisma.deliveryChallan.deleteMany(),
      prisma.invoiceItem.deleteMany(),
      prisma.invoice.deleteMany(),
      prisma.proformaItem.deleteMany(),
      prisma.proformaInvoice.deleteMany(),
      prisma.quotationItem.deleteMany(),
      prisma.quotation.deleteMany(),
      prisma.creditNote.deleteMany(),
      prisma.debitNote.deleteMany(),
      prisma.bOMItem.deleteMany(),
      prisma.bOMHeader.deleteMany(),
      prisma.expense.deleteMany(),
      prisma.party.deleteMany(),
      prisma.item.deleteMany(),
      prisma.category.deleteMany(),
      prisma.unit.deleteMany(),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'RESET_DEMO_DATA',
        entityType: 'SYSTEM',
        reference: 'Deleted all demo transactions and master records',
      },
    });

    return res.json({ message: 'All demo transactions, parties, items, and BOM records deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
