import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { ShoppingBag, Plus, Eye, Edit, Trash2, Printer, Search } from 'lucide-react';
import { PurchaseEditorModal } from '../components/PurchaseEditorModal';
import { ViewPurchaseModal } from '../components/ViewPurchaseModal';
import { DeletePurchaseModal } from '../components/DeletePurchaseModal';

export const Purchases: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [editorModalPurchase, setEditorModalPurchase] = useState<any | null>(
    searchParams.get('create') === 'true' ? {} : null
  );
  const [viewingPurchase, setViewingPurchase] = useState<any | null>(null);
  const [deletingPurchase, setDeletingPurchase] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/purchases');
      setPurchases(res.purchases || []);
    } catch (err) {
      console.error('Failed to load purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaved = (saved: any) => {
    setEditorModalPurchase(null);
    setViewingPurchase(null);
    loadPurchases();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPurchase) return;
    setDeleteLoading(true);
    try {
      await apiRequest(`/purchases/${deletingPurchase.id}`, { method: 'DELETE' });
      setDeletingPurchase(null);
      setViewingPurchase(null);
      loadPurchases();
    } catch (err: any) {
      alert(err.message || 'Failed to delete purchase');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.purchaseNumber?.toLowerCase().includes(q) ||
      p.supplierInvoiceNo?.toLowerCase().includes(q) ||
      p.party?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-emerald-800" />
            Purchases & Supplier Bills
          </h1>
          <p className="text-xs text-gray-500 font-medium">Record Component & Raw Material Inward (Auto Inventory Increase)</p>
        </div>

        <button
          onClick={() => setEditorModalPurchase({})}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-800 text-white rounded-2xl font-bold hover:bg-emerald-900 shadow-lg shadow-emerald-800/30 transition text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ Record Purchase Invoice</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm max-w-md">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Purchase #, Supplier Name, Supplier Inv #..."
          className="w-full text-xs outline-none bg-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 border-b text-gray-700 font-extrabold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Purchase No.</th>
                <th className="p-4">Supplier Inv No.</th>
                <th className="p-4">Date</th>
                <th className="p-4">Supplier Name</th>
                <th className="p-4 text-right">Grand Total</th>
                <th className="p-4 text-right">Amount Paid</th>
                <th className="p-4 text-right">Balance Due</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400 font-medium">Loading purchases...</td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400 font-medium">No purchase invoices found</td>
                </tr>
              ) : (
                filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-emerald-50/30 transition">
                    <td className="p-4 font-extrabold font-mono text-emerald-900">{p.purchaseNumber}</td>
                    <td className="p-4 font-mono text-gray-600">{p.supplierInvoiceNo || '-'}</td>
                    <td className="p-4 text-gray-600">{new Date(p.purchaseDate).toLocaleDateString('en-IN')}</td>
                    <td className="p-4 font-bold text-gray-900">{p.party?.name || 'N/A'}</td>
                    <td className="p-4 text-right font-mono font-bold text-gray-900">
                      ₹{p.grandTotal.toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-right font-mono text-emerald-700 font-bold">
                      ₹{p.amountPaid.toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-right font-mono text-amber-700 font-bold">
                      ₹{p.balanceDue.toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                        p.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingPurchase(p)}
                          title="View Purchase"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditorModalPurchase(p)}
                          title="Edit Purchase"
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingPurchase(p)}
                          title="Delete Purchase"
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal */}
      {editorModalPurchase && (
        <PurchaseEditorModal
          purchase={editorModalPurchase.id ? editorModalPurchase : undefined}
          onSaved={handleSaved}
          onClose={() => setEditorModalPurchase(null)}
        />
      )}

      {/* View Modal */}
      {viewingPurchase && (
        <ViewPurchaseModal
          purchase={viewingPurchase}
          onEdit={() => {
            setEditorModalPurchase(viewingPurchase);
            setViewingPurchase(null);
          }}
          onDelete={() => {
            setDeletingPurchase(viewingPurchase);
            setViewingPurchase(null);
          }}
          onClose={() => setViewingPurchase(null)}
        />
      )}

      {/* Delete Modal */}
      {deletingPurchase && (
        <DeletePurchaseModal
          purchase={deletingPurchase}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeletingPurchase(null)}
          loading={deleteLoading}
        />
      )}

    </div>
  );
};
