import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { Package, Plus, AlertTriangle, Layers, Edit3, Sliders, X, History } from 'lucide-react';
import { QuickAddItemModal } from '../components/QuickAddItemModal';

export const Inventory: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'BOM' | 'LEDGER'>('ITEMS');
  const [showCreateItem, setShowCreateItem] = useState(searchParams.get('create') === 'true');
  const [showStockModal, setShowStockModal] = useState<any>(null);

  // BOM Builder state
  const [selectedFinishedItemId, setSelectedFinishedItemId] = useState('');
  const [bomComponents, setBomComponents] = useState<any[]>([{ componentItemId: '', quantity: 1 }]);
  const [stockMovements, setStockMovements] = useState<any[]>([]);

  // Adjustment state
  const [adjType, setAdjType] = useState('ADJUSTMENT_IN');
  const [adjQty, setAdjQty] = useState('1');
  const [adjReason, setAdjReason] = useState('Physical Stock Audit');

  useEffect(() => {
    loadItems();
    loadBOMs();
    loadMovements();
  }, []);

  const loadItems = async () => {
    try {
      const res = await apiRequest('/items');
      setItems(res.items);
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

  const finishedMachines = items.filter((i) => i.type === 'FINISHED_MACHINE');
  const componentItems = items.filter((i) => i.type !== 'FINISHED_MACHINE');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory & BOM Management</h1>
          <p className="text-sm text-gray-500">Real-time Stock Ledger, Minimum Stock Alerts & Multi-component BOM</p>
        </div>
        <button
          onClick={() => setShowCreateItem(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-md transition"
        >
          <Plus className="w-5 h-5" />
          <span>+ Add Product / Item</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-200 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('ITEMS')}
          className={`px-5 py-2 rounded-lg font-bold text-xs transition ${activeTab === 'ITEMS' ? 'bg-white text-emerald-800 shadow' : 'text-gray-600'}`}
        >
          Items Directory ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('BOM')}
          className={`px-5 py-2 rounded-lg font-bold text-xs transition ${activeTab === 'BOM' ? 'bg-white text-purple-800 shadow' : 'text-gray-600'}`}
        >
          BOM (Bill of Materials) ({boms.length})
        </button>
        <button
          onClick={() => setActiveTab('LEDGER')}
          className={`px-5 py-2 rounded-lg font-bold text-xs transition ${activeTab === 'LEDGER' ? 'bg-white text-blue-800 shadow' : 'text-gray-600'}`}
        >
          Stock Ledger Movement History
        </button>
      </div>

      {/* TAB 1: ITEMS DIRECTORY */}
      {activeTab === 'ITEMS' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b text-gray-700 font-bold uppercase text-xs">
              <tr>
                <th className="p-4">SKU / Code</th>
                <th className="p-4">Item Name</th>
                <th className="p-4">Type</th>
                <th className="p-4">HSN</th>
                <th className="p-4">GST %</th>
                <th className="p-4">Selling Price</th>
                <th className="p-4">Current Stock</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => {
                const isLow = item.currentStock <= item.minStock;
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="p-4 font-bold font-mono text-emerald-800">{item.sku}</td>
                    <td className="p-4 font-semibold text-gray-900">{item.name}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-gray-100 text-gray-700">
                        {item.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-gray-600">{item.hsnSac}</td>
                    <td className="p-4 font-mono text-gray-600">{item.gstRate}%</td>
                    <td className="p-4 font-mono font-bold">₹{item.sellingPrice.toLocaleString('en-IN')}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full font-mono ${
                        isLow ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800'
                      }`}>
                        {item.currentStock} {item.unit} {isLow && '(LOW)'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setShowStockModal(item)}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs rounded-lg border inline-flex items-center gap-1"
                      >
                        <Sliders className="w-3.5 h-3.5" /> Adjust Stock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
    </div>
  );
};
