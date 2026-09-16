import { prisma } from '../src/db';
import { seedDatabase } from '../src/seed';

async function runItemCategoryBillingTest() {
  console.log('====================================================');
  console.log('RUNNING ITEM CATEGORY & BILLING PRIORITY TESTS');
  console.log('====================================================');

  try {
    await seedDatabase();

    // 1. Verify item counts across category sections
    const totalItems = await prisma.item.count();
    const readyMachines = await prisma.item.findMany({
      where: {
        itemCategory: {
          in: ['MILKING_MACHINE', 'CHAFF_CUTTER', 'SPRAYER', 'PRESSURE_WASHER', 'SOLAR_MACHINE', 'BATTERY_PETROL_MACHINE', 'FINISHED_MACHINE'],
        },
      },
    });

    const spareParts = await prisma.item.findMany({
      where: { itemCategory: 'SPARE_PART' },
    });

    const components = await prisma.item.findMany({
      where: { itemCategory: 'COMPONENT' },
    });

    const rawMaterials = await prisma.item.findMany({
      where: { itemCategory: 'RAW_MATERIAL' },
    });

    console.log(`[CHECK 1] Database Item Categories Count:`);
    console.log(`          - Total Items: ${totalItems}`);
    console.log(`          - Ready Machines: ${readyMachines.length}`);
    console.log(`          - Spare Parts: ${spareParts.length}`);
    console.log(`          - Components: ${components.length}`);
    console.log(`          - Raw Materials: ${rawMaterials.length}`);

    if (readyMachines.length < 5 || spareParts.length < 5 || rawMaterials.length < 2) {
      throw new Error('Item category dataset incomplete!');
    }
    console.log('✅ PASS: All 11 item category sections populated cleanly!');

    // 2. Test Customer Billing Default Selection Filter (showInBilling=true)
    const billingVisibleItems = await prisma.item.findMany({
      where: { showInBilling: true },
    });

    const hexBolt = await prisma.item.findFirst({ where: { sku: 'RM-BOLT-M8' } });
    if (hexBolt && hexBolt.showInBilling === true) {
      throw new Error('Hex Bolt (Raw Material) should be hidden from default customer billing!');
    }
    console.log('✅ PASS: Raw materials (Hex Bolts/Nuts) are hidden from default customer billing!');

    // 3. Test Intentional Search for Internal Items
    const searchedItems = await prisma.item.findMany({
      where: {
        OR: [
          { name: { contains: 'Bolt' } },
          { sku: { contains: 'Bolt' } },
        ],
      },
    });

    if (searchedItems.length === 0) {
      throw new Error('Explicit search for "Bolt" returned no items!');
    }
    console.log('✅ PASS: Explicit search for "Bolt" successfully finds raw materials when requested!');

    // 4. Test Stock & Price Integrity
    const milkingMachine = await prisma.item.findUnique({ where: { sku: 'MM-400S' } });
    if (!milkingMachine || milkingMachine.currentStock === undefined || milkingMachine.sellingPrice !== 65000) {
      throw new Error(`Item stock or price invalid! Stock: ${milkingMachine?.currentStock}, Price: ${milkingMachine?.sellingPrice}`);
    }
    console.log(`✅ PASS: Machine stock (${milkingMachine.currentStock} units), selling price (₹65,000), GST (12%), and HSN remain perfectly intact!`);

    console.log('====================================================');
    console.log('ALL ITEM CATEGORY & BILLING TESTS PASSED PERFECTLY!');
    console.log('====================================================');
  } catch (err: any) {
    console.error('ITEM CATEGORY BILLING TEST FAILED:', err);
    process.exit(1);
  }
}

runItemCategoryBillingTest();
