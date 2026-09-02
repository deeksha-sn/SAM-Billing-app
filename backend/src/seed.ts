import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log('Checking database state for persistent development sample data...');

  // 0. Idempotency Check: Do NOT overwrite, duplicate, or re-seed if invoices & parties already exist!
  const existingInvoiceCount = await prisma.invoice.count();
  const existingPartyCount = await prisma.party.count();

  if (existingInvoiceCount >= 10 && existingPartyCount >= 10) {
    console.log(`Development database already contains data (${existingPartyCount} parties, ${existingInvoiceCount} invoices). Preserving current database state.`);
    return;
  }

  console.log('Seeding Smart Agro Machinerys database with persistent development sample data...');

  // 1. Company Profile
  await prisma.companyProfile.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      businessName: 'Smart Agro Machinerys',
      address: 'Plot 42, Poona-Bangalore Road, Industrial Estate, Haveri, Karnataka - 581110',
      phone: '+91 9844011223',
      email: 'sales@smartagromachinerys.com',
      gstin: '29AAACS1234F1Z9',
      pan: 'AAACS1234F',
      state: 'Karnataka',
      stateCode: '29',
      pincode: '581110',
      bankName: 'Canara Bank',
      bankAccountNo: '0456201009876',
      ifsc: 'CNRB0000456',
      upiId: 'smartagro@cnrb',
    },
  });

  // 2. System Settings
  await prisma.systemSettings.upsert({
    where: { key: 'delivery_challan_affects_stock' },
    update: {},
    create: { key: 'delivery_challan_affects_stock', value: 'YES', description: 'Whether final Delivery Challan deducts stock' },
  });

  // 3. Default Users
  const adminPass = await bcrypt.hash('admin123', 10);
  const officePass = await bcrypt.hash('office123', 10);
  const techPass = await bcrypt.hash('tech123', 10);

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Sharan (Admin Manager)',
      username: 'admin',
      email: 'admin@smartagro.com',
      passwordHash: adminPass,
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { username: 'office' },
    update: {},
    create: {
      name: 'Office Billing Staff',
      username: 'office',
      email: 'billing@smartagro.com',
      passwordHash: officePass,
      role: 'OFFICE',
    },
  });

  const techRavi = await prisma.user.upsert({
    where: { username: 'ravi' },
    update: {},
    create: {
      name: 'Ravi Technician',
      username: 'ravi',
      mobile: '9844099111',
      email: 'ravi@smartagro.com',
      passwordHash: techPass,
      role: 'SERVICE_TECHNICIAN',
    },
  });

  const techKumar = await prisma.user.upsert({
    where: { username: 'kumar' },
    update: {},
    create: {
      name: 'Kumar Senior Technician',
      username: 'kumar',
      mobile: '9844099222',
      email: 'kumar@smartagro.com',
      passwordHash: techPass,
      role: 'SERVICE_TECHNICIAN',
    },
  });

  // 4. Categories
  const catMachines = await prisma.category.upsert({
    where: { name: 'Agricultural Machines' },
    update: {},
    create: { name: 'Agricultural Machines', description: 'Finished farm machinery' },
  });
  const catSpares = await prisma.category.upsert({
    where: { name: 'Motors & Spares' },
    update: {},
    create: { name: 'Motors & Spares', description: 'Electric motors and spare parts' },
  });

  // 5. Items / Products (20+ Items)
  const itemsData = [
    { sku: 'CC-01', name: 'Heavy Duty Chaff Cutter 2HP', type: 'FINISHED_MACHINE', hsnSac: '8436', gstRate: 18.0, purchasePrice: 22000, sellingPrice: 45000, currentStock: 15, unit: 'Nos' },
    { sku: 'MM-400S', name: 'Milking Machine Double Bucket 400S', type: 'FINISHED_MACHINE', hsnSac: '8434', gstRate: 12.0, purchasePrice: 38000, sellingPrice: 65000, currentStock: 10, unit: 'Nos' },
    { sku: 'MOT-2HP', name: 'Electric Motor 2HP Single Phase', type: 'COMPONENT', hsnSac: '8501', gstRate: 18.0, purchasePrice: 5800, sellingPrice: 8500, currentStock: 25, unit: 'Nos' },
    { sku: 'BLD-01', name: 'High Carbon Chaff Blade Set (4 Pcs)', type: 'SPARE_PART', hsnSac: '8208', gstRate: 18.0, purchasePrice: 450, sellingPrice: 750, currentStock: 60, unit: 'Sets' },
    { sku: 'SPR-16L', name: 'Battery Sprayer 16L Heavy Duty', type: 'FINISHED_MACHINE', hsnSac: '8424', gstRate: 12.0, purchasePrice: 2800, sellingPrice: 4500, currentStock: 20, unit: 'Nos' },
    { sku: 'CAN-40L', name: 'Stainless Steel Milk Can 40L', type: 'EQUIPMENT', hsnSac: '7310', gstRate: 12.0, purchasePrice: 2400, sellingPrice: 3800, currentStock: 30, unit: 'Nos' },
    { sku: 'TUP-SET', name: 'Teat Cup Assembly Set of 4', type: 'SPARE_PART', hsnSac: '8434', gstRate: 18.0, purchasePrice: 1500, sellingPrice: 2400, currentStock: 40, unit: 'Sets' },
    { sku: 'LIN-RUB', name: 'Rubber Liner Set (4 Pcs)', type: 'SPARE_PART', hsnSac: '4016', gstRate: 18.0, purchasePrice: 480, sellingPrice: 850, currentStock: 50, unit: 'Sets' },
    { sku: 'PMP-300', name: 'Oil Free Vacuum Pump 300L', type: 'COMPONENT', hsnSac: '8414', gstRate: 18.0, purchasePrice: 9500, sellingPrice: 14500, currentStock: 12, unit: 'Nos' },
    { sku: 'CC-MINI', name: 'Mini Portable Chaff Cutter 1.5HP', type: 'FINISHED_MACHINE', hsnSac: '8436', gstRate: 12.0, purchasePrice: 16500, sellingPrice: 28000, currentStock: 8, unit: 'Nos' },
    { sku: 'CUL-3TY', name: 'Tractor Cultivator 3 Tyne', type: 'FINISHED_MACHINE', hsnSac: '8432', gstRate: 12.0, purchasePrice: 14000, sellingPrice: 22000, currentStock: 6, unit: 'Nos' },
    { sku: 'HAR-BLD', name: 'Combine Harvester Blade Heavy', type: 'SPARE_PART', hsnSac: '8208', gstRate: 18.0, purchasePrice: 320, sellingPrice: 580, currentStock: 45, unit: 'Nos' },
    { sku: 'OIL-SEL', name: 'High Temperature Oil Seal Set', type: 'SPARE_PART', hsnSac: '8484', gstRate: 18.0, purchasePrice: 120, sellingPrice: 250, currentStock: 80, unit: 'Sets' },
    { sku: 'BRG-6204', name: 'Heavy Duty Ball Bearing 6204', type: 'SPARE_PART', hsnSac: '8482', gstRate: 18.0, purchasePrice: 180, sellingPrice: 340, currentStock: 75, unit: 'Nos' },
    { sku: 'VBLT-B42', name: 'Industrial V-Belt B42', type: 'SPARE_PART', hsnSac: '4010', gstRate: 18.0, purchasePrice: 220, sellingPrice: 420, currentStock: 55, unit: 'Nos' },
    { sku: 'GAG-100', name: 'Vacuum Pressure Gauge 100 PSI', type: 'SPARE_PART', hsnSac: '9026', gstRate: 18.0, purchasePrice: 650, sellingPrice: 1200, currentStock: 25, unit: 'Nos' },
    { sku: 'STR-SS', name: 'Stainless Steel Milk Strainer', type: 'EQUIPMENT', hsnSac: '7323', gstRate: 12.0, purchasePrice: 850, sellingPrice: 1450, currentStock: 35, unit: 'Nos' },
    { sku: 'SLR-CHG', name: 'Solar Fence Charger 12V', type: 'FINISHED_MACHINE', hsnSac: '8543', gstRate: 12.0, purchasePrice: 6200, sellingPrice: 9800, currentStock: 14, unit: 'Nos' },
    { sku: 'BRS-CUT', name: 'Petrol Brush Cutter 52cc', type: 'FINISHED_MACHINE', hsnSac: '8467', gstRate: 18.0, purchasePrice: 9800, sellingPrice: 16500, currentStock: 9, unit: 'Nos' },
    { sku: 'OIL-4T', name: 'Agro Engine Oil 4T 1 Litre', type: 'SPARE_PART', hsnSac: '2710', gstRate: 18.0, purchasePrice: 280, sellingPrice: 480, currentStock: 90, unit: 'Cans' },
  ];

  const dbItems: any[] = [];
  for (const itemDef of itemsData) {
    const item = await prisma.item.upsert({
      where: { sku: itemDef.sku },
      update: {},
      create: {
        name: itemDef.name,
        sku: itemDef.sku,
        type: itemDef.type,
        categoryId: catMachines.id,
        unit: itemDef.unit,
        hsnSac: itemDef.hsnSac,
        gstRate: itemDef.gstRate,
        purchasePrice: itemDef.purchasePrice,
        sellingPrice: itemDef.sellingPrice,
        minStock: 2,
        currentStock: itemDef.currentStock,
      },
    });
    dbItems.push(item);
  }

  // 6. Parties (20 Parties - 10 Customers + 10 Suppliers across KA, MH, TN)
  const partiesData = [
    // Customers (10)
    { name: 'Akshayakalpa Farms & Foods Pvt Ltd', type: 'CUSTOMER', customerType: 'BUSINESS', mobile: '9620409800', address: 'Tiptur Road, Dairy Division', state: 'Karnataka', stateCode: '29', pincode: '572201', gstin: '29AICA4264B1ZU' },
    { name: 'Sahyadri Agro Producers Co-op', type: 'CUSTOMER', customerType: 'DEALER', mobile: '9845011999', address: 'APMC Yard, Main Road', state: 'Karnataka', stateCode: '29', pincode: '577201', gstin: '29AAACS9876K1Z1' },
    { name: 'Kaveri Milk Dairy & Farm', type: 'CUSTOMER', customerType: 'BUSINESS', mobile: '9741033777', address: 'Bypass Road, Dairy Circle', state: 'Karnataka', stateCode: '29', pincode: '573201', gstin: '29AABCK1122M1Z3' },
    { name: 'Venkateshwara Agro Traders', type: 'CUSTOMER', customerType: 'DEALER', mobile: '9822088777', address: 'Market Yard, Kolhapur', state: 'Maharashtra', stateCode: '27', pincode: '416001', gstin: '27AAACV5544N1Z5' },
    { name: 'Coimbatore Farm Supplies', type: 'CUSTOMER', customerType: 'DEALER', mobile: '9443077666', address: 'Trichy Road, Coimbatore', state: 'Tamil Nadu', stateCode: '33', pincode: '641018', gstin: '33AAACC9988P1Z7' },
    { name: 'Vijayanagar Agro Agencies', type: 'CUSTOMER', customerType: 'DEALER', mobile: '9448055444', address: 'Station Road, Hospet', state: 'Karnataka', stateCode: '29', pincode: '583201', gstin: '29AABCV7766R1Z9' },
    { name: 'Sri Lakshmi Dairy Farm', type: 'CUSTOMER', customerType: 'FARMER', mobile: '9535055555', address: 'Farm House, Mandya Road', state: 'Karnataka', stateCode: '29', pincode: '571401', gstin: '' },
    { name: 'Malnad Farmers Association', type: 'CUSTOMER', customerType: 'DEALER', mobile: '9844077888', address: 'Main Road, Chikkamagaluru', state: 'Karnataka', stateCode: '29', pincode: '577101', gstin: '29AAACM4455Q1Z2' },
    { name: 'Krishna Valley Dairy Farm', type: 'CUSTOMER', customerType: 'BUSINESS', mobile: '9823066555', address: 'Sangli Road, Miraj', state: 'Maharashtra', stateCode: '27', pincode: '416410', gstin: '27AAACK1122S1Z4' },
    { name: 'Salem Farm Machinery Hub', type: 'CUSTOMER', customerType: 'DEALER', mobile: '9442033444', address: 'Bypass Highway, Salem', state: 'Tamil Nadu', stateCode: '33', pincode: '636004', gstin: '33AAACS5566T1Z6' },

    // Suppliers (10)
    { name: 'Bharat Machinery & Motors', type: 'SUPPLIER', customerType: 'BUSINESS', mobile: '9880099887', address: 'Gokul Road, Hubli', state: 'Karnataka', stateCode: '29', pincode: '580030', gstin: '29AAACB1122D1Z4' },
    { name: 'Karnataka Agro Spares Ltd', type: 'SUPPLIER', customerType: 'BUSINESS', mobile: '9844088111', address: 'Peenya Industrial Area, Bangalore', state: 'Karnataka', stateCode: '29', pincode: '560058', gstin: '29AAACK3344E1Z6' },
    { name: 'Deccan Dairy Equipment Co', type: 'SUPPLIER', customerType: 'BUSINESS', mobile: '9823077111', address: 'MIDC Area, Pune', state: 'Maharashtra', stateCode: '27', pincode: '411026', gstin: '27AAACD7788F1Z8' },
    { name: 'Kirloskar Oil Engines Ltd', type: 'SUPPLIER', customerType: 'BUSINESS', mobile: '9822011223', address: 'Laxmanrao Kirloskar Road, Pune', state: 'Maharashtra', stateCode: '27', pincode: '411003', gstin: '27AAACK0011G1Z1' },
    { name: 'Southern Rubber Products', type: 'SUPPLIER', customerType: 'BUSINESS', mobile: '9443022334', address: 'Industrial Estate, Madurai', state: 'Tamil Nadu', stateCode: '33', pincode: '625018', gstin: '33AAACS2233H1Z3' },
    { name: 'Bangalore Precision Hydraulics', type: 'SUPPLIER', customerType: 'BUSINESS', mobile: '9845033445', address: 'Bommasandra Industrial Area, Bangalore', state: 'Karnataka', stateCode: '29', pincode: '560099', gstin: '29AAACB4455I1Z5' },
    { name: 'Apex Motors & Components', type: 'SUPPLIER', customerType: 'BUSINESS', mobile: '9886044556', address: 'Belgaum Industrial Zone, Belgaum', state: 'Karnataka', stateCode: '29', pincode: '590011', gstin: '29AAACA6677J1Z7' },
    { name: 'National Steel & Sheet Works', type: 'SUPPLIER', customerType: 'BUSINESS', mobile: '9844055667', address: 'Bhadravathi Steel Town', state: 'Karnataka', stateCode: '29', pincode: '577301', gstin: '29AAACN8899K1Z9' },
    { name: 'Coimbatore Foundry & Castings', type: 'SUPPLIER', customerType: 'BUSINESS', mobile: '9443066778', address: 'Ganapathy Industrial Post, Coimbatore', state: 'Tamil Nadu', stateCode: '33', pincode: '641006', gstin: '33AAACC1122L1Z2' },
    { name: 'West Coast Agro Accessories', type: 'SUPPLIER', customerType: 'BUSINESS', mobile: '9822077889', address: 'Thane Belapur Road, Navi Mumbai', state: 'Maharashtra', stateCode: '27', pincode: '400705', gstin: '27AAACW3344M1Z4' },
  ];

  const dbParties: any[] = [];
  for (const partyDef of partiesData) {
    let party = await prisma.party.findFirst({ where: { mobile: partyDef.mobile } });
    if (!party) {
      party = await prisma.party.create({
        data: {
          name: partyDef.name,
          type: partyDef.type,
          customerType: partyDef.customerType,
          mobile: partyDef.mobile,
          address: partyDef.address,
          shippingAddress: `${partyDef.address}, ${partyDef.state} - ${partyDef.pincode}`,
          state: partyDef.state,
          stateCode: partyDef.stateCode,
          pincode: partyDef.pincode,
          gstin: partyDef.gstin || null,
          openingBalance: 0,
        },
      });
    }
    dbParties.push(party);
  }

  // 7. Farmers / Contacts (10 Farmers linked under parent parties)
  const farmersData = [
    { parentMobile: '9620409800', name: 'Ramesh Agro Farm', mobile: '9844011223', address: 'Plot 4, Haveri Main Road, Haveri' },
    { parentMobile: '9620409800', name: 'Mahesh Farm', mobile: '6366959062', address: 'Main Dairy Road, Tiptur' },
    { parentMobile: '9620409800', name: 'Suma Dairy', mobile: '7676468179', address: 'Channarayapatna Road, Arasikere' },
    { parentMobile: '9620409800', name: 'Ravi Farm', mobile: '9620409869', address: 'Gubbi Gate, Tumkur' },
    { parentMobile: '9845011999', name: 'Anjanappa Farm', mobile: '9845011991', address: 'Bhadra Colony, Shimoga' },
    { parentMobile: '9845011999', name: 'Basavaraj Agro', mobile: '9448022888', address: 'Tarikere Road, Shimoga' },
    { parentMobile: '9741033777', name: 'Manjunath Farm', mobile: '9741033771', address: 'Dairy Circle, Hassan' },
    { parentMobile: '9741033777', name: 'Shivakumar Dairy', mobile: '9611044666', address: 'Holenarasipura Road, Hassan' },
    { parentMobile: '9535055555', name: 'Suresh Agro', mobile: '9535055551', address: 'Sugar Town, Mandya' },
    { parentMobile: '9535055555', name: 'Chennappa Dairy', mobile: '9880066444', address: 'Koppa Circle, Maddur' },
  ];

  const dbFarmers: any[] = [];
  for (const farmerDef of farmersData) {
    const parentParty = dbParties.find((p) => p.mobile === farmerDef.parentMobile);
    if (!parentParty) continue;

    let farmer = await prisma.farmer.findFirst({ where: { partyId: parentParty.id, mobile: farmerDef.mobile } });
    if (!farmer) {
      farmer = await prisma.farmer.create({
        data: {
          partyId: parentParty.id,
          name: farmerDef.name,
          mobile: farmerDef.mobile,
          address: farmerDef.address,
          shippingAddress: `${farmerDef.address}, Karnataka`,
          state: 'Karnataka',
          stateCode: '29',
        },
      });
    }
    dbFarmers.push(farmer);
  }

  // 8. Machines & Serial Numbers Assigned to Farmers (10 Machines)
  const machinesData = [
    { serialNumber: 'MM-26-0001', itemSku: 'MM-400S', farmerMobile: '9844011223', model: 'Milking Machine Double Bucket' },
    { serialNumber: 'CC-26-0002', itemSku: 'CC-01', farmerMobile: '9844011223', model: 'Heavy Duty Chaff Cutter 2HP' },
    { serialNumber: 'MM-26-0003', itemSku: 'MM-400S', farmerMobile: '6366959062', model: 'Milking Machine Double Bucket' },
    { serialNumber: 'SPR-26-0004', itemSku: 'SPR-16L', farmerMobile: '7676468179', model: 'Battery Sprayer 16L' },
    { serialNumber: 'CC-26-0005', itemSku: 'CC-01', farmerMobile: '9620409869', model: 'Heavy Duty Chaff Cutter 2HP' },
    { serialNumber: 'MM-26-0006', itemSku: 'MM-400S', farmerMobile: '9845011991', model: 'Milking Machine Double Bucket' },
    { serialNumber: 'CC-26-0007', itemSku: 'CC-01', farmerMobile: '9448022888', model: 'Heavy Duty Chaff Cutter 2HP' },
    { serialNumber: 'MOT-26-0008', itemSku: 'MOT-2HP', farmerMobile: '9741033771', model: 'Electric Motor 2HP' },
    { serialNumber: 'MM-26-0009', itemSku: 'MM-400S', farmerMobile: '9611044666', model: 'Milking Machine Double Bucket' },
    { serialNumber: 'CC-MINI-0010', itemSku: 'CC-MINI', farmerMobile: '9535055551', model: 'Mini Portable Chaff Cutter 1.5HP' },
  ];

  const dbMachines: any[] = [];
  for (const mDef of machinesData) {
    const targetFarmer = dbFarmers.find((f) => f.mobile === mDef.farmerMobile);
    const targetItem = dbItems.find((i) => i.sku === mDef.itemSku);
    if (!targetFarmer || !targetItem) continue;

    let machine = await prisma.machine.findUnique({ where: { serialNumber: mDef.serialNumber } });
    if (!machine) {
      machine = await prisma.machine.create({
        data: {
          partyId: targetFarmer.partyId,
          farmerId: targetFarmer.id,
          machineItemId: targetItem.id,
          model: mDef.model,
          serialNumber: mDef.serialNumber,
          saleDate: new Date(),
          warrantyStart: new Date(),
          warrantyEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          serviceIntervalDays: 90,
          nextServiceDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          assignedTechnicianId: techRavi.id,
          location: targetFarmer.address,
        },
      });
    }
    dbMachines.push(machine);
  }

  // 9. Service Tasks (10 Tasks - Due Today, Overdue, Upcoming, Completed)
  const today = new Date();
  const serviceTasksData = [
    { serviceNo: 'SRV-26-27-0001', machineIndex: 0, dueDate: today, status: 'SCHEDULED', techId: techRavi.id, notes: 'Routine 90-day checkup due today' },
    { serviceNo: 'SRV-26-27-0002', machineIndex: 1, dueDate: today, status: 'SCHEDULED', techId: techKumar.id, notes: 'Chaff cutter blade inspection due today' },
    { serviceNo: 'SRV-26-27-0003', machineIndex: 2, dueDate: new Date(today.getTime() - 5 * 86400000), status: 'SCHEDULED', techId: techRavi.id, notes: 'Overdue service checkup' },
    { serviceNo: 'SRV-26-27-0004', machineIndex: 3, dueDate: new Date(today.getTime() - 10 * 86400000), status: 'SCHEDULED', techId: techKumar.id, notes: 'Sprayer pump pressure check overdue' },
    { serviceNo: 'SRV-26-27-0005', machineIndex: 4, dueDate: new Date(today.getTime() + 14 * 86400000), status: 'SCHEDULED', techId: techRavi.id, notes: 'Upcoming quarterly maintenance' },
    { serviceNo: 'SRV-26-27-0006', machineIndex: 5, dueDate: new Date(today.getTime() + 30 * 86400000), status: 'SCHEDULED', techId: techKumar.id, notes: 'Upcoming milking liner check' },
    { serviceNo: 'SRV-26-27-0007', machineIndex: 6, dueDate: new Date(today.getTime() + 45 * 86400000), status: 'SCHEDULED', techId: techRavi.id, notes: 'Upcoming belt tension check' },
    { serviceNo: 'SRV-26-27-0008', machineIndex: 7, dueDate: new Date(today.getTime() + 60 * 86400000), status: 'SCHEDULED', techId: techKumar.id, notes: 'Upcoming motor winding check' },
    { serviceNo: 'SRV-26-27-0009', machineIndex: 8, dueDate: new Date(today.getTime() - 15 * 86400000), status: 'COMPLETED', techId: techRavi.id, notes: 'Service completed cleanly' },
    { serviceNo: 'SRV-26-27-0010', machineIndex: 9, dueDate: new Date(today.getTime() - 20 * 86400000), status: 'COMPLETED', techId: techKumar.id, notes: 'First service done' },
  ];

  for (const sDef of serviceTasksData) {
    const machine = dbMachines[sDef.machineIndex];
    if (!machine) continue;

    let sTask = await prisma.serviceTask.findUnique({ where: { serviceNo: sDef.serviceNo } });
    if (!sTask) {
      await prisma.serviceTask.create({
        data: {
          serviceNo: sDef.serviceNo,
          machineId: machine.id,
          partyId: machine.partyId,
          farmerId: machine.farmerId,
          serialNumber: machine.serialNumber,
          serviceDueDate: sDef.dueDate,
          assignedTechnicianId: sDef.techId,
          status: sDef.status,
          technicianNotes: sDef.notes,
        },
      });
    }
  }

  // 10. Sales Invoices (10 Invoices)
  const invoicesData = [
    { no: 'SAM-26-27-0001', partyIndex: 0, farmerIndex: 0, itemIndex: 0, qty: 1, rate: 45000, gstRate: 18, isInter: false, paid: 53100, status: 'PAID', mode: 'BANK TRANSFER' },
    { no: 'SAM-26-27-0002', partyIndex: 0, farmerIndex: 1, itemIndex: 1, qty: 1, rate: 65000, gstRate: 12, isInter: false, paid: 72800, status: 'PAID', mode: 'NEFT' },
    { no: 'SAM-26-27-0003', partyIndex: 1, farmerIndex: 4, itemIndex: 2, qty: 2, rate: 8500, gstRate: 18, isInter: false, paid: 10000, status: 'PARTIALLY_PAID', mode: 'UPI' },
    { no: 'SAM-26-27-0004', partyIndex: 2, farmerIndex: 6, itemIndex: 4, qty: 3, rate: 4500, gstRate: 12, isInter: false, paid: 0, status: 'UNPAID', mode: 'CREDIT' },
    { no: 'SAM-26-27-0005', partyIndex: 3, farmerIndex: null, itemIndex: 0, qty: 2, rate: 45000, gstRate: 18, isInter: true, paid: 106200, status: 'PAID', mode: 'RTGS' },
    { no: 'SAM-26-27-0006', partyIndex: 4, farmerIndex: null, itemIndex: 1, qty: 1, rate: 65000, gstRate: 12, isInter: true, paid: 72800, status: 'PAID', mode: 'BANK TRANSFER' },
    { no: 'SAM-26-27-0007', partyIndex: 5, farmerIndex: null, itemIndex: 3, qty: 10, rate: 750, gstRate: 18, isInter: false, paid: 8850, status: 'PAID', mode: 'CASH' },
    { no: 'SAM-26-27-0008', partyIndex: 6, farmerIndex: 8, itemIndex: 5, qty: 2, rate: 3800, gstRate: 12, isInter: false, paid: 8512, status: 'PAID', mode: 'UPI' },
    { no: 'SAM-26-27-0009', partyIndex: 0, farmerIndex: 2, itemIndex: 6, qty: 2, rate: 2400, gstRate: 18, isInter: false, paid: 0, status: 'UNPAID', mode: 'CREDIT' },
    { no: 'SAM-26-27-0010', partyIndex: 1, farmerIndex: 5, itemIndex: 9, qty: 1, rate: 28000, gstRate: 12, isInter: false, paid: 15000, status: 'PARTIALLY_PAID', mode: 'CASH' },
  ];

  const dbInvoices: any[] = [];
  for (const invDef of invoicesData) {
    const party = dbParties[invDef.partyIndex];
    const farmer = invDef.farmerIndex !== null ? dbFarmers[invDef.farmerIndex] : null;
    const item = dbItems[invDef.itemIndex];
    if (!party || !item) continue;

    let existingInv = await prisma.invoice.findUnique({ where: { invoiceNumber: invDef.no } });
    if (!existingInv) {
      const taxable = invDef.qty * invDef.rate;
      const taxTotal = (taxable * invDef.gstRate) / 100;
      const cgst = invDef.isInter ? 0 : taxTotal / 2;
      const sgst = invDef.isInter ? 0 : taxTotal / 2;
      const igst = invDef.isInter ? taxTotal : 0;
      const grand = taxable + taxTotal;
      const bal = Math.max(0, grand - invDef.paid);

      existingInv = await prisma.invoice.create({
        data: {
          invoiceNumber: invDef.no,
          financialYear: '2026-2027',
          invoiceDate: new Date(Date.now() - (10 - invoicesData.indexOf(invDef)) * 86400000 * 3),
          partyId: party.id,
          farmerId: farmer?.id || null,
          billingAddress: party.address,
          deliveryAddress: farmer?.shippingAddress || party.shippingAddress || party.address,
          deliveryLocation: farmer?.shippingAddress || party.shippingAddress || party.address,
          customerStateCode: party.stateCode,
          isInterState: invDef.isInter,
          taxableAmount: taxable,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: igst,
          grandTotal: grand,
          amountPaid: invDef.paid,
          balanceDue: bal,
          paymentMode: invDef.mode,
          status: invDef.status,
          items: {
            create: [
              {
                itemId: item.id,
                itemName: item.name,
                hsnSac: item.hsnSac,
                unit: item.unit,
                quantity: invDef.qty,
                rate: invDef.rate,
                taxableValue: taxable,
                gstRate: invDef.gstRate,
                cgstAmount: cgst,
                sgstAmount: sgst,
                igstAmount: igst,
                totalAmount: grand,
              },
            ],
          },
        },
      });

      // Explicit Payment records for paid/partial invoices (10 Payments)
      if (invDef.paid > 0) {
        await prisma.payment.create({
          data: {
            receiptNo: `PAY-INV-${invDef.no.substring(10)}`,
            financialYear: '2026-2027',
            paymentType: 'CUSTOMER_PAYMENT',
            partyId: party.id,
            amount: invDef.paid,
            paymentMode: invDef.mode,
            date: existingInv.invoiceDate,
            referenceNo: `REF-${invDef.no}`,
            notes: `Payment received for invoice ${invDef.no}`,
          },
        });
      }
    }
    dbInvoices.push(existingInv);
  }

  // 11. Quotations (10 Quotations)
  const quotationsData = [
    { no: 'QUO-26-27-0001', partyIndex: 0, farmerIndex: 0, itemIndex: 0, qty: 1, rate: 45000, gstRate: 18, isInter: false, status: 'ACTIVE' },
    { no: 'QUO-26-27-0002', partyIndex: 0, farmerIndex: 1, itemIndex: 1, qty: 1, rate: 65000, gstRate: 12, isInter: false, status: 'ACTIVE' },
    { no: 'QUO-26-27-0003', partyIndex: 1, farmerIndex: 4, itemIndex: 2, qty: 5, rate: 8500, gstRate: 18, isInter: false, status: 'ACTIVE' },
    { no: 'QUO-26-27-0004', partyIndex: 2, farmerIndex: 6, itemIndex: 3, qty: 20, rate: 750, gstRate: 18, isInter: false, status: 'EXPIRED' },
    { no: 'QUO-26-27-0005', partyIndex: 3, farmerIndex: null, itemIndex: 0, qty: 3, rate: 44000, gstRate: 18, isInter: true, status: 'ACTIVE' },
    { no: 'QUO-26-27-0006', partyIndex: 4, farmerIndex: null, itemIndex: 1, qty: 2, rate: 64000, gstRate: 12, isInter: true, status: 'ACTIVE' },
    { no: 'QUO-26-27-0007', partyIndex: 5, farmerIndex: null, itemIndex: 4, qty: 5, rate: 4500, gstRate: 12, isInter: false, status: 'ACTIVE' },
    { no: 'QUO-26-27-0008', partyIndex: 6, farmerIndex: 8, itemIndex: 5, qty: 10, rate: 3800, gstRate: 12, isInter: false, status: 'ACTIVE' },
    { no: 'QUO-26-27-0009', partyIndex: 0, farmerIndex: 2, itemIndex: 8, qty: 1, rate: 14500, gstRate: 18, isInter: false, status: 'EXPIRED' },
    { no: 'QUO-26-27-0010', partyIndex: 1, farmerIndex: 5, itemIndex: 9, qty: 2, rate: 28000, gstRate: 12, isInter: false, status: 'ACTIVE' },
  ];

  for (const qDef of quotationsData) {
    const party = dbParties[qDef.partyIndex];
    const farmer = qDef.farmerIndex !== null ? dbFarmers[qDef.farmerIndex] : null;
    const item = dbItems[qDef.itemIndex];
    if (!party || !item) continue;

    let existingQ = await prisma.quotation.findUnique({ where: { quotationNumber: qDef.no } });
    if (!existingQ) {
      const taxable = qDef.qty * qDef.rate;
      const taxTotal = (taxable * qDef.gstRate) / 100;
      const cgst = qDef.isInter ? 0 : taxTotal / 2;
      const sgst = qDef.isInter ? 0 : taxTotal / 2;
      const igst = qDef.isInter ? taxTotal : 0;
      const grand = taxable + taxTotal;

      await prisma.quotation.create({
        data: {
          quotationNumber: qDef.no,
          financialYear: '2026-2027',
          quotationDate: new Date(Date.now() - (10 - quotationsData.indexOf(qDef)) * 86400000 * 2),
          partyId: party.id,
          farmerId: farmer?.id || null,
          customerStateCode: party.stateCode,
          isInterState: qDef.isInter,
          taxableAmount: taxable,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: igst,
          grandTotal: grand,
          status: qDef.status,
          items: {
            create: [
              {
                itemId: item.id,
                itemName: item.name,
                hsnSac: item.hsnSac,
                unit: item.unit,
                quantity: qDef.qty,
                rate: qDef.rate,
                taxableValue: taxable,
                gstRate: qDef.gstRate,
                cgstAmount: cgst,
                sgstAmount: sgst,
                igstAmount: igst,
                totalAmount: grand,
              },
            ],
          },
        },
      });
    }
  }

  // 12. Delivery Challans (10 Delivery Challans)
  const challansData = [
    { no: 'DC-26-27-0001', partyIndex: 0, farmerIndex: 0, itemIndex: 0, qty: 1, serial: 'MM-26-0001', vehicle: 'KA-27-M-1001', transport: 'VRL Logistics', status: 'CONFIRMED' },
    { no: 'DC-26-27-0002', partyIndex: 0, farmerIndex: 1, itemIndex: 1, qty: 1, serial: 'CC-26-0002', vehicle: 'KA-27-M-1002', transport: 'Direct Farm Transport', status: 'CONFIRMED' },
    { no: 'DC-26-27-0003', partyIndex: 1, farmerIndex: 4, itemIndex: 2, qty: 2, serial: 'MOT-26-0008', vehicle: 'KA-14-B-3344', transport: 'KRL Cargo', status: 'CONFIRMED' },
    { no: 'DC-26-27-0004', partyIndex: 2, farmerIndex: 6, itemIndex: 4, qty: 3, serial: 'SPR-26-0004', vehicle: 'KA-19-C-5566', transport: 'Local Tempo Delivery', status: 'CONFIRMED' },
    { no: 'DC-26-27-0005', partyIndex: 3, farmerIndex: null, itemIndex: 0, qty: 2, serial: 'CC-26-0005', vehicle: 'MH-12-PQ-9988', transport: 'Interstate Express', status: 'CONFIRMED' },
    { no: 'DC-26-27-0006', partyIndex: 4, farmerIndex: null, itemIndex: 1, qty: 1, serial: 'MM-26-0006', vehicle: 'TN-38-XY-4433', transport: 'Southern Roadways', status: 'CONFIRMED' },
    { no: 'DC-26-27-0007', partyIndex: 5, farmerIndex: null, itemIndex: 3, qty: 10, serial: 'BLD-BATCH-01', vehicle: 'KA-36-E-1122', transport: 'VRL Logistics', status: 'CONFIRMED' },
    { no: 'DC-26-27-0008', partyIndex: 6, farmerIndex: 8, itemIndex: 5, qty: 2, serial: 'CAN-BATCH-02', vehicle: 'KA-11-F-7788', transport: 'Self Pickup', status: 'CONFIRMED' },
    { no: 'DC-26-27-0009', partyIndex: 0, farmerIndex: 2, itemIndex: 6, qty: 2, serial: 'TUP-BATCH-03', vehicle: 'KA-27-M-2020', transport: 'VRL Logistics', status: 'DRAFT' },
    { no: 'DC-26-27-0010', partyIndex: 1, farmerIndex: 5, itemIndex: 9, qty: 1, serial: 'CC-MINI-0010', vehicle: 'KA-14-M-9911', transport: 'Local Auto', status: 'CONFIRMED' },
  ];

  for (const dcDef of challansData) {
    const party = dbParties[dcDef.partyIndex];
    const farmer = dcDef.farmerIndex !== null ? dbFarmers[dcDef.farmerIndex] : null;
    const item = dbItems[dcDef.itemIndex];
    if (!party || !item) continue;

    let existingDC = await prisma.deliveryChallan.findUnique({ where: { challanNumber: dcDef.no } });
    if (!existingDC) {
      await prisma.deliveryChallan.create({
        data: {
          challanNumber: dcDef.no,
          financialYear: '2026-2027',
          challanDate: new Date(Date.now() - (10 - challansData.indexOf(dcDef)) * 86400000 * 2),
          partyId: party.id,
          farmerId: farmer?.id || null,
          deliveryAddress: farmer?.shippingAddress || party.shippingAddress || party.address,
          deliveryLocation: farmer?.shippingAddress || party.shippingAddress || party.address,
          contactNumber: farmer?.mobile || party.mobile,
          vehicleNumber: dcDef.vehicle,
          transporter: dcDef.transport,
          transportName: dcDef.transport,
          reason: 'Delivery against sale',
          affectsStock: true,
          stockDeducted: dcDef.status === 'CONFIRMED',
          status: dcDef.status,
          items: {
            create: [
              {
                itemId: item.id,
                itemName: item.name,
                hsnSac: item.hsnSac,
                unit: item.unit,
                quantity: dcDef.qty,
                freeQuantity: 0,
                serialNumber: dcDef.serial,
              },
            ],
          },
        },
      });
    }
  }

  // 13. Purchases (10 Purchases from Suppliers)
  const purchasesData = [
    { no: 'PUR-26-27-0001', supplierIndex: 10, itemIndex: 2, qty: 10, rate: 5800, gstRate: 18, isInter: false, paid: 68440, status: 'PAID' },
    { no: 'PUR-26-27-0002', supplierIndex: 10, itemIndex: 8, qty: 5, rate: 9500, gstRate: 18, isInter: false, paid: 56050, status: 'PAID' },
    { no: 'PUR-26-27-0003', supplierIndex: 11, itemIndex: 3, qty: 50, rate: 450, gstRate: 18, isInter: false, paid: 26550, status: 'PAID' },
    { no: 'PUR-26-27-0004', supplierIndex: 11, itemIndex: 6, qty: 20, rate: 1500, gstRate: 18, isInter: false, paid: 35400, status: 'PAID' },
    { no: 'PUR-26-27-0005', supplierIndex: 12, itemIndex: 1, qty: 5, rate: 38000, gstRate: 12, isInter: true, paid: 212800, status: 'PAID' },
    { no: 'PUR-26-27-0006', supplierIndex: 12, itemIndex: 7, qty: 30, rate: 480, gstRate: 18, isInter: true, paid: 16992, status: 'PAID' },
    { no: 'PUR-26-27-0007', supplierIndex: 10, itemIndex: 0, qty: 5, rate: 22000, gstRate: 18, isInter: false, paid: 129800, status: 'PAID' },
    { no: 'PUR-26-27-0008', supplierIndex: 11, itemIndex: 4, qty: 10, rate: 2800, gstRate: 12, isInter: false, paid: 31360, status: 'PAID' },
    { no: 'PUR-26-27-0009', supplierIndex: 12, itemIndex: 5, qty: 15, rate: 2400, gstRate: 12, isInter: true, paid: 40320, status: 'PAID' },
    { no: 'PUR-26-27-0010', supplierIndex: 10, itemIndex: 9, qty: 4, rate: 16500, gstRate: 12, isInter: false, paid: 73920, status: 'PAID' },
  ];

  for (const pDef of purchasesData) {
    const supplier = dbParties[pDef.supplierIndex] || dbParties[10];
    const item = dbItems[pDef.itemIndex];
    if (!supplier || !item) continue;

    let existingPur = await prisma.purchaseInvoice.findUnique({ where: { purchaseNumber: pDef.no } });
    if (!existingPur) {
      const taxable = pDef.qty * pDef.rate;
      const taxTotal = (taxable * pDef.gstRate) / 100;
      const cgst = pDef.isInter ? 0 : taxTotal / 2;
      const sgst = pDef.isInter ? 0 : taxTotal / 2;
      const igst = pDef.isInter ? taxTotal : 0;
      const grand = taxable + taxTotal;

      await prisma.purchaseInvoice.create({
        data: {
          purchaseNumber: pDef.no,
          supplierInvoiceNo: `SUP-INV-${pDef.no.substring(10)}`,
          financialYear: '2026-2027',
          purchaseDate: new Date(Date.now() - (10 - purchasesData.indexOf(pDef)) * 86400000 * 4),
          partyId: supplier.id,
          deliveryLocation: supplier.address,
          supplierStateCode: supplier.stateCode,
          isInterState: pDef.isInter,
          taxableAmount: taxable,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: igst,
          grandTotal: grand,
          amountPaid: pDef.paid,
          balanceDue: Math.max(0, grand - pDef.paid),
          paymentMode: 'BANK TRANSFER',
          status: pDef.status,
          items: {
            create: [
              {
                itemId: item.id,
                itemName: item.name,
                hsnSac: item.hsnSac,
                unit: item.unit,
                quantity: pDef.qty,
                rate: pDef.rate,
                taxableValue: taxable,
                gstRate: pDef.gstRate,
                cgstAmount: cgst,
                sgstAmount: sgst,
                igstAmount: igst,
                totalAmount: grand,
              },
            ],
          },
        },
      });
    }
  }

  // 14. Expenses (10 Expenses)
  const expensesData = [
    { cat: 'TRANSPORT', desc: 'Freight delivery charges for Haveri customer orders', amt: 2500, mode: 'CASH' },
    { cat: 'FUEL', desc: 'Diesel for service technician vehicle KA-27-M-1001', amt: 1800, mode: 'UPI' },
    { cat: 'REPAIRS', desc: 'Workshop welding machine repair and maintenance', amt: 3200, mode: 'CASH' },
    { cat: 'SALARY', desc: 'Technician advance allowance for field visits', amt: 5000, mode: 'BANK TRANSFER' },
    { cat: 'OFFICE', desc: 'A4 printing paper, printer ink, and office stationery', amt: 1450, mode: 'UPI' },
    { cat: 'ELECTRICITY', desc: 'Workshop monthly electricity bill', amt: 4800, mode: 'BANK TRANSFER' },
    { cat: 'MAINTENANCE', desc: 'Air compressor oil change and service', amt: 1200, mode: 'CASH' },
    { cat: 'FUEL', desc: 'Petrol for local delivery auto', amt: 950, mode: 'UPI' },
    { cat: 'TRANSPORT', desc: 'VRL parcel courier charges for spare parts dispatch', amt: 850, mode: 'CASH' },
    { cat: 'OTHER', desc: 'Refreshments for APMC farmer meeting', amt: 650, mode: 'CASH' },
  ];

  for (let i = 0; i < expensesData.length; i++) {
    const expDef = expensesData[i];
    const expDate = new Date(Date.now() - (i + 1) * 86400000 * 2);
    const count = await prisma.expense.count({ where: { category: expDef.cat, amount: expDef.amt } });
    if (count === 0) {
      await prisma.expense.create({
        data: {
          category: expDef.cat,
          description: expDef.desc,
          amount: expDef.amt,
          paymentMode: expDef.mode,
          date: expDate,
        },
      });
    }
  }

  console.log('Seeding Smart Agro Machinerys database completed successfully!');
}
