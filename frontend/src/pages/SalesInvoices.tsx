import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { FileText, Plus, Printer, Trash2, X, Search, CheckCircle, AlertCircle, Ban } from 'lucide-react';
import { PrintInvoiceModal } from '../components/PrintInvoiceModal';
import { QuickAddPartyModal } from '../components/QuickAddPartyModal';
import { QuickAddItemModal } from '../components/QuickAddItemModal';

export const SalesInvoices: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('create') === 'true');

  // Parties & Items for creation form
  const [customers, setCustomers] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('0');
  const [notes, setNotes] = useState('');
  const [ewayBillNo, setEwayBillNo] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState('');

  // Terms & Conditions State
  const [termsTemplates, setTermsTemplates] = useState<any[]>([]);
  const [selectedTermsTemplateId, setSelectedTermsTemplateId] = useState('');
  const [invoiceTerms, setInvoiceTerms] = useState<string[]>([]);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [userHasEditedTerms, setUserHasEditedTerms] = useState(false);

  const [lines, setLines] = useState<any[]>([
    { itemId: '', itemName: '', hsnSac: '8436', unit: 'Nos', quantity: 1, rate: 0, discountPercent: 0, gstRate: 18, serialNumber: '' },
  ]);

  // Modals for Quick Add
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [showQuickItem, setShowQuickItem] = useState(false);

  useEffect(() => {
    loadInvoices();
    loadCompany();
    loadMasters();
  }, []);

  const loadInvoices = async () => {
    try {
      const res = await apiRequest('/sales/invoices');
      setInvoices(res.invoices);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCompany = async () => {
    try {
      const res = await apiRequest('/settings/company');
      setCompany(res.company);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMasters = async () => {
    try {
      const pRes = await apiRequest('/parties?type=CUSTOMER');
      setCustomers(pRes.parties);
      const iRes = await apiRequest('/items');
      setItemsList(iRes.items);
      const tRes = await apiRequest('/terms/templates');
      const templates = tRes.templates || [];
      setTermsTemplates(templates);

      const defaultTmpl = templates.find((t: any) => t.isDefault) || templates[0];
      if (defaultTmpl && invoiceTerms.length === 0) {
        setSelectedTermsTemplateId(defaultTmpl.id);
        const termsArr = defaultTmpl.items?.map((i: any) => i.text) || [];
        setInvoiceTerms(termsArr);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCustomerSelect = (partyId: string) => {
    setSelectedCustomerId(partyId);
    const found = customers.find((c) => c.id === partyId);
    setSelectedCustomer(found || null);
    if (found && !placeOfSupply) {
      setPlaceOfSupply(`${found.stateCode || '29'}-${found.state || 'Karnataka'}`);
    }
  };

  const handleTermsTemplateSelect = (tmplId: string) => {
    setSelectedTermsTemplateId(tmplId);
    setUserHasEditedTerms(false);
    if (!tmplId) {
      setInvoiceTerms([]);
      return;
    }
    const found = termsTemplates.find((t) => t.id === tmplId);
    if (found) {
      const termsArr = found.items?.map((i: any) => i.text) || [];
      setInvoiceTerms(termsArr);
    }
  };

  const handleItemSelect = (idx: number, itemId: string) => {
    const item = itemsList.find((i) => i.id === itemId);
    const updated = [...lines];
    if (item) {
      updated[idx] = {
        ...updated[idx],
        itemId: item.id,
        itemName: item.name,
        hsnSac: item.hsnSac || '8436',
        unit: item.unit || 'Nos',
        rate: item.sellingPrice || 0,
        gstRate: item.gstRate || 18,
      };

      // Intelligent machine-specific terms suggestion
      if (item.defaultTermsTemplateId && !userHasEditedTerms) {
        const itemTmpl = termsTemplates.find((t) => t.id === item.defaultTermsTemplateId);
        if (itemTmpl) {
          setSelectedTermsTemplateId(itemTmpl.id);
          const termsArr = itemTmpl.items?.map((i: any) => i.text) || [];
          setInvoiceTerms(termsArr);
        }
      }
    } else {
      updated[idx].itemId = '';
    }
    setLines(updated);
  };

  const handleSaveAsMasterTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) {
      alert('Template Name is required');
      return;
    }
    const filteredTerms = invoiceTerms.filter((t) => t.trim().length > 0);
    if (filteredTerms.length === 0) {
      alert('Please add at least one condition text');
      return;
    }

    try {
      const res = await apiRequest('/terms/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: newTemplateName.trim(),
          isDefault: false,
          items: filteredTerms,
        }),
      });
      alert(`Terms template "${newTemplateName}" saved successfully to Master Templates!`);
      setShowSaveTemplateModal(false);
      setNewTemplateName('');
      loadMasters();
      if (res.template) {
        setSelectedTermsTemplateId(res.template.id);
      }
    } catch (err: any) {
      alert(`Error saving template: ${err.message}`);
    }
  };

  const updateLineField = (idx: number, field: string, val: any) => {
    const updated = [...lines];
    updated[idx][field] = val;
    setLines(updated);
  };

  const addLine = () => {
    setLines([
      ...lines,
      { itemId: '', itemName: '', hsnSac: '8436', unit: 'Nos', quantity: 1, rate: 0, discountPercent: 0, gstRate: 18, serialNumber: '' },
    ]);
  };

  const removeLine = (idx: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  // Calculations for preview
  const companyStateCode = company?.stateCode || '29';
  const customerStateCode = selectedCustomer?.stateCode || '29';
  const isInterState = companyStateCode !== customerStateCode;

  let totalTaxable = 0;
  let totalTax = 0;
  lines.forEach((l) => {
    const base = (Number(l.quantity) || 0) * (Number(l.rate) || 0);
    const disc = (base * (Number(l.discountPercent) || 0)) / 100;
    const taxVal = base - disc;
    const tax = (taxVal * (Number(l.gstRate) || 0)) / 100;
    totalTaxable += taxVal;
    totalTax += tax;
  });

  const rawGrandTotal = totalTaxable + totalTax;
  const grandTotal = Math.round(rawGrandTotal);
  const paidVal = Number(amountPaid) || 0;
  const balanceDue = grandTotal - paidVal;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert('Please select a customer');
      return;
    }
    if (lines.some((l) => !l.itemId)) {
      alert('Please select an item for all line rows');
      return;
    }

    try {
      const filteredTerms = invoiceTerms.filter((t) => t && t.trim().length > 0);

      const res = await apiRequest('/sales/invoices', {
        method: 'POST',
        body: JSON.stringify({
          partyId: selectedCustomerId,
          items: lines,
          paymentMode,
          amountPaid: paidVal,
          notes,
          ewayBillNo,
          placeOfSupply,
          poNumber,
          poDate,
          termsTemplateId: selectedTermsTemplateId || null,
          termsSnapshot: filteredTerms,
          status: 'CONFIRMED',
        }),
      });

      alert(`Invoice ${res.invoice.invoiceNumber} created successfully! Stock and accounting updated.`);
      setShowCreateModal(false);
      loadInvoices();
    } catch (err: any) {
      alert(`Error creating invoice: ${err.message}`);
    }
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to cancel this invoice? Stock and ledger will be restored.')) return;
    try {
      await apiRequest(`/sales/invoices/${invoiceId}/cancel`, { method: 'POST' });
      alert('Invoice cancelled and stock restored');
      loadInvoices();
    } catch (err: any) {
      alert(`Error cancelling invoice: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Invoices & Billing</h1>
          <p className="text-sm text-gray-500">Vyapar-style GST Invoicing with Automatic BOM Stock Deduction</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-md transition"
        >
          <Plus className="w-5 h-5" />
          <span>+ Create Sales Invoice</span>
        </button>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase text-xs">
            <tr>
              <th className="p-4">Invoice #</th>
              <th className="p-4">Date</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Grand Total</th>
              <th className="p-4">Amount Paid</th>
              <th className="p-4">Balance Due</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50 transition">
                <td className="p-4 font-bold font-mono text-emerald-800">{inv.invoiceNumber}</td>
                <td className="p-4 text-gray-600">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                <td className="p-4 font-semibold text-gray-900">
                  {inv.party?.name}
                  <span className="block text-xs text-gray-500 font-normal">{inv.party?.mobile}</span>
                </td>
                <td className="p-4 font-mono font-bold">₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                <td className="p-4 font-mono text-green-700 font-bold">₹{inv.amountPaid.toLocaleString('en-IN')}</td>
                <td className="p-4 font-mono text-red-600 font-bold">₹{inv.balanceDue.toLocaleString('en-IN')}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                    inv.status === 'PAID' ? 'bg-green-100 text-green-800' :
                    inv.status === 'PARTIALLY_PAID' ? 'bg-amber-100 text-amber-800' :
                    inv.status === 'CANCELLED' ? 'bg-gray-100 text-gray-600 line-through' : 'bg-red-100 text-red-800'
                  }`}>
                    {inv.status}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  <button
                    onClick={() => setViewInvoice(inv)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-lg border inline-flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print/PDF
                  </button>
                  {inv.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleCancelInvoice(inv.id)}
                      className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs rounded-lg border border-red-200"
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE INVOICE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full p-6 my-8">
            <div className="flex justify-between items-center pb-4 border-b">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-emerald-600" />
                <span>Create New Sales Invoice</span>
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-6 space-y-6">
              {/* Customer Selector & Quick Add */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">Select Customer *</label>
                    <button
                      type="button"
                      onClick={() => setShowQuickCustomer(true)}
                      className="text-xs font-bold text-emerald-600 hover:underline"
                    >
                      + ADD NEW CUSTOMER
                    </button>
                  </div>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    required
                    className="w-full p-3 bg-white border border-gray-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.mobile}) - {c.village || c.district}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCustomer && (
                  <div className="text-xs bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <p className="font-bold text-emerald-900">{selectedCustomer.name}</p>
                    <p className="text-emerald-700">{selectedCustomer.address || selectedCustomer.village}, {selectedCustomer.district}, {selectedCustomer.state}</p>
                    <p className="text-emerald-800 font-mono mt-1">Mobile: {selectedCustomer.mobile} {selectedCustomer.gstin ? `| GSTIN: ${selectedCustomer.gstin}` : ''}</p>
                  </div>
                )}
              </div>

              {/* Additional Invoice Info (E-Way Bill, PO, Place of Supply) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">E-Way Bill No.</label>
                  <input
                    type="text"
                    placeholder="e.g. 341002984512"
                    value={ewayBillNo}
                    onChange={(e) => setEwayBillNo(e.target.value)}
                    className="w-full p-2 bg-white border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Place of Supply</label>
                  <input
                    type="text"
                    placeholder="e.g. 29-Karnataka"
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                    className="w-full p-2 bg-white border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">PO Number</label>
                  <input
                    type="text"
                    placeholder="e.g. PO/2026/089"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full p-2 bg-white border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">PO Date</label>
                  <input
                    type="date"
                    value={poDate}
                    onChange={(e) => setPoDate(e.target.value)}
                    className="w-full p-2 bg-white border rounded-xl"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-bold text-gray-800 uppercase">Invoice Line Items</h3>
                  <button
                    type="button"
                    onClick={() => setShowQuickItem(true)}
                    className="text-xs font-bold text-emerald-600 hover:underline"
                  >
                    + ADD NEW ITEM TO MASTER
                  </button>
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 text-gray-700 font-bold border-b">
                      <tr>
                        <th className="p-3 text-left w-1/3">Item / Product</th>
                        <th className="p-3 text-center">HSN</th>
                        <th className="p-3 text-center w-16">Qty</th>
                        <th className="p-3 text-right">Rate (₹)</th>
                        <th className="p-3 text-center w-16">Disc %</th>
                        <th className="p-3 text-center w-16">GST %</th>
                        <th className="p-3 text-left">S/N (Optional Machine Serial)</th>
                        <th className="p-3 text-right">Total (₹)</th>
                        <th className="p-3 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {lines.map((line, idx) => {
                        const base = (Number(line.quantity) || 0) * (Number(line.rate) || 0);
                        const disc = (base * (Number(line.discountPercent) || 0)) / 100;
                        const taxVal = base - disc;
                        const tax = (taxVal * (Number(line.gstRate) || 0)) / 100;
                        const lineTotal = taxVal + tax;

                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-2">
                              <select
                                value={line.itemId}
                                onChange={(e) => handleItemSelect(idx, e.target.value)}
                                className="w-full p-2 border rounded-lg font-medium text-xs bg-white"
                              >
                                <option value="">Select Product...</option>
                                {itemsList.map((i) => (
                                  <option key={i.id} value={i.id}>
                                    {i.name} ({i.sku}) - ₹{i.sellingPrice}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={line.hsnSac}
                                onChange={(e) => updateLineField(idx, 'hsnSac', e.target.value)}
                                className="w-full p-2 border rounded-lg text-center font-mono"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="1"
                                value={line.quantity}
                                onChange={(e) => updateLineField(idx, 'quantity', e.target.value)}
                                className="w-full p-2 border rounded-lg text-center font-bold"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={line.rate}
                                onChange={(e) => updateLineField(idx, 'rate', e.target.value)}
                                className="w-full p-2 border rounded-lg text-right font-mono"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={line.discountPercent}
                                onChange={(e) => updateLineField(idx, 'discountPercent', e.target.value)}
                                className="w-full p-2 border rounded-lg text-center"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={line.gstRate}
                                onChange={(e) => updateLineField(idx, 'gstRate', Number(e.target.value))}
                                className="w-full p-2 border rounded-lg text-center bg-white"
                              >
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                placeholder="e.g. CC-2026-001"
                                value={line.serialNumber || ''}
                                onChange={(e) => updateLineField(idx, 'serialNumber', e.target.value)}
                                className="w-full p-2 border rounded-lg font-mono text-xs uppercase"
                              />
                            </td>
                            <td className="p-2 text-right font-bold font-mono">₹{lineTotal.toFixed(2)}</td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeLine(idx)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={addLine}
                  className="mt-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg"
                >
                  + Add Line Item
                </button>
              </div>

              {/* Payment Details & Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-2xl border">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full p-2.5 bg-white border rounded-xl text-sm font-semibold mb-3"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Credit">Credit</option>
                  </select>

                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Amount Received (₹)</label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full p-2.5 bg-white border rounded-xl text-sm font-mono font-bold"
                  />
                </div>

                <div className="space-y-1 text-xs text-right">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-gray-600">Total Taxable Value:</span>
                    <span className="font-mono font-bold">₹{totalTaxable.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-gray-600">Total GST ({isInterState ? 'IGST' : 'CGST+SGST'}):</span>
                    <span className="font-mono font-bold">₹{totalTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t-2 border-gray-800 text-sm font-black text-emerald-800">
                    <span>Grand Total:</span>
                    <span className="font-mono">₹{grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-1 text-red-600 font-bold">
                    <span>Balance Due:</span>
                    <span className="font-mono">₹{balanceDue.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions Block for Invoice */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3 text-xs">
                <div className="flex justify-between items-center border-b pb-2">
                  <div className="flex items-center gap-3">
                    <label className="font-bold text-gray-800 uppercase">Terms & Conditions Template:</label>
                    <select
                      value={selectedTermsTemplateId}
                      onChange={(e) => handleTermsTemplateSelect(e.target.value)}
                      className="p-2 bg-white border border-gray-300 rounded-xl font-bold text-gray-900"
                    >
                      <option value="">-- Custom Terms --</option>
                      {termsTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} {t.isDefault ? '(Default)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setNewTemplateName(selectedCustomer ? `${selectedCustomer.name} Terms` : 'New Custom Terms');
                      setShowSaveTemplateModal(true);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow transition"
                  >
                    + Save as New Template
                  </button>
                </div>

                {/* Editable Condition Lines */}
                <div className="space-y-2">
                  {invoiceTerms.map((term, tIdx) => (
                    <div key={tIdx} className="flex items-center gap-2">
                      <span className="font-bold text-gray-500 w-5 text-right">{tIdx + 1}.</span>
                      <input
                        type="text"
                        value={term}
                        onChange={(e) => {
                          const updated = [...invoiceTerms];
                          updated[tIdx] = e.target.value;
                          setInvoiceTerms(updated);
                          setUserHasEditedTerms(true);
                        }}
                        placeholder={`Condition ${tIdx + 1}...`}
                        className="flex-1 p-2 bg-white border rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = invoiceTerms.filter((_, i) => i !== tIdx);
                          setInvoiceTerms(updated);
                          setUserHasEditedTerms(true);
                        }}
                        className="text-red-500 hover:text-red-700 font-bold p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setInvoiceTerms([...invoiceTerms, '']);
                    setUserHasEditedTerms(true);
                  }}
                  className="text-xs font-bold text-emerald-600 hover:underline pt-1 block"
                >
                  + Add Term Line
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg"
                >
                  Confirm & Save Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showQuickCustomer && (
        <QuickAddPartyModal
          type="CUSTOMER"
          onClose={() => setShowQuickCustomer(false)}
          onSuccess={(newCustomer) => {
            setCustomers([...customers, newCustomer]);
            setSelectedCustomerId(newCustomer.id);
            setSelectedCustomer(newCustomer);
            setShowQuickCustomer(false);
          }}
        />
      )}

      {/* Quick Add Item Modal */}
      {showQuickItem && (
        <QuickAddItemModal
          onClose={() => setShowQuickItem(false)}
          onSuccess={(newItem) => {
            setItemsList([...itemsList, newItem]);
            setShowQuickItem(false);
          }}
        />
      )}

      {/* Printable Invoice Modal */}
      {viewInvoice && (
        <PrintInvoiceModal invoice={viewInvoice} company={company} onClose={() => setViewInvoice(null)} />
      )}

      {/* Save as New Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">Save as New Master Template</h3>
            <form onSubmit={handleSaveAsMasterTemplateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special Chaff Cutter Terms"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-bold text-sm"
                />
              </div>

              <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border">
                <p className="font-bold text-gray-800 mb-1">Terms to be saved ({invoiceTerms.filter(t => t.trim()).length} lines):</p>
                <ol className="list-decimal list-inside space-y-0.5 max-h-32 overflow-y-auto">
                  {invoiceTerms.filter(t => t.trim()).map((term, i) => (
                    <li key={i}>{term}</li>
                  ))}
                </ol>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowSaveTemplateModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow"
                >
                  Save Master Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
