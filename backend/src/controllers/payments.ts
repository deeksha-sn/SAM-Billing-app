import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';
import { generateDocumentNumber } from '../utils/numbering';

export async function getPayments(req: AuthRequest, res: Response) {
  try {
    const { partyId, paymentType } = req.query;
    const where: any = {};
    if (partyId) where.partyId = partyId as string;
    if (paymentType) where.paymentType = paymentType as string;

    const payments = await prisma.payment.findMany({
      where,
      include: { party: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ payments });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createPayment(req: AuthRequest, res: Response) {
  try {
    const { partyId, paymentType, date, amount, paymentMode, referenceNo, notes, allocations } = req.body;
    // allocations: [{ invoiceId?: string, purchaseId?: string, amount: number }]

    const paymentAmount = Number(amount);
    if (!partyId || !paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ error: 'Party ID and a valid positive amount are required' });
    }

    const party = await prisma.party.findUnique({ where: { id: partyId } });
    if (!party) return res.status(404).json({ error: 'Party not found' });

    const pType = paymentType || 'CUSTOMER_PAYMENT';

    const result = await prisma.$transaction(async (tx) => {
      const { docNumber, fy } = await generateDocumentNumber('RECEIPT', 'REC', tx);

      const payment = await tx.payment.create({
        data: {
          receiptNo: docNumber,
          financialYear: fy,
          paymentType: pType,
          partyId: party.id,
          date: date ? new Date(date) : new Date(),
          amount: paymentAmount,
          paymentMode: paymentMode || 'Cash',
          referenceNo: referenceNo,
          notes: notes,
          allocations: allocations ? JSON.stringify(allocations) : null,
        },
      });

      // Process allocations to update Invoices or Purchases
      if (allocations && Array.isArray(allocations)) {
        for (const alloc of allocations) {
          const allocAmt = Number(alloc.amount) || 0;
          if (allocAmt <= 0) continue;

          if (pType === 'CUSTOMER_PAYMENT' && alloc.invoiceId) {
            const invoice = await tx.invoice.findUnique({ where: { id: alloc.invoiceId } });
            if (invoice) {
              const newPaid = invoice.amountPaid + allocAmt;
              const newBalance = Math.max(0, invoice.grandTotal - newPaid);
              let newStatus = invoice.status;
              if (newBalance === 0) newStatus = 'PAID';
              else if (newPaid > 0) newStatus = 'PARTIALLY_PAID';

              await tx.invoice.update({
                where: { id: alloc.invoiceId },
                data: {
                  amountPaid: newPaid,
                  balanceDue: newBalance,
                  status: newStatus,
                },
              });
            }
          } else if (pType === 'SUPPLIER_PAYMENT' && alloc.purchaseId) {
            const purchase = await tx.purchaseInvoice.findUnique({ where: { id: alloc.purchaseId } });
            if (purchase) {
              const newPaid = purchase.amountPaid + allocAmt;
              const newBalance = Math.max(0, purchase.grandTotal - newPaid);
              let newStatus = purchase.status;
              if (newBalance === 0) newStatus = 'PAID';
              else if (newPaid > 0) newStatus = 'PARTIALLY_PAID';

              await tx.purchaseInvoice.update({
                where: { id: alloc.purchaseId },
                data: {
                  amountPaid: newPaid,
                  balanceDue: newBalance,
                  status: newStatus,
                },
              });
            }
          }
        }
      }

      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'PAYMENT_RECORD',
          entityType: 'PAYMENT',
          entityId: payment.id,
          reference: docNumber,
          newValues: JSON.stringify({ amount: paymentAmount, pType }),
        },
      });

      return payment;
    });

    return res.status(201).json({ payment: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
