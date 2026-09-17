import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { BillFieldsConfig, BillTemplate, DEFAULT_INVOICE_FIELDS, getDefaultFieldsForDocType } from '../types/billTemplate';
import { FileText, Plus, Edit2, Copy, Star, Trash2, Check, Eye, X, Sparkles, AlertCircle } from 'lucide-react';

export const BillTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<BillTemplate[]>([]);
  const [filterDocType, setFilterDocType] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [saveMsg, setSaveMsg] = useState('');

  // Modal State
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [docType, setDocType] = useState<'INVOICE' | 'QUOTATION' | 'DELIVERY_CHALLAN' | 'PURCHASE'>('INVOICE');
  const [isDefault, setIsDefault] = useState(false);
  const [config, setConfig] = useState<BillFieldsConfig>({ ...DEFAULT_INVOICE_FIELDS });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/templates');
      setTemplates(res.templates || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setTemplateName('');
    setDocType('INVOICE');
    setIsDefault(false);
    setConfig(getDefaultFieldsForDocType('INVOICE'));
    setShowEditorModal(true);
  };

  const handleOpenEdit = (tpl: BillTemplate) => {
    setEditingId(tpl.id);
    setTemplateName(tpl.name);
    setDocType(tpl.documentType as any);
    setIsDefault(tpl.isDefault);

    let parsedConfig: BillFieldsConfig;
    if (typeof tpl.fieldsConfig === 'string') {
      try {
        parsedConfig = JSON.parse(tpl.fieldsConfig);
      } catch {
        parsedConfig = getDefaultFieldsForDocType(tpl.documentType);
      }
    } else {
      parsedConfig = tpl.fieldsConfig || getDefaultFieldsForDocType(tpl.documentType);
    }
    setConfig({ ...getDefaultFieldsForDocType(tpl.documentType), ...parsedConfig });
    setShowEditorModal(true);
  };

  const handleDuplicate = async (tpl: BillTemplate) => {
    try {
      let parsedConfig: BillFieldsConfig;
      if (typeof tpl.fieldsConfig === 'string') {
        try { parsedConfig = JSON.parse(tpl.fieldsConfig); } catch { parsedConfig = getDefaultFieldsForDocType(tpl.documentType); }
      } else {
        parsedConfig = tpl.fieldsConfig || getDefaultFieldsForDocType(tpl.documentType);
      }

      const res = await apiRequest('/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: `${tpl.name} (Copy)`,
          documentType: tpl.documentType,
          fieldsConfig: parsedConfig,
          isDefault: false,
        }),
      });

      setSaveMsg(`Template duplicated as "${res.template.name}"`);
      setTimeout(() => setSaveMsg(''), 3000);
      loadTemplates();
    } catch (err: any) {
      alert(err.error || 'Failed to duplicate template');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await apiRequest(`/templates/${id}/set-default`, { method: 'POST' });
      setSaveMsg('Default template updated successfully!');
      setTimeout(() => setSaveMsg(''), 3000);
      loadTemplates();
    } catch (err: any) {
      alert(err.error || 'Failed to set default');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await apiRequest(`/templates/${id}`, { method: 'DELETE' });
      setSaveMsg('Template deleted');
      setTimeout(() => setSaveMsg(''), 3000);
      loadTemplates();
    } catch (err: any) {
      alert(err.error || 'Failed to delete template');
    }
  };

  const handleDocTypeChange = (newType: 'INVOICE' | 'QUOTATION' | 'DELIVERY_CHALLAN' | 'PURCHASE') => {
    setDocType(newType);
    if (!editingId) {
      setConfig(getDefaultFieldsForDocType(newType));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      alert('Template Name is required');
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await apiRequest(`/templates/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: templateName.trim(),
            fieldsConfig: config,
            isDefault: isDefault,
          }),
        });
        setSaveMsg('Template updated successfully!');
      } else {
        await apiRequest('/templates', {
          method: 'POST',
          body: JSON.stringify({
            name: templateName.trim(),
            documentType: docType,
            fieldsConfig: config,
            isDefault: isDefault,
          }),
        });
        setSaveMsg('Template created successfully!');
      }

      setShowEditorModal(false);
      setTimeout(() => setSaveMsg(''), 3000);
      loadTemplates();
    } catch (err: any) {
      alert(err.error || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const toggleField = (key: keyof BillFieldsConfig) => {
    setConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const setSectionAll = (fields: (keyof BillFieldsConfig)[], val: boolean) => {
    setConfig((prev) => {
      const next = { ...prev };
      fields.forEach((f) => {
        next[f] = val;
      });
      return next;
    });
  };

  const filteredTemplates = templates.filter((t) => {
    if (filterDocType === 'ALL') return true;
    return t.documentType === filterDocType;
  });

  // Categorized Section metadata for Editor
  const sectionGroups: { title: string; fields: { key: keyof BillFieldsConfig; label: string }[] }[] = [
    {
      title: '1. Header & Company Profile',
      fields: [
        { key: 'showLogo', label: 'Company Logo' },
        { key: 'showCompanyName', label: 'Company Name' },
        { key: 'showCompanyAddress', label: 'Company Address' },
        { key: 'showCompanyPhone', label: 'Company Phone' },
        { key: 'showCompanyEmail', label: 'Company Email' },
        { key: 'showCompanyWebsite', label: 'Company Website' },
        { key: 'showCompanyGstin', label: 'Company GSTIN' },
      ],
    },
    {
      title: '2. Document Details',
      fields: [
        { key: 'showDocNumber', label: 'Document Number (Invoice No)' },
        { key: 'showDocDate', label: 'Document Date' },
        { key: 'showDueDate', label: 'Due Date' },
        { key: 'showPaymentTerms', label: 'Payment Terms' },
        { key: 'showPaymentMode', label: 'Payment Mode' },
        { key: 'showRefNumber', label: 'Reference Number' },
        { key: 'showPoNumber', label: 'PO Number' },
        { key: 'showPoDate', label: 'PO Date' },
        { key: 'showEwayBill', label: 'E-Way Bill Number' },
      ],
    },
    {
      title: '3. Customer / Party Details',
      fields: [
        { key: 'showCustomerName', label: 'Customer Name' },
        { key: 'showCustomerPhone', label: 'Customer Phone' },
        { key: 'showCustomerGstin', label: 'Customer GSTIN' },
        { key: 'showBillingAddress', label: 'Billing Address' },
        { key: 'showShippingAddress', label: 'Shipping Address' },
        { key: 'showCustomerState', label: 'State & State Code' },
        { key: 'showPlaceOfSupply', label: 'Place of Supply' },
      ],
    },
    {
      title: '4. Farmer / Contact Info',
      fields: [
        { key: 'showFarmerName', label: 'Farmer Name' },
        { key: 'showFarmerPhone', label: 'Farmer Phone' },
        { key: 'showFarmerAddress', label: 'Farmer Address' },
        { key: 'showFarmerPincode', label: 'Farmer Pincode / Taluk' },
      ],
    },
    {
      title: '5. Line Items Table Columns',
      fields: [
        { key: 'showItemName', label: 'Item Name' },
        { key: 'showDescription', label: 'Item Description' },
        { key: 'showHsn', label: 'HSN / SAC Code' },
        { key: 'showSerialNumber', label: 'Machine Serial No / Chasis' },
        { key: 'showQuantity', label: 'Quantity' },
        { key: 'showFreeQuantity', label: 'Free Quantity (Bonus)' },
        { key: 'showUnit', label: 'Unit (Nos, Sets)' },
        { key: 'showRate', label: 'Unit Rate (Price)' },
        { key: 'showDiscount', label: 'Discount Amount / %' },
        { key: 'showGstRate', label: 'GST Rate %' },
        { key: 'showTaxableAmount', label: 'Taxable Amount' },
        { key: 'showCgst', label: 'CGST Column' },
        { key: 'showSgst', label: 'SGST Column' },
        { key: 'showIgst', label: 'IGST Column' },
        { key: 'showTaxAmount', label: 'Tax Amount' },
        { key: 'showTotalAmount', label: 'Line Total' },
      ],
    },
    {
      title: '6. Summary & Totals',
      fields: [
        { key: 'showSubtotal', label: 'Subtotal (Total Taxable)' },
        { key: 'showDiscountTotal', label: 'Total Discount' },
        { key: 'showCgstTotal', label: 'CGST Summary' },
        { key: 'showSgstTotal', label: 'SGST Summary' },
        { key: 'showIgstTotal', label: 'IGST Summary' },
        { key: 'showTotalTax', label: 'Total Tax Summary' },
        { key: 'showRoundOff', label: 'Round Off' },
        { key: 'showGrandTotal', label: 'Grand Total' },
        { key: 'showAmountInWords', label: 'Amount in Words' },
        { key: 'showBalanceDue', label: 'Balance Due' },
      ],
    },
    {
      title: '7. Logistics & Transport',
      fields: [
        { key: 'showTransportName', label: 'Transport / Courier Name' },
        { key: 'showVehicleNumber', label: 'Vehicle Number' },
        { key: 'showDeliveryLocation', label: 'Delivery Location / Address' },
        { key: 'showDeliveryDate', label: 'Delivery Date' },
        { key: 'showReasonForDelivery', label: 'Reason for Delivery' },
      ],
    },
    {
      title: '8. Payment & Bank Details',
      fields: [
        { key: 'showBankDetails', label: 'Bank Account Box' },
        { key: 'showBankName', label: 'Bank Name' },
        { key: 'showAccountName', label: 'Account Holder Name' },
        { key: 'showAccountNumber', label: 'Account Number' },
        { key: 'showIfsc', label: 'IFSC Code' },
        { key: 'showUpiId', label: 'UPI ID & QR Code' },
      ],
    },
    {
      title: '9. Terms, Notes & Signatures',
      fields: [
        { key: 'showNotes', label: 'Notes / Remarks' },
        { key: 'showTerms', label: 'Terms & Conditions' },
        { key: 'showCustomerSignature', label: 'Customer Signature Line' },
        { key: 'showAuthSignature', label: 'Authorised Signatory' },
        { key: 'showCompanySeal', label: 'Company Seal Box' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Action & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Bill & Document Templates
          </h2>
          <p className="text-xs text-gray-500">
            Configure ready-made templates and customize section field visibility for Invoices, Quotations, Delivery Challans, and Purchases.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 transition"
        >
          <Plus className="w-4 h-4" />
          Create New Template
        </button>
      </div>

      {saveMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-sm flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          {saveMsg}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex border-b border-gray-200 bg-white px-4 pt-2 rounded-t-lg">
        {[
          { id: 'ALL', label: 'All Templates' },
          { id: 'INVOICE', label: 'Tax Invoices' },
          { id: 'QUOTATION', label: 'Quotations' },
          { id: 'DELIVERY_CHALLAN', label: 'Delivery Challans' },
          { id: 'PURCHASE', label: 'Purchases' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterDocType(tab.id)}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
              filterDocType === tab.id
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Template Cards Grid */}
      {loading ? (
        <div className="py-12 text-center text-sm text-gray-500">Loading document templates...</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500 bg-white rounded-b-lg border border-gray-200">
          No templates found for this category. Click "+ Create New Template" to add one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className={`bg-white rounded-lg border transition shadow-sm hover:shadow ${
                tpl.isDefault ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-gray-200'
              }`}
            >
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-600 uppercase mb-1">
                      {tpl.documentType.replace('_', ' ')}
                    </span>
                    <h3 className="font-bold text-gray-800 text-base flex items-center gap-1.5">
                      {tpl.name}
                      {tpl.isDefault && (
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded flex items-center gap-1">
                          <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                          Default
                        </span>
                      )}
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-gray-500 line-clamp-2">
                  Customized field visibility and section layout configuration for {tpl.documentType.toLowerCase()}s.
                </p>

                {/* Actions */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(tpl)}
                      className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100 transition flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(tpl)}
                      className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Duplicate
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {!tpl.isDefault && (
                      <button
                        onClick={() => handleSetDefault(tpl.id)}
                        className="p-1 text-amber-600 hover:bg-amber-50 rounded title='Set as Default'"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    {!tpl.isDefault && (
                      <button
                        onClick={() => handleDelete(tpl.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded title='Delete Template'"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Editor Modal with Live A4 Preview */}
      {showEditorModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  {editingId ? 'Edit Bill Template' : 'Create Bill Template'}
                </h3>
                <p className="text-xs text-gray-500">
                  Toggle section fields on the left to customize what appears on the printed document.
                </p>
              </div>
              <button
                onClick={() => setShowEditorModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Split view (Left Checkboxes / Right Live Preview) */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
              {/* Left Column: Form & Checkboxes */}
              <div className="lg:col-span-7 p-6 overflow-y-auto space-y-6 border-r border-gray-200">
                <form id="templateForm" onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Template Name *</label>
                      <input
                        type="text"
                        required
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="e.g., Machinery Tax Invoice"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Document Type *</label>
                      <select
                        disabled={Boolean(editingId)}
                        value={docType}
                        onChange={(e: any) => handleDocTypeChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                      >
                        <option value="INVOICE">Tax Invoice</option>
                        <option value="QUOTATION">Quotation</option>
                        <option value="DELIVERY_CHALLAN">Delivery Challan</option>
                        <option value="PURCHASE">Purchase Invoice</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isDefaultCheck"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                    />
                    <label htmlFor="isDefaultCheck" className="text-xs font-medium text-gray-700">
                      Set as default template for {docType.replace('_', ' ')}
                    </label>
                  </div>
                </form>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <h4 className="text-sm font-bold text-gray-800">Field Visibility Controls (9 Sections)</h4>
                  </div>

                  {sectionGroups.map((group, idx) => (
                    <div key={idx} className="bg-gray-50 p-3.5 rounded-lg border border-gray-200 space-y-2">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                        <span className="text-xs font-bold text-gray-800">{group.title}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSectionAll(group.fields.map((f) => f.key), true)}
                            className="text-[11px] text-emerald-700 hover:underline font-medium"
                          >
                            Select All
                          </button>
                          <span className="text-gray-300 text-xs">|</span>
                          <button
                            type="button"
                            onClick={() => setSectionAll(group.fields.map((f) => f.key), false)}
                            className="text-[11px] text-red-600 hover:underline font-medium"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {group.fields.map((field) => (
                          <label key={field.key} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-gray-900">
                            <input
                              type="checkbox"
                              checked={Boolean(config[field.key])}
                              onChange={() => toggleField(field.key)}
                              className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                            />
                            {field.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Live A4 Visual Preview */}
              <div className="lg:col-span-5 bg-gray-100 p-6 overflow-y-auto flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                    <Eye className="w-4 h-4 text-emerald-600" />
                    Live A4 Document Preview
                  </span>
                  <span className="text-[11px] text-gray-400">Updates in real-time</span>
                </div>

                {/* Simulated A4 Mini Page */}
                <div className="w-full bg-white border border-gray-300 shadow-md p-4 text-[10px] text-gray-800 space-y-3 font-sans min-h-[500px]">
                  {/* Header Box */}
                  <div className="border border-gray-300 p-2 flex justify-between items-start">
                    <div className="space-y-1">
                      {config.showLogo !== false && (
                        <div className="font-extrabold text-emerald-800 text-xs tracking-wider">SMART AGRO MACHINERYS</div>
                      )}
                      {config.showCompanyName !== false && <div className="font-bold text-gray-900 text-xs">SMART AGRO MACHINERYS</div>}
                      {config.showCompanyAddress !== false && <div>NH-75, B.M Road, Near Bus Stand, Hassan, Karnataka - 573201</div>}
                      {config.showCompanyPhone !== false && <div>Phone: +91 94481 23456 / 08172-268001</div>}
                      {config.showCompanyGstin !== false && <div className="font-semibold">GSTIN: 29ABCDE1234F1Z5</div>}
                    </div>

                    <div className="text-right space-y-0.5">
                      <div className="font-bold text-sm text-gray-900 border-b border-gray-400 pb-0.5 mb-1">
                        {docType === 'INVOICE' ? 'TAX INVOICE' : docType === 'QUOTATION' ? 'QUOTATION' : docType === 'DELIVERY_CHALLAN' ? 'DELIVERY CHALLAN' : 'PURCHASE INVOICE'}
                      </div>
                      {config.showDocNumber !== false && <div><span className="font-semibold">No:</span> SAM-26-27-0001</div>}
                      {config.showDocDate !== false && <div><span className="font-semibold">Date:</span> 30/08/2026</div>}
                      {config.showDueDate !== false && <div><span className="font-semibold">Due Date:</span> 15/09/2026</div>}
                      {config.showPoNumber !== false && <div><span className="font-semibold">PO No:</span> PO-99882</div>}
                      {config.showEwayBill !== false && <div><span className="font-semibold">E-Way No:</span> 121004992811</div>}
                    </div>
                  </div>

                  {/* Customer / Party & Transport */}
                  <div className="grid grid-cols-2 gap-2 border border-gray-300 p-2">
                    <div className="space-y-0.5">
                      <div className="font-bold border-b border-gray-200 pb-0.5 text-gray-900">Billed To (Customer):</div>
                      {config.showCustomerName !== false && <div className="font-semibold">KUMAR SWAMY</div>}
                      {config.showFarmerName !== false && <div className="text-gray-600">Farmer: Swamy Gowda</div>}
                      {config.showBillingAddress !== false && <div>Main Road, Salagame Village, Hassan</div>}
                      {config.showCustomerPhone !== false && <div>Mob: +91 98765 43210</div>}
                      {config.showCustomerGstin !== false && <div>GSTIN: 29AAAAA0000A1Z5</div>}
                    </div>

                    <div className="space-y-0.5">
                      <div className="font-bold border-b border-gray-200 pb-0.5 text-gray-900">Logistics & Delivery:</div>
                      {config.showTransportName !== false && <div>Transport: VRL Logistics</div>}
                      {config.showVehicleNumber !== false && <div>Vehicle No: KA-13-M-4567</div>}
                      {config.showDeliveryLocation !== false && <div>Location: Hassan Warehouse</div>}
                      {config.showPlaceOfSupply !== false && <div>Place of Supply: 29-Karnataka</div>}
                    </div>
                  </div>

                  {/* Item Table */}
                  <div className="border border-gray-300 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-100 font-bold border-b border-gray-300">
                          <th className="p-1 border-r border-gray-300">Sl</th>
                          {config.showItemName !== false && <th className="p-1 border-r border-gray-300">Item Name</th>}
                          {config.showHsn !== false && <th className="p-1 border-r border-gray-300">HSN</th>}
                          {config.showSerialNumber !== false && <th className="p-1 border-r border-gray-300">Serial No</th>}
                          {config.showQuantity !== false && <th className="p-1 border-r border-gray-300 text-center">Qty</th>}
                          {config.showRate !== false && <th className="p-1 border-r border-gray-300 text-right">Rate</th>}
                          {config.showDiscount !== false && <th className="p-1 border-r border-gray-300 text-right">Disc</th>}
                          {config.showGstRate !== false && <th className="p-1 border-r border-gray-300 text-center">GST%</th>}
                          {config.showTaxableAmount !== false && <th className="p-1 border-r border-gray-300 text-right">Taxable</th>}
                          {config.showTotalAmount !== false && <th className="p-1 text-right">Total</th>}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-200">
                          <td className="p-1 border-r border-gray-200">1</td>
                          {config.showItemName !== false && (
                            <td className="p-1 border-r border-gray-200 font-medium">
                              Chaff Cutter 3HP Engine Heavy Duty
                              {config.showDescription !== false && <div className="text-[9px] text-gray-500">Includes 3HP single phase motor</div>}
                            </td>
                          )}
                          {config.showHsn !== false && <td className="p-1 border-r border-gray-200">8436</td>}
                          {config.showSerialNumber !== false && <td className="p-1 border-r border-gray-200 font-mono">SAM-CC-9011</td>}
                          {config.showQuantity !== false && <td className="p-1 border-r border-gray-200 text-center">1 Nos</td>}
                          {config.showRate !== false && <td className="p-1 border-r border-gray-200 text-right">25,000.00</td>}
                          {config.showDiscount !== false && <td className="p-1 border-r border-gray-200 text-right">1,000.00</td>}
                          {config.showGstRate !== false && <td className="p-1 border-r border-gray-200 text-center">12%</td>}
                          {config.showTaxableAmount !== false && <td className="p-1 border-r border-gray-200 text-right">24,000.00</td>}
                          {config.showTotalAmount !== false && <td className="p-1 text-right font-bold">26,880.00</td>}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Summary & Bank Box */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="border border-gray-300 p-2 space-y-1">
                      {config.showBankDetails !== false && (
                        <div>
                          <div className="font-bold border-b border-gray-200 pb-0.5 text-gray-900">Bank Details:</div>
                          {config.showBankName !== false && <div>Bank: State Bank of India</div>}
                          {config.showAccountNumber !== false && <div>A/C: 391200941029</div>}
                          {config.showIfsc !== false && <div>IFSC: SBIN0001234</div>}
                        </div>
                      )}
                      {config.showNotes !== false && (
                        <div className="pt-1 text-[9px] text-gray-600">
                          <span className="font-semibold">Notes:</span> Thank you for your business.
                        </div>
                      )}
                    </div>

                    <div className="border border-gray-300 p-2 space-y-0.5 text-right font-medium">
                      {config.showSubtotal !== false && <div className="flex justify-between"><span>Subtotal:</span><span>₹24,000.00</span></div>}
                      {config.showCgstTotal !== false && <div className="flex justify-between text-gray-600"><span>CGST (6%):</span><span>₹1,440.00</span></div>}
                      {config.showSgstTotal !== false && <div className="flex justify-between text-gray-600"><span>SGST (6%):</span><span>₹1,440.00</span></div>}
                      {config.showGrandTotal !== false && (
                        <div className="flex justify-between font-bold text-gray-900 border-t border-gray-300 pt-1 text-xs">
                          <span>Grand Total:</span>
                          <span>₹26,880.00</span>
                        </div>
                      )}
                      {config.showAmountInWords !== false && (
                        <div className="text-[9px] italic text-gray-600 pt-0.5">
                          Rupees Twenty-Six Thousand Eight Hundred Eighty Only
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Terms & Signatures */}
                  <div className="border border-gray-300 p-2 space-y-2">
                    {config.showTerms !== false && (
                      <div className="text-[9px] text-gray-600">
                        <div className="font-bold text-gray-900">Terms & Conditions:</div>
                        <div>1. Goods once sold will not be taken back.</div>
                        <div>2. Warranty as per manufacturer terms.</div>
                      </div>
                    )}

                    <div className="flex justify-between items-end pt-3 text-[9px]">
                      {config.showCustomerSignature !== false && <div className="border-t border-gray-400 pt-0.5 w-24 text-center">Customer Signature</div>}
                      {config.showAuthSignature !== false && <div className="border-t border-gray-400 pt-0.5 w-28 text-center font-bold">For Smart Agro Machinerys</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-200 flex justify-end gap-2 bg-gray-50">
              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="templateForm"
                disabled={saving}
                className="px-5 py-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
