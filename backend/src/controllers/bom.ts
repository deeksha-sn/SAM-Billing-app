import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';

export async function getBOMs(req: AuthRequest, res: Response) {
  try {
    const boms = await prisma.bOMHeader.findMany({
      include: {
        finishedItem: true,
        components: {
          include: {
            componentItem: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ boms });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getBOMByFinishedItem(req: AuthRequest, res: Response) {
  try {
    const { finishedItemId } = req.params;
    const bom = await prisma.bOMHeader.findUnique({
      where: { finishedItemId },
      include: {
        finishedItem: true,
        components: {
          include: {
            componentItem: true,
          },
        },
      },
    });
    return res.json({ bom });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function saveBOM(req: AuthRequest, res: Response) {
  try {
    const { finishedItemId, name, notes, components } = req.body;
    // components: [{ componentItemId: string, quantity: number }]

    if (!finishedItemId || !components || !Array.isArray(components) || components.length === 0) {
      return res.status(400).json({ error: 'Finished Item ID and components array are required' });
    }

    const finishedItem = await prisma.item.findUnique({ where: { id: finishedItemId } });
    if (!finishedItem) {
      return res.status(404).json({ error: 'Finished machine item not found' });
    }

    // Upsert BOMHeader inside transaction
    const result = await prisma.$transaction(async (tx) => {
      let bom = await tx.bOMHeader.findUnique({ where: { finishedItemId } });

      if (bom) {
        // Delete existing items
        await tx.bOMItem.deleteMany({ where: { bomHeaderId: bom.id } });
        bom = await tx.bOMHeader.update({
          where: { id: bom.id },
          data: {
            name: name || `${finishedItem.name} BOM`,
            notes,
          },
        });
      } else {
        bom = await tx.bOMHeader.create({
          data: {
            finishedItemId,
            name: name || `${finishedItem.name} BOM`,
            notes,
          },
        });
      }

      // Create new component items
      const bomItemsData = components.map((c: any) => ({
        bomHeaderId: bom!.id,
        componentItemId: c.componentItemId,
        quantity: Number(c.quantity),
      }));

      await tx.bOMItem.createMany({
        data: bomItemsData,
      });

      return tx.bOMHeader.findUnique({
        where: { id: bom.id },
        include: {
          finishedItem: true,
          components: {
            include: { componentItem: true },
          },
        },
      });
    });

    return res.json({ bom: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
