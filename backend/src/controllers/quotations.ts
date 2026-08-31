import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';
import { generateDocumentNumber } from '../utils/numbering';
import { calculateGST, isInterStateTransaction } from '../utils/gst';
import { applyInvoiceStockDeduction } from './sales';

export async function getQuotations(req: AuthRequest, res: Response) {
  try {
    const quotations = await prisma.quotation.findMany({
      include: {
        party: true,
        items: {
          include: {
            item: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ quotations });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getQuotationById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        party: true,
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
    return res.json({ quotation });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createQuotation(req: AuthRequest, res: Response) {
  try {
    const {
      partyId,
      quotationDate,
      validityDate,
      items,
      notes,
      termsTemplateId,
      termsSnapshot,
      status,
    } = req.body;

    if (!partyId) {
      return res.status(400).json({ error: 'Customer is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    const party = await prisma.party.findUnique({ where: { id: partyId } });
    if (!party) return res.status(404).json({ error: 'Customer not found' });

    const company = await prisma.companyProfile.findUnique({ where: { id: 'default' } });
    const companyStateCode = company?.stateCode || '29';
    const isInterState = isInterStateTransaction(companyStateCode, party.stateCode);

    let rawTotalTaxable = 0;
    let rawTotalCgst = 0;
    let rawTotalSgst = 0;
    let rawTotalIgst = 0;
    let rawGrandTotal = 0;

    const processedItems = items.map((line: any) => {
      const qty = Number(line.quantity) || 1;
      const rate = Number(line.rate) || 0;
      const discountPercent = Number(line.discountPercent) || 0;
      const gstRate = Number(line.gstRate) || 18;

      const calc = calculateGST(qty, rate, discountPercent, gstRate, isInterState);

      rawTotalTaxable += calc.taxableValue;
      rawTotalCgst += calc.cgstAmount;
      rawTotalSgst += calc.sgstAmount;
      rawTotalIgst += calc.igstAmount;
      rawGrandTotal += calc.totalAmount;

      return {
        itemId: line.itemId,
        itemName: line.itemName || 'Item',
        hsnSac: line.hsnSac || '8436',
        unit: line.unit || 'Nos',
        quantity: qty,
        rate: rate,
        discountPercent: discountPercent,
        discountAmount: Number(((qty * rate * discountPercent) / 100).toFixed(2)),
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
    const totalTaxable = Number(rawTotalTaxable.toFixed(2));
    const totalCgst = Number(rawTotalCgst.toFixed(2));
    const totalSgst = Number(rawTotalSgst.toFixed(2));
    const totalIgst = Number(rawTotalIgst.toFixed(2));

    const formattedTermsSnapshot = termsSnapshot !== undefined
      ? (Array.isArray(termsSnapshot)
          ? JSON.stringify(termsSnapshot.filter((t: any) => typeof t === 'string' && t.trim().length > 0))
          : typeof termsSnapshot === 'string'
          ? termsSnapshot
          : null)
      : null;

    const qDate = quotationDate ? new Date(quotationDate) : new Date();
    let vDate: Date | null = null;
    if (validityDate) {
      vDate = new Date(validityDate);
    } else {
      vDate = new Date(qDate);
      vDate.setDate(vDate.getDate() + 30); // 30 days validity default
    }

    const quotation = await prisma.$transaction(async (tx) => {
      const { docNumber, fy } = await generateDocumentNumber('QUOTATION', qDate, tx);

      const created = await tx.quotation.create({
        data: {
          quotationNumber: docNumber,
          financialYear: fy,
          quotationDate: qDate,
          validityDate: vDate,
          partyId: party.id,
          customerStateCode: party.stateCode,
          isInterState: isInterState,
          taxableAmount: totalTaxable,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: totalIgst,
          roundOff: roundOff,
          grandTotal: grandTotal,
          notes: notes || null,
          status: status || 'ACTIVE',
          items: {
            create: processedItems,
          },
        },
        include: {
          party: true,
          items: true,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'QUOTATION_CREATE',
          entityType: 'QUOTATION',
          entityId: created.id,
          reference: docNumber,
          newValues: JSON.stringify({ grandTotal, status: created.status }),
        },
      });

      return created;
    });

    return res.status(201).json({ quotation });
  } catch (err: any) {
    console.error('Create Quotation Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function updateQuotation(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      quotationNumber,
      partyId,
      quotationDate,
      validityDate,
      items,
      notes,
      status,
    } = req.body;

    const existing = await prisma.quotation.findUnique({ where: { id }, include: { items: true } });
    if (!existing) return res.status(404).json({ error: 'Quotation not found' });

    const result = await prisma.$transaction(async (tx) => {
      let finalQuoNo = existing.quotationNumber;
      if (quotationNumber && quotationNumber.trim() !== existing.quotationNumber) {
        if (req.user?.role !== 'ADMIN') {
          throw new Error('Only ADMIN users can edit quotation numbers');
        }
        const candidateNo = quotationNumber.trim();
        const dup = await tx.quotation.findFirst({
          where: { quotationNumber: candidateNo, NOT: { id: existing.id } },
        });
        if (dup) {
          throw new Error(`Quotation number "${candidateNo}" already exists.`);
        }
        finalQuoNo = candidateNo;
      }

      const targetPartyId = partyId || existing.partyId;
      const party = await tx.party.findUnique({ where: { id: targetPartyId } });
      if (!party) throw new Error('Customer not found');

      const company = await tx.companyProfile.findUnique({ where: { id: 'default' } });
      const companyStateCode = company?.stateCode || '29';
      const isInterState = isInterStateTransaction(companyStateCode, party.stateCode);

      let totalTaxable = existing.taxableAmount;
      let totalCgst = existing.cgstAmount;
      let totalSgst = existing.sgstAmount;
      let totalIgst = existing.igstAmount;
      let grandTotal = existing.grandTotal;
      let roundOff = existing.roundOff;

      let processedItems: any[] | null = null;

      if (items && Array.isArray(items) && items.length > 0) {
        let rawTotalTaxable = 0;
        let rawTotalCgst = 0;
        let rawTotalSgst = 0;
        let rawTotalIgst = 0;
        let rawGrandTotal = 0;

        processedItems = items.map((line: any) => {
          const qty = Number(line.quantity) || 1;
          const rate = Number(line.rate) || 0;
          const discountPercent = Number(line.discountPercent) || 0;
          const gstRate = Number(line.gstRate) || 18;

          const calc = calculateGST(qty, rate, discountPercent, gstRate, isInterState);

          rawTotalTaxable += calc.taxableValue;
          rawTotalCgst += calc.cgstAmount;
          rawTotalSgst += calc.sgstAmount;
          rawTotalIgst += calc.igstAmount;
          rawGrandTotal += calc.totalAmount;

          return {
            itemId: line.itemId,
            itemName: line.itemName || 'Item',
            hsnSac: line.hsnSac || '8436',
            unit: line.unit || 'Nos',
            quantity: qty,
            rate: rate,
            discountPercent: discountPercent,
            discountAmount: Number(((qty * rate * discountPercent) / 100).toFixed(2)),
            taxableValue: calc.taxableValue,
            gstRate: gstRate,
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
      }

      if (processedItems) {
        await tx.quotationItem.deleteMany({ where: { quotationId: id } });
      }

      const updated = await tx.quotation.update({
        where: { id },
        data: {
          quotationNumber: finalQuoNo,
          partyId: targetPartyId,
          quotationDate: quotationDate ? new Date(quotationDate) : existing.quotationDate,
          validityDate: validityDate ? new Date(validityDate) : existing.validityDate,
          customerStateCode: party.stateCode,
          isInterState: isInterState,
          taxableAmount: totalTaxable,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: totalIgst,
          roundOff: roundOff,
          grandTotal: grandTotal,
          notes: notes !== undefined ? notes : existing.notes,
          status: status || existing.status,
          items: processedItems
            ? {
                create: processedItems,
              }
            : undefined,
        },
        include: { party: true, items: true },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'QUOTATION_EDIT',
          entityType: 'QUOTATION',
          entityId: id,
          reference: updated.quotationNumber,
        },
      });

      return updated;
    });

    return res.json({ quotation: result });
  } catch (err: any) {
    console.error('Update Quotation Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteQuotation(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const quotation = await prisma.quotation.findUnique({ where: { id } });

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({ where: { quotationId: id } });
      await tx.quotation.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'QUOTATION_DELETE',
          entityType: 'QUOTATION',
          entityId: id,
          reference: quotation.quotationNumber,
        },
      });
    });

    return res.json({ message: `Quotation ${quotation.quotationNumber} deleted permanently.` });
  } catch (err: any) {
    console.error('Delete Quotation Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function convertQuotationToInvoice(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { invoiceStatus } = req.body; // DRAFT or CONFIRMED

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { party: true, items: { include: { item: true } } },
    });

    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });

    const targetStatus = invoiceStatus || 'CONFIRMED';

    const invoice = await prisma.$transaction(async (tx) => {
      // 1. Generate a NEW Sales Invoice Number (Independent sequence, e.g. SAM-26-27-0005)
      const { docNumber, fy } = await generateDocumentNumber('INVOICE', new Date(), tx);

      // 2. Create the Sales Invoice
      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNumber: docNumber,
          financialYear: fy,
          invoiceDate: new Date(),
          partyId: quotation.partyId,
          billingAddress: quotation.party.address || quotation.party.village || '',
          deliveryAddress: quotation.party.address || quotation.party.village || '',
          customerStateCode: quotation.customerStateCode,
          isInterState: quotation.isInterState,
          taxableAmount: quotation.taxableAmount,
          cgstAmount: quotation.cgstAmount,
          sgstAmount: quotation.sgstAmount,
          igstAmount: quotation.igstAmount,
          roundOff: quotation.roundOff,
          grandTotal: quotation.grandTotal,
          amountPaid: 0,
          balanceDue: quotation.grandTotal,
          paymentMode: 'Credit',
          status: targetStatus,
          notes: `Converted from Quotation ${quotation.quotationNumber}`,
          createdById: req.user?.id,
          items: {
            create: quotation.items.map((qItem) => ({
              itemId: qItem.itemId,
              itemName: qItem.itemName,
              hsnSac: qItem.hsnSac,
              unit: qItem.unit,
              quantity: qItem.quantity,
              rate: qItem.rate,
              discountPercent: qItem.discountPercent,
              discountAmount: qItem.discountAmount,
              taxableValue: qItem.taxableValue,
              gstRate: qItem.gstRate,
              cgstAmount: qItem.cgstAmount,
              sgstAmount: qItem.sgstAmount,
              igstAmount: qItem.igstAmount,
              totalAmount: qItem.totalAmount,
            })),
          },
        },
      });

      // 3. Mark Quotation status as CONVERTED
      await tx.quotation.update({
        where: { id },
        data: { status: 'CONVERTED' },
      });

      // 4. Apply BOM stock deduction ONLY if invoice status is CONFIRMED
      if (targetStatus !== 'DRAFT' && targetStatus !== 'CANCELLED') {
        await applyInvoiceStockDeduction(tx, createdInvoice.id, docNumber, quotation.partyId, req.user?.id);
      }

      // 5. Audit Log
      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'QUOTATION_CONVERT',
          entityType: 'QUOTATION',
          entityId: id,
          reference: `Quotation ${quotation.quotationNumber} -> Invoice ${docNumber}`,
        },
      });

      return createdInvoice;
    });

    return res.json({
      message: `Quotation ${quotation.quotationNumber} converted to Sales Invoice ${invoice.invoiceNumber} successfully!`,
      invoice,
    });
  } catch (err: any) {
    console.error('Convert Quotation Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
