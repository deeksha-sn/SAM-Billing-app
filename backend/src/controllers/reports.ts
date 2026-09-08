import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';

function getIndianFinancialYearRange(refDate: Date = new Date()) {
  const year = refDate.getFullYear();
  const month = refDate.getMonth(); // 0-indexed: 0=Jan, 3=Apr, 11=Dec
  let startYear: number;
  let endYear: number;

  if (month >= 3) {
    // April to December -> FY is startYear to startYear + 1
    startYear = year;
    endYear = year + 1;
  } else {
    // January to March -> FY is startYear - 1 to startYear
    startYear = year - 1;
    endYear = year;
  }

  const startDate = new Date(startYear, 3, 1, 0, 0, 0, 0); // April 1 00:00:00
  const endDate = new Date(endYear, 2, 31, 23, 59, 59, 999); // March 31 23:59:59.999
  const fyLabel = `FY ${startYear}-${(endYear % 100).toString().padStart(2, '0')}`;

  return { startDate, endDate, fyLabel, startYear, endYear };
}

export async function getDashboardStats(req: AuthRequest, res: Response) {
  try {
    const { period = 'THIS_YEAR', startDate: reqStart, endDate: reqEnd } = req.query;

    const today = new Date();
    let startDate: Date;
    let endDate: Date;
    let periodKey = (period as string).toUpperCase();
    const fyInfo = getIndianFinancialYearRange(today);

    if (periodKey === 'TODAY') {
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    } else if (periodKey === 'THIS_WEEK') {
      const dayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon
      const distanceToMon = (dayOfWeek + 6) % 7;
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - distanceToMon, 0, 0, 0, 0);
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    } else if (periodKey === 'THIS_MONTH') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (periodKey === 'CUSTOM' && reqStart && reqEnd) {
      startDate = new Date(reqStart as string);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(reqEnd as string);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default THIS_YEAR (Indian Financial Year: April 1 to March 31)
      periodKey = 'THIS_YEAR';
      startDate = fyInfo.startDate;
      endDate = fyInfo.endDate;
    }

    // Aggregations for the selected period
    const salesAgg = await prisma.invoice.aggregate({
      where: { invoiceDate: { gte: startDate, lte: endDate }, status: { not: 'CANCELLED' } },
      _sum: { grandTotal: true, balanceDue: true },
      _count: { id: true },
    });

    const purchasesAgg = await prisma.purchaseInvoice.aggregate({
      where: { purchaseDate: { gte: startDate, lte: endDate }, status: { not: 'CANCELLED' } },
      _sum: { grandTotal: true, balanceDue: true },
      _count: { id: true },
    });

    const collectionsAgg = await prisma.payment.aggregate({
      where: { date: { gte: startDate, lte: endDate }, paymentType: 'CUSTOMER_PAYMENT' },
      _sum: { amount: true },
    });

    const expensesAgg = await prisma.expense.aggregate({
      where: { date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    });

    // Total active receivables and payables across all time
    const totalReceivables = await prisma.invoice.aggregate({
      where: { status: { in: ['UNPAID', 'PARTIALLY_PAID', 'CONFIRMED'] } },
      _sum: { balanceDue: true },
    });

    const totalPayables = await prisma.purchaseInvoice.aggregate({
      where: { status: { in: ['UNPAID', 'PARTIALLY_PAID', 'CONFIRMED'] } },
      _sum: { balanceDue: true },
    });

    // Services
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const servicesDueToday = await prisma.serviceTask.count({
      where: { serviceDueDate: { gte: startOfToday, lte: endOfToday }, status: { not: 'COMPLETED' } },
    });

    const overdueServicesCount = await prisma.serviceTask.count({
      where: { serviceDueDate: { lt: startOfToday }, status: { not: 'COMPLETED' } },
    });

    const upcomingServicesCount = await prisma.serviceTask.count({
      where: { serviceDueDate: { gt: endOfToday }, status: { not: 'COMPLETED' } },
    });

    // Low stock items count
    const items = await prisma.item.findMany({ select: { currentStock: true, minStock: true } });
    const lowStockCount = items.filter((i) => i.currentStock <= i.minStock).length;

    // Build Dynamic Chart Data based on periodKey
    const chartData = [];

    if (periodKey === 'THIS_YEAR') {
      // 12 months of the Indian FY: Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec, Jan, Feb, Mar
      const fyMonths = [
        { monthIndex: 3, year: fyInfo.startYear, label: 'Apr' },
        { monthIndex: 4, year: fyInfo.startYear, label: 'May' },
        { monthIndex: 5, year: fyInfo.startYear, label: 'Jun' },
        { monthIndex: 6, year: fyInfo.startYear, label: 'Jul' },
        { monthIndex: 7, year: fyInfo.startYear, label: 'Aug' },
        { monthIndex: 8, year: fyInfo.startYear, label: 'Sep' },
        { monthIndex: 9, year: fyInfo.startYear, label: 'Oct' },
        { monthIndex: 10, year: fyInfo.startYear, label: 'Nov' },
        { monthIndex: 11, year: fyInfo.startYear, label: 'Dec' },
        { monthIndex: 0, year: fyInfo.endYear, label: 'Jan' },
        { monthIndex: 1, year: fyInfo.endYear, label: 'Feb' },
        { monthIndex: 2, year: fyInfo.endYear, label: 'Mar' },
      ];

      for (const mObj of fyMonths) {
        const mStart = new Date(mObj.year, mObj.monthIndex, 1, 0, 0, 0, 0);
        const mEnd = new Date(mObj.year, mObj.monthIndex + 1, 0, 23, 59, 59, 999);

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

        chartData.push({
          month: mObj.label,
          sales: salesVal,
          purchases: purVal,
          expenses: expVal,
          profit: salesVal - purVal - expVal,
        });
      }
    } else {
      // Daily breakdown for TODAY, THIS_WEEK, THIS_MONTH, or CUSTOM <= 31 days
      let iterStart = new Date(startDate);
      let iterEnd = new Date(endDate);

      if (periodKey === 'TODAY') {
        iterStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6, 0, 0, 0, 0);
      }

      const curr = new Date(iterStart);
      while (curr <= iterEnd) {
        const dStart = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate(), 0, 0, 0, 0);
        const dEnd = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate(), 23, 59, 59, 999);

        const dayLabel = curr.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

        const dSales = await prisma.invoice.aggregate({
          where: { invoiceDate: { gte: dStart, lte: dEnd }, status: { not: 'CANCELLED' } },
          _sum: { grandTotal: true },
        });
        const dPurchases = await prisma.purchaseInvoice.aggregate({
          where: { purchaseDate: { gte: dStart, lte: dEnd }, status: { not: 'CANCELLED' } },
          _sum: { grandTotal: true },
        });
        const dExp = await prisma.expense.aggregate({
          where: { date: { gte: dStart, lte: dEnd } },
          _sum: { amount: true },
        });

        const salesVal = dSales._sum.grandTotal || 0;
        const purVal = dPurchases._sum.grandTotal || 0;
        const expVal = dExp._sum.amount || 0;

        chartData.push({
          month: dayLabel,
          sales: salesVal,
          purchases: purVal,
          expenses: expVal,
          profit: salesVal - purVal - expVal,
        });

        curr.setDate(curr.getDate() + 1);
      }
    }

    // Top selling items in selected date range
    const topItems = await prisma.invoiceItem.groupBy({
      by: ['itemId', 'itemName'],
      where: {
        invoice: { invoiceDate: { gte: startDate, lte: endDate }, status: { not: 'CANCELLED' } },
      },
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
      period: periodKey,
      fyLabel: fyInfo.fyLabel,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      summary: {
        // Backwards compatibility field aliases
        todaySales: salesAgg._sum.grandTotal || 0,
        todayPurchases: purchasesAgg._sum.grandTotal || 0,
        todayCollections: collectionsAgg._sum.amount || 0,
        todayExpenses: expensesAgg._sum.amount || 0,

        // Period specific metrics
        periodSales: salesAgg._sum.grandTotal || 0,
        periodPurchases: purchasesAgg._sum.grandTotal || 0,
        periodCollections: collectionsAgg._sum.amount || 0,
        periodExpenses: expensesAgg._sum.amount || 0,
        invoiceCount: salesAgg._count.id || 0,
        purchaseCount: purchasesAgg._count.id || 0,

        // Receivables & Payables
        receivables: totalReceivables._sum.balanceDue || 0,
        payables: totalPayables._sum.balanceDue || 0,

        // Services metrics
        servicesDueToday,
        overdueServicesCount,
        upcomingServicesCount,

        // Inventory
        lowStockCount,
      },
      monthlyCharts: chartData,
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
