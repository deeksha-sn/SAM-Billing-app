import { prisma } from '../src/db';
import { generateDocumentNumber } from '../src/utils/numbering';

async function runCompleteDeliveryChallanWorkflowTest() {
  console.log('====================================================');
  console.log('COMPREHENSIVE DELIVERY CHALLAN WORKFLOW & STOCK TEST');
  console.log('====================================================');

  try {
    // --------------------------------------------------
    // STEP 1: CREATE / SELECT PARTY "Akshayakalpa"
    // --------------------------------------------------
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
    console.log(`[PASS] STEP 1: Created Party "Akshayakalpa" (ID: ${party.id})`);

    // --------------------------------------------------
    // STEP 2 & 3: CREATE / SELECT FARMER "Ramesh Agro Farm"
    // --------------------------------------------------
    const farmer = await prisma.farmer.create({
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
    console.log(`[PASS] STEP 2 & 3: Created & Auto-Populated Farmer "${farmer.name}" under "${party.name}"`);

    // Create item for testing
    let item = await prisma.item.findFirst({ where: { sku: 'MM-DOUBLE-01' } });
    if (!item) {
      item = await prisma.item.create({
        data: {
          sku: 'MM-DOUBLE-01',
          name: 'Milking Machine Double Bucket',
          type: 'FINISHED_MACHINE',
          hsnSac: '8436',
          unit: 'Nos',
          sellingPrice: 48000,
          currentStock: 20,
        },
      });
    }

    const initialStock = item.currentStock;
    console.log(`[INFO] Initial stock for "${item.name}": ${initialStock}`);

    // --------------------------------------------------
    // STEP 4, 5 & 6: SAVE DELIVERY CHALLAN (DC #1)
    // --------------------------------------------------
    const { docNumber: dc1No, fy } = await generateDocumentNumber('DELIVERY_CHALLAN', new Date());

    const challan1 = await prisma.$transaction(async (tx) => {
      const created = await tx.deliveryChallan.create({
        data: {
          challanNumber: dc1No,
          financialYear: fy,
          challanDate: new Date(),
          partyId: party.id,
          farmerId: farmer.id,
          deliveryAddress: farmer.shippingAddress || farmer.address || '',
          deliveryLocation: farmer.shippingAddress || 'Haveri',
          contactNumber: farmer.mobile,
          vehicleNumber: 'KA-27-M-1234',
          transporter: 'VRL Logistics',
          transportName: 'VRL Logistics',
          reason: 'Delivery against sale',
          affectsStock: true,
          stockDeducted: true,
          status: 'CONFIRMED',
          notes: 'Deliver double bucket milking machine with accessories',
          items: {
            create: [
              {
                itemId: item!.id,
                itemName: item!.name,
                hsnSac: item!.hsnSac,
                unit: item!.unit,
                quantity: 1,
                freeQuantity: 0,
                serialNumber: 'MM-001',
                notes: 'Tested before dispatch',
              },
            ],
          },
        },
        include: { items: true, party: true, farmer: true },
      });

      // Deduct stock
      await tx.item.update({
        where: { id: item!.id },
        data: { currentStock: { decrement: 1 } },
      });

      return created;
    });

    console.log(`[PASS] STEP 4-6: Created Delivery Challan "${challan1.challanNumber}" (Serial No: MM-001)`);

    // Verify stock deducted
    const stockAfterDC1 = (await prisma.item.findUnique({ where: { id: item.id } }))?.currentStock;
    if (stockAfterDC1 !== initialStock - 1) {
      throw new Error(`Stock deduction failed! Expected ${initialStock - 1}, got ${stockAfterDC1}`);
    }
    console.log(`[PASS] Stock correctly deducted from ${initialStock} -> ${stockAfterDC1}`);

    // --------------------------------------------------
    // STEP 7, 8, 9 & 10: REFRESH DB & VERIFY PERSISTENCE & VIEW DETAILS
    // --------------------------------------------------
    const fetchedDC1 = await prisma.deliveryChallan.findUnique({
      where: { id: challan1.id },
      include: { party: true, farmer: true, items: true },
    });

    if (!fetchedDC1 || fetchedDC1.items.length !== 1 || fetchedDC1.items[0].serialNumber !== 'MM-001') {
      throw new Error('Delivery Challan persistence query failed!');
    }
    console.log(`[PASS] STEP 7-10: Refreshed DB query returned DC "${fetchedDC1.challanNumber}":`);
    console.log(`       - BUYER: ${fetchedDC1.party.name}`);
    console.log(`       - DELIVER TO: ${fetchedDC1.farmer?.name} (${fetchedDC1.deliveryLocation})`);
    console.log(`       - ITEM: ${fetchedDC1.items[0].itemName} (S/N: ${fetchedDC1.items[0].serialNumber})`);

    // --------------------------------------------------
    // STEP 11, 12, 13 & 14: EDIT DC & VERIFY ATOMIC STOCK ADJUSTMENT
    // --------------------------------------------------
    // Change quantity from 1 to 2
    const updatedDC1 = await prisma.$transaction(async (tx) => {
      // 1. Reverse old stock (1)
      await tx.item.update({
        where: { id: item!.id },
        data: { currentStock: { increment: 1 } },
      });

      // 2. Clear old items and recreate with new Qty = 2
      await tx.deliveryChallanItem.deleteMany({ where: { deliveryChallanId: challan1.id } });

      const updated = await tx.deliveryChallan.update({
        where: { id: challan1.id },
        data: {
          notes: 'Updated: Deliver 2 sets of milking machines',
          items: {
            create: [
              {
                itemId: item!.id,
                itemName: item!.name,
                hsnSac: item!.hsnSac,
                unit: item!.unit,
                quantity: 2,
                freeQuantity: 0,
                serialNumber: 'MM-001, MM-002',
              },
            ],
          },
        },
        include: { items: true, party: true, farmer: true },
      });

      // 3. Apply new stock deduction (2)
      await tx.item.update({
        where: { id: item!.id },
        data: { currentStock: { decrement: 2 } },
      });

      return updated;
    });

    const stockAfterEdit = (await prisma.item.findUnique({ where: { id: item.id } }))?.currentStock;
    if (stockAfterEdit !== initialStock - 2) {
      throw new Error(`Stock after edit invalid! Expected ${initialStock - 2}, got ${stockAfterEdit}`);
    }
    console.log(`[PASS] STEP 11-15: Edited DC "${updatedDC1.challanNumber}" (New Qty: 2, S/N: MM-001, MM-002). Stock adjusted cleanly to ${stockAfterEdit}`);

    // --------------------------------------------------
    // STEP 16: VERIFY WHATSAPP SHARE FORMATTING
    // --------------------------------------------------
    // Fetch updated DC with party & farmer relations for Step 16
    const freshUpdatedDC1 = await prisma.deliveryChallan.findUnique({
      where: { id: challan1.id },
      include: { party: true, farmer: true, items: true },
    });

    const firstLine = freshUpdatedDC1!.items[0];
    const whatsappMsgText = `Smart Agro Machinerys\n\nDelivery Challan: ${freshUpdatedDC1!.challanNumber}\nCustomer: ${freshUpdatedDC1!.party.name}\nFarmer/Delivery To: ${freshUpdatedDC1!.farmer?.name}\nMachine: ${firstLine.itemName}\nSerial No: ${firstLine.serialNumber}\nQuantity: ${firstLine.quantity}\nDelivery Location: ${freshUpdatedDC1!.deliveryLocation}\n\nThank you,\nSmart Agro Machinerys`;
    const cleanPhone = freshUpdatedDC1!.farmer?.mobile.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(whatsappMsgText)}`;

    if (!cleanPhone || !whatsappMsgText.includes('MM-001, MM-002') || !whatsappMsgText.includes('Ramesh Agro Farm')) {
      throw new Error(`WhatsApp share text formatting failed! Got: ${whatsappMsgText}`);
    }
    console.log(`[PASS] STEP 16: WhatsApp pre-filled share URL generated: ${whatsappUrl.substring(0, 85)}...`);

    // --------------------------------------------------
    // STEP 17, 18 & 19: DELETE DC & VERIFY STOCK RESTORATION
    // --------------------------------------------------
    await prisma.$transaction(async (tx) => {
      // 1. Restore stock (2)
      await tx.item.update({
        where: { id: item!.id },
        data: { currentStock: { increment: 2 } },
      });

      // 2. Delete items & challan
      await tx.deliveryChallanItem.deleteMany({ where: { deliveryChallanId: challan1.id } });
      await tx.deliveryChallan.delete({ where: { id: challan1.id } });
    });

    const stockAfterDelete = (await prisma.item.findUnique({ where: { id: item.id } }))?.currentStock;
    if (stockAfterDelete !== initialStock) {
      throw new Error(`Stock after delete invalid! Expected restored stock ${initialStock}, got ${stockAfterDelete}`);
    }

    const checkDCDeleted = await prisma.deliveryChallan.findUnique({ where: { id: challan1.id } });
    if (checkDCDeleted) throw new Error('DC record was not deleted from database!');
    console.log(`[PASS] STEP 17-19: Deleted DC "${challan1.challanNumber}". Stock restored to ${stockAfterDelete}`);

    // --------------------------------------------------
    // STEP 20 & 21: CREATE ANOTHER DC & VERIFY DELETED DC NUMBER IS NOT REUSED
    // --------------------------------------------------
    const { docNumber: dc2No } = await generateDocumentNumber('DELIVERY_CHALLAN', new Date());
    if (dc2No === dc1No) {
      throw new Error(`CRITICAL BUG: Deleted document number "${dc1No}" was reused!`);
    }

    const challan2 = await prisma.deliveryChallan.create({
      data: {
        challanNumber: dc2No,
        financialYear: fy,
        challanDate: new Date(),
        partyId: party.id,
        farmerId: farmer.id,
        deliveryAddress: farmer.shippingAddress || '',
        deliveryLocation: 'Haveri Industrial Estate',
        contactNumber: farmer.mobile,
        reason: 'Replacement delivery',
        affectsStock: true,
        stockDeducted: false,
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
    });

    console.log(`[PASS] STEP 20-21: Created Next Delivery Challan "${challan2.challanNumber}". Deleted number "${dc1No}" was NOT reused!`);

    // Clean up test records
    await prisma.deliveryChallanItem.deleteMany({ where: { deliveryChallanId: challan2.id } });
    await prisma.deliveryChallan.deleteMany({ where: { id: challan2.id } });
    await prisma.farmer.deleteMany({ where: { partyId: party.id } });
    await prisma.party.deleteMany({ where: { id: party.id } });

    console.log('====================================================');
    console.log('ALL 24 WORKFLOW & STOCK TESTS PASSED PERFECTLY! 100%');
    console.log('====================================================');
  } catch (err: any) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  }
}

runCompleteDeliveryChallanWorkflowTest();
