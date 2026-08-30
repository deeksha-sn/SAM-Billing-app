import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';
import { generateDocumentNumber } from '../utils/numbering';

export async function getServices(req: AuthRequest, res: Response) {
  try {
    const { status, technicianId, date, partyId } = req.query;
    const where: any = {};

    if (status) where.status = status as string;
    if (technicianId) where.assignedTechnicianId = technicianId as string;
    if (partyId) where.partyId = partyId as string;

    if (date) {
      const targetDate = new Date(date as string);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      where.serviceDueDate = { gte: startOfDay, lte: endOfDay };
    }

    const services = await prisma.serviceTask.findMany({
      where,
      include: {
        machine: { include: { machineItem: true } },
        party: true,
        assignedTechnician: { select: { id: true, name: true, username: true } },
        parts: { include: { item: true } },
      },
      orderBy: { serviceDueDate: 'asc' },
    });

    return res.json({ services });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createServiceTask(req: AuthRequest, res: Response) {
  try {
    const { machineId, serviceDueDate, assignedTechnicianId, notes } = req.body;

    if (!machineId || !serviceDueDate) {
      return res.status(400).json({ error: 'Machine ID and Service Due Date are required' });
    }

    const machine = await prisma.machine.findUnique({ where: { id: machineId }, include: { party: true } });
    if (!machine) return res.status(404).json({ error: 'Machine not found' });

    const result = await prisma.$transaction(async (tx) => {
      const { docNumber } = await generateDocumentNumber('SERVICE', 'SRV', tx);

      const task = await tx.serviceTask.create({
        data: {
          serviceNo: docNumber,
          machineId: machine.id,
          partyId: machine.partyId,
          serialNumber: machine.serialNumber,
          serviceDueDate: new Date(serviceDueDate),
          serviceIntervalDays: machine.serviceIntervalDays || 90,
          assignedTechnicianId: assignedTechnicianId || machine.assignedTechnicianId || null,
          status: assignedTechnicianId ? 'ASSIGNED' : 'SCHEDULED',
          technicianNotes: notes,
        },
        include: { machine: true, party: true, assignedTechnician: true },
      });

      return task;
    });

    return res.status(201).json({ service: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateServiceStatus(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status, assignedTechnicianId, serviceDueDate } = req.body;

    const data: any = {};
    if (status) data.status = status;
    if (assignedTechnicianId !== undefined) data.assignedTechnicianId = assignedTechnicianId;
    if (serviceDueDate) data.serviceDueDate = new Date(serviceDueDate);

    const service = await prisma.serviceTask.update({
      where: { id },
      data,
      include: { machine: true, party: true, assignedTechnician: true },
    });

    return res.json({ service });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function completeServiceTask(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { workPerformed, technicianNotes, photos, partsUsed, scheduleNextService } = req.body;
    // partsUsed: [{ itemId: string, quantity: number, rate?: number }]

    const task = await prisma.serviceTask.findUnique({
      where: { id },
      include: { machine: true, party: true, parts: true },
    });
    if (!task) return res.status(404).json({ error: 'Service task not found' });

    if (task.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Service task is already completed' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create parts used entries and deduct component/spare part stock
      if (partsUsed && Array.isArray(partsUsed)) {
        for (const p of partsUsed) {
          const qty = Number(p.quantity) || 1;
          const rate = Number(p.rate) || 0;
          const itemMaster = await tx.item.findUnique({ where: { id: p.itemId } });
          if (!itemMaster) continue;

          await tx.servicePart.create({
            data: {
              serviceTaskId: task.id,
              itemId: p.itemId,
              quantity: qty,
              rate: rate || itemMaster.sellingPrice,
              amount: qty * (rate || itemMaster.sellingPrice),
            },
          });

          // Deduct stock for spare part / component used in service
          const prevStock = itemMaster.currentStock;
          const newStock = prevStock - qty;

          await tx.item.update({
            where: { id: p.itemId },
            data: { currentStock: newStock },
          });

          await tx.stockMovement.create({
            data: {
              itemId: p.itemId,
              movementType: 'SERVICE_CONSUMPTION',
              quantity: qty,
              previousStock: prevStock,
              newStock: newStock,
              referenceType: 'SERVICE',
              referenceId: task.serviceNo,
              partyId: task.partyId,
              userId: req.user?.id,
              notes: `Spare part consumed for Service ${task.serviceNo} (Machine S/N: ${task.serialNumber})`,
            },
          });
        }
      }

      // Update Service task to COMPLETED
      const completedTask = await tx.serviceTask.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          workPerformed,
          technicianNotes,
          photos: photos ? JSON.stringify(photos) : task.photos,
          completedAt: new Date(),
        },
        include: { parts: { include: { item: true } } },
      });

      // Optionally auto-schedule next service
      if (scheduleNextService !== false && task.machine) {
        const interval = task.serviceIntervalDays || 90;
        const nextDate = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);

        await tx.machine.update({
          where: { id: task.machineId },
          data: { nextServiceDate: nextDate },
        });

        const { docNumber: nextDoc } = await generateDocumentNumber('SERVICE', 'SRV', tx);
        await tx.serviceTask.create({
          data: {
            serviceNo: nextDoc,
            machineId: task.machineId,
            partyId: task.partyId,
            serialNumber: task.serialNumber,
            serviceDueDate: nextDate,
            serviceIntervalDays: interval,
            assignedTechnicianId: task.assignedTechnicianId,
            status: 'SCHEDULED',
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'SERVICE_COMPLETE',
          entityType: 'SERVICE',
          entityId: task.id,
          reference: task.serviceNo,
        },
      });

      return completedTask;
    });

    return res.json({ service: result, message: 'Service completed successfully and parts stock deducted' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// Technician Mobile View Endpoint
export async function getTechnicianTodayJobs(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const where: any = {
      OR: [
        { assignedTechnicianId: userId },
        { status: { in: ['ASSIGNED', 'IN_PROGRESS', 'SCHEDULED'] } },
      ],
    };

    const jobs = await prisma.serviceTask.findMany({
      where,
      include: {
        machine: { include: { machineItem: true } },
        party: true,
        parts: { include: { item: true } },
      },
      orderBy: { serviceDueDate: 'asc' },
    });

    return res.json({ jobs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
