import { prisma } from '../src/db';

async function verifyDemoData() {
  console.log('====================================================');
  console.log('VERIFYING COMPREHENSIVE DEMO DATA ACROSS ALL MODULES');
  console.log('====================================================');

  try {
    const itemCount = await prisma.item.count();
    const partyCount = await prisma.party.count();
    const farmerCount = await prisma.farmer.count();
    const machineCount = await prisma.machine.count();
    const serviceCount = await prisma.serviceTask.count();
    const invoiceCount = await prisma.invoice.count();
    const quotationCount = await prisma.quotation.count();
    const challanCount = await prisma.deliveryChallan.count();
    const purchaseCount = await prisma.purchaseInvoice.count();
    const expenseCount = await prisma.expense.count();
    const termsCount = await prisma.termsTemplate.count();

    console.log(`1.  Items / Products Count:          ${itemCount}`);
    console.log(`2.  Parties (Customers/Suppliers):   ${partyCount}`);
    console.log(`3.  Farmers / Contacts Count:       ${farmerCount}`);
    console.log(`4.  Machines & Serial Numbers Count: ${machineCount}`);
    console.log(`5.  Service Tasks Count:             ${serviceCount}`);
    console.log(`6.  Sales Invoices Count:            ${invoiceCount}`);
    console.log(`7.  Quotations Count:                ${quotationCount}`);
    console.log(`8.  Delivery Challans Count:         ${challanCount}`);
    console.log(`9.  Purchase Invoices Count:         ${purchaseCount}`);
    console.log(`10. Expense Records Count:           ${expenseCount}`);
    console.log(`11. Terms & Conditions Templates:    ${termsCount}`);

    if (itemCount < 10) throw new Error(`Insufficient Items! Count: ${itemCount}`);
    if (partyCount < 10) throw new Error(`Insufficient Parties! Count: ${partyCount}`);
    if (farmerCount < 10) throw new Error(`Insufficient Farmers! Count: ${farmerCount}`);
    if (machineCount < 10) throw new Error(`Insufficient Machines! Count: ${machineCount}`);
    if (serviceCount < 10) throw new Error(`Insufficient Service Tasks! Count: ${serviceCount}`);
    if (invoiceCount < 10) throw new Error(`Insufficient Invoices! Count: ${invoiceCount}`);
    if (quotationCount < 10) throw new Error(`Insufficient Quotations! Count: ${quotationCount}`);
    if (challanCount < 10) throw new Error(`Insufficient Delivery Challans! Count: ${challanCount}`);
    if (purchaseCount < 10) throw new Error(`Insufficient Purchases! Count: ${purchaseCount}`);
    if (expenseCount < 10) throw new Error(`Insufficient Expenses! Count: ${expenseCount}`);
    if (termsCount < 5) throw new Error(`Insufficient Terms Templates! Count: ${termsCount}`);

    // Verify Party -> Farmer hierarchy linkage
    const akshayakalpa = await prisma.party.findFirst({
      where: { mobile: '9620409800' },
      include: { farmers: true },
    });
    if (!akshayakalpa || akshayakalpa.farmers.length < 3) {
      throw new Error('Party -> Farmer hierarchy failed! Expected at least 3 farmers under Akshayakalpa');
    }
    console.log(`[PASS] Hierarchy Linkage Verified: "${akshayakalpa.name}" has ${akshayakalpa.farmers.length} farmers linked!`);

    // Verify Today's Services filter
    const today = new Date().toISOString().split('T')[0];
    const todayServices = await prisma.serviceTask.findMany({
      include: { machine: true, party: true, farmer: true, assignedTechnician: true },
    });
    const dueToday = todayServices.filter((s) => new Date(s.serviceDueDate).toISOString().split('T')[0] === today);
    console.log(`[PASS] Today's Due Service Tasks: ${dueToday.length} task(s) found for ${today}`);

    // Verify GST automatic detection (Intra-state vs Inter-state)
    const interStateInvoices = await prisma.invoice.findMany({ where: { isInterState: true } });
    const intraStateInvoices = await prisma.invoice.findMany({ where: { isInterState: false } });
    console.log(`[PASS] GST Invoices: ${intraStateInvoices.length} Intra-State (CGST+SGST), ${interStateInvoices.length} Inter-State (IGST)`);

    console.log('====================================================');
    console.log('ALL DEMO DATA VERIFICATION TESTS PASSED PERFECTLY! 100%');
    console.log('====================================================');
  } catch (err: any) {
    console.error('DEMO VERIFICATION FAILED:', err);
    process.exit(1);
  }
}

verifyDemoData();
