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
      include: { party: true, items: { include: { item: true } }, invoice: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ challans });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createDeliveryChallan(req: AuthRequest, res: Response) {
  try {
    const {
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

    const result = await prisma.$transaction(async (tx) => {
      const { docNumber, fy } = await generateDocumentNumber('DELIVERY_CHALLAN', 'DC', tx);

      const challan = await tx.deliveryChallan.create({
        data: {
          challanNumber: docNumber,
          financialYear: fy,
          challanDate: challanDate ? new Date(challanDate) : new Date(),
          partyId: party.id,
          deliveryAddress: deliveryAddress || party.address || '',
          contactNumber: contactNumber || party.mobile,
          vehicleNumber,
          transporter,
          reason: reason || 'Delivery against sale',
          refOrderNo,
          affectsStock: affectsStock,
          stockDeducted: affectsStock,
          status: 'CONFIRMED',
          notes,
          items: {
            create: items.map((i: any) => ({
              itemId: i.itemId,
              itemName: i.itemName || 'Item',
              unit: i.unit || 'Nos',
              quantity: Number(i.quantity) || 1,
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
