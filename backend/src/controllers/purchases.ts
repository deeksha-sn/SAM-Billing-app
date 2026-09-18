import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';
import { generateDocumentNumber } from '../utils/numbering';
import { calculateItemGst, isInterStateTransaction } from '../utils/gstHelper';
import { resolveTemplateSnapshot } from './templates';
import { ensurePartyExists } from '../utils/partyHelper';

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

export async function getPurchaseById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const purchase = await prisma.purchaseInvoice.findUnique({
      where: { id },
      include: { party: true, items: { include: { item: true } } },
    });

    if (!purchase) return res.status(404).json({ error: 'Purchase record not found' });
    return res.json({ purchase });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createPurchase(req: AuthRequest, res: Response) {
  try {
    const {
      partyId,
      newPartyData,
      supplierInvoiceNo,
      purchaseDate,
      items,
      paymentMode,
      paymentTerms,
      dueDate,
      amountPaid,
      notes,
      ewayBillNo,
      poNumber,
      poDate,
      transportName,
      deliveryLocation,
      roundOffEnabled,
      billTemplateId,
      fieldsConfigSnapshot,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Purchase line items are required' });
    }

    const resolvedPartyId = await ensurePartyExists(prisma, partyId, newPartyData || req.body, 'SUPPLIER');
    const templateInfo = await resolveTemplateSnapshot('PURCHASE', billTemplateId, fieldsConfigSnapshot);

    const supplier = await prisma.party.findUnique({ where: { id: resolvedPartyId } });
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

    const company = await prisma.companyProfile.findUnique({ where: { id: 'default' } });
    const companyStateCode = company?.stateCode || company?.state || '29';
    const isInterState = isInterStateTransaction(supplier.stateCode || supplier.state, supplier.state, companyStateCode);

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let rawGrandTotal = 0;

    const processedItems = items.map((line: any) => {
      const qty = Math.max(0, Number(line.quantity) || 1);
      const freeQty = Math.max(0, Number(line.freeQuantity) || 0);
      const rate = Math.max(0, Number(line.rate) || 0);
      const discountPercent = Math.max(0, Number(line.discountPercent) || 0);
      const discountAmount = Math.max(0, Number(line.discountAmount) || 0);
      const isExempt = line.isExempt || line.gstRate === 'EXEMPT';
      const gstRateVal = isExempt ? 0 : Number(line.gstRate) || 0;

      const calc = calculateItemGst({
        quantity: qty,
        freeQuantity: freeQty,
        rate: rate,
        discountPercent: discountPercent,
        discountAmount: discountAmount,
        gstRate: gstRateVal,
        isExempt: isExempt,
        isInterState: isInterState,
      });

      totalTaxable += calc.taxableValue;
      totalCgst += calc.cgstAmount;
      totalSgst += calc.sgstAmount;
      totalIgst += calc.igstAmount;
      rawGrandTotal += calc.totalAmount;

      return {
        itemId: line.itemId,
        itemName: line.itemName || 'Item',
        description: line.description || null,
        hsnSac: line.hsnSac || '8436',
        unit: line.unit || 'Nos',
        quantity: qty,
        freeQuantity: freeQty,
        rate: rate,
        discountPercent: discountPercent,
        discountAmount: calc.taxableValue < (qty * rate) ? (qty * rate - calc.taxableValue) : 0,
        taxableValue: calc.taxableValue,
        gstRate: gstRateVal,
        isExempt: calc.isExempt,
        cgstAmount: calc.cgstAmount,
        sgstAmount: calc.sgstAmount,
        igstAmount: calc.igstAmount,
        totalAmount: calc.totalAmount,
      };
    });

    const isRoundOffOn = roundOffEnabled !== false;
    const grandTotal = isRoundOffOn ? Math.round(rawGrandTotal) : Number(rawGrandTotal.toFixed(2));
    const roundOff = isRoundOffOn ? Number((grandTotal - rawGrandTotal).toFixed(2)) : 0;
    const initialPaid = Number(amountPaid) || 0;
    const balanceDue = Math.max(0, grandTotal - initialPaid);

    let purchaseStatus = 'CONFIRMED';
    if (initialPaid >= grandTotal) purchaseStatus = 'PAID';
    else if (initialPaid > 0) purchaseStatus = 'PARTIALLY_PAID';
    else purchaseStatus = 'UNPAID';

    const purDate = purchaseDate ? new Date(purchaseDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const { docNumber, fy } = await generateDocumentNumber('PURCHASE', purDate, tx);

      const purchase = await tx.purchaseInvoice.create({
        data: {
          purchaseNumber: docNumber,
          supplierInvoiceNo: supplierInvoiceNo ? String(supplierInvoiceNo).trim() : null,
          financialYear: fy,
          purchaseDate: purDate,
          partyId: supplier.id,
          deliveryLocation: deliveryLocation || null,
          supplierStateCode: supplier.stateCode || '29',
          isInterState: isInterState,
          ewayBillNo: ewayBillNo ? String(ewayBillNo).trim() : null,
          poNumber: poNumber ? String(poNumber).trim() : null,
          poDate: poDate ? new Date(poDate) : null,
          transportName: transportName ? String(transportName).trim() : null,
          taxableAmount: totalTaxable,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: totalIgst,
          roundOffEnabled: isRoundOffOn,
          roundOff: roundOff,
          grandTotal: grandTotal,
          amountPaid: initialPaid,
          balanceDue: balanceDue,
          paymentMode: paymentMode || 'Credit',
          paymentTerms: paymentTerms || null,
          dueDate: dueDate ? new Date(dueDate) : null,
          status: purchaseStatus,
          notes: notes || null,
          billTemplateId: templateInfo.billTemplateId,
          fieldsConfigSnapshot: templateInfo.fieldsConfigSnapshot,
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

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'PURCHASE_CREATE',
          entityType: 'PURCHASE',
          entityId: purchase.id,
          reference: docNumber,
          newValues: JSON.stringify({ grandTotal, status: purchaseStatus }),
        },
      });

      return purchase;
    });

    return res.status(201).json({ purchase: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updatePurchase(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      purchaseNumber,
      supplierInvoiceNo,
      partyId,
      purchaseDate,
      items,
      amountPaid,
      notes,
      billTemplateId,
      fieldsConfigSnapshot,
    } = req.body;

    const existing = await prisma.purchaseInvoice.findUnique({
      where: { id },
      include: { items: true, party: true },
    });

    if (!existing) return res.status(404).json({ error: 'Purchase record not found' });

    const result = await prisma.$transaction(async (tx) => {
      let finalPurNo = existing.purchaseNumber;
      if (purchaseNumber && purchaseNumber.trim() !== existing.purchaseNumber) {
        if (req.user?.role !== 'ADMIN') {
          throw new Error('Only ADMIN users can edit purchase numbers');
        }
        const candidateNo = purchaseNumber.trim();
        const dup = await tx.purchaseInvoice.findFirst({
          where: { purchaseNumber: candidateNo, NOT: { id: existing.id } },
        });
        if (dup) {
          throw new Error(`Purchase number "${candidateNo}" already exists.`);
        }
        finalPurNo = candidateNo;
      }

      const resolvedPartyId = await ensurePartyExists(tx, partyId || existing.partyId, req.body.newPartyData, 'SUPPLIER');
      const supplier = await tx.party.findUnique({ where: { id: resolvedPartyId } });
      if (!supplier) throw new Error('Supplier not found');

      const company = await tx.companyProfile.findUnique({ where: { id: 'default' } });
      const companyStateCode = company?.stateCode || company?.state || '29';
      const isInterState = isInterStateTransaction(supplier.stateCode || supplier.state, supplier.state, companyStateCode);

      // STEP 1: Reverse OLD purchase stock addition (decrement stock)
      for (const oldLine of existing.items) {
        const itemMaster = await tx.item.findUnique({ where: { id: oldLine.itemId } });
        if (!itemMaster) continue;

        const prevStock = itemMaster.currentStock;
        const newStock = prevStock - oldLine.quantity;

        await tx.item.update({
          where: { id: oldLine.itemId },
          data: { currentStock: newStock },
        });

        await tx.stockMovement.create({
          data: {
            itemId: oldLine.itemId,
            movementType: 'PURCHASE_REVERSAL',
            quantity: -oldLine.quantity,
            previousStock: prevStock,
            newStock: newStock,
            referenceType: 'PURCHASE_EDIT',
            referenceId: existing.purchaseNumber,
            partyId: supplier.id,
            userId: req.user?.id,
            notes: `Purchase edit reversal for ${existing.purchaseNumber}`,
          },
        });
      }

      // STEP 2: Process new line items & totals
      let totalTaxable = existing.taxableAmount;
      let totalCgst = existing.cgstAmount;
      let totalSgst = existing.sgstAmount;
      let totalIgst = existing.igstAmount;
      let grandTotal = existing.grandTotal;
      let roundOff = existing.roundOff;
      let balanceDue = existing.balanceDue;

      let processedItems: any[] | null = null;

      if (items && Array.isArray(items) && items.length > 0) {
        let rawTotalTaxable = 0;
        let rawTotalCgst = 0;
        let rawTotalSgst = 0;
        let rawTotalIgst = 0;
        let rawGrandTotal = 0;

        processedItems = items.map((line: any) => {
          const qty = Math.max(0, Number(line.quantity) || 1);
          const freeQty = Math.max(0, Number(line.freeQuantity) || 0);
          const rate = Math.max(0, Number(line.rate) || 0);
          const discountPercent = Math.max(0, Number(line.discountPercent) || 0);
          const discountAmount = Math.max(0, Number(line.discountAmount) || 0);
          const isExempt = line.isExempt || line.gstRate === 'EXEMPT';
          const gstRateVal = isExempt ? 0 : Number(line.gstRate) || 0;

          const calc = calculateItemGst({
            quantity: qty,
            freeQuantity: freeQty,
            rate: rate,
            discountPercent: discountPercent,
            discountAmount: discountAmount,
            gstRate: gstRateVal,
            isExempt: isExempt,
            isInterState: isInterState,
          });

          rawTotalTaxable += calc.taxableValue;
          rawTotalCgst += calc.cgstAmount;
          rawTotalSgst += calc.sgstAmount;
          rawTotalIgst += calc.igstAmount;
          rawGrandTotal += calc.totalAmount;

          return {
            itemId: line.itemId,
            itemName: line.itemName || 'Item',
            description: line.description || null,
            hsnSac: line.hsnSac || '8436',
            unit: line.unit || 'Nos',
            quantity: qty,
            freeQuantity: freeQty,
            rate: rate,
            discountPercent: discountPercent,
            discountAmount: calc.taxableValue < (qty * rate) ? (qty * rate - calc.taxableValue) : 0,
            taxableValue: calc.taxableValue,
            gstRate: gstRateVal,
            isExempt: calc.isExempt,
            cgstAmount: calc.cgstAmount,
            sgstAmount: calc.sgstAmount,
            igstAmount: calc.igstAmount,
            totalAmount: calc.totalAmount,
          };
        });

        grandTotal = Math.round(rawGrandTotal);
        roundOff = Number((grandTotal - rawGrandTotal).toFixed(2));
        totalTaxable = Number(rawTotalTaxable.toFixed(2));
        totalCgst = Number(rawTotalCgst.toFixed(2));
        totalSgst = Number(rawTotalSgst.toFixed(2));
        totalIgst = Number(rawTotalIgst.toFixed(2));
        const paidVal = amountPaid !== undefined ? Number(amountPaid) : existing.amountPaid;
        balanceDue = grandTotal - paidVal;
      }

      // Delete old purchase items
      if (processedItems) {
        await tx.purchaseItem.deleteMany({ where: { purchaseInvoiceId: id } });
      }

      const updated = await tx.purchaseInvoice.update({
        where: { id },
        data: {
          purchaseNumber: finalPurNo,
          supplierInvoiceNo: supplierInvoiceNo !== undefined ? supplierInvoiceNo : existing.supplierInvoiceNo,
          partyId: resolvedPartyId,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : existing.purchaseDate,
          supplierStateCode: supplier.stateCode,
          isInterState: isInterState,
          taxableAmount: totalTaxable,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: totalIgst,
          roundOff: roundOff,
          grandTotal: grandTotal,
          amountPaid: amountPaid !== undefined ? Number(amountPaid) : existing.amountPaid,
          balanceDue: balanceDue,
          notes: notes !== undefined ? notes : existing.notes,
          billTemplateId: billTemplateId !== undefined || fieldsConfigSnapshot !== undefined
            ? (await resolveTemplateSnapshot('PURCHASE', billTemplateId, fieldsConfigSnapshot)).billTemplateId
            : existing.billTemplateId,
          fieldsConfigSnapshot: billTemplateId !== undefined || fieldsConfigSnapshot !== undefined
            ? (await resolveTemplateSnapshot('PURCHASE', billTemplateId, fieldsConfigSnapshot)).fieldsConfigSnapshot
            : existing.fieldsConfigSnapshot,
          items: processedItems
            ? {
                create: processedItems,
              }
            : undefined,
        },
        include: { party: true, items: { include: { item: true } } },
      });

      // STEP 3: Apply NEW purchase stock addition (increment stock)
      if (processedItems) {
        for (const line of processedItems) {
          const itemMaster = await tx.item.findUnique({ where: { id: line.itemId } });
          if (!itemMaster) continue;

          const prevStock = itemMaster.currentStock;
          const newStock = prevStock + line.quantity;

          await tx.item.update({
            where: { id: line.itemId },
            data: {
              currentStock: newStock,
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
              referenceId: updated.purchaseNumber,
              partyId: supplier.id,
              userId: req.user?.id,
              notes: `Purchase Edit addition for ${updated.purchaseNumber}`,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'PURCHASE_EDIT',
          entityType: 'PURCHASE',
          entityId: id,
          reference: updated.purchaseNumber,
        },
      });

      return updated;
    });

    return res.json({ purchase: result });
  } catch (err: any) {
    console.error('Update Purchase Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function deletePurchase(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const purchase = await prisma.purchaseInvoice.findUnique({
      where: { id },
      include: { items: true, party: true },
    });

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase record not found' });
    }

    if (purchase.status !== 'DRAFT' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only ADMIN users can permanently delete confirmed purchase records' });
    }

    await prisma.$transaction(async (tx) => {
      // STEP 1: Reverse stock addition (decrement item stock)
      for (const line of purchase.items) {
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
            movementType: 'PURCHASE_DELETION',
            quantity: -line.quantity,
            previousStock: prevStock,
            newStock: newStock,
            referenceType: 'PURCHASE_DELETE',
            referenceId: purchase.purchaseNumber,
            partyId: purchase.partyId,
            userId: req.user?.id,
            notes: `Purchase Delete stock reversal for ${purchase.purchaseNumber}`,
          },
        });
      }

      // STEP 2: Safely unlink payment allocations
      const payments = await tx.payment.findMany({
        where: { allocations: { contains: id } },
      });

      for (const p of payments) {
        if (p.allocations) {
          try {
            const parsed = JSON.parse(p.allocations);
            if (Array.isArray(parsed)) {
              const updatedAlloc = parsed.filter((a: any) => a.purchaseId !== id);
              await tx.payment.update({
                where: { id: p.id },
                data: {
                  allocations: JSON.stringify(updatedAlloc),
                },
              });
            }
          } catch (e) {
            // ignore JSON parse
          }
        }
      }

      // STEP 3: Delete purchase items & purchase record
      await tx.purchaseItem.deleteMany({ where: { purchaseInvoiceId: id } });
      await tx.purchaseInvoice.delete({ where: { id } });

      // STEP 4: Audit Log
      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'PURCHASE_DELETE',
          entityType: 'PURCHASE',
          entityId: id,
          reference: purchase.purchaseNumber,
        },
      });
    });

    return res.json({ message: `Purchase ${purchase.purchaseNumber} deleted permanently and stock reversed.` });
  } catch (err: any) {
    console.error('Delete Purchase Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
