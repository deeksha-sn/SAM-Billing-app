import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { Package, Plus, Edit3, Sliders, X, Layers } from 'lucide-react';
import { QuickAddItemModal } from '../components/QuickAddItemModal';

export const Inventory: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'BOM' | 'LEDGER'>('ITEMS');
  const [showCreateItem, setShowCreateItem] = useState(searchParams.get('create') === 'true');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showStockModal, setShowStockModal] = useState<any>(null);

  // BOM Builder state
  const [selectedFinishedItemId, setSelectedFinishedItemId] = useState('');
  const [bomComponents, setBomComponents] = useState<any[]>([{ componentItemId: '', quantity: 1 }]);
  const [stockMovements, setStockMovements] = useState<any[]>([]);

  // Adjustment state
  const [adjType, setAdjType] = useState('ADJUSTMENT_IN');
  const [adjQty, setAdjQty] = useState('1');
  const [adjReason, setAdjReason] = useState('Physical Stock Audit');

  // Category Filtering & Collapsible Sections State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('ALL');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadItems();
    loadBOMs();
    loadMovements();
  }, []);

  const loadItems = async () => {
    try {
      const res = await apiRequest('/items');
      const list = Array.isArray(res) ? res : res.items || [];
      setItems(list);
    } catch (err) {
      console.error(err);
    }
  };

  const loadBOMs = async () => {
    try {
      const res = await apiRequest('/bom');
      setBoms(res.boms);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMovements = async () => {
    try {
      const res = await apiRequest('/reports/stock-ledger');
      setStockMovements(res.movements);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showStockModal) return;

    try {
      await apiRequest(`/items/${showStockModal.id}/adjust-stock`, {
        method: 'POST',
        body: JSON.stringify({
          adjustmentType: adjType,
          quantity: Number(adjQty),
          reason: adjReason,
        }),
      });

      alert('Stock adjusted successfully!');
      setShowStockModal(null);
      loadItems();
      loadMovements();
    } catch (err: any) {
      alert(`Error adjusting stock: ${err.message}`);
    }
  };

  const handleSaveBOM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFinishedItemId) {
      alert('Select finished machine');
      return;
    }

    try {
      await apiRequest('/bom', {
        method: 'POST',
        body: JSON.stringify({
          finishedItemId: selectedFinishedItemId,
          components: bomComponents,
        }),
      });

      alert('Bill of Materials (BOM) saved successfully!');
      loadBOMs();
      loadItems();
    } catch (err: any) {
      alert(`Error saving BOM: ${err.message}`);
    }
  };

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const CATEGORY_TABS = [
    { key: 'ALL', label: 'ALL', icon: '📋' },
    { key: 'READY_MACHINES', label: 'READY MACHINES', icon: '🚜' },
    { key: 'MILKING_MACHINE', label: 'MILKING MACHINES', icon: '🥛' },
    { key: 'CHAFF_CUTTER', label: 'CHAFF CUTTERS', icon: '🌾' },
    { key: 'SPRAYER', label: 'SPRAYERS', icon: '💧' },
    { key: 'PRESSURE_WASHER', label: 'PRESSURE WASHERS', icon: '🌊' },
    { key: 'SPARE_PART', label: 'SPARE PARTS', icon: '🔧' },
    { key: 'COMPONENT', label: 'COMPONENTS', icon: '⚙️' },
    { key: 'RAW_MATERIAL', label: 'RAW MATERIALS', icon: '🧱' },
    { key: 'OTHER', label: 'OTHER', icon: '📦' },
  ];

  // Helper to categorize an item into its main section key
  const getItemCategoryKey = (item: any): string => {
    const cat = item.itemCategory || '';
    const type = item.type || '';
    const name = (item.name || '').toLowerCase();

    if (cat === 'MILKING_MACHINE' || name.includes('milking')) return 'MILKING_MACHINE';
    if (cat === 'CHAFF_CUTTER' || name.includes('chaff')) return 'CHAFF_CUTTER';
    if (cat === 'SPRAYER' || name.includes('sprayer') || name.includes('fogger')) return 'SPRAYER';
    if (cat === 'PRESSURE_WASHER' || name.includes('washer') || name.includes('pressure')) return 'PRESSURE_WASHER';
    if (cat === 'SOLAR_MACHINE' || name.includes('solar')) return 'SOLAR_MACHINE';
    if (cat === 'BATTERY_PETROL_MACHINE' || name.includes('brush') || name.includes('auger') || name.includes('petrol')) return 'BATTERY_PETROL_MACHINE';
    if (cat === 'SPARE_PART' || type === 'SPARE_PART') return 'SPARE_PART';
    if (cat === 'COMPONENT' || type === 'COMPONENT') return 'COMPONENT';
    if (cat === 'RAW_MATERIAL' || type === 'RAW_MATERIAL') return 'RAW_MATERIAL';
    if (cat === 'FINISHED_MACHINE' || type === 'FINISHED_MACHINE') return 'READY_MACHINES';
    return 'OTHER';
  };

  const SECTION_DEFINITIONS = [
    { key: 'MILKING_MACHINE', title: 'MILKING MACHINES', icon: '🥛', color: 'border-blue-300 bg-blue-50/50 text-blue-900' },
    { key: 'CHAFF_CUTTER', title: 'CHAFF CUTTERS', icon: '🌾', color: 'border-amber-300 bg-amber-50/50 text-amber-900' },
    { key: 'SPRAYER', title: 'SPRAYERS / FOGGERS', icon: '💧', color: 'border-sky-300 bg-sky-50/50 text-sky-900' },
    { key: 'PRESSURE_WASHER', title: 'PRESSURE WASHERS', icon: '🌊', color: 'border-cyan-300 bg-cyan-50/50 text-cyan-900' },
    { key: 'SOLAR_MACHINE', title: 'SOLAR MACHINES', icon: '☀️', color: 'border-yellow-300 bg-yellow-50/50 text-yellow-900' },
    { key: 'BATTERY_PETROL_MACHINE', title: 'BATTERY / PETROL MACHINES', icon: '🔋', color: 'border-orange-300 bg-orange-50/50 text-orange-900' },
    { key: 'READY_MACHINES', title: 'READY / FINISHED MACHINES', icon: '🚜', color: 'border-emerald-300 bg-emerald-50/50 text-emerald-900' },
    { key: 'SPARE_PART', title: 'SPARE PARTS', icon: '🔧', color: 'border-indigo-300 bg-indigo-50/50 text-indigo-900' },
    { key: 'COMPONENT', title: 'COMPONENTS', icon: '⚙️', color: 'border-purple-300 bg-purple-50/50 text-purple-900' },
    { key: 'RAW_MATERIAL', title: 'RAW MATERIALS', icon: '🧱', color: 'border-rose-300 bg-rose-50/50 text-rose-900' },
    { key: 'OTHER', title: 'OTHER / MISCELLANEOUS', icon: '📦', color: 'border-gray-300 bg-gray-50 text-gray-900' },
  ];

  // Filter items based on searchQuery & selectedCategoryTab
  const filteredItems = items.filter((item) => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (item.name || '').toLowerCase().includes(q);
      const matchSku = (item.sku || '').toLowerCase().includes(q);
      const matchHsn = (item.hsnSac || '').toLowerCase().includes(q);
      const matchCat = (item.categoryLabel || item.itemCategory || '').toLowerCase().includes(q);
      const matchSub = (item.subcategory || '').toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchHsn && !matchCat && !matchSub) return false;
    }

    // 2. Category Tab Filter
    if (selectedCategoryTab === 'ALL') return true;
    const catKey = getItemCategoryKey(item);

    if (selectedCategoryTab === 'READY_MACHINES') {
      return ['MILKING_MACHINE', 'CHAFF_CUTTER', 'SPRAYER', 'PRESSURE_WASHER', 'SOLAR_MACHINE', 'BATTERY_PETROL_MACHINE', 'READY_MACHINES'].includes(catKey);
    }

    return catKey === selectedCategoryTab;
  });

  const finishedMachines = items.filter((i) => i.type === 'FINISHED_MACHINE');
  const componentItems = items.filter((i) => i.type !== 'FINISHED_MACHINE');

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Package className="w-7 h-7 text-emerald-600" />
            <span>Item Master & Inventory Catalog</span>
          </h1>
          <p className="text-xs text-gray-500">Organized ready machines, spare parts, raw materials, BOM builder, & stock ledger</p>
        </div>
        <button
          onClick={() => setShowCreateItem(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 shadow-md transition text-xs"
        >
          <Plus className="w-5 h-5" />
          <span>+ Add Product / Item</span>
        </button>
      </div>

      {/* Main Tabs */}
      <div className="flex bg-gray-200 p-1 rounded-xl w-fit text-xs font-bold">
        <button
          onClick={() => setActiveTab('ITEMS')}
          className={`px-5 py-2 rounded-lg transition ${activeTab === 'ITEMS' ? 'bg-white text-emerald-900 shadow font-black' : 'text-gray-600'}`}
        >
          Items Directory ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('BOM')}
          className={`px-5 py-2 rounded-lg transition ${activeTab === 'BOM' ? 'bg-white text-purple-900 shadow font-black' : 'text-gray-600'}`}
        >
          BOM (Bill of Materials) ({boms.length})
        </button>
        <button
          onClick={() => setActiveTab('LEDGER')}
          className={`px-5 py-2 rounded-lg transition ${activeTab === 'LEDGER' ? 'bg-white text-blue-900 shadow font-black' : 'text-gray-600'}`}
        >
          Stock Ledger Movement History
        </button>
      </div>

      {/* TAB 1: ITEMS DIRECTORY */}
      {activeTab === 'ITEMS' && (
        <div className="space-y-4">
          {/* Category Filter Tabs & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_TABS.map((tab) => {
                  const isActive = selectedCategoryTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setSelectedCategoryTab(tab.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm font-black ring-2 ring-emerald-500'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div className="w-full md:w-72 shrink-0">
                <input
                  type="text"
                  placeholder="Search item, SKU, HSN, category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Collapsible Category Sections */}
          <div className="space-y-4">
            {SECTION_DEFINITIONS.map((secDef) => {
              // Get items belonging to this section
              const sectionItems = filteredItems.filter((i) => getItemCategoryKey(i) === secDef.key);
              if (sectionItems.length === 0) return null;

              const isCollapsed = collapsedSections[secDef.key] || false;
              const totalStock = sectionItems.reduce((acc, i) => acc + i.currentStock, 0);

              return (
                <div key={secDef.key} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition">
                  {/* Collapsible Section Header */}
                  <div
                    onClick={() => toggleSection(secDef.key)}
                    className={`p-4 border-b flex justify-between items-center cursor-pointer hover:opacity-95 transition ${secDef.color}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{secDef.icon}</span>
                      <div>
                        <h3 className="font-black text-sm uppercase tracking-wider">{secDef.title}</h3>
                        <p className="text-[11px] opacity-80 font-medium">
                          {sectionItems.length} Products | Total Stock: {totalStock} units
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 text-[11px] font-black rounded-full bg-white/80 border text-gray-900">
                        {sectionItems.length} items
                      </span>
                      <button className="text-gray-700 font-black text-lg">
                        {isCollapsed ? '➕' : '➖'}
                      </button>
                    </div>
                  </div>

                  {/* Section Items Table */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b text-gray-600 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-3.5">SKU / Code</th>
                            <th className="p-3.5">Item Name</th>
                            <th className="p-3.5">Subcategory</th>
                            <th className="p-3.5">HSN</th>
                            <th className="p-3.5">GST %</th>
                            <th className="p-3.5">Selling Price</th>
                            <th className="p-3.5">Visibility</th>
                            <th className="p-3.5">Current Stock</th>
                            <th className="p-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {sectionItems.map((item) => {
                            const isLow = item.currentStock <= item.minStock;
                            const isBilling = item.showInBilling !== false;

                            return (
                              <tr key={item.id} className="hover:bg-slate-50/80 transition">
                                <td className="p-3.5 font-bold font-mono text-emerald-800">{item.sku}</td>
                                <td className="p-3.5 font-black text-gray-900 text-xs">
                                  {item.name}
                                </td>
                                <td className="p-3.5">
                                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-700">
                                    {item.subcategory || 'Standard'}
                                  </span>
                                </td>
                                <td className="p-3.5 font-mono text-gray-600">{item.hsnSac}</td>
                                <td className="p-3.5 font-mono text-gray-600">{item.gstRate}%</td>
                                <td className="p-3.5 font-mono font-bold text-gray-900">
                                  ₹{item.sellingPrice ? item.sellingPrice.toLocaleString('en-IN') : '0'}
                                </td>
                                <td className="p-3.5">
                                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                                    isBilling ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}>
                                    {isBilling ? 'Customer Billing' : 'Internal Only'}
                                  </span>
                                </td>
                                <td className="p-3.5">
                                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full font-mono ${
                                    isLow ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800'
                                  }`}>
                                    {item.currentStock} {item.unit} {isLow && '(LOW)'}
                                  </span>
                                </td>
                                <td className="p-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => setEditingItem(item)}
                                      className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition"
                                      title="Edit Item"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setShowStockModal(item)}
                                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-[11px] rounded-lg border inline-flex items-center gap-1"
                                    >
                                      <Sliders className="w-3.5 h-3.5" /> Adjust Stock
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: BOM BUILDER */}
      {activeTab === 'BOM' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* BOM Builder Form */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              <span>Configure Machine Bill of Materials (BOM)</span>
            </h2>

            <form onSubmit={handleSaveBOM} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Select Finished Machine *</label>
                <select
                  value={selectedFinishedItemId}
                  onChange={(e) => setSelectedFinishedItemId(e.target.value)}
                  required
                  className="w-full p-3 border rounded-xl font-semibold bg-white"
                >
                  <option value="">-- Select Finished Machine --</option>
                  {finishedMachines.map((fm) => (
                    <option key={fm.id} value={fm.id}>
                      {fm.name} ({fm.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 border-t pt-3">
                <label className="block text-xs font-bold text-gray-700 uppercase">Required Components for 1 Machine</label>
                {bomComponents.map((comp, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <select
                      value={comp.componentItemId}
                      onChange={(e) => {
                        const updated = [...bomComponents];
                        updated[idx].componentItemId = e.target.value;
                        setBomComponents(updated);
                      }}
                      className="flex-1 p-2 border rounded-xl text-xs font-semibold"
                    >
                      <option value="">Select Component / Part...</option>
                      {componentItems.map((ci) => (
                        <option key={ci.id} value={ci.id}>
                          {ci.name} ({ci.sku}) - Current Stock: {ci.currentStock}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Qty"
                      value={comp.quantity}
                      onChange={(e) => {
                        const updated = [...bomComponents];
                        updated[idx].quantity = e.target.value;
                        setBomComponents(updated);
                      }}
                      className="w-24 p-2 border rounded-xl text-xs font-bold text-center"
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setBomComponents([...bomComponents, { componentItemId: '', quantity: 1 }])}
                  className="text-xs font-bold text-purple-600 hover:underline"
                >
                  + Add Component Row
                </button>
              </div>

              <button type="submit" className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl shadow">
                Save BOM Permanently
              </button>
            </form>
          </div>

          {/* Active BOMs List */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Saved Bill of Materials</h2>
            <div className="space-y-4">
              {boms.map((b) => (
                <div key={b.id} className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 text-xs">
                  <h3 className="font-bold text-sm text-purple-900">{b.finishedItem?.name}</h3>
                  <p className="text-gray-500 font-mono">BOM Code: {b.name}</p>
                  <div className="mt-2 space-y-1">
                    {b.components?.map((c: any) => (
                      <div key={c.id} className="flex justify-between text-gray-800 font-semibold bg-white p-2 rounded border">
                        <span>{c.componentItem?.name}</span>
                        <span className="font-mono text-purple-700 font-bold">{c.quantity} {c.componentItem?.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STOCK LEDGER */}
      {activeTab === 'LEDGER' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b text-gray-700 font-bold uppercase text-xs">
              <tr>
                <th className="p-4">Date & Time</th>
                <th className="p-4">Item Name</th>
                <th className="p-4">Movement Type</th>
                <th className="p-4">Quantity</th>
                <th className="p-4">Prev Stock</th>
                <th className="p-4">New Stock</th>
                <th className="p-4">Reference</th>
                <th className="p-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stockMovements.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="p-4 text-xs text-gray-600">{new Date(m.date).toLocaleString('en-IN')}</td>
                  <td className="p-4 font-semibold text-gray-900">{m.item?.name}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                      m.movementType.includes('CONSUMPTION') || m.movementType === 'SALE' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {m.movementType}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold">{m.quantity}</td>
                  <td className="p-4 font-mono text-gray-500">{m.previousStock}</td>
                  <td className="p-4 font-mono font-bold text-gray-900">{m.newStock}</td>
                  <td className="p-4 font-mono text-xs text-blue-800 font-semibold">{m.referenceId || 'N/A'}</td>
                  <td className="p-4 text-xs text-gray-600">{m.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center pb-3 border-b mb-4">
              <h3 className="font-bold text-gray-900">Manual Stock Adjustment</h3>
              <button onClick={() => setShowStockModal(null)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockAdjustment} className="space-y-3 text-sm">
              <p className="font-semibold text-gray-800">{showStockModal.name} (Current: {showStockModal.currentStock})</p>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Adjustment Action</label>
                <select value={adjType} onChange={(e) => setAdjType(e.target.value)} className="w-full p-2 border rounded-xl">
                  <option value="ADJUSTMENT_IN">Stock Increase (+)</option>
                  <option value="ADJUSTMENT_OUT">Stock Decrease (-)</option>
                  <option value="DAMAGE">Damaged Stock (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={adjQty}
                  onChange={(e) => setAdjQty(e.target.value)}
                  className="w-full p-2 border rounded-xl font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Reason / Notes *</label>
                <input
                  type="text"
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full p-2 border rounded-xl"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setShowStockModal(null)} className="px-4 py-2 text-gray-600 text-xs">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow">
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateItem && (
        <QuickAddItemModal
          onClose={() => setShowCreateItem(false)}
          onSuccess={() => {
            setShowCreateItem(false);
            loadItems();
          }}
        />
      )}

      {editingItem && (
        <QuickAddItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={() => {
            setEditingItem(null);
            loadItems();
          }}
        />
      )}
    </div>
  );
};
