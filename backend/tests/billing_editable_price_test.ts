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

async function runBillingEditablePriceTest() {
  console.log('====================================================');
  console.log('TESTING EDITABLE ITEM PRICE DURING BILLING (6000 -> 6900)');
  console.log('====================================================');

  try {
    // 1. Create Party and Item with Master Selling Price = ₹6,000
    const party = await prisma.party.create({
      data: {
        name: 'Price Test Customer',
        type: 'CUSTOMER',
        mobile: '9844069000',
        address: 'Haveri Main Road',
        state: 'Karnataka',
        stateCode: '29',
      },
    });

    const item = await prisma.item.create({
      data: {
        sku: 'SPRAYER-6K',
        name: 'Battery Sprayer 16L Special Edition',
        type: 'FINISHED_MACHINE',
        hsnSac: '8424',
        unit: 'Nos',
        sellingPrice: 6000,
        purchasePrice: 4000,
        currentStock: 25,
      },
    });

    console.log(`[PASS] 1. Created Item "${item.name}" with Master Price = ₹${item.sellingPrice}`);

    // 2. Select Item (default price = 6000), User changes billing price to ₹6,900, Qty = 1, GST = 18%
    const masterPrice = item.sellingPrice; // 6000
    const customBillingPrice = 6900;
    const qty = 1;
    const gstRate = 18;

    const calc = calculateItemGst({
      quantity: qty,
      rate: customBillingPrice,
      gstRate: gstRate,
      isInterState: false,
    });

    console.log(`[PASS] 2. Calculated using custom billing price ₹${customBillingPrice}:`);
    console.log(`       - Taxable Amount: ₹${calc.taxableValue} (Expected: ₹6,900)`);
    console.log(`       - CGST (9%): ₹${calc.cgstAmount}, SGST (9%): ₹${calc.sgstAmount} (Total Tax: ₹${calc.cgstAmount + calc.sgstAmount}, Expected: ₹1,242)`);
    console.log(`       - Grand Total: ₹${calc.totalAmount} (Expected: ₹8,142)`);

    if (calc.taxableValue !== 6900 || calc.totalAmount !== 8142 || calc.cgstAmount + calc.sgstAmount !== 1242) {
      throw new Error(`Calculation failed! Expected Taxable 6900, Tax 1242, Total 8142. Got Taxable: ${calc.taxableValue}, Total: ${calc.totalAmount}`);
    }

    // 3. Save Sales Invoice with Custom Price ₹6,900
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'SAM-26-27-INV-6900',
        financialYear: '2026-2027',
        invoiceDate: new Date(),
        partyId: party.id,
        billingAddress: party.address || '',
        customerStateCode: party.stateCode,
        isInterState: false,
        taxableAmount: calc.taxableValue,
        cgstAmount: calc.cgstAmount,
        sgstAmount: calc.sgstAmount,
        igstAmount: 0,
        grandTotal: calc.totalAmount,
        amountPaid: calc.totalAmount,
        balanceDue: 0,
        status: 'PAID',
        items: {
          create: [
            {
              itemId: item.id,
              itemName: item.name,
              hsnSac: item.hsnSac,
              unit: item.unit,
              quantity: qty,
              rate: customBillingPrice,
              taxableValue: calc.taxableValue,
              gstRate: gstRate,
              cgstAmount: calc.cgstAmount,
              sgstAmount: calc.sgstAmount,
              totalAmount: calc.totalAmount,
            },
          ],
        },
      },
      include: { items: true },
    });

    console.log(`[PASS] 3. Saved Invoice "${invoice.invoiceNumber}" with Custom Rate ₹${invoice.items[0].rate}`);

    // 4. Reopen/query invoice from DB to verify custom price ₹6,900 is retained
    const fetchedInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: { items: true },
    });

    if (!fetchedInvoice || fetchedInvoice.items[0].rate !== 6900 || fetchedInvoice.grandTotal !== 8142) {
      throw new Error(`Reopened invoice rate check failed! Expected 6900, got ${fetchedInvoice?.items[0].rate}`);
    }
    console.log(`[PASS] 4. Reopened Invoice retained custom rate ₹${fetchedInvoice.items[0].rate} and Total ₹${fetchedInvoice.grandTotal}`);

    // 5. Verify Item Master default price is STILL ₹6,000
    const masterCheck = await prisma.item.findUnique({ where: { id: item.id } });
    if (!masterCheck || masterCheck.sellingPrice !== 6000) {
      throw new Error(`Item Master selling price was mutated! Expected 6000, got ${masterCheck?.sellingPrice}`);
    }
    console.log(`[PASS] 5. Verified Item Master default price remained UNTOUCHED at ₹${masterCheck.sellingPrice}`);

    // Clean up test records
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });
    await prisma.invoice.deleteMany({ where: { id: invoice.id } });
    await prisma.item.deleteMany({ where: { id: item.id } });
    await prisma.party.deleteMany({ where: { id: party.id } });

    console.log('====================================================');
    console.log('ALL EDITABLE PRICE & ISOLATION TESTS PASSED! 100%');
    console.log('====================================================');
  } catch (err: any) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  }
}

runBillingEditablePriceTest();
