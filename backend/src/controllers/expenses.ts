import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';

export async function getExpenses(req: AuthRequest, res: Response) {
  try {
    const { category, startDate, endDate } = req.query;
    const where: any = {};

    if (category) where.category = category as string;
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { createdBy: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    return res.json({ expenses, totalAmount: total });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createExpense(req: AuthRequest, res: Response) {
  try {
    const { category, description, amount, paymentMode, date, attachmentUrl, notes } = req.body;

    if (!category || !description || !amount) {
      return res.status(400).json({ error: 'Category, Description, and Amount are required' });
    }

    const expense = await prisma.expense.create({
      data: {
        category,
        description,
        amount: Number(amount),
        paymentMode: paymentMode || 'Cash',
        date: date ? new Date(date) : new Date(),
        attachmentUrl,
        notes,
        createdById: req.user?.id,
      },
    });

    return res.status(201).json({ expense });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
