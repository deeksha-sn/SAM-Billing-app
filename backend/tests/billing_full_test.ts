import { prisma } from '../src/db';
import { isInterStateTransaction, calculateItemGst, INDIAN_STATES } from '../src/utils/gstHelper';

async function runBillingTests() {
  console.log('🧪 Starting Full-Screen Billing & GST Engine Integration Tests...\n');

  // Test 1: GST Intra-State vs Inter-State State Code Detection
  console.log('Step 1: Testing Indian State Code & Intra/Inter-State Detection...');
  const companyStateCode = '29'; // Karnataka

  // Same State -> Intra-State
  const isIntra = isInterStateTransaction('29', 'Karnataka', companyStateCode);
  if (isIntra !== false) throw new Error('Expected Intra-State (false) for Karnataka vs Karnataka');

  // Different State -> Inter-State
  const isInter = isInterStateTransaction('27', 'Maharashtra', companyStateCode);
  if (isInter !== true) throw new Error('Expected Inter-State (true) for Maharashtra vs Karnataka');

  console.log('✅ Step 1 Passed: Intra-State & Inter-State correctly detected.\n');

  // Test 2: Live GST Calculations for CGST/SGST vs IGST & Exempt Rates
  console.log('Step 2: Testing GST Calculations for 18% Intra-State, 28% Inter-State, and EXEMPT...');
  
  // 18% Intra-State (CGST 9% + SGST 9%)
  const intraCalc = calculateItemGst({
    quantity: 2,
    rate: 1000,
    discountPercent: 10, // Gross = 2000, Disc = 200, Taxable = 1800
    gstRate: 18,
    isInterState: false,
  });
  if (intraCalc.taxableValue !== 1800) throw new Error(`Taxable expected 1800, got ${intraCalc.taxableValue}`);
  if (intraCalc.cgstAmount !== 162) throw new Error(`CGST expected 162, got ${intraCalc.cgstAmount}`);
  if (intraCalc.sgstAmount !== 162) throw new Error(`SGST expected 162, got ${intraCalc.sgstAmount}`);
  if (intraCalc.igstAmount !== 0) throw new Error(`IGST expected 0, got ${intraCalc.igstAmount}`);
  if (intraCalc.totalAmount !== 2124) throw new Error(`Total expected 2124, got ${intraCalc.totalAmount}`);

  // 28% Inter-State (IGST 28%)
  const interCalc = calculateItemGst({
    quantity: 1,
    rate: 5000,
    gstRate: 28,
    isInterState: true,
  });
  if (interCalc.taxableValue !== 5000) throw new Error(`Taxable expected 5000, got ${interCalc.taxableValue}`);
  if (interCalc.igstAmount !== 1400) throw new Error(`IGST expected 1400, got ${interCalc.igstAmount}`);
  if (interCalc.cgstAmount !== 0 || interCalc.sgstAmount !== 0) throw new Error('CGST/SGST must be 0 for Inter-State');

  // Exempt Rate
  const exemptCalc = calculateItemGst({
    quantity: 5,
    rate: 100,
    gstRate: 0,
    isExempt: true,
    isInterState: false,
  });
  if (exemptCalc.taxableValue !== 500) throw new Error(`Exempt taxable expected 500, got ${exemptCalc.taxableValue}`);
  if (exemptCalc.totalAmount !== 500 || exemptCalc.isExempt !== true) throw new Error('Exempt calculation failed');

  console.log('✅ Step 2 Passed: GST Calculations verified.\n');

  // Test 3: Database Persistence of Sales Invoice with new fields
  console.log('Step 3: Creating test customer & invoice in Prisma DB...');
  const customer = await prisma.party.create({
    data: {
      name: 'Test Billing Customer',
      type: 'CUSTOMER',
      mobile: '9900112233',
      address: 'Plot 45, Industrial Estate',
      district: 'Haveri',
      state: 'Karnataka',
      stateCode: '29',
    },
  });

  const item = await prisma.item.create({
    data: {
      name: 'Test Harvester Blade',
      sku: `THB-${Date.now()}`,
      unit: 'Nos',
      hsnSac: '8436',
      sellingPrice: 1500,
      purchasePrice: 1000,
      currentStock: 100,
      gstRate: 18,
    },
  });

  const testInvNumber = `TEST-INV-${Date.now()}`;
  const inv = await prisma.invoice.create({
    data: {
      invoiceNumber: testInvNumber,
      financialYear: '2026-2027',
      invoiceDate: new Date(),
      partyId: customer.id,
      paymentMode: 'CREDIT',
      paymentTerms: '30 Days',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      transportName: 'VRL Logistics',
      deliveryLocation: 'Haveri Warehouse',
      roundOffEnabled: true,
      roundOff: 0.35,
      taxableAmount: 1500,
      cgstAmount: 135,
      sgstAmount: 135,
      grandTotal: 1770,
      items: {
        create: [
          {
            itemId: item.id,
            itemName: item.name,
            description: 'Heavy duty steel blade',
            hsnSac: '8436',
            unit: 'Nos',
            quantity: 1,
            freeQuantity: 1,
            rate: 1500,
            taxableValue: 1500,
            gstRate: 18,
            cgstAmount: 135,
            sgstAmount: 135,
            totalAmount: 1770,
          },
        ],
      },
    },
    include: { items: true },
  });

  if (inv.transportName !== 'VRL Logistics') throw new Error('transportName not persisted');
  if (inv.paymentTerms !== '30 Days') throw new Error('paymentTerms not persisted');
  if (inv.items[0].description !== 'Heavy duty steel blade') throw new Error('item description not persisted');

  console.log('✅ Step 3 Passed: Invoice persistence verified in Prisma DB.\n');

  // Clean up test records
  await prisma.invoiceItem.deleteMany({ where: { invoiceId: inv.id } });
  await prisma.invoice.delete({ where: { id: inv.id } });
  await prisma.item.delete({ where: { id: item.id } });
  await prisma.party.delete({ where: { id: customer.id } });

  console.log('🎉 ALL BILLING & GST INTEGRATION TESTS PASSED 100%!');
}

runBillingTests()
  .catch((err) => {
    console.error('❌ Integration test error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
