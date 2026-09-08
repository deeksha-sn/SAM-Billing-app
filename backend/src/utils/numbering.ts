import { prisma } from '../db';

export interface FinancialYearInfo {
  fy: string;        // e.g. "26-27"
  fyFull: string;    // e.g. "2026-27"
  yearStart: string; // e.g. "2026"
  yearEnd: string;   // e.g. "2027"
}

export function getIndianFinancialYear(date: Date | string = new Date()): FinancialYearInfo {
  let d = new Date(date);
  if (isNaN(d.getTime())) {
    d = new Date();
  }
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
    case 'PAYMENT':
    case 'RECEIPT':
      return { prefix: 'PAY', pattern: 'PAY-{FY}-{NUMBER}', paddingDigits: 4 };
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

export function extractSequenceNumber(docNo: string, fyInfo: FinancialYearInfo): number {
  if (!docNo || typeof docNo !== 'string') return 0;
  const cleaned = docNo.trim();

  // Check matching financial year patterns (26-27 or 2026-27 or 2026-2027)
  const isMatchFy =
    cleaned.includes(fyInfo.fy) ||
    cleaned.includes(fyInfo.fyFull) ||
    cleaned.includes(`${fyInfo.yearStart.slice(-2)}-${fyInfo.yearEnd.slice(-2)}`);

  if (!isMatchFy) return 0;

  const match = cleaned.match(/(\d+)$/);
  if (match && match[1]) {
    return parseInt(match[1], 10) || 0;
  }
  return 0;
}

export async function checkDocNumberExists(
  db: any,
  documentType: string,
  docNumber: string
): Promise<boolean> {
  const uppercaseType = documentType.toUpperCase();
  try {
    switch (uppercaseType) {
      case 'INVOICE': {
        const item = await db.invoice.findUnique({ where: { invoiceNumber: docNumber } });
        return Boolean(item);
      }
      case 'QUOTATION': {
        const item = await db.quotation.findUnique({ where: { quotationNumber: docNumber } });
        return Boolean(item);
      }
      case 'DELIVERY_CHALLAN': {
        const item = await db.deliveryChallan.findUnique({ where: { challanNumber: docNumber } });
        return Boolean(item);
      }
      case 'PURCHASE': {
        const item = await db.purchaseInvoice.findUnique({ where: { purchaseNumber: docNumber } });
        return Boolean(item);
      }
      case 'PAYMENT':
      case 'RECEIPT': {
        const item = await db.payment.findUnique({ where: { receiptNo: docNumber } });
        return Boolean(item);
      }
      case 'SERVICE': {
        const item = await db.serviceTask.findUnique({ where: { serviceNo: docNumber } });
        return Boolean(item);
      }
      default:
        return false;
    }
  } catch (err) {
    return false;
  }
}

export async function getMaxSequenceFromDbTable(
  db: any,
  documentType: string,
  fyInfo: FinancialYearInfo
): Promise<number> {
  let maxNum = 0;
  const uppercaseType = documentType.toUpperCase();

  try {
    switch (uppercaseType) {
      case 'INVOICE': {
        const records = await db.invoice.findMany({ select: { invoiceNumber: true } });
        for (const r of records) {
          const num = extractSequenceNumber(r.invoiceNumber, fyInfo);
          if (num > maxNum) maxNum = num;
        }
        break;
      }
      case 'QUOTATION': {
        const records = await db.quotation.findMany({ select: { quotationNumber: true } });
        for (const r of records) {
          const num = extractSequenceNumber(r.quotationNumber, fyInfo);
          if (num > maxNum) maxNum = num;
        }
        break;
      }
      case 'DELIVERY_CHALLAN': {
        const records = await db.deliveryChallan.findMany({ select: { challanNumber: true } });
        for (const r of records) {
          const num = extractSequenceNumber(r.challanNumber, fyInfo);
          if (num > maxNum) maxNum = num;
        }
        break;
      }
      case 'PURCHASE': {
        const records = await db.purchaseInvoice.findMany({ select: { purchaseNumber: true } });
        for (const r of records) {
          const num = extractSequenceNumber(r.purchaseNumber, fyInfo);
          if (num > maxNum) maxNum = num;
        }
        break;
      }
      case 'PAYMENT':
      case 'RECEIPT': {
        const records = await db.payment.findMany({ select: { receiptNo: true } });
        for (const r of records) {
          const num = extractSequenceNumber(r.receiptNo, fyInfo);
          if (num > maxNum) maxNum = num;
        }
        break;
      }
      case 'SERVICE': {
        const records = await db.serviceTask.findMany({ select: { serviceNo: true } });
        for (const r of records) {
          const num = extractSequenceNumber(r.serviceNo, fyInfo);
          if (num > maxNum) maxNum = num;
        }
        break;
      }
    }
  } catch (err) {
    console.error('Error in getMaxSequenceFromDbTable:', err);
  }

  return maxNum;
}

export async function generateDocumentNumber(
  documentType: string,
  dateOrPrefix?: Date | string | any,
  txArg?: any
): Promise<{ docNumber: string; fy: string; pattern: string }> {
  let db = prisma;
  let d = new Date();

  if (txArg) {
    db = txArg;
  }

  if (dateOrPrefix) {
    if (dateOrPrefix instanceof Date) {
      if (!isNaN(dateOrPrefix.getTime())) {
        d = dateOrPrefix;
      }
    } else if (typeof dateOrPrefix === 'string') {
      const parsed = new Date(dateOrPrefix);
      if (!isNaN(parsed.getTime())) {
        d = parsed;
      }
    } else if (typeof dateOrPrefix === 'object' && !txArg) {
      db = dateOrPrefix;
    }
  }

  const uppercaseType = documentType.toUpperCase();
  const fyInfo = getIndianFinancialYear(d);

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

  // 3. Inspect existing database records to find maximum existing sequence number
  const maxDbSeq = await getMaxSequenceFromDbTable(db, uppercaseType, fyInfo);

  // Candidate number must be >= maxDbSeq + 1 and >= seq.nextNumber
  let candidateNum = Math.max(seq.nextNumber, maxDbSeq + 1);

  // 4. Ensure candidateNum produces a document number that does NOT exist anywhere in the database table
  let docNumber = formatDocumentNumber(seq.pattern, seq.paddingDigits, candidateNum, d);
  let exists = await checkDocNumberExists(db, uppercaseType, docNumber);

  while (exists) {
    candidateNum++;
    docNumber = formatDocumentNumber(seq.pattern, seq.paddingDigits, candidateNum, d);
    exists = await checkDocNumberExists(db, uppercaseType, docNumber);
  }

  // 5. Update sequence counter atomically (never decrements)
  await db.sequenceNumber.update({
    where: { id: seq.id },
    data: { nextNumber: candidateNum + 1 },
  });

  return { docNumber, fy: fyInfo.fyFull, pattern: seq.pattern };
}

export async function syncSequenceCounters(tx?: any) {
  const db = tx || prisma;
  const docTypes = ['INVOICE', 'QUOTATION', 'DELIVERY_CHALLAN', 'PURCHASE', 'PAYMENT', 'RECEIPT', 'SERVICE'];
  const fyInfo = getIndianFinancialYear(new Date());

  for (const docType of docTypes) {
    const uppercaseType = docType.toUpperCase();
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

    const maxDbSeq = await getMaxSequenceFromDbTable(db, uppercaseType, fyInfo);
    const targetNext = Math.max(seq.nextNumber, maxDbSeq + 1);

    await db.sequenceNumber.update({
      where: { id: seq.id },
      data: { nextNumber: targetNext },
    });
  }
}
