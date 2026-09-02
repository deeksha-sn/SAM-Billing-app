import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';

// GET /parties/:partyId/farmers
export async function getFarmersByParty(req: AuthRequest, res: Response) {
  try {
    const { partyId } = req.params;
    const { search } = req.query;

    const where: any = { partyId, active: true };

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q } },
        { mobile: { contains: q } },
        { village: { contains: q } },
        { district: { contains: q } },
        { address: { contains: q } },
        { machines: { some: { serialNumber: { contains: q } } } },
        { machines: { some: { model: { contains: q } } } },
      ];
    }

    const farmers = await prisma.farmer.findMany({
      where,
      include: {
        machines: {
          include: { machineItem: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ farmers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// GET /farmers/:id
export async function getFarmerById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const farmer = await prisma.farmer.findUnique({
      where: { id },
      include: {
        party: true,
        machines: {
          include: { machineItem: true, assignedTechnician: true },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          orderBy: { invoiceDate: 'desc' },
          take: 20,
        },
        quotations: {
          orderBy: { quotationDate: 'desc' },
          take: 20,
        },
        deliveryChallans: {
          orderBy: { challanDate: 'desc' },
          take: 20,
        },
        serviceTasks: {
          include: { machine: true, assignedTechnician: true },
          orderBy: { serviceDueDate: 'desc' },
          take: 20,
        },
      },
    });

    if (!farmer) return res.status(404).json({ error: 'Farmer/Contact record not found' });

    return res.json({ farmer });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// POST /parties/:partyId/farmers
export async function createFarmer(req: AuthRequest, res: Response) {
  try {
    const { partyId } = req.params;
    const {
      name,
      mobile,
      altMobile,
      email,
      address,
      shippingAddress,
      village,
      taluk,
      district,
      state,
      stateCode,
      pincode,
      gstin,
      notes,
    } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({ error: 'Farmer Name and Mobile Number are required' });
    }

    const party = await prisma.party.findUnique({ where: { id: partyId } });
    if (!party) return res.status(404).json({ error: 'Parent Party not found' });

    const farmer = await prisma.farmer.create({
      data: {
        partyId,
        name: name.trim(),
        mobile: mobile.trim(),
        altMobile: altMobile ? altMobile.trim() : null,
        email: email ? email.trim() : null,
        address: address ? address.trim() : null,
        shippingAddress: shippingAddress ? shippingAddress.trim() : (address ? address.trim() : null),
        village: village ? village.trim() : null,
        taluk: taluk ? taluk.trim() : null,
        district: district ? district.trim() : party.district,
        state: state || party.state || 'Karnataka',
        stateCode: stateCode || party.stateCode || '29',
        pincode: pincode ? pincode.trim() : null,
        gstin: gstin ? gstin.trim() : null,
        notes: notes ? notes.trim() : null,
        active: true,
      },
      include: {
        party: true,
        machines: { include: { machineItem: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'FARMER_CREATE',
        entityType: 'FARMER',
        entityId: farmer.id,
        reference: `${farmer.name} (${party.name})`,
      },
    });

    return res.status(201).json({ farmer });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// PUT /farmers/:id
export async function updateFarmer(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.farmer.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Farmer record not found' });

    const farmer = await prisma.farmer.update({
      where: { id },
      data,
      include: {
        party: true,
        machines: { include: { machineItem: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'FARMER_UPDATE',
        entityType: 'FARMER',
        entityId: farmer.id,
        reference: farmer.name,
      },
    });

    return res.json({ farmer });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// DELETE /farmers/:id
export async function deleteFarmer(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const farmer = await prisma.farmer.findUnique({
      where: { id },
      include: { party: true },
    });

    if (!farmer) return res.status(404).json({ error: 'Farmer record not found' });

    // Check if farmer has invoices, machines, etc.
    const machineCount = await prisma.machine.count({ where: { farmerId: id } });
    const invoiceCount = await prisma.invoice.count({ where: { farmerId: id } });
    const serviceCount = await prisma.serviceTask.count({ where: { farmerId: id } });

    if (machineCount > 0 || invoiceCount > 0 || serviceCount > 0) {
      // Soft delete/deactivate if referenced
      await prisma.farmer.update({
        where: { id },
        data: { active: false },
      });
      return res.json({
        message: `Farmer "${farmer.name}" deactivated safely (retained for historical records). Parent party remains intact.`,
        deactivated: true,
      });
    }

    // Otherwise permanently delete farmer record without touching parent party!
    await prisma.farmer.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'FARMER_DELETE',
        entityType: 'FARMER',
        entityId: id,
        reference: farmer.name,
      },
    });

    return res.json({
      message: `Farmer "${farmer.name}" deleted cleanly. Parent party "${farmer.party.name}" remains intact.`,
      deleted: true,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
