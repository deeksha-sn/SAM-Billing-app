import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';
import { generateDocumentNumber } from '../utils/numbering';
import { calculateItemGst, isInterStateTransaction } from '../utils/gstHelper';

// Helper function to process BOM & Stock Deduction in a transaction
export async function applyInvoiceStockDeduction(tx: any, invoiceId: string, invoiceNumber: string, partyId: string, userId?: string) {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true },
  });

  if (!invoice) return;

  for (const item of invoice.items) {
    const itemMaster = await tx.item.findUnique({
      where: { id: item.itemId },
      include: {
        bomHeader: {
          include: { components: true },
        },
      },
    });

    if (!itemMaster) continue;

    if (itemMaster.type === 'FINISHED_MACHINE' && itemMaster.bomHeader && itemMaster.bomHeader.active) {
      // Finished machine with active BOM -> Deduct BOM components
      for (const comp of itemMaster.bomHeader.components) {
        const compItem = await tx.item.findUnique({ where: { id: comp.componentItemId } });
        if (!compItem) continue;

        const qtyToDeduct = comp.quantity * item.quantity;
        const prevStock = compItem.currentStock;
        const newStock = prevStock - qtyToDeduct;

        await tx.item.update({
          where: { id: comp.componentItemId },
          data: { currentStock: newStock },
        });

        await tx.stockMovement.create({
          data: {
            itemId: comp.componentItemId,
            movementType: 'BOM_CONSUMPTION',
            quantity: qtyToDeduct,
            previousStock: prevStock,
            newStock: newStock,
            referenceType: 'INVOICE',
            referenceId: invoiceNumber,
            partyId: partyId,
            userId: userId,
            notes: `BOM consumption for ${item.quantity} x ${itemMaster.name} (Invoice ${invoiceNumber})`,
          },
        });
      }
    } else {
      // Standard item without BOM -> Deduct item directly
      const prevStock = itemMaster.currentStock;
      const newStock = prevStock - item.quantity;

      await tx.item.update({
        where: { id: item.itemId },
        data: { currentStock: newStock },
      });

      await tx.stockMovement.create({
        data: {
          itemId: item.itemId,
          movementType: 'SALE',
          quantity: item.quantity,
          previousStock: prevStock,
          newStock: newStock,
          referenceType: 'INVOICE',
          referenceId: invoiceNumber,
          partyId: partyId,
          userId: userId,
          notes: `Direct sale via Invoice ${invoiceNumber}`,
        },
      });
    }
  }
}

// Helper function to reverse stock deduction (for invoice edit or cancel)
async function reverseInvoiceStockDeduction(tx: any, invoiceId: string, invoiceNumber: string, partyId: string, userId?: string) {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: true },
  });

  if (!invoice) return;

  for (const item of invoice.items) {
    const itemMaster = await tx.item.findUnique({
      where: { id: item.itemId },
      include: {
        bomHeader: {
          include: { components: true },
        },
      },
    });

    if (!itemMaster) continue;

    if (itemMaster.type === 'FINISHED_MACHINE' && itemMaster.bomHeader && itemMaster.bomHeader.active) {
      // Reverse BOM components
      for (const comp of itemMaster.bomHeader.components) {
        const compItem = await tx.item.findUnique({ where: { id: comp.componentItemId } });
        if (!compItem) continue;

        const qtyToRestore = comp.quantity * item.quantity;
        const prevStock = compItem.currentStock;
        const newStock = prevStock + qtyToRestore;

        await tx.item.update({
          where: { id: comp.componentItemId },
          data: { currentStock: newStock },
        });

        await tx.stockMovement.create({
          data: {
            itemId: comp.componentItemId,
            movementType: 'SALES_RETURN',
            quantity: qtyToRestore,
            previousStock: prevStock,
            newStock: newStock,
            referenceType: 'INVOICE_REVERSAL',
            referenceId: invoiceNumber,
            partyId: partyId,
            userId: userId,
            notes: `Reversed BOM consumption for ${itemMaster.name} (Invoice ${invoiceNumber})`,
          },
        });
      }
    } else {
      // Reverse direct item stock
      const prevStock = itemMaster.currentStock;
      const newStock = prevStock + item.quantity;

      await tx.item.update({
        where: { id: item.itemId },
        data: { currentStock: newStock },
      });

      await tx.stockMovement.create({
        data: {
          itemId: item.itemId,
          movementType: 'SALES_RETURN',
          quantity: item.quantity,
          previousStock: prevStock,
          newStock: newStock,
          referenceType: 'INVOICE_REVERSAL',
          referenceId: invoiceNumber,
          partyId: partyId,
          userId: userId,
          notes: `Reversed direct sale for Invoice ${invoiceNumber}`,
        },
      });
    }
  }
}

