import React, { useState } from 'react';
import { X, PackagePlus } from 'lucide-react';
import { apiRequest } from '../api';

interface QuickAddItemModalProps {
  item?: any;
  onSuccess: (newItem: any) => void;
  onClose: () => void;
}

export const QuickAddItemModal: React.FC<QuickAddItemModalProps> = ({ item, onSuccess, onClose }) => {
  const [name, setName] = useState(item?.name || '');
  const [sku, setSku] = useState(item?.sku || '');
  const [type, setType] = useState(item?.type || 'FINISHED_MACHINE');
  const [itemCategory, setItemCategory] = useState(item?.itemCategory || 'FINISHED_MACHINE');
  const [subcategory, setSubcategory] = useState(item?.subcategory || '');
  const [showInBilling, setShowInBilling] = useState(item?.showInBilling !== false);
  
  // Usage Checkboxes
  const [allowSales, setAllowSales] = useState(item?.allowSales !== false);
  const [allowQuotation, setAllowQuotation] = useState(item?.allowQuotation !== false);
  const [allowPurchase, setAllowPurchase] = useState(item?.allowPurchase !== false);
  const [allowDC, setAllowDC] = useState(item?.allowDC !== false);
  const [allowService, setAllowService] = useState(item?.allowService !== false);

  const [unit, setUnit] = useState(item?.unit || 'Nos');
  const [hsnSac, setHsnSac] = useState(item?.hsnSac || '8436');
  const [gstRate, setGstRate] = useState(item?.gstRate !== undefined ? item.gstRate : 18);
  const [sellingPrice, setSellingPrice] = useState(item?.sellingPrice !== undefined ? String(item.sellingPrice) : '');
  const [purchasePrice, setPurchasePrice] = useState(item?.purchasePrice !== undefined ? String(item.purchasePrice) : '');
  const [openingStock, setOpeningStock] = useState(item?.currentStock !== undefined ? String(item.currentStock) : '');
  const [defaultTermsTemplateId, setDefaultTermsTemplateId] = useState(item?.defaultTermsTemplateId || '');
  const [termsTemplates, setTermsTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    apiRequest('/terms/templates')
      .then((res) => setTermsTemplates(res.templates || []))
      .catch(console.error);
  }, []);

  const CATEGORY_OPTIONS = [
    { value: 'MILKING_MACHINE', label: 'Milking Machines' },
    { value: 'CHAFF_CUTTER', label: 'Chaff Cutters' },
    { value: 'SPRAYER', label: 'Sprayers / Foggers' },
    { value: 'PRESSURE_WASHER', label: 'Pressure Washers' },
    { value: 'SOLAR_MACHINE', label: 'Solar Machines' },
    { value: 'BATTERY_PETROL_MACHINE', label: 'Battery / Petrol Machines' },
    { value: 'FINISHED_MACHINE', label: 'Ready / Finished Machines' },
    { value: 'SPARE_PART', label: 'Spare Parts' },
    { value: 'COMPONENT', label: 'Components' },
    { value: 'RAW_MATERIAL', label: 'Raw Materials' },
    { value: 'OTHER', label: 'Other / Miscellaneous' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) {
      setError('Item Name and SKU code are required');
      return;
    }

    setLoading(true);
    setError('');

    const matchedCat = CATEGORY_OPTIONS.find((c) => c.value === itemCategory);
    const categoryLabel = matchedCat ? matchedCat.label : 'Other / Miscellaneous';

    try {
      const endpoint = item ? `/items/${item.id}` : '/items';
      const method = item ? 'PUT' : 'POST';

      const res = await apiRequest(endpoint, {
        method,
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim(),
          type,
          itemCategory,
          categoryLabel,
          subcategory: subcategory.trim() || null,
          showInBilling,
          isSellable: showInBilling,
          allowSales,
          allowQuotation,
          allowPurchase,
          allowDC,
          allowService,
          unit,
          hsnSac,
          gstRate: Number(gstRate),
          sellingPrice: Number(sellingPrice) || 0,
          purchasePrice: Number(purchasePrice) || 0,
          openingStock: Number(openingStock) || 0,
          defaultTermsTemplateId: defaultTermsTemplateId || null,
        }),
      });

      onSuccess(res.item);
    } catch (err: any) {
      setError(err.message || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 my-8">
        <div className="flex justify-between items-center pb-3 border-b mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-emerald-600" />
            <span>{item ? 'Edit Product / Item Master' : '+ Add Product / Item Master'}</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Item Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Chaff Cutter 3HP"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Item Code / SKU *</label>
              <input
                type="text"
                required
                placeholder="e.g. CC-3HP"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-xs uppercase font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Item Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-xs font-semibold"
              >
                <option value="FINISHED_MACHINE">Finished Machine</option>
                <option value="SPARE_PART">Spare Part</option>
                <option value="COMPONENT">Component</option>
                <option value="RAW_MATERIAL">Raw Material</option>
                <option value="SERVICE">Service</option>
                <option value="OTHER">Other / Equipment</option>
              </select>
            </div>
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Category Section *</label>
              <select
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-xs font-bold text-slate-900"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Subcategory (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Single Bucket, 2HP, Bearing"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs"
              />
            </div>
          </div>

          {/* Billing Visibility */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
            <label className="block text-xs font-bold text-amber-900 uppercase">Billing Visibility & Priority</label>
            <div className="flex items-center gap-4 text-xs font-medium">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="showInBilling"
                  checked={showInBilling === true}
                  onChange={() => setShowInBilling(true)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-bold text-emerald-950">Show in Customer Billing (Default)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="showInBilling"
                  checked={showInBilling === false}
                  onChange={() => setShowInBilling(false)}
                  className="text-gray-600 focus:ring-gray-500"
                />
                <span className="font-bold text-gray-700">Internal Use Only (Hidden from Bill Default)</span>
              </label>
            </div>
          </div>

          {/* Document Usage */}
          <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1.5">
            <label className="block text-xs font-bold text-blue-900 uppercase">Allowed Document Usage</label>
            <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold text-blue-950">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={allowSales} onChange={(e) => setAllowSales(e.target.checked)} />
                <span>Sales Invoice</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={allowQuotation} onChange={(e) => setAllowQuotation(e.target.checked)} />
                <span>Quotation</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={allowDC} onChange={(e) => setAllowDC(e.target.checked)} />
                <span>Delivery Challan</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={allowPurchase} onChange={(e) => setAllowPurchase(e.target.checked)} />
                <span>Purchase</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={allowService} onChange={(e) => setAllowService(e.target.checked)} />
                <span>Service / Repair</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Unit</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs"
                placeholder="Nos, Kg, etc"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">HSN / SAC</label>
              <input
                type="text"
                value={hsnSac}
                onChange={(e) => setHsnSac(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">GST %</label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-xs font-semibold"
              >
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Selling Price (₹)</label>
              <input
                type="number"
                placeholder="0.00"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Purchase Price (₹)</label>
              <input
                type="number"
                placeholder="0.00"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Opening Stock</label>
              <input
                type="number"
                placeholder="0"
                value={openingStock}
                onChange={(e) => setOpeningStock(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Default Terms & Conditions Template</label>
            <select
              value={defaultTermsTemplateId}
              onChange={(e) => setDefaultTermsTemplateId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white text-xs"
            >
              <option value="">-- Standard Default --</option>
              {termsTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-semibold">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow transition"
            >
              {loading ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
