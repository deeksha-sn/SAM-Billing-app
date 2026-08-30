import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';

export async function getTermsTemplates(req: AuthRequest, res: Response) {
  try {
    const templates = await prisma.termsTemplate.findMany({
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    return res.json({ templates });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getTermsTemplateById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const template = await prisma.termsTemplate.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!template) return res.status(404).json({ error: 'Terms & Conditions template not found' });
    return res.json({ template });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createTermsTemplate(req: AuthRequest, res: Response) {
  try {
    const { name, isDefault, items } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    const existing = await prisma.termsTemplate.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return res.status(400).json({ error: 'A template with this name already exists' });
    }

    if (isDefault) {
      await prisma.termsTemplate.updateMany({ data: { isDefault: false } });
    }

    const itemData = Array.isArray(items)
      ? items
          .filter((t: any) => typeof t === 'string' ? t.trim().length > 0 : t?.text?.trim()?.length > 0)
          .map((t: any, idx: number) => ({
            text: typeof t === 'string' ? t.trim() : t.text.trim(),
            sortOrder: idx + 1,
          }))
      : [];

    const template = await prisma.termsTemplate.create({
      data: {
        name: name.trim(),
        isDefault: Boolean(isDefault),
        items: {
          create: itemData,
        },
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return res.status(201).json({ template });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateTermsTemplate(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, isDefault, items } = req.body;

    const existing = await prisma.termsTemplate.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (name && name.trim() !== existing.name) {
      const duplicateName = await prisma.termsTemplate.findUnique({ where: { name: name.trim() } });
      if (duplicateName) {
        return res.status(400).json({ error: 'A template with this name already exists' });
      }
    }

    if (isDefault) {
      await prisma.termsTemplate.updateMany({ data: { isDefault: false } });
    }

    const itemData = Array.isArray(items)
      ? items
          .filter((t: any) => typeof t === 'string' ? t.trim().length > 0 : t?.text?.trim()?.length > 0)
          .map((t: any, idx: number) => ({
            text: typeof t === 'string' ? t.trim() : t.text.trim(),
            sortOrder: idx + 1,
          }))
      : [];

    await prisma.termsTemplateItem.deleteMany({ where: { templateId: id } });

    const template = await prisma.termsTemplate.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        isDefault: isDefault !== undefined ? Boolean(isDefault) : undefined,
        items: {
          create: itemData,
        },
      },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return res.json({ template });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteTermsTemplate(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const existing = await prisma.termsTemplate.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await prisma.termsTemplate.delete({ where: { id } });
    return res.json({ message: 'Template deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function duplicateTermsTemplate(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const source = await prisma.termsTemplate.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!source) return res.status(404).json({ error: 'Source template not found' });

    let newName = `${source.name} (Copy)`;
    let counter = 1;
    while (await prisma.termsTemplate.findUnique({ where: { name: newName } })) {
      counter++;
      newName = `${source.name} (Copy ${counter})`;
    }

    const template = await prisma.termsTemplate.create({
      data: {
        name: newName,
        isDefault: false,
        items: {
          create: source.items.map((item) => ({
            text: item.text,
            sortOrder: item.sortOrder,
          })),
        },
      },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });

    return res.status(201).json({ template });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function setDefaultTermsTemplate(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const existing = await prisma.termsTemplate.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Template not found' });

    await prisma.termsTemplate.updateMany({ data: { isDefault: false } });
    const template = await prisma.termsTemplate.update({
      where: { id },
      data: { isDefault: true },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    return res.json({ template });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
