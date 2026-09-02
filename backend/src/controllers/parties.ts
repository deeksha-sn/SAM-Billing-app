import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';

export async function getParties(req: AuthRequest, res: Response) {
  try {
    const { type, search, active } = req.query;
    const where: any = {};

    if (type) {
      where.type = type as string;
    }

    if (active !== undefined) {
      where.active = active === 'true';
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q } },
        { mobile: { contains: q } },
        { gstin: { contains: q } },
        { contactPerson: { contains: q } },
        { village: { contains: q } },
        { taluk: { contains: q } },
        { district: { contains: q } },
      ];
    }

    const parties = await prisma.party.findMany({
      where,
      include: {
        farmers: {
          include: {
            machines: { include: { machineItem: true } },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ parties });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getPartyById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const party = await prisma.party.findUnique({
      where: { id },
      include: {
        farmers: {
          include: {
            machines: { include: { machineItem: true } },
          },
          orderBy: { name: 'asc' },
        },
        invoices: { take: 10, include: { farmer: true }, orderBy: { createdAt: 'desc' } },
        quotations: { take: 10, include: { farmer: true }, orderBy: { createdAt: 'desc' } },
        deliveryChallans: { take: 10, include: { farmer: true }, orderBy: { createdAt: 'desc' } },
        payments: { take: 10, orderBy: { createdAt: 'desc' } },
        machines: { include: { machineItem: true, farmer: true }, orderBy: { createdAt: 'desc' } },
        services: { take: 10, include: { farmer: true }, orderBy: { serviceDueDate: 'desc' } },
      },
    });

    if (!party) return res.status(404).json({ error: 'Party not found' });

    // Calculate totals
    const totalInvoices = await prisma.invoice.aggregate({
      where: { partyId: id, status: { not: 'CANCELLED' } },
      _sum: { grandTotal: true, amountPaid: true, balanceDue: true },
    });

    const totalPurchases = await prisma.purchaseInvoice.aggregate({
      where: { partyId: id, status: { not: 'CANCELLED' } },
      _sum: { grandTotal: true, amountPaid: true, balanceDue: true },
    });

    return res.json({
      party,
      summary: {
        totalSales: totalInvoices._sum.grandTotal || 0,
        totalSalesPaid: totalInvoices._sum.amountPaid || 0,
        salesBalance: totalInvoices._sum.balanceDue || 0,
        totalPurchases: totalPurchases._sum.grandTotal || 0,
        totalPurchasesPaid: totalPurchases._sum.amountPaid || 0,
        purchasesBalance: totalPurchases._sum.balanceDue || 0,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createParty(req: AuthRequest, res: Response) {
  try {
    const {
      name,
      type,
      customerType,
      contactPerson,
      mobile,
      altMobile,
      email,
      address,
      village,
      taluk,
      district,
      state,
      stateCode,
      pincode,
      gstin,
      pan,
      openingBalance,
      creditLimit,
      notes,
    } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ error: 'Party Name and Mobile Number are required' });
    }

    // Check for duplicate warning/blocking
    const duplicateChecks: any[] = [];
    if (mobile) duplicateChecks.push({ mobile });
    if (gstin && gstin.trim()) duplicateChecks.push({ gstin: gstin.trim() });

    if (duplicateChecks.length > 0) {
      const existing = await prisma.party.findFirst({
        where: { OR: duplicateChecks },
      });
      if (existing) {
        return res.status(400).json({
          error: `Duplicate party detected! An existing party "${existing.name}" uses mobile "${existing.mobile}" or GSTIN "${existing.gstin}".`,
          existingParty: existing,
        });
      }
    }

    const party = await prisma.party.create({
      data: {
        name,
        type: type || 'CUSTOMER',
        customerType: customerType || 'FARMER',
        contactPerson,
        mobile,
        altMobile,
        email,
        address,
        village,
        taluk,
        district,
        state: state || 'Karnataka',
        stateCode: stateCode || '29',
        pincode,
        gstin,
        pan,
        openingBalance: Number(openingBalance) || 0,
        creditLimit: Number(creditLimit) || 0,
        notes,
        active: true,
      },
    });

    return res.status(201).json({ party });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateParty(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const data = req.body;

    if (data.openingBalance !== undefined) data.openingBalance = Number(data.openingBalance);
    if (data.creditLimit !== undefined) data.creditLimit = Number(data.creditLimit);

    const party = await prisma.party.update({
      where: { id },
      data,
    });

    return res.json({ party });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteParty(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const party = await prisma.party.findUnique({ where: { id } });

    if (!party) return res.status(404).json({ error: 'Party not found' });

    // Check all historical references
    const invoiceCount = await prisma.invoice.count({ where: { partyId: id } });
    const purchaseCount = await prisma.purchaseInvoice.count({ where: { partyId: id } });
    const quotationCount = await prisma.quotation.count({ where: { partyId: id } });
    const challanCount = await prisma.deliveryChallan.count({ where: { partyId: id } });
    const paymentCount = await prisma.payment.count({ where: { partyId: id } });
    const machineCount = await prisma.machine.count({ where: { partyId: id } });
    const serviceCount = await prisma.serviceTask.count({ where: { partyId: id } });

    const totalReferences =
      invoiceCount + purchaseCount + quotationCount + challanCount + paymentCount + machineCount + serviceCount;

    if (totalReferences > 0) {
      return res.status(400).json({
        canDelete: false,
        error: `Cannot permanently delete party "${party.name}" because it is associated with ${totalReferences} existing business record(s). You can deactivate this party instead.`,
        references: {
          invoices: invoiceCount,
          purchases: purchaseCount,
          quotations: quotationCount,
          deliveryChallans: challanCount,
          payments: paymentCount,
          machines: machineCount,
          services: serviceCount,
        },
      });
    }

    await prisma.party.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'PARTY_DELETE',
        entityType: 'PARTY',
        entityId: id,
        reference: party.name,
      },
    });

    return res.json({ canDelete: true, message: `Party "${party.name}" deleted permanently.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function togglePartyStatus(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const party = await prisma.party.findUnique({ where: { id } });

    if (!party) return res.status(404).json({ error: 'Party not found' });

    const updated = await prisma.party.update({
      where: { id },
      data: { active: !party.active },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: updated.active ? 'PARTY_REACTIVATE' : 'PARTY_DEACTIVATE',
        entityType: 'PARTY',
        entityId: id,
        reference: updated.name,
      },
    });

    return res.json({
      message: `Party "${updated.name}" ${updated.active ? 'reactivated' : 'deactivated'} successfully!`,
      party: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
