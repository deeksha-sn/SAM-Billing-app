import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, CheckCircle2, UserPlus, PackagePlus, FileText, BookmarkPlus, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import { QuickAddPartyModal } from './QuickAddPartyModal';
import { QuickAddItemModal } from './QuickAddItemModal';
import { SearchablePartyCombobox } from './SearchablePartyCombobox';
import { BillingItemSelect } from './BillingItemSelect';
import { INDIAN_STATES, getStateNameFromCode, isInterStateTransaction, normalizeStateCode } from '../utils/gstHelper';

interface InvoiceEditorModalProps {
  invoice?: any;
  company: any;
  onClose: () => void;
  onSaved: (invoice: any) => void;
}

function numberToWords(num: number): string {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'Zero Rupees Only';

  function inWords(val: number): string {
    if (val < 20) return a[val];
    if (val < 100) return b[Math.floor(val / 10)] + (val % 10 !== 0 ? ' ' + a[val % 10] : ' ');
    if (val < 1000) return a[Math.floor(val / 100)] + 'Hundred ' + (val % 100 !== 0 ? inWords(val % 100) : '');
    if (val < 100000) return inWords(Math.floor(val / 1000)) + 'Thousand ' + (val % 1000 !== 0 ? inWords(val % 1000) : '');
    if (val < 10000000) return inWords(Math.floor(val / 100000)) + 'Lakh ' + (val % 100000 !== 0 ? inWords(val % 100000) : '');
    return inWords(Math.floor(val / 10000000)) + 'Crore ' + (val % 10000000 !== 0 ? inWords(val % 10000000) : '');
  }

  return inWords(n).trim() + ' Rupees Only';
}

