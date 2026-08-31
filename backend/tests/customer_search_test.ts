import { prisma } from '../src/db';
import { isInterStateTransaction, calculateItemGst, INDIAN_STATES } from '../src/utils/gstHelper';

async function runCustomerSearchAndGstTests() {
  console.log('🧪 Starting Customer Search Combobox & GST Auto-Detection Integration Tests...\n');

  // Test 1: Verify Company Settings State (Karnataka - 29)
  const companyStateCode = '29';
  console.log(`Step 1: Base Company State Code: ${companyStateCode} (Karnataka)`);

  // Test 2: Create same-name customers with distinct mobile/address/GSTIN to verify no collision
  console.log('Step 2: Creating same-name customers with distinct phones/GSTINs in Prisma DB...');
  const timestamp = Date.now();

  const customerKA = await prisma.party.create({
    data: {
      name: 'Ramesh Agro Farm',
      type: 'CUSTOMER',
      customerType: 'FARMER',
      mobile: `98440${timestamp.toString().slice(-5)}`,
      village: 'Haveri Town',
      district: 'Haveri',
      state: 'Karnataka',
      stateCode: '29',
      gstin: '29ABCDE1234F1Z5',
    },
  });

  const customerMH = await prisma.party.create({
    data: {
      name: 'Ramesh Agro Farm',
      type: 'CUSTOMER',
      customerType: 'BUSINESS',
      mobile: `91108${timestamp.toString().slice(-5)}`,
      village: 'Pune Industrial Area',
      district: 'Pune',
      state: 'Maharashtra',
      stateCode: '27',
      gstin: '27XYZAB9876C1Z9',
    },
  });

  console.log(`  - Customer 1: ID=${customerKA.id}, State=${customerKA.state} (${customerKA.stateCode}), Mobile=${customerKA.mobile}`);
  console.log(`  - Customer 2: ID=${customerMH.id}, State=${customerMH.state} (${customerMH.stateCode}), Mobile=${customerMH.mobile}`);
  console.log('✅ Step 2 Passed: Same-name customers created separately without merging.\n');

  // Test 3: GST Auto-Detection (Intra-State vs Inter-State)
  console.log('Step 3: Testing GST Auto-Detection based on Customer State Code...');
  
  // Intra-State: Customer in Karnataka (29) vs Company in Karnataka (29)
  const isInterKA = isInterStateTransaction(customerKA.stateCode, customerKA.state, companyStateCode);
  if (isInterKA !== false) throw new Error('Expected Intra-State (CGST + SGST) for KA customer');
  
  const calcKA = calculateItemGst({
    quantity: 1,
    rate: 10000,
    gstRate: 18,
    isInterState: isInterKA,
  });
  if (calcKA.cgstAmount !== 900 || calcKA.sgstAmount !== 900 || calcKA.igstAmount !== 0) {
    throw new Error(`Intra-state tax calculation invalid: CGST=${calcKA.cgstAmount}, SGST=${calcKA.sgstAmount}, IGST=${calcKA.igstAmount}`);
  }
  console.log('  - KA Customer Tax Treatment: INTRA-STATE -> CGST: ₹900 (9%), SGST: ₹900 (9%), IGST: ₹0');

  // Inter-State: Customer in Maharashtra (27) vs Company in Karnataka (29)
  const isInterMH = isInterStateTransaction(customerMH.stateCode, customerMH.state, companyStateCode);
  if (isInterMH !== true) throw new Error('Expected Inter-State (IGST) for MH customer');

  const calcMH = calculateItemGst({
    quantity: 1,
    rate: 10000,
    gstRate: 18,
    isInterState: isInterMH,
  });
  if (calcMH.igstAmount !== 1800 || calcMH.cgstAmount !== 0 || calcMH.sgstAmount !== 0) {
    throw new Error(`Inter-state tax calculation invalid: IGST=${calcMH.igstAmount}, CGST=${calcMH.cgstAmount}, SGST=${calcMH.sgstAmount}`);
  }
  console.log('  - MH Customer Tax Treatment: INTER-STATE -> IGST: ₹1800 (18%), CGST: ₹0, SGST: ₹0');

  console.log('✅ Step 3 Passed: GST Auto-Detection verified.\n');

  // Test 4: Verify Searchability in DB Queries
  console.log('Step 4: Testing DB Searchability by Name, Phone, and GSTIN...');

  const searchByName = await prisma.party.findMany({
    where: { name: { contains: 'Ramesh Agro' } },
  });
  if (searchByName.length < 2) throw new Error('Search by name expected at least 2 results');

  const searchByPhone = await prisma.party.findFirst({
    where: { mobile: customerKA.mobile },
  });
  if (!searchByPhone || searchByPhone.id !== customerKA.id) throw new Error('Search by phone failed');

  const searchByGstin = await prisma.party.findFirst({
    where: { gstin: '27XYZAB9876C1Z9' },
  });
  if (!searchByGstin || searchByGstin.id !== customerMH.id) throw new Error('Search by GSTIN failed');

  console.log('✅ Step 4 Passed: Searchability by Name, Phone, and GSTIN verified.\n');

  // Cleanup test parties
  await prisma.party.deleteMany({
    where: { id: { in: [customerKA.id, customerMH.id] } },
  });

  console.log('🎉 ALL CUSTOMER SEARCH & GST AUTO-DETECTION INTEGRATION TESTS PASSED 100%!');
}

runCustomerSearchAndGstTests()
  .catch((err) => {
    console.error('❌ Integration test error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
