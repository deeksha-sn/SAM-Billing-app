import { prisma } from '../src/db';
import { seedDatabase } from '../src/seed';

async function runDatabasePersistenceTest() {
  console.log('====================================================');
  console.log('TESTING DATABASE PERSISTENCE & SEED IDEMPOTENCY');
  console.log('====================================================');

  try {
    // 1. Initial State Check
    await seedDatabase();

    const initialPartyCount = await prisma.party.count();
    const initialItemCount = await prisma.item.count();
    const initialInvoiceCount = await prisma.invoice.count();
    const initialQuotationCount = await prisma.quotation.count();
    const initialChallanCount = await prisma.deliveryChallan.count();
    const initialPurchaseCount = await prisma.purchaseInvoice.count();
    const initialMachineCount = await prisma.machine.count();
    const initialServiceCount = await prisma.serviceTask.count();
    const initialPaymentCount = await prisma.payment.count();
    const initialExpenseCount = await prisma.expense.count();

    console.log(`[CHECK 1] Initial Database Record Counts:`);
    console.log(`          - Parties: ${initialPartyCount} (Min: 20)`);
    console.log(`          - Items: ${initialItemCount} (Min: 20)`);
    console.log(`          - Invoices: ${initialInvoiceCount} (Min: 10)`);
    console.log(`          - Quotations: ${initialQuotationCount} (Min: 10)`);
    console.log(`          - Delivery Challans: ${initialChallanCount} (Min: 10)`);
    console.log(`          - Purchase Invoices: ${initialPurchaseCount} (Min: 10)`);
    console.log(`          - Machines: ${initialMachineCount} (Min: 10)`);
    console.log(`          - Service Tasks: ${initialServiceCount} (Min: 10)`);
    console.log(`          - Payments: ${initialPaymentCount} (Min: 10)`);
    console.log(`          - Expenses: ${initialExpenseCount} (Min: 10)`);

    if (initialPartyCount < 20 || initialItemCount < 20 || initialInvoiceCount < 10) {
      throw new Error(`Initial seed dataset incomplete! Parties: ${initialPartyCount}, Items: ${initialItemCount}, Invoices: ${initialInvoiceCount}`);
    }

    // 2. Test Idempotency: Trigger seedDatabase() second time
    await seedDatabase();

    const postSeedPartyCount = await prisma.party.count();
    const postSeedInvoiceCount = await prisma.invoice.count();
    const postSeedItemCount = await prisma.item.count();

    if (postSeedPartyCount !== initialPartyCount || postSeedInvoiceCount !== initialInvoiceCount || postSeedItemCount !== initialItemCount) {
      throw new Error(`Idempotency check failed! Counts changed: Parties ${initialPartyCount} -> ${postSeedPartyCount}, Invoices ${initialInvoiceCount} -> ${postSeedInvoiceCount}`);
    }
    console.log('[PASS] CHECK 2: Seed Idempotency Verified! No duplicate records created on backend restart.');

    // 3. User Record Creation & Persistence Across Restart
    const customParty = await prisma.party.create({
      data: {
        name: 'User Persistent Customer',
        type: 'CUSTOMER',
        mobile: '9844000999',
        address: 'Haveri Town',
        state: 'Karnataka',
        stateCode: '29',
      },
    });

    const customItem = await prisma.item.create({
      data: {
        sku: 'USR-ITEM-001',
        name: 'User Custom Harvester Blade',
        type: 'SPARE_PART',
        hsnSac: '8208',
        unit: 'Nos',
        sellingPrice: 1200,
        purchasePrice: 800,
        currentStock: 50,
      },
    });

    const customInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'SAM-26-27-USERTEST-99',
        financialYear: '2026-2027',
        invoiceDate: new Date(),
        partyId: customParty.id,
        billingAddress: customParty.address,
        customerStateCode: customParty.stateCode,
        isInterState: false,
        taxableAmount: 1200,
        cgstAmount: 108,
        sgstAmount: 108,
        igstAmount: 0,
        grandTotal: 1416,
        amountPaid: 1416,
        balanceDue: 0,
        status: 'PAID',
        items: {
          create: [
            {
              itemId: customItem.id,
              itemName: customItem.name,
              hsnSac: customItem.hsnSac,
              unit: customItem.unit,
              quantity: 1,
              rate: 1200,
              taxableValue: 1200,
              gstRate: 18,
              cgstAmount: 108,
              sgstAmount: 108,
              totalAmount: 1416,
            },
          ],
        },
      },
      include: { items: true },
    });

    console.log(`[PASS] CHECK 3: Manually created User Invoice "${customInvoice.invoiceNumber}"`);

    // Simulate backend server restart
    await seedDatabase();

    const checkInvoiceExists = await prisma.invoice.findUnique({ where: { id: customInvoice.id } });
    const checkPartyExists = await prisma.party.findUnique({ where: { id: customParty.id } });

    if (!checkInvoiceExists || !checkPartyExists) {
      throw new Error('User-created records disappeared after backend restart simulation!');
    }
    console.log('[PASS] CHECK 4: User-created Party & Invoice persisted cleanly across server restart simulation!');

    // 4. Deletion Persistence: Manually delete invoice & simulate backend restart
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: customInvoice.id } });
    await prisma.invoice.delete({ where: { id: customInvoice.id } });

    // Simulate backend server restart again
    await seedDatabase();

    const checkDeletedInvoice = await prisma.invoice.findUnique({ where: { id: customInvoice.id } });
    if (checkDeletedInvoice) {
      throw new Error('Deleted invoice was automatically recreated by startup seed logic!');
    }
    console.log('[PASS] CHECK 5: Deleted Invoice remained deleted across server restart! No auto-recreation occurred.');

    // Clean up temporary user test records
    await prisma.item.delete({ where: { id: customItem.id } });
    await prisma.party.delete({ where: { id: customParty.id } });

    console.log('====================================================');
    console.log('ALL DATABASE PERSISTENCE TESTS PASSED PERFECTLY! 100%');
    console.log('====================================================');
  } catch (err: any) {
    console.error('DATABASE PERSISTENCE TEST FAILED:', err);
    process.exit(1);
  }
}

runDatabasePersistenceTest();
