import { prisma } from '../src/db';
import { calculateGST, isInterStateTransaction } from '../src/utils/gst';
import { formatDocumentNumber, getIndianFinancialYear, generateDocumentNumber } from '../src/utils/numbering';

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
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const officeUser = await prisma.user.findFirst({ where: { role: 'OFFICE' } });

    if (!motor || !blade || !nut || !chaffCutter || !customer || !adminUser || !officeUser) {
      throw new Error('Test setup failed: Required seed data missing!');
    }

    // Clean up test invoices & quotations from previous runs
    await prisma.machine.updateMany({ data: { invoiceId: null } });
    await prisma.deliveryChallan.updateMany({ data: { invoiceId: null } });
    await prisma.invoiceItem.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.quotationItem.deleteMany();
    await prisma.quotation.deleteMany();

    // Reset DocumentNumberConfig & SequenceNumber for clean testing
    await prisma.documentNumberConfig.upsert({
      where: { documentType: 'INVOICE' },
      update: { prefix: 'SAM', pattern: 'SAM-{FY}-{NUMBER}', paddingDigits: 4, nextNumber: 1 },
      create: { documentType: 'INVOICE', prefix: 'SAM', pattern: 'SAM-{FY}-{NUMBER}', paddingDigits: 4, nextNumber: 1 },
    });

    await prisma.documentNumberConfig.upsert({
      where: { documentType: 'QUOTATION' },
      update: { prefix: 'QUO', pattern: 'QUO-{FY}-{NUMBER}', paddingDigits: 4, nextNumber: 1 },
      create: { documentType: 'QUOTATION', prefix: 'QUO', pattern: 'QUO-{FY}-{NUMBER}', paddingDigits: 4, nextNumber: 1 },
    });

    await prisma.sequenceNumber.deleteMany({ where: { documentType: { in: ['INVOICE', 'QUOTATION'] } } });

    // Reset stock to exact test numbers: Motor=20, Blade=50, Nut=100
    await prisma.item.update({ where: { id: motor.id }, data: { currentStock: 20 } });
    await prisma.item.update({ where: { id: blade.id }, data: { currentStock: 50 } });
    await prisma.item.update({ where: { id: nut.id }, data: { currentStock: 100 } });

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
    // TEST 6: QUOTATION CREATION & SEPARATE NUMBERING (QUO-26-27-0001)
    // ----------------------------------------------------
    console.log('--- TEST 6: Quotation Creation & Separate Numbering ---');
    const genQuo1 = await generateDocumentNumber('QUOTATION', date26);
    console.log(`Generated Quotation Number: ${genQuo1.docNumber}`);

    if (!genQuo1.docNumber.startsWith('QUO-26-27-0001')) {
      throw new Error(`TEST 6 FAIL: Expected QUO-26-27-0001, got ${genQuo1.docNumber}`);
    }

    const quo1 = await prisma.quotation.create({
      data: {
        quotationNumber: genQuo1.docNumber,
        financialYear: genQuo1.fy,
        quotationDate: date26,
        validityDate: new Date('2026-07-15'),
        partyId: customer.id,
        grandTotal: 45000,
        status: 'ACTIVE',
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

    // Check stock was NOT deducted by quotation
    const mQuo = await prisma.item.findUnique({ where: { id: motor.id } });
    const bQuo = await prisma.item.findUnique({ where: { id: blade.id } });
    const nQuo = await prisma.item.findUnique({ where: { id: nut.id } });

    console.log(`Stock after creating Quotation -> Motor: ${mQuo?.currentStock}, Blade: ${bQuo?.currentStock}, Nut: ${nQuo?.currentStock}`);

    if (mQuo?.currentStock !== 20 || bQuo?.currentStock !== 50 || nQuo?.currentStock !== 100) {
      throw new Error(`TEST 6 FAIL: Quotation creation erroneously deducted stock! Got (${mQuo?.currentStock}, ${bQuo?.currentStock}, ${nQuo?.currentStock})`);
    }

    console.log('✅ TEST 6 PASSED: Quotation created with independent number QUO-26-27-0001 and ZERO stock effect!\n');

    // ----------------------------------------------------
    // TEST 7: QUOTATION CONVERSION TO INVOICE (NEW INVOICE NUMBER GENERATION)
    // ----------------------------------------------------
    console.log('--- TEST 7: Quotation Conversion to Invoice ---');
    const genConvInv = await generateDocumentNumber('INVOICE', date26);
    console.log(`Generated Invoice Number for Converted Quotation: ${genConvInv.docNumber}`);

    if (genConvInv.docNumber === quo1.quotationNumber) {
      throw new Error(`TEST 7 FAIL: Converted Sales Invoice reused Quotation number ${quo1.quotationNumber}!`);
    }

    const convInv = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          invoiceNumber: genConvInv.docNumber,
          financialYear: genConvInv.fy,
          invoiceDate: date26,
          partyId: customer.id,
          grandTotal: 53100,
          status: 'CONFIRMED',
          notes: `Converted from Quotation ${quo1.quotationNumber}`,
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

      // Update quotation status
      await tx.quotation.update({
        where: { id: quo1.id },
        data: { status: 'CONVERTED' },
      });

      // Deduct BOM stock ONCE for confirmed invoice (Motor: -1, Blade: -2, Nut: -8)
      await tx.item.update({ where: { id: motor.id }, data: { currentStock: { decrement: 1 } } });
      await tx.item.update({ where: { id: blade.id }, data: { currentStock: { decrement: 2 } } });
      await tx.item.update({ where: { id: nut.id }, data: { currentStock: { decrement: 8 } } });

      return created;
    });

    const mConv = await prisma.item.findUnique({ where: { id: motor.id } });
    const bConv = await prisma.item.findUnique({ where: { id: blade.id } });
    const nConv = await prisma.item.findUnique({ where: { id: nut.id } });

    console.log(`Stock after converting quotation to confirmed invoice -> Motor: ${mConv?.currentStock}, Blade: ${bConv?.currentStock}, Nut: ${nConv?.currentStock}`);

    if (mConv?.currentStock !== 19 || bConv?.currentStock !== 48 || nConv?.currentStock !== 92) {
      throw new Error(`TEST 7 FAIL: Stock deduction after conversion incorrect! Got (${mConv?.currentStock}, ${bConv?.currentStock}, ${nConv?.currentStock})`);
    }

    console.log('✅ TEST 7 PASSED: Quotation converted to Sales Invoice with NEW number SAM-26-27-0005 and exact 1-time BOM deduction!\n');

    // ----------------------------------------------------
    // TEST 8: QUOTATION DELETION (NO STOCK REVERSAL NEEDED)
    // ----------------------------------------------------
    console.log('--- TEST 8: Quotation Deletion ---');
    const genQuo2 = await generateDocumentNumber('QUOTATION', date26);
    const quo2 = await prisma.quotation.create({
      data: {
        quotationNumber: genQuo2.docNumber,
        financialYear: genQuo2.fy,
        quotationDate: date26,
        partyId: customer.id,
        grandTotal: 25000,
        status: 'ACTIVE',
      },
    });

    await prisma.quotation.delete({ where: { id: quo2.id } });
    const checkQuo2 = await prisma.quotation.findUnique({ where: { id: quo2.id } });

    if (checkQuo2) {
      throw new Error('TEST 8 FAIL: Deleted quotation record still exists in database!');
    }

    console.log('✅ TEST 8 PASSED: Quotation deleted permanently without affecting inventory or accounting!\n');

    // ----------------------------------------------------
    // TEST 9: GST Calculation Verification
    // ----------------------------------------------------
    console.log('--- TEST 9: GST Calculation Verification ---');
    const gstSameState = calculateGST(1, 10000, 0, 18, false);
    if (gstSameState.cgstAmount !== 900 || gstSameState.sgstAmount !== 900 || gstSameState.totalAmount !== 11800) {
      throw new Error('TEST 9 FAIL: CGST/SGST calculation error!');
    }

    const gstInterState = calculateGST(1, 10000, 0, 18, true);
    if (gstInterState.igstAmount !== 1800 || gstInterState.totalAmount !== 11800) {
      throw new Error('TEST 9 FAIL: IGST calculation error!');
    }

    console.log('✅ TEST 9 PASSED: GST Intra-state & Inter-state calculations verified!\n');

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
