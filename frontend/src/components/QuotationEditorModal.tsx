import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import { X, Plus, Trash2, Save, Layers, Building, HelpCircle, Check, FileText } from 'lucide-react';
import { SearchablePartyCombobox } from './SearchablePartyCombobox';
import { BillingItemSelect } from './BillingItemSelect';
import { isInterStateTransaction, normalizeStateCode } from '../utils/gstHelper';

interface QuotationEditorModalProps {
  quotation?: any;
  onClose: () => void;
  onSaved: (quotation: any) => void;
}

export const QuotationEditorModal: React.FC<QuotationEditorModalProps> = ({
  quotation,
  onClose,
  onSaved,
}) => {
  const { user } = useAuth();
  const isEditing = Boolean(quotation?.id);

  // Form Fields State
  const [quotationNumber, setQuotationNumber] = useState(quotation?.quotationNumber || '');
  const [quotationDate, setQuotationDate] = useState(
    quotation?.quotationDate
      ? new Date(quotation.quotationDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  
  const defaultValidUntil = () => {
    if (quotation?.validityDate) {
      return new Date(quotation.validityDate).toISOString().split('T')[0];
    }
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  };

  const [validityDate, setValidityDate] = useState(defaultValidUntil());
  const [partyId, setPartyId] = useState(quotation?.partyId || '');
  const [parties, setParties] = useState<any[]>([]);
  const [selectedParty, setSelectedParty] = useState<any>(quotation?.party || null);
  const [notes, setNotes] = useState(quotation?.notes || '');
  const [status, setStatus] = useState(quotation?.status || 'ACTIVE');

  // Items Master & Rows State
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  // Terms & Bill Templates
  const [termsTemplates, setTermsTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [billTemplates, setBillTemplates] = useState<any[]>([]);
  const [selectedBillTemplateId, setSelectedBillTemplateId] = useState<string>(quotation?.billTemplateId || '');
  const [termsList, setTermsList] = useState<string[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showSaveTemplateInput, setShowSaveTemplateInput] = useState(false);

  // Quick Customer Creation State
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [custName, setCustName] = useState('');
  const [custMobile, setCustMobile] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custVillage, setCustVillage] = useState('');
  const [custGstin, setCustGstin] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    try {
      const [pRes, iRes, tRes, bRes] = await Promise.all([
        apiRequest('/parties?type=CUSTOMER'),
        apiRequest('/items'),
        apiRequest('/terms/templates'),
        apiRequest('/templates?documentType=QUOTATION'),
      ]);

      setParties(pRes.parties || []);
      setAvailableItems(iRes.items || []);
      setTermsTemplates(tRes.templates || []);
      setBillTemplates(bRes.templates || []);

      if (!selectedBillTemplateId && bRes.templates && bRes.templates.length > 0) {
        const def = bRes.templates.find((t: any) => t.isDefault) || bRes.templates[0];
        if (def) setSelectedBillTemplateId(def.id);
      }

      // If creating new quotation, auto-populate numbering preview if needed
      if (!isEditing) {
        try {
          const cfgRes = await apiRequest('/settings/numbering');
          const qCfg = (cfgRes.configs || []).find((c: any) => c.documentType === 'QUOTATION');
          if (qCfg) {
            const nextNumPadded = String(qCfg.nextNumber || 1).padStart(qCfg.paddingDigits || 4, '0');
            const pattern = qCfg.pattern || 'QUO-{FY}-{NUMBER}';
            const fyShort = cfgRes.financialYear?.fy || '26-27';
            const num = pattern.replace(/\{FY\}/g, fyShort).replace(/\{NUMBER\}/g, nextNumPadded);
            setQuotationNumber(num);
          }
        } catch {
          // ignore
        }
      }

      // Pre-fill items if editing
      if (quotation && quotation.items && quotation.items.length > 0) {
        setItems(
          quotation.items.map((it: any) => ({
            itemId: it.itemId,
            itemName: it.itemName,
            hsnSac: it.hsnSac || '8436',
            unit: it.unit || 'Nos',
            quantity: it.quantity || 1,
            rate: it.rate || 0,
            discountPercent: it.discountPercent || 0,
            gstRate: it.gstRate || 18,
          }))
        );
      } else {
        // Default 1 blank row
        setItems([{ itemId: '', itemName: '', hsnSac: '8436', unit: 'Nos', quantity: 1, rate: 0, discountPercent: 0, gstRate: 18 }]);
      }

      // Pre-fill terms if editing
      if (quotation?.termsSnapshot) {
        try {
          if (typeof quotation.termsSnapshot === 'string' && quotation.termsSnapshot.startsWith('[')) {
            setTermsList(JSON.parse(quotation.termsSnapshot));
          } else if (Array.isArray(quotation.termsSnapshot)) {
            setTermsList(quotation.termsSnapshot);
          } else {
            setTermsList([String(quotation.termsSnapshot)]);
          }
        } catch {
          setTermsList([String(quotation.termsSnapshot)]);
        }
      } else {
        // Use default template if available
        const defaultTpl = (tRes.templates || []).find((t: any) => t.isDefault);
        if (defaultTpl) {
          setSelectedTemplateId(defaultTpl.id);
          setTermsList(defaultTpl.items.map((i: any) => i.text));
        } else {
          setTermsList([
            '1. Quotation valid for 30 days from the date of issue.',
            '2. Prices are inclusive of GST as indicated.',
            '3. Payment terms as agreed upon order confirmation.',
            '4. Delivery schedule to be finalized upon order confirmation.',
            'Subject to Bangalore Jurisdiction only.',
          ]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePartyChange = (id: string) => {
    setPartyId(id);
    const p = parties.find((party) => party.id === id);
    setSelectedParty(p || null);
  };

  const handleQuickCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custMobile) {
      alert('Customer Name and Mobile are required');
      return;
    }

    try {
      const res = await apiRequest('/parties', {
        method: 'POST',
        body: JSON.stringify({
          name: custName.trim(),
          mobile: custMobile.trim(),
          address: custAddress.trim(),
          village: custVillage.trim(),
          gstin: custGstin.trim() || undefined,
          type: 'CUSTOMER',
        }),
      });

      const newCust = res.party;
      setParties((prev) => [newCust, ...prev]);
      setPartyId(newCust.id);
      setSelectedParty(newCust);
      setShowQuickCustomerModal(false);
      setCustName('');
      setCustMobile('');
      setCustAddress('');
      setCustVillage('');
      setCustGstin('');
    } catch (err: any) {
      alert(`Error creating customer: ${err.message}`);
    }
  };

  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      { itemId: '', itemName: '', hsnSac: '8436', unit: 'Nos', quantity: 1, rate: 0, discountPercent: 0, gstRate: 18 },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (items.length === 1) {
      alert('At least one item is required in the quotation');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemSelect = (idx: number, itemId: string) => {
    const master = availableItems.find((i) => i.id === itemId);
    setItems((prev) => {
      const updated = [...prev];
      if (master) {
        updated[idx] = {
          ...updated[idx],
          itemId: master.id,
          itemName: master.name,
          hsnSac: master.hsnSac || '8436',
          unit: master.unit || 'Nos',
          rate: master.sellingPrice || 0,
          gstRate: master.gstRate || 18,
        };
      } else {
        updated[idx] = { ...updated[idx], itemId: '' };
      }
      return updated;
    });
  };

  const handleItemRowChange = (idx: number, field: string, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  // Terms & Conditions Master Actions
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tpl = termsTemplates.find((t) => t.id === templateId);
    if (tpl) {
      setTermsList(tpl.items.map((i: any) => i.text));
    }
  };

  const handleTermLineChange = (idx: number, val: string) => {
    setTermsList((prev) => {
      const updated = [...prev];
      updated[idx] = val;
      return updated;
    });
  };

  const handleAddTermLine = () => {
    setTermsList((prev) => [...prev, `${prev.length + 1}. `]);
  };

  const handleRemoveTermLine = (idx: number) => {
    setTermsList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveTermsAsTemplate = async () => {
    if (!newTemplateName || !newTemplateName.trim()) {
      alert('Please enter a name for the new template');
      return;
    }

    try {
      const res = await apiRequest('/terms/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: newTemplateName.trim(),
          isDefault: false,
          items: termsList.filter((t) => t.trim().length > 0),
        }),
      });

      setTermsTemplates((prev) => [...prev, res.template]);
      setSelectedTemplateId(res.template.id);
      setShowSaveTemplateInput(false);
      setNewTemplateName('');
      alert(`Terms template "${res.template.name}" saved successfully!`);
    } catch (err: any) {
      alert(`Error saving template: ${err.message}`);
    }
  };

  // Calculate live grand total
  const isInterState = isInterStateTransaction(
    selectedParty?.stateCode || selectedParty?.state || '29',
    selectedParty?.state,
    '29'
  );

  let grandTotalCalculated = 0;
  items.forEach((line) => {
    const qty = Number(line.quantity) || 1;
    const rate = Number(line.rate) || 0;
    const disc = Number(line.discountPercent) || 0;
    const gst = Number(line.gstRate) || 18;

    const netTaxable = qty * rate * (1 - disc / 100);
    const gstAmt = (netTaxable * gst) / 100;
    grandTotalCalculated += netTaxable + gstAmt;
  });

  const handleSubmit = async (e: React.FormEvent, targetStatus: string = 'ACTIVE') => {
    e.preventDefault();
    setErrorMessage('');

    if (!partyId) {
      setErrorMessage('Please select or create a customer');
      return;
    }

    if (items.some((i) => !i.itemId || Number(i.quantity) <= 0)) {
      setErrorMessage('Please complete item details and ensure valid quantities for all row items');
      return;
    }

    setSaving(true);
    try {
      const selBillTpl = billTemplates.find((t) => t.id === selectedBillTemplateId);
      const payload = {
        quotationNumber: quotationNumber.trim() || undefined,
        partyId,
        quotationDate,
        validityDate,
        items,
        notes,
        termsTemplateId: selectedTemplateId || undefined,
        termsSnapshot: termsList.filter((t) => t.trim().length > 0),
        billTemplateId: selectedBillTemplateId || undefined,
        fieldsConfigSnapshot: selBillTpl ? selBillTpl.fieldsConfig : undefined,
        status: targetStatus,
      };

      const url = isEditing ? `/quotations/${quotation.id}` : '/quotations';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await apiRequest(url, {
        method,
        body: JSON.stringify(payload),
      });

      onSaved(res.quotation);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving quotation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col my-4 max-h-[92vh] border border-gray-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold">
                {isEditing ? `Edit Quotation: ${quotation.quotationNumber}` : 'Create New Quotation'}
              </h2>
              <p className="text-xs text-slate-300">Price estimate for customer (Does not affect stock or accounting)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={(e) => handleSubmit(e, status)} className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
          
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
              {errorMessage}
            </div>
          )}

          {/* Top Section: Quotation No, Dates & Customer Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            
            {/* Quotation No */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Quotation No. {user?.role === 'ADMIN' && <span className="text-amber-600 text-[10px] font-normal">(Editable as Admin)</span>}
              </label>
              <input
                type="text"
                value={quotationNumber}
                onChange={(e) => setQuotationNumber(e.target.value)}
                disabled={user?.role !== 'ADMIN' && isEditing}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                placeholder="QUO-26-27-0001"
              />
            </div>

            {/* Quotation Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Quotation Date</label>
              <input
                type="date"
                value={quotationDate}
                onChange={(e) => setQuotationDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            {/* Valid Until */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Valid Until Date</label>
              <input
                type="date"
                value={validityDate}
                onChange={(e) => setValidityDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            {/* Customer Searchable Combobox */}
            <div>
              <SearchablePartyCombobox
                label="Customer Name"
                required={true}
                partyType="CUSTOMER"
                selectedPartyId={partyId}
                parties={parties}
                onSelectParty={(p) => {
                  if (p) {
                    handlePartyChange(p.id);
                  } else {
                    setPartyId('');
                  }
                }}
                onPartyCreated={(newP) => {
                  setParties([...parties, newP]);
                  handlePartyChange(newP.id);
                }}
              />
            </div>

            {/* Reference / PO Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reference / PO No. (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Ref #1234 or Farm Enquiry"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

          </div>

          {/* Selected Customer Info Badge */}
          {selectedParty && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-2 text-xs">
              <div>
                <span className="font-bold text-emerald-950 text-sm block">{selectedParty.name}</span>
                <span className="text-emerald-800">{selectedParty.address || selectedParty.village} | Mobile: {selectedParty.mobile}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-emerald-900 block">State: {selectedParty.stateCode || '29'}-{selectedParty.state || 'Karnataka'}</span>
                <span className="text-[11px] font-semibold text-emerald-700">{isInterState ? 'Inter-State (IGST 18%)' : 'Intra-State (CGST 9% + SGST 9%)'}</span>
              </div>
            </div>
          )}

          {/* Items & Pricing Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Quotation Items & Pricing</h3>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Item Row</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 font-bold text-slate-700">
                  <tr>
                    <th className="p-2 w-8 text-center">#</th>
                    <th className="p-2 min-w-[200px]">Item Name</th>
                    <th className="p-2 w-24 text-center">HSN/SAC</th>
                    <th className="p-2 w-20 text-center">Qty</th>
                    <th className="p-2 w-28 text-right">Price / Unit</th>
                    <th className="p-2 w-24 text-center">GST %</th>
                    <th className="p-2 w-24 text-center">Discount %</th>
                    <th className="p-2 w-28 text-right">Amount</th>
                    <th className="p-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((row, idx) => {
                    const qty = Number(row.quantity) || 1;
                    const rate = Number(row.rate) || 0;
                    const disc = Number(row.discountPercent) || 0;
                    const gst = Number(row.gstRate) || 18;

                    const netTaxable = qty * rate * (1 - disc / 100);
                    const lineTotal = netTaxable * (1 + gst / 100);

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 text-center font-bold text-slate-400">{idx + 1}</td>
                        
                        {/* Item Select */}
                        <td className="p-2">
                          <BillingItemSelect
                            value={row.itemId}
                            onChange={(itemId) => handleItemSelect(idx, itemId)}
                            items={availableItems}
                            documentType="QUOTATION"
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none"
                          />
                        </td>

                        {/* HSN/SAC */}
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.hsnSac}
                            onChange={(e) => handleItemRowChange(idx, 'hsnSac', e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-center font-mono text-slate-800"
                          />
                        </td>

                        {/* Quantity */}
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={row.quantity}
                            onChange={(e) => handleItemRowChange(idx, 'quantity', Number(e.target.value))}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-center font-bold text-slate-900"
                          />
                        </td>

                        {/* Price Rate */}
                        <td className="p-2">
                          <input
                            type="number"
                            step="any"
                            value={row.rate}
                            onChange={(e) => handleItemRowChange(idx, 'rate', Number(e.target.value))}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-right font-mono font-bold text-slate-900"
                          />
                        </td>

                        {/* GST % */}
                        <td className="p-2">
                          <select
                            value={row.isExempt ? 'EXEMPT' : row.gstRate}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'EXEMPT') {
                                handleItemRowChange(idx, 'gstRate', 0);
                                handleItemRowChange(idx, 'isExempt', true);
                              } else {
                                handleItemRowChange(idx, 'gstRate', Number(val) || 0);
                                handleItemRowChange(idx, 'isExempt', false);
                              }
                            }}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-center font-bold font-mono"
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

                        {/* Discount % */}
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={row.discountPercent}
                            onChange={(e) => handleItemRowChange(idx, 'discountPercent', Number(e.target.value))}
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-center font-mono"
                          />
                        </td>

                        {/* Line Total */}
                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          ₹{Math.round(lineTotal).toLocaleString('en-IN')}
                        </td>

                        {/* Remove Row */}
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-slate-400 hover:text-red-600 p-1"
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

            {/* Total Display */}
            <div className="flex justify-between items-center pt-3 border-t">
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Item</span>
              </button>

              <div className="text-right">
                <span className="text-xs font-bold text-slate-500 uppercase mr-2">Total Estimated Amount:</span>
                <span className="text-xl font-black font-mono text-emerald-800">
                  ₹{Math.round(grandTotalCalculated).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

          </div>

          {/* Terms & Conditions Master System Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-2">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Quotation Terms & Conditions</h3>
              
              <div className="flex items-center gap-2">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="px-3 py-1 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="">-- Load Master Terms Template --</option>
                  {termsTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowSaveTemplateInput(!showSaveTemplateInput)}
                  className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-xl text-xs font-bold transition"
                >
                  Save as Template
                </button>
              </div>
            </div>

            {/* Save as Template Input */}
            {showSaveTemplateInput && (
              <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Template Name (e.g. Standard Quotation Terms)"
                  className="flex-1 px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-semibold"
                />
                <button
                  type="button"
                  onClick={handleSaveTermsAsTemplate}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow"
                >
                  Save
                </button>
              </div>
            )}

            {/* Terms List Line By Line Editor */}
            <div className="space-y-2">
              {termsList.map((termText, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={termText}
                    onChange={(e) => handleTermLineChange(idx, e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveTermLine(idx)}
                    className="text-slate-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddTermLine}
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1 mt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Term Line</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'DRAFT')}
              disabled={saving}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow transition"
            >
              Save Draft
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Quotation'}</span>
            </button>
          </div>

        </form>

      </div>

      {/* Quick Add Customer Modal */}
      {showQuickCustomerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">+ Quick Add Customer</h3>
              <button onClick={() => setShowQuickCustomerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleQuickCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number *</label>
                <input
                  type="text"
                  required
                  value={custMobile}
                  onChange={(e) => setCustMobile(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Village / Address</label>
                <input
                  type="text"
                  value={custVillage}
                  onChange={(e) => setCustVillage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={custGstin}
                  onChange={(e) => setCustGstin(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickCustomerModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow hover:bg-emerald-700"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
