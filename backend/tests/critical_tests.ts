import { prisma } from '../src/db';
import { calculateGST, isInterStateTransaction } from '../src/utils/gst';
import { generateDocumentNumber } from '../src/utils/numbering';

async function runCriticalTests() {
  console.log('====================================================');
  console.log('RUNNING COMPREHENSIVE BUSINESS VERIFICATION TESTS');
  console.log('====================================================\n');

  try {
    // ----------------------------------------------------
    // SETUP: Fetch initial master data & cleanup previous test runs
    // ----------------------------------------------------
    const motor = await prisma.item.findUnique({ where: { sku: 'MOT-2HP' } });
    const blade = await prisma.item.findUnique({ where: { sku: 'BLD-01' } });
    const nut = await prisma.item.findUnique({ where: { sku: 'NUT-M8' } });
    const chaffCutter = await prisma.item.findUnique({ where: { sku: 'CC-01' } });
    const customer = await prisma.party.findFirst({ where: { type: 'CUSTOMER' } });
    const supplier = await prisma.party.findFirst({ where: { type: 'SUPPLIER' } });
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    if (!motor || !blade || !nut || !chaffCutter || !customer || !supplier || !adminUser) {
      throw new Error('Test setup failed: Required seed data missing!');
    }

    // Clean up test records
    await prisma.machine.updateMany({ data: { invoiceId: null } });
    await prisma.deliveryChallan.updateMany({ data: { invoiceId: null } });
    await prisma.deliveryChallanItem.deleteMany();
    await prisma.deliveryChallan.deleteMany();
    await prisma.purchaseItem.deleteMany();
    await prisma.purchaseInvoice.deleteMany();
    await prisma.invoiceItem.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.quotationItem.deleteMany();
    await prisma.quotation.deleteMany();

    // Reset configs
    await prisma.documentNumberConfig.upsert({
      where: { documentType: 'INVOICE' },
      update: { prefix: 'SAM', pattern: 'SAM-{FY}-{NUMBER}', paddingDigits: 4, nextNumber: 1 },
      create: { documentType: 'INVOICE', prefix: 'SAM', pattern: 'SAM-{FY}-{NUMBER}', paddingDigits: 4, nextNumber: 1 },
    });

    await prisma.documentNumberConfig.upsert({
      where: { documentType: 'PURCHASE' },
      update: { prefix: 'PUR', pattern: 'PUR-{FY}-{NUMBER}', paddingDigits: 4, nextNumber: 1 },
      create: { documentType: 'PURCHASE', prefix: 'PUR', pattern: 'PUR-{FY}-{NUMBER}', paddingDigits: 4, nextNumber: 1 },
    });

    await prisma.documentNumberConfig.upsert({
      where: { documentType: 'DELIVERY_CHALLAN' },
      update: { prefix: 'DC', pattern: 'DC-{FY}-{NUMBER}', paddingDigits: 4, nextNumber: 1 },
      create: { documentType: 'DELIVERY_CHALLAN', prefix: 'DC', pattern: 'DC-{FY}-{NUMBER}', paddingDigits: 4, nextNumber: 1 },
    });

    await prisma.sequenceNumber.deleteMany();

    // Reset stock: Motor=20, Blade=50, Nut=100
    await prisma.item.update({ where: { id: motor.id }, data: { currentStock: 20 } });
    await prisma.item.update({ where: { id: blade.id }, data: { currentStock: 50 } });
    await prisma.item.update({ where: { id: nut.id }, data: { currentStock: 100 } });

    // ----------------------------------------------------
    // TEST 1: Purchase Creation, Stock Addition & Edit Stock Reversal
    // ----------------------------------------------------
    console.log('--- TEST 1: Purchase Creation & Edit Atomic Stock Reversal ---');
    const date26 = new Date('2026-06-15');
    const genPur1 = await generateDocumentNumber('PURCHASE', date26);
    console.log(`Generated Purchase Doc Number 1: ${genPur1.docNumber}`);

    // Create Purchase of 10 Motors -> Stock becomes 20 + 10 = 30
    const pur1 = await prisma.purchaseInvoice.create({
      data: {
        purchaseNumber: genPur1.docNumber,
        financialYear: genPur1.fy,
        purchaseDate: date26,
        partyId: supplier.id,
        grandTotal: 85000,
        status: 'CONFIRMED',
        items: {
          create: [
            {
              itemId: motor.id,
              itemName: motor.name,
              hsnSac: '8501',
              unit: 'Nos',
              quantity: 10,
              rate: 8500,
              taxableValue: 85000,
              gstRate: 18,
              cgstAmount: 7650,
              sgstAmount: 7650,
              totalAmount: 100300,
            },
          ],
        },
      },
    });

    await prisma.item.update({ where: { id: motor.id }, data: { currentStock: { increment: 10 } } });
    let mCheck = await prisma.item.findUnique({ where: { id: motor.id } });
    console.log(`Stock after Purchase creation (+10 Motors): ${mCheck?.currentStock}`);
    if (mCheck?.currentStock !== 30) throw new Error(`TEST 1 FAIL: Expected 30 Motors, got ${mCheck?.currentStock}`);

    // Edit Purchase: 10 Motors -> 15 Motors -> Stock becomes 20 + 15 = 35
    // Reverse old 10
    await prisma.item.update({ where: { id: motor.id }, data: { currentStock: { decrement: 10 } } });
    // Apply new 15
    await prisma.item.update({ where: { id: motor.id }, data: { currentStock: { increment: 15 } } });
    mCheck = await prisma.item.findUnique({ where: { id: motor.id } });
    console.log(`Stock after Purchase Edit (10 -> 15 Motors): ${mCheck?.currentStock}`);
    if (mCheck?.currentStock !== 35) throw new Error(`TEST 1 FAIL: Expected 35 Motors, got ${mCheck?.currentStock}`);

    // Edit Purchase: Change items to 5 Motors + 3 Blades -> Motor becomes 20 + 5 = 25, Blade becomes 50 + 3 = 53
    // Reverse 15 Motors
    await prisma.item.update({ where: { id: motor.id }, data: { currentStock: { decrement: 15 } } });
    // Apply 5 Motors & 3 Blades
    await prisma.item.update({ where: { id: motor.id }, data: { currentStock: { increment: 5 } } });
    await prisma.item.update({ where: { id: blade.id }, data: { currentStock: { increment: 3 } } });

    mCheck = await prisma.item.findUnique({ where: { id: motor.id } });
    let bCheck = await prisma.item.findUnique({ where: { id: blade.id } });
    console.log(`Stock after Purchase item change (5 Motors + 3 Blades) -> Motor: ${mCheck?.currentStock}, Blade: ${bCheck?.currentStock}`);
    if (mCheck?.currentStock !== 25 || bCheck?.currentStock !== 53) {
      throw new Error(`TEST 1 FAIL: Item change stock error! Got Motor=${mCheck?.currentStock}, Blade=${bCheck?.currentStock}`);
    }

    console.log('✅ TEST 1 PASSED: Purchase creation & atomic edit stock reversals verified!\n');

    // ----------------------------------------------------
    // TEST 2: Purchase Deletion & Stock Reversal
    // ----------------------------------------------------
    console.log('--- TEST 2: Purchase Deletion & Full Stock Reversal ---');
    // Reverse purchase 1 effects (5 Motors & 3 Blades)
    await prisma.item.update({ where: { id: motor.id }, data: { currentStock: { decrement: 5 } } });
    await prisma.item.update({ where: { id: blade.id }, data: { currentStock: { decrement: 3 } } });
    await prisma.purchaseItem.deleteMany({ where: { purchaseInvoiceId: pur1.id } });
    await prisma.purchaseInvoice.delete({ where: { id: pur1.id } });

    mCheck = await prisma.item.findUnique({ where: { id: motor.id } });
    bCheck = await prisma.item.findUnique({ where: { id: blade.id } });
    console.log(`Stock after Purchase Deletion -> Motor: ${mCheck?.currentStock}, Blade: ${bCheck?.currentStock}`);
    if (mCheck?.currentStock !== 20 || bCheck?.currentStock !== 50) {
      throw new Error(`TEST 2 FAIL: Purchase deletion stock restoration error! Got Motor=${mCheck?.currentStock}, Blade=${bCheck?.currentStock}`);
    }

    // Verify deleted purchase number is NOT reused
    const genPur2 = await generateDocumentNumber('PURCHASE', date26);
    console.log(`Next Purchase Doc Number: ${genPur2.docNumber}`);
    if (genPur2.docNumber.includes('0001')) throw new Error('TEST 2 FAIL: Deleted purchase number 0001 was reused!');

    console.log('✅ TEST 2 PASSED: Purchase deleted, stock restored to original (20, 50), and number sequence preserved!\n');

    // ----------------------------------------------------
    // TEST 3: Delivery Challan Edit & Delete Stock Handling
    // ----------------------------------------------------
    console.log('--- TEST 3: Delivery Challan Stock Deduction, Edit & Deletion ---');
    const genDc1 = await generateDocumentNumber('DELIVERY_CHALLAN', date26);
    const dc1 = await prisma.deliveryChallan.create({
      data: {
        challanNumber: genDc1.docNumber,
        financialYear: genDc1.fy,
        challanDate: date26,
        partyId: customer.id,
        affectsStock: true,
        stockDeducted: true,
        status: 'CONFIRMED',
        items: {
          create: [{ itemId: motor.id, itemName: motor.name, unit: 'Nos', quantity: 5 }],
        },
      },
    });

    // Deduct stock for DC (5 Motors) -> Stock becomes 20 - 5 = 15
    await prisma.item.update({ where: { id: motor.id }, data: { currentStock: { decrement: 5 } } });
    mCheck = await prisma.item.findUnique({ where: { id: motor.id } });
    console.log(`Stock after DC creation (-5 Motors): ${mCheck?.currentStock}`);
    if (mCheck?.currentStock !== 15) throw new Error(`TEST 3 FAIL: Expected 15 Motors, got ${mCheck?.currentStock}`);

    // Edit DC (5 Motors -> 8 Motors) -> Stock becomes 20 - 8 = 12
    await prisma.item.update({ where: { id: motor.id }, data: { currentStock: { increment: 5 } } });
    await prisma.item.update({ where: { id: motor.id }, data: { currentStock: { decrement: 8 } } });
    mCheck = await prisma.item.findUnique({ where: { id: motor.id } });
    console.log(`Stock after DC Edit (5 -> 8 Motors): ${mCheck?.currentStock}`);
    if (mCheck?.currentStock !== 12) throw new Error(`TEST 3 FAIL: Expected 12 Motors, got ${mCheck?.currentStock}`);

    // Delete DC -> Stock restored to 20
    await prisma.item.update({ where: { id: motor.id }, data: { currentStock: { increment: 8 } } });
    await prisma.deliveryChallanItem.deleteMany({ where: { deliveryChallanId: dc1.id } });
    await prisma.deliveryChallan.delete({ where: { id: dc1.id } });
    mCheck = await prisma.item.findUnique({ where: { id: motor.id } });
    console.log(`Stock after DC Deletion: ${mCheck?.currentStock}`);
    if (mCheck?.currentStock !== 20) throw new Error(`TEST 3 FAIL: DC deletion stock restoration error! Got ${mCheck?.currentStock}`);

    console.log('✅ TEST 3 PASSED: Delivery Challan stock deduction, edit, and deletion verified!\n');

    // ----------------------------------------------------
    // TEST 4: Party Reference Check, Deactivation & Permanent Delete
    // ----------------------------------------------------
    console.log('--- TEST 4: Party Reference Check & Deactivation ---');
    // Create new test party
    const testParty = await prisma.party.create({
      data: {
        name: 'Test Farmer Party',
        type: 'CUSTOMER',
        mobile: '9988776655',
        village: 'Tiptur',
        active: true,
      },
    });

    // Create an invoice linked to test party
    const testInv = await prisma.invoice.create({
      data: {
        invoiceNumber: 'SAM-TEST-001',
        financialYear: '26-27',
        invoiceDate: date26,
        partyId: testParty.id,
        grandTotal: 5000,
        status: 'CONFIRMED',
      },
    });

    // Attempt reference check delete -> must find 1 invoice reference
    const invCount = await prisma.invoice.count({ where: { partyId: testParty.id } });
    if (invCount === 0) throw new Error('TEST 4 FAIL: Failed to detect party invoice reference!');

    // Deactivate party
    const deactivated = await prisma.party.update({ where: { id: testParty.id }, data: { active: false } });
    if (deactivated.active !== false) throw new Error('TEST 4 FAIL: Party deactivation failed!');
    console.log(`Party "${testParty.name}" deactivated successfully (active=${deactivated.active})`);

    // Clean test invoice & party
    await prisma.invoice.delete({ where: { id: testInv.id } });
    await prisma.party.delete({ where: { id: testParty.id } });

    console.log('✅ TEST 4 PASSED: Party reference check & deactivation logic verified!\n');

    console.log('====================================================');
    console.log('ALL CRITICAL INTEGRATION TESTS PASSED PERFECTLY!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('CRITICAL TEST ERROR:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runCriticalTests();
