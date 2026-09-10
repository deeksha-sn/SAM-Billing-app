import { PrismaClient } from '@prisma/client';
import {
  isInterStateTransaction,
  calculateItemGst,
  extractStateFromGstin,
  normalizeStateCode,
  VALID_GST_RATES,
} from '../utils/gstHelper';

const prisma = new PrismaClient();

async function runGstTests() {
  console.log('==================================================');
  console.log('   STARTING COMPREHENSIVE GST SYSTEM TEST SUITE   ');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Test State Code Normalization
  console.log('--- 1. Testing State Code Normalization ---');
  assert(normalizeStateCode('29') === '29', 'Normalize "29" -> "29"');
  assert(normalizeStateCode('29-Karnataka') === '29', 'Normalize "29-Karnataka" -> "29"');
  assert(normalizeStateCode('Karnataka') === '29', 'Normalize "Karnataka" -> "29"');
  assert(normalizeStateCode('Karnataka (29)') === '29', 'Normalize "Karnataka (29)" -> "29"');
  assert(normalizeStateCode('27-Maharashtra') === '27', 'Normalize "27-Maharashtra" -> "27"');
  assert(normalizeStateCode('Maharashtra') === '27', 'Normalize "Maharashtra" -> "27"');
  assert(normalizeStateCode('33-Tamil Nadu') === '33', 'Normalize "33-Tamil Nadu" -> "33"');

  // 2. Test GSTIN State Extraction
  console.log('\n--- 2. Testing GSTIN State Extraction ---');
  assert(extractStateFromGstin('29AAACS1234F1Z9')?.stateCode === '29', 'Extract state 29 from Karnataka GSTIN');
  assert(extractStateFromGstin('27AAACV5544N1Z5')?.stateCode === '27', 'Extract state 27 from Maharashtra GSTIN');
  assert(extractStateFromGstin('33AAACC9988P1Z7')?.stateCode === '33', 'Extract state 33 from Tamil Nadu GSTIN');
  assert(extractStateFromGstin('INVALID_GSTIN') === null, 'Return null for invalid GSTIN');

  // 3. Test Inter-State Auto-detection
  console.log('\n--- 3. Testing Inter-State Auto-detection Logic ---');
  assert(isInterStateTransaction('29', 'Karnataka', '29') === false, 'KA (29) vs KA (29) is Intra-State (false)');
  assert(isInterStateTransaction('29-Karnataka', 'Karnataka', '29') === false, '"29-Karnataka" vs KA (29) is Intra-State (false)');
  assert(isInterStateTransaction('Karnataka', 'Karnataka', '29') === false, '"Karnataka" vs KA (29) is Intra-State (false)');
  assert(isInterStateTransaction('27', 'Maharashtra', '29') === true, 'MH (27) vs KA (29) is Inter-State (true)');
  assert(isInterStateTransaction('27-Maharashtra', 'Maharashtra', '29') === true, '"27-Maharashtra" vs KA (29) is Inter-State (true)');
  assert(isInterStateTransaction('33', 'Tamil Nadu', '29') === true, 'TN (33) vs KA (29) is Inter-State (true)');

  // 4. Test GST Calculation Rules
  console.log('\n--- 4. Testing Item GST Calculation Rules ---');

  // 18% Intra-State (Karnataka)
  const gst18Intra = calculateItemGst({ quantity: 1, rate: 45000, gstRate: 18, isInterState: false });
  assert(gst18Intra.taxableValue === 45000, '18% Taxable is ₹45,000');
  assert(gst18Intra.cgstAmount === 4050, '18% Intra CGST @ 9% is ₹4,050');
  assert(gst18Intra.sgstAmount === 4050, '18% Intra SGST @ 9% is ₹4,050');
  assert(gst18Intra.igstAmount === 0, '18% Intra IGST is ₹0');
  assert(gst18Intra.totalAmount === 53100, '18% Intra Grand Total is ₹53,100');

  // 18% Inter-State (Maharashtra)
  const gst18Inter = calculateItemGst({ quantity: 1, rate: 45000, gstRate: 18, isInterState: true });
  assert(gst18Inter.taxableValue === 45000, '18% Inter Taxable is ₹45,000');
  assert(gst18Inter.cgstAmount === 0, '18% Inter CGST is ₹0');
  assert(gst18Inter.sgstAmount === 0, '18% Inter SGST is ₹0');
  assert(gst18Inter.igstAmount === 8100, '18% Inter IGST @ 18% is ₹8,100');
  assert(gst18Inter.totalAmount === 53100, '18% Inter Grand Total is ₹53,100');

  // 5% Intra-State
  const gst5Intra = calculateItemGst({ quantity: 1, rate: 7500, gstRate: 5, isInterState: false });
  assert(gst5Intra.cgstAmount === 187.5, '5% Intra CGST @ 2.5% is ₹187.50');
  assert(gst5Intra.sgstAmount === 187.5, '5% Intra SGST @ 2.5% is ₹187.50');
  assert(gst5Intra.igstAmount === 0, '5% Intra IGST is ₹0');

  // Exempted (0%)
  const gstExempt = calculateItemGst({ quantity: 1, rate: 6000, gstRate: 0, isInterState: false, isExempt: true });
  assert(gstExempt.cgstAmount === 0 && gstExempt.sgstAmount === 0 && gstExempt.igstAmount === 0, 'Exempted item tax is ₹0');

  // 5. Test Database Verification for User Requested Scenarios
  console.log('\n--- 5. Testing Database Records & Real Invoice Scenarios ---');

  // Ensure Company is set to Karnataka (29)
  await prisma.companyProfile.upsert({
    where: { id: 'default' },
    update: { state: 'Karnataka', stateCode: '29', gstin: '29AAACS1234F1Z9' },
    create: {
      id: 'default',
      businessName: 'Smart Agro Machinerys',
      address: 'Plot 42, Industrial Area',
      phone: '+91 9844011223',
      email: 'sales@smartagromachinerys.com',
      gstin: '29AAACS1234F1Z9',
      state: 'Karnataka',
      stateCode: '29',
    },
  });

  const company = await prisma.companyProfile.findUnique({ where: { id: 'default' } });
  assert(company !== null && company.stateCode === '29', 'Company profile is set to Karnataka (State Code 29)');

  // Ensure test customers exist
  const kaParty = await prisma.party.upsert({
    where: { id: 'test-ka-party-id' },
    update: { state: 'Karnataka', stateCode: '29' },
    create: {
      id: 'test-ka-party-id',
      name: 'Nagaraja ST (KA Test)',
      mobile: '9900112233',
      address: 'Haveri Main Road',
      state: 'Karnataka',
      stateCode: '29',
      type: 'CUSTOMER',
    },
  });

  const mhParty = await prisma.party.upsert({
    where: { id: 'test-mh-party-id' },
    update: { state: 'Maharashtra', stateCode: '27' },
    create: {
      id: 'test-mh-party-id',
      name: 'Venkateshwara Agro (MH Test)',
      mobile: '9900112244',
      address: 'Market Yard, Kolhapur',
      state: 'Maharashtra',
      stateCode: '27',
      type: 'CUSTOMER',
      gstin: '27AAACV5544N1Z5',
    },
  });

  // TEST 1: Karnataka -> Karnataka Invoice (CGST + SGST, NO IGST)
  console.log('\n--- Running TEST 1: Karnataka -> Karnataka Invoice ---');
  const kaInvNo = 'TEST-INV-KA-001';
  await prisma.invoice.deleteMany({ where: { invoiceNumber: kaInvNo } });

  const kaCalc = calculateItemGst({ quantity: 1, rate: 45000, gstRate: 18, isInterState: false });
  const dbKaInv = await prisma.invoice.create({
    data: {
      invoiceNumber: kaInvNo,
      financialYear: '2026-2027',
      invoiceDate: new Date(),
      partyId: kaParty.id,
      billingAddress: kaParty.address,
      deliveryAddress: kaParty.address,
      placeOfSupply: '29-Karnataka',
      customerStateCode: '29',
      isInterState: false,
      taxableAmount: kaCalc.taxableValue,
      cgstAmount: kaCalc.cgstAmount,
      sgstAmount: kaCalc.sgstAmount,
      igstAmount: kaCalc.igstAmount,
      grandTotal: kaCalc.totalAmount,
      amountPaid: 0,
      balanceDue: kaCalc.totalAmount,
      status: 'CONFIRMED',
    },
  });

  assert(dbKaInv.isInterState === false, 'KA -> KA Invoice DB isInterState is FALSE');
  assert(dbKaInv.cgstAmount === 4050, 'KA -> KA Invoice DB CGST is ₹4,050');
  assert(dbKaInv.sgstAmount === 4050, 'KA -> KA Invoice DB SGST is ₹4,050');
  assert(dbKaInv.igstAmount === 0, 'KA -> KA Invoice DB IGST is STRICTLY ₹0');
  assert(dbKaInv.grandTotal === 53100, 'KA -> KA Invoice DB Grand Total is ₹53,100');

  // TEST 2: Karnataka -> Maharashtra Invoice (IGST, NO CGST/SGST)
  console.log('\n--- Running TEST 2: Karnataka -> Maharashtra Invoice ---');
  const mhInvNo = 'TEST-INV-MH-002';
  await prisma.invoice.deleteMany({ where: { invoiceNumber: mhInvNo } });

  const mhCalc = calculateItemGst({ quantity: 1, rate: 45000, gstRate: 18, isInterState: true });
  const dbMhInv = await prisma.invoice.create({
    data: {
      invoiceNumber: mhInvNo,
      financialYear: '2026-2027',
      invoiceDate: new Date(),
      partyId: mhParty.id,
      billingAddress: mhParty.address,
      deliveryAddress: mhParty.address,
      placeOfSupply: '27-Maharashtra',
      customerStateCode: '27',
      isInterState: true,
      taxableAmount: mhCalc.taxableValue,
      cgstAmount: mhCalc.cgstAmount,
      sgstAmount: mhCalc.sgstAmount,
      igstAmount: mhCalc.igstAmount,
      grandTotal: mhCalc.totalAmount,
      amountPaid: 0,
      balanceDue: mhCalc.totalAmount,
      status: 'CONFIRMED',
    },
  });

  assert(dbMhInv.isInterState === true, 'KA -> MH Invoice DB isInterState is TRUE');
  assert(dbMhInv.cgstAmount === 0, 'KA -> MH Invoice DB CGST is STRICTLY ₹0');
  assert(dbMhInv.sgstAmount === 0, 'KA -> MH Invoice DB SGST is STRICTLY ₹0');
  assert(dbMhInv.igstAmount === 8100, 'KA -> MH Invoice DB IGST is ₹8,100');
  assert(dbMhInv.grandTotal === 53100, 'KA -> MH Invoice DB Grand Total is ₹53,100');

  // TEST 7: Multi-rate invoice on Karnataka Customer
  console.log('\n--- Running TEST 7: Multi-rate Invoice (18%, 5%, Exempted) ---');
  const multiInvNo = 'TEST-INV-MULTI-007';
  await prisma.invoice.deleteMany({ where: { invoiceNumber: multiInvNo } });

  const item18 = calculateItemGst({ quantity: 1, rate: 45000, gstRate: 18, isInterState: false }); // CGST 4050, SGST 4050
  const item5 = calculateItemGst({ quantity: 2, rate: 7500, gstRate: 5, isInterState: false });    // Taxable 15000, CGST 375, SGST 375
  const itemExempt = calculateItemGst({ quantity: 10, rate: 600, gstRate: 0, isInterState: false, isExempt: true }); // Taxable 6000, Tax 0

  const totalTaxableMulti = item18.taxableValue + item5.taxableValue + itemExempt.taxableValue;
  const totalCgstMulti = item18.cgstAmount + item5.cgstAmount + itemExempt.cgstAmount;
  const totalSgstMulti = item18.sgstAmount + item5.sgstAmount + itemExempt.sgstAmount;
  const grandMulti = item18.totalAmount + item5.totalAmount + itemExempt.totalAmount;

  const dbMultiInv = await prisma.invoice.create({
    data: {
      invoiceNumber: multiInvNo,
      financialYear: '2026-2027',
      invoiceDate: new Date(),
      partyId: kaParty.id,
      billingAddress: kaParty.address,
      deliveryAddress: kaParty.address,
      placeOfSupply: '29-Karnataka',
      customerStateCode: '29',
      isInterState: false,
      taxableAmount: totalTaxableMulti,
      cgstAmount: totalCgstMulti,
      sgstAmount: totalSgstMulti,
      igstAmount: 0,
      grandTotal: grandMulti,
      amountPaid: 0,
      balanceDue: grandMulti,
      status: 'CONFIRMED',
    },
  });

  assert(dbMultiInv.taxableAmount === 66000, 'Multi-rate Total Taxable is ₹66,000');
  assert(dbMultiInv.cgstAmount === 4425, 'Multi-rate Total CGST (4050 + 375) is ₹4,425');
  assert(dbMultiInv.sgstAmount === 4425, 'Multi-rate Total SGST (4050 + 375) is ₹4,425');
  assert(dbMultiInv.igstAmount === 0, 'Multi-rate Total IGST is ₹0');
  assert(dbMultiInv.grandTotal === 74850, 'Multi-rate Grand Total is ₹74,850');

  console.log(`\n==================================================`);
  console.log(`   FINAL GST TEST RESULTS: ${passed} PASSED, ${failed} FAILED   `);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runGstTests()
  .catch((err) => {
    console.error('Error running GST tests:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
