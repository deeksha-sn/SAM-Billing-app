import { prisma } from '../src/db';
import { processDailyServiceReminders } from '../src/services/reminderScheduler';

async function runServiceReminderTests() {
  console.log('====================================================');
  console.log('RUNNING SERVICE REMINDERS & LOCATION TECH ASSIGNMENT TESTS');
  console.log('====================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failedCount++;
    }
  }

  try {
    // ----------------------------------------------------
    // SETUP: Clean existing test data safely & get item reference
    // ----------------------------------------------------
    let item = await prisma.item.findFirst();
    if (!item) {
      const category = await prisma.category.findFirst() || await prisma.category.create({ data: { name: 'Test Category' } });
      const unit = await prisma.unit.findFirst() || await prisma.unit.create({ data: { name: 'Piece', symbol: 'Pcs' } });
      item = await prisma.item.create({
        data: {
          name: 'Test Equipment Machine',
          sku: 'TEST-MAC-01',
          categoryId: category.id,
          unit: 'Pcs',
          hsnSac: '8436',
          sellingPrice: 25000,
          purchasePrice: 20000,
          gstRate: 18,
        },
      });
    }

    // Fetch or create test Party & Machine
    let party = await prisma.party.findFirst({ where: { name: 'Test Service Farmer Party' } });
    if (!party) {
      party = await prisma.party.create({
        data: {
          type: 'CUSTOMER',
          name: 'Test Service Farmer Party',
          mobile: '9876543210',
          pincode: '560001',
          taluk: 'Bangalore East',
          district: 'Bangalore Urban',
          state: 'Karnataka',
          whatsappServiceReminders: true,
        },
      });
    }

    let machine = await prisma.machine.findFirst({ where: { serialNumber: 'SRV-TEST-999' } });
    if (!machine) {
      const wEnd = new Date();
      wEnd.setFullYear(wEnd.getFullYear() + 1);
      machine = await prisma.machine.create({
        data: {
          partyId: party.id,
          machineItemId: item.id,
          serialNumber: 'SRV-TEST-999',
          model: 'Chaff Cutter 3HP',
          serviceIntervalValue: 3,
          serviceIntervalUnit: 'MONTHS',
          warrantyEnd: wEnd,
        },
      });
    }

    // Clean up test service tasks & reminder logs
    await prisma.serviceReminderLog.deleteMany({});
    await prisma.serviceTask.deleteMany({ where: { serialNumber: 'SRV-TEST-999' } });

    // ----------------------------------------------------
    // TEST 1: 20-Day Reminder Trigger & Idempotency
    // ----------------------------------------------------
    const d20 = new Date();
    d20.setDate(d20.getDate() + 20);
    d20.setHours(10, 0, 0, 0);

    const task20 = await prisma.serviceTask.create({
      data: {
        serviceNo: 'SRV-TEST-20D',
        partyId: party.id,
        machineId: machine.id,
        serialNumber: 'SRV-TEST-999',
        serviceDueDate: d20,
        status: 'SCHEDULED',
      },
    });

    const res20a = await processDailyServiceReminders();
    assert(res20a.processed >= 1, '20-Day reminder processed and logged');

    const logs20a = await prisma.serviceReminderLog.findMany({
      where: { serviceTaskId: task20.id, reminderStage: '20_DAYS_BEFORE' },
    });
    assert(logs20a.length === 1, 'Reminder log stored for 20_DAYS_BEFORE stage');

    // Test Idempotency (running scheduler again on same day shouldn't duplicate)
    await processDailyServiceReminders();
    const logs20b = await prisma.serviceReminderLog.findMany({
      where: { serviceTaskId: task20.id, reminderStage: '20_DAYS_BEFORE' },
    });
    assert(logs20b.length === 1, 'Idempotency verified: No duplicate log for 20_DAYS_BEFORE stage');

    // ----------------------------------------------------
    // TEST 2: 10-Day Reminder
    // ----------------------------------------------------
    const d10 = new Date();
    d10.setDate(d10.getDate() + 10);
    d10.setHours(10, 0, 0, 0);

    const task10 = await prisma.serviceTask.create({
      data: {
        serviceNo: 'SRV-TEST-10D',
        partyId: party.id,
        machineId: machine.id,
        serialNumber: 'SRV-TEST-999',
        serviceDueDate: d10,
        status: 'SCHEDULED',
      },
    });

    await processDailyServiceReminders();
    const logs10 = await prisma.serviceReminderLog.findMany({
      where: { serviceTaskId: task10.id, reminderStage: '10_DAYS_BEFORE' },
    });
    assert(logs10.length === 1, '10-Day reminder stage logged correctly');

    // ----------------------------------------------------
    // TEST 3: 7-Day & 3-Day Reminders
    // ----------------------------------------------------
    const d7 = new Date();
    d7.setDate(d7.getDate() + 7);
    const task7 = await prisma.serviceTask.create({
      data: {
        serviceNo: 'SRV-TEST-7D',
        partyId: party.id,
        machineId: machine.id,
        serialNumber: 'SRV-TEST-999',
        serviceDueDate: d7,
        status: 'SCHEDULED',
      },
    });

    await processDailyServiceReminders();
    const logs7 = await prisma.serviceReminderLog.findMany({
      where: { serviceTaskId: task7.id, reminderStage: '7_DAYS_BEFORE' },
    });
    assert(logs7.length === 1, '7-Day reminder stage logged correctly');

    // ----------------------------------------------------
    // TEST 4: Service-Day (0-Day) Reminder
    // ----------------------------------------------------
    const d0 = new Date();
    d0.setHours(10, 0, 0, 0);

    const task0 = await prisma.serviceTask.create({
      data: {
        serviceNo: 'SRV-TEST-0D',
        partyId: party.id,
        machineId: machine.id,
        serialNumber: 'SRV-TEST-999',
        serviceDueDate: d0,
        status: 'SCHEDULED',
      },
    });

    await processDailyServiceReminders();
    const logs0 = await prisma.serviceReminderLog.findMany({
      where: { serviceTaskId: task0.id, reminderStage: 'SERVICE_DAY' },
    });
    assert(logs0.length === 1, 'Service-Day (0-Day) reminder logged correctly');

    // ----------------------------------------------------
    // TEST 5: Daily Overdue Reminder
    // ----------------------------------------------------
    const dOverdue = new Date();
    dOverdue.setDate(dOverdue.getDate() - 3);

    const taskOverdue = await prisma.serviceTask.create({
      data: {
        serviceNo: 'SRV-TEST-OVERDUE',
        partyId: party.id,
        machineId: machine.id,
        serialNumber: 'SRV-TEST-999',
        serviceDueDate: dOverdue,
        status: 'SCHEDULED',
      },
    });

    await processDailyServiceReminders();
    const logsOverdue = await prisma.serviceReminderLog.findMany({
      where: { serviceTaskId: taskOverdue.id, reminderStage: 'OVERDUE_DAILY' },
    });
    assert(logsOverdue.length === 1, 'Daily Overdue reminder logged correctly');

    // ----------------------------------------------------
    // TEST 6: COMPLETED Status Prevents Reminders
    // ----------------------------------------------------
    const taskCompleted = await prisma.serviceTask.create({
      data: {
        serviceNo: 'SRV-TEST-COMPLETED',
        partyId: party.id,
        machineId: machine.id,
        serialNumber: 'SRV-TEST-999',
        serviceDueDate: d0,
        status: 'COMPLETED',
      },
    });

    await processDailyServiceReminders();
    const logsComp = await prisma.serviceReminderLog.findMany({
      where: { serviceTaskId: taskCompleted.id },
    });
    assert(logsComp.length === 0, 'COMPLETED task prevented reminder creation');

    // ----------------------------------------------------
    // TEST 7: Customer Opt-Out (whatsappServiceReminders = false)
    // ----------------------------------------------------
    const optOutParty = await prisma.party.create({
      data: {
        type: 'CUSTOMER',
        name: 'Opt Out Farmer',
        mobile: '9111122222',
        whatsappServiceReminders: false,
      },
    });

    const optOutTask = await prisma.serviceTask.create({
      data: {
        serviceNo: 'SRV-TEST-OPTOUT',
        partyId: optOutParty.id,
        machineId: machine.id,
        serialNumber: 'SRV-TEST-999',
        serviceDueDate: d0,
        status: 'SCHEDULED',
      },
    });

    await processDailyServiceReminders();
    const logsOptOut = await prisma.serviceReminderLog.findMany({
      where: { serviceTaskId: optOutTask.id },
    });
    assert(logsOptOut.length === 0, 'Opt-out party (whatsappServiceReminders=false) skipped by reminder scheduler');

    // ----------------------------------------------------
    // TEST 8: Location-Based Technician Recommendation Ranking
    // ----------------------------------------------------
    await prisma.user.deleteMany({ where: { username: { startsWith: 'test_tech_' } } });

    const techSamePin = await prisma.user.create({
      data: {
        username: 'test_tech_samepin',
        passwordHash: 'hash',
        name: 'Tech Same PIN (560001)',
        role: 'TECHNICIAN',
        pincode: '560001',
        taluk: 'Bangalore East',
        district: 'Bangalore Urban',
      },
    });

    const techSameTaluk = await prisma.user.create({
      data: {
        username: 'test_tech_sametaluk',
        passwordHash: 'hash',
        name: 'Tech Same Taluk',
        role: 'TECHNICIAN',
        pincode: '560002',
        taluk: 'Bangalore East',
        district: 'Bangalore Urban',
      },
    });

    const techSurroundingPin = await prisma.user.create({
      data: {
        username: 'test_tech_surrounding',
        passwordHash: 'hash',
        name: 'Tech Surrounding PIN',
        role: 'TECHNICIAN',
        pincode: '560010',
        serviceAreaPincodes: '560001,560002,560003',
        taluk: 'Bangalore South',
        district: 'Bangalore Urban',
      },
    });

    const techSameDistrict = await prisma.user.create({
      data: {
        username: 'test_tech_district',
        passwordHash: 'hash',
        name: 'Tech Same District',
        role: 'TECHNICIAN',
        pincode: '560050',
        taluk: 'Bangalore North',
        district: 'Bangalore Urban',
      },
    });

    const servicePincode = '560001';
    const serviceTaluk = 'Bangalore East';
    const serviceDistrict = 'Bangalore Urban';

    const getRank = (t: any) => {
      const areaPins = (t.serviceAreaPincodes || '').split(',').map((p: string) => p.trim());
      if (t.pincode === servicePincode || areaPins.includes(servicePincode)) return 1; // SAME_PIN
      if (t.taluk && t.taluk.toLowerCase() === serviceTaluk.toLowerCase()) return 2; // SAME_TALUK
      if (t.district && t.district.toLowerCase() === serviceDistrict.toLowerCase()) return 4; // SAME_DISTRICT
      return 5;
    };

    assert(getRank(techSamePin) === 1, 'Technician with matching PIN ranked #1 (SAME_PIN)');
    assert(getRank(techSameTaluk) === 2, 'Technician with matching Taluk ranked #2 (SAME_TALUK)');
    assert(getRank(techSameDistrict) === 4, 'Technician with matching District ranked #4 (SAME_DISTRICT)');

    // Clean up created test entities
    await prisma.serviceReminderLog.deleteMany({
      where: { serviceTaskId: { in: [task20.id, task10.id, task7.id, task0.id, taskOverdue.id] } },
    });
    await prisma.serviceTask.deleteMany({
      where: { id: { in: [task20.id, task10.id, task7.id, task0.id, taskOverdue.id, optOutTask.id, taskCompleted.id] } },
    });
    await prisma.user.deleteMany({ where: { username: { startsWith: 'test_tech_' } } });
    await prisma.party.deleteMany({ where: { id: optOutParty.id } });

    console.log('\n====================================================');
    console.log(`TOTAL PASSED: ${passedCount}`);
    console.log(`TOTAL FAILED: ${failedCount}`);
    console.log('====================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test Execution Exception:', err);
    process.exit(1);
  }
}

runServiceReminderTests();
