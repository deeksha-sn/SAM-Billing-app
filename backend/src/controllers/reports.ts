import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';

export async function getDashboardStats(req: AuthRequest, res: Response) {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    // Today's totals
    const todaySales = await prisma.invoice.aggregate({
      where: { invoiceDate: { gte: startOfToday, lte: endOfToday }, status: { not: 'CANCELLED' } },
      _sum: { grandTotal: true },
    });

    const todayPurchases = await prisma.purchaseInvoice.aggregate({
      where: { purchaseDate: { gte: startOfToday, lte: endOfToday }, status: { not: 'CANCELLED' } },
      _sum: { grandTotal: true },
    });

    const todayCollections = await prisma.payment.aggregate({
      where: { date: { gte: startOfToday, lte: endOfToday }, paymentType: 'CUSTOMER_PAYMENT' },
      _sum: { amount: true },
    });

    const todayExpenses = await prisma.expense.aggregate({
      where: { date: { gte: startOfToday, lte: endOfToday } },
      _sum: { amount: true },
    });

    // Receivables & Payables
    const totalReceivables = await prisma.invoice.aggregate({
      where: { status: { in: ['UNPAID', 'PARTIALLY_PAID', 'CONFIRMED'] } },
      _sum: { balanceDue: true },
    });

    const totalPayables = await prisma.purchaseInvoice.aggregate({
      where: { status: { in: ['UNPAID', 'PARTIALLY_PAID', 'CONFIRMED'] } },
      _sum: { balanceDue: true },
    });

    // Services
    const servicesDueToday = await prisma.serviceTask.count({
      where: { serviceDueDate: { gte: startOfToday, lte: endOfToday }, status: { not: 'COMPLETED' } },
    });

    const servicesOverdue = await prisma.serviceTask.count({
      where: { serviceDueDate: { lt: startOfToday }, status: { not: 'COMPLETED' } },
    });

    // Low stock items count
    const items = await prisma.item.findMany({ select: { currentStock: true, minStock: true } });
    const lowStockCount = items.filter((i) => i.currentStock <= i.minStock).length;

    // Monthly chart data (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const monthLabel = d.toLocaleString('default', { month: 'short' });

      const mSales = await prisma.invoice.aggregate({
        where: { invoiceDate: { gte: mStart, lte: mEnd }, status: { not: 'CANCELLED' } },
        _sum: { grandTotal: true },
      });

      const mPurchases = await prisma.purchaseInvoice.aggregate({
        where: { purchaseDate: { gte: mStart, lte: mEnd }, status: { not: 'CANCELLED' } },
        _sum: { grandTotal: true },
      });

      const mExp = await prisma.expense.aggregate({
        where: { date: { gte: mStart, lte: mEnd } },
        _sum: { amount: true },
      });

      const salesVal = mSales._sum.grandTotal || 0;
      const purVal = mPurchases._sum.grandTotal || 0;
      const expVal = mExp._sum.amount || 0;

      monthlyData.push({
        month: monthLabel,
        sales: salesVal,
        purchases: purVal,
        expenses: expVal,
        profit: salesVal - purVal - expVal,
      });
    }

    // Top selling items
    const topItems = await prisma.invoiceItem.groupBy({
      by: ['itemId', 'itemName'],
      _sum: { quantity: true, totalAmount: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    // Low stock items list
    const lowStockItems = await prisma.item.findMany({
      where: { active: true },
      orderBy: { currentStock: 'asc' },
      take: 5,
    });
    const filteredLowStock = lowStockItems.filter((i) => i.currentStock <= i.minStock);

    return res.json({
      summary: {
        todaySales: todaySales._sum.grandTotal || 0,
        todayPurchases: todayPurchases._sum.grandTotal || 0,
        todayCollections: todayCollections._sum.amount || 0,
        todayExpenses: todayExpenses._sum.amount || 0,
        receivables: totalReceivables._sum.balanceDue || 0,
        payables: totalPayables._sum.balanceDue || 0,
        servicesDueToday,
        servicesOverdue,
        lowStockCount,
      },
      monthlyCharts: monthlyData,
      topItems,
      lowStockItems: filteredLowStock,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getGSTReport(req: AuthRequest, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    const whereInvoice: any = { status: { not: 'CANCELLED' } };
    const wherePurchase: any = { status: { not: 'CANCELLED' } };

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      whereInvoice.invoiceDate = { gte: start, lte: end };
      wherePurchase.purchaseDate = { gte: start, lte: end };
    }

    const salesSummary = await prisma.invoice.aggregate({
      where: whereInvoice,
      _sum: { taxableAmount: true, cgstAmount: true, sgstAmount: true, igstAmount: true, grandTotal: true },
    });

    const purchaseSummary = await prisma.purchaseInvoice.aggregate({
      where: wherePurchase,
      _sum: { taxableAmount: true, cgstAmount: true, sgstAmount: true, igstAmount: true, grandTotal: true },
    });

    // HSN-wise sales breakdown
    const invoiceItems = await prisma.invoiceItem.findMany({
      where: { invoice: whereInvoice },
    });

    const hsnMap: Record<string, any> = {};
    for (const item of invoiceItems) {
      const key = item.hsnSac || 'OTHER';
      if (!hsnMap[key]) {
        hsnMap[key] = {
          hsnSac: key,
          description: item.itemName,
          totalQty: 0,
          taxableValue: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          totalAmount: 0,
        };
      }
      hsnMap[key].totalQty += item.quantity;
      hsnMap[key].taxableValue += item.taxableValue;
      hsnMap[key].cgstAmount += item.cgstAmount;
      hsnMap[key].sgstAmount += item.sgstAmount;
      hsnMap[key].igstAmount += item.igstAmount;
      hsnMap[key].totalAmount += item.totalAmount;
    }

    return res.json({
      salesGST: {
        taxable: salesSummary._sum.taxableAmount || 0,
        cgst: salesSummary._sum.cgstAmount || 0,
        sgst: salesSummary._sum.sgstAmount || 0,
        igst: salesSummary._sum.igstAmount || 0,
        totalTax: (salesSummary._sum.cgstAmount || 0) + (salesSummary._sum.sgstAmount || 0) + (salesSummary._sum.igstAmount || 0),
        grandTotal: salesSummary._sum.grandTotal || 0,
      },
      purchaseGST: {
        taxable: purchaseSummary._sum.taxableAmount || 0,
        cgst: purchaseSummary._sum.cgstAmount || 0,
        sgst: purchaseSummary._sum.sgstAmount || 0,
        igst: purchaseSummary._sum.igstAmount || 0,
        totalTax: (purchaseSummary._sum.cgstAmount || 0) + (purchaseSummary._sum.sgstAmount || 0) + (purchaseSummary._sum.igstAmount || 0),
        grandTotal: purchaseSummary._sum.grandTotal || 0,
      },
      hsnSummary: Object.values(hsnMap),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getStockLedgerReport(req: AuthRequest, res: Response) {
  try {
    const { itemId, startDate, endDate } = req.query;
    const where: any = {};
    if (itemId) where.itemId = itemId as string;
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: { item: true, party: true },
      orderBy: { date: 'desc' },
    });

    return res.json({ movements });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getPartyLedgerReport(req: AuthRequest, res: Response) {
  try {
    const { partyId } = req.params;
    const party = await prisma.party.findUnique({ where: { id: partyId } });
    if (!party) return res.status(404).json({ error: 'Party not found' });

    // Fetch invoices, purchases, payments
    const invoices = await prisma.invoice.findMany({
      where: { partyId, status: { not: 'CANCELLED' } },
      select: { invoiceNumber: true, invoiceDate: true, grandTotal: true },
    });

    const purchases = await prisma.purchaseInvoice.findMany({
      where: { partyId, status: { not: 'CANCELLED' } },
      select: { purchaseNumber: true, purchaseDate: true, grandTotal: true },
    });

    const payments = await prisma.payment.findMany({
      where: { partyId },
      select: { receiptNo: true, date: true, amount: true, paymentType: true, paymentMode: true },
    });

    // Construct ledger timeline
    const entries: any[] = [];

    invoices.forEach((inv) => {
      entries.push({
        date: inv.invoiceDate,
        particulars: `Sales Invoice ${inv.invoiceNumber}`,
        reference: inv.invoiceNumber,
        debit: inv.grandTotal,
        credit: 0,
      });
    });

    purchases.forEach((pur) => {
      entries.push({
        date: pur.purchaseDate,
        particulars: `Purchase Invoice ${pur.purchaseNumber}`,
        reference: pur.purchaseNumber,
        debit: 0,
        credit: pur.grandTotal,
      });
    });

    payments.forEach((p) => {
      const isCust = p.paymentType === 'CUSTOMER_PAYMENT';
      entries.push({
        date: p.date,
        particulars: `Payment Receipt (${p.paymentMode}) ${p.receiptNo}`,
        reference: p.receiptNo,
        debit: isCust ? 0 : p.amount,
        credit: isCust ? p.amount : 0,
      });
    });

    // Sort chronologically
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = party.openingBalance || 0;
    const ledger = entries.map((e) => {
      runningBalance = runningBalance + e.debit - e.credit;
      return {
        ...e,
        balance: runningBalance,
      };
    });

    return res.json({ party, openingBalance: party.openingBalance, ledger });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getProfitAndLossReport(req: AuthRequest, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    const whereInvoice: any = { status: { not: 'CANCELLED' } };
    const wherePurchase: any = { status: { not: 'CANCELLED' } };
    const whereExpense: any = {};

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      whereInvoice.invoiceDate = { gte: start, lte: end };
      wherePurchase.purchaseDate = { gte: start, lte: end };
      whereExpense.date = { gte: start, lte: end };
    }

    const salesTotal = await prisma.invoice.aggregate({
      where: whereInvoice,
      _sum: { taxableAmount: true, grandTotal: true },
    });

    const purchasesTotal = await prisma.purchaseInvoice.aggregate({
      where: wherePurchase,
      _sum: { taxableAmount: true, grandTotal: true },
    });

    const expensesTotal = await prisma.expense.aggregate({
      where: whereExpense,
      _sum: { amount: true },
    });

    // Calculate BOM estimated material cost for sold machines
    const invoiceItems = await prisma.invoiceItem.findMany({
      where: { invoice: whereInvoice },
      include: {
        item: {
          include: {
            bomHeader: {
              include: {
                components: { include: { componentItem: true } },
              },
            },
          },
        },
      },
    });

    let totalBOMMaterialCost = 0;
    for (const invItem of invoiceItems) {
      if (invItem.item.bomHeader && invItem.item.bomHeader.active) {
        for (const comp of invItem.item.bomHeader.components) {
          const compPrice = comp.componentItem.purchasePrice || 0;
          totalBOMMaterialCost += comp.quantity * compPrice * invItem.quantity;
        }
      }
    }

    const totalSalesVal = salesTotal._sum.grandTotal || 0;
    const totalPurchasesVal = purchasesTotal._sum.grandTotal || 0;
    const totalExpensesVal = expensesTotal._sum.amount || 0;

    const estimatedGrossProfit = totalSalesVal - totalBOMMaterialCost;
    const netProfit = totalSalesVal - totalPurchasesVal - totalExpensesVal;

    return res.json({
      sales: totalSalesVal,
      purchases: totalPurchasesVal,
      expenses: totalExpensesVal,
      bomMaterialCost: totalBOMMaterialCost,
      estimatedGrossProfit: estimatedGrossProfit,
      netProfit: netProfit,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
