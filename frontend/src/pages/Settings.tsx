import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { Settings as SettingsIcon, Building, Database, Trash2, Shield, Save, Download } from 'lucide-react';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'terms'>('profile');
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

  useEffect(() => {
    loadSettings();
    loadTermsTemplates();
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
    setStockSetting(val);
    try {
      await apiRequest('/settings/system', {
        method: 'PUT',
        body: JSON.stringify({
          key: 'delivery_challan_affects_stock',
          value: val,
          description: 'Whether final Delivery Challan deducts stock',
        }),
      });
      alert(`Delivery Challan stock setting updated to: ${val}`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await apiRequest('/backup/export');
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.backup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `SmartAgro_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    }
  };

  const handleDeleteDemoData = async () => {
    if (!confirm('WARNING: Are you sure you want to DELETE ALL DEMO DATA? This will permanently wipe sample invoices, parties, items, and BOM records while preserving your Admin login!')) {
      return;
    }

    try {
      await apiRequest('/backup/reset-demo-data', { method: 'POST' });
      alert('All demo data deleted successfully!');
      window.location.reload();
    } catch (err: any) {
      alert(`Error resetting demo data: ${err.message}`);
    }
  };

  // Terms & Conditions Actions
  const handleOpenNewTermsModal = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setIsDefault(termsTemplates.length === 0);
    setTermsList(['']);
    setShowTermsModal(true);
  };

  const handleOpenEditTermsModal = (tmpl: any) => {
    setEditingTemplate(tmpl);
    setTemplateName(tmpl.name);
    setIsDefault(tmpl.isDefault);
    const existingTerms = tmpl.items && tmpl.items.length > 0
      ? tmpl.items.map((i: any) => i.text)
      : [''];
    setTermsList(existingTerms);
    setShowTermsModal(true);
  };

  const handleSaveTermsTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      alert('Template Name is required');
      return;
    }

    const filteredTerms = termsList.filter((t) => t.trim().length > 0);
    if (filteredTerms.length === 0) {
      alert('Please add at least one condition text');
      return;
    }

    try {
      if (editingTemplate) {
        await apiRequest(`/terms/templates/${editingTemplate.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: templateName,
            isDefault,
            items: filteredTerms,
          }),
        });
      } else {
        await apiRequest('/terms/templates', {
          method: 'POST',
          body: JSON.stringify({
            name: templateName,
            isDefault,
            items: filteredTerms,
          }),
        });
      }
      setShowTermsModal(false);
      loadTermsTemplates();
    } catch (err: any) {
      alert(`Error saving template: ${err.message}`);
    }
  };

  const handleDuplicateTerms = async (id: string) => {
    try {
      await apiRequest(`/terms/templates/${id}/duplicate`, { method: 'POST' });
      loadTermsTemplates();
    } catch (err: any) {
      alert(`Error duplicating template: ${err.message}`);
    }
  };

  const handleDeleteTerms = async (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"? Existing invoices will retain their saved terms.`)) return;
    try {
      await apiRequest(`/terms/templates/${id}`, { method: 'DELETE' });
      loadTermsTemplates();
    } catch (err: any) {
      alert(`Error deleting template: ${err.message}`);
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
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System & Business Settings</h1>
          <p className="text-sm text-gray-500">Configure Business Profile, Terms & Conditions Master, Delivery Rules & Backups</p>
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
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'terms' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Terms & Conditions Master
          </button>
        </div>
      </div>

      {activeTab === 'terms' ? (
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
        <>

      {/* Company Profile Settings */}
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
                value={company.gstin || ''}
                onChange={(e) => setCompany({ ...company, gstin: e.target.value })}
                className="w-full p-2.5 border rounded-xl font-mono text-xs uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">PAN *</label>
              <input
                type="text"
                value={company.pan || ''}
                onChange={(e) => setCompany({ ...company, pan: e.target.value })}
                className="w-full p-2.5 border rounded-xl font-mono text-xs uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">State & Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={company.state || ''}
                  onChange={(e) => setCompany({ ...company, state: e.target.value })}
                  className="w-2/3 p-2.5 border rounded-xl text-xs"
                />
                <input
                  type="text"
                  value={company.stateCode || ''}
                  onChange={(e) => setCompany({ ...company, stateCode: e.target.value })}
                  className="w-1/3 p-2.5 border rounded-xl text-xs text-center font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Bank Name & Account No</label>
              <input
                type="text"
                value={company.bankName || ''}
                onChange={(e) => setCompany({ ...company, bankName: e.target.value })}
                className="w-full p-2 border rounded-xl text-xs mb-2"
                placeholder="Bank Name"
              />
              <input
                type="text"
                value={company.bankAccountNo || ''}
                onChange={(e) => setCompany({ ...company, bankAccountNo: e.target.value })}
                className="w-full p-2 border rounded-xl font-mono text-xs"
                placeholder="Account Number"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">IFSC & UPI ID</label>
              <input
                type="text"
                value={company.ifsc || ''}
                onChange={(e) => setCompany({ ...company, ifsc: e.target.value })}
                className="w-full p-2 border rounded-xl font-mono text-xs mb-2 uppercase"
                placeholder="IFSC Code"
              />
              <input
                type="text"
                value={company.upiId || ''}
                onChange={(e) => setCompany({ ...company, upiId: e.target.value })}
                className="w-full p-2 border rounded-xl font-mono text-xs"
                placeholder="UPI ID"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Profile
            </button>
          </div>
        </form>
      </div>

      {/* Stock Impact Logic Setting */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Delivery Challan Stock Rules</h2>
        <p className="text-xs text-gray-600">
          Configure whether creating a Delivery Challan immediately deducts component stock, or whether stock is deducted only when converted to invoice.
        </p>

        <div className="flex gap-4 pt-2">
          <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition ${stockSetting === 'YES' ? 'border-emerald-600 bg-emerald-50/50' : 'border-gray-200'}`}>
            <input
              type="radio"
              name="dcStock"
              checked={stockSetting === 'YES'}
              onChange={() => handleSaveStockSetting('YES')}
              className="mr-2"
            />
            <span className="font-bold text-sm text-gray-900">YES (Delivery Challan Deducts Stock)</span>
            <p className="text-xs text-gray-500 mt-1">Final DC deducts stock. Converted Invoice will NOT deduct stock again.</p>
          </label>

          <label className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition ${stockSetting === 'NO' ? 'border-emerald-600 bg-emerald-50/50' : 'border-gray-200'}`}>
            <input
              type="radio"
              name="dcStock"
              checked={stockSetting === 'NO'}
              onChange={() => handleSaveStockSetting('NO')}
              className="mr-2"
            />
            <span className="font-bold text-sm text-gray-900">NO (Delivery Challan No Stock Effect)</span>
            <p className="text-xs text-gray-500 mt-1">DC is for transport only. Invoice later deducts stock.</p>
          </label>
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          <span>Backup & Database Reset</span>
        </h2>

        <div className="flex flex-wrap gap-4 pt-2">
          <button
            onClick={handleExportBackup}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Download Complete Business Backup (JSON)
          </button>

          <button
            onClick={handleDeleteDemoData}
            className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-2 ml-auto"
          >
            <Trash2 className="w-4 h-4" /> DELETE ALL DEMO DATA
          </button>
        </div>
      </div>
      </>
      )}

      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">
                {editingTemplate ? 'Edit Terms & Conditions Template' : 'Create Terms & Conditions Template'}
              </h3>
              <button onClick={() => setShowTermsModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleSaveTermsTemplate} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard Machine Sale, Chaff Cutter, Agricultural Sprayer"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-semibold"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefaultCheck"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="isDefaultCheck" className="text-xs font-bold text-gray-800 cursor-pointer">
                  Set as Default Template for new invoices
                </label>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase">Condition Lines</label>
                  <button
                    type="button"
                    onClick={() => setTermsList([...termsList, ''])}
                    className="text-xs font-bold text-emerald-600 hover:underline"
                  >
                    + Add Condition Line
                  </button>
                </div>

                <div className="space-y-2">
                  {termsList.map((termText, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 w-6 text-right">{idx + 1}.</span>
                      <input
                        type="text"
                        required
                        placeholder={`Condition ${idx + 1}...`}
                        value={termText}
                        onChange={(e) => {
                          const updated = [...termsList];
                          updated[idx] = e.target.value;
                          setTermsList(updated);
                        }}
                        className="flex-1 p-2 border rounded-xl text-xs"
                      />
                      {termsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = termsList.filter((_, i) => i !== idx);
                            setTermsList(updated);
                          }}
                          className="text-red-500 hover:text-red-700 font-bold text-xs p-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow"
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
