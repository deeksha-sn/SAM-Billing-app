import { prisma } from '../src/db';
import { ensurePartyExists } from '../src/utils/partyHelper';
import { seedDatabase } from '../src/seed';

async function runInlineCustomerTest() {
  console.log('====================================================');
  console.log('TESTING INLINE NEW CUSTOMER ENTRY & PERSISTENCE');
  console.log('====================================================');

  try {
    await seedDatabase();

    // 1. Create a customer inline with name only (NO phone number)
    const testCustomerName = 'PERSISTENCE MOM CUSTOMER 98765';
    const draftData = {
      name: testCustomerName,
      type: 'CUSTOMER',
      mobile: '', // Optional empty phone
      address: 'Inline Address Haveri',
      state: 'Karnataka',
      stateCode: '29',
    };

    const resolvedId1 = await ensurePartyExists(prisma, 'NEW', draftData, 'CUSTOMER');
    console.log(`[PASS] Step 1: Created inline customer "${testCustomerName}" with ID: ${resolvedId1}`);

    const partyRecord = await prisma.party.findUnique({ where: { id: resolvedId1 } });
    if (!partyRecord) throw new Error('Customer record was not found in database!');
    if (partyRecord.name !== testCustomerName) throw new Error('Customer name mismatch!');
    if (partyRecord.mobile !== '') throw new Error(`Expected mobile to be empty string for optional phone, got: ${partyRecord.mobile}`);

    console.log(`[PASS] Step 2: Verified customer record in dev.db with mobile: ${partyRecord.mobile}`);

    // 2. Verify duplicate prevention (Existing customer selection)
    const resolvedId2 = await ensurePartyExists(prisma, 'NEW', draftData, 'CUSTOMER');
    if (resolvedId2 !== resolvedId1) {
      throw new Error(`Duplicate customer created! ID1: ${resolvedId1}, ID2: ${resolvedId2}`);
    }
    console.log(`[PASS] Step 3: Verified existing customer resolved correctly without creating duplicates.`);

    // 3. Create invoice linked to this inline customer
    const firstItem = await prisma.item.findFirst();
    if (!firstItem) throw new Error('No items in database');

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'SAM-TEST-INLINE-001',
        financialYear: '26-27',
        invoiceDate: new Date(),
        partyId: resolvedId1,
        customerStateCode: '29',
        isInterState: false,
        taxableAmount: 1000,
        cgstAmount: 90,
        sgstAmount: 90,
        igstAmount: 0,
        roundOff: 0,
        grandTotal: 1180,
        amountPaid: 1180,
        balanceDue: 0,
        status: 'CONFIRMED',
        items: {
          create: [
            {
              itemId: firstItem.id,
              itemName: firstItem.name,
              hsnSac: firstItem.hsnSac || '8436',
              unit: 'Nos',
              quantity: 1,
              rate: 1000,
              taxableValue: 1000,
              gstRate: 18,
              cgstAmount: 90,
              sgstAmount: 90,
              totalAmount: 1180,
            },
          ],
        },
      },
    });

    console.log(`[PASS] Step 4: Successfully created invoice ${invoice.invoiceNumber} linked to customer ${resolvedId1}`);

    // 4. Test database re-seed to ensure no data reset
    await seedDatabase();

    const postParty = await prisma.party.findUnique({ where: { id: resolvedId1 } });
    const postInvoice = await prisma.invoice.findUnique({ where: { id: invoice.id } });

    if (!postParty || !postInvoice) {
      throw new Error('Data was reset or lost after seed/restart!');
    }

    console.log('[PASS] Step 5: Data survived restart/re-seed! All records permanently persisted.');
    console.log('====================================================');
    console.log('ALL INLINE CUSTOMER CREATION & PERSISTENCE TESTS PASSED!');
    console.log('====================================================');
    process.exit(0);
  } catch (err: any) {
    console.error('TEST FAILED:', err.message || err);
    process.exit(1);
  }
}

runInlineCustomerTest();