export async function getInvoices(req: AuthRequest, res: Response) {
  try {
    const { partyId, status, search } = req.query;
    const where: any = {};

    if (partyId) where.partyId = partyId as string;
    if (status) where.status = status as string;
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { invoiceNumber: { contains: q } },
        { party: { name: { contains: q } } },
        { party: { mobile: { contains: q } } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: { party: true, farmer: true, items: { include: { item: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ invoices });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getInvoiceById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        party: true,
        farmer: true,
        items: { include: { item: true } },
        createdBy: { select: { name: true, role: true } },
        deliveryChallans: true,
        machines: true,
      },
    });

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    return res.json({ invoice });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createInvoice(req: AuthRequest, res: Response) {
  try {
    const {
      partyId,
      farmerId,
      invoiceDate,
      items,
      paymentMode,
      paymentTerms,
      dueDate,
      amountPaid,
      status,
      notes,
      deliveryChallanId,
      machineSerials,
      ewayBillNo,
      placeOfSupply,
      poNumber,
      poDate,
      transportName,
      deliveryLocation,
      roundOffEnabled,
      termsTemplateId,
      termsSnapshot,
    } = req.body;

    if (!partyId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Customer and invoice line items are required' });
    }

    const party = await prisma.party.findUnique({ where: { id: partyId } });
    if (!party) return res.status(404).json({ error: 'Customer not found' });

    const company = await prisma.companyProfile.findUnique({ where: { id: 'default' } });
    const companyStateCode = company?.stateCode || company?.state || '29';
    const targetStateOrPos = placeOfSupply || party.stateCode || party.state || '29';
    const isInterState = isInterStateTransaction(targetStateOrPos, party.state, companyStateCode);

    // Calculate item tax details
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
        isInclusive: Boolean(line.isInclusive),
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
        isInclusive: calc.isInclusive,
        cgstAmount: calc.cgstAmount,
        sgstAmount: calc.sgstAmount,
        igstAmount: calc.igstAmount,
        totalAmount: calc.totalAmount,
        serialNumber: line.serialNumber || null,
      };
    });

    const isRoundOffOn = roundOffEnabled !== false;
    const grandTotal = isRoundOffOn ? Math.round(rawGrandTotal) : Number(rawGrandTotal.toFixed(2));
    const roundOff = isRoundOffOn ? Number((grandTotal - rawGrandTotal).toFixed(2)) : 0;
    const initialPaid = Number(amountPaid) || 0;
    const balanceDue = Math.max(0, grandTotal - initialPaid);

    let invoiceStatus = status || 'CONFIRMED';
    if (invoiceStatus === 'CONFIRMED') {
      if (initialPaid >= grandTotal) invoiceStatus = 'PAID';
      else if (initialPaid > 0) invoiceStatus = 'PARTIALLY_PAID';
      else invoiceStatus = 'UNPAID';
    }

    const formattedTermsSnapshot = Array.isArray(termsSnapshot)
      ? JSON.stringify(termsSnapshot.filter((t: any) => typeof t === 'string' && t.trim().length > 0))
      : typeof termsSnapshot === 'string'
      ? termsSnapshot
      : null;

    const invDate = invoiceDate ? new Date(invoiceDate) : new Date();

    // Execute atomic transaction for Invoice + Stock Deduction + Ledger with retry loop
    let retries = 3;
    let createdInvoice: any = null;
    let lastErr: any = null;

    while (retries > 0 && !createdInvoice) {
      try {
        createdInvoice = await prisma.$transaction(async (tx) => {
          const { docNumber, fy } = await generateDocumentNumber('INVOICE', invDate, tx);

          const inv = await tx.invoice.create({
            data: {
              invoiceNumber: docNumber,
              financialYear: fy,
              invoiceDate: invDate,
              partyId: party.id,
              farmerId: farmerId || null,
              billingAddress: party.address || party.village || '',
              deliveryAddress: deliveryLocation || party.address || party.village || '',
              deliveryLocation: deliveryLocation || null,
              customerStateCode: party.stateCode || '29',
              isInterState: isInterState,
              ewayBillNo: ewayBillNo ? String(ewayBillNo).trim() : null,
              placeOfSupply: placeOfSupply ? String(placeOfSupply).trim() : `${party.stateCode}-${party.state}`,
              poNumber: poNumber ? String(poNumber).trim() : null,
              poDate: poDate ? new Date(poDate) : null,
              transportName: transportName ? String(transportName).trim() : null,
              termsTemplateId: termsTemplateId || null,
              termsSnapshot: formattedTermsSnapshot,
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
              status: invoiceStatus,
              notes: notes || null,
              createdById: req.user?.id || null,
              items: {
                create: processedItems,
              },
            },
            include: {
              party: true,
              items: { include: { item: true } },
              termsTemplate: true,
            },
          });

          // Handle Delivery Challan conversion link
          if (deliveryChallanId) {
            await tx.deliveryChallan.update({
              where: { id: deliveryChallanId },
              data: { status: 'CONVERTED_TO_INVOICE', invoiceId: inv.id },
            });
          }

          // Check if stock deduction should apply
          if (invoiceStatus !== 'DRAFT' && invoiceStatus !== 'CANCELLED') {
            let skipStockDeduction = false;
            if (deliveryChallanId) {
              const dc = await tx.deliveryChallan.findUnique({ where: { id: deliveryChallanId } });
              if (dc && dc.affectsStock && dc.stockDeducted) {
                skipStockDeduction = true;
              }
            }

            if (!skipStockDeduction) {
              await applyInvoiceStockDeduction(tx, inv.id, docNumber, party.id, req.user?.id);
            }
          }

          // Auto-register Machines with serial numbers if provided
          for (const pItem of processedItems) {
            if (pItem.serialNumber && pItem.serialNumber.trim()) {
              const itemMaster = await tx.item.findUnique({ where: { id: pItem.itemId } });
              if (itemMaster && itemMaster.type === 'FINISHED_MACHINE') {
                const warStart = new Date();
                const warEnd = new Date(warStart);
                warEnd.setFullYear(warEnd.getFullYear() + 1);

                await tx.machine.upsert({
                  where: { serialNumber: pItem.serialNumber.trim() },
                  update: {
                    partyId: party.id,
                    farmerId: farmerId || null,
                    invoiceId: inv.id,
                    saleDate: warStart,
                  },
                  create: {
                    partyId: party.id,
                    farmerId: farmerId || null,
                    machineItemId: pItem.itemId,
                    model: itemMaster.name,
                    serialNumber: pItem.serialNumber.trim(),
                    invoiceId: inv.id,
                    saleDate: warStart,
                    warrantyStart: warStart,
                    warrantyEnd: warEnd,
                    serviceIntervalDays: 90,
                    nextServiceDate: new Date(warStart.getTime() + 90 * 24 * 60 * 60 * 1000),
                    location: `${party.village || ''}, ${party.district || ''}`,
                  },
                });
              }
            }
          }

          // If initial payment made, record payment receipt
          if (initialPaid > 0) {
            const { docNumber: recNumber, fy: recFy } = await generateDocumentNumber('RECEIPT', invDate, tx);
            await tx.payment.create({
              data: {
                receiptNo: recNumber,
                financialYear: recFy,
                paymentType: 'CUSTOMER_PAYMENT',
                partyId: party.id,
                date: invDate,
                amount: initialPaid,
                paymentMode: paymentMode || 'Cash',
                notes: `Payment for Invoice ${docNumber}`,
                allocations: JSON.stringify([{ invoiceId: inv.id, amount: initialPaid }]),
              },
            });
          }

          // Audit Log
          await tx.auditLog.create({
            data: {
              userId: req.user?.id,
              action: 'INVOICE_CREATE',
              entityType: 'INVOICE',
              entityId: inv.id,
              reference: docNumber,
              newValues: JSON.stringify({ grandTotal, status: invoiceStatus }),
            },
          });

          return inv;
        });
      } catch (err: any) {
        lastErr = err;
        retries--;
        console.warn(`Invoice creation attempt failed (retries left: ${retries}):`, err.message || err);
      }
    }

    if (!createdInvoice) {
      return res.status(500).json({ error: lastErr?.message || 'Failed to generate a unique invoice number. Please try again.' });
    }

    return res.status(201).json({ invoice: createdInvoice });
  } catch (err: any) {
    console.error('Invoice Creation Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function updateInvoice(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      partyId,
      invoiceDate,
      invoiceNumber,
      items,
      paymentMode,
      amountPaid,
      status,
      notes,
      ewayBillNo,
      placeOfSupply,
      poNumber,
      poDate,
      termsTemplateId,
      termsSnapshot,
    } = req.body;

    const invoice = await prisma.invoice.findUnique({ where: { id }, include: { party: true, items: true } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const formattedTermsSnapshot = termsSnapshot !== undefined
      ? (Array.isArray(termsSnapshot)
          ? JSON.stringify(termsSnapshot.filter((t: any) => typeof t === 'string' && t.trim().length > 0))
          : typeof termsSnapshot === 'string'
          ? termsSnapshot
          : null)
      : invoice.termsSnapshot;

    const result = await prisma.$transaction(async (tx) => {
      let finalInvoiceNo = invoice.invoiceNumber;
      if (invoiceNumber && invoiceNumber.trim() !== invoice.invoiceNumber) {
        if (req.user?.role !== 'ADMIN') {
          throw new Error('Only ADMIN users can edit invoice numbers');
        }
        const candidateNo = invoiceNumber.trim();
        const existingWithNo = await tx.invoice.findFirst({
          where: { invoiceNumber: candidateNo, NOT: { id: invoice.id } },
        });
        if (existingWithNo) {
          throw new Error(`Invoice number "${candidateNo}" already exists.`);
        }
        finalInvoiceNo = candidateNo;
      }

      let newStatus = status || invoice.status;
      const targetPartyId = partyId || invoice.partyId;
      const targetParty = await tx.party.findUnique({ where: { id: targetPartyId } });
      if (!targetParty) throw new Error('Customer not found');

      const company = await tx.companyProfile.findUnique({ where: { id: 'default' } });
      const companyStateCode = company?.stateCode || company?.state || '29';
      const targetStateOrPos = placeOfSupply || invoice.placeOfSupply || targetParty.stateCode || targetParty.state || '29';
      const isInterState = isInterStateTransaction(targetStateOrPos, targetParty.state, companyStateCode);

      let totalTaxable = invoice.taxableAmount;
      let totalCgst = invoice.cgstAmount;
      let totalSgst = invoice.sgstAmount;
      let totalIgst = invoice.igstAmount;
      let grandTotal = invoice.grandTotal;
      let roundOff = invoice.roundOff;
      let balanceDue = invoice.balanceDue;

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
            serialNumber: line.serialNumber || null,
          };
        });

        grandTotal = Math.round(rawGrandTotal);
        roundOff = Number((grandTotal - rawGrandTotal).toFixed(2));
        totalTaxable = Number(rawTotalTaxable.toFixed(2));
        totalCgst = Number(rawTotalCgst.toFixed(2));
        totalSgst = Number(rawTotalSgst.toFixed(2));
        totalIgst = Number(rawTotalIgst.toFixed(2));
        const paidVal = amountPaid !== undefined ? Number(amountPaid) : invoice.amountPaid;
        balanceDue = grandTotal - paidVal;
      }

      // Handle stock reversal/re-application if stock was deducted previously
      if (invoice.status !== 'DRAFT' && invoice.status !== 'CANCELLED') {
        await reverseInvoiceStockDeduction(tx, invoice.id, invoice.invoiceNumber, invoice.partyId, req.user?.id);
      }

      if (processedItems) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      }

      const updated = await tx.invoice.update({
        where: { id },
        data: {
          invoiceNumber: finalInvoiceNo,
          partyId: targetPartyId,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : invoice.invoiceDate,
          customerStateCode: targetParty.stateCode,
          isInterState: isInterState,
          taxableAmount: totalTaxable,
          cgstAmount: totalCgst,
          sgstAmount: totalSgst,
          igstAmount: totalIgst,
          roundOff: roundOff,
          grandTotal: grandTotal,
          amountPaid: amountPaid !== undefined ? Number(amountPaid) : invoice.amountPaid,
          balanceDue: balanceDue,
          paymentMode: paymentMode || invoice.paymentMode,
          status: newStatus,
          notes: notes !== undefined ? notes : invoice.notes,
          ewayBillNo: ewayBillNo !== undefined ? (ewayBillNo ? String(ewayBillNo).trim() : null) : invoice.ewayBillNo,
          placeOfSupply: placeOfSupply !== undefined ? (placeOfSupply ? String(placeOfSupply).trim() : null) : invoice.placeOfSupply,
          poNumber: poNumber !== undefined ? (poNumber ? String(poNumber).trim() : null) : invoice.poNumber,
          poDate: poDate !== undefined ? (poDate ? new Date(poDate) : null) : invoice.poDate,
          termsTemplateId: termsTemplateId !== undefined ? (termsTemplateId ? String(termsTemplateId) : null) : invoice.termsTemplateId,
          termsSnapshot: formattedTermsSnapshot,
          items: processedItems
            ? {
                create: processedItems.map(({ serialNumber, ...rest }) => rest),
              }
            : undefined,
        },
        include: { party: true, items: { include: { item: true } } },
      });

      // Re-apply stock deduction if new status is confirmed
      if (newStatus !== 'DRAFT' && newStatus !== 'CANCELLED') {
        await applyInvoiceStockDeduction(tx, updated.id, updated.invoiceNumber, updated.partyId, req.user?.id);
      }

      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'INVOICE_EDIT',
          entityType: 'INVOICE',
          entityId: id,
          reference: updated.invoiceNumber,
          oldValues: JSON.stringify({ invoiceNumber: invoice.invoiceNumber, grandTotal: invoice.grandTotal, status: invoice.status }),
          newValues: JSON.stringify({ invoiceNumber: updated.invoiceNumber, grandTotal: updated.grandTotal, status: updated.status }),
        },
      });

      return updated;
    });

    return res.json({ invoice: result });
  } catch (err: any) {
    console.error('Update Invoice Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function cancelInvoice(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Invoice is already cancelled' });
    }

    await prisma.$transaction(async (tx) => {
      await reverseInvoiceStockDeduction(tx, invoice.id, invoice.invoiceNumber, invoice.partyId, req.user?.id);
      await tx.invoice.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'INVOICE_CANCEL',
          entityType: 'INVOICE',
          entityId: id,
          reference: invoice.invoiceNumber,
        },
      });
    });

    return res.json({ message: 'Invoice cancelled successfully and stock restored' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteInvoice(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true, party: true },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status !== 'DRAFT' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only ADMIN users can permanently delete confirmed invoices' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Reverse stock deduction if invoice was confirmed/paid
      if (invoice.status !== 'DRAFT' && invoice.status !== 'CANCELLED') {
        await reverseInvoiceStockDeduction(tx, invoice.id, invoice.invoiceNumber, invoice.partyId, req.user?.id);
      }

      // 2. Clean up associated payment allocations safely
      const payments = await tx.payment.findMany({
        where: { allocations: { contains: id } },
      });

      for (const p of payments) {
        if (p.allocations) {
          try {
            const parsed = JSON.parse(p.allocations);
            if (Array.isArray(parsed)) {
              const updatedAlloc = parsed.filter((a: any) => a.invoiceId !== id);
              await tx.payment.update({
                where: { id: p.id },
                data: {
                  allocations: JSON.stringify(updatedAlloc),
                },
              });
            }
          } catch (e) {
            // ignore JSON parse error
          }
        }
      }

      // 3. Delete invoice items
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });

      // 4. Delete invoice record
      await tx.invoice.delete({ where: { id } });

      // 5. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'INVOICE_DELETE',
          entityType: 'INVOICE',
          entityId: id,
          reference: invoice.invoiceNumber,
          oldValues: JSON.stringify({ invoiceNumber: invoice.invoiceNumber, grandTotal: invoice.grandTotal }),
        },
      });
    });

    return res.json({ message: `Invoice ${invoice.invoiceNumber} deleted permanently and all associated effects reversed.` });
  } catch (err: any) {
    console.error('Delete Invoice Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
