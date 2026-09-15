import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';
import { generateDocumentNumber } from '../utils/numbering';
import { addIntervalToDate, processDailyServiceReminders } from '../services/reminderScheduler';
import { getWhatsAppSettings, sendWhatsAppCloudMessage } from '../services/whatsappService';

export async function getServices(req: AuthRequest, res: Response) {
  try {
    const { filter, technicianId, date, search } = req.query;
    const where: any = {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Apply Filter Tab Logic
    if (filter === 'today') {
      where.serviceDueDate = { gte: today, lt: tomorrow };
      where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
    } else if (filter === 'tomorrow') {
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);
      where.serviceDueDate = { gte: tomorrow, lt: dayAfter };
      where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
    } else if (filter === 'this_week') {
      where.serviceDueDate = { gte: today, lt: nextWeek };
      where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
    } else if (filter === 'overdue') {
      where.serviceDueDate = { lt: today };
      where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
    } else if (filter === 'upcoming') {
      where.serviceDueDate = { gte: tomorrow };
      where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
    } else if (filter === 'completed') {
      where.status = 'COMPLETED';
    } else if (filter === 'unassigned') {
      where.assignedTechnicianId = null;
      where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
    } else if (filter === 'assigned') {
      where.assignedTechnicianId = { not: null };
      where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
    } else if (filter === 'reminder_due') {
      where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
    } else if (filter === 'nearby_services') {
      where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
      where.serviceDueDate = { gte: today, lt: nextWeek };
    }

    // Specific Date filter (e.g. from Service Calendar click)
    if (date) {
      const dStart = new Date(String(date));
      dStart.setHours(0, 0, 0, 0);
      const dEnd = new Date(dStart);
      dEnd.setDate(dEnd.getDate() + 1);
      where.serviceDueDate = { gte: dStart, lt: dEnd };
    }

    // Technician filter
    if (technicianId) {
      where.assignedTechnicianId = String(technicianId);
    }

    // Search query
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { serviceNo: { contains: q } },
        { serialNumber: { contains: q } },
        { party: { name: { contains: q } } },
        { party: { mobile: { contains: q } } },
        { farmer: { name: { contains: q } } },
        { farmer: { mobile: { contains: q } } },
        { farmer: { village: { contains: q } } },
        { farmer: { district: { contains: q } } },
        { machine: { model: { contains: q } } },
      ];
    }

    let services = await prisma.serviceTask.findMany({
      where,
      include: {
        party: true,
        farmer: true,
        machine: {
          include: { machineItem: true },
        },
        assignedTechnician: true,
        parts: {
          include: { item: true },
        },
      },
      orderBy: { serviceDueDate: 'asc' },
    });

    if (filter === 'reminder_due') {
      services = services.filter((s) => {
        const dueDate = new Date(s.serviceDueDate);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        return diffDays <= 0 || [20, 10, 7, 3].includes(diffDays);
      });
    }

    return res.json({ services });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getTodayServicesSummary(req: AuthRequest, res: Response) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const servicesToday = await prisma.serviceTask.count({
      where: {
        serviceDueDate: { gte: today, lt: tomorrow },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    });

    const overdueServices = await prisma.serviceTask.count({
      where: {
        serviceDueDate: { lt: today },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    });

    const upcomingServices = await prisma.serviceTask.count({
      where: {
        serviceDueDate: { gte: tomorrow },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    });

    const assigned = await prisma.serviceTask.count({
      where: {
        serviceDueDate: { gte: today, lt: tomorrow },
        assignedTechnicianId: { not: null },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    });

    const unassigned = await prisma.serviceTask.count({
      where: {
        serviceDueDate: { gte: today, lt: tomorrow },
        assignedTechnicianId: null,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    });

    const completedToday = await prisma.serviceTask.count({
      where: {
        completedAt: { gte: today, lt: tomorrow },
        status: 'COMPLETED',
      },
    });

    return res.json({
      summary: {
        servicesToday,
        overdueServices,
        upcomingServices,
        assigned,
        unassigned,
        completedToday,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createServiceTask(req: AuthRequest, res: Response) {
  try {
    const { machineId, serviceDueDate, assignedTechnicianId, serviceType, notes } = req.body;

    if (!machineId || !serviceDueDate) {
      return res.status(400).json({ error: 'Machine and Service Due Date are required' });
    }

    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      include: { party: true },
    });

    if (!machine) return res.status(404).json({ error: 'Machine record not found' });

    const sDate = serviceDueDate ? new Date(serviceDueDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const { docNumber } = await generateDocumentNumber('SERVICE', sDate, tx);

      const task = await tx.serviceTask.create({
        data: {
          serviceNo: docNumber,
          machineId: machine.id,
          partyId: machine.partyId,
          farmerId: machine.farmerId || null,
          serialNumber: machine.serialNumber,
          serviceDueDate: new Date(serviceDueDate),
          serviceIntervalDays: machine.serviceIntervalDays,
          serviceType: serviceType || 'ROUTINE',
          assignedTechnicianId: assignedTechnicianId || machine.assignedTechnicianId || null,
          status: assignedTechnicianId ? 'ASSIGNED' : 'SCHEDULED',
          technicianNotes: notes,
        },
        include: { party: true, farmer: true, machine: true, assignedTechnician: true },
      });

      return task;
    });

    return res.status(201).json({ service: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function assignTechnician(req: AuthRequest, res: Response) {
  try {
    const { serviceIds, technicianId } = req.body;

    if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0 || !technicianId) {
      return res.status(400).json({ error: 'serviceIds (array) and technicianId are required' });
    }

    const technician = await prisma.user.findUnique({ where: { id: technicianId } });
    if (!technician) return res.status(404).json({ error: 'Technician user not found' });

    await prisma.serviceTask.updateMany({
      where: { id: { in: serviceIds } },
      data: {
        assignedTechnicianId: technicianId,
        status: 'ASSIGNED',
      },
    });

    return res.json({ message: `Successfully assigned ${serviceIds.length} service job(s) to ${technician.name}.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getRecommendedTechnicians(req: AuthRequest, res: Response) {
  try {
    const { serviceId, pincode, taluk, district, date } = req.query;

    let targetPincode = String(pincode || '').trim();
    let targetTaluk = String(taluk || '').trim();
    let targetDistrict = String(district || '').trim();
    let targetDate = date ? new Date(String(date)) : new Date();

    if (serviceId) {
      const task = await prisma.serviceTask.findUnique({
        where: { id: String(serviceId) },
        include: { party: true, farmer: true },
      });
      if (task) {
        targetPincode = task.farmer?.pincode || task.party.pincode || targetPincode;
        targetTaluk = task.farmer?.taluk || task.party.taluk || targetTaluk;
        targetDistrict = task.farmer?.district || task.party.district || targetDistrict;
        targetDate = new Date(task.serviceDueDate);
      }
    }

    targetDate.setHours(0, 0, 0, 0);
    const dateEnd = new Date(targetDate);
    dateEnd.setDate(dateEnd.getDate() + 1);

    // Fetch active technicians
    const technicians = await prisma.user.findMany({
      where: {
        role: { in: ['SERVICE_TECHNICIAN', 'SERVICE_MANAGER', 'ADMIN'] },
        active: true,
      },
      select: {
        id: true,
        name: true,
        username: true,
        mobile: true,
        role: true,
        address: true,
        state: true,
        district: true,
        taluk: true,
        pincode: true,
        serviceAreaPincodes: true,
      },
    });

    // Calculate workload count for each technician on target date
    const workloadCounts: Record<string, number> = {};
    for (const tech of technicians) {
      const count = await prisma.serviceTask.count({
        where: {
          assignedTechnicianId: tech.id,
          serviceDueDate: { gte: targetDate, lt: dateEnd },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      });
      workloadCounts[tech.id] = count;
    }

    const ranked = technicians.map((tech) => {
      const techPin = (tech.pincode || '').trim();
      const techTaluk = (tech.taluk || '').trim().toLowerCase();
      const techDistrict = (tech.district || '').trim().toLowerCase();
      const serviceAreaList = (tech.serviceAreaPincodes || '')
        .split(/[\s,]+/)
        .map((p) => p.trim())
        .filter(Boolean);

      let matchRank = 5;
      let matchCategory = 'OTHER';
      let matchLabel = 'AVAILABLE TECHNICIAN';

      const sPin = targetPincode.trim();
      const sTaluk = targetTaluk.toLowerCase();
      const sDistrict = targetDistrict.toLowerCase();

      if (sPin && techPin === sPin) {
        matchRank = 1;
        matchCategory = 'SAME_PIN';
        matchLabel = 'RECOMMENDED - SAME PIN CODE';
      } else if (sTaluk && techTaluk && techTaluk === sTaluk) {
        matchRank = 2;
        matchCategory = 'SAME_TALUK';
        matchLabel = 'SAME TALUK';
      } else if (sPin && serviceAreaList.includes(sPin)) {
        matchRank = 3;
        matchCategory = 'SURROUNDING_PIN';
        matchLabel = 'SURROUNDING PIN CODE';
      } else if (sDistrict && techDistrict && techDistrict === sDistrict) {
        matchRank = 4;
        matchCategory = 'SAME_DISTRICT';
        matchLabel = 'SAME DISTRICT';
      }

      return {
        ...tech,
        matchRank,
        matchCategory,
        matchLabel,
        workloadCount: workloadCounts[tech.id] || 0,
      };
    });

    // Sort by matchRank ascending (1 is best), then workloadCount ascending (fewer jobs is better)
    ranked.sort((a, b) => {
      if (a.matchRank !== b.matchRank) return a.matchRank - b.matchRank;
      return a.workloadCount - b.workloadCount;
    });

    const resultList = ranked.map((t, index) => ({
      ...t,
      isTopRecommendation: index === 0,
    }));

    return res.json({
      targetLocation: { pincode: targetPincode, taluk: targetTaluk, district: targetDistrict, date: targetDate },
      recommendedTechnician: resultList[0] || null,
      technicians: resultList,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getRoutePlanningGroups(req: AuthRequest, res: Response) {
  try {
    const { technicianId, weekDate } = req.query;

    const baseDate = weekDate ? new Date(String(weekDate)) : new Date();
    baseDate.setHours(0, 0, 0, 0);

    const dayOfWeek = baseDate.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7; // Monday = 0
    const weekStart = new Date(baseDate);
    weekStart.setDate(weekStart.getDate() - distanceToMonday);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const where: any = {
      serviceDueDate: { gte: weekStart, lt: weekEnd },
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    };

    if (technicianId) {
      where.assignedTechnicianId = String(technicianId);
    }

    const services = await prisma.serviceTask.findMany({
      where,
      include: { party: true, farmer: true, machine: true, assignedTechnician: true },
      orderBy: { serviceDueDate: 'asc' },
    });

    const groupsMap: Record<string, { pincode: string; taluk: string; services: any[] }> = {};

    services.forEach((s) => {
      const pin = s.farmer?.pincode || s.party.pincode || 'Other PIN';
      const taluk = s.farmer?.taluk || s.party.taluk || 'Other Taluk';
      const key = `${pin}__${taluk}`;

      if (!groupsMap[key]) {
        groupsMap[key] = { pincode: pin, taluk: taluk, services: [] };
      }
      groupsMap[key].services.push(s);
    });

    const groups = Object.values(groupsMap).sort((a, b) => b.services.length - a.services.length);
    const totalServices = services.length;
    const groupableRoutes = groups.filter((g) => g.services.length >= 2).length;

    return res.json({
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      totalServices,
      groupableRoutes,
      summaryMessage: `${totalServices} service(s) grouped into ${groups.length} location cluster(s).`,
      groups,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getReminderSummary(req: AuthRequest, res: Response) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeServices = await prisma.serviceTask.findMany({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      include: { party: true, farmer: true, machine: true, assignedTechnician: true },
      orderBy: { serviceDueDate: 'asc' },
    });

    const days20: any[] = [];
    const days10: any[] = [];
    const days7: any[] = [];
    const days3: any[] = [];
    const todayReminders: any[] = [];
    const overdueReminders: any[] = [];

    activeServices.forEach((s) => {
      const dueDate = new Date(s.serviceDueDate);
      dueDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

      const item = {
        ...s,
        diffDays,
        formattedDueDate: dueDate.toLocaleDateString('en-IN'),
        customerName: s.party.name,
        farmerName: s.farmer?.name || s.party.name,
        phone: s.farmer?.mobile || s.party.mobile,
        pincode: s.farmer?.pincode || s.party.pincode,
        fullAddress: s.farmer
          ? [s.farmer.address, s.farmer.village, s.farmer.taluk, s.farmer.district].filter(Boolean).join(', ')
          : [s.party.address, s.party.village, s.party.taluk, s.party.district].filter(Boolean).join(', '),
      };

      if (diffDays === 20) days20.push(item);
      else if (diffDays === 10) days10.push(item);
      else if (diffDays === 7) days7.push(item);
      else if (diffDays === 3) days3.push(item);
      else if (diffDays === 0) todayReminders.push(item);
      else if (diffDays < 0) overdueReminders.push(item);
    });

    const logs = await prisma.serviceReminderLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: { party: true, farmer: true, machine: true, serviceTask: true },
    });

    return res.json({
      counts: {
        days20: days20.length,
        days10: days10.length,
        days7: days7.length,
        days3: days3.length,
        today: todayReminders.length,
        overdue: overdueReminders.length,
        totalDue: days20.length + days10.length + days7.length + days3.length + todayReminders.length + overdueReminders.length,
      },
      stages: {
        days20,
        days10,
        days7,
        days3,
        todayReminders,
        overdueReminders,
      },
      recentLogs: logs,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function rescheduleServiceTask(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { newServiceDueDate, reason } = req.body;

    if (!newServiceDueDate) {
      return res.status(400).json({ error: 'New service due date is required' });
    }

    const task = await prisma.serviceTask.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: 'Service task not found' });

    const newDate = new Date(newServiceDueDate);

    const updated = await prisma.serviceTask.update({
      where: { id },
      data: {
        serviceDueDate: newDate,
        status: 'RESCHEDULED',
        technicianNotes: reason ? `Rescheduled: ${reason}` : task.technicianNotes,
      },
      include: { party: true, farmer: true, machine: true, assignedTechnician: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'SERVICE_RESCHEDULE',
        entityType: 'SERVICE',
        entityId: id,
        reference: task.serviceNo,
        oldValues: JSON.stringify({ serviceDueDate: task.serviceDueDate }),
        newValues: JSON.stringify({ serviceDueDate: newDate, reason }),
      },
    });

    return res.json({
      message: `Service ${task.serviceNo} rescheduled to ${newDate.toLocaleDateString('en-IN')}. Reminder schedule recalculated.`,
      service: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function processRemindersEndpoint(req: AuthRequest, res: Response) {
  try {
    const result = await processDailyServiceReminders();
    return res.json({
      message: `Service reminder engine processed ${result.processed} tasks. ${result.sent} reminders sent/generated, ${result.skipped} skipped/duplicates prevented.`,
      result,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateServiceStatus(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status, workPerformed, technicianNotes, customerFeedback, latitude, longitude } = req.body;

    const task = await prisma.serviceTask.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: 'Service task not found' });

    const updated = await prisma.serviceTask.update({
      where: { id },
      data: {
        status: status || task.status,
        workPerformed: workPerformed !== undefined ? workPerformed : task.workPerformed,
        technicianNotes: technicianNotes !== undefined ? technicianNotes : task.technicianNotes,
        customerFeedback: customerFeedback !== undefined ? customerFeedback : task.customerFeedback,
        latitude: latitude !== undefined ? Number(latitude) : task.latitude,
        longitude: longitude !== undefined ? Number(longitude) : task.longitude,
      },
      include: { party: true, farmer: true, machine: true, assignedTechnician: true },
    });

    return res.json({ service: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function completeServiceTask(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      workPerformed,
      technicianNotes,
      customerFeedback,
      serviceCharge,
      parts,
    } = req.body;

    const task = await prisma.serviceTask.findUnique({
      where: { id },
      include: { machine: true, party: true, farmer: true },
    });

    if (!task) return res.status(404).json({ error: 'Service task not found' });

    const result = await prisma.$transaction(async (tx) => {
      let partsTotal = 0;
      const processedParts: any[] = [];

      if (parts && Array.isArray(parts) && parts.length > 0) {
        for (const p of parts) {
          const itemMaster = await tx.item.findUnique({ where: { id: p.itemId } });
          if (!itemMaster) continue;

          const qty = Number(p.quantity) || 1;
          const rate = p.rate !== undefined ? Number(p.rate) : itemMaster.sellingPrice;
          const amount = qty * rate;

          partsTotal += amount;

          processedParts.push({
            itemId: itemMaster.id,
            quantity: qty,
            rate: rate,
            amount: amount,
          });

          // STEP 1: Inventory Deduction for parts used in service
          const prevStock = itemMaster.currentStock;
          const newStock = prevStock - qty;

          await tx.item.update({
            where: { id: itemMaster.id },
            data: { currentStock: newStock },
          });

          await tx.stockMovement.create({
            data: {
              itemId: itemMaster.id,
              movementType: 'SERVICE_CONSUMPTION',
              quantity: -qty,
              previousStock: prevStock,
              newStock: newStock,
              referenceType: 'SERVICE',
              referenceId: task.serviceNo,
              partyId: task.partyId,
              userId: req.user?.id,
              notes: `Parts used for Service ${task.serviceNo} (${task.serialNumber})`,
            },
          });
        }
      }

      const charge = Number(serviceCharge) || 0;
      const grandTotal = Math.round(charge + partsTotal);
      const completedDate = new Date();

      await tx.servicePart.deleteMany({ where: { serviceTaskId: id } });

      const completedTask = await tx.serviceTask.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: completedDate,
          workPerformed: workPerformed || 'Routine Service Completed',
          technicianNotes: technicianNotes,
          customerFeedback: customerFeedback,
          serviceCharge: charge,
          partsTotal: partsTotal,
          grandTotal: grandTotal,
          parts: processedParts.length > 0 ? { create: processedParts } : undefined,
        },
        include: { party: true, farmer: true, machine: true, parts: { include: { item: true } }, assignedTechnician: true },
      });

      // STEP 2: Calculate Next Service Date based on Machine Calendar Interval
      const machine = task.machine;
      const intervalVal = machine.serviceIntervalValue || 3;
      const intervalUnit = machine.serviceIntervalUnit || 'MONTHS';

      const nextDate = addIntervalToDate(completedDate, intervalVal, intervalUnit);

      await tx.machine.update({
        where: { id: machine.id },
        data: {
          lastServiceDate: completedDate,
          nextServiceDate: nextDate,
        },
      });

      // STEP 3: Automatically create next Service Task
      const { docNumber: nextSrvNo } = await generateDocumentNumber('SERVICE', nextDate, tx);

      await tx.serviceTask.create({
        data: {
          serviceNo: nextSrvNo,
          machineId: machine.id,
          partyId: machine.partyId,
          farmerId: machine.farmerId || null,
          serialNumber: machine.serialNumber,
          serviceDueDate: nextDate,
          serviceIntervalDays: machine.serviceIntervalDays,
          serviceType: 'ROUTINE',
          assignedTechnicianId: machine.assignedTechnicianId || null,
          status: 'SCHEDULED',
          technicianNotes: `Auto-scheduled following completion of Service ${task.serviceNo}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'SERVICE_COMPLETE',
          entityType: 'SERVICE',
          entityId: id,
          reference: task.serviceNo,
          newValues: JSON.stringify({ grandTotal, nextServiceDate: nextDate }),
        },
      });

      return completedTask;
    });

    return res.json({
      message: `Service ${task.serviceNo} completed successfully! Parts deducted from stock and next service scheduled for ${result.machine.nextServiceDate?.toLocaleDateString('en-IN')}.`,
      service: result,
    });
  } catch (err: any) {
    console.error('Complete Service Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function sendTechnicianDispatchWhatsApp(req: AuthRequest, res: Response) {
  try {
    const { technicianId, date } = req.body;

    if (!technicianId) {
      return res.status(400).json({ error: 'Technician ID is required' });
    }

    const technician = await prisma.user.findUnique({ where: { id: technicianId } });
    if (!technician) return res.status(404).json({ error: 'Technician not found' });

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const jobs = await prisma.serviceTask.findMany({
      where: {
        assignedTechnicianId: technicianId,
        serviceDueDate: { gte: targetDate, lt: nextDay },
        status: { notIn: ['CANCELLED'] },
      },
      include: { party: true, farmer: true, machine: true },
      orderBy: { serviceDueDate: 'asc' },
    });

    if (jobs.length === 0) {
      return res.status(400).json({ error: `No assigned jobs found for ${technician.name} on ${targetDate.toLocaleDateString('en-IN')}` });
    }

    let message = `*TODAY'S SERVICE JOBS*\n*Smart Agro Machinerys*\n\n📅 Date: ${targetDate.toLocaleDateString('en-IN')}\n👨‍🔧 Technician: ${technician.name}\n\n`;

    jobs.forEach((job, idx) => {
      const p = job.party;
      const f = job.farmer;
      const name = f ? `${f.name} (Org: ${p.name})` : p.name;
      const phone = f?.mobile || p.mobile;
      const addr = f
        ? [f.address, f.village, f.district, f.state].filter(Boolean).join(', ')
        : [p.address, p.village, p.district, p.state].filter(Boolean).join(', ');

      message += `${idx + 1}. *${name}*\n   📱 Phone: ${phone}\n   📍 Location: ${addr}\n   🚜 Machine: ${job.machine?.model || 'Equipment'}\n   🔢 Serial: ${job.serialNumber}\n   📌 Status: ${job.status}\n\n`;
    });

    message += `Total Jobs: ${jobs.length}\n\nPlease update job status upon completion.`;

    const config = await getWhatsAppSettings();
    let sendResult: any = { success: false };

    if (config.enabled && technician.mobile) {
      sendResult = await sendWhatsAppCloudMessage({
        to: technician.mobile,
        text: message,
      });
    }

    await prisma.serviceReminderLog.create({
      data: {
        partyId: jobs[0].partyId,
        recipientPhone: technician.mobile || '',
        recipientName: technician.name,
        scheduledDate: targetDate,
        reminderType: 'TECHNICIAN_DISPATCH_LIST',
        status: sendResult.success ? 'SENT' : 'MANUAL_GENERATED',
        whatsappMessageId: sendResult.messageId,
        messageText: message,
      },
    });

    return res.json({
      success: true,
      messageText: message,
      whatsappSuccess: sendResult.success,
      recipientMobile: technician.mobile,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function remindAllTodayCustomers(req: AuthRequest, res: Response) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dueTasks = await prisma.serviceTask.findMany({
      where: {
        serviceDueDate: { gte: today, lt: tomorrow },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      include: { party: true, farmer: true, machine: true },
    });

    const config = await getWhatsAppSettings();
    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const task of dueTasks) {
      const p = task.party;
      if (!p.whatsappServiceReminders) {
        skippedCount++;
        continue;
      }

      const alreadySent = await prisma.serviceReminderLog.findFirst({
        where: {
          serviceTaskId: task.id,
          createdAt: { gte: today },
        },
      });

      if (alreadySent && alreadySent.status === 'SENT') {
        skippedCount++;
        continue;
      }

      const msg = `Dear ${p.name},\n\nThis is a service reminder from Smart Agro Machinerys.\n\nMachine: ${task.machine?.model || 'Equipment'}\nSerial No: ${task.serialNumber}\nService Due Date: ${today.toLocaleDateString('en-IN')}\n\nYour machine service is due TODAY.\n\nPlease contact us to schedule your service.\n\nSmart Agro Machinerys\nPhone: ${config.businessPhone}\nThank you!`;

      if (config.enabled && config.phoneNumberId) {
        const res = await sendWhatsAppCloudMessage({ to: p.mobile, text: msg });
        if (res.success) {
          sentCount++;
          await prisma.serviceReminderLog.create({
            data: {
              serviceTaskId: task.id,
              partyId: p.id,
              machineId: task.machineId,
              reminderType: 'SERVICE_DUE_TODAY_BULK',
              recipientPhone: p.mobile,
              recipientName: p.name,
              scheduledDate: task.serviceDueDate,
              sentAt: new Date(),
              status: 'SENT',
              whatsappMessageId: res.messageId,
              messageText: msg,
            },
          });
        } else {
          failedCount++;
          await prisma.serviceReminderLog.create({
            data: {
              serviceTaskId: task.id,
              partyId: p.id,
              machineId: task.machineId,
              reminderType: 'SERVICE_DUE_TODAY_BULK',
              recipientPhone: p.mobile,
              recipientName: p.name,
              scheduledDate: task.serviceDueDate,
              status: 'FAILED',
              failureReason: res.error,
              messageText: msg,
            },
          });
        }
      } else {
        sentCount++;
        await prisma.serviceReminderLog.create({
          data: {
            serviceTaskId: task.id,
            partyId: p.id,
            machineId: task.machineId,
            reminderType: 'SERVICE_DUE_TODAY_BULK_MANUAL',
            recipientPhone: p.mobile,
            recipientName: p.name,
            scheduledDate: task.serviceDueDate,
            sentAt: new Date(),
            status: 'SENT',
            messageText: msg,
          },
        });
      }
    }

    return res.json({
      message: `Bulk reminder process completed. Sent: ${sentCount}, Failed: ${failedCount}, Skipped: ${skippedCount}.`,
      stats: { total: dueTasks.length, sentCount, failedCount, skippedCount },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getReminderLogs(req: AuthRequest, res: Response) {
  try {
    const logs = await prisma.serviceReminderLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: { party: true, farmer: true, machine: true, serviceTask: true },
    });

    return res.json({ logs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function sendPaymentReminderWhatsApp(req: AuthRequest, res: Response) {
  try {
    const { invoiceId } = req.body;
    if (!invoiceId) return res.status(400).json({ error: 'Invoice ID is required' });

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { party: true },
    });

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const p = invoice.party;

    if (!p.whatsappPaymentReminders) {
      return res.status(400).json({ error: `Customer "${p.name}" has opted out of payment reminders.` });
    }

    const config = await getWhatsAppSettings();
    const dueDateStr = new Date(invoice.invoiceDate).toLocaleDateString('en-IN');

    const msg = `Dear ${p.name},\n\nPayment Reminder from Smart Agro Machinerys.\n\nInvoice No: ${invoice.invoiceNumber}\nInvoice Total: ₹${invoice.grandTotal.toLocaleString('en-IN')}\nPaid: ₹${invoice.amountPaid.toLocaleString('en-IN')}\nBalance Due: ₹${invoice.balanceDue.toLocaleString('en-IN')}\nInvoice Date: ${dueDateStr}\n\nKindly arrange to clear the outstanding balance of ₹${invoice.balanceDue.toLocaleString('en-IN')}.\n\nSmart Agro Machinerys\nPhone: ${config.businessPhone}\nThank you!`;

    let result: any = { success: false };
    if (config.enabled) {
      result = await sendWhatsAppCloudMessage({ to: p.mobile, text: msg });
    }

    await prisma.serviceReminderLog.create({
      data: {
        invoiceId: invoice.id,
        partyId: p.id,
        reminderType: 'PAYMENT_REMINDER',
        recipientPhone: p.mobile,
        recipientName: p.name,
        scheduledDate: invoice.invoiceDate,
        sentAt: new Date(),
        status: result.success ? 'SENT' : 'MANUAL_GENERATED',
        whatsappMessageId: result.messageId,
        messageText: msg,
      },
    });

    return res.json({
      success: true,
      messageText: msg,
      whatsappSuccess: result.success,
      recipientMobile: p.mobile,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getTechnicianTodayJobs(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextDay = new Date(today);
    nextDay.setDate(nextDay.getDate() + 1);

    const jobs = await prisma.serviceTask.findMany({
      where: {
        assignedTechnicianId: userId,
        serviceDueDate: { gte: today, lt: nextDay },
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        party: true,
        farmer: true,
        machine: { include: { machineItem: true } },
      },
      orderBy: { serviceDueDate: 'asc' },
    });

    return res.json({ jobs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
