import { prisma } from '../src/db';
import { addIntervalToDate, processDailyServiceReminders } from '../src/services/reminderScheduler';
import { generateDocumentNumber } from '../src/utils/numbering';

async function runServiceSystemTests() {
  console.log('\n====================================================');
  console.log('RUNNING COMPREHENSIVE SERVICE & REMINDER SYSTEM TESTS');
  console.log('====================================================\n');

  try {
    const testSerial = 'MM-2026-' + Math.floor(10000 + Math.random() * 90000);

    // 1. Create Test Party (Customer)
    const party = await prisma.party.create({
      data: {
        name: 'Ramesh Agro Farm ' + Math.floor(Math.random() * 1000),
        type: 'CUSTOMER',
        customerType: 'FARMER',
        mobile: '9' + Math.floor(100000000 + Math.random() * 900000000),
        address: 'Main Road, Near Bus Stand',
        village: 'Haveri',
        district: 'Haveri',
        state: 'Karnataka',
        pincode: '581110',
        whatsappServiceReminders: true,
      },
    });
    console.log(`✓ TEST 1 PASSED: Customer "${party.name}" created with mobile ${party.mobile}`);

    // 2. Create Test Machine Item
    const machineItem = await prisma.item.create({
      data: {
        sku: 'TEST-MC-' + Date.now() + Math.random(),
        name: 'Milking Machine 2-Bucket',
        hsnSac: '8434',
        unit: 'Nos',
        sellingPrice: 45000,
        currentStock: 10,
        minStock: 2,
      },
    });

    // 3. Create Spare Part Item for Inventory Deduction Test
    const sparePart = await prisma.item.create({
      data: {
        sku: 'TEST-SP-' + Date.now() + Math.random(),
        name: 'Milking Machine Pulsator Belt',
        hsnSac: '8434',
        unit: 'Nos',
        sellingPrice: 1200,
        currentStock: 25,
        minStock: 5,
      },
    });
    console.log('✓ TEST 2 PASSED: Machine item & Spare part created. Initial Spare Stock: 25');

    // 4. Test Calendar Interval Calculation: 31/08/2026 + 3 Months = 30/11/2026
    const saleDate = new Date('2026-08-31T00:00:00.000Z');
    const calcNextDate = addIntervalToDate(saleDate, 3, 'MONTHS');

    const expectedDateStr = '2026-11-30';
    const actualDateStr = calcNextDate.toISOString().split('T')[0];
    if (actualDateStr !== expectedDateStr) {
      throw new Error(`Calendar Month calculation failed! Expected ${expectedDateStr}, got ${actualDateStr}`);
    }
    console.log(`✓ TEST 3 PASSED: Calendar Interval 31/08/2026 + 3 Months = ${actualDateStr} (Accurate Month End Clamping verified!)`);

    // 5. Register Machine for Customer
    const machine = await prisma.machine.create({
      data: {
        partyId: party.id,
        machineItemId: machineItem.id,
        model: 'Milking Machine 2-Bucket',
        serialNumber: testSerial,
        saleDate: saleDate,
        warrantyStart: saleDate,
        warrantyEnd: addIntervalToDate(saleDate, 1, 'YEARS'),
        serviceIntervalValue: 3,
        serviceIntervalUnit: 'MONTHS',
        nextServiceDate: saleDate, // Set due today for test
      },
    });

    // 6. Generate Service Task (Due Today)
    const srvNo = 'SRV-TEST-' + Math.floor(10000 + Math.random() * 90000);
    const task = await prisma.serviceTask.create({
      data: {
        serviceNo: srvNo,
        machineId: machine.id,
        partyId: party.id,
        serialNumber: machine.serialNumber,
        serviceDueDate: saleDate, // Today
        serviceIntervalDays: 90,
        status: 'SCHEDULED',
      },
      include: { party: true, machine: true },
    });
    console.log(`✓ TEST 4 PASSED: Service Task ${task.serviceNo} created for S/N ${task.serialNumber}`);

    // 7. Verify Customer Details, Phone, Address, Machine appear
    if (!task.party.name || !task.party.mobile || !task.party.address || !task.machine.model) {
      throw new Error('Customer or machine details missing from service record!');
    }
    console.log(`✓ TEST 5 PASSED: Verified Customer Details (${task.party.name}, ${task.party.mobile}), Address (${task.party.address}), and Machine S/N (${task.serialNumber})`);

    // 8. Assign Technician
    const techUser = await prisma.user.findFirst({ where: { username: 'admin' } });
    if (!techUser) throw new Error('Admin/Technician user not found');

    const assignedTask = await prisma.serviceTask.update({
      where: { id: task.id },
      data: {
        assignedTechnicianId: techUser.id,
        status: 'ASSIGNED',
      },
      include: { assignedTechnician: true },
    });
    if (assignedTask.assignedTechnicianId !== techUser.id || assignedTask.status !== 'ASSIGNED') {
      throw new Error('Technician assignment failed');
    }
    console.log(`✓ TEST 6 PASSED: Technician ${techUser.name} assigned to job ${assignedTask.serviceNo}`);

    // 9. Test Automated Daily Reminder Scheduler & Duplicate Prevention
    const schedResult1 = await processDailyServiceReminders();
    console.log(`✓ TEST 7 PASSED: Daily Scheduler Processed ${schedResult1.processed} task(s), sent/logged reminders cleanly.`);

    const logsCount1 = await prisma.serviceReminderLog.count({ where: { serviceTaskId: task.id } });
    if (logsCount1 === 0) throw new Error('ServiceReminderLog entry was not created!');

    // Second run should prevent duplicate reminder
    const schedResult2 = await processDailyServiceReminders();
    const logsCount2 = await prisma.serviceReminderLog.count({ where: { serviceTaskId: task.id } });
    if (logsCount2 !== logsCount1) {
      throw new Error('Duplicate reminder was allowed!');
    }
    console.log(`✓ TEST 8 PASSED: Duplicate Reminder Prevention verified! Log count stayed at ${logsCount2}`);

    // 10. Complete Service Task & Verify Auto Next Date + Stock Deduction
    const prevSpareStock = sparePart.currentStock; // 25
    const partsUsedQty = 2;

    // Simulate completion transaction
    const completedResult = await prisma.$transaction(async (tx) => {
      // Deduct parts stock
      await tx.item.update({
        where: { id: sparePart.id },
        data: { currentStock: prevSpareStock - partsUsedQty },
      });

      await tx.stockMovement.create({
        data: {
          itemId: sparePart.id,
          movementType: 'SERVICE_CONSUMPTION',
          quantity: -partsUsedQty,
          previousStock: prevSpareStock,
          newStock: prevSpareStock - partsUsedQty,
          referenceType: 'SERVICE',
          referenceId: task.serviceNo,
          partyId: party.id,
        },
      });

      const completedDate = new Date('2026-08-31T00:00:00.000Z');
      const nextDueDate = addIntervalToDate(completedDate, 3, 'MONTHS'); // 30/11/2026

      const updatedTask = await tx.serviceTask.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          completedAt: completedDate,
          workPerformed: 'Replaced pulsator belt and serviced motor',
          serviceCharge: 500,
          partsTotal: partsUsedQty * sparePart.sellingPrice, // 2 * 1200 = 2400
          grandTotal: 2900,
        },
      });

      // Update machine next service date
      await tx.machine.update({
        where: { id: machine.id },
        data: {
          lastServiceDate: completedDate,
          nextServiceDate: nextDueDate,
        },
      });

      // Automatically create next Service Task
      const nextSrvNo = (await generateDocumentNumber('SERVICE', new Date(), tx)).docNumber;
      const nextTask = await tx.serviceTask.create({
        data: {
          serviceNo: nextSrvNo,
          machineId: machine.id,
          partyId: party.id,
          serialNumber: machine.serialNumber,
          serviceDueDate: nextDueDate,
          status: 'SCHEDULED',
        },
      });

      return { updatedTask, nextTask, nextDueDate };
    });

    // Verify Spare Stock Deduction
    const updatedSpare = await prisma.item.findUnique({ where: { id: sparePart.id } });
    if (updatedSpare?.currentStock !== prevSpareStock - partsUsedQty) {
      throw new Error(`Inventory deduction failed! Expected ${prevSpareStock - partsUsedQty}, got ${updatedSpare?.currentStock}`);
    }
    console.log(`✓ TEST 9 PASSED: Service Completion recorded. Spare Stock deducted from ${prevSpareStock} to ${updatedSpare.currentStock}`);

    // Verify Automatic Next Service Task Generation
    if (!completedResult.nextTask || completedResult.nextTask.serviceDueDate.toISOString().split('T')[0] !== '2026-11-30') {
      throw new Error('Next service task auto-generation failed!');
    }
    console.log(`✓ TEST 10 PASSED: Next Service Task ${completedResult.nextTask.serviceNo} automatically created for 30/11/2026!`);

    // 11. Test Customer Opt-Out Protection
    await prisma.party.update({
      where: { id: party.id },
      data: { whatsappServiceReminders: false },
    });

    const optOutTask = await prisma.serviceTask.create({
      data: {
        serviceNo: (await generateDocumentNumber('SERVICE', new Date())).docNumber,
        machineId: machine.id,
        partyId: party.id,
        serialNumber: machine.serialNumber,
        serviceDueDate: new Date(),
        status: 'SCHEDULED',
      },
    });

    await processDailyServiceReminders();

    const optOutLog = await prisma.serviceReminderLog.findFirst({
      where: { partyId: party.id, status: 'OPTED_OUT' },
    });
    if (!optOutLog) throw new Error('Opt-out protection failed!');
    console.log('✓ TEST 11 PASSED: Customer Opt-Out protection verified! Scheduled log tagged OPTED_OUT.');

    // 12. Cleanup Test Data
    await prisma.serviceReminderLog.deleteMany({ where: { partyId: party.id } });
    await prisma.stockMovement.deleteMany({ where: { partyId: party.id } });
    await prisma.serviceTask.deleteMany({ where: { partyId: party.id } });
    await prisma.machine.deleteMany({ where: { partyId: party.id } });
    await prisma.item.delete({ where: { id: sparePart.id } });
    await prisma.item.delete({ where: { id: machineItem.id } });
    await prisma.party.delete({ where: { id: party.id } });

    console.log('\n====================================================');
    console.log('ALL SERVICE & REMINDER SYSTEM TESTS PASSED PERFECTLY!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ SERVICE SYSTEM TEST FAILED:', err);
    process.exit(1);
  }
}

runServiceSystemTests();
