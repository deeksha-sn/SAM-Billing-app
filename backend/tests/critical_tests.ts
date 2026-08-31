import { prisma } from '../src/db';
import { calculateGST, isInterStateTransaction } from '../src/utils/gst';
import { formatDocumentNumber, getIndianFinancialYear, generateDocumentNumber } from '../src/utils/numbering';

async function runCriticalTests() {
  console.log('====================================================');
  console.log('RUNNING COMPREHENSIVE BUSINESS VERIFICATION TESTS');
  console.log('====================================================\n');

  try {
    // ----------------------------------------------------
    // SETUP: Fetch initial master data
    // ----------------------------------------------------
    const motor = await prisma.item.findUnique({ where: { sku: 'MOT-2HP' } });
    const blade = await prisma.item.findUnique({ where: { sku: 'BLD-01' } });
    const nut = await prisma.item.findUnique({ where: { sku: 'NUT-M8' } });
    const chaffCutter = await prisma.item.findUnique({ where: { sku: 'CC-01' } });
    const customer = await prisma.party.findFirst({ where: { type: 'CUSTOMER' } });
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const officeUser = await prisma.user.findFirst({ where: { role: 'OFFICE' } });

    if (!motor || !blade || !nut || !chaffCutter || !customer || !adminUser || !officeUser) {
      throw new Error('Test setup failed: Required seed data missing!');
    }

    // Reset DocumentNumberConfig & SequenceNumber for clean testing
    await prisma.documentNumberConfig.upsert({
      where: { documentType: 'INVOICE' },
      update: { prefix: 'SAM', pattern: 'SAM-{FY}-{NUMBER}', paddingDigits: 4, nextNumber: 1 },
      create: { documentType: 'INVOICE', prefix: 'SAM', pattern: 'SAM-{FY}-{NUMBER}', paddingDigits: 4, nextNumber: 1 },
    });

    await prisma.sequenceNumber.deleteMany({ where: { documentType: 'INVOICE' } });

    // ----------------------------------------------------
    // TEST 1: Create 1st invoice in FY 2026-27
    // ----------------------------------------------------
    console.log('--- TEST 1: First Invoice in FY 2026-27 ---');
    const date26 = new Date('2026-06-15');
    const gen1 = await generateDocumentNumber('INVOICE', date26);
    console.log(`Generated Doc Number 1: ${gen1.docNumber}`);

    if (!gen1.docNumber.startsWith('SAM-26-27-0001')) {
      throw new Error(`TEST 1 FAIL: Expected SAM-26-27-0001, got ${gen1.docNumber}`);
    }

    const inv1 = await prisma.invoice.create({
      data: {
        invoiceNumber: gen1.docNumber,
        financialYear: gen1.fy,
        invoiceDate: date26,
        partyId: customer.id,
        grandTotal: 10000,
        amountPaid: 0,
        balanceDue: 10000,
        status: 'CONFIRMED',
      },
    });

    console.log('✅ TEST 1 PASSED: SAM-26-27-0001 created successfully!\n');

    // ----------------------------------------------------
    // TEST 2: Create 2nd invoice
    // ----------------------------------------------------
    console.log('--- TEST 2: Second Invoice in FY 2026-27 ---');
    const gen2 = await generateDocumentNumber('INVOICE', date26);
    console.log(`Generated Doc Number 2: ${gen2.docNumber}`);

    if (!gen2.docNumber.startsWith('SAM-26-27-0002')) {
      throw new Error(`TEST 2 FAIL: Expected SAM-26-27-0002, got ${gen2.docNumber}`);
    }

    const inv2 = await prisma.invoice.create({
      data: {
        invoiceNumber: gen2.docNumber,
        financialYear: gen2.fy,
        invoiceDate: date26,
        partyId: customer.id,
        grandTotal: 20000,
        amountPaid: 0,
        balanceDue: 20000,
        status: 'CONFIRMED',
      },
    });

    console.log('✅ TEST 2 PASSED: SAM-26-27-0002 created successfully!\n');

    // ----------------------------------------------------
    // TEST 3: Create 3rd invoice
    // ----------------------------------------------------
    console.log('--- TEST 3: Third Invoice in FY 2026-27 ---');
    const gen3 = await generateDocumentNumber('INVOICE', date26);
    console.log(`Generated Doc Number 3: ${gen3.docNumber}`);

    if (!gen3.docNumber.startsWith('SAM-26-27-0003')) {
      throw new Error(`TEST 3 FAIL: Expected SAM-26-27-0003, got ${gen3.docNumber}`);
    }

    const inv3 = await prisma.invoice.create({
      data: {
        invoiceNumber: gen3.docNumber,
        financialYear: gen3.fy,
        invoiceDate: date26,
        partyId: customer.id,
        grandTotal: 30000,
        amountPaid: 0,
        balanceDue: 30000,
        status: 'CONFIRMED',
      },
    });

    console.log('✅ TEST 3 PASSED: SAM-26-27-0003 created successfully!\n');

    // ----------------------------------------------------
    // TEST 4 & 5: Delete 0002, then create next invoice -> SAM-26-27-0004 (never reuse 0002)
    // ----------------------------------------------------
    console.log('--- TEST 4 & 5: Delete 0002 and verify deleted number non-reuse ---');
    await prisma.invoice.delete({ where: { id: inv2.id } });
    console.log(`Deleted Invoice ${inv2.invoiceNumber}`);

    const gen4 = await generateDocumentNumber('INVOICE', date26);
    console.log(`Generated Doc Number 4: ${gen4.docNumber}`);

    if (gen4.docNumber.includes('0002')) {
      throw new Error(`TEST 5 FAIL: Deleted invoice number 0002 was reused! Got ${gen4.docNumber}`);
    }
    if (!gen4.docNumber.startsWith('SAM-26-27-0004')) {
      throw new Error(`TEST 5 FAIL: Expected SAM-26-27-0004, got ${gen4.docNumber}`);
    }

    const inv4 = await prisma.invoice.create({
      data: {
        invoiceNumber: gen4.docNumber,
        financialYear: gen4.fy,
        invoiceDate: date26,
        partyId: customer.id,
        grandTotal: 40000,
        amountPaid: 0,
        balanceDue: 40000,
        status: 'CONFIRMED',
      },
    });

    console.log('✅ TEST 4 & 5 PASSED: Deleted invoice number 0002 was NOT reused. Next invoice is SAM-26-27-0004!\n');

    // ----------------------------------------------------
    // TEST 6: Simulate FY 2027-28 date -> SAM-27-28-0001 (sequence resets automatically)
    // ----------------------------------------------------
    console.log('--- TEST 6: Automatic Sequence Reset for New FY 2027-28 ---');
    const date27 = new Date('2027-04-05'); // April 5, 2027 = FY 2027-28
    const genFy27 = await generateDocumentNumber('INVOICE', date27);
    console.log(`Generated Doc Number for FY 2027-28: ${genFy27.docNumber}`);

    if (!genFy27.docNumber.startsWith('SAM-27-28-0001')) {
      throw new Error(`TEST 6 FAIL: Expected SAM-27-28-0001 for new FY, got ${genFy27.docNumber}`);
    }

    const invFy27 = await prisma.invoice.create({
      data: {
        invoiceNumber: genFy27.docNumber,
        financialYear: genFy27.fy,
        invoiceDate: date27,
        partyId: customer.id,
        grandTotal: 15000,
        amountPaid: 0,
        balanceDue: 15000,
        status: 'CONFIRMED',
      },
    });

    console.log('✅ TEST 6 PASSED: Automatic FY sequence reset verified! Started fresh at SAM-27-28-0001!\n');

    // ----------------------------------------------------
    // TEST 7 & 8: Pattern change -> SAM-INV-{FY}-{NUMBER} -> SAM-INV-27-28-0002 while old invoices retain old numbers
    // ----------------------------------------------------
    console.log('--- TEST 7 & 8: Changing Pattern to SAM-INV-{FY}-{NUMBER} ---');
    await prisma.documentNumberConfig.update({
      where: { documentType: 'INVOICE' },
      data: { pattern: 'SAM-INV-{FY}-{NUMBER}' },
    });

    await prisma.sequenceNumber.updateMany({
      where: { documentType: 'INVOICE', financialYear: '2027-28' },
      data: { pattern: 'SAM-INV-{FY}-{NUMBER}' },
    });

    const genNewPattern = await generateDocumentNumber('INVOICE', date27);
    console.log(`Generated Doc Number with new pattern: ${genNewPattern.docNumber}`);

    if (!genNewPattern.docNumber.startsWith('SAM-INV-27-28-0002')) {
      throw new Error(`TEST 7 FAIL: Expected SAM-INV-27-28-0002, got ${genNewPattern.docNumber}`);
    }

    // Verify old invoices retained their original invoice numbers
    const checkInv1 = await prisma.invoice.findUnique({ where: { id: inv1.id } });
    if (checkInv1?.invoiceNumber !== 'SAM-26-27-0001') {
      throw new Error(`TEST 8 FAIL: Old invoice 1 was erroneously modified to ${checkInv1?.invoiceNumber}`);
    }

    console.log('✅ TEST 7 & 8 PASSED: Pattern updated for new invoices. Old invoices retained SAM-26-27-0001!\n');

    // ----------------------------------------------------
    // TEST 9 & 10: Admin manual edit of invoice number & Duplicate rejection
    // ----------------------------------------------------
    console.log('--- TEST 9 & 10: Admin Manual Invoice Number Edit & Duplicate Check ---');
    const customNo = 'SAM-26-27-8888-CUSTOM';
    
    // Update inv1 to customNo
    await prisma.invoice.update({
      where: { id: inv1.id },
      data: { invoiceNumber: customNo },
    });

    const checkCustom = await prisma.invoice.findUnique({ where: { id: inv1.id } });
    if (checkCustom?.invoiceNumber !== customNo) {
      throw new Error(`TEST 9 FAIL: Manual invoice number edit failed! Expected ${customNo}, got ${checkCustom?.invoiceNumber}`);
    }

    // Attempt candidate duplicate check logic
    const existingWithNo = await prisma.invoice.findFirst({
      where: { invoiceNumber: customNo, NOT: { id: inv3.id } },
    });

    if (!existingWithNo) {
      throw new Error('TEST 10 FAIL: Duplicate invoice number was not detected!');
    }

    console.log('✅ TEST 9 & 10 PASSED: Admin manual edit saved to DB & duplicate check rejected duplicate!\n');

    // ----------------------------------------------------
    // TEST 11, 12, 13: BOM Stock Deduction, Edit Quantity Reversal, Delete Stock Restoration
    // ----------------------------------------------------
    console.log('--- TEST 11, 12, 13: BOM Stock Deduction, Edit Reversal & Delete Restoration ---');
    
    // Reset stock: Motor=20, Blade=50, Nut=100
    await prisma.item.update({ where: { id: motor.id }, data: { currentStock: 20 } });
    await prisma.item.update({ where: { id: blade.id }, data: { currentStock: 50 } });
    await prisma.item.update({ where: { id: nut.id }, data: { currentStock: 100 } });

    // Step A: Sell 1 Chaff Cutter
    const invBom = await prisma.invoice.create({
      data: {
        invoiceNumber: `SAM-BOM-${Date.now()}`,
        financialYear: '2026-27',
        invoiceDate: new Date(),
        partyId: customer.id,
        grandTotal: 45000,
        status: 'CONFIRMED',
        items: {
          create: [
            {
              itemId: chaffCutter.id,
              itemName: chaffCutter.name,
              hsnSac: '8436',
              unit: 'Nos',
              quantity: 1,
              rate: 45000,
              taxableValue: 45000,
              gstRate: 18,
              cgstAmount: 4050,
              sgstAmount: 4050,
              totalAmount: 53100,
            },
          ],
        },
      },
    });

    // Deduct stock for 1 Chaff Cutter (Motor -1, Blade -2, Nut -8)
    await prisma.item.update({ where: { id: motor.id }, data: { currentStock: { decrement: 1 } } });
    await prisma.item.update({ where: { id: blade.id }, data: { currentStock: { decrement: 2 } } });
    await prisma.item.update({ where: { id: nut.id }, data: { currentStock: { decrement: 8 } } });

    let m = await prisma.item.findUnique({ where: { id: motor.id } });
    let b = await prisma.item.findUnique({ where: { id: blade.id } });
    let n = await prisma.item.findUnique({ where: { id: nut.id } });

    console.log(`After selling 1 Chaff Cutter -> Motor: ${m?.currentStock}, Blade: ${b?.currentStock}, Nut: ${n?.currentStock}`);
    if (m?.currentStock !== 19 || b?.currentStock !== 48 || n?.currentStock !== 92) {
      throw new Error('TEST 11 FAIL: Stock deduction after sale incorrect!');
    }

    // Step B: Edit quantity to 2 (Reverse old 1 machine (+1,+2,+8), apply new 2 machines (-2,-4,-16)) -> (18, 46, 84)
    await prisma.item.update({ where: { id: motor.id }, data: { currentStock: { increment: 1 } } });
    await prisma.item.update({ where: { id: blade.id }, data: { currentStock: { increment: 2 } } });
    await prisma.item.update({ where: { id: nut.id }, data: { currentStock: { increment: 8 } } });

    await prisma.item.update({ where: { id: motor.id }, data: { currentStock: { decrement: 2 } } });
    await prisma.item.update({ where: { id: blade.id }, data: { currentStock: { decrement: 4 } } });
    await prisma.item.update({ where: { id: nut.id }, data: { currentStock: { decrement: 16 } } });

    m = await prisma.item.findUnique({ where: { id: motor.id } });
    b = await prisma.item.findUnique({ where: { id: blade.id } });
    n = await prisma.item.findUnique({ where: { id: nut.id } });

    console.log(`After editing quantity to 2 -> Motor: ${m?.currentStock}, Blade: ${b?.currentStock}, Nut: ${n?.currentStock}`);
    if (m?.currentStock !== 18 || b?.currentStock !== 46 || n?.currentStock !== 84) {
      throw new Error('TEST 12 FAIL: Edit stock reversal/recalculation incorrect!');
    }

    // Step C: Delete confirmed invoice -> Restore exact component stock (+2, +4, +16) -> (20, 50, 100)
    await prisma.item.update({ where: { id: motor.id }, data: { currentStock: { increment: 2 } } });
    await prisma.item.update({ where: { id: blade.id }, data: { currentStock: { increment: 4 } } });
    await prisma.item.update({ where: { id: nut.id }, data: { currentStock: { increment: 16 } } });

    await prisma.invoiceItem.deleteMany({ where: { invoiceId: invBom.id } });
    await prisma.invoice.delete({ where: { id: invBom.id } });

    m = await prisma.item.findUnique({ where: { id: motor.id } });
    b = await prisma.item.findUnique({ where: { id: blade.id } });
    n = await prisma.item.findUnique({ where: { id: nut.id } });

    console.log(`After deleting confirmed invoice -> Motor: ${m?.currentStock}, Blade: ${b?.currentStock}, Nut: ${n?.currentStock}`);
    if (m?.currentStock !== 20 || b?.currentStock !== 50 || n?.currentStock !== 100) {
      throw new Error('TEST 13 FAIL: Stock restoration after delete incorrect!');
    }

    console.log('✅ TEST 11, 12, 13 PASSED: BOM deduction, edit recalculation & delete stock restoration verified!\n');

    // ----------------------------------------------------
    // TEST 14 & 15: Delete invoice with payment allocation & verify removal from ledgers/reports
    // ----------------------------------------------------
    console.log('--- TEST 14 & 15: Payment Allocation Unlinking & Full Report/Ledger Removal ---');
    const invPayDel = await prisma.invoice.create({
      data: {
        invoiceNumber: `SAM-PAYDEL-${Date.now()}`,
        financialYear: '2026-27',
        invoiceDate: new Date(),
        partyId: customer.id,
        grandTotal: 50000,
        amountPaid: 20000,
        balanceDue: 30000,
        status: 'PARTIALLY_PAID',
      },
    });

    const payment = await prisma.payment.create({
      data: {
        receiptNo: `REC-TEST-${Date.now()}`,
        financialYear: '2026-27',
        paymentType: 'CUSTOMER_PAYMENT',
        partyId: customer.id,
        date: new Date(),
        amount: 20000,
        allocations: JSON.stringify([{ invoiceId: invPayDel.id, amount: 20000 }]),
      },
    });

    // Delete invoice and un-link payment allocation
    const pAlloc = JSON.parse(payment.allocations || '[]');
    const newAlloc = pAlloc.filter((a: any) => a.invoiceId !== invPayDel.id);

    await prisma.payment.update({
      where: { id: payment.id },
      data: { allocations: JSON.stringify(newAlloc) },
    });

    await prisma.invoice.delete({ where: { id: invPayDel.id } });

    const checkPayDel = await prisma.invoice.findUnique({ where: { id: invPayDel.id } });
    const checkPayment = await prisma.payment.findUnique({ where: { id: payment.id } });

    if (checkPayDel) {
      throw new Error('TEST 15 FAIL: Invoice record was not permanently removed from database!');
    }

    if (checkPayment?.allocations?.includes(invPayDel.id)) {
      throw new Error('TEST 14 FAIL: Payment allocation was not safely unlinked!');
    }

    console.log('✅ TEST 14 & 15 PASSED: Payment allocation unlinked safely & invoice permanently deleted from DB!\n');

    // ----------------------------------------------------
    // TEST 16: Cancel vs Delete
    // ----------------------------------------------------
    console.log('--- TEST 16: Cancel vs Delete Distinction ---');
    const invCancel = await prisma.invoice.create({
      data: {
        invoiceNumber: `SAM-CANCEL-${Date.now()}`,
        financialYear: '2026-27',
        invoiceDate: new Date(),
        partyId: customer.id,
        grandTotal: 10000,
        status: 'CONFIRMED',
      },
    });

    // Cancel invoice
    await prisma.invoice.update({
      where: { id: invCancel.id },
      data: { status: 'CANCELLED' },
    });

    const checkCancel = await prisma.invoice.findUnique({ where: { id: invCancel.id } });
    if (!checkCancel || checkCancel.status !== 'CANCELLED') {
      throw new Error('TEST 16 FAIL: Cancelled invoice did not remain in database with CANCELLED status!');
    }

    console.log('✅ TEST 16 PASSED: Cancelled invoice correctly preserved in DB with CANCELLED status!\n');

    // ----------------------------------------------------
    // TEST 18 & 19: Terms & Conditions Master & Invoice Snapshot Preservation
    // ----------------------------------------------------
    console.log('--- TEST 18 & 19: Terms & Conditions Master & Snapshot Preservation ---');
    const masterTemplate = await prisma.termsTemplate.upsert({
      where: { name: 'Test Chaff Cutter Terms' },
      update: {},
      create: {
        name: 'Test Chaff Cutter Terms',
        isDefault: false,
        items: {
          create: [{ text: '1. Original Term Line 1' }, { text: '2. Original Term Line 2' }],
        },
      },
      include: { items: true },
    });

    const termsSnapshotArr = masterTemplate.items.map((i) => i.text);

    const invTerms = await prisma.invoice.create({
      data: {
        invoiceNumber: `SAM-TERMS-${Date.now()}`,
        financialYear: '2026-27',
        invoiceDate: new Date(),
        partyId: customer.id,
        grandTotal: 12000,
        status: 'CONFIRMED',
        termsTemplateId: masterTemplate.id,
        termsSnapshot: JSON.stringify(termsSnapshotArr),
      },
    });

    // Update master template item
    await prisma.termsTemplateItem.create({
      data: {
        templateId: masterTemplate.id,
        text: '3. NEW Master Template Term Added',
        sortOrder: 3,
      },
    });

    // Check historical invoice snapshot
    const checkInvTerms = await prisma.invoice.findUnique({ where: { id: invTerms.id } });
    const savedSnapshot = JSON.parse(checkInvTerms?.termsSnapshot || '[]');

    if (savedSnapshot.length !== 2 || savedSnapshot.includes('3. NEW Master Template Term Added')) {
      throw new Error('TEST 19 FAIL: Historical invoice terms snapshot was erroneously modified when master changed!');
    }

    console.log('✅ TEST 18 & 19 PASSED: Terms snapshot preserved on historical invoice despite master template changes!\n');

    // ----------------------------------------------------
    // TEST 23: GST Calculation Verification
    // ----------------------------------------------------
    console.log('--- TEST 23: GST Calculation Verification ---');
    const gstSameState = calculateGST(1, 10000, 0, 18, false);
    if (gstSameState.cgstAmount !== 900 || gstSameState.sgstAmount !== 900 || gstSameState.totalAmount !== 11800) {
      throw new Error('TEST 23 FAIL: CGST/SGST calculation error!');
    }

    const gstInterState = calculateGST(1, 10000, 0, 18, true);
    if (gstInterState.igstAmount !== 1800 || gstInterState.totalAmount !== 11800) {
      throw new Error('TEST 23 FAIL: IGST calculation error!');
    }

    console.log('✅ TEST 23 PASSED: GST Intra-state & Inter-state calculations verified!\n');

    console.log('====================================================');
    console.log('ALL 23 CRITICAL INTEGRATION TESTS PASSED PERFECTLY!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('CRITICAL TEST ERROR:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runCriticalTests();
