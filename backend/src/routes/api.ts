import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';

import { login, getCurrentUser, getUsers, createUser, updateUser } from '../controllers/auth';
import { getCompanyProfile, updateCompanyProfile, getSystemSettings, updateSystemSetting, getDocumentNumberConfigs, updateDocumentNumberConfig } from '../controllers/settings';
import { getTermsTemplates, getTermsTemplateById, createTermsTemplate, updateTermsTemplate, deleteTermsTemplate, duplicateTermsTemplate, setDefaultTermsTemplate } from '../controllers/terms';
import { getParties, getPartyById, createParty, updateParty, deleteParty, togglePartyStatus } from '../controllers/parties';
import { getFarmersByParty, getFarmerById, createFarmer, updateFarmer, deleteFarmer } from '../controllers/farmers';
import { getItems, getItemById, createItem, updateItem, adjustStock, getCategories, createCategory, getUnits, createUnit } from '../controllers/items';
import { getBOMs, getBOMByFinishedItem, saveBOM } from '../controllers/bom';
import { getInvoices, getInvoiceById, createInvoice, updateInvoice, cancelInvoice, deleteInvoice } from '../controllers/sales';
import { getQuotations, getQuotationById, createQuotation, updateQuotation, deleteQuotation, convertQuotationToInvoice } from '../controllers/quotations';
import { getDeliveryChallans, getDeliveryChallanById, createDeliveryChallan, updateDeliveryChallan, deleteDeliveryChallan } from '../controllers/deliveryChallans';
import { getPurchases, getPurchaseById, createPurchase, updatePurchase, deletePurchase } from '../controllers/purchases';
import { getPayments, createPayment } from '../controllers/payments';
import { getMachines, getMachineBySerial, createMachine } from '../controllers/machines';
import { getServices, getTodayServicesSummary, createServiceTask, updateServiceStatus, completeServiceTask, assignTechnician, sendTechnicianDispatchWhatsApp, remindAllTodayCustomers, getReminderLogs, sendPaymentReminderWhatsApp, getTechnicianTodayJobs } from '../controllers/services';
import { getWhatsAppConfigHandler, updateWhatsAppConfigHandler, testWhatsAppConnectionHandler } from '../controllers/whatsappSettings';
import { getExpenses, createExpense } from '../controllers/expenses';
import { getDashboardStats, getGSTReport, getStockLedgerReport, getPartyLedgerReport, getProfitAndLossReport } from '../controllers/reports';
import { globalSearch, createBackup, resetDemoData } from '../controllers/backup';

import { getTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate, setDefaultTemplate } from '../controllers/templates';

const router = Router();

// Public routes
router.post('/auth/login', login);

// Authenticated routes
router.use(authenticate);

router.get('/auth/me', getCurrentUser);

// Users (Admin only)
router.get('/users', authorize(['ADMIN']), getUsers);
router.post('/users', authorize(['ADMIN']), createUser);
router.put('/users/:id', authorize(['ADMIN']), updateUser);

// Settings
router.get('/settings/company', getCompanyProfile);
router.put('/settings/company', authorize(['ADMIN']), updateCompanyProfile);
router.get('/settings/system', getSystemSettings);
router.put('/settings/system', authorize(['ADMIN']), updateSystemSetting);
router.get('/settings/numbering', getDocumentNumberConfigs);
router.put('/settings/numbering/:documentType', authorize(['ADMIN']), updateDocumentNumberConfig);

// Bill Templates
router.get('/templates', getTemplates);
router.get('/templates/:id', getTemplateById);
router.post('/templates', createTemplate);
router.put('/templates/:id', updateTemplate);
router.delete('/templates/:id', deleteTemplate);
router.post('/templates/:id/set-default', setDefaultTemplate);

// Terms & Conditions Master Templates
router.get('/terms/templates', getTermsTemplates);
router.get('/terms/templates/:id', getTermsTemplateById);
router.post('/terms/templates', authorize(['ADMIN']), createTermsTemplate);
router.put('/terms/templates/:id', authorize(['ADMIN']), updateTermsTemplate);
router.delete('/terms/templates/:id', authorize(['ADMIN']), deleteTermsTemplate);
router.post('/terms/templates/:id/duplicate', authorize(['ADMIN']), duplicateTermsTemplate);
router.post('/terms/templates/:id/set-default', authorize(['ADMIN']), setDefaultTermsTemplate);

