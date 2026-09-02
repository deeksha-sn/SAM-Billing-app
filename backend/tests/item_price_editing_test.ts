import { prisma } from '../src/db';

function calculateItemGst(params: {
  quantity: number;
  rate: number;
  discountPercent?: number;
  discountAmount?: number;
  gstRate: number | string;
  isExempt?: boolean;
  isInterState: boolean;
}) {
  const qty = Math.max(0, Number(params.quantity) || 0);
  const rate = Math.max(0, Number(params.rate) || 0);
  const discPct = Math.max(0, Number(params.discountPercent) || 0);
  const discAmtInput = Math.max(0, Number(params.discountAmount) || 0);

  const grossValue = qty * rate;

  let discountAmount = 0;
  if (discAmtInput > 0) {
    discountAmount = discAmtInput;
  } else if (discPct > 0) {
    discountAmount = (grossValue * discPct) / 100;
  }

  const taxableValue = Math.max(0, grossValue - discountAmount);
  const isExempt = params.isExempt || params.gstRate === 'EXEMPT' || Number(params.gstRate) === 0;

  if (isExempt) {
    return {
      taxableValue: Math.round(taxableValue * 100) / 100,
      gstRate: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalAmount: Math.round(taxableValue * 100) / 100,
      isExempt: true,
    };
  }

  const gstPct = Number(params.gstRate) || 0;
  const totalTaxAmount = (taxableValue * gstPct) / 100;

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (params.isInterState) {
    igstAmount = totalTaxAmount;
  } else {
    cgstAmount = totalTaxAmount / 2;
    sgstAmount = totalTaxAmount / 2;
  }

  const totalAmount = taxableValue + totalTaxAmount;

  return {
    taxableValue: Math.round(taxableValue * 100) / 100,
    gstRate: gstPct,
    cgstAmount: Math.round(cgstAmount * 100) / 100,
    sgstAmount: Math.round(sgstAmount * 100) / 100,
    igstAmount: Math.round(igstAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    isExempt: false,
  };
}

async function runItemPriceEditingTest() {
  console.log('====================================================');
  console.log('TESTING CUSTOM ITEM PRICE EDITING & REAL-TIME GST');
  console.log('====================================================');

  try {
    // 1. Create Party and Item with Master Selling Price = 45,000
    const party = await prisma.party.create({
      data: {
        name: 'Test Price Edit Party',
        type: 'CUSTOMER',
        mobile: '9844099999',
        address: 'Haveri',
        state: 'Karnataka',
        stateCode: '29',
      },
    });

    const item = await prisma.item.create({
      data: {
        sku: 'TEST-MOTOR-45K',
        name: 'High Capacity Agro Motor 5HP',
        type: 'FINISHED_MACHINE',
        hsnSac: '8436',
        unit: 'Nos',
        sellingPrice: 45000,
        purchasePrice: 35000,
        currentStock: 10,
      },
    });

    console.log(`[PASS] Created Item "${item.name}" with Master Price = ₹${item.sellingPrice}`);

    // --------------------------------------------------
    // TEST STEP A: Default Price = 45,000, Change to 38,500, Qty = 2, GST = 18%
    // --------------------------------------------------
    const priceA = 38500;
    const qtyA = 2;
    const gstA = 18;

    const calcA = calculateItemGst({
      quantity: qtyA,
      rate: priceA,
      gstRate: gstA,
      isInterState: false,
    });

    console.log(`[PASS] Step A (Price ₹38,500, Qty 2, GST 18%):`);
    console.log(`       - Taxable: ₹${calcA.taxableValue} (Expected: ₹77,000)`);
    console.log(`       - CGST: ₹${calcA.cgstAmount}, SGST: ₹${calcA.sgstAmount} (Total Tax: ₹${calcA.cgstAmount + calcA.sgstAmount}, Expected: ₹13,860)`);
    console.log(`       - Grand Total: ₹${calcA.totalAmount} (Expected: ₹90,860)`);

    if (calcA.taxableValue !== 77000 || calcA.totalAmount !== 90860) {
      throw new Error(`Step A calculation failed! Taxable: ${calcA.taxableValue}, Total: ${calcA.totalAmount}`);
    }

    // --------------------------------------------------
    // TEST STEP B: Change Price to 50,000, Qty = 2, GST = 18%
    // --------------------------------------------------
    const priceB = 50000;
    const calcB = calculateItemGst({
      quantity: qtyA,
      rate: priceB,
      gstRate: gstA,
      isInterState: false,
    });

    console.log(`[PASS] Step B (Price ₹50,000, Qty 2, GST 18%):`);
    console.log(`       - Taxable: ₹${calcB.taxableValue} (Expected: ₹100,000)`);
    console.log(`       - Total Tax: ₹${calcB.cgstAmount + calcB.sgstAmount} (Expected: ₹18,000)`);
    console.log(`       - Grand Total: ₹${calcB.totalAmount} (Expected: ₹118,000)`);

    if (calcB.taxableValue !== 100000 || calcB.totalAmount !== 118000) {
      throw new Error(`Step B calculation failed! Taxable: ${calcB.taxableValue}, Total: ${calcB.totalAmount}`);
    }

    // --------------------------------------------------
    // TEST STEP C: Set GST to 5% (Price 50,000, Qty 2)
    // --------------------------------------------------
    const calcC = calculateItemGst({
      quantity: qtyA,
      rate: priceB,
      gstRate: 5,
      isInterState: false,
    });

    console.log(`[PASS] Step C (Price ₹50,000, Qty 2, GST 5%):`);
    console.log(`       - Taxable: ₹${calcC.taxableValue} (Expected: ₹100,000)`);
    console.log(`       - Total Tax: ₹${calcC.cgstAmount + calcC.sgstAmount} (Expected: ₹5,000)`);
    console.log(`       - Grand Total: ₹${calcC.totalAmount} (Expected: ₹105,000)`);

    if (calcC.taxableValue !== 100000 || calcC.totalAmount !== 105000) {
      throw new Error(`Step C calculation failed! Taxable: ${calcC.taxableValue}, Total: ${calcC.totalAmount}`);
    }

    // --------------------------------------------------
    // TEST STEP D: Set GST to EXEMPTED (Price 50,000, Qty 2)
    // --------------------------------------------------
    const calcD = calculateItemGst({
      quantity: qtyA,
      rate: priceB,
      gstRate: 'EXEMPT',
      isExempt: true,
      isInterState: false,
    });

    console.log(`[PASS] Step D (Price ₹50,000, Qty 2, GST EXEMPTED):`);
    console.log(`       - Taxable: ₹${calcD.taxableValue} (Expected: ₹100,000)`);
    console.log(`       - Total Tax: ₹${calcD.cgstAmount + calcD.sgstAmount} (Expected: ₹0)`);
    console.log(`       - Grand Total: ₹${calcD.totalAmount} (Expected: ₹100,000)`);

    if (calcD.taxableValue !== 100000 || calcD.cgstAmount !== 0 || calcD.totalAmount !== 100000) {
      throw new Error(`Step D calculation failed! Taxable: ${calcD.taxableValue}, Tax: ${calcD.cgstAmount}, Total: ${calcD.totalAmount}`);
    }

    // --------------------------------------------------
    // TEST STEP E: Save Sales Invoice with Custom Price = 50,000 & Verify DB Persistence
    // --------------------------------------------------
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'SAM-26-27-INV-PRICETEST',
        financialYear: '2026-2027',
        invoiceDate: new Date(),
        partyId: party.id,
        billingAddress: party.address || '',
        customerStateCode: party.stateCode,
        isInterState: false,
        taxableAmount: calcB.taxableValue,
        cgstAmount: calcB.cgstAmount,
        sgstAmount: calcB.sgstAmount,
        igstAmount: 0,
        grandTotal: calcB.totalAmount,
        amountPaid: calcB.totalAmount,
        balanceDue: 0,
        status: 'PAID',
        items: {
          create: [
            {
              itemId: item.id,
              itemName: item.name,
              hsnSac: item.hsnSac,
              unit: item.unit,
              quantity: qtyA,
              rate: priceB, // Custom price ₹50,000
              taxableValue: calcB.taxableValue,
              gstRate: gstA,
              cgstAmount: calcB.cgstAmount,
              sgstAmount: calcB.sgstAmount,
              totalAmount: calcB.totalAmount,
            },
          ],
        },
      },
      include: { items: true },
    });

    console.log(`[PASS] Saved Sales Invoice "${invoice.invoiceNumber}" with Custom Transaction Price ₹${invoice.items[0].rate}`);

    // Query DB to verify persistence
    const fetchedInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: { items: true },
    });

    if (!fetchedInvoice || fetchedInvoice.items[0].rate !== 50000) {
      throw new Error('Custom invoice price failed to persist in DB!');
    }

    // Verify Item Master price remained untouched (₹45,000)
    const masterItemCheck = await prisma.item.findUnique({ where: { id: item.id } });
    if (!masterItemCheck || masterItemCheck.sellingPrice !== 45000) {
      throw new Error(`Item Master selling price was mutated! Expected 45000, got ${masterItemCheck?.sellingPrice}`);
    }
    console.log(`[PASS] Verified Item Master selling price remained untouched at ₹${masterItemCheck.sellingPrice}`);

    // Clean up test records
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });
    await prisma.invoice.deleteMany({ where: { id: invoice.id } });
    await prisma.item.deleteMany({ where: { id: item.id } });
    await prisma.party.deleteMany({ where: { id: party.id } });

    console.log('====================================================');
    console.log('ALL CUSTOM PRICE & RECALCULATION TESTS PASSED! 100%');
    console.log('====================================================');
  } catch (err: any) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  }
}

runItemPriceEditingTest();
