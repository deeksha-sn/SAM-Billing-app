import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { ShoppingCart, Plus, X, Trash2 } from 'lucide-react';
import { QuickAddPartyModal } from '../components/QuickAddPartyModal';

export const Purchases: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('create') === 'true');
  const [showQuickSupplier, setShowQuickSupplier] = useState(false);

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('0');
  const [lines, setLines] = useState<any[]>([
    { itemId: '', quantity: 1, rate: 0, discountPercent: 0, gstRate: 18 },
  ]);

  useEffect(() => {
    loadPurchases();
    loadMasters();
  }, []);

  const loadPurchases = async () => {
    try {
      const res = await apiRequest('/purchases');
      setPurchases(res.purchases);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMasters = async () => {
    try {
      const pRes = await apiRequest('/parties?type=SUPPLIER');
      setSuppliers(pRes.parties);
      const iRes = await apiRequest('/items');
      setItemsList(iRes.items);
    } catch (err) {
      console.error(err);
    }
  };

  const handleItemSelect = (idx: number, itemId: string) => {
    const item = itemsList.find((i) => i.id === itemId);
    const updated = [...lines];
    if (item) {
      updated[idx] = {
        ...updated[idx],
        itemId: item.id,
        itemName: item.name,
        hsnSac: item.hsnSac || '8436',
        unit: item.unit || 'Nos',
        rate: item.purchasePrice || 0,
        gstRate: item.gstRate || 18,
      };
    }
    setLines(updated);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      alert('Select supplier');
      return;
    }

    try {
      const res = await apiRequest('/purchases', {
        method: 'POST',
        body: JSON.stringify({
          partyId: selectedSupplierId,
          supplierInvoiceNo,
          items: lines,
          paymentMode,
          amountPaid: Number(amountPaid) || 0,
        }),
      });

      alert(`Purchase ${res.purchase.purchaseNumber} created! Inventory stock increased.`);
      setShowCreateModal(false);
      loadPurchases();
    } catch (err: any) {
      alert(`Error creating purchase: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases & Supplier Bills</h1>
          <p className="text-sm text-gray-500">Record Component & Raw Material Purchases (Auto Inventory Increase)</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-md transition"
        >
          <Plus className="w-5 h-5" />
          <span>+ Record Purchase Invoice</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b text-gray-700 font-bold uppercase text-xs">
            <tr>
              <th className="p-4">Purchase #</th>
              <th className="p-4">Supplier Invoice #</th>
              <th className="p-4">Date</th>
              <th className="p-4">Supplier</th>
              <th className="p-4">Grand Total</th>
              <th className="p-4">Amount Paid</th>
              <th className="p-4">Balance Due</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {purchases.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="p-4 font-bold font-mono text-purple-800">{p.purchaseNumber}</td>
                <td className="p-4 font-mono text-gray-600">{p.supplierInvoiceNo || 'N/A'}</td>
                <td className="p-4 text-gray-600">{new Date(p.purchaseDate).toLocaleDateString('en-IN')}</td>
                <td className="p-4 font-semibold text-gray-900">{p.party?.name}</td>
                <td className="p-4 font-mono font-bold">₹{p.grandTotal.toLocaleString('en-IN')}</td>
                <td className="p-4 font-mono text-green-700 font-bold">₹{p.amountPaid.toLocaleString('en-IN')}</td>
                <td className="p-4 font-mono text-red-600 font-bold">₹{p.balanceDue.toLocaleString('en-IN')}</td>
                <td className="p-4">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800">
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE PURCHASE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-6">
            <div className="flex justify-between items-center pb-4 border-b mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-purple-600" />
                <span>Record Purchase Invoice</span>
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">Supplier *</label>
                    <button type="button" onClick={() => setShowQuickSupplier(true)} className="text-xs font-bold text-purple-600 hover:underline">
                      + Quick Add
                    </button>
                  </div>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    required
                    className="w-full p-2.5 border rounded-xl text-sm font-semibold"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Supplier Invoice #</label>
                  <input
                    type="text"
                    placeholder="e.g. KIR-8899"
                    value={supplierInvoiceNo}
                    onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2 border-t pt-3">
                <label className="block text-xs font-bold text-gray-700 uppercase">Items Purchased</label>
                {lines.map((l, idx) => (
                  <div key={idx} className="flex gap-3 items-center text-xs">
                    <select
                      value={l.itemId}
                      onChange={(e) => handleItemSelect(idx, e.target.value)}
                      className="flex-1 p-2 border rounded-xl font-semibold"
                    >
                      <option value="">Select Item...</option>
                      {itemsList.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.sku}) - Current Stock: {i.currentStock}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={l.quantity}
                      onChange={(e) => {
                        const updated = [...lines];
                        updated[idx].quantity = e.target.value;
                        setLines(updated);
                      }}
                      className="w-20 p-2 border rounded-xl font-bold text-center"
                    />
                    <input
                      type="number"
                      placeholder="Purchase Rate (₹)"
                      value={l.rate}
                      onChange={(e) => {
                        const updated = [...lines];
                        updated[idx].rate = e.target.value;
                        setLines(updated);
                      }}
                      className="w-28 p-2 border rounded-xl font-mono text-right"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setLines([...lines, { itemId: '', quantity: 1, rate: 0, discountPercent: 0, gstRate: 18 }])}
                  className="text-xs font-bold text-purple-600 hover:underline"
                >
                  + Add Item
                </button>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 font-semibold text-xs">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-purple-600 text-white font-bold text-xs rounded-xl shadow">
                  Record Purchase & Add Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQuickSupplier && (
        <QuickAddPartyModal
          type="SUPPLIER"
          onClose={() => setShowQuickSupplier(false)}
          onSuccess={(ns) => {
            setSuppliers([...suppliers, ns]);
            setSelectedSupplierId(ns.id);
            setShowQuickSupplier(false);
          }}
        />
      )}
    </div>
  );
};
