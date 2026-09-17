import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { syncSequenceCounters } from './utils/numbering';
import { processDailyServiceReminders } from './services/reminderScheduler';

const prisma = new PrismaClient();

function getDistributedDate(index: number): Date {
  const now = new Date();
  const offsets = [0, 1, 2, 4, 6, 7, 25, 55, 85, 115];
  const daysAgo = offsets[index % offsets.length];
  return new Date(now.getTime() - daysAgo * 86400000);
}

export async function ensureRelativeServiceReminders(db: PrismaClient = prisma) {
  const today = new Date();
  today.setHours(10, 0, 0, 0);

  const getRelativeDate = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return d;
  };

  // Fetch reference technicians & parties
  const techKumar = await db.user.findFirst({ where: { username: 'kumar' } });
  const techSuresh = await db.user.findFirst({ where: { username: 'suresh' } });
  const techRavi = await db.user.findFirst({ where: { username: 'ravi' } });
  const techRamesh = await db.user.findFirst({ where: { username: 'ramesh' } });

  const parties = await db.party.findMany({ take: 10 });
  const machines = await db.machine.findMany({ take: 10 });

  if (parties.length === 0 || machines.length === 0) return;

  const relativeTaskDefs = [
    {
      serviceNo: 'SRV-REM-TODAY-1',
      offsetDays: 0,
      status: 'SCHEDULED',
      techId: techKumar?.id || techRavi?.id,
      machineIndex: 0,
      notes: 'Routine 90-day milking machine checkup due TODAY',
    },
    {
      serviceNo: 'SRV-REM-TODAY-2',
      offsetDays: 0,
      status: 'SCHEDULED',
      techId: techSuresh?.id || techKumar?.id,
      machineIndex: 1,
      notes: 'Heavy duty chaff cutter blade inspection due TODAY',
    },
    {
      serviceNo: 'SRV-REM-3DAYS',
      offsetDays: 3,
      status: 'SCHEDULED',
      techId: techSuresh?.id,
      machineIndex: 2,
      notes: 'Upcoming 3-day reminder milking bucket service',
    },
    {
      serviceNo: 'SRV-REM-7DAYS',
      offsetDays: 7,
      status: 'SCHEDULED',
      techId: techRavi?.id,
      machineIndex: 3,
      notes: 'Upcoming 7-day reminder battery sprayer pressure test',
    },
    {
      serviceNo: 'SRV-REM-10DAYS',
      offsetDays: 10,
      status: 'SCHEDULED',
      techId: techRamesh?.id,
      machineIndex: 4,
      notes: 'Upcoming 10-day reminder chaff cutter motor maintenance',
    },
    {
      serviceNo: 'SRV-REM-20DAYS',
      offsetDays: 20,
      status: 'SCHEDULED',
      techId: techRavi?.id,
      machineIndex: 5,
      notes: 'Upcoming 20-day reminder quarterly milking machine service',
    },
    {
      serviceNo: 'SRV-REM-OVERDUE-1',
      offsetDays: -4,
      status: 'SCHEDULED',
      techId: techSuresh?.id,
      machineIndex: 6,
      notes: 'Overdue daily reminder service (4 days overdue)',
    },
    {
      serviceNo: 'SRV-REM-OVERDUE-2',
      offsetDays: -8,
      status: 'SCHEDULED',
      techId: techRavi?.id,
      machineIndex: 7,
      notes: 'Overdue daily reminder service (8 days overdue)',
    },
    {
      serviceNo: 'SRV-REM-UPCOMING-1',
      offsetDays: 35,
      status: 'SCHEDULED',
      techId: techKumar?.id,
      machineIndex: 8,
      notes: 'Upcoming quarterly farm equipment maintenance',
    },
    {
      serviceNo: 'SRV-REM-UPCOMING-2',
      offsetDays: 50,
      status: 'SCHEDULED',
      techId: techRamesh?.id,
      machineIndex: 9,
      notes: 'Upcoming semi-annual engine oil & filter service',
    },
  ];

  for (const def of relativeTaskDefs) {
    const targetDueDate = getRelativeDate(def.offsetDays);
    const m = machines[def.machineIndex % machines.length];
    const p = parties[def.machineIndex % parties.length];

    await db.serviceTask.upsert({
      where: { serviceNo: def.serviceNo },
      update: {
        serviceDueDate: targetDueDate,
      },
      create: {
        serviceNo: def.serviceNo,
        machineId: m.id,
        partyId: m.partyId || p.id,
        farmerId: m.farmerId || null,
        serialNumber: m.serialNumber,
        serviceDueDate: targetDueDate,
        assignedTechnicianId: def.techId || null,
        status: def.status,
        technicianNotes: def.notes,
      },
    });
  }

  // Trigger daily reminder scheduler idempotently
  try {
    await processDailyServiceReminders();
  } catch (err) {
    console.error('Error running daily service reminder scheduler at startup:', err);
  }
}

