import { prisma } from '../db';

export interface FinancialYearInfo {
  fy: string;        // e.g. "26-27"
  fyFull: string;    // e.g. "2026-27"
  yearStart: string; // e.g. "2026"
  yearEnd: string;   // e.g. "2027"
}

export function getIndianFinancialYear(date: Date | string = new Date()): FinancialYearInfo {
  const d = new Date(date);
  const month = d.getMonth(); // 0-indexed: 0 = Jan, 3 = April
  const year = d.getFullYear();

  let startYr: number;
  let endYr: number;

  if (month >= 3) {
    // April to December
    startYr = year;
    endYr = year + 1;
  } else {
    // January to March
    startYr = year - 1;
    endYr = year;
  }

  const startYrShort = String(startYr).slice(-2);
  const endYrShort = String(endYr).slice(-2);

  return {
    fy: `${startYrShort}-${endYrShort}`,
    fyFull: `${startYr}-${endYrShort}`,
    yearStart: String(startYr),
    yearEnd: String(endYr),
  };
}

export function getDefaultPatternForDocType(docType: string): { prefix: string; pattern: string; paddingDigits: number } {
  switch (docType.toUpperCase()) {
    case 'INVOICE':
      return { prefix: 'SAM', pattern: 'SAM-{FY}-{NUMBER}', paddingDigits: 4 };
    case 'PURCHASE':
      return { prefix: 'PUR', pattern: 'PUR-{FY}-{NUMBER}', paddingDigits: 4 };
    case 'DELIVERY_CHALLAN':
      return { prefix: 'DC', pattern: 'DC-{FY}-{NUMBER}', paddingDigits: 4 };
    case 'SERVICE':
      return { prefix: 'SRV', pattern: 'SRV-{FY}-{NUMBER}', paddingDigits: 4 };
    case 'QUOTATION':
      return { prefix: 'QUO', pattern: 'QUO-{FY}-{NUMBER}', paddingDigits: 4 };
    default:
      return { prefix: 'DOC', pattern: 'DOC-{FY}-{NUMBER}', paddingDigits: 4 };
  }
}

export function formatDocumentNumber(
  pattern: string,
  paddingDigits: number,
  sequenceNum: number,
  date: Date | string = new Date()
): string {
  const fyInfo = getIndianFinancialYear(date);
  const numPadded = String(sequenceNum).padStart(paddingDigits || 4, '0');

  let docNo = pattern || 'SAM-{FY}-{NUMBER}';
  docNo = docNo.replace(/\{FY\}/g, fyInfo.fy);
  docNo = docNo.replace(/\{FY_FULL\}/g, fyInfo.fyFull);
  docNo = docNo.replace(/\{YEAR\}/g, fyInfo.yearStart);
  docNo = docNo.replace(/\{NUMBER\}/g, numPadded);

  return docNo;
}

export async function generateDocumentNumber(
  documentType: string,
  date: Date | string = new Date(),
  tx?: any
): Promise<{ docNumber: string; fy: string; pattern: string }> {
  const db = tx || prisma;
  const uppercaseType = documentType.toUpperCase();
  const fyInfo = getIndianFinancialYear(date);

  // 1. Get or create master config for document type
  let config = await db.documentNumberConfig.findUnique({
    where: { documentType: uppercaseType },
  });

  if (!config) {
    const defaults = getDefaultPatternForDocType(uppercaseType);
    config = await db.documentNumberConfig.create({
      data: {
        documentType: uppercaseType,
        prefix: defaults.prefix,
        pattern: defaults.pattern,
        paddingDigits: defaults.paddingDigits,
        nextNumber: 1,
      },
    });
  }

  // 2. Get or create sequence for specific financial year
  let seq = await db.sequenceNumber.findUnique({
    where: {
      documentType_financialYear: {
        documentType: uppercaseType,
        financialYear: fyInfo.fyFull,
      },
    },
  });

  if (!seq) {
    seq = await db.sequenceNumber.create({
      data: {
        documentType: uppercaseType,
        prefix: config.prefix,
        pattern: config.pattern,
        paddingDigits: config.paddingDigits,
        financialYear: fyInfo.fyFull,
        nextNumber: 1,
      },
    });
  }

  const currentNum = seq.nextNumber;
  const docNumber = formatDocumentNumber(seq.pattern, seq.paddingDigits, currentNum, date);

  // 3. Increment for next atomically
  await db.sequenceNumber.update({
    where: { id: seq.id },
    data: { nextNumber: currentNum + 1 },
  });

  return { docNumber, fy: fyInfo.fyFull, pattern: seq.pattern };
}
