import { prisma } from '../db';

export function getIndianFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth(); // 0-indexed: 0 = Jan, 3 = April
  const year = date.getFullYear();

  if (month >= 3) {
    // April to Dec
    const nextYearShort = String(year + 1).slice(-2);
    return `${year}-${nextYearShort}`;
  } else {
    // Jan to March
    const prevYear = year - 1;
    const yearShort = String(year).slice(-2);
    return `${prevYear}-${yearShort}`;
  }
}

export async function generateDocumentNumber(
  documentType: string,
  prefix: string,
  tx?: any
): Promise<{ docNumber: string; fy: string }> {
  const db = tx || prisma;
  const fy = getIndianFinancialYear();

  let seq = await db.sequenceNumber.findUnique({
    where: {
      documentType_financialYear: {
        documentType,
        financialYear: fy,
      },
    },
  });

  if (!seq) {
    seq = await db.sequenceNumber.create({
      data: {
        documentType,
        prefix,
        financialYear: fy,
        nextNumber: 1,
      },
    });
  }

  const currentNum = seq.nextNumber;
  const formattedNum = String(currentNum).padStart(4, '0');
  const docNumber = `${seq.prefix}-${fy}-${formattedNum}`;

  // Increment for next
  await db.sequenceNumber.update({
    where: { id: seq.id },
    data: { nextNumber: currentNum + 1 },
  });

  return { docNumber, fy };
}
