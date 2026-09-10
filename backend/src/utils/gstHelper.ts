export interface IndianState {
  code: string;
  name: string;
}

export const INDIAN_STATES: IndianState[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

export const VALID_GST_RATES = [0, 0.25, 3, 5, 12, 18, 28, 40];

export function normalizeStateCode(input?: string | number): string {
  if (input === undefined || input === null) return '29';
  const str = String(input).trim();
  if (!str) return '29';

  // 1. Match leading 1-2 digits (e.g. "29-Karnataka", "29", "29 Karnataka", "09-Uttar Pradesh")
  const leadingDigitsMatch = str.match(/^(\d{1,2})\b/);
  if (leadingDigitsMatch) {
    const code = leadingDigitsMatch[1].padStart(2, '0');
    const found = INDIAN_STATES.find((s) => s.code === code);
    if (found) return found.code;
  }

  // 2. Match trailing 1-2 digits (e.g. "Karnataka (29)", "Karnataka-29")
  const trailingDigitsMatch = str.match(/\b(\d{1,2})$/);
  if (trailingDigitsMatch) {
    const code = trailingDigitsMatch[1].padStart(2, '0');
    const found = INDIAN_STATES.find((s) => s.code === code);
    if (found) return found.code;
  }

  // 3. Search by state name in string (e.g. "Karnataka", "Maharashtra", "Tamil Nadu")
  const lower = str.toLowerCase();
  const foundByName = INDIAN_STATES.find(
    (s) => s.name.toLowerCase() === lower || lower.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(lower)
  );
  if (foundByName) return foundByName.code;

  // Default to 29 if unresolvable
  return '29';
}

export function getStateCodeFromName(stateName?: string): string {
  if (!stateName) return '29';
  return normalizeStateCode(stateName);
}

export function getStateNameFromCode(code?: string): string {
  if (!code) return 'Karnataka';
  const cleanCode = normalizeStateCode(code);
  const found = INDIAN_STATES.find((s) => s.code === cleanCode);
  return found ? found.name : 'Karnataka';
}

/**
 * Extracts 2-digit state code and state name from a valid GSTIN string.
 */
export function extractStateFromGstin(gstin?: string): { stateCode: string; stateName: string } | null {
  if (!gstin) return null;
  const clean = gstin.trim().toUpperCase();
  if (clean.length < 2) return null;

  const prefix = clean.substring(0, 2);
  const found = INDIAN_STATES.find((s) => s.code === prefix);
  if (found) {
    return { stateCode: found.code, stateName: found.name };
  }
  return null;
}

/**
 * Automatically determines if transaction is Inter-State (IGST) or Intra-State (CGST+SGST)
 * Company State is Karnataka (29) by default.
 */
export function isInterStateTransaction(
  partyStateOrPos?: string,
  partyStateNameFallback?: string,
  companyStateInput: string | number = '29'
): boolean {
  const companyCode = normalizeStateCode(companyStateInput);

  let partyCode = '29';
  if (partyStateOrPos && partyStateOrPos.trim()) {
    partyCode = normalizeStateCode(partyStateOrPos);
  } else if (partyStateNameFallback && partyStateNameFallback.trim()) {
    partyCode = normalizeStateCode(partyStateNameFallback);
  }

  return partyCode !== companyCode;
}

export interface CalculateItemGstParams {
  quantity: number;
  freeQuantity?: number;
  rate: number;
  discountPercent?: number;
  discountAmount?: number;
  gstRate: number | string;
  isExempt?: boolean;
  isInclusive?: boolean;
  isInterState: boolean;
}

export function calculateItemGst(params: CalculateItemGstParams) {
  const qty = Math.max(0, Number(params.quantity) || 0);
  const rate = Math.max(0, Number(params.rate) || 0);
  const discPct = Math.max(0, Number(params.discountPercent) || 0);
  const discAmtInput = Math.max(0, Number(params.discountAmount) || 0);
  const isInclusive = Boolean(params.isInclusive);
  const isExempt = Boolean(params.isExempt) || params.gstRate === 'EXEMPT' || params.gstRate === 'Exempted' || Number(params.gstRate) === 0;
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
