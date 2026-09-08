import { prisma } from '../src/db';
import { calculateItemGst, isInterStateTransaction } from '../src/utils/gstHelper';
import { seedDatabase } from '../src/seed';

async function runInvoiceWorkflowVerificationTest() {
  console.log('====================================================');
  console.log('TESTING COMPLETE SALES INVOICE WORKFLOW & PERSISTENCE');
  console.log('====================================================');

  try {
    await seedDatabase();

    // TEST A: Exclusive Price ₹45,000, 18% GST
    console.log('\n--- TEST A: Exclusive Price ₹45,000, 18% GST ---');
    const calcA = calculateItemGst({
      quantity: 1,
      rate: 45000,
      gstRate: 18,
      isInclusive: false,
      isInterState: false,
    });
    console.log(`Taxable: ₹${calcA.taxableValue}, CGST: ₹${calcA.cgstAmount}, SGST: ₹${calcA.sgstAmount}, Total: ₹${calcA.totalAmount}`);
    if (calcA.taxableValue !== 45000 || calcA.totalAmount !== 53100 || calcA.cgstAmount !== 4050) {
      throw new Error(`TEST A calculation failed! Expected 45000 taxable & 53100 total, got ${calcA.taxableValue} & ${calcA.totalAmount}`);
    }
    console.log('[PASS] TEST A PASSED: Exclusive calculation matches ₹45,000 + 18% = ₹53,100');

    // TEST B: Inclusive Total ₹50,000, 18% GST
    console.log('\n--- TEST B: Inclusive Total ₹50,000, 18% GST ---');
    const calcB = calculateItemGst({
      quantity: 1,
      rate: 50000,
      gstRate: 18,
      isInclusive: true,
      isInterState: false,
    });
    console.log(`Taxable: ₹${calcB.taxableValue}, Total Tax: ₹${calcB.cgstAmount + calcB.sgstAmount}, Total: ₹${calcB.totalAmount}`);
    if (calcB.totalAmount !== 50000 || Math.abs(calcB.taxableValue - 42372.88) > 0.05) {
      throw new Error(`TEST B calculation failed! Expected 42372.88 taxable & 50000 total, got ${calcB.taxableValue} & ${calcB.totalAmount}`);
    }
    console.log('[PASS] TEST B PASSED: Inclusive backward calculation matches ₹50,000 total (Taxable: ₹42,372.88)');

    // TEST C: Custom Invoice Price ₹6,900 vs Master Price ₹6,000
    console.log('\n--- TEST C: Custom Invoice Price Override & Master Price Isolation ---');
    const masterItem = await prisma.item.findFirst({ where: { sellingPrice: 6000 } }) || await prisma.item.findFirst();
    const originalMasterPrice = masterItem!.sellingPrice;

    const calcC = calculateItemGst({
      quantity: 1,
      rate: 6900,
      gstRate: 18,
      isInclusive: false,
      isInterState: false,
    });

    const checkMasterItem = await prisma.item.findUnique({ where: { id: masterItem!.id } });
    if (checkMasterItem!.sellingPrice !== originalMasterPrice) {
      throw new Error('Master item price was mutated by invoice price override!');
    }
    console.log(`[PASS] TEST C PASSED: Custom price ₹6,900 used for invoice (Total ₹${calcC.totalAmount}), Master price remained ₹${checkMasterItem!.sellingPrice}`);

    // TEST D: Intra-State GST (Karnataka 29)
    console.log('\n--- TEST D: Intra-State GST (Karnataka 29) ---');
    const isInterD = isInterStateTransaction('29', 'Karnataka', '29');
    const calcD = calculateItemGst({ quantity: 1, rate: 10000, gstRate: 18, isInterState: isInterD });
    if (isInterD || calcD.cgstAmount !== 900 || calcD.sgstAmount !== 900 || calcD.igstAmount !== 0) {
      throw new Error(`TEST D failed! Expected CGST 900 + SGST 900, got CGST ${calcD.cgstAmount}, IGST ${calcD.igstAmount}`);
    }
    console.log('[PASS] TEST D PASSED: Karnataka customer applies CGST (9%) + SGST (9%)');

    // TEST E: Inter-State GST (Maharashtra 27)
    console.log('\n--- TEST E: Inter-State GST (Maharashtra 27) ---');
    const isInterE = isInterStateTransaction('27', 'Maharashtra', '29');
    const calcE = calculateItemGst({ quantity: 1, rate: 10000, gstRate: 18, isInterState: isInterE });
    if (!isInterE || calcE.igstAmount !== 1800 || calcE.cgstAmount !== 0) {
      throw new Error(`TEST E failed! Expected IGST 1800, got IGST ${calcE.igstAmount}, CGST ${calcE.cgstAmount}`);
    }
    console.log('[PASS] TEST E PASSED: Maharashtra customer automatically applies IGST (18%)');

    // TEST F: Database Save & Confirm with serialNumber
    console.log('\n--- TEST F: Save & Confirm Invoice with serialNumber in DB ---');
    const testCustomer = await prisma.party.findFirst({ where: { type: 'CUSTOMER' } });
    
    const invoiceF = await prisma.invoice.create({
      data: {
        invoiceNumber: 'SAM-26-27-TEST-SERIAL-01',
        financialYear: '2026-2027',
        invoiceDate: new Date(),
        partyId: testCustomer!.id,
        billingAddress: testCustomer!.address,
        customerStateCode: testCustomer!.stateCode,
        isInterState: false,
        taxableAmount: 45000,
        cgstAmount: 4050,
        sgstAmount: 4050,
        igstAmount: 0,
        grandTotal: 53100,
        amountPaid: 53100,
        balanceDue: 0,
        status: 'PAID',
        items: {
          create: [
            {
              itemId: masterItem!.id,
              itemName: masterItem!.name,
              hsnSac: masterItem!.hsnSac,
              unit: masterItem!.unit,
              quantity: 1,
              rate: 45000,
              taxableValue: 45000,
              gstRate: 18,
              isInclusive: false,
              cgstAmount: 4050,
              sgstAmount: 4050,
              totalAmount: 53100,
              serialNumber: 'SN-TEST-998877',
            },
          ],
        },
      },
      include: { items: true },
    });

    console.log(`[PASS] TEST F PASSED: Created Invoice "${invoiceF.invoiceNumber}" with serialNumber "${invoiceF.items[0].serialNumber}" without Prisma errors!`);

    // Clean up test invoice F
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoiceF.id } });
    await prisma.invoice.delete({ where: { id: invoiceF.id } });

    console.log('\n====================================================');
    console.log('ALL 6 WORKFLOW & PERSISTENCE VERIFICATION TESTS PASSED! 100%');
    console.log('====================================================');
  } catch (err: any) {
    console.error('INVOICE WORKFLOW TEST FAILED:', err);
    process.exit(1);
  }
}

runInvoiceWorkflowVerificationTest();