export async function seedDefaultBillTemplates(db: PrismaClient = prisma) {
  console.log('Ensuring persistent ready-made bill templates exist...');

  const {
    DEFAULT_INVOICE_FIELDS,
    DETAILED_MACHINERY_FIELDS,
    SIMPLE_INVOICE_FIELDS,
    DEFAULT_QUOTATION_FIELDS,
    DEFAULT_CHALLAN_FIELDS,
    DEFAULT_PURCHASE_FIELDS,
  } = require('./controllers/templates');

  const templates = [
    { name: 'Standard Tax Invoice', documentType: 'INVOICE', isDefault: true, fieldsConfig: JSON.stringify(DEFAULT_INVOICE_FIELDS) },
    { name: 'Detailed Machinery Invoice', documentType: 'INVOICE', isDefault: false, fieldsConfig: JSON.stringify(DETAILED_MACHINERY_FIELDS) },
    { name: 'Simple Invoice', documentType: 'INVOICE', isDefault: false, fieldsConfig: JSON.stringify(SIMPLE_INVOICE_FIELDS) },
    { name: 'Standard Quotation', documentType: 'QUOTATION', isDefault: true, fieldsConfig: JSON.stringify(DEFAULT_QUOTATION_FIELDS) },
    { name: 'Standard Delivery Challan', documentType: 'DELIVERY_CHALLAN', isDefault: true, fieldsConfig: JSON.stringify(DEFAULT_CHALLAN_FIELDS) },
    { name: 'Standard Purchase Invoice', documentType: 'PURCHASE', isDefault: true, fieldsConfig: JSON.stringify(DEFAULT_PURCHASE_FIELDS) },
  ];

  for (const t of templates) {
    const existing = await db.billTemplate.findFirst({ where: { name: t.name, documentType: t.documentType } });
    if (!existing) {
      await db.billTemplate.create({ data: t });
    }
  }
}

