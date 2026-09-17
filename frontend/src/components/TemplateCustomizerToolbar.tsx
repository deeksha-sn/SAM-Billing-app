import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { BillFieldsConfig, BillTemplate, getDefaultFieldsForDocType } from '../types/billTemplate';
import { Sliders, Save, Check, Plus, RefreshCw, Star } from 'lucide-react';

interface TemplateCustomizerToolbarProps {
  documentType: 'INVOICE' | 'QUOTATION' | 'DELIVERY_CHALLAN' | 'PURCHASE';
  activeConfig: BillFieldsConfig;
  onChangeConfig: (newConfig: BillFieldsConfig) => void;
  activeTemplateId: string | null;
  onSelectTemplate: (template: BillTemplate) => void;
  className?: string;
}

export const TemplateCustomizerToolbar: React.FC<TemplateCustomizerToolbarProps> = ({
  documentType,
  activeConfig,
  onChangeConfig,
  activeTemplateId,
  onSelectTemplate,
  className = '',
}) => {
  const [templates, setTemplates] = useState<BillTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const fetchTemplates = () => {
    setLoading(true);
    apiRequest(`/templates?documentType=${documentType}`)
      .then((res) => {
        const list = res.templates || [];
        setTemplates(list);
        if (!activeTemplateId && list.length > 0) {
          const def = list.find((t: any) => t.isDefault) || list[0];
          parseAndApplyTemplate(def);
        }
      })
      .catch((err) => console.error('Failed to load templates:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, [documentType]);

  const parseAndApplyTemplate = (template: BillTemplate) => {
    let cfg: BillFieldsConfig;
    if (typeof template.fieldsConfig === 'string') {
      try {
        cfg = JSON.parse(template.fieldsConfig);
      } catch {
        cfg = getDefaultFieldsForDocType(documentType);
      }
    } else {
      cfg = template.fieldsConfig || getDefaultFieldsForDocType(documentType);
    }
    onChangeConfig(cfg);
    onSelectTemplate(template);
  };

  const handleToggleField = (key: keyof BillFieldsConfig) => {
    onChangeConfig({
      ...activeConfig,
      [key]: !activeConfig[key],
    });
  };

  const handleSaveAsNewTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    setSaving(true);
    apiRequest('/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: newTemplateName.trim(),
        documentType: documentType,
        fieldsConfig: activeConfig,
        isDefault: false,
      }),
    })
      .then((res) => {
        setShowSaveModal(false);
        setNewTemplateName('');
        setSaveSuccessMsg(`Template "${res.template.name}" saved!`);
        setTimeout(() => setSaveSuccessMsg(''), 3000);
        fetchTemplates();
        onSelectTemplate(res.template);
      })
      .catch((err) => alert(err.error || 'Failed to save template'))
      .finally(() => setSaving(false));
  };

  const handleUpdateCurrentTemplate = () => {
    if (!activeTemplateId) {
      setShowSaveModal(true);
      return;
    }
    const current = templates.find((t) => t.id === activeTemplateId);
    if (!current) return;

    setSaving(true);
    apiRequest(`/templates/${activeTemplateId}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: current.name,
        fieldsConfig: activeConfig,
      }),
    })
      .then((res) => {
        setSaveSuccessMsg(`Template "${res.template.name}" updated!`);
        setTimeout(() => setSaveSuccessMsg(''), 3000);
        fetchTemplates();
      })
      .catch((err) => alert(err.error || 'Failed to update template'))
      .finally(() => setSaving(false));
  };

  const handleSetDefault = () => {
    if (!activeTemplateId) return;
    apiRequest(`/templates/${activeTemplateId}/set-default`, { method: 'POST' })
      .then(() => {
        setSaveSuccessMsg('Default template updated!');
        setTimeout(() => setSaveSuccessMsg(''), 3000);
        fetchTemplates();
      })
      .catch((err) => alert(err.error || 'Failed to set default template'));
  };

  const handleResetToDefaults = () => {
    onChangeConfig(getDefaultFieldsForDocType(documentType));
  };

  // Section fields metadata
  const fieldSections = [
    {
      title: '1. Header & Business Details',
      fields: [
        { key: 'showLogo', label: 'Company Logo' },
        { key: 'showCompanyContact', label: 'Company Address & Contact' },
        { key: 'showBankDetails', label: 'Bank Account & UPI Details' },
        { key: 'showSignature', label: 'Authorised Signature' },
      ],
    },
    {
      title: '2. Document Info & Logistics',
      fields: [
        { key: 'showDocNumber', label: 'Document Number' },
        { key: 'showDate', label: 'Document Date' },
        { key: 'showPoNumber', label: 'PO Number' },
        { key: 'showPoDate', label: 'PO Date' },
        { key: 'showEwayBill', label: 'E-way Bill Number' },
        { key: 'showTransport', label: 'Transporter Name' },
        { key: 'showDeliveryLocation', label: 'Delivery Location' },
        { key: 'showVehicleNumber', label: 'Vehicle Number' },
      ],
    },
    {
      title: '3. Customer & Address Details',
      fields: [
        { key: 'showCustomerName', label: 'Customer Name' },
        { key: 'showBillingAddress', label: 'Billing Address' },
        { key: 'showShippingAddress', label: 'Shipping Address' },
        { key: 'showGstin', label: 'Customer GSTIN' },
        { key: 'showPlaceOfSupply', label: 'Place of Supply' },
      ],
    },
    {
      title: '4. Items Table Columns',
      fields: [
        { key: 'showItemName', label: 'Item Name' },
        { key: 'showDescription', label: 'Description & Specs' },
        { key: 'showSerialNumber', label: 'Machine Serial Number' },
        { key: 'showHsn', label: 'HSN / SAC Code' },
        { key: 'showQuantity', label: 'Quantity' },
        { key: 'showFreeQuantity', label: 'Free Quantity' },
        { key: 'showUnit', label: 'Unit of Measure' },
        { key: 'showRate', label: 'Price / Unit' },
        { key: 'showDiscount', label: 'Discount Amount/ %' },
        { key: 'showGstRate', label: 'GST %' },
        { key: 'showTaxAmount', label: 'Tax Amount' },
        { key: 'showTotalAmount', label: 'Line Total Amount' },
      ],
    },
    {
      title: '5. Totals, Payment & Footer',
      fields: [
        { key: 'showCgst', label: 'CGST Amount' },
        { key: 'showSgst', label: 'SGST Amount' },
        { key: 'showIgst', label: 'IGST Amount' },
        { key: 'showAmountInWords', label: 'Amount in Words' },
        { key: 'showPaymentMode', label: 'Payment Mode' },
        { key: 'showPaymentTerms', label: 'Payment Terms' },
        { key: 'showDueDate', label: 'Payment Due Date' },
        {key: 'showNotes', label: 'Notes & Remarks' },
        { key: 'showTerms', label: 'Terms & Conditions' },
        { key: 'showAuthSignature', label: 'Authorised Signature' },
        { key: 'showCustomerSignature', label: 'Customer Signature' },
      ],
    },
  ];

  const activeTemplate = templates.find((t) => t.id === activeTemplateId);

  return (
    <div className={`bg-slate-900 text-white rounded-xl p-3 shadow-md space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Template Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Bill Template:</span>
          <select
            value={activeTemplateId || ''}
            onChange={(e) => {
              const selected = templates.find((t) => t.id === e.target.value);
              if (selected) parseAndApplyTemplate(selected);
            }}
            className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.isDefault ? '(Default)' : ''}
              </option>
            ))}
          </select>

          {activeTemplate && !activeTemplate.isDefault && (
            <button
              onClick={handleSetDefault}
              title="Set as default template for this document type"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-bold transition flex items-center gap-1"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span className="hidden sm:inline">Set Default</span>
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowDrawer(!showDrawer)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
              showDrawer
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>Customize Bill Fields</span>
          </button>

          {activeTemplateId && (
            <button
              onClick={handleUpdateCurrentTemplate}
              disabled={saving}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          )}

          <button
            onClick={() => setShowSaveModal(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save as Template</span>
          </button>

          <button
            onClick={handleResetToDefaults}
            title="Reset field selections to standard defaults"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-950/80 border border-emerald-700 text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Field Customization Panel (Drawer) */}
      {showDrawer && (
        <div className="bg-slate-850 border border-slate-700 rounded-xl p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex justify-between items-center border-b border-slate-700 pb-2">
            <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider">
              Show / Hide Document Fields ({documentType})
            </h4>
            <span className="text-[11px] text-slate-400">Toggle checkboxes to immediately update preview</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fieldSections.map((sec, idx) => (
              <div key={idx} className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 space-y-2">
                <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-tight border-b border-slate-700 pb-1">
                  {sec.title}
                </h5>
                <div className="space-y-1.5">
                  {sec.fields.map((f) => {
                    const keyName = f.key as keyof BillFieldsConfig;
                    const isChecked = Boolean(activeConfig[keyName]);
                    return (
                      <label
                        key={f.key}
                        className="flex items-center gap-2 text-xs text-slate-200 hover:text-white cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleField(keyName)}
                          className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>{f.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Template Prompt Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white">Save Custom Bill Template</h3>
            <p className="text-xs text-slate-300">
              Enter a name for this custom template (e.g., <span className="font-semibold text-emerald-400">SAM Standard</span>, <span className="font-semibold text-emerald-400">Machinery Detailed</span>, <span className="font-semibold text-emerald-400">Akshayakalpa</span>).
            </p>

            <form onSubmit={handleSaveAsNewTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Template Name</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g. Detailed Machinery Invoice"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                  required
                />
              </div>

              <div className="flex justify-end items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !newTemplateName.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  {saving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
