import { prisma } from '../src/db';
import { seedDatabase } from '../src/seed';

async function runManualPersistenceVerification() {
  console.log('====================================================');
  console.log('MANUAL DATABASE PERSISTENCE & VERIFICATION TEST');
  console.log('====================================================');

  try {
    // 0. Ensure database initialized with sample data
    await seedDatabase();

    // 1. Verify Sample Record Counts in Real Database
    const invoiceCount = await prisma.invoice.count();
    const quotationCount = await prisma.quotation.count();
    const purchaseCount = await prisma.purchaseInvoice.count();
    const challanCount = await prisma.deliveryChallan.count();
    const customerCount = await prisma.party.count({ where: { type: 'CUSTOMER' } });
    const supplierCount = await prisma.party.count({ where: { type: 'SUPPLIER' } });
    const itemCount = await prisma.item.count();
    const machineCount = await prisma.machine.count();
    const serviceCount = await prisma.serviceTask.count();
    const paymentCount = await prisma.payment.count();
    const expenseCount = await prisma.expense.count();

    console.log('[RECORD COUNT VERIFICATION]');
    console.log(`- Sales Invoices: ${invoiceCount} (Target >= 10)`);
    console.log(`- Quotations: ${quotationCount} (Target >= 10)`);
    console.log(`- Purchases: ${purchaseCount} (Target >= 10)`);
    console.log(`- Delivery Challans: ${challanCount} (Target >= 10)`);
    console.log(`- Customers: ${customerCount} (Target >= 10)`);
    console.log(`- Suppliers: ${supplierCount} (Target >= 10)`);
    console.log(`- Inventory Items: ${itemCount} (Target >= 20)`);
    console.log(`- Machines: ${machineCount} (Target >= 10)`);
    console.log(`- Service Tasks: ${serviceCount} (Target >= 10)`);
    console.log(`- Payments: ${paymentCount} (Target >= 10)`);
    console.log(`- Expenses: ${expenseCount} (Target >= 10)`);

    if (
      invoiceCount < 10 ||
      quotationCount < 10 ||
      purchaseCount < 10 ||
      challanCount < 10 ||
      customerCount < 10 ||
      supplierCount < 10 ||
      itemCount < 20 ||
      machineCount < 10 ||
      serviceCount < 10 ||
      expenseCount < 10
    ) {
      throw new Error('Database sample record counts do not meet required minimum targets!');
    }

    // 2. TEST UNIQUE CUSTOMER CREATION & RESTART PERSISTENCE
    console.log('\n--- TESTING UNIQUE CUSTOMER PERSISTENCE ---');
    const testCustomerName = 'PERSISTENCE TEST CUSTOMER 12345';
    
    // Clean up if left from previous run
    await prisma.party.deleteMany({ where: { name: testCustomerName } });

    const newCustomer = await prisma.party.create({
      data: {
        name: testCustomerName,
        type: 'CUSTOMER',
        customerType: 'INDIVIDUAL',
        mobile: '9800012345',
        address: 'Persistence Testing Address',
        state: 'Karnataka',
        stateCode: '29',
      },
    });
    console.log(`[PASS] Created Customer in DB: "${newCustomer.name}" (ID: ${newCustomer.id})`);

    // Verify Read from DB
    let foundCustomer = await prisma.party.findUnique({ where: { id: newCustomer.id } });
    if (!foundCustomer) throw new Error('Failed to find newly created customer in DB immediately after insert!');

    // Simulate backend server restart
    console.log('Simulating backend restart (running seedDatabase on startup)...');
    await seedDatabase();

    // Verify customer still exists after restart
    foundCustomer = await prisma.party.findUnique({ where: { id: newCustomer.id } });
    if (!foundCustomer) {
      throw new Error(`Customer "${testCustomerName}" DISAPPEARED after backend restart!`);
    }
    console.log(`[PASS] Customer "${foundCustomer.name}" STILL EXISTS in database after server restart!`);

    // 3. TEST UNIQUE DELIVERY CHALLAN PERSISTENCE & DELETION
    console.log('\n--- TESTING UNIQUE DELIVERY CHALLAN PERSISTENCE & DELETION ---');
    const testDCNumber = 'DC-PERSISTENCE-TEST';

    // Clean up if left from previous run
    const prevDC = await prisma.deliveryChallan.findUnique({ where: { challanNumber: testDCNumber } });
    if (prevDC) {
      await prisma.deliveryChallanItem.deleteMany({ where: { deliveryChallanId: prevDC.id } });
      await prisma.deliveryChallan.delete({ where: { id: prevDC.id } });
    }

    const firstItem = await prisma.item.findFirst();
    const newDC = await prisma.deliveryChallan.create({
      data: {
        challanNumber: testDCNumber,
        financialYear: '2026-2027',
        challanDate: new Date(),
        partyId: newCustomer.id,
        deliveryAddress: newCustomer.address,
        deliveryLocation: newCustomer.address,
        reason: 'Persistence Verification Test',
        status: 'CONFIRMED',
        items: {
          create: [
            {
              itemId: firstItem!.id,
              itemName: firstItem!.name,
              hsnSac: firstItem!.hsnSac,
              unit: firstItem!.unit,
              quantity: 1,
            },
          ],
        },
      },
    });
    console.log(`[PASS] Created Delivery Challan in DB: "${newDC.challanNumber}" (ID: ${newDC.id})`);

    // Simulate backend server restart
    console.log('Simulating backend restart (running seedDatabase on startup)...');
    await seedDatabase();

    let foundDC = await prisma.deliveryChallan.findUnique({ where: { id: newDC.id } });
    if (!foundDC) {
      throw new Error(`Delivery Challan "${testDCNumber}" DISAPPEARED after backend restart!`);
    }
    console.log(`[PASS] Delivery Challan "${foundDC.challanNumber}" STILL EXISTS in database after server restart!`);

    // Test Deletion
    console.log('Deleting test Delivery Challan from database...');
    await prisma.deliveryChallanItem.deleteMany({ where: { deliveryChallanId: newDC.id } });
    await prisma.deliveryChallan.delete({ where: { id: newDC.id } });

    // Simulate backend server restart after deletion
    console.log('Simulating backend restart after deletion...');
    await seedDatabase();

    foundDC = await prisma.deliveryChallan.findUnique({ where: { id: newDC.id } });
    if (foundDC) {
      throw new Error(`Deleted Delivery Challan "${testDCNumber}" REAPPEARED after server restart!`);
    }
    console.log(`[PASS] Deleted Delivery Challan "${testDCNumber}" REMAINED DELETED permanently after server restart!`);

    // Clean up test customer
    await prisma.party.delete({ where: { id: newCustomer.id } });

    console.log('\n====================================================');
    console.log('ALL MANUAL PERSISTENCE VERIFICATIONS PASSED 100%!');
    console.log('====================================================');
  } catch (err: any) {
    console.error('PERSISTENCE VERIFICATION FAILED:', err);
    process.exit(1);
  }
}

runManualPersistenceVerification();
