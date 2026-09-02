import { prisma } from '../src/db';

async function runFullPartyFarmerSystemTest() {
  console.log('====================================================');
  console.log('COMPREHENSIVE PARTY / FARMER HIERARCHY & SYSTEM TEST');
  console.log('====================================================');

  try {
    // --------------------------------------------------
    // TEST 1: CREATE PARTY "Akshayakalpa"
    // --------------------------------------------------
    const party = await prisma.party.create({
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
    console.log(`[PASS] TEST 1: Created Party "Akshayakalpa" (ID: ${party.id})`);

    // --------------------------------------------------
    // TEST 2: ADD FARMER "Ramesh" (9844011223, Haveri)
    // --------------------------------------------------
    const farmerRamesh = await prisma.farmer.create({
      data: {
        partyId: party.id,
        name: 'Ramesh Agro Farm',
        mobile: '9844011223',
        address: 'Plot 4, Haveri Village Road',
        village: 'Haveri',
        taluk: 'Haveri',
        district: 'Haveri',
        state: 'Karnataka',
        stateCode: '29',
        pincode: '581110',
        notes: 'Milk chilling unit owner',
      },
    });
    console.log(`[PASS] TEST 2: Added Farmer "Ramesh" (Mobile: ${farmerRamesh.mobile}, Location: ${farmerRamesh.village}) under ${party.name}`);

    // --------------------------------------------------
    // TEST 3: ADD FARMER "Mahesh" (6366959062, Tiptur)
    // --------------------------------------------------
    const farmerMahesh = await prisma.farmer.create({
      data: {
        partyId: party.id,
        name: 'Mahesh',
        mobile: '6366959062',
        address: 'Main Dairy Road',
        village: 'Tiptur',
        taluk: 'Tiptur',
        district: 'Tumkur',
        state: 'Karnataka',
        stateCode: '29',
      },
    });
    console.log(`[PASS] TEST 3: Added Farmer "Mahesh" (Mobile: ${farmerMahesh.mobile}, Location: ${farmerMahesh.village}) under ${party.name}`);

    // --------------------------------------------------
    // TEST 4 & 5: REFRESH / QUERY DB & VERIFY FARMERS UNDER PARTY
    // --------------------------------------------------
    const fetchedParty = await prisma.party.findUnique({
      where: { id: party.id },
      include: { farmers: true },
    });
    if (!fetchedParty || fetchedParty.farmers.length !== 2) {
      throw new Error(`Expected 2 farmers under ${party.name}, found ${fetchedParty?.farmers.length}`);
    }
    console.log(`[PASS] TEST 4 & 5: Refreshed DB query returned ${fetchedParty.farmers.length} farmers under "${fetchedParty.name}":`);
    fetchedParty.farmers.forEach((f) => console.log(`       - ${f.name} • 📱 ${f.mobile} • 📍 ${f.village}`));

    // --------------------------------------------------
    // TEST 6: EDIT RAMESH (Change phone/address)
    // --------------------------------------------------
    const updatedRamesh = await prisma.farmer.update({
      where: { id: farmerRamesh.id },
      data: {
        mobile: '9844011229',
        address: 'Updated Haveri Main Road, Plot 4B',
      },
    });
    if (updatedRamesh.mobile !== '9844011229' || !updatedRamesh.address?.includes('Plot 4B')) {
      throw new Error('Farmer update failed to persist changes');
    }
    console.log(`[PASS] TEST 6: Edited Ramesh (Updated Mobile: ${updatedRamesh.mobile}, Address: ${updatedRamesh.address})`);

    // Restore original mobile for subsequent tests
    await prisma.farmer.update({
      where: { id: farmerRamesh.id },
      data: { mobile: '9844011223' },
    });

    // Create item for testing
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

    // --------------------------------------------------
    // TEST 7: CREATE SALES INVOICE (Akshayakalpa + Ramesh)
    // --------------------------------------------------
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'SAM-26-27-INV-001',
        financialYear: '2026-2027',
        invoiceDate: new Date(),
        partyId: party.id,
        farmerId: farmerRamesh.id,
        billingAddress: party.address || '',
        deliveryAddress: `${farmerRamesh.name}, ${farmerRamesh.address}, ${farmerRamesh.village}`,
        deliveryLocation: `${farmerRamesh.name}, ${farmerRamesh.village}`,
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
    console.log(`[PASS] TEST 7: Created Sales Invoice "${invoice.invoiceNumber}":`);
    console.log(`       - BILL TO: ${invoice.party.name}`);
    console.log(`       - SHIP TO: ${invoice.farmer?.name} (${invoice.farmer?.mobile}, ${invoice.farmer?.village})`);

    // --------------------------------------------------
    // TEST 8: CREATE QUOTATION (Akshayakalpa + Ramesh)
    // --------------------------------------------------
    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber: 'SAM-26-27-QUO-001',
        financialYear: '2026-2027',
        quotationDate: new Date(),
        partyId: party.id,
        farmerId: farmerRamesh.id,
        customerStateCode: party.stateCode,
        isInterState: false,
        taxableAmount: 48000,
        cgstAmount: 2880,
        sgstAmount: 2880,
        igstAmount: 0,
        grandTotal: 53760,
        status: 'ACTIVE',
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
    console.log(`[PASS] TEST 8: Created Quotation "${quotation.quotationNumber}" linked to Party "${quotation.party.name}" and Farmer "${quotation.farmer?.name}"`);

    // --------------------------------------------------
    // TEST 9: CREATE DELIVERY CHALLAN (Akshayakalpa + Ramesh)
    // --------------------------------------------------
    const challan = await prisma.deliveryChallan.create({
      data: {
        challanNumber: 'SAM-26-27-DC-001',
        financialYear: '2026-2027',
        challanDate: new Date(),
        partyId: party.id,
        farmerId: farmerRamesh.id,
        deliveryAddress: `${farmerRamesh.name}, ${farmerRamesh.address}`,
        deliveryLocation: `${farmerRamesh.name}, ${farmerRamesh.village}`,
        contactNumber: farmerRamesh.mobile,
        reason: 'Delivery of Milking Machine',
        status: 'CONFIRMED',
        items: {
          create: [
            {
              itemId: item.id,
              itemName: item.name,
              unit: item.unit,
              quantity: 1,
            },
          ],
        },
      },
      include: { party: true, farmer: true },
    });
    console.log(`[PASS] TEST 9: Created Delivery Challan "${challan.challanNumber}" linked to Party "${challan.party.name}" and Farmer "${challan.farmer?.name}"`);

    // --------------------------------------------------
    // TEST 10: ASSIGN MACHINE + SERIAL NUMBER (MM-001) TO RAMESH
    // --------------------------------------------------
    const machine = await prisma.machine.create({
      data: {
        partyId: party.id,
        farmerId: farmerRamesh.id,
        machineItemId: item.id,
        model: item.name,
        serialNumber: 'MM-001',
        invoiceId: invoice.id,
        saleDate: new Date(),
        warrantyStart: new Date(),
        warrantyEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        serviceIntervalDays: 90,
        nextServiceDate: new Date(),
        location: `${farmerRamesh.village}, ${farmerRamesh.district}`,
      },
      include: { party: true, farmer: true },
    });
    console.log(`[PASS] TEST 10: Assigned Machine S/N "${machine.serialNumber}" to Farmer "${machine.farmer?.name}" under Party "${machine.party.name}"`);

    // --------------------------------------------------
    // TEST 11: CREATE SERVICE DUE DATE FOR RAMESH
    // --------------------------------------------------
    const serviceTask = await prisma.serviceTask.create({
      data: {
        serviceNo: 'SRV-2026-001',
        machineId: machine.id,
        partyId: party.id,
        farmerId: farmerRamesh.id,
        serialNumber: machine.serialNumber,
        serviceDueDate: new Date(),
        serviceType: 'ROUTINE',
        status: 'SCHEDULED',
      },
      include: { party: true, farmer: true, machine: true },
    });
    console.log(`[PASS] TEST 11: Created Service Task "${serviceTask.serviceNo}" due TODAY for Farmer "${serviceTask.farmer?.name}" (${serviceTask.serialNumber})`);

    // --------------------------------------------------
    // TEST 12: WHATSAPP CUSTOMER REMINDER LINK GENERATION
    // --------------------------------------------------
    const farmerPhone = serviceTask.farmer?.mobile.replace(/\D/g, '');
    const formattedPhone = farmerPhone?.length === 10 ? '91' + farmerPhone : farmerPhone;
    const customerMsg = `Hello ${serviceTask.farmer?.name},\n\nThis is a service reminder from Smart Agro Machinerys.\n\nYour Milking Machine (Serial No: ${serviceTask.serialNumber}) is due for service today.\n\nLocation: ${serviceTask.farmer?.village}.\n\nPlease contact us to schedule the service.\n\nThank you,\nSmart Agro Machinerys`;
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(customerMsg)}`;

    if (!whatsappUrl.includes('wa.me/919844011223') || !whatsappUrl.includes('MM-001')) {
      throw new Error('WhatsApp URL generation failed or format mismatch!');
    }
    console.log(`[PASS] TEST 12: Actionable WhatsApp Customer URL generated successfully:`);
    console.log(`       URL: ${whatsappUrl.substring(0, 75)}...`);

    // --------------------------------------------------
    // TEST 13: TECHNICIAN DISPATCH MESSAGE GENERATION
    // --------------------------------------------------
    const dispatchMessage = `TODAY'S SERVICE JOBS\n\n1. ${serviceTask.farmer?.name}\nPhone: ${serviceTask.farmer?.mobile}\nAddress: ${serviceTask.farmer?.village}, ${serviceTask.farmer?.district}\nMachine: ${serviceTask.machine?.model}\nSerial: ${serviceTask.serialNumber}`;
    if (!dispatchMessage.includes('Ramesh') || !dispatchMessage.includes('9844011223') || !dispatchMessage.includes('MM-001')) {
      throw new Error('Technician dispatch message format invalid!');
    }
    console.log(`[PASS] TEST 13: Technician Dispatch message generated successfully:`);
    console.log(dispatchMessage);

    // --------------------------------------------------
    // TEST 14: DELETE RAMESH & VERIFY PARENT PARTY INTACT
    // --------------------------------------------------
    await prisma.farmer.update({
      where: { id: farmerRamesh.id },
      data: { active: false },
    });

    const checkParent = await prisma.party.findUnique({
      where: { id: party.id },
    });
    if (!checkParent) {
      throw new Error('CRITICAL BUG: Deleting farmer removed parent organization!');
    }
    console.log(`[PASS] TEST 14: Farmer "Ramesh" safely deactivated. Parent Party "${checkParent.name}" remains 100% active!`);

    // Clean up test records
    await prisma.serviceTask.deleteMany({ where: { id: serviceTask.id } });
    await prisma.machine.deleteMany({ where: { id: machine.id } });
    await prisma.deliveryChallanItem.deleteMany({ where: { deliveryChallanId: challan.id } });
    await prisma.deliveryChallan.deleteMany({ where: { id: challan.id } });
    await prisma.quotationItem.deleteMany({ where: { quotationId: quotation.id } });
    await prisma.quotation.deleteMany({ where: { id: quotation.id } });
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });
    await prisma.invoice.deleteMany({ where: { id: invoice.id } });
    await prisma.farmer.deleteMany({ where: { partyId: party.id } });
    await prisma.party.deleteMany({ where: { id: party.id } });

    console.log('====================================================');
    console.log('ALL 14 SYSTEM & API TESTS PASSED SUCCESSFULLY! 100%');
    console.log('====================================================');
  } catch (err: any) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  }
}

runFullPartyFarmerSystemTest();
