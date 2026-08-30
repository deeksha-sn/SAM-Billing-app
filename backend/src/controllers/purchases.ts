import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';
import { generateDocumentNumber } from '../utils/numbering';
import { calculateGST, isInterStateTransaction } from '../utils/gst';

export async function getPurchases(req: AuthRequest, res: Response) {
  try {
    const { partyId, status, search } = req.query;
    const where: any = {};

    if (partyId) where.partyId = partyId as string;
    if (status) where.status = status as string;
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { purchaseNumber: { contains: q } },
        { supplierInvoiceNo: { contains: q } },
        { party: { name: { contains: q } } },
      ];
    }

    const purchases = await prisma.purchaseInvoice.findMany({
      where,
      include: { party: true, items: { include: { item: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ purchases });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createPurchase(req: AuthRequest, res: Response) {
  try {
    const { partyId, supplierInvoiceNo, purchaseDate, items, paymentMode, amountPaid, notes } = req.body;

    if (!partyId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Supplier and purchase line items are required' });
    }

    const supplier = await prisma.party.findUnique({ where: { id: partyId } });
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    const company = await prisma.companyProfile.findUnique({ where: { id: 'default' } });
    const companyStateCode = company?.stateCode || '29';
    const isInterState = isInterStateTransaction(companyStateCode, supplier.stateCode);

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let rawGrandTotal = 0;

    const processedItems = items.map((line: any) => {
      const qty = Number(line.quantity) || 1;
      const rate = Number(line.rate) || 0;
      const discountPercent = Number(line.discountPercent) || 0;
      const gstRate = Number(line.gstRate) || 18;

      const calc = calculateGST(qty, rate, discountPercent, gstRate, isInterState);

      totalTaxable += calc.taxableValue;
      totalCgst += calc.cgstAmount;
      totalSgst += calc.sgstAmount;
      totalIgst += calc.igstAmount;
      rawGrandTotal += calc.totalAmount;

      return {
        itemId: line.itemId,
        itemName: line.itemName || 'Item',
        hsnSac: line.hsnSac || '8436',
        unit: line.unit || 'Nos',
        quantity: qty,
        rate: rate,
        discountPercent: discountPercent,
        taxableValue: calc.taxableValue,
        gstRate: gstRate,
        cgstAmount: calc.cgstAmount,
        sgstAmount: calc.sgstAmount,
        igstAmount: calc.igstAmount,
        totalAmount: calc.totalAmount,
      };
    });

    const grandTotal = Math.round(rawGrandTotal);
    const roundOff = Number((grandTotal - rawGrandTotal).toFixed(2));
    const initialPaid = Number(amountPaid) || 0;
    const balanceDue = grandTotal - initialPaid;

    let purchaseStatus = 'CONFIRMED';
    if (initialPaid >= grandTotal) purchaseStatus = 'PAID';
    else if (initialPaid > 0) purchaseStatus = 'PARTIALLY_PAID';
    else purchaseStatus = 'UNPAID';

    const result = await prisma.$transaction(async (tx) => {
      const { docNumber, fy } = await generateDocumentNumber('PURCHASE', 'PUR', tx);

      const purchase = await tx.purchaseInvoice.create({
        data: {
          purchaseNumber: docNumber,
          supplierInvoiceNo,
          financialYear: fy,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          partyId: supplier.id,
          supplierStateCode: supplier.stateCode,
          isInterState: isInterState,
          taxableAmount: Number(totalTaxable.toFixed(2)),
          cgstAmount: Number(totalCgst.toFixed(2)),
          sgstAmount: Number(totalSgst.toFixed(2)),
          igstAmount: Number(totalIgst.toFixed(2)),
          roundOff: roundOff,
          grandTotal: grandTotal,
          amountPaid: initialPaid,
          balanceDue: balanceDue,
          status: purchaseStatus,
          notes,
          items: {
            create: processedItems,
          },
        },
      });

      // Increase stock for each purchased item
      for (const line of processedItems) {
        const itemMaster = await tx.item.findUnique({ where: { id: line.itemId } });
        if (!itemMaster) continue;

        const prevStock = itemMaster.currentStock;
        const newStock = prevStock + line.quantity;

        await tx.item.update({
          where: { id: line.itemId },
          data: {
            currentStock: newStock,
            // Optionally update purchase price if newer price provided
            purchasePrice: line.rate > 0 ? line.rate : itemMaster.purchasePrice,
          },
        });

        await tx.stockMovement.create({
          data: {
            itemId: line.itemId,
            movementType: 'PURCHASE',
            quantity: line.quantity,
            previousStock: prevStock,
            newStock: newStock,
            referenceType: 'PURCHASE',
            referenceId: docNumber,
            partyId: supplier.id,
            userId: req.user?.id,
            notes: `Purchase Invoice ${docNumber} (Supplier Inv: ${supplierInvoiceNo || 'N/A'})`,
          },
        });
      }

      // Record payment if initial payment made
      if (initialPaid > 0) {
        const { docNumber: recNumber, fy: recFy } = await generateDocumentNumber('RECEIPT', 'REC', tx);
        await tx.payment.create({
          data: {
            receiptNo: recNumber,
            financialYear: recFy,
            paymentType: 'SUPPLIER_PAYMENT',
            partyId: supplier.id,
            date: purchaseDate ? new Date(purchaseDate) : new Date(),
            amount: initialPaid,
            paymentMode: paymentMode || 'Cash',
            notes: `Supplier Payment for Purchase ${docNumber}`,
            allocations: JSON.stringify([{ purchaseId: purchase.id, amount: initialPaid }]),
          },
        });
      }

      return purchase;
    });

    return res.status(201).json({ purchase: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
