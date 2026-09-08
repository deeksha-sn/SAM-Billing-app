export interface IndianState {
  code: string;
  name: string;
}

export const INDIAN_STATES: IndianState[] = [
  { code: '29', name: 'Karnataka' },
  { code: '27', name: 'Maharashtra' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '32', name: 'Kerala' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '36', name: 'Telangana' },
  { code: '30', name: 'Goa' },
  { code: '07', name: 'Delhi' },
  { code: '24', name: 'Gujarat' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '19', name: 'West Bengal' },
  { code: '03', name: 'Punjab' },
  { code: '06', name: 'Haryana' },
  { code: '10', name: 'Bihar' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '18', name: 'Assam' },
  { code: '21', name: 'Odisha' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '05', name: 'Uttarakhand' },
  { code: '16', name: 'Tripura' },
  { code: '15', name: 'Mizoram' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '17', name: 'Meghalaya' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '31', name: 'Lakshadweep' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

export const VALID_GST_RATES = [0, 0.25, 3, 5, 12, 18, 28, 40];

export function getStateCodeFromName(stateName?: string): string {
  if (!stateName) return '29';
  const found = INDIAN_STATES.find((s) => s.name.toLowerCase() === stateName.trim().toLowerCase());
  return found ? found.code : '29';
}

export function getStateNameFromCode(code?: string): string {
  if (!code) return 'Karnataka';
  const found = INDIAN_STATES.find((s) => s.code === code.padStart(2, '0'));
  return found ? found.name : 'Karnataka';
}

/**
 * Automatically determines if transaction is Inter-State (IGST) or Intra-State (CGST+SGST)
 */
export function isInterStateTransaction(
  partyStateCode?: string,
  partyStateName?: string,
  companyStateCode: string = '29'
): boolean {
  let pCode = (partyStateCode || '').trim();

  if (!pCode && partyStateName) {
    pCode = getStateCodeFromName(partyStateName);
  }

  if (!pCode) return false;

  return pCode.padStart(2, '0') !== companyStateCode.padStart(2, '0');
}

export interface CalculateItemGstParams {
  quantity: number;
  freeQuantity?: number;
  rate: number;
  discountPercent?: number;
  discountAmount?: number;
  gstRate: number;
  isExempt?: boolean;
  isInclusive?: boolean;
  isInterState: boolean;
}

export function calculateItemGst(params: CalculateItemGstParams) {
  const qty = Math.max(1, Number(params.quantity) || 1);
  const rate = Math.max(0, Number(params.rate) || 0);
  const discPct = Math.max(0, Number(params.discountPercent) || 0);
  const discAmtInput = Math.max(0, Number(params.discountAmount) || 0);
  const isInclusive = Boolean(params.isInclusive);
  const isExempt = Boolean(params.isExempt) || Number(params.gstRate) === 0;
  const gstPct = isExempt ? 0 : Number(params.gstRate) || 0;

  let taxableValue = 0;
  let totalTaxAmount = 0;
  let totalAmount = 0;

  if (isInclusive) {
    // Rate is GST-Inclusive
    const grossInclusive = qty * rate;
    let discountAmount = 0;
    if (discAmtInput > 0) {
      discountAmount = discAmtInput;
    } else if (discPct > 0) {
      discountAmount = (grossInclusive * discPct) / 100;
    }

    totalAmount = Math.max(0, grossInclusive - discountAmount);

    if (isExempt || gstPct === 0) {
      taxableValue = totalAmount;
      totalTaxAmount = 0;
    } else {
      taxableValue = totalAmount / (1 + gstPct / 100);
      totalTaxAmount = totalAmount - taxableValue;
    }
  } else {
    // Rate is GST-Exclusive (Base Taxable)
    const grossTaxable = qty * rate;
    let discountAmount = 0;
    if (discAmtInput > 0) {
      discountAmount = discAmtInput;
    } else if (discPct > 0) {
      discountAmount = (grossTaxable * discPct) / 100;
    }

    taxableValue = Math.max(0, grossTaxable - discountAmount);

    if (isExempt || gstPct === 0) {
      totalTaxAmount = 0;
      totalAmount = taxableValue;
    } else {
      totalTaxAmount = (taxableValue * gstPct) / 100;
      totalAmount = taxableValue + totalTaxAmount;
    }
  }

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (!isExempt && gstPct > 0) {
    if (params.isInterState) {
      igstAmount = totalTaxAmount;
    } else {
      cgstAmount = totalTaxAmount / 2;
      sgstAmount = totalTaxAmount / 2;
    }
  }

  return {
    taxableValue: Math.round(taxableValue * 100) / 100,
    gstRate: gstPct,
    cgstAmount: Math.round(cgstAmount * 100) / 100,
    sgstAmount: Math.round(sgstAmount * 100) / 100,
    igstAmount: Math.round(igstAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    isExempt,
    isInclusive,
  };
}
