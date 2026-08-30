import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Smart Agro Machinerys database...');

  // 1. Company Profile
  await prisma.companyProfile.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      businessName: 'Smart Agro Machinerys',
      address: 'Plot 42, Industrial Estate, Poona-Bangalore Road',
      phone: '+91 98450 12345',
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

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Admin Manager',
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

  const tech = await prisma.user.upsert({
    where: { username: 'ravi' },
    update: {},
    create: {
      name: 'Ravi Technician',
      username: 'ravi',
      email: 'ravi@smartagro.com',
      passwordHash: techPass,
      role: 'SERVICE_TECHNICIAN',
    },
  });

  // 4. Categories & Units
  const catMachines = await prisma.category.upsert({
    where: { name: 'Agricultural Machines' },
    update: {},
    create: { name: 'Agricultural Machines', description: 'Finished farm machinery' },
  });

  const catMotors = await prisma.category.upsert({
    where: { name: 'Motors & Spares' },
    update: {},
    create: { name: 'Motors & Spares', description: 'Electric motors and spares' },
  });

  const catRaw = await prisma.category.upsert({
    where: { name: 'Raw Materials & Hardware' },
    update: {},
    create: { name: 'Raw Materials & Hardware', description: 'Steel sheets, nuts, bolts' },
  });

  const unitNos = await prisma.unit.upsert({ where: { name: 'Numbers' }, update: {}, create: { name: 'Numbers', symbol: 'Nos' } });

  // 5. Items (Machines & Components)
  const motor = await prisma.item.upsert({
    where: { sku: 'MOT-2HP' },
    update: { currentStock: 20 },
    create: {
      name: 'Electric Motor 2HP Single Phase',
      sku: 'MOT-2HP',
      type: 'COMPONENT',
      categoryId: catMotors.id,
      unit: 'Nos',
      hsnSac: '8501',
      gstRate: 18.0,
      purchasePrice: 6500,
      sellingPrice: 8500,
      minStock: 5,
      currentStock: 20,
    },
  });

  const blade = await prisma.item.upsert({
    where: { sku: 'BLD-01' },
    update: { currentStock: 50 },
    create: {
      name: 'High Carbon Chaff Blade',
      sku: 'BLD-01',
      type: 'SPARE_PART',
      categoryId: catMotors.id,
      unit: 'Nos',
      hsnSac: '8208',
      gstRate: 18.0,
      purchasePrice: 450,
      sellingPrice: 750,
      minStock: 10,
      currentStock: 50,
    },
  });

  const nut = await prisma.item.upsert({
    where: { sku: 'NUT-M8' },
    update: { currentStock: 100 },
    create: {
      name: 'M8 Stainless Steel Nut',
      sku: 'NUT-M8',
      type: 'RAW_MATERIAL',
      categoryId: catRaw.id,
      unit: 'Nos',
      hsnSac: '7318',
      gstRate: 18.0,
      purchasePrice: 5,
      sellingPrice: 10,
      minStock: 20,
      currentStock: 100,
    },
  });

  const bolt = await prisma.item.upsert({
    where: { sku: 'BLT-M8' },
    update: { currentStock: 100 },
    create: {
      name: 'M8 Stainless Steel Bolt',
      sku: 'BLT-M8',
      type: 'RAW_MATERIAL',
      categoryId: catRaw.id,
      unit: 'Nos',
      hsnSac: '7318',
      gstRate: 18.0,
      purchasePrice: 8,
      sellingPrice: 15,
      minStock: 20,
      currentStock: 100,
    },
  });

  const sheet = await prisma.item.upsert({
    where: { sku: 'SHT-2MM' },
    update: { currentStock: 30 },
    create: {
      name: 'Steel Sheet 2mm Heavy Duty',
      sku: 'SHT-2MM',
      type: 'RAW_MATERIAL',
      categoryId: catRaw.id,
      unit: 'Nos',
      hsnSac: '7208',
      gstRate: 18.0,
      purchasePrice: 1200,
      sellingPrice: 1800,
      minStock: 5,
      currentStock: 30,
    },
  });

  const angle = await prisma.item.upsert({
    where: { sku: 'ANG-40' },
    update: { currentStock: 40 },
    create: {
      name: 'MS Angle 40x40x5mm',
      sku: 'ANG-40',
      type: 'RAW_MATERIAL',
      categoryId: catRaw.id,
      unit: 'Nos',
      hsnSac: '7216',
      gstRate: 18.0,
      purchasePrice: 800,
      sellingPrice: 1300,
      minStock: 5,
      currentStock: 40,
    },
  });

  const chaffCutter = await prisma.item.upsert({
    where: { sku: 'CC-01' },
    update: { currentStock: 10 },
    create: {
      name: 'Heavy Duty Chaff Cutter 2HP',
      sku: 'CC-01',
      type: 'FINISHED_MACHINE',
      categoryId: catMachines.id,
      unit: 'Nos',
      hsnSac: '8436',
      gstRate: 18.0,
      purchasePrice: 22000,
      sellingPrice: 45000,
      minStock: 2,
      currentStock: 10,
    },
  });

  const milkingMachine = await prisma.item.upsert({
    where: { sku: 'MM-400S' },
    update: { currentStock: 5 },
    create: {
      name: 'Milking Machine 400S Double Bucket',
      sku: 'MM-400S',
      type: 'FINISHED_MACHINE',
      categoryId: catMachines.id,
      unit: 'Nos',
      hsnSac: '8434',
      gstRate: 18.0,
      purchasePrice: 35000,
      sellingPrice: 65000,
      minStock: 1,
      currentStock: 5,
    },
  });

  // 6. BOM for Chaff Cutter
  const bomHeader = await prisma.bOMHeader.upsert({
    where: { finishedItemId: chaffCutter.id },
    update: {},
    create: {
      finishedItemId: chaffCutter.id,
      name: 'Chaff Cutter 2HP Standard BOM',
      notes: 'Standard Bill of Materials for Chaff Cutter 2HP',
    },
  });

  await prisma.bOMItem.deleteMany({ where: { bomHeaderId: bomHeader.id } });
  await prisma.bOMItem.createMany({
    data: [
      { bomHeaderId: bomHeader.id, componentItemId: motor.id, quantity: 1 },
      { bomHeaderId: bomHeader.id, componentItemId: blade.id, quantity: 2 },
      { bomHeaderId: bomHeader.id, componentItemId: nut.id, quantity: 8 },
      { bomHeaderId: bomHeader.id, componentItemId: bolt.id, quantity: 8 },
      { bomHeaderId: bomHeader.id, componentItemId: sheet.id, quantity: 1 },
      { bomHeaderId: bomHeader.id, componentItemId: angle.id, quantity: 1 },
    ],
  });

  // 7. Customers & Suppliers
  let customerRamesh = await prisma.party.findFirst({ where: { mobile: '9844011223' } });
  if (!customerRamesh) {
    customerRamesh = await prisma.party.create({
      data: {
        name: 'Ramesh Agro Farm',
        type: 'CUSTOMER',
        customerType: 'FARMER',
        contactPerson: 'Ramesh Gowda',
        mobile: '9844011223',
        address: 'Main Road, Near Bus Stand',
        village: 'Haveri Rural',
        taluk: 'Haveri',
        district: 'Haveri',
        state: 'Karnataka',
        stateCode: '29',
        pincode: '581110',
        openingBalance: 0,
        creditLimit: 100000,
      },
    });
  }

  let supplierKirloskar = await prisma.party.findFirst({ where: { mobile: '9880099887' } });
  if (!supplierKirloskar) {
    supplierKirloskar = await prisma.party.create({
      data: {
        name: 'Kirloskar Motors Pvt Ltd',
        type: 'SUPPLIER',
        contactPerson: 'Venkatesh Rao',
        mobile: '9880099887',
        address: 'Gokul Road',
        district: 'Dharwad',
        state: 'Karnataka',
        stateCode: '29',
        pincode: '580030',
        gstin: '29AAACK9876G1Z2',
        openingBalance: 0,
      },
    });
  }

  // 8. Sample Machine & Scheduled Service
  let machine1 = await prisma.machine.findUnique({ where: { serialNumber: 'CC-2026-001' } });
  if (!machine1) {
    machine1 = await prisma.machine.create({
      data: {
        partyId: customerRamesh.id,
        machineItemId: chaffCutter.id,
        model: 'Chaff Cutter 2HP Heavy Duty',
        serialNumber: 'CC-2026-001',
        saleDate: new Date(),
        warrantyStart: new Date(),
        warrantyEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        serviceIntervalDays: 90,
        nextServiceDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        assignedTechnicianId: tech.id,
        location: 'Haveri Farm, Near Water Tank',
      },
    });
  }
  let service1 = await prisma.serviceTask.findUnique({ where: { serviceNo: 'SRV-2026-27-0001' } });
  if (!service1 && machine1) {
    await prisma.serviceTask.create({
      data: {
        serviceNo: 'SRV-2026-27-0001',
        machineId: machine1.id,
        partyId: customerRamesh.id,
        serialNumber: machine1.serialNumber,
        serviceDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        assignedTechnicianId: tech.id,
        status: 'ASSIGNED',
        technicianNotes: 'First 90-day free service checkup',
      },
    });
  }

  // 9. Terms & Conditions Master Templates
  const standardTerms = await prisma.termsTemplate.upsert({
    where: { name: 'Standard Machine Sale' },
    update: { isDefault: true },
    create: {
      name: 'Standard Machine Sale',
      isDefault: true,
      items: {
        create: [
          { text: 'Company is not responsible for transportation damages.', sortOrder: 1 },
          { text: 'No replacement, No onsite service, No exchange.', sortOrder: 2 },
          { text: 'Extra charge applicable for spare parts.', sortOrder: 3 },
          { text: 'Goods once sold cannot be taken back under any conditions.', sortOrder: 4 },
          { text: 'Subject to Bangalore Jurisdiction only.', sortOrder: 5 },
          { text: 'Thanks for doing business with us!', sortOrder: 6 },
        ],
      },
    },
  });

  await prisma.termsTemplate.upsert({
    where: { name: 'Chaff Cutter' },
    update: {},
    create: {
      name: 'Chaff Cutter',
      isDefault: false,
      items: {
        create: [
          { text: 'Ensure motor belt tension is checked weekly.', sortOrder: 1 },
          { text: 'Blade sharpening is not covered under warranty.', sortOrder: 2 },
          { text: 'Do not overload machine beyond rated capacity.', sortOrder: 3 },
          { text: 'Company is not responsible for transportation damages.', sortOrder: 4 },
          { text: 'Subject to Bangalore Jurisdiction only.', sortOrder: 5 },
          { text: 'Thanks for doing business with us!', sortOrder: 6 },
        ],
      },
    },
  });

  await prisma.termsTemplate.upsert({
    where: { name: 'Agricultural Sprayer' },
    update: {},
    create: {
      name: 'Agricultural Sprayer',
      isDefault: false,
      items: {
        create: [
          { text: 'Battery and motor warranty as per manufacturer policy.', sortOrder: 1 },
          { text: 'Chemical damage to nozzle is not covered under warranty.', sortOrder: 2 },
          { text: 'Clean tank with clean water after every use.', sortOrder: 3 },
          { text: 'Subject to Bangalore Jurisdiction only.', sortOrder: 4 },
          { text: 'Thanks for doing business with us!', sortOrder: 5 },
        ],
      },
    },
  });

  await prisma.termsTemplate.upsert({
    where: { name: 'Spare Parts' },
    update: {},
    create: {
      name: 'Spare Parts',
      isDefault: false,
      items: {
        create: [
          { text: 'Electrical parts carry no warranty or guarantee once sold.', sortOrder: 1 },
          { text: 'Goods once sold cannot be taken back or exchanged.', sortOrder: 2 },
          { text: 'Subject to Bangalore Jurisdiction only.', sortOrder: 3 },
          { text: 'Thanks for doing business with us!', sortOrder: 4 },
        ],
      },
    },
  });

  await prisma.termsTemplate.upsert({
    where: { name: 'Machine + Installation' },
    update: {},
    create: {
      name: 'Machine + Installation',
      isDefault: false,
      items: {
        create: [
          { text: 'Free installation provided within 50km radius.', sortOrder: 1 },
          { text: 'Electrical wiring and main switch must be ready at site.', sortOrder: 2 },
          { text: 'Transport damages must be noted on delivery challan.', sortOrder: 3 },
          { text: 'Subject to Bangalore Jurisdiction only.', sortOrder: 4 },
          { text: 'Thanks for doing business with us!', sortOrder: 5 },
        ],
      },
    },
  });

  await prisma.termsTemplate.upsert({
    where: { name: 'Machine + Transportation' },
    update: {},
    create: {
      name: 'Machine + Transportation',
      isDefault: false,
      items: {
        create: [
          { text: 'Freight & transit insurance included in invoice amount.', sortOrder: 1 },
          { text: 'Customer must inspect goods upon arrival before unloading.', sortOrder: 2 },
          { text: 'Subject to Bangalore Jurisdiction only.', sortOrder: 3 },
          { text: 'Thanks for doing business with us!', sortOrder: 4 },
        ],
      },
    },
  });

  await prisma.termsTemplate.upsert({
    where: { name: 'Custom' },
    update: {},
    create: {
      name: 'Custom',
      isDefault: false,
      items: {
        create: [
          { text: 'Special custom terms as agreed between company and customer.', sortOrder: 1 },
          { text: 'Subject to Bangalore Jurisdiction only.', sortOrder: 2 },
          { text: 'Thanks for doing business with us!', sortOrder: 3 },
        ],
      },
    },
  });

  // Map Chaff Cutter item to Chaff Cutter terms by default
  const chaffCutterTerms = await prisma.termsTemplate.findUnique({ where: { name: 'Chaff Cutter' } });
  if (chaffCutterTerms) {
    await prisma.item.update({
      where: { sku: 'CC-01' },
      data: { defaultTermsTemplateId: chaffCutterTerms.id },
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
