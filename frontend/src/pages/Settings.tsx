import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { Settings as SettingsIcon, Building, Database, Trash2, Shield, Save, Download, Hash, FileText, CheckCircle2, MessageSquare } from 'lucide-react';
import { WhatsAppSettingsSection } from '../components/WhatsAppSettingsSection';
import { BillTemplateManager } from '../components/BillTemplateManager';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'terms' | 'numbering' | 'whatsapp' | 'templates'>('profile');
  const [company, setCompany] = useState<any>({});
  const [stockSetting, setStockSetting] = useState('YES');
  const [loading, setLoading] = useState(true);

  // Terms & Conditions Master State
  const [termsTemplates, setTermsTemplates] = useState<any[]>([]);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateName, setTemplateName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [termsList, setTermsList] = useState<string[]>(['']);

  // Document Numbering Settings State
  const [numberingConfigs, setNumberingConfigs] = useState<any[]>([]);
  const [selectedDocType, setSelectedDocType] = useState('INVOICE');
  const [docPattern, setDocPattern] = useState('SAM-{FY}-{NUMBER}');
  const [docPaddingDigits, setDocPaddingDigits] = useState(4);
  const [docNextNumber, setDocNextNumber] = useState(1);
  const [docPrefix, setDocPrefix] = useState('SAM');
  const [financialYearInfo, setFinancialYearInfo] = useState<any>({ fyFull: '2026-27', fy: '26-27' });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  useEffect(() => {
    loadSettings();
    loadTermsTemplates();
    loadNumberingConfigs();
  }, []);

  const loadSettings = async () => {
    try {
      const cRes = await apiRequest('/settings/company');
      setCompany(cRes.company);
      const sRes = await apiRequest('/settings/system');
      setStockSetting(sRes.settings?.delivery_challan_affects_stock || 'YES');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTermsTemplates = async () => {
    try {
      const res = await apiRequest('/terms/templates');
      setTermsTemplates(res.templates || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadNumberingConfigs = async () => {
    try {
      const res = await apiRequest('/settings/numbering');
      setNumberingConfigs(res.configs || []);
      if (res.financialYear) {
        setFinancialYearInfo(res.financialYear);
      }
      
      const invCfg = (res.configs || []).find((c: any) => c.documentType === 'INVOICE');
      if (invCfg) {
        setDocPattern(invCfg.pattern || 'SAM-{FY}-{NUMBER}');
        setDocPaddingDigits(invCfg.paddingDigits || 4);
        setDocNextNumber(invCfg.nextNumber || 1);
        setDocPrefix(invCfg.prefix || 'SAM');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDocTypeSelect = (docType: string) => {
    setSelectedDocType(docType);
    const cfg = numberingConfigs.find((c) => c.documentType === docType);
    if (cfg) {
      setDocPattern(cfg.pattern || `${cfg.prefix || 'SAM'}-{FY}-{NUMBER}`);
      setDocPaddingDigits(cfg.paddingDigits || 4);
      setDocNextNumber(cfg.nextNumber || 1);
      setDocPrefix(cfg.prefix || 'SAM');
    }
  };

  const handleSaveNumberingConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docPattern.includes('{NUMBER}')) {
      alert('Pattern must include the {NUMBER} placeholder');
      return;
    }

    try {
      const res = await apiRequest(`/settings/numbering/${selectedDocType}`, {
        method: 'PUT',
        body: JSON.stringify({
          pattern: docPattern,
          paddingDigits: Number(docPaddingDigits) || 4,
          nextNumber: Number(docNextNumber) || 1,
          prefix: docPrefix,
        }),
      });

      setSaveSuccessMsg(`Numbering pattern for ${selectedDocType} updated successfully!`);
      setTimeout(() => setSaveSuccessMsg(''), 3000);
      loadNumberingConfigs();
    } catch (err: any) {
      alert(`Error saving numbering settings: ${err.message}`);
    }
  };

  // Live preview generator
  const getLiveNumberPreview = () => {
    const d = new Date();
    const month = d.getMonth();
    const yr = d.getFullYear();
    const startYr = month >= 3 ? yr : yr - 1;
    const endYr = startYr + 1;

    const fyShort = `${String(startYr).slice(-2)}-${String(endYr).slice(-2)}`;
    const fyFull = `${startYr}-${String(endYr).slice(-2)}`;
    const numPadded = String(docNextNumber || 1).padStart(Number(docPaddingDigits) || 4, '0');

    let preview = docPattern || 'SAM-{FY}-{NUMBER}';
    preview = preview.replace(/\{FY\}/g, fyShort);
    preview = preview.replace(/\{FY_FULL\}/g, fyFull);
    preview = preview.replace(/\{YEAR\}/g, String(startYr));
    preview = preview.replace(/\{NUMBER\}/g, numPadded);

    return preview;
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo image size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setCompany((prev: any) => ({ ...prev, logoUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/settings/company', {
        method: 'PUT',
        body: JSON.stringify(company),
      });
      alert('Company profile updated successfully!');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleSaveStockSetting = async (val: string) => {
    try {
      await apiRequest('/settings/system', {
        method: 'PUT',
        body: JSON.stringify({
          key: 'delivery_challan_affects_stock',
          value: val,
          description: 'Whether final Delivery Challan deducts stock',
        }),
      });
      setStockSetting(val);
      alert('Stock deduction rule saved successfully!');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Terms modal handlers
  const handleOpenNewTermsModal = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setIsDefault(false);
    setTermsList(['']);
    setShowTermsModal(true);
  };

  const handleOpenEditTermsModal = (template: any) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setIsDefault(template.isDefault);
    setTermsList(template.items ? template.items.map((i: any) => i.text) : ['']);
    setShowTermsModal(true);
  };

  const handleSaveTermsTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      alert('Template title is required');
      return;
    }

    const cleanedTerms = termsList.filter((t) => t.trim().length > 0);
    if (cleanedTerms.length === 0) {
      alert('Add at least one terms line item');
      return;
    }

    try {
      if (editingTemplate) {
        await apiRequest(`/terms/templates/${editingTemplate.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: templateName,
            isDefault,
            terms: cleanedTerms,
          }),
        });
      } else {
        await apiRequest('/terms/templates', {
          method: 'POST',
          body: JSON.stringify({
            name: templateName,
            isDefault,
            terms: cleanedTerms,
          }),
        });
      }
      setShowTermsModal(false);
      loadTermsTemplates();
    } catch (err: any) {
      alert(`Error saving terms: ${err.message}`);
    }
  };

  const handleDeleteTerms = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete template "${name}"?`)) return;
    try {
      await apiRequest(`/terms/templates/${id}`, { method: 'DELETE' });
      loadTermsTemplates();
    } catch (err: any) {
      alert(`Error deleting terms: ${err.message}`);
    }
  };

  const handleDuplicateTerms = async (id: string) => {
    try {
      await apiRequest(`/terms/templates/${id}/duplicate`, { method: 'POST' });
      loadTermsTemplates();
    } catch (err: any) {
      alert(`Error duplicating terms: ${err.message}`);
    }
  };

  const handleSetDefaultTerms = async (id: string) => {
    try {
      await apiRequest(`/terms/templates/${id}/set-default`, { method: 'POST' });
      loadTermsTemplates();
    } catch (err: any) {
      alert(`Error setting default: ${err.message}`);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading Settings...</div>;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System & Business Settings</h1>
          <p className="text-sm text-gray-500">Configure Business Profile, Invoice Numbering Patterns, Terms Master & Backups</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-200 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'profile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Company & System
          </button>
          <button
            onClick={() => setActiveTab('numbering')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'numbering' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Invoice Numbering
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'terms' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Terms & Conditions Master
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'templates' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Document Templates
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'whatsapp' ? 'bg-emerald-950 text-white shadow-sm font-extrabold' : 'text-gray-600 hover:text-gray-900'}`}
          >
            WhatsApp Business API
          </button>
        </div>
      </div>

      {activeTab === 'templates' ? (
        <BillTemplateManager />
      ) : activeTab === 'whatsapp' ? (
        <WhatsAppSettingsSection />
      ) : activeTab === 'numbering' ? (
        /* INVOICE NUMBERING SETTINGS TAB */
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Hash className="w-5 h-5 text-indigo-600" />
                <span>Invoice Numbering Pattern & Sequences</span>
              </h2>
              <p className="text-xs text-gray-500">Configure customizable numbering patterns per document type with automatic Indian Financial Year reset</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl text-xs text-indigo-900 font-semibold">
              Current Indian FY: <span className="font-bold font-mono">{financialYearInfo.fyFull || '2026-27'}</span>
            </div>
          </div>

          {saveSuccessMsg && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Document Type Switcher */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-b pb-4">
            {[
              { type: 'INVOICE', label: 'Sales Invoice' },
              { type: 'PURCHASE', label: 'Purchase' },
              { type: 'DELIVERY_CHALLAN', label: 'Delivery Challan' },
              { type: 'QUOTATION', label: 'Quotation' },
              { type: 'SERVICE', label: 'Service Task' },
            ].map((d) => (
              <button
                key={d.type}
                type="button"
                onClick={() => handleDocTypeSelect(d.type)}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition text-center ${
                  selectedDocType === d.type
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Configuration Form */}
          <form onSubmit={handleSaveNumberingConfig} className="space-y-6 text-xs">
            
            {/* Live Preview Banner */}
            <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 space-y-1">
              <p className="text-[10px] text-indigo-300 uppercase tracking-wider font-bold">Live Generated Number Preview ({selectedDocType}):</p>
              <p className="font-mono text-xl font-bold text-emerald-400">{getLiveNumberPreview()}</p>
              <p className="text-[11px] text-slate-400">Next invoice created for FY {financialYearInfo.fyFull} will automatically receive this document number.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Invoice Pattern *</label>
                <input
                  type="text"
                  required
                  value={docPattern}
                  onChange={(e) => setDocPattern(e.target.value)}
                  placeholder="e.g. SAM-{FY}-{NUMBER}"
                  className="w-full p-2.5 border rounded-xl font-mono text-sm font-bold text-gray-900"
                />
                <p className="text-[11px] text-gray-500 mt-1">Must contain <code className="bg-gray-100 px-1 font-bold">{"{NUMBER}"}</code> placeholder.</p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Number Padding Digits *</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  required
                  value={docPaddingDigits}
                  onChange={(e) => setDocPaddingDigits(parseInt(e.target.value) || 4)}
                  className="w-full p-2.5 border rounded-xl font-mono font-bold text-gray-900"
                />
                <p className="text-[11px] text-gray-500 mt-1">e.g. 4 digits produces 0001, 0002</p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Next Counter Number *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={docNextNumber}
                  onChange={(e) => setDocNextNumber(parseInt(e.target.value) || 1)}
                  className="w-full p-2.5 border rounded-xl font-mono font-bold text-gray-900"
                />
                <p className="text-[11px] text-gray-500 mt-1">Sequence counter for FY {financialYearInfo.fyFull}</p>
              </div>
            </div>

            {/* Placeholders Legend */}
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-2">
              <h4 className="font-bold text-gray-900 text-xs">Available Pattern Placeholders:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                  <code className="font-bold text-indigo-700 font-mono">{"{FY}"}</code>
                  <p className="text-gray-600 mt-0.5">Short FY (e.g. <span className="font-mono font-bold">{financialYearInfo.fy}</span>)</p>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                  <code className="font-bold text-indigo-700 font-mono">{"{FY_FULL}"}</code>
                  <p className="text-gray-600 mt-0.5">Full FY (e.g. <span className="font-mono font-bold">{financialYearInfo.fyFull}</span>)</p>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                  <code className="font-bold text-indigo-700 font-mono">{"{YEAR}"}</code>
                  <p className="text-gray-600 mt-0.5">Start Year (e.g. <span className="font-mono font-bold">{financialYearInfo.yearStart || '2026'}</span>)</p>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                  <code className="font-bold text-indigo-700 font-mono">{"{NUMBER}"}</code>
                  <p className="text-gray-600 mt-0.5">Sequential Counter (e.g. <span className="font-mono font-bold">0001</span>)</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-lg transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Numbering Settings</span>
              </button>
            </div>

          </form>

        </div>
      ) : activeTab === 'terms' ? (
        /* TERMS & CONDITIONS MASTER MANAGEMENT TAB */
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Terms & Conditions Master Templates</h2>
              <p className="text-xs text-gray-500">Manage machine and business specific terms templates for Tax Invoices</p>
            </div>
            <button
              onClick={handleOpenNewTermsModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
            >
              + New Template
            </button>
          </div>

          <div className="space-y-4">
            {termsTemplates.map((tmpl) => (
              <div key={tmpl.id} className="border border-gray-200 rounded-xl p-4 hover:border-emerald-500 transition space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-base">{tmpl.name}</h3>
                    {tmpl.isDefault && (
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-300">
                        ✓ Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!tmpl.isDefault && (
                      <button
                        onClick={() => handleSetDefaultTerms(tmpl.id)}
                        className="text-xs font-semibold text-gray-600 hover:text-emerald-600 underline"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEditTermsModal(tmpl)}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-lg"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDuplicateTerms(tmpl.id)}
                      className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => handleDeleteTerms(tmpl.id, tmpl.name)}
                      className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Terms Lines Preview */}
                <ol className="list-decimal list-inside text-xs text-gray-700 space-y-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {tmpl.items?.map((item: any, idx: number) => (
                    <li key={item.id || idx}>{item.text}</li>
                  ))}
                </ol>
              </div>
            ))}

            {termsTemplates.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">No Terms & Conditions templates found. Click "+ New Template" to create one.</div>
            )}
          </div>
        </div>
      ) : (
        /* COMPANY PROFILE TAB */
        <>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
              <Building className="w-5 h-5 text-emerald-600" />
              <span>Company Profile Settings</span>
            </h2>

            <form onSubmit={handleSaveCompany} className="space-y-4 text-sm">
              {/* Logo Upload Block */}
              <div className="border border-gray-200 bg-gray-50 p-4 rounded-xl flex items-center gap-4">
                {company.logoUrl ? (
                  <div className="relative group">
                    <img
                      src={company.logoUrl}
                      alt="Company Logo Preview"
                      className="h-14 max-w-[180px] object-contain bg-white p-1 rounded-lg border border-gray-300 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setCompany({ ...company, logoUrl: null })}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold shadow"
                      title="Remove Logo"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="h-14 w-28 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 text-[11px] bg-white font-semibold">
                    <span>No Logo</span>
                  </div>
                )}

                <div className="flex-1 space-y-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase">Company Logo (Tax Invoice Header)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                  />
                  <p className="text-[11px] text-gray-500">Upload PNG, JPG, or WebP image. Automatically appears on A4 Tax Invoices.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Business Name *</label>
                  <input
                    type="text"
                    required
                    value={company.businessName || ''}
                    onChange={(e) => setCompany({ ...company, businessName: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-bold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={company.phone || ''}
                    onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Registered Business Address</label>
                <input
                  type="text"
                  value={company.address || ''}
                  onChange={(e) => setCompany({ ...company, address: e.target.value })}
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">GSTIN *</label>
                  <input
                    type="text"
                    required
                    value={company.gstin || ''}
                    onChange={(e) => setCompany({ ...company, gstin: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-mono uppercase font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">State Code</label>
                  <input
                    type="text"
                    value={company.stateCode || ''}
                    onChange={(e) => setCompany({ ...company, stateCode: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">State Name</label>
                  <input
                    type="text"
                    value={company.state || ''}
                    onChange={(e) => setCompany({ ...company, state: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Bank Details (Appears on Tax Invoice)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={company.bankName || ''}
                      onChange={(e) => setCompany({ ...company, bankName: e.target.value })}
                      className="w-full p-2.5 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={company.bankAccountNo || ''}
                      onChange={(e) => setCompany({ ...company, bankAccountNo: e.target.value })}
                      className="w-full p-2.5 border rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={company.ifsc || ''}
                      onChange={(e) => setCompany({ ...company, ifsc: e.target.value })}
                      className="w-full p-2.5 border rounded-xl font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">UPI ID</label>
                    <input
                      type="text"
                      value={company.upiId || ''}
                      onChange={(e) => setCompany({ ...company, upiId: e.target.value })}
                      className="w-full p-2.5 border rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow transition flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Company Profile</span>
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b pb-3">
              <Database className="w-5 h-5 text-emerald-600" />
              <span>Inventory & Delivery Rules</span>
            </h2>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs">
              <div>
                <p className="font-bold text-gray-900">Delivery Challans deduct stock directly?</p>
                <p className="text-gray-500">When set to YES, issuing a final Delivery Challan deducts machine stock from inventory.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveStockSetting('YES')}
                  className={`px-4 py-2 rounded-lg font-bold transition ${stockSetting === 'YES' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveStockSetting('NO')}
                  className={`px-4 py-2 rounded-lg font-bold transition ${stockSetting === 'NO' ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  NO
                </button>
              </div>
            </div>
          </div>

          {/* Manual Reset Demo Data Option */}
          <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-red-900 flex items-center gap-2 border-b border-red-100 pb-3">
              <Trash2 className="w-5 h-5 text-red-600" />
              <span>Reset Demo Data (Explicit Manual Action Only)</span>
            </h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-red-50 rounded-xl border border-red-200 text-xs gap-3">
              <div>
                <p className="font-bold text-red-950">Explicitly Re-seed Sample Dataset?</p>
                <p className="text-red-700">This action runs only when clicked. It will never run automatically on startup or dev mode.</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm("Are you sure you want to explicitly reset and re-seed sample demo data? Your custom database records will be refreshed.")) {
                    try {
                      await apiRequest('/backup/reset-demo-data', { method: 'POST' });
                      alert("Demo dataset refreshed and re-seeded cleanly!");
                      window.location.reload();
                    } catch (err: any) {
                      alert(`Error: ${err.message}`);
                    }
                  }
                }}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl font-black shadow-sm transition whitespace-nowrap"
              >
                Reset Demo Data
              </button>
            </div>
          </div>
        </>
      )}

      {/* Terms & Conditions Edit Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-gray-900 border-b pb-3">
              {editingTemplate ? 'Edit Terms Template' : 'Create New Terms Template'}
            </h3>

            <form onSubmit={handleSaveTermsTemplate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Template Title *</label>
                <input
                  type="text"
                  required
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Chaff Cutter Terms & Conditions"
                  className="w-full p-2.5 border rounded-xl font-bold"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefaultCheck"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <label htmlFor="isDefaultCheck" className="font-bold text-gray-800">
                  Set as system default terms template for new invoices
                </label>
              </div>

              <div className="space-y-2">
                <label className="block font-bold text-gray-700">Terms List Items:</label>
                {termsList.map((term, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <span className="font-mono font-bold text-gray-500 w-5">{idx + 1}.</span>
                    <input
                      type="text"
                      value={term}
                      onChange={(e) => {
                        const updated = [...termsList];
                        updated[idx] = e.target.value;
                        setTermsList(updated);
                      }}
                      placeholder="Enter terms & conditions text..."
                      className="flex-1 p-2 border rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setTermsList(termsList.filter((_, i) => i !== idx))}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setTermsList([...termsList, ''])}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg text-xs"
                >
                  + Add Term Line
                </button>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
