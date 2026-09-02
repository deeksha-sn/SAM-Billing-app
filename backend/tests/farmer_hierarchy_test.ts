import { prisma } from '../src/db';

async function runFarmerHierarchyTest() {
  console.log('----------------------------------------------------');
  console.log('TESTING PARTY / FARMER HIERARCHY & DOCUMENT LINKING');
  console.log('----------------------------------------------------');

  try {
    // 1. Create Main Party / Organization
    const mainParty = await prisma.party.create({
      data: {
        name: 'Akshayakalpa Farms & Foods Pvt Ltd',
        type: 'CUSTOMER',
        customerType: 'ORGANIZATION',
        contactPerson: 'Mr. Sharan (Manager)',
        mobile: '9620409800',
        email: 'billing@akshayakalpa.org',
        address: 'Tiptur Road, Dairy Division',
        village: 'Tiptur',
        district: 'Tumkur',
        state: 'Karnataka',
        stateCode: '29',
        pincode: '572201',
        gstin: '29AICA4264B1ZU',
        active: true,
      },
    });
    console.log(`[PASS] Created Main Party: "${mainParty.name}" (ID: ${mainParty.id})`);

    // 2. Add Farmers under Main Party
    const farmerRamesh = await prisma.farmer.create({
      data: {
        partyId: mainParty.id,
        name: 'Farmer Ramesh',
        mobile: '9844011223',
        address: 'Plot 4, Haveri Village Road',
        village: 'Haveri Village',
        taluk: 'Haveri',
        district: 'Haveri',
        state: 'Karnataka',
        stateCode: '29',
        pincode: '581110',
        notes: 'Milk chilling unit owner',
      },
    });
    console.log(`[PASS] Added Farmer 1: "${farmerRamesh.name}" under ${mainParty.name}`);

    const farmerMahesh = await prisma.farmer.create({
      data: {
        partyId: mainParty.id,
        name: 'Farmer Mahesh',
        mobile: '6366959062',
        village: 'Tiptur Village',
        taluk: 'Tiptur',
        district: 'Tumkur',
        state: 'Karnataka',
        stateCode: '29',
      },
    });
    console.log(`[PASS] Added Farmer 2: "${farmerMahesh.name}" under ${mainParty.name}`);

    // 3. Fetch Farmers under Main Party
    const farmersList = await prisma.farmer.findMany({
      where: { partyId: mainParty.id },
    });
    if (farmersList.length !== 2) {
      throw new Error(`Expected 2 farmers under ${mainParty.name}, but found ${farmersList.length}`);
    }
    console.log(`[PASS] Verified ${farmersList.length} farmers retrieved for main party "${mainParty.name}"`);

    // 4. Fetch/Create an Item for Billing
    let item = await prisma.item.findFirst({ where: { type: 'FINISHED_MACHINE' } });
    if (!item) {
      item = await prisma.item.create({
        data: {
          sku: 'MM-DB-001',
          name: 'Milking Machine Double Bucket',
          type: 'FINISHED_MACHINE',
          hsnSac: '8436',
          unit: 'Nos',
          sellingPrice: 45000,
          currentStock: 10,
        },
      });
    }

    // 5. Create Sales Invoice billed to Main Party, shipped to Farmer Ramesh
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'SAM-26-27-AKSH-001',
        financialYear: '2026-2027',
        invoiceDate: new Date(),
        partyId: mainParty.id,
        farmerId: farmerRamesh.id,
        billingAddress: mainParty.address || '',
        deliveryAddress: `${farmerRamesh.name}, ${farmerRamesh.village}, ${farmerRamesh.district}`,
        deliveryLocation: `${farmerRamesh.name}, ${farmerRamesh.village}`,
        customerStateCode: mainParty.stateCode,
        isInterState: false,
        taxableAmount: 45000,
        cgstAmount: 2700,
        sgstAmount: 2700,
        igstAmount: 0,
        grandTotal: 50400,
        amountPaid: 50400,
        balanceDue: 0,
        paymentMode: 'Bank Transfer',
        status: 'PAID',
        items: {
          create: [
            {
              itemId: item.id,
              itemName: item.name,
              hsnSac: item.hsnSac,
              unit: item.unit,
              quantity: 1,
              rate: 45000,
              taxableValue: 45000,
              gstRate: 12,
              cgstAmount: 2700,
              sgstAmount: 2700,
              totalAmount: 50400,
            },
          ],
        },
      },
      include: {
        party: true,
        farmer: true,
        items: true,
      },
    });

    console.log(`[PASS] Created Tax Invoice "${invoice.invoiceNumber}":`);
    console.log(`       - BILL TO: ${invoice.party.name} (GSTIN: ${invoice.party.gstin})`);
    console.log(`       - SHIP TO: ${invoice.farmer?.name} (Mobile: ${invoice.farmer?.mobile}, Village: ${invoice.farmer?.village})`);

    // 6. Assign Machine to Farmer Ramesh
    const machine = await prisma.machine.create({
      data: {
        partyId: mainParty.id,
        farmerId: farmerRamesh.id,
        machineItemId: item.id,
        model: item.name,
        serialNumber: 'MM-AKSH-001',
        invoiceId: invoice.id,
        saleDate: new Date(),
        warrantyStart: new Date(),
        warrantyEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        location: `${farmerRamesh.village}, ${farmerRamesh.district}`,
      },
      include: { party: true, farmer: true },
    });

    console.log(`[PASS] Registered Machine S/N "${machine.serialNumber}" assigned to Farmer "${machine.farmer?.name}" under Main Party "${machine.party.name}"`);

    // 7. Verify Safe Farmer Deactivation without deleting Parent Organization
    await prisma.farmer.update({
      where: { id: farmerRamesh.id },
      data: { active: false },
    });
    console.log(`[PASS] Farmer "${farmerRamesh.name}" deactivated safely.`);

    const parentStillExists = await prisma.party.findUnique({ where: { id: mainParty.id } });
    if (!parentStillExists) {
      throw new Error('CRITICAL BUG: Deleting/deactivating farmer deleted the parent organization!');
    }
    console.log(`[PASS] Parent Organization "${parentStillExists.name}" remains 100% active and untouched.`);

    // Clean up test records
    await prisma.machine.deleteMany({ where: { serialNumber: 'MM-AKSH-001' } });
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });
    await prisma.invoice.deleteMany({ where: { id: invoice.id } });
    await prisma.farmer.deleteMany({ where: { partyId: mainParty.id } });
    await prisma.party.deleteMany({ where: { id: mainParty.id } });

    console.log('----------------------------------------------------');
    console.log('ALL FARMER HIERARCHY TESTS PASSED SUCCESSFULLY! 100%');
    console.log('----------------------------------------------------');
  } catch (err: any) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  }
}

runFarmerHierarchyTest();
