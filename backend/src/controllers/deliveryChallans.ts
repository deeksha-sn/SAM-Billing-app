import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';
import { generateDocumentNumber } from '../utils/numbering';

export async function getDeliveryChallans(req: AuthRequest, res: Response) {
  try {
    const { partyId, status } = req.query;
    const where: any = {};
    if (partyId) where.partyId = partyId as string;
    if (status) where.status = status as string;

    const challans = await prisma.deliveryChallan.findMany({
      where,
      include: { party: true, farmer: true, items: { include: { item: true } }, invoice: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ challans });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getDeliveryChallanById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const challan = await prisma.deliveryChallan.findUnique({
      where: { id },
      include: { party: true, farmer: true, items: { include: { item: true } }, invoice: true },
    });

    if (!challan) return res.status(404).json({ error: 'Delivery Challan not found' });
    return res.json({ challan });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createDeliveryChallan(req: AuthRequest, res: Response) {
  try {
    const {
      partyId,
      farmerId,
      challanDate,
      deliveryAddress,
      deliveryLocation,
      contactNumber,
      vehicleNumber,
      transporter,
      transportName,
      reason,
      refOrderNo,
      poNumber,
      poDate,
      items,
      notes,
    } = req.body;

    if (!partyId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Customer and items are required for Delivery Challan' });
    }

    const party = await prisma.party.findUnique({ where: { id: partyId } });
    if (!party) return res.status(404).json({ error: 'Customer not found' });

    // Check system setting for stock impact
    const setting = await prisma.systemSettings.findUnique({
      where: { key: 'delivery_challan_affects_stock' },
    });
    const affectsStock = setting ? setting.value === 'YES' : true;
    const cDate = challanDate ? new Date(challanDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const { docNumber, fy } = await generateDocumentNumber('DELIVERY_CHALLAN', cDate, tx);

      const challan = await tx.deliveryChallan.create({
        data: {
          challanNumber: docNumber,
          financialYear: fy,
          challanDate: cDate,
          partyId: party.id,
          farmerId: farmerId || null,
          deliveryAddress: deliveryAddress || party.address || '',
          deliveryLocation: deliveryLocation || null,
          contactNumber: contactNumber || party.mobile,
          vehicleNumber: vehicleNumber || null,
          transporter: transporter || transportName || null,
          transportName: transportName || transporter || null,
          reason: reason || 'Delivery against sale',
          refOrderNo: refOrderNo || null,
          poNumber: poNumber || null,
          poDate: poDate ? new Date(poDate) : null,
          affectsStock: affectsStock,
          stockDeducted: affectsStock,
          status: 'CONFIRMED',
          notes: notes || null,
          items: {
            create: items.map((i: any) => ({
              itemId: i.itemId,
              itemName: i.itemName || 'Item',
              description: i.description || null,
              unit: i.unit || 'Nos',
              quantity: Number(i.quantity) || 1,
              freeQuantity: Number(i.freeQuantity) || 0,
            })),
          },
        },
        include: { items: true },
      });

      // Deduct stock if affectsStock setting is ON
      if (affectsStock) {
        for (const line of challan.items) {
          const itemMaster = await tx.item.findUnique({ where: { id: line.itemId } });
          if (!itemMaster) continue;

          const prevStock = itemMaster.currentStock;
          const newStock = prevStock - line.quantity;

          await tx.item.update({
            where: { id: line.itemId },
            data: { currentStock: newStock },
          });

          await tx.stockMovement.create({
            data: {
              itemId: line.itemId,
              movementType: 'MANUAL_ISSUE',
              quantity: line.quantity,
              previousStock: prevStock,
              newStock: newStock,
              referenceType: 'DELIVERY_CHALLAN',
              referenceId: docNumber,
              partyId: party.id,
              userId: req.user?.id,
              notes: `Delivery Challan ${docNumber} stock deduction`,
            },
          });
        }
      }

      return challan;
    });

    return res.status(201).json({ challan: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateDeliveryChallan(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      challanNumber,
      partyId,
      challanDate,
      deliveryAddress,
      contactNumber,
      vehicleNumber,
      transporter,
      reason,
      refOrderNo,
      items,
      notes,
    } = req.body;

    const existing = await prisma.deliveryChallan.findUnique({
      where: { id },
      include: { items: true, party: true },
    });

    if (!existing) return res.status(404).json({ error: 'Delivery Challan not found' });

    const result = await prisma.$transaction(async (tx) => {
      let finalDcNo = existing.challanNumber;
      if (challanNumber && challanNumber.trim() !== existing.challanNumber) {
        if (req.user?.role !== 'ADMIN') {
          throw new Error('Only ADMIN users can edit Delivery Challan numbers');
        }
        const candidateNo = challanNumber.trim();
        const dup = await tx.deliveryChallan.findFirst({
          where: { challanNumber: candidateNo, NOT: { id: existing.id } },
        });
        if (dup) {
          throw new Error(`Delivery Challan number "${candidateNo}" already exists.`);
        }
        finalDcNo = candidateNo;
      }

      const targetPartyId = partyId || existing.partyId;
      const party = await tx.party.findUnique({ where: { id: targetPartyId } });
      if (!party) throw new Error('Customer not found');

      // STEP 1: Reverse OLD stock deduction if DC affected stock previously
      if (existing.affectsStock && existing.stockDeducted) {
        for (const oldLine of existing.items) {
          const itemMaster = await tx.item.findUnique({ where: { id: oldLine.itemId } });
          if (!itemMaster) continue;

          const prevStock = itemMaster.currentStock;
          const newStock = prevStock + oldLine.quantity;

          await tx.item.update({
            where: { id: oldLine.itemId },
            data: { currentStock: newStock },
          });

          await tx.stockMovement.create({
            data: {
              itemId: oldLine.itemId,
              movementType: 'MANUAL_RECEIPT',
              quantity: oldLine.quantity,
              previousStock: prevStock,
              newStock: newStock,
              referenceType: 'DELIVERY_CHALLAN_EDIT',
              referenceId: existing.challanNumber,
              partyId: party.id,
              userId: req.user?.id,
              notes: `DC edit stock reversal for ${existing.challanNumber}`,
            },
          });
        }
      }

      // Re-check system setting for stock impact
      const setting = await tx.systemSettings.findUnique({
        where: { key: 'delivery_challan_affects_stock' },
      });
      const affectsStock = setting ? setting.value === 'YES' : existing.affectsStock;

      let processedItems: any[] | null = null;
      if (items && Array.isArray(items) && items.length > 0) {
        processedItems = items.map((i: any) => ({
          itemId: i.itemId,
          itemName: i.itemName || 'Item',
          unit: i.unit || 'Nos',
          quantity: Number(i.quantity) || 1,
        }));

        await tx.deliveryChallanItem.deleteMany({ where: { deliveryChallanId: id } });
      }

      const updated = await tx.deliveryChallan.update({
        where: { id },
        data: {
          challanNumber: finalDcNo,
          partyId: targetPartyId,
          challanDate: challanDate ? new Date(challanDate) : existing.challanDate,
          deliveryAddress: deliveryAddress || existing.deliveryAddress,
          contactNumber: contactNumber || existing.contactNumber,
          vehicleNumber: vehicleNumber !== undefined ? vehicleNumber : existing.vehicleNumber,
          transporter: transporter !== undefined ? transporter : existing.transporter,
          reason: reason || existing.reason,
          refOrderNo: refOrderNo !== undefined ? refOrderNo : existing.refOrderNo,
          affectsStock: affectsStock,
          stockDeducted: affectsStock,
          notes: notes !== undefined ? notes : existing.notes,
          items: processedItems
            ? {
                create: processedItems,
              }
            : undefined,
        },
        include: { items: true, party: true },
      });

      // STEP 2: Apply NEW stock deduction if affectsStock is true
      if (affectsStock && processedItems) {
        for (const line of processedItems) {
          const itemMaster = await tx.item.findUnique({ where: { id: line.itemId } });
          if (!itemMaster) continue;

          const prevStock = itemMaster.currentStock;
          const newStock = prevStock - line.quantity;

          await tx.item.update({
            where: { id: line.itemId },
            data: { currentStock: newStock },
          });

          await tx.stockMovement.create({
            data: {
              itemId: line.itemId,
              movementType: 'MANUAL_ISSUE',
              quantity: line.quantity,
              previousStock: prevStock,
              newStock: newStock,
              referenceType: 'DELIVERY_CHALLAN',
              referenceId: updated.challanNumber,
              partyId: party.id,
              userId: req.user?.id,
              notes: `DC Edit stock deduction for ${updated.challanNumber}`,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'DELIVERY_CHALLAN_EDIT',
          entityType: 'DELIVERY_CHALLAN',
          entityId: id,
          reference: updated.challanNumber,
        },
      });

      return updated;
    });

    return res.json({ challan: result });
  } catch (err: any) {
    console.error('Update Delivery Challan Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteDeliveryChallan(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const challan = await prisma.deliveryChallan.findUnique({
      where: { id },
      include: { items: true, party: true, invoice: true },
    });

    if (!challan) {
      return res.status(404).json({ error: 'Delivery Challan not found' });
    }

    await prisma.$transaction(async (tx) => {
      // STEP 1: If DC affected stock and deducted stock, reverse stock deduction (increment stock)
      if (challan.affectsStock && challan.stockDeducted) {
        for (const line of challan.items) {
          const itemMaster = await tx.item.findUnique({ where: { id: line.itemId } });
          if (!itemMaster) continue;

          const prevStock = itemMaster.currentStock;
          const newStock = prevStock + line.quantity;

          await tx.item.update({
            where: { id: line.itemId },
            data: { currentStock: newStock },
          });

          await tx.stockMovement.create({
            data: {
              itemId: line.itemId,
              movementType: 'MANUAL_RECEIPT',
              quantity: line.quantity,
              previousStock: prevStock,
              newStock: newStock,
              referenceType: 'DELIVERY_CHALLAN_DELETE',
              referenceId: challan.challanNumber,
              partyId: challan.partyId,
              userId: req.user?.id,
              notes: `DC Delete stock reversal for ${challan.challanNumber}`,
            },
          });
        }
      }

      // STEP 2: Unlink invoice if linked
      if (challan.invoiceId) {
        // Clear invoice relationship without deleting invoice
        await tx.deliveryChallan.update({
          where: { id },
          data: { invoiceId: null },
        });
      }

      // STEP 3: Delete DC items & DC record
      await tx.deliveryChallanItem.deleteMany({ where: { deliveryChallanId: id } });
      await tx.deliveryChallan.delete({ where: { id } });

      // STEP 4: Audit Log
      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'DELIVERY_CHALLAN_DELETE',
          entityType: 'DELIVERY_CHALLAN',
          entityId: id,
          reference: challan.challanNumber,
        },
      });
    });

    return res.json({ message: `Delivery Challan ${challan.challanNumber} deleted permanently.` });
  } catch (err: any) {
    console.error('Delete Delivery Challan Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