export async function seedDatabase() {
  console.log('Checking database state for persistent development sample data...');

  // 1. Company Profile
  await prisma.companyProfile.upsert({
    where: { id: 'default' },
    update: {
      state: 'Karnataka',
      stateCode: '29',
      gstin: '29AAACS1234F1Z9',
    },
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

  // 3. Document Number Configs
  const docConfigs = [
    { documentType: 'INVOICE', prefix: 'SAM', pattern: 'SAM-{FY}-{NUMBER}', paddingDigits: 4, nextNumber: 11 },
    { documentType: 'QUOTATION', prefix: 'QUO', pattern: 'QUO-{FY}-{NUMBER}', paddingDigits: 4, nextNumber: 11 },
    { documentType: 'DELIVERY_CHALLAN', prefix: 'DC', pattern: 'DC-{FY}-{NUMBER}', paddingDigits: 4, nextNumber: 11 },
    { documentType: 'PURCHASE', prefix: 'PUR', pattern: 'PUR-{FY}-{NUMBER}', paddingDigits: 4, nextNumber: 11 },
    { documentType: 'SERVICE', prefix: 'SRV', pattern: 'SRV-{FY}-{NUMBER}', paddingDigits: 4, nextNumber: 11 },
  ];

  for (const cfg of docConfigs) {
    await prisma.documentNumberConfig.upsert({
      where: { documentType: cfg.documentType },
      update: {},
      create: cfg,
    });
  }

  // 4. Users & Technicians with Location Data
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
    update: {
      address: 'APMC Yard Road',
      taluk: 'Haveri',
      district: 'Haveri',
      pincode: '581110',
      serviceAreaPincodes: '581110, 581115, 572101, 572201',
    },
    create: {
      name: 'Ravi Technician',
      username: 'ravi',
      mobile: '9844099111',
      email: 'ravi@smartagro.com',
      passwordHash: techPass,
      role: 'TECHNICIAN',
      address: 'APMC Yard Road',
      state: 'Karnataka',
      district: 'Haveri',
      taluk: 'Haveri',
      pincode: '581110',
      serviceAreaPincodes: '581110, 581115, 572101, 572201',
      active: true,
    },
  });

  const techKumar = await prisma.user.upsert({
    where: { username: 'kumar' },
    update: {
      address: 'Dairy Circle Road',
      taluk: 'Tumkur',
      district: 'Tumkur',
      pincode: '572101',
      serviceAreaPincodes: '572101, 572102, 572103, 572201',
    },
    create: {
      name: 'Kumar Senior Technician',
      username: 'kumar',
      mobile: '9844099222',
      email: 'kumar@smartagro.com',
      passwordHash: techPass,
      role: 'TECHNICIAN',
      address: 'Dairy Circle Road',
      state: 'Karnataka',
      district: 'Tumkur',
      taluk: 'Tumkur',
      pincode: '572101',
      serviceAreaPincodes: '572101, 572102, 572103, 572201',
      active: true,
    },
  });

  const techSuresh = await prisma.user.upsert({
    where: { username: 'suresh' },
    update: {
      address: 'Bypass Highway',
      taluk: 'Tiptur',
      district: 'Tumkur',
      pincode: '572201',
      serviceAreaPincodes: '572201, 572202, 572203',
    },
    create: {
      name: 'Suresh Field Technician',
      username: 'suresh',
      mobile: '9844099333',
      email: 'suresh@smartagro.com',
      passwordHash: techPass,
      role: 'TECHNICIAN',
      address: 'Bypass Highway',
      state: 'Karnataka',
      district: 'Tumkur',
      taluk: 'Tiptur',
      pincode: '572201',
      serviceAreaPincodes: '572201, 572202, 572203',
      active: true,
    },
  });

  const techRamesh = await prisma.user.upsert({
    where: { username: 'ramesh' },
    update: {
      address: 'Station Road',
      taluk: 'Mandya',
      district: 'Mandya',
      pincode: '571401',
      serviceAreaPincodes: '571401, 571402',
    },
    create: {
      name: 'Ramesh Agro Specialist',
      username: 'ramesh',
      mobile: '9844099444',
      email: 'ramesh@smartagro.com',
      passwordHash: techPass,
      role: 'TECHNICIAN',
      address: 'Station Road',
      state: 'Karnataka',
      district: 'Mandya',
      taluk: 'Mandya',
      pincode: '571401',
      serviceAreaPincodes: '571401, 571402',
      active: true,
    },
  });

  // 5. Categories
  const catMachines = await prisma.category.upsert({
    where: { name: 'Agricultural Machines' },
    update: {},
    create: { name: 'Agricultural Machines', description: 'Finished farm machinery' },
  });

  // 6. Items / Products (Organized across Categories)
  const itemsData = [
    // 1. FINISHED / READY MACHINES
    // Milking Machines
    { sku: 'MM-400S', name: 'Milking Machine Double Bucket 400S', type: 'FINISHED_MACHINE', itemCategory: 'MILKING_MACHINE', categoryLabel: 'Milking Machines', subcategory: 'Double Bucket', hsnSac: '8434', gstRate: 12.0, purchasePrice: 38000, sellingPrice: 65000, currentStock: 10, unit: 'Nos', showInBilling: true, isSellable: true },
    { sku: 'MM-1B', name: 'Milking Machine 1-Bucket Eco', type: 'FINISHED_MACHINE', itemCategory: 'MILKING_MACHINE', categoryLabel: 'Milking Machines', subcategory: 'Single Bucket', hsnSac: '8434', gstRate: 12.0, purchasePrice: 24000, sellingPrice: 42000, currentStock: 8, unit: 'Nos', showInBilling: true, isSellable: true },
    { sku: 'MM-SOLAR-S', name: 'SAM Solar Milking Machine Single Bucket', type: 'FINISHED_MACHINE', itemCategory: 'MILKING_MACHINE', categoryLabel: 'Milking Machines', subcategory: 'Solar', hsnSac: '8434', gstRate: 12.0, purchasePrice: 32000, sellingPrice: 54000, currentStock: 6, unit: 'Nos', showInBilling: true, isSellable: true },
    { sku: 'MM-SOLAR-D', name: 'SAM Solar Milking Machine Double Bucket', type: 'FINISHED_MACHINE', itemCategory: 'MILKING_MACHINE', categoryLabel: 'Milking Machines', subcategory: 'Solar', hsnSac: '8434', gstRate: 12.0, purchasePrice: 45000, sellingPrice: 78000, currentStock: 4, unit: 'Nos', showInBilling: true, isSellable: true },

    // Chaff Cutters
    { sku: 'CC-01', name: 'Heavy Duty Chaff Cutter 2HP', type: 'FINISHED_MACHINE', itemCategory: 'CHAFF_CUTTER', categoryLabel: 'Chaff Cutters', subcategory: '2HP Electric', hsnSac: '8436', gstRate: 18.0, purchasePrice: 22000, sellingPrice: 45000, currentStock: 15, unit: 'Nos', showInBilling: true, isSellable: true },
    { sku: 'CC-03', name: 'Commercial Heavy Chaff Cutter 3HP', type: 'FINISHED_MACHINE', itemCategory: 'CHAFF_CUTTER', categoryLabel: 'Chaff Cutters', subcategory: '3HP Electric', hsnSac: '8436', gstRate: 18.0, purchasePrice: 29000, sellingPrice: 56000, currentStock: 7, unit: 'Nos', showInBilling: true, isSellable: true },
    { sku: 'CC-MINI', name: 'Mini Portable Chaff Cutter 1.5HP', type: 'FINISHED_MACHINE', itemCategory: 'CHAFF_CUTTER', categoryLabel: 'Chaff Cutters', subcategory: '1.5HP Portable', hsnSac: '8436', gstRate: 12.0, purchasePrice: 16500, sellingPrice: 28000, currentStock: 8, unit: 'Nos', showInBilling: true, isSellable: true },

    // Sprayers / Foggers
    { sku: 'SPR-16L', name: 'Battery Sprayer 16L Heavy Duty', type: 'FINISHED_MACHINE', itemCategory: 'SPRAYER', categoryLabel: 'Sprayers / Foggers', subcategory: 'Battery Sprayer', hsnSac: '8424', gstRate: 12.0, purchasePrice: 2800, sellingPrice: 4500, currentStock: 20, unit: 'Nos', showInBilling: true, isSellable: true },
    { sku: 'SPR-ELE', name: 'SAM Electrical Pressure Sprayer 25L', type: 'FINISHED_MACHINE', itemCategory: 'SPRAYER', categoryLabel: 'Sprayers / Foggers', subcategory: 'Electric Pressure', hsnSac: '8424', gstRate: 12.0, purchasePrice: 6500, sellingPrice: 11500, currentStock: 12, unit: 'Nos', showInBilling: true, isSellable: true },

    // Pressure Washers
    { sku: 'PW-2000', name: 'SAM High Pressure Washer 2000 PSI', type: 'FINISHED_MACHINE', itemCategory: 'PRESSURE_WASHER', categoryLabel: 'Pressure Washers', subcategory: 'High Pressure 2000PSI', hsnSac: '8424', gstRate: 18.0, purchasePrice: 11000, sellingPrice: 18500, currentStock: 9, unit: 'Nos', showInBilling: true, isSellable: true },

    // Solar Machines
    { sku: 'SLR-CHG', name: 'Solar Fence Charger 12V', type: 'FINISHED_MACHINE', itemCategory: 'SOLAR_MACHINE', categoryLabel: 'Solar Machines', subcategory: 'Solar Fence', hsnSac: '8543', gstRate: 12.0, purchasePrice: 6200, sellingPrice: 9800, currentStock: 14, unit: 'Nos', showInBilling: true, isSellable: true },

    // Battery / Petrol Machines
    { sku: 'BRS-CUT', name: 'Petrol Brush Cutter 52cc', type: 'FINISHED_MACHINE', itemCategory: 'BATTERY_PETROL_MACHINE', categoryLabel: 'Battery / Petrol Machines', subcategory: 'Petrol 52cc', hsnSac: '8467', gstRate: 18.0, purchasePrice: 9800, sellingPrice: 16500, currentStock: 9, unit: 'Nos', showInBilling: true, isSellable: true },

    // Other Finished Machines
    { sku: 'CUL-3TY', name: 'Tractor Cultivator 3 Tyne', type: 'FINISHED_MACHINE', itemCategory: 'FINISHED_MACHINE', categoryLabel: 'Ready / Finished Machines', subcategory: 'Tractor Attachment', hsnSac: '8432', gstRate: 12.0, purchasePrice: 14000, sellingPrice: 22000, currentStock: 6, unit: 'Nos', showInBilling: true, isSellable: true },

    // 2. SPARE PARTS
    { sku: 'BLD-01', name: 'High Carbon Chaff Blade Set (4 Pcs)', type: 'SPARE_PART', itemCategory: 'SPARE_PART', categoryLabel: 'Spare Parts', subcategory: 'Blade', hsnSac: '8208', gstRate: 18.0, purchasePrice: 450, sellingPrice: 750, currentStock: 60, unit: 'Sets', showInBilling: true, isSellable: true },
    { sku: 'TUP-SET', name: 'Teat Cup Assembly Set of 4', type: 'SPARE_PART', itemCategory: 'SPARE_PART', categoryLabel: 'Spare Parts', subcategory: 'Teat Cup', hsnSac: '8434', gstRate: 18.0, purchasePrice: 1500, sellingPrice: 2400, currentStock: 40, unit: 'Sets', showInBilling: true, isSellable: true },
    { sku: 'LIN-RUB', name: 'Rubber Liner Set (4 Pcs)', type: 'SPARE_PART', itemCategory: 'SPARE_PART', categoryLabel: 'Spare Parts', subcategory: 'Rubber Liner', hsnSac: '4016', gstRate: 18.0, purchasePrice: 480, sellingPrice: 850, currentStock: 50, unit: 'Sets', showInBilling: true, isSellable: true },
    { sku: 'HAR-BLD', name: 'Combine Harvester Blade Heavy', type: 'SPARE_PART', itemCategory: 'SPARE_PART', categoryLabel: 'Spare Parts', subcategory: 'Blade', hsnSac: '8208', gstRate: 18.0, purchasePrice: 320, sellingPrice: 580, currentStock: 45, unit: 'Nos', showInBilling: true, isSellable: true },
    { sku: 'OIL-SEL', name: 'High Temperature Oil Seal Set', type: 'SPARE_PART', itemCategory: 'SPARE_PART', categoryLabel: 'Spare Parts', subcategory: 'Oil Seal', hsnSac: '8484', gstRate: 18.0, purchasePrice: 120, sellingPrice: 250, currentStock: 80, unit: 'Sets', showInBilling: true, isSellable: true },
    { sku: 'BRG-6204', name: 'Heavy Duty Ball Bearing 6204', type: 'SPARE_PART', itemCategory: 'SPARE_PART', categoryLabel: 'Spare Parts', subcategory: 'Bearing', hsnSac: '8482', gstRate: 18.0, purchasePrice: 180, sellingPrice: 340, currentStock: 75, unit: 'Nos', showInBilling: true, isSellable: true },
    { sku: 'VBLT-B42', name: 'Industrial V-Belt B42', type: 'SPARE_PART', itemCategory: 'SPARE_PART', categoryLabel: 'Spare Parts', subcategory: 'V-Belt', hsnSac: '4010', gstRate: 18.0, purchasePrice: 220, sellingPrice: 420, currentStock: 55, unit: 'Nos', showInBilling: true, isSellable: true },
    { sku: 'GAG-100', name: 'Vacuum Pressure Gauge 100 PSI', type: 'SPARE_PART', itemCategory: 'SPARE_PART', categoryLabel: 'Spare Parts', subcategory: 'Gauge', hsnSac: '9026', gstRate: 18.0, purchasePrice: 650, sellingPrice: 1200, currentStock: 25, unit: 'Nos', showInBilling: true, isSellable: true },
    { sku: 'OIL-4T', name: 'Agro Engine Oil 4T 1 Litre', type: 'SPARE_PART', itemCategory: 'SPARE_PART', categoryLabel: 'Spare Parts', subcategory: 'Oil', hsnSac: '2710', gstRate: 18.0, purchasePrice: 280, sellingPrice: 480, currentStock: 90, unit: 'Cans', showInBilling: true, isSellable: true },

    // 3. COMPONENTS (Internal Manufacturing & Assembly)
    { sku: 'MOT-2HP', name: 'Electric Motor 2HP Single Phase', type: 'COMPONENT', itemCategory: 'COMPONENT', categoryLabel: 'Components', subcategory: 'Motor', hsnSac: '8501', gstRate: 18.0, purchasePrice: 5800, sellingPrice: 8500, currentStock: 25, unit: 'Nos', showInBilling: false, isSellable: false },
    { sku: 'PMP-300', name: 'Oil Free Vacuum Pump 300L', type: 'COMPONENT', itemCategory: 'COMPONENT', categoryLabel: 'Components', subcategory: 'Vacuum Pump', hsnSac: '8414', gstRate: 18.0, purchasePrice: 9500, sellingPrice: 14500, currentStock: 12, unit: 'Nos', showInBilling: false, isSellable: false },

    // 4. RAW MATERIALS (Internal Hardware / Steel / Fasteners)
    { sku: 'RM-BOLT-M8', name: 'Hex Bolt M8 x 40mm (High Tensile)', type: 'RAW_MATERIAL', itemCategory: 'RAW_MATERIAL', categoryLabel: 'Raw Materials', subcategory: 'Fasteners', hsnSac: '7318', gstRate: 18.0, purchasePrice: 8, sellingPrice: 15, currentStock: 500, unit: 'Pcs', showInBilling: false, isSellable: false },
    { sku: 'RM-NUT-M8', name: 'Hex Nut M8 Galvanized', type: 'RAW_MATERIAL', itemCategory: 'RAW_MATERIAL', categoryLabel: 'Raw Materials', subcategory: 'Fasteners', hsnSac: '7318', gstRate: 18.0, purchasePrice: 3, sellingPrice: 6, currentStock: 800, unit: 'Pcs', showInBilling: false, isSellable: false },
    { sku: 'RM-ANG-MS', name: 'MS Angle 50x50x5mm Heavy (6m Bar)', type: 'RAW_MATERIAL', itemCategory: 'RAW_MATERIAL', categoryLabel: 'Raw Materials', subcategory: 'Steel Bar', hsnSac: '7216', gstRate: 18.0, purchasePrice: 1200, sellingPrice: 1800, currentStock: 45, unit: 'Bars', showInBilling: false, isSellable: false },

    // 5. OTHER / MISCELLANEOUS
    { sku: 'CAN-40L', name: 'Stainless Steel Milk Can 40L', type: 'EQUIPMENT', itemCategory: 'OTHER', categoryLabel: 'Other / Miscellaneous', subcategory: 'Milk Container', hsnSac: '7310', gstRate: 12.0, purchasePrice: 2400, sellingPrice: 3800, currentStock: 30, unit: 'Nos', showInBilling: true, isSellable: true },
    { sku: 'STR-SS', name: 'Stainless Steel Milk Strainer', type: 'EQUIPMENT', itemCategory: 'OTHER', categoryLabel: 'Other / Miscellaneous', subcategory: 'Dairy Tool', hsnSac: '7323', gstRate: 12.0, purchasePrice: 850, sellingPrice: 1450, currentStock: 35, unit: 'Nos', showInBilling: true, isSellable: true },
  ];

  const dbItems: any[] = [];
  for (const itemDef of itemsData) {
    const item = await prisma.item.upsert({
      where: { sku: itemDef.sku },
      update: {
        itemCategory: itemDef.itemCategory,
        categoryLabel: itemDef.categoryLabel,
        subcategory: itemDef.subcategory,
        showInBilling: itemDef.showInBilling,
        isSellable: itemDef.isSellable,
      },
      create: {
        name: itemDef.name,
        sku: itemDef.sku,
        type: itemDef.type,
        itemCategory: itemDef.itemCategory,
        categoryLabel: itemDef.categoryLabel,
        subcategory: itemDef.subcategory,
        showInBilling: itemDef.showInBilling,
        isSellable: itemDef.isSellable,
        allowSales: itemDef.showInBilling,
        allowQuotation: itemDef.showInBilling,
        allowPurchase: true,
        allowDC: true,
        allowService: true,
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

  // Ensure any existing non-seeded items in DB are cleanly categorized
  const unclassifiedItems = await prisma.item.findMany({ where: { itemCategory: 'OTHER' } });
  for (const item of unclassifiedItems) {
    const name = item.name || '';
    let category = item.type === 'SPARE_PART' ? 'SPARE_PART' : item.type === 'COMPONENT' ? 'COMPONENT' : item.type === 'RAW_MATERIAL' ? 'RAW_MATERIAL' : 'OTHER';
    let label = 'Other / Miscellaneous';
    let showInBilling = item.type !== 'RAW_MATERIAL' && item.type !== 'COMPONENT';

    if (name.toLowerCase().includes('milking')) {
      category = 'MILKING_MACHINE';
      label = 'Milking Machines';
      showInBilling = true;
    } else if (name.toLowerCase().includes('chaff')) {
      category = 'CHAFF_CUTTER';
      label = 'Chaff Cutters';
      showInBilling = true;
    } else if (name.toLowerCase().includes('sprayer') || name.toLowerCase().includes('fogger')) {
      category = 'SPRAYER';
      label = 'Sprayers / Foggers';
      showInBilling = true;
    } else if (name.toLowerCase().includes('washer') || name.toLowerCase().includes('pressure')) {
      category = 'PRESSURE_WASHER';
      label = 'Pressure Washers';
      showInBilling = true;
    } else if (name.toLowerCase().includes('solar')) {
      category = 'SOLAR_MACHINE';
      label = 'Solar Machines';
      showInBilling = true;
    } else if (name.toLowerCase().includes('brush') || name.toLowerCase().includes('auger') || name.toLowerCase().includes('petrol')) {
      category = 'BATTERY_PETROL_MACHINE';
      label = 'Battery / Petrol Machines';
      showInBilling = true;
    } else if (item.type === 'SPARE_PART' || name.toLowerCase().includes('blade') || name.toLowerCase().includes('bearing') || name.toLowerCase().includes('belt')) {
      category = 'SPARE_PART';
      label = 'Spare Parts';
      showInBilling = true;
    } else if (item.type === 'COMPONENT' || name.toLowerCase().includes('motor') || name.toLowerCase().includes('pump')) {
      category = 'COMPONENT';
      label = 'Components';
      showInBilling = false;
    } else if (item.type === 'RAW_MATERIAL' || name.toLowerCase().includes('bolt') || name.toLowerCase().includes('nut') || name.toLowerCase().includes('angle')) {
      category = 'RAW_MATERIAL';
      label = 'Raw Materials';
      showInBilling = false;
    } else if (item.type === 'FINISHED_MACHINE') {
      category = 'FINISHED_MACHINE';
      label = 'Ready / Finished Machines';
      showInBilling = true;
    }

    await prisma.item.update({
      where: { id: item.id },
      data: {
        itemCategory: category,
        categoryLabel: label,
        showInBilling,
        isSellable: showInBilling,
      },
    });
  }

  // 7. Parties (10 Customers + 10 Suppliers across KA, MH, TN)
  const partiesData = [
    // Customers (10)
    { name: 'Akshayakalpa Farms & Foods Pvt Ltd', type: 'CUSTOMER', customerType: 'BUSINESS', mobile: '9620409800', address: 'Tiptur Road, Dairy Division', village: 'Tiptur', taluk: 'Tiptur', district: 'Tumkur', state: 'Karnataka', stateCode: '29', pincode: '572201', gstin: '29AICA4264B1ZU', whatsappServiceReminders: true },
    { name: 'Ramesh Farm House', type: 'CUSTOMER', customerType: 'FARMER', mobile: '9844011223', address: 'Plot 4, Haveri Main Road', village: 'Haveri', taluk: 'Haveri', district: 'Haveri', state: 'Karnataka', stateCode: '29', pincode: '581110', gstin: '', whatsappServiceReminders: true },
    { name: 'Sahyadri Agro Producers Co-op', type: 'CUSTOMER', customerType: 'DEALER', mobile: '9845011999', address: 'APMC Yard, Main Road', village: 'Shimoga', taluk: 'Shimoga', district: 'Shimoga', state: 'Karnataka', stateCode: '29', pincode: '577201', gstin: '29AAACS9876K1Z1', whatsappServiceReminders: true },
    { name: 'Kaveri Milk Dairy & Farm', type: 'CUSTOMER', customerType: 'BUSINESS', mobile: '9741033777', address: 'Bypass Road, Dairy Circle', village: 'Hassan', taluk: 'Hassan', district: 'Hassan', state: 'Karnataka', stateCode: '29', pincode: '573201', gstin: '29AABCK1122M1Z3', whatsappServiceReminders: true },
    { name: 'Venkateshwara Agro Traders', type: 'CUSTOMER', customerType: 'DEALER', mobile: '9822088777', address: 'Market Yard, Kolhapur', village: 'Kolhapur', taluk: 'Kolhapur', district: 'Kolhapur', state: 'Maharashtra', stateCode: '27', pincode: '416001', gstin: '27AAACV5544N1Z5', whatsappServiceReminders: true },
    { name: 'Coimbatore Farm Supplies', type: 'CUSTOMER', customerType: 'DEALER', mobile: '9443077666', address: 'Trichy Road, Coimbatore', village: 'Coimbatore', taluk: 'Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu', stateCode: '33', pincode: '641018', gstin: '33AAACC9988P1Z7', whatsappServiceReminders: true },
    { name: 'Vijayanagar Agro Agencies', type: 'CUSTOMER', customerType: 'DEALER', mobile: '9448055444', address: 'Station Road, Hospet', village: 'Hospet', taluk: 'Hospet', district: 'Vijayanagar', state: 'Karnataka', stateCode: '29', pincode: '583201', gstin: '29AABCV7766R1Z9', whatsappServiceReminders: true },
    { name: 'Sri Lakshmi Dairy Farm', type: 'CUSTOMER', customerType: 'FARMER', mobile: '9535055555', address: 'Farm House, Mandya Road', village: 'Mandya', taluk: 'Mandya', district: 'Mandya', state: 'Karnataka', stateCode: '29', pincode: '571401', gstin: '', whatsappServiceReminders: true },
    { name: 'Malnad Farmers Association', type: 'CUSTOMER', customerType: 'DEALER', mobile: '9844077888', address: 'Main Road, Chikkamagaluru', village: 'Chikkamagaluru', taluk: 'Chikkamagaluru', district: 'Chikkamagaluru', state: 'Karnataka', stateCode: '29', pincode: '577101', gstin: '29AAACM4455Q1Z2', whatsappServiceReminders: true },
    { name: 'Krishna Valley Dairy Farm', type: 'CUSTOMER', customerType: 'BUSINESS', mobile: '9823066555', address: 'Sangli Road, Miraj', village: 'Miraj', taluk: 'Miraj', district: 'Sangli', state: 'Maharashtra', stateCode: '27', pincode: '416410', gstin: '27AAACK1122S1Z4', whatsappServiceReminders: true },

    // Suppliers (10)
    { name: 'Bharat Machinery & Motors', type: 'SUPPLIER', customerType: 'BUSINESS', mobile: '9880099887', address: 'Gokul Road, Hubli', village: 'Hubli', taluk: 'Hubli', district: 'Dharwad', state: 'Karnataka', stateCode: '29', pincode: '580030', gstin: '29AAACB1122D1Z4', whatsappServiceReminders: false },
    { name: 'Karnataka Agro Spares Ltd', type: 'SUPPLIER', customerType: 'BUSINESS', mobile: '9844088111', address: 'Peenya Industrial Area, Bangalore', village: 'Bangalore', taluk: 'Bangalore North', district: 'Bangalore Urban', state: 'Karnataka', stateCode: '29', pincode: '560058', gstin: '29AAACK3344E1Z6', whatsappServiceReminders: false },
    { name: 'Deccan Dairy Equipment Co', type: 'SUPPLIER', customerType: 'BUSINESS', mobile: '9823077111', address: 'MIDC Area, Pune', village: 'Pune', taluk: 'Haveli', district: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411026', gstin: '27AAACD7788F1Z8', whatsappServiceReminders: false },
    { name: 'Kirloskar Oil Engines Ltd', type: 'SUPPLIER', customerType: 'BUSINESS', mobile: '9822011223', address: 'Laxmanrao Kirloskar Road, Pune', village: 'Pune', taluk: 'Haveli', district: 'Pune', state: 'Maharashtra', stateCode: '27', pincode: '411003', gstin: '27AAACK0011G1Z1', whatsappServiceReminders: false },
    { name: 'Southern Rubber Products', type: 'SUPPLIER', customerType: 'BUSINESS', mobile: '9443022334', address: 'Industrial Estate, Madurai', village: 'Madurai', taluk: 'Madurai', district: 'Madurai', state: 'Tamil Nadu', stateCode: '33', pincode: '625018', gstin: '33AAACS2233H1Z3', whatsappServiceReminders: false },
    { name: 'Bangalore Precision Hydraulics', type: 'SUPPLIER', customerType: 'BUSINESS', mobile: '9845033445', address: 'Bommasandra Industrial Area, Bangalore', village: 'Bangalore', taluk: 'Anekal', district: 'Bangalore Urban', state: 'Karnataka', stateCode: '29', pincode: '560099', gstin: '29AAACB4455I1Z5', whatsappServiceReminders: false },
    { name: 'Apex Motors & Components', type: 'SUPPLIER', customerType: 'BUSINESS', mobile: '9886044556', address: 'Belgaum Industrial Zone, Belgaum', village: 'Belgaum', taluk: 'Belgaum', district: 'Belgaum', state: 'Karnataka', stateCode: '29', pincode: '590011', gstin: '29AAACA6677J1Z7', whatsappServiceReminders: false },
    { name: 'National Steel & Sheet Works', type: 'SUPPLIER', customerType: 'BUSINESS', mobile: '9844055667', address: 'Bhadravathi Steel Town', village: 'Bhadravathi', taluk: 'Bhadravathi', district: 'Shimoga', state: 'Karnataka', stateCode: '29', pincode: '577301', gstin: '29AAACN8899K1Z9', whatsappServiceReminders: false },
    { name: 'Coimbatore Foundry & Castings', type: 'SUPPLIER', customerType: 'BUSINESS', mobile: '9443066778', address: 'Ganapathy Industrial Post, Coimbatore', village: 'Coimbatore', taluk: 'Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu', stateCode: '33', pincode: '641006', gstin: '33AAACC1122L1Z2', whatsappServiceReminders: false },
    { name: 'West Coast Agro Accessories', type: 'SUPPLIER', customerType: 'BUSINESS', mobile: '9822077889', address: 'Thane Belapur Road, Navi Mumbai', village: 'Navi Mumbai', taluk: 'Thane', district: 'Thane', state: 'Maharashtra', stateCode: '27', pincode: '400705', gstin: '27AAACW3344M1Z4', whatsappServiceReminders: false },
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
          village: partyDef.village,
          taluk: partyDef.taluk,
          district: partyDef.district,
          shippingAddress: `${partyDef.address}, ${partyDef.state} - ${partyDef.pincode}`,
          state: partyDef.state,
          stateCode: partyDef.stateCode,
          pincode: partyDef.pincode,
          gstin: partyDef.gstin || null,
          whatsappServiceReminders: partyDef.whatsappServiceReminders,
          openingBalance: 0,
        },
      });
    }
    dbParties.push(party);
  }

  // 8. Farmers / Contacts (10 Farmers linked under parent parties)
  const farmersData = [
    { parentMobile: '9620409800', name: 'Mahesh Farm', mobile: '6366959062', address: 'Main Dairy Road, Tiptur', village: 'Tiptur', taluk: 'Tiptur', district: 'Tumkur', pincode: '572201' },
    { parentMobile: '9844011223', name: 'Ramesh Farm', mobile: '9844011223', address: 'Plot 4, Haveri Main Road', village: 'Haveri', taluk: 'Haveri', district: 'Haveri', pincode: '581110' },
    { parentMobile: '9620409800', name: 'Suma Dairy', mobile: '7676468179', address: 'Channarayapatna Road, Arasikere', village: 'Arasikere', taluk: 'Arasikere', district: 'Hassan', pincode: '573103' },
    { parentMobile: '9620409800', name: 'Ravi Farm', mobile: '9620409869', address: 'Gubbi Gate, Tumkur', village: 'Tumkur', taluk: 'Tumkur', district: 'Tumkur', pincode: '572101' },
    { parentMobile: '9845011999', name: 'Anjanappa Farm', mobile: '9845011991', address: 'Bhadra Colony, Shimoga', village: 'Shimoga', taluk: 'Shimoga', district: 'Shimoga', pincode: '577201' },
    { parentMobile: '9845011999', name: 'Basavaraj Agro', mobile: '9448022888', address: 'Tarikere Road, Shimoga', village: 'Shimoga', taluk: 'Shimoga', district: 'Shimoga', pincode: '577201' },
    { parentMobile: '9741033777', name: 'Manjunath Farm', mobile: '9741033771', address: 'Dairy Circle, Hassan', village: 'Hassan', taluk: 'Hassan', district: 'Hassan', pincode: '573201' },
    { parentMobile: '9741033777', name: 'Shivakumar Dairy', mobile: '9611044666', address: 'Holenarasipura Road, Hassan', village: 'Hassan', taluk: 'Hassan', district: 'Hassan', pincode: '573201' },
    { parentMobile: '9535055555', name: 'Suresh Agro', mobile: '9535055551', address: 'Sugar Town, Mandya', village: 'Mandya', taluk: 'Mandya', district: 'Mandya', pincode: '571401' },
    { parentMobile: '9535055555', name: 'Chennappa Dairy', mobile: '9880066444', address: 'Koppa Circle, Maddur', village: 'Maddur', taluk: 'Maddur', district: 'Mandya', pincode: '571428' },
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
          village: farmerDef.village,
          taluk: farmerDef.taluk,
          district: farmerDef.district,
          pincode: farmerDef.pincode,
          shippingAddress: `${farmerDef.address}, Karnataka`,
          state: 'Karnataka',
          stateCode: '29',
        },
      });
    }
    dbFarmers.push(farmer);
  }

  // 9. Machines & Serial Numbers Assigned to Farmers (10 Machines)
  const machinesData = [
    { serialNumber: 'MM-26-0001', itemSku: 'MM-400S', farmerMobile: '9844011223', model: 'Milking Machine Double Bucket 400S' },
    { serialNumber: 'CC-26-0002', itemSku: 'CC-01', farmerMobile: '9844011223', model: 'Heavy Duty Chaff Cutter 2HP' },
    { serialNumber: 'MM-26-0003', itemSku: 'MM-400S', farmerMobile: '6366959062', model: 'Milking Machine Double Bucket 400S' },
    { serialNumber: 'SPR-26-0004', itemSku: 'SPR-16L', farmerMobile: '7676468179', model: 'Battery Sprayer 16L Heavy Duty' },
    { serialNumber: 'CC-26-0005', itemSku: 'CC-01', farmerMobile: '9620409869', model: 'Heavy Duty Chaff Cutter 2HP' },
    { serialNumber: 'MM-26-0006', itemSku: 'MM-400S', farmerMobile: '9845011991', model: 'Milking Machine Double Bucket 400S' },
    { serialNumber: 'CC-26-0007', itemSku: 'CC-01', farmerMobile: '9448022888', model: 'Heavy Duty Chaff Cutter 2HP' },
    { serialNumber: 'MOT-26-0008', itemSku: 'MOT-2HP', farmerMobile: '9741033771', model: 'Electric Motor 2HP Single Phase' },
    { serialNumber: 'MM-26-0009', itemSku: 'MM-400S', farmerMobile: '9611044666', model: 'Milking Machine Double Bucket 400S' },
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
          assignedTechnicianId: techKumar.id,
          location: targetFarmer.address,
        },
      });
    }
    dbMachines.push(machine);
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

  for (let idx = 0; idx < invoicesData.length; idx++) {
    const invDef = invoicesData[idx];
    const party = dbParties[invDef.partyIndex];
    const farmer = invDef.farmerIndex !== null ? dbFarmers[invDef.farmerIndex] : null;
    const item = dbItems[invDef.itemIndex];
    if (!party || !item) continue;

    let existingInv = await prisma.invoice.findUnique({ where: { invoiceNumber: invDef.no } });
    const targetDate = getDistributedDate(idx);

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
          invoiceDate: targetDate,
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

      if (invDef.paid > 0) {
        const payReceiptNo = `PAY-INV-${invDef.no.substring(10)}`;
        const existingPay = await prisma.payment.findUnique({ where: { receiptNo: payReceiptNo } });
        if (!existingPay) {
          await prisma.payment.create({
            data: {
              receiptNo: payReceiptNo,
              financialYear: '2026-2027',
              paymentType: 'CUSTOMER_PAYMENT',
              partyId: party.id,
              amount: invDef.paid,
              paymentMode: invDef.mode,
              date: targetDate,
              referenceNo: `REF-${invDef.no}`,
              notes: `Payment received for invoice ${invDef.no}`,
            },
          });
        }
      }
    }
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

  for (let idx = 0; idx < quotationsData.length; idx++) {
    const qDef = quotationsData[idx];
    const party = dbParties[qDef.partyIndex];
    const farmer = qDef.farmerIndex !== null ? dbFarmers[qDef.farmerIndex] : null;
    const item = dbItems[qDef.itemIndex];
    if (!party || !item) continue;

    let existingQ = await prisma.quotation.findUnique({ where: { quotationNumber: qDef.no } });
    const targetDate = getDistributedDate(idx);

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
          quotationDate: targetDate,
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

  for (let idx = 0; idx < challansData.length; idx++) {
    const dcDef = challansData[idx];
    const party = dbParties[dcDef.partyIndex];
    const farmer = dcDef.farmerIndex !== null ? dbFarmers[dcDef.farmerIndex] : null;
    const item = dbItems[dcDef.itemIndex];
    if (!party || !item) continue;

    let existingDC = await prisma.deliveryChallan.findUnique({ where: { challanNumber: dcDef.no } });
    const targetDate = getDistributedDate(idx);

    if (!existingDC) {
      await prisma.deliveryChallan.create({
        data: {
          challanNumber: dcDef.no,
          financialYear: '2026-2027',
          challanDate: targetDate,
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

  for (let idx = 0; idx < purchasesData.length; idx++) {
    const pDef = purchasesData[idx];
    const supplier = dbParties[pDef.supplierIndex] || dbParties[10];
    const item = dbItems[pDef.itemIndex];
    if (!supplier || !item) continue;

    let existingPur = await prisma.purchaseInvoice.findUnique({ where: { purchaseNumber: pDef.no } });
    const targetDate = getDistributedDate(idx);

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
          purchaseDate: targetDate,
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
    const expDate = getDistributedDate(i);
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

  await syncSequenceCounters(prisma);
  await seedDefaultBillTemplates(prisma);
  await ensureRelativeServiceReminders(prisma);

  console.log('Seeding Smart Agro Machinerys persistent database completed cleanly!');
}