// Parties (Customers & Suppliers)
router.get('/parties', getParties);
router.get('/parties/:id', getPartyById);
router.post('/parties', createParty);
router.put('/parties/:id', updateParty);
router.post('/parties/:id/toggle-status', togglePartyStatus);
router.delete('/parties/:id', authorize(['ADMIN']), deleteParty);

// Farmers / Sub-parties / Locations
router.get('/parties/:partyId/farmers', getFarmersByParty);
router.post('/parties/:partyId/farmers', createFarmer);
router.get('/farmers/:id', getFarmerById);
router.put('/farmers/:id', updateFarmer);
router.delete('/farmers/:id', deleteFarmer);

// Items & Stock
router.get('/items', getItems);
router.get('/items/categories', getCategories);
router.post('/items/categories', createCategory);
router.get('/items/units', getUnits);
router.post('/items/units', createUnit);
router.get('/items/:id', getItemById);
router.post('/items', createItem);
router.put('/items/:id', updateItem);
router.post('/items/:id/adjust-stock', adjustStock);

// BOM
router.get('/bom', getBOMs);
router.get('/bom/:finishedItemId', getBOMByFinishedItem);
router.post('/bom', saveBOM);

// Sales & Invoices
router.get('/sales/invoices', getInvoices);
router.get('/sales/invoices/:id', getInvoiceById);
router.post('/sales/invoices', createInvoice);
router.put('/sales/invoices/:id', updateInvoice);
router.post('/sales/invoices/:id/cancel', cancelInvoice);
router.delete('/sales/invoices/:id', deleteInvoice);

// Quotations
router.get('/quotations', getQuotations);
router.get('/quotations/:id', getQuotationById);
router.post('/quotations', createQuotation);
router.put('/quotations/:id', updateQuotation);
router.delete('/quotations/:id', deleteQuotation);
router.post('/quotations/:id/convert-to-invoice', convertQuotationToInvoice);

// Delivery Challans
router.get('/delivery-challans', getDeliveryChallans);
router.get('/delivery-challans/:id', getDeliveryChallanById);
router.post('/delivery-challans', createDeliveryChallan);
router.put('/delivery-challans/:id', updateDeliveryChallan);
router.delete('/delivery-challans/:id', deleteDeliveryChallan);

// Purchases
router.get('/purchases', getPurchases);
router.get('/purchases/:id', getPurchaseById);
router.post('/purchases', createPurchase);
router.put('/purchases/:id', updatePurchase);
router.delete('/purchases/:id', deletePurchase);

// Payments
router.get('/payments', getPayments);
router.post('/payments', createPayment);

// Machines & Warranty
router.get('/machines', getMachines);
router.get('/machines/:serialNumber', getMachineBySerial);
router.post('/machines', createMachine);

// Services & Technician Mobile Interface
router.get('/services', getServices);
router.get('/services/summary', getTodayServicesSummary);
router.post('/services', createServiceTask);
router.post('/services/assign', assignTechnician);
router.put('/services/:id/status', updateServiceStatus);
router.put('/services/:id/complete', completeServiceTask);
router.post('/services/dispatch-whatsapp', sendTechnicianDispatchWhatsApp);
router.post('/services/remind-today-bulk', remindAllTodayCustomers);
router.get('/services/reminder-logs', getReminderLogs);
router.post('/services/payment-reminder-whatsapp', sendPaymentReminderWhatsApp);
router.get('/services/technician/today', getTechnicianTodayJobs);

// WhatsApp Business API Config
router.get('/whatsapp/config', getWhatsAppConfigHandler);
router.put('/whatsapp/config', updateWhatsAppConfigHandler);
router.post('/whatsapp/test-connection', testWhatsAppConnectionHandler);

// Expenses
router.get('/expenses', getExpenses);
router.post('/expenses', createExpense);

// Reports & Dashboard
router.get('/reports/dashboard', getDashboardStats);
router.get('/reports/gst', getGSTReport);
router.get('/reports/stock-ledger', getStockLedgerReport);
router.get('/reports/party-ledger/:partyId', getPartyLedgerReport);
router.get('/reports/pnl', getProfitAndLossReport);

// Search & Backup
router.get('/search', globalSearch);
router.get('/backup/export', authorize(['ADMIN']), createBackup);
router.post('/backup/reset-demo-data', authorize(['ADMIN']), resetDemoData);

export default router;