export const InvoiceEditorModal: React.FC<InvoiceEditorModalProps> = ({
  invoice,
  company,
  onClose,
  onSaved,
}) => {
  const { user } = useAuth();
  const isEditMode = !!invoice?.id;

  // Master Data
  const [parties, setParties] = useState<any[]>([]);
  const [dbItems, setDbItems] = useState<any[]>([]);
  const [termsTemplates, setTermsTemplates] = useState<any[]>([]);

  // Form State
  const [invoiceNumberInput, setInvoiceNumberInput] = useState(invoice?.invoiceNumber || '');
  const [selectedPartyId, setSelectedPartyId] = useState(invoice?.partyId || '');
  const [invoiceDate, setInvoiceDate] = useState(
    invoice?.invoiceDate
      ? new Date(invoice.invoiceDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [ewayBillNo, setEwayBillNo] = useState(invoice?.ewayBillNo || '');
  const [placeOfSupply, setPlaceOfSupply] = useState(invoice?.placeOfSupply || '29-Karnataka');
  const [poNumber, setPoNumber] = useState(invoice?.poNumber || '');
  const [poDate, setPoDate] = useState(
    invoice?.poDate ? new Date(invoice.poDate).toISOString().split('T')[0] : ''
  );
  const [paymentMode, setPaymentMode] = useState(invoice?.paymentMode || 'CASH');
  const [amountPaid, setAmountPaid] = useState<number>(invoice?.amountPaid || 0);

  // Line items
  const [lines, setLines] = useState<any[]>(
    invoice?.items && invoice.items.length > 0
      ? invoice.items.map((i: any) => ({
          itemId: i.itemId,
          itemName: i.itemName,
          hsnSac: i.hsnSac || '8436',
          unit: i.unit || 'Nos',
          quantity: i.quantity || 1,
          rate: i.rate || 0,
          discountPercent: i.discountPercent || 0,
          gstRate: i.gstRate || 18,
          serialNumber: i.serialNumber || '',
        }))
      : [
          {
            itemId: '',
            itemName: '',
            hsnSac: '8436',
            unit: 'Nos',
            quantity: 1,
            rate: 0,
            discountPercent: 0,
            gstRate: 18,
            serialNumber: '',
          },
        ]
  );

  // Terms & Conditions
  const [selectedTermsTemplateId, setSelectedTermsTemplateId] = useState(
    invoice?.termsTemplateId || ''
  );
  const [termsList, setTermsList] = useState<string[]>(() => {
    if (invoice?.termsSnapshot) {
      try {
        if (typeof invoice.termsSnapshot === 'string' && invoice.termsSnapshot.startsWith('[')) {
          return JSON.parse(invoice.termsSnapshot);
        } else if (Array.isArray(invoice.termsSnapshot)) {
          return invoice.termsSnapshot;
        }
      } catch {
        // Fallback
      }
    }
    return [
      '1. Company is not responsible for transportation damages.',
      '2. No replacement, No onsite service, No exchange.',
      '3. Extra charge applicable for spare parts.',
      '4. Goods once sold cannot be taken back under any conditions.',
      '5. Subject to Bangalore Jurisdiction only.',
      '6. Thanks for doing business with us!',
    ];
  });

  // Modal sub-dialogs
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [activeLineIndexForNewItem, setActiveLineIndexForNewItem] = useState<number | null>(null);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      const [partiesRes, itemsRes, termsRes] = await Promise.all([
        apiRequest('/parties?type=CUSTOMER'),
        apiRequest('/items'),
        apiRequest('/terms/templates'),
      ]);
      setParties(partiesRes.parties || []);
      setDbItems(itemsRes.items || []);
      setTermsTemplates(termsRes.templates || []);

      // If no template selected yet, load default
      if (!selectedTermsTemplateId && termsRes.templates && termsRes.templates.length > 0) {
        const defaultTpl = termsRes.templates.find((t: any) => t.isDefault) || termsRes.templates[0];
        if (defaultTpl) {
          setSelectedTermsTemplateId(defaultTpl.id);
          if (!invoice?.termsSnapshot) {
            setTermsList(defaultTpl.terms.map((t: any) => `${t.sequence}. ${t.text}`));
          }
        }
      }
    } catch (err) {
      console.error('Error loading master data:', err);
    }
  };

  const selectedParty = parties.find((p) => p.id === selectedPartyId) || invoice?.party;
  const companyStateCode = company?.stateCode || company?.state || '29';
  const posCode = placeOfSupply || selectedParty?.stateCode || selectedParty?.state || '29';
  const isInterState = isInterStateTransaction(posCode, selectedParty?.state, companyStateCode);

  // Handle party change
  const handlePartySelect = (partyId: string) => {
    setSelectedPartyId(partyId);
    const p = parties.find((item) => item.id === partyId);
    if (p) {
      const stCode = normalizeStateCode(p.stateCode || p.state || '29');
      const stName = p.state || getStateNameFromCode(stCode);
      setPlaceOfSupply(`${stCode}-${stName}`);
    }
  };

  // Handle Item Select on Line
  const handleLineItemChange = (index: number, itemId: string) => {
    const itemObj = dbItems.find((i) => i.id === itemId);
    if (!itemObj) return;

    const newLines = [...lines];
    newLines[index] = {
      ...newLines[index],
      itemId: itemObj.id,
      itemName: itemObj.name,
      hsnSac: itemObj.hsnSac || '8436',
      unit: itemObj.unit || 'Nos',
      rate: Number(itemObj.sellingPrice) || 0,
      gstRate: Number(itemObj.gstRate) || 18,
    };
    setLines(newLines);

    // Auto-suggest machine terms template if mapped
    if (itemObj.defaultTermsTemplateId) {
      const matchedTemplate = termsTemplates.find((t) => t.id === itemObj.defaultTermsTemplateId);
      if (matchedTemplate) {
        setSelectedTermsTemplateId(matchedTemplate.id);
        setTermsList(matchedTemplate.terms.map((t: any) => `${t.sequence}. ${t.text}`));
      }
    }
  };

  const handleLineValueChange = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        itemId: '',
        itemName: '',
        hsnSac: '8436',
        unit: 'Nos',
        quantity: 1,
        rate: 0,
        discountPercent: 0,
        gstRate: 18,
        serialNumber: '',
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) {
      alert('Invoice must contain at least one item line');
      return;
    }
    setLines(lines.filter((_, idx) => idx !== index));
  };

  // Terms Selection
  const handleTermsTemplateChange = (templateId: string) => {
    setSelectedTermsTemplateId(templateId);
    const tpl = termsTemplates.find((t) => t.id === templateId);
    if (tpl) {
      setTermsList(tpl.terms.map((t: any) => `${t.sequence}. ${t.text}`));
    }
  };

  const handleTermEdit = (index: number, text: string) => {
    const updated = [...termsList];
    updated[index] = text;
    setTermsList(updated);
  };

  const handleAddTermLine = () => {
    setTermsList([...termsList, `${termsList.length + 1}. `]);
  };

  const handleRemoveTermLine = (index: number) => {
    setTermsList(termsList.filter((_, idx) => idx !== index));
  };

  // Save Terms as New Master Template
  const handleSaveTermsAsTemplate = async () => {
    if (!newTemplateTitle.trim()) {
      alert('Please enter a template title');
      return;
    }

    try {
      const cleanedTerms = termsList
        .map((t) => t.replace(/^\d+\.\s*/, '').trim())
        .filter((t) => t.length > 0);

      const res = await apiRequest('/terms/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: newTemplateTitle.trim(),
          terms: cleanedTerms,
        }),
      });

      alert('Terms template saved successfully!');
      setShowSaveTemplateModal(false);
      setNewTemplateTitle('');
      setTermsTemplates([...termsTemplates, res.template]);
      setSelectedTermsTemplateId(res.template.id);
    } catch (err: any) {
      alert(`Error saving template: ${err.message}`);
    }
  };

  // Calculations
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let rawGrandTotal = 0;

  lines.forEach((line) => {
    const qty = Number(line.quantity) || 0;
    const rate = Number(line.rate) || 0;
    const discPct = Number(line.discountPercent) || 0;
    const gstPct = Number(line.gstRate) || 0;

    const baseAmount = qty * rate * (1 - discPct / 100);
    totalTaxable += baseAmount;

    if (!isInterState) {
      const cgst = (baseAmount * (gstPct / 2)) / 100;
      const sgst = (baseAmount * (gstPct / 2)) / 100;
      totalCgst += cgst;
      totalSgst += sgst;
    } else {
      const igst = (baseAmount * gstPct) / 100;
      totalIgst += igst;
    }

    const itemTotal = baseAmount * (1 + gstPct / 100);
    rawGrandTotal += itemTotal;
  });

  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Number((grandTotal - rawGrandTotal).toFixed(2));
  const totalTax = totalCgst + totalSgst + totalIgst;

  const handleDeleteBill = async () => {
    if (!invoice?.id) return;

    if (invoice.status !== 'DRAFT' && user?.role !== 'ADMIN') {
      alert('Only ADMIN users can permanently delete confirmed invoices');
      return;
    }

    const confirmMsg = `Are you sure you want to PERMANENTLY DELETE Invoice ${invoice.invoiceNumber}?\n\nWARNING: This will permanently remove this invoice record from the database and automatically reverse associated BOM/inventory stock, GST reports, customer ledgers, and payment allocations.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await apiRequest(`/sales/invoices/${invoice.id}`, { method: 'DELETE' });
      alert(`Invoice ${invoice.invoiceNumber} deleted permanently!`);
      onClose();
      onSaved(null);
    } catch (err: any) {
      alert(`Error deleting invoice: ${err.message}`);
    }
  };

  // Submit Invoice (Save Draft or Confirm)
  const handleSubmitInvoice = async (targetStatus: 'DRAFT' | 'CONFIRMED') => {
    if (!selectedPartyId) {
      alert('Please select a customer');
      return;
    }

    const validLines = lines.filter((l) => l.itemId && Number(l.quantity) > 0);
    if (validLines.length === 0) {
      alert('Please add at least one valid item with quantity > 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        invoiceNumber: invoiceNumberInput.trim() || undefined,
        partyId: selectedPartyId,
        invoiceDate,
        items: validLines,
        ewayBillNo: ewayBillNo.trim() || null,
        placeOfSupply: placeOfSupply.trim() || null,
        poNumber: poNumber.trim() || null,
        poDate: poDate || null,
        termsTemplateId: selectedTermsTemplateId || null,
        termsSnapshot: termsList,
        paymentMode,
        amountPaid: Number(amountPaid) || 0,
        status: targetStatus,
      };

      let saved;
      if (isEditMode) {
        const res = await apiRequest(`/sales/invoices/${invoice.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        saved = res.invoice;
      } else {
        const res = await apiRequest('/sales/invoices', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        saved = res.invoice;
      }

      onSaved(saved);
    } catch (err: any) {
      alert(`Error saving invoice: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-2 md:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col my-4 max-h-[94vh] border border-gray-200 overflow-hidden">
        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold">
                {isEditMode ? `Edit Tax Invoice: ${invoice.invoiceNumber}` : 'Create New Sales Invoice'}
              </h2>
              <p className="text-xs text-slate-400">Interactive Billing & Itemized GST Calculation</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isEditMode && (
              <button
                type="button"
                onClick={handleDeleteBill}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition shadow"
                title="Delete Bill Permanently"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Bill</span>
              </button>
            )}

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmitInvoice('DRAFT')}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-amber-300 rounded-xl font-bold text-xs transition"
            >
              <Save className="w-4 h-4" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmitInvoice('CONFIRMED')}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Invoice</span>
            </button>

            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50 text-xs">
          
          {/* Section 1: Customer & Invoice Metadata */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                1. Customer & Header Details
              </h3>
              <button
                type="button"
                onClick={() => setShowAddPartyModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs hover:bg-emerald-100 transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Customer</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">
                  Invoice No. {user?.role === 'ADMIN' ? '(Editable by ADMIN)' : ''}
                </label>
                <input
                  type="text"
                  value={invoiceNumberInput}
                  disabled={user?.role !== 'ADMIN' && isEditMode}
                  onChange={(e) => setInvoiceNumberInput(e.target.value)}
                  placeholder="Auto-generated on save"
                  className={`w-full p-2.5 border rounded-xl font-mono font-bold text-slate-900 ${
                    user?.role === 'ADMIN' ? 'bg-amber-50/60 border-amber-300' : 'bg-slate-100 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <SearchablePartyCombobox
                  label="Customer Name"
                  required={true}
                  partyType="CUSTOMER"
                  selectedPartyId={selectedPartyId}
                  parties={parties}
                  onSelectParty={(p) => {
                    if (p) {
                      handlePartySelect(p.id);
                    } else {
                      setSelectedPartyId('');
                    }
                  }}
                  onPartyCreated={(newP) => {
                    setParties([...parties, newP]);
                    handlePartySelect(newP.id);
                  }}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">Invoice Date *</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-bold text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">Place of Supply *</label>
                <select
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-slate-900 bg-white font-semibold text-xs"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={`${s.code}-${s.name}`}>
                      {s.code}-{s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">E-Way Bill Number</label>
                <input
                  type="text"
                  value={ewayBillNo}
                  onChange={(e) => setEwayBillNo(e.target.value)}
                  placeholder="12-digit E-Way bill"
                  className="w-full p-2.5 border rounded-xl text-slate-900 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">PO Number</label>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="Purchase Order No"
                  className="w-full p-2.5 border rounded-xl text-slate-900 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">PO Date</label>
                <input
                  type="date"
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-slate-900 bg-white"
                />
              </div>
            </div>

            {selectedParty && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-slate-700">
                <div><span className="font-bold">Billed To:</span> {selectedParty.name}</div>
                <div><span className="font-bold">Address:</span> {selectedParty.address || selectedParty.village}</div>
                <div><span className="font-bold">Mobile:</span> {selectedParty.mobile}</div>
                <div><span className="font-bold">GSTIN:</span> {selectedParty.gstin || 'Unregistered'}</div>
              </div>
            )}
          </div>

          {/* Section 2: Items Table */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                2. Invoice Items & Pricing
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs hover:bg-indigo-100 transition"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>+ Add New Item</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-2 text-center w-8">#</th>
                    <th className="p-2 text-left min-w-[220px]">Item Name</th>
                    <th className="p-2 text-center w-24">HSN/SAC</th>
                    <th className="p-2 text-center w-20">Qty</th>
                    <th className="p-2 text-right w-24">Price (₹)</th>
                    <th className="p-2 text-right w-20">GST %</th>
                    <th className="p-2 text-right w-28">Total (₹)</th>
                    <th className="p-2 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const qty = Number(line.quantity) || 0;
                    const rate = Number(line.rate) || 0;
                    const gstPct = Number(line.gstRate) || 0;
                    const itemTotal = qty * rate * (1 + gstPct / 100);

                    return (
                      <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50/50">
                        <td className="p-2 text-center font-bold text-slate-500">{idx + 1}</td>
                        
                        <td className="p-2 space-y-1">
                          <BillingItemSelect
                            value={line.itemId}
                            onChange={(itemId) => handleLineItemChange(idx, itemId)}
                            items={dbItems}
                            documentType="SALES"
                            className="w-full p-2 border rounded-lg font-semibold text-slate-900 bg-white"
                          />

                          {line.itemId && (
                            <input
                              type="text"
                              value={line.serialNumber}
                              onChange={(e) => handleLineValueChange(idx, 'serialNumber', e.target.value)}
                              placeholder="Machine Serial No (Optional)"
                              className="w-full p-1 border rounded text-[10px] font-mono text-emerald-900"
                            />
                          )}
                        </td>

                        <td className="p-2">
                          <input
                            type="text"
                            value={line.hsnSac}
                            onChange={(e) => handleLineValueChange(idx, 'hsnSac', e.target.value)}
                            className="w-full p-2 border rounded-lg text-center font-mono"
                          />
                        </td>

                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) => handleLineValueChange(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full p-2 border rounded-lg text-center font-bold font-mono"
                          />
                        </td>

                        <td className="p-2">
                          <input
                            type="number"
                            step="0.01"
                            value={line.rate}
                            onChange={(e) => handleLineValueChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 border rounded-lg text-right font-mono"
                          />
                        </td>

                        <td className="p-2">
                          <select
                            value={line.isExempt ? 'EXEMPT' : line.gstRate}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'EXEMPT') {
                                handleLineValueChange(idx, 'gstRate', 0);
                                handleLineValueChange(idx, 'isExempt', true);
                              } else {
                                handleLineValueChange(idx, 'gstRate', parseFloat(val) || 0);
                                handleLineValueChange(idx, 'isExempt', false);
                              }
                            }}
                            className="w-full p-2 border rounded-lg text-right font-mono font-bold bg-white text-xs"
                          >
                            <option value={0}>0%</option>
                            <option value={0.25}>0.25%</option>
                            <option value={3}>3%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                            <option value={40}>40%</option>
                            <option value="EXEMPT">Exempted</option>
                          </select>
                        </td>

                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          ₹{itemTotal.toFixed(2)}
                        </td>

                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
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

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={handleAddLine}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl font-bold text-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Item Row</span>
              </button>

              <div className="text-right space-y-1 text-xs">
                <p className="text-slate-600">Subtotal (Taxable): <span className="font-mono font-bold text-slate-900">₹{totalTaxable.toFixed(2)}</span></p>
                <p className="text-slate-600">Total GST ({isInterState ? 'IGST' : 'CGST+SGST'}): <span className="font-mono font-bold text-slate-900">₹{totalTax.toFixed(2)}</span></p>
                <p className="text-base font-black text-emerald-950">Grand Total: <span className="font-mono">₹{grandTotal.toLocaleString('en-IN')}</span></p>
                <p className="italic text-[11px] text-slate-500">{numberToWords(grandTotal)}</p>
              </div>
            </div>
          </div>

          {/* Section 3: Terms & Conditions Snapshot */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                3. Terms & Conditions (Invoice Snapshot)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSaveTemplateModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl font-bold text-xs hover:bg-amber-100 transition"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Save as Template</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">Select Terms Template</label>
                <select
                  value={selectedTermsTemplateId}
                  onChange={(e) => handleTermsTemplateChange(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-semibold text-slate-900 bg-white"
                >
                  <option value="">-- Custom Terms --</option>
                  {termsTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="block font-bold text-slate-700 uppercase text-[10px]">Edit Terms Line-by-Line</label>
                {termsList.map((termText, tIdx) => (
                  <div key={tIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={termText}
                      onChange={(e) => handleTermEdit(tIdx, e.target.value)}
                      className="flex-1 p-2 border rounded-xl text-xs text-slate-900 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveTermLine(tIdx)}
                      className="p-1.5 text-red-500 hover:text-red-700 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddTermLine}
                  className="px-3 py-1.5 bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition"
                >
                  + Add Term Line
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Quick Add Customer Modal */}
      {showAddPartyModal && (
        <QuickAddPartyModal
          type="CUSTOMER"
          onClose={() => setShowAddPartyModal(false)}
          onSuccess={(newParty: any) => {
            setParties([...parties, newParty]);
            setSelectedPartyId(newParty.id);
            setPlaceOfSupply(`${newParty.stateCode || '29'}-${newParty.state || 'Karnataka'}`);
            setShowAddPartyModal(false);
          }}
        />
      )}

      {/* Quick Add Item Modal */}
      {showAddItemModal && (
        <QuickAddItemModal
          onClose={() => setShowAddItemModal(false)}
          onSuccess={(newItem: any) => {
            setDbItems([...dbItems, newItem]);
            setShowAddItemModal(false);
            // Append line item automatically
            setLines([
              ...lines,
              {
                itemId: newItem.id,
                itemName: newItem.name,
                hsnSac: newItem.hsnSac || '8436',
                unit: newItem.unit || 'Nos',
                quantity: 1,
                rate: Number(newItem.sellingPrice) || 0,
                discountPercent: 0,
                gstRate: Number(newItem.gstRate) || 18,
                serialNumber: '',
              },
            ]);
          }}
        />
      )}

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Save Custom Terms as Master Template</h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Template Title *</label>
              <input
                type="text"
                value={newTemplateTitle}
                onChange={(e) => setNewTemplateTitle(e.target.value)}
                placeholder="e.g. Special Machine Warranty Terms"
                className="w-full p-2.5 border rounded-xl text-xs font-semibold"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTermsAsTemplate}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
