export interface GSTCalculationResult {
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
}

export function calculateGST(
  quantity: number,
  rate: number,
  discountPercent: number = 0,
  gstRate: number = 18,
  isInterState: boolean = false,
  isGstInclusive: boolean = false
): GSTCalculationResult {
  const basePrice = quantity * rate;
  const discountAmount = (basePrice * discountPercent) / 100;
  const afterDiscount = basePrice - discountAmount;

  let taxableValue = 0;
  let totalTax = 0;

  if (isGstInclusive) {
    taxableValue = (afterDiscount * 100) / (100 + gstRate);
    totalTax = afterDiscount - taxableValue;
  } else {
    taxableValue = afterDiscount;
    totalTax = (taxableValue * gstRate) / 100;
  }

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstAmount = totalTax;
  } else {
    cgstAmount = totalTax / 2;
    sgstAmount = totalTax / 2;
  }

  const totalAmount = taxableValue + totalTax;

  return {
    taxableValue: Number(taxableValue.toFixed(2)),
    cgstAmount: Number(cgstAmount.toFixed(2)),
    sgstAmount: Number(sgstAmount.toFixed(2)),
    igstAmount: Number(igstAmount.toFixed(2)),
    totalTax: Number(totalTax.toFixed(2)),
    totalAmount: Number(totalAmount.toFixed(2)),
  };
}

export function isInterStateTransaction(companyStateCode: string, customerStateCode: string): boolean {
  if (!companyStateCode || !customerStateCode) return false;
  return companyStateCode.trim() !== customerStateCode.trim();
}
