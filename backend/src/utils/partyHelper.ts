import { prisma } from '../db';
import { normalizeStateCode, getStateNameFromCode } from './gstHelper';

export async function ensurePartyExists(
  dbClient: any = prisma,
  partyIdInput?: string | null,
  newPartyData?: any,
  defaultType: 'CUSTOMER' | 'SUPPLIER' = 'CUSTOMER'
): Promise<string> {
  // 1. If valid existing partyId provided and not 'NEW', verify it exists
  if (partyIdInput && partyIdInput !== 'NEW' && typeof partyIdInput === 'string' && partyIdInput.trim() !== '') {
    const existing = await dbClient.party.findUnique({ where: { id: partyIdInput } });
    if (existing) {
      return existing.id;
    }
  }

  // 2. Resolve name from newPartyData or fallback
  const name =
    newPartyData?.name ||
    newPartyData?.partyName ||
    newPartyData?.customerName ||
    newPartyData?.supplierName;

  if (!name || !String(name).trim()) {
    throw new Error('Customer / Party Name is required');
  }

  const cleanName = String(name).trim();
  const mobile = newPartyData?.mobile || newPartyData?.phone || null;
  const cleanMobile = mobile && String(mobile).trim() ? String(mobile).trim() : '';
  const gstin = newPartyData?.gstin && String(newPartyData.gstin).trim() ? String(newPartyData.gstin).trim() : null;
  const pType = newPartyData?.type || defaultType;

  // Check if a party with matching name, mobile, or GSTIN exists for this party type
  const searchOr: any[] = [{ name: { equals: cleanName } }];
  if (cleanMobile) searchOr.push({ mobile: cleanMobile });
  if (gstin) searchOr.push({ gstin: gstin });

  const foundParty = await dbClient.party.findFirst({
    where: {
      type: pType,
      OR: searchOr,
    },
  });

  if (foundParty) {
    return foundParty.id;
  }

  // Create new Party record in database
  const cleanStateCode = normalizeStateCode(newPartyData?.stateCode || newPartyData?.state || '29');
  const cleanStateName = getStateNameFromCode(cleanStateCode);

  const created = await dbClient.party.create({
    data: {
      name: cleanName,
      type: pType,
      customerType: newPartyData?.customerType || 'INDIVIDUAL',
      mobile: cleanMobile, // Optional! Can be empty string!
      altMobile: newPartyData?.altMobile || null,
      email: newPartyData?.email || null,
      address: newPartyData?.address || newPartyData?.billingAddress || null,
      shippingAddress: newPartyData?.shippingAddress || newPartyData?.address || null,
      state: cleanStateName,
      stateCode: cleanStateCode,
      pincode: newPartyData?.pincode || null,
      gstin: gstin,
      pan: newPartyData?.pan || null,
      openingBalance: 0,
      active: true,
    },
  });

  return created.id;
}
