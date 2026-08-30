import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';

export async function getMachines(req: AuthRequest, res: Response) {
  try {
    const { partyId, search, technicianId } = req.query;
    const where: any = {};

    if (partyId) where.partyId = partyId as string;
    if (technicianId) where.assignedTechnicianId = technicianId as string;
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { serialNumber: { contains: q } },
        { model: { contains: q } },
        { party: { name: { contains: q } } },
        { party: { mobile: { contains: q } } },
      ];
    }

    const machines = await prisma.machine.findMany({
      where,
      include: {
        party: true,
        machineItem: true,
        invoice: true,
        assignedTechnician: { select: { id: true, name: true, mobile: true } as any },
        services: { orderBy: { serviceDueDate: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const enriched = machines.map((m) => ({
      ...m,
      isWarrantyActive: m.warrantyEnd ? new Date(m.warrantyEnd) >= now : false,
    }));

    return res.json({ machines: enriched });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getMachineBySerial(req: AuthRequest, res: Response) {
  try {
    const { serialNumber } = req.params;
    const machine = await prisma.machine.findUnique({
      where: { serialNumber },
      include: {
        party: true,
        machineItem: true,
        invoice: true,
        assignedTechnician: { select: { id: true, name: true } },
        services: {
          include: {
            parts: { include: { item: true } },
            assignedTechnician: { select: { name: true } },
          },
          orderBy: { serviceDueDate: 'desc' },
        },
      },
    });

    if (!machine) return res.status(404).json({ error: 'Machine not found' });

    const now = new Date();
    return res.json({
      machine: {
        ...machine,
        isWarrantyActive: machine.warrantyEnd ? new Date(machine.warrantyEnd) >= now : false,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createMachine(req: AuthRequest, res: Response) {
  try {
    const {
      partyId,
      machineItemId,
      model,
      serialNumber,
      invoiceId,
      saleDate,
      warrantyMonths,
      serviceIntervalDays,
      assignedTechnicianId,
      location,
      notes,
    } = req.body;

    if (!partyId || !machineItemId || !serialNumber) {
      return res.status(400).json({ error: 'Customer, Machine Model, and Serial Number are required' });
    }

    const existing = await prisma.machine.findUnique({ where: { serialNumber: serialNumber.trim() } });
    if (existing) {
      return res.status(400).json({ error: `Machine serial number "${serialNumber}" already registered!` });
    }

    const sDate = saleDate ? new Date(saleDate) : new Date();
    const wMonths = Number(warrantyMonths) || 12;
    const wEnd = new Date(sDate);
    wEnd.setMonth(wEnd.getMonth() + wMonths);

    const interval = Number(serviceIntervalDays) || 90;
    const nextService = new Date(sDate.getTime() + interval * 24 * 60 * 60 * 1000);

    const item = await prisma.item.findUnique({ where: { id: machineItemId } });

    const machine = await prisma.machine.create({
      data: {
        partyId,
        machineItemId,
        model: model || item?.name || 'Agro Machine',
        serialNumber: serialNumber.trim(),
        invoiceId: invoiceId || null,
        saleDate: sDate,
        warrantyStart: sDate,
        warrantyEnd: wEnd,
        serviceIntervalDays: interval,
        nextServiceDate: nextService,
        assignedTechnicianId: assignedTechnicianId || null,
        location,
        notes,
      },
      include: { party: true, machineItem: true },
    });

    return res.status(201).json({ machine });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
