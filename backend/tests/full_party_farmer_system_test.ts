import { prisma } from '../src/db';

async function runSimplifiedAddressAndFarmerTest() {
  console.log('====================================================');
  console.log('TESTING SIMPLIFIED BILLING & SHIPPING ADDRESS FORM');
  console.log('====================================================');

  try {
    // 1. Create Main Party "Akshayakalpa" with Billing & Shipping Address
    const party = await prisma.party.create({
      data: {
        name: 'Akshayakalpa Farms & Foods Pvt Ltd',
        type: 'CUSTOMER',
        customerType: 'ORGANIZATION',
        contactPerson: 'Mr. Sharan (Manager)',
        mobile: '9620409800',
        email: 'billing@akshayakalpa.org',
        address: 'Main Road, Near Bus Stand, Haveri, Karnataka - 581110',
        shippingAddress: 'Central Warehouse, Tiptur Road, Tumkur - 572201',
        state: 'Karnataka',
        stateCode: '29',
        pincode: '581110',
        gstin: '29AICA4264B1ZU',
        active: true,
      },
    });
    console.log(`[PASS] Created Main Party "${party.name}" with multiline addresses:`);
    console.log(`       - BILLING : ${party.address}`);
    console.log(`       - SHIPPING: ${party.shippingAddress}`);

    // 2. Create Farmer "Ramesh Agro" under Akshayakalpa with multiline addresses
    const farmerRamesh = await prisma.farmer.create({
      data: {
        partyId: party.id,
        name: 'Ramesh Agro Farm',
        mobile: '9844011223',
        address: 'Plot 4, Haveri Village Road, Haveri, Karnataka - 581110',
        shippingAddress: 'Milk Chilling Center, Haveri Industrial Estate, Karnataka - 581110',
        state: 'Karnataka',
        stateCode: '29',
        pincode: '581110',
      },
    });
    console.log(`[PASS] Created Farmer "${farmerRamesh.name}" under "${party.name}":`);
    console.log(`       - BILLING : ${farmerRamesh.address}`);
    console.log(`       - SHIPPING: ${farmerRamesh.shippingAddress}`);

    // 3. Verify DB retrieval retains both addresses
    const fetchedFarmer = await prisma.farmer.findUnique({
      where: { id: farmerRamesh.id },
      include: { party: true },
    });
    if (!fetchedFarmer || fetchedFarmer.shippingAddress !== farmerRamesh.shippingAddress) {
      throw new Error('Shipping address failed to persist in database!');
    }
    console.log(`[PASS] Verified DB query returned saved shipping address for "${fetchedFarmer.name}"`);

    // 4. Create Sales Invoice using Farmer's saved shipping address
    let item = await prisma.item.findFirst({ where: { type: 'FINISHED_MACHINE' } });
    if (!item) {
      item = await prisma.item.create({
        data: {
          sku: 'MM-DOUBLE-01',
          name: 'Milking Machine Double Bucket',
          type: 'FINISHED_MACHINE',
          hsnSac: '8436',
          unit: 'Nos',
          sellingPrice: 48000,
          currentStock: 15,
        },
      });
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'SAM-26-27-INV-002',
        financialYear: '2026-2027',
        invoiceDate: new Date(),
        partyId: party.id,
        farmerId: farmerRamesh.id,
        billingAddress: party.address || '',
        deliveryAddress: farmerRamesh.shippingAddress || farmerRamesh.address || '',
        deliveryLocation: farmerRamesh.shippingAddress || '',
        customerStateCode: party.stateCode,
        isInterState: false,
        taxableAmount: 48000,
        cgstAmount: 2880,
        sgstAmount: 2880,
        igstAmount: 0,
        grandTotal: 53760,
        amountPaid: 53760,
        balanceDue: 0,
        paymentMode: 'NEFT',
        status: 'PAID',
        items: {
          create: [
            {
              itemId: item.id,
              itemName: item.name,
              hsnSac: item.hsnSac,
              unit: item.unit,
              quantity: 1,
              rate: 48000,
              taxableValue: 48000,
              gstRate: 12,
              cgstAmount: 2880,
              sgstAmount: 2880,
              totalAmount: 53760,
            },
          ],
        },
      },
      include: { party: true, farmer: true },
    });

    console.log(`[PASS] Created Tax Invoice "${invoice.invoiceNumber}" with Farmer's saved shipping address:`);
    console.log(`       - BILL TO: ${invoice.party.name} (${invoice.billingAddress})`);
    console.log(`       - SHIP TO: ${invoice.farmer?.name} (${invoice.deliveryLocation})`);

    // Clean up test records
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });
    await prisma.invoice.deleteMany({ where: { id: invoice.id } });
    await prisma.farmer.deleteMany({ where: { partyId: party.id } });
    await prisma.party.deleteMany({ where: { id: party.id } });

    console.log('====================================================');
    console.log('ALL SIMPLIFIED ADDRESS TESTS PASSED PERFECTLY! 100%');
    console.log('====================================================');
  } catch (err: any) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  }
}

runSimplifiedAddressAndFarmerTest();
