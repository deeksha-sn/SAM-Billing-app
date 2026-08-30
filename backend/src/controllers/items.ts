import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';

export async function getItems(req: AuthRequest, res: Response) {
  try {
    const { type, search, categoryId } = req.query;
    const where: any = {};

    if (type) where.type = type as string;
    if (categoryId) where.categoryId = categoryId as string;

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q } },
        { sku: { contains: q } },
        { hsnSac: { contains: q } },
        { description: { contains: q } },
      ];
    }

    const items = await prisma.item.findMany({
      where,
      include: {
        category: true,
        defaultTermsTemplate: true,
        bomHeader: { include: { components: true } },
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ items });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getItemById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        category: true,
        defaultTermsTemplate: true,
        bomHeader: { include: { components: { include: { componentItem: true } } } },
        stockMovements: { take: 20, orderBy: { date: 'desc' }, include: { party: true } },
      },
    });

    if (!item) return res.status(404).json({ error: 'Item not found' });
    return res.json({ item });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createItem(req: AuthRequest, res: Response) {
  try {
    const {
      name,
      sku,
      type,
      categoryId,
      unit,
      hsnSac,
      gstRate,
      purchasePrice,
      sellingPrice,
      wholesalePrice,
      minStock,
      openingStock,
      description,
      defaultTermsTemplateId,
    } = req.body;

    if (!name || !sku) {
      return res.status(400).json({ error: 'Item Name and SKU are required' });
    }

    const existing = await prisma.item.findUnique({ where: { sku: sku.trim() } });
    if (existing) {
      return res.status(400).json({ error: `Item SKU "${sku}" already exists!` });
    }

    const initialStock = Number(openingStock) || 0;

    const item = await prisma.item.create({
      data: {
        name,
        sku: sku.trim(),
        type: type || 'FINISHED_MACHINE',
        categoryId: categoryId || null,
        unit: unit || 'Nos',
        hsnSac: hsnSac || '8436',
        gstRate: Number(gstRate) || 18.0,
        purchasePrice: Number(purchasePrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        wholesalePrice: Number(wholesalePrice) || 0,
        minStock: Number(minStock) || 5,
        currentStock: initialStock,
        description,
        defaultTermsTemplateId: defaultTermsTemplateId || null,
      },
    });

    if (initialStock > 0) {
      await prisma.stockMovement.create({
        data: {
          itemId: item.id,
          movementType: 'OPENING',
          quantity: initialStock,
          previousStock: 0,
          newStock: initialStock,
          notes: 'Opening Stock Initialization',
        },
      });
    }

    return res.status(201).json({ item });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateItem(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const data = req.body;

    if (data.gstRate !== undefined) data.gstRate = Number(data.gstRate);
    if (data.purchasePrice !== undefined) data.purchasePrice = Number(data.purchasePrice);
    if (data.sellingPrice !== undefined) data.sellingPrice = Number(data.sellingPrice);
    if (data.wholesalePrice !== undefined) data.wholesalePrice = Number(data.wholesalePrice);
    if (data.minStock !== undefined) data.minStock = Number(data.minStock);

    delete data.currentStock; // Prevent direct stock edit without adjustment record

    const item = await prisma.item.update({
      where: { id },
      data,
    });

    return res.json({ item });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function adjustStock(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { adjustmentType, quantity, reason, notes } = req.body;
    // adjustmentType: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE'
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      return res.status(400).json({ error: 'Valid positive quantity required for stock adjustment' });
    }

    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const prevStock = item.currentStock;
    let newStock = prevStock;

    if (adjustmentType === 'ADJUSTMENT_IN') {
      newStock = prevStock + qty;
    } else {
      newStock = prevStock - qty;
    }

    await prisma.$transaction([
      prisma.item.update({
        where: { id },
        data: { currentStock: newStock },
      }),
      prisma.stockMovement.create({
        data: {
          itemId: id,
          movementType: adjustmentType,
          quantity: qty,
          previousStock: prevStock,
          newStock: newStock,
          userId: req.user?.id,
          notes: `${reason || 'Stock Adjustment'}: ${notes || ''}`,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'STOCK_ADJUST',
          entityType: 'ITEM',
          entityId: id,
          reference: item.name,
          oldValues: JSON.stringify({ currentStock: prevStock }),
          newValues: JSON.stringify({ currentStock: newStock, adjustmentType, quantity: qty }),
        },
      }),
    ]);

    return res.json({ message: 'Stock adjusted successfully', previousStock: prevStock, newStock });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// Categories & Units
export async function getCategories(req: AuthRequest, res: Response) {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    return res.json({ categories });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createCategory(req: AuthRequest, res: Response) {
  try {
    const { name, description } = req.body;
    const category = await prisma.category.create({ data: { name, description } });
    return res.status(201).json({ category });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getUnits(req: AuthRequest, res: Response) {
  try {
    const units = await prisma.unit.findMany({ orderBy: { name: 'asc' } });
    return res.json({ units });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createUnit(req: AuthRequest, res: Response) {
  try {
    const { name, symbol } = req.body;
    const unit = await prisma.unit.create({ data: { name, symbol } });
    return res.status(201).json({ unit });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
