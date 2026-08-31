import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Printer,
  Share2,
  CheckCircle2,
  FileText,
  UserPlus,
  Sparkles,
  MapPin,
  Truck,
  Calendar,
  CreditCard,
  Building,
  ShieldAlert,
  ShieldCheck,
  Percent,
  X,
} from 'lucide-react';
import { apiRequest } from '../api';
import {
  INDIAN_STATES,
  VALID_GST_RATES,
  PAYMENT_MODES,
  PAYMENT_TERMS,
  isInterStateTransaction,
  calculateItemGst,
  getStateNameFromCode,
} from '../utils/gstHelper';
import { QuickAddPartyModal } from './QuickAddPartyModal';

export interface FullScreenBillingEngineProps {
  docType: 'INVOICE' | 'PURCHASE' | 'QUOTATION' | 'DELIVERY_CHALLAN';
  editingDocId?: string | null;
  onBack: () => void;
  onSaved: (savedDoc: any) => void;
}

export const FullScreenBillingEngine: React.FC<FullScreenBillingEngineProps> = ({
  docType,
  editingDocId,
  onBack,
  onSaved,
}) => {
  const isInvoice = docType === 'INVOICE';
  const isPurchase = docType === 'PURCHASE';
  const isQuotation = docType === 'QUOTATION';
  const isChallan = docType === 'DELIVERY_CHALLAN';

  const docTypeTitle = isInvoice
    ? 'Sales Invoice'
    : isPurchase
    ? 'Purchase Entry'
    : isQuotation
    ? 'Sales Quotation'
    : 'Delivery Challan';

  const partyTypeFilter = isPurchase ? 'SUPPLIER' : 'CUSTOMER';

  // Company Profile State
  const [company, setCompany] = useState<any>({ stateCode: '29', state: 'Karnataka' });

  // Masters
  const [parties, setParties] = useState<any[]>([]);
  const [itemsMaster, setItemsMaster] = useState<any[]>([]);
  const [termsTemplates, setTermsTemplates] = useState<any[]>([]);

  // Form State
  const [docNumber, setDocNumber] = useState('');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedParty, setSelectedParty] = useState<any | null>(null);

  // Address & Locations
  const [billingAddress, setBillingAddress] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [transportName, setTransportName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [ewayBillNo, setEwayBillNo] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState('');
  const [challanReason, setChallanReason] = useState('Delivery against sale');

  // Payment & Terms
  const [paymentMode, setPaymentMode] = useState('CREDIT');
  const [paymentTermLabel, setPaymentTermLabel] = useState('30 Days');
  const [dueDate, setDueDate] = useState('');
  const [amountPaid, setAmountPaid] = useState<number>(0);

  // Terms & Notes
  const [selectedTermsTemplateId, setSelectedTermsTemplateId] = useState('');
  const [termsLines, setTermsLines] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Round Off Toggle
  const [roundOffEnabled, setRoundOffEnabled] = useState(true);

  // Line Items Table State
  const [lineItems, setLineItems] = useState<any[]>([
    {
      itemId: '',
      itemName: '',
      description: '',
      hsnSac: '8436',
      unit: 'Nos',
      quantity: 1,
      freeQuantity: 0,
      rate: 0,
      discountPercent: 0,
      discountAmount: 0,
      gstRate: 18,
      isExempt: false,
    },
  ]);

  // Quick Add Party Modal
  const [showQuickAddParty, setShowQuickAddParty] = useState(false);

  // Loading & Processing
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    initData();
  }, [editingDocId]);

  const initData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Company Profile
      const compRes = await apiRequest('/settings/company');
      setCompany(compRes.company || { stateCode: '29', state: 'Karnataka' });

      // 2. Fetch Masters
      const pRes = await apiRequest(`/parties?type=${partyTypeFilter}`);
      setParties(pRes.parties || []);

      const iRes = await apiRequest('/items');
      setItemsMaster(iRes.items || []);

      const tRes = await apiRequest('/terms/templates');
      setTermsTemplates(tRes.templates || []);

      // If editing existing document
      if (editingDocId) {
        let endpoint = '';
        if (isInvoice) endpoint = `/sales/invoices/${editingDocId}`;
        else if (isPurchase) endpoint = `/purchases/${editingDocId}`;
        else if (isQuotation) endpoint = `/quotations/${editingDocId}`;
        else if (isChallan) endpoint = `/delivery-challans/${editingDocId}`;

        const docRes = await apiRequest(endpoint);
        const doc = docRes.invoice || docRes.purchase || docRes.quotation || docRes.challan;

        if (doc) {
          setDocNumber(doc.invoiceNumber || doc.purchaseNumber || doc.quotationNumber || doc.challanNumber || '');
          setDocDate(new Date(doc.invoiceDate || doc.purchaseDate || doc.quotationDate || doc.challanDate).toISOString().split('T')[0]);
          setSupplierInvoiceNo(doc.supplierInvoiceNo || '');
          setSelectedPartyId(doc.partyId || '');

          const pObj = (pRes.parties || []).find((p: any) => p.id === doc.partyId) || doc.party;
          setSelectedParty(pObj);
          setBillingAddress(doc.billingAddress || pObj?.address || '');
          setDeliveryLocation(doc.deliveryLocation || doc.deliveryAddress || '');

          setTransportName(doc.transportName || doc.transporter || '');
          setVehicleNumber(doc.vehicleNumber || '');
          setEwayBillNo(doc.ewayBillNo || '');
          setPoNumber(doc.poNumber || doc.refOrderNo || '');
          if (doc.poDate) setPoDate(new Date(doc.poDate).toISOString().split('T')[0]);

          setPaymentMode(doc.paymentMode ? doc.paymentMode.toUpperCase() : 'CREDIT');
          setPaymentTermLabel(doc.paymentTerms || '30 Days');
          if (doc.dueDate) setDueDate(new Date(doc.dueDate).toISOString().split('T')[0]);
          setAmountPaid(doc.amountPaid || 0);

          setRoundOffEnabled(doc.roundOffEnabled !== false);
          setNotes(doc.notes || '');

          if (doc.items && doc.items.length > 0) {
            setLineItems(
              doc.items.map((i: any) => ({
                itemId: i.itemId,
                itemName: i.itemName,
                description: i.description || '',
                hsnSac: i.hsnSac || '8436',
                unit: i.unit || 'Nos',
                quantity: i.quantity || 1,
                freeQuantity: i.freeQuantity || 0,
                rate: i.rate || 0,
                discountPercent: i.discountPercent || 0,
                discountAmount: i.discountAmount || 0,
                gstRate: i.isExempt ? 'EXEMPT' : i.gstRate !== undefined ? i.gstRate : 18,
                isExempt: Boolean(i.isExempt),
              }))
            );
          }
        }
      } else {
        // New document defaults
        const dateStr = new Date().toISOString().split('T')[0];
        setDocDate(dateStr);
        calculateDefaultDueDate(dateStr, '30 Days');

        // Apply default terms snapshot
        const defTerm = (tRes.templates || []).find((t: any) => t.isDefault);
        if (defTerm && defTerm.terms) {
          setSelectedTermsTemplateId(defTerm.id);
          setTermsLines(defTerm.terms);
        }
      }
    } catch (err) {
      console.error('Failed to init billing engine:', err);
    } finally {
      setLoading(false);
    }
  };

  // State Detection helper
  const partyStateCode = selectedParty?.stateCode || '29';
  const partyStateName = selectedParty?.state || getStateNameFromCode(partyStateCode);
  const companyStateCode = company.stateCode || '29';
  const isInterState = isInterStateTransaction(partyStateCode, partyStateName, companyStateCode);

  const handlePartySelect = (partyId: string) => {
    setSelectedPartyId(partyId);
    const p = parties.find((item) => item.id === partyId);
    if (p) {
      setSelectedParty(p);
      setBillingAddress(p.address || p.village || '');
      setDeliveryLocation(p.village ? `${p.village}, ${p.district || ''}` : p.address || '');
    } else {
      setSelectedParty(null);
    }
  };

  // Calculate Due Date based on Payment Term
  const calculateDefaultDueDate = (startDateStr: string, termLabel: string) => {
    const termObj = PAYMENT_TERMS.find((t) => t.label === termLabel);
    if (termObj && termObj.days !== null) {
      const d = new Date(startDateStr);
      d.setDate(d.getDate() + termObj.days);
      setDueDate(d.toISOString().split('T')[0]);
    }
  };

  const handlePaymentTermChange = (termLabel: string) => {
    setPaymentTermLabel(termLabel);
    calculateDefaultDueDate(docDate, termLabel);
  };

  // Line Items Operations
  const handleAddRow = () => {
    setLineItems([
      ...lineItems,
      {
        itemId: '',
        itemName: '',
        description: '',
        hsnSac: '8436',
        unit: 'Nos',
        quantity: 1,
        freeQuantity: 0,
        rate: 0,
        discountPercent: 0,
        discountAmount: 0,
        gstRate: 18,
        isExempt: false,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const selectedItem = itemsMaster.find((i) => i.id === itemId);
    const updated = [...lineItems];
    if (selectedItem) {
      updated[index] = {
        ...updated[index],
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        hsnSac: selectedItem.hsnSac || '8436',
        unit: selectedItem.unit || 'Nos',
        rate: isPurchase ? (selectedItem.purchasePrice || 0) : (selectedItem.sellingPrice || 0),
        gstRate: selectedItem.gstRate !== undefined ? selectedItem.gstRate : 18,
      };
    } else {
      updated[index].itemId = itemId;
    }
    setLineItems(updated);
  };

  const handleFieldChange = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  // Real-Time Total Calculations
  let subtotalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let rawGrandTotal = 0;

  const calculatedItems = lineItems.map((line) => {
    const qty = Math.max(0, Number(line.quantity) || 0);
    const rate = Math.max(0, Number(line.rate) || 0);
    const discPct = Math.max(0, Number(line.discountPercent) || 0);
    const discAmt = Math.max(0, Number(line.discountAmount) || 0);
    const isExempt = line.gstRate === 'EXEMPT' || line.isExempt;
    const gstRateVal = isExempt ? 0 : Number(line.gstRate) || 0;

    const calc = calculateItemGst({
      quantity: qty,
      freeQuantity: Number(line.freeQuantity) || 0,
      rate: rate,
      discountPercent: discPct,
      discountAmount: discAmt,
      gstRate: gstRateVal,
      isExempt: isExempt,
      isInterState: isInterState,
    });

    subtotalTaxable += calc.taxableValue;
    totalCgst += calc.cgstAmount;
    totalSgst += calc.sgstAmount;
    totalIgst += calc.igstAmount;
    rawGrandTotal += calc.totalAmount;

    return { ...line, ...calc };
  });

  const finalGrandTotal = roundOffEnabled ? Math.round(rawGrandTotal) : Number(rawGrandTotal.toFixed(2));
  const roundOffAmount = roundOffEnabled ? Number((finalGrandTotal - rawGrandTotal).toFixed(2)) : 0;
  const balanceDueCalculated = Math.max(0, finalGrandTotal - (Number(amountPaid) || 0));

  // Save Handler
  const handleSave = async (saveStatus: string = 'CONFIRMED') => {
    if (!selectedPartyId) {
      setErrorMsg(`Please select a ${partyTypeFilter.toLowerCase()}`);
      return;
    }

    const validItems = lineItems.filter((i) => i.itemId || i.itemName.trim());
    if (validItems.length === 0) {
      setErrorMsg('Please add at least one line item');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const payload = {
      partyId: selectedPartyId,
      invoiceDate: docDate,
      purchaseDate: docDate,
      quotationDate: docDate,
      challanDate: docDate,
      supplierInvoiceNo: supplierInvoiceNo,
      billingAddress: billingAddress,
      deliveryLocation: deliveryLocation,
      transportName: transportName,
      vehicleNumber: vehicleNumber,
      ewayBillNo: ewayBillNo,
      poNumber: poNumber,
      poDate: poDate || null,
      paymentMode: paymentMode,
      paymentTerms: paymentTermLabel,
      dueDate: dueDate || null,
      amountPaid: Number(amountPaid) || 0,
      roundOffEnabled: roundOffEnabled,
      notes: notes,
      status: saveStatus,
      termsSnapshot: termsLines,
      items: validItems.map((line) => ({
        itemId: line.itemId,
        itemName: line.itemName,
        description: line.description,
        hsnSac: line.hsnSac,
        unit: line.unit,
        quantity: Number(line.quantity) || 1,
        freeQuantity: Number(line.freeQuantity) || 0,
        rate: Number(line.rate) || 0,
        discountPercent: Number(line.discountPercent) || 0,
        discountAmount: Number(line.discountAmount) || 0,
        gstRate: line.gstRate === 'EXEMPT' ? 'EXEMPT' : Number(line.gstRate) || 0,
        isExempt: line.gstRate === 'EXEMPT' || Boolean(line.isExempt),
      })),
    };

    try {
      let endpoint = '';
      let method = editingDocId ? 'PUT' : 'POST';

      if (isInvoice) endpoint = editingDocId ? `/sales/invoices/${editingDocId}` : '/sales/invoices';
      else if (isPurchase) endpoint = editingDocId ? `/purchases/${editingDocId}` : '/purchases';
      else if (isQuotation) endpoint = editingDocId ? `/quotations/${editingDocId}` : '/quotations';
      else if (isChallan) endpoint = editingDocId ? `/delivery-challans/${editingDocId}` : '/delivery-challans';

      const res = await apiRequest(endpoint, {
        method: method,
        body: JSON.stringify(payload),
      });

      onSaved(res.invoice || res.purchase || res.quotation || res.challan || res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500 font-bold">Loading full-screen billing workspace...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-gray-100 flex flex-col font-sans">
      
      {/* 1. TOP DEDICATED HEADER BAR (Reference Inspired) */}
      <div className="bg-slate-950 px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition flex items-center gap-1 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div>
            <h1 className="text-lg font-black text-white flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-700 text-white rounded-lg text-xs tracking-wider uppercase font-mono">
                {docTypeTitle}
              </span>
              <span className="font-mono text-emerald-400 font-bold">{docNumber || 'NEW'}</span>
            </h1>
          </div>
        </div>

        {/* Payment Mode Switcher */}
        {!isChallan && (
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto">
            {PAYMENT_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPaymentMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition font-mono ${
                  paymentMode === mode
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        )}

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSave('DRAFT')}
            disabled={saving}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition"
          >
            Save Draft
          </button>

          <button
            type="button"
            onClick={() => handleSave('CONFIRMED')}
            disabled={saving}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save & Confirm'}</span>
          </button>
        </div>
      </div>

      {/* ERROR MESSAGE ALERT */}
      {errorMsg && (
        <div className="bg-red-900/80 border-b border-red-700 px-6 py-3 text-red-100 font-semibold text-xs flex justify-between items-center">
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. MAIN FULL-SCREEN WORKSPACE CONTENT */}
      <div className="flex-1 p-6 space-y-6 max-w-[1700px] w-full mx-auto">
        
        {/* TOP SECTION: CUSTOMER & TRANSACTION DETAILS GRID */}
        <div className="bg-slate-800/80 rounded-3xl border border-slate-700 p-6 space-y-4 shadow-xl">
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
            
            {/* Customer / Supplier Selector */}
            <div className="space-y-1 md:col-span-2">
              <div className="flex justify-between items-center mb-1">
                <label className="font-extrabold text-slate-300 uppercase tracking-wider text-[11px]">
                  {isPurchase ? 'Supplier *' : 'Customer Name *'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickAddParty(true)}
                  className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 text-[11px]"
                >
                  <UserPlus className="w-3.5 h-3.5" /> + Quick Add
                </button>
              </div>

              <select
                value={selectedPartyId}
                onChange={(e) => handlePartySelect(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-600 rounded-xl font-bold text-sm text-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Select {isPurchase ? 'Supplier' : 'Customer'} --</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} • {p.mobile || 'No Mobile'} ({p.village || p.state || 'Karnataka'})
                  </option>
                ))}
              </select>
            </div>

            {/* Document Date */}
            <div className="space-y-1">
              <label className="font-extrabold text-slate-300 uppercase tracking-wider text-[11px]">Date *</label>
              <input
                type="date"
                value={docDate}
                onChange={(e) => {
                  setDocDate(e.target.value);
                  calculateDefaultDueDate(e.target.value, paymentTermLabel);
                }}
                className="w-full p-2.5 bg-slate-900 border border-slate-600 rounded-xl font-mono font-bold text-white"
              />
            </div>

            {/* Supplier Invoice No / PO No */}
            <div className="space-y-1">
              <label className="font-extrabold text-slate-300 uppercase tracking-wider text-[11px]">
                {isPurchase ? 'Supplier Invoice No *' : 'PO / Ref Number'}
              </label>
              <input
                type="text"
                value={isPurchase ? supplierInvoiceNo : poNumber}
                onChange={(e) => (isPurchase ? setSupplierInvoiceNo(e.target.value) : setPoNumber(e.target.value))}
                placeholder={isPurchase ? 'e.g. INV-9988' : 'PO-2026-99'}
                className="w-full p-2.5 bg-slate-900 border border-slate-600 rounded-xl font-mono font-bold text-white"
              />
            </div>

          </div>

          {/* AUTOMATIC GST STATE DETECTION BANNER (CRITICAL REQUIREMENT #1) */}
          {selectedParty && (
            <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-700 flex flex-wrap justify-between items-center text-xs gap-3">
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-xl font-extrabold font-mono text-xs ${
                  isInterState ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {isInterState ? 'INTER-STATE (IGST)' : 'INTRA-STATE (CGST + SGST)'}
                </div>

                <div className="text-slate-300">
                  <span>Customer State: </span>
                  <span className="font-bold text-white">{partyStateName} ({partyStateCode})</span>
                  <span className="text-slate-400 text-[11px] ml-2">
                    (Company: {company.state} - {companyStateCode})
                  </span>
                </div>
              </div>

              <div className="text-slate-400 font-mono text-[11px]">
                GSTIN: <span className="font-bold text-white">{selectedParty.gstin || 'UNREGISTERED / COMPOSITION'}</span>
              </div>
            </div>
          )}

          {/* LOGISTICS, TRANSPORT & PAYMENT TERMS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-xs pt-2 border-t border-slate-700/60">
            
            {/* Transport Name */}
            <div>
              <label className="font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-emerald-400" /> Transport Name
              </label>
              <input
                type="text"
                value={transportName}
                onChange={(e) => setTransportName(e.target.value)}
                placeholder="e.g. VRL Logistics"
                className="w-full p-2 bg-slate-900 border border-slate-600 rounded-xl text-white font-medium"
              />
            </div>

            {/* Delivery Location */}
            <div>
              <label className="font-bold text-slate-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Delivery Location
              </label>
              <input
                type="text"
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                placeholder="Farm No 2, Haveri"
                className="w-full p-2 bg-slate-900 border border-slate-600 rounded-xl text-white font-medium"
              />
            </div>

            {/* E-Way Bill No */}
            <div>
              <label className="font-bold text-slate-300 mb-1">E-Way Bill No</label>
              <input
                type="text"
                value={ewayBillNo}
                onChange={(e) => setEwayBillNo(e.target.value)}
                placeholder="321098765432"
                className="w-full p-2 bg-slate-900 border border-slate-600 rounded-xl text-white font-mono"
              />
            </div>

            {/* Payment Terms (Auto-calculates Due Date) */}
            <div>
              <label className="font-bold text-slate-300 mb-1">Payment Terms</label>
              <select
                value={paymentTermLabel}
                onChange={(e) => handlePaymentTermChange(e.target.value)}
                className="w-full p-2 bg-slate-900 border border-slate-600 rounded-xl text-white font-semibold"
              >
                {PAYMENT_TERMS.map((t) => (
                  <option key={t.label} value={t.label}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2 bg-slate-900 border border-slate-600 rounded-xl font-mono font-bold text-white"
              />
            </div>

          </div>

        </div>

        {/* 3. ITEMIZED TRANSACTIONS TABLE (Inspired by Reference UI) */}
        <div className="bg-slate-800/80 rounded-3xl border border-slate-700 p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" /> Itemized Billing Table
            </h2>

            <button
              type="button"
              onClick={handleAddRow}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" /> Add Item Row
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-700 rounded-2xl">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead className="bg-slate-950 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-700">
                <tr>
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3 min-w-[200px]">Item / Equipment</th>
                  <th className="p-3 min-w-[180px]">Description</th>
                  <th className="p-3 w-24">HSN/SAC</th>
                  <th className="p-3 w-20 text-center">Qty</th>
                  <th className="p-3 w-20 text-center">Free</th>
                  <th className="p-3 w-28 text-right">Price (₹)</th>
                  <th className="p-3 w-24 text-right">Disc %</th>
                  <th className="p-3 w-28 text-center">GST %</th>
                  <th className="p-3 w-28 text-right">Tax (₹)</th>
                  <th className="p-3 w-32 text-right">Total (₹)</th>
                  <th className="p-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 font-medium text-xs">
                {calculatedItems.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30 transition">
                    <td className="p-3 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                    
                    {/* Item Select */}
                    <td className="p-2">
                      <select
                        value={row.itemId}
                        onChange={(e) => handleItemSelect(idx, e.target.value)}
                        className="w-full p-2 bg-slate-900 border border-slate-600 rounded-xl font-bold text-white text-xs"
                      >
                        <option value="">-- Select Item --</option>
                        {itemsMaster.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} (Stock: {i.currentStock})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Item Description */}
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => handleFieldChange(idx, 'description', e.target.value)}
                        placeholder="Specification, specs..."
                        className="w-full p-2 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-xs"
                      />
                    </td>

                    {/* HSN */}
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.hsnSac}
                        onChange={(e) => handleFieldChange(idx, 'hsnSac', e.target.value)}
                        className="w-full p-2 bg-slate-900 border border-slate-600 rounded-xl font-mono text-center text-slate-300"
                      />
                    </td>

                    {/* Qty */}
                    <td className="p-2">
                      <input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) => handleFieldChange(idx, 'quantity', e.target.value)}
                        className="w-full p-2 bg-slate-900 border border-slate-600 rounded-xl font-bold text-center text-white"
                      />
                    </td>

                    {/* Free Qty */}
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        value={row.freeQuantity}
                        onChange={(e) => handleFieldChange(idx, 'freeQuantity', e.target.value)}
                        className="w-full p-2 bg-slate-900 border border-slate-600 rounded-xl font-bold text-center text-slate-400"
                      />
                    </td>

                    {/* Price / Unit */}
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        value={row.rate}
                        onChange={(e) => handleFieldChange(idx, 'rate', e.target.value)}
                        className="w-full p-2 bg-slate-900 border border-slate-600 rounded-xl font-mono font-bold text-right text-emerald-400"
                      />
                    </td>

                    {/* Discount % */}
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={row.discountPercent}
                        onChange={(e) => handleFieldChange(idx, 'discountPercent', e.target.value)}
                        className="w-full p-2 bg-slate-900 border border-slate-600 rounded-xl font-mono text-right text-slate-300"
                      />
                    </td>

                    {/* GST Rate Select (Including EXEMPT requirement #2) */}
                    <td className="p-2">
                      <select
                        value={row.gstRate}
                        onChange={(e) => handleFieldChange(idx, 'gstRate', e.target.value)}
                        className="w-full p-2 bg-slate-900 border border-slate-600 rounded-xl font-mono font-bold text-center text-amber-300 text-xs"
                      >
                        {VALID_GST_RATES.map((g) => (
                          <option key={String(g.value)} value={String(g.value)}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Tax Amount */}
                    <td className="p-3 text-right font-mono font-bold text-slate-300">
                      ₹{((isInterState ? row.igstAmount : row.cgstAmount + row.sgstAmount) || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Total Amount */}
                    <td className="p-3 text-right font-mono font-extrabold text-white text-sm">
                      ₹{(row.totalAmount || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Delete Row */}
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        disabled={lineItems.length === 1}
                        className="p-1.5 text-slate-500 hover:text-red-400 disabled:opacity-30 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. BOTTOM SECTION: SUMMARY TOTALS & ROUND-OFF (Reference Inspired) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Notes & Terms Snapshot */}
          <div className="bg-slate-800/80 rounded-3xl border border-slate-700 p-6 space-y-4 shadow-xl text-xs">
            <div>
              <label className="font-extrabold text-slate-300 block mb-1">Invoice Notes / Remarks</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes, warranty remarks..."
                className="w-full p-3 bg-slate-900 border border-slate-600 rounded-2xl text-white"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-extrabold text-slate-300">Terms & Conditions Template</label>
                <select
                  value={selectedTermsTemplateId}
                  onChange={(e) => {
                    setSelectedTermsTemplateId(e.target.value);
                    const t = termsTemplates.find((item) => item.id === e.target.value);
                    if (t && t.terms) setTermsLines(t.terms);
                  }}
                  className="p-1.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-xs font-semibold"
                >
                  <option value="">-- Custom Terms --</option>
                  {termsTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {termsLines.length > 0 && (
                <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-700/60 text-slate-300 font-mono text-[11px] space-y-1">
                  {termsLines.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Summary Totals Box */}
          <div className="bg-slate-800/80 rounded-3xl border border-slate-700 p-6 space-y-3 shadow-xl text-xs font-mono">
            <div className="flex justify-between text-slate-300">
              <span>Subtotal (Taxable Value):</span>
              <span className="font-bold text-white">₹{subtotalTaxable.toLocaleString('en-IN')}</span>
            </div>

            {isInterState ? (
              <div className="flex justify-between text-amber-300">
                <span>IGST Tax Amount:</span>
                <span className="font-bold">₹{totalIgst.toLocaleString('en-IN')}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-emerald-400">
                  <span>CGST Tax Amount:</span>
                  <span className="font-bold">₹{totalCgst.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>SGST Tax Amount:</span>
                  <span className="font-bold">₹{totalSgst.toLocaleString('en-IN')}</span>
                </div>
              </>
            )}

            {/* Round Off Control (Requirement #10) */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-700/80">
              <label className="flex items-center gap-2 cursor-pointer font-sans text-slate-300 font-bold">
                <input
                  type="checkbox"
                  checked={roundOffEnabled}
                  onChange={(e) => setRoundOffEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
                <span>Enable Auto Round-Off</span>
              </label>
              <span className="text-slate-400">{roundOffAmount >= 0 ? `+₹${roundOffAmount}` : `-₹${Math.abs(roundOffAmount)}`}</span>
            </div>

            {/* Final Grand Total */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-700 font-sans text-lg font-black text-white bg-slate-900 p-4 rounded-2xl">
              <span>GRAND TOTAL:</span>
              <span className="text-emerald-400 font-mono text-xl">₹{finalGrandTotal.toLocaleString('en-IN')}</span>
            </div>

            {/* Payment & Balance Due */}
            {!isChallan && (
              <div className="grid grid-cols-2 gap-4 pt-2 font-sans">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-400 mb-1">Amount Received (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-600 rounded-xl font-mono font-bold text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-400 mb-1">Balance Remaining (₹)</label>
                  <div className="p-2.5 bg-slate-900 border border-slate-600 rounded-xl font-mono font-bold text-amber-400 text-sm">
                    ₹{balanceDueCalculated.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      {showQuickAddParty && (
        <QuickAddPartyModal
          type={partyTypeFilter}
          onSuccess={(newP: any) => {
            setParties([...parties, newP]);
            handlePartySelect(newP.id);
            setShowQuickAddParty(false);
          }}
          onClose={() => setShowQuickAddParty(false)}
        />
      )}

    </div>
  );
};
