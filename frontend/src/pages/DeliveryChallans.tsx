import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { Truck, Plus, Eye, Edit, Trash2, Search, Printer, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ViewChallanModal } from '../components/ViewChallanModal';
import { DeleteChallanModal } from '../components/DeleteChallanModal';
import { FullScreenBillingEngine } from '../components/FullScreenBillingEngine';

export const DeliveryChallans: React.FC = () => {
  const navigate = useNavigate();
  const [challans, setChallans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockSetting, setStockSetting] = useState('YES');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals state
  const [editorModalChallan, setEditorModalChallan] = useState<any | null>(null);
  const [viewingChallan, setViewingChallan] = useState<any | null>(null);
  const [deletingChallan, setDeletingChallan] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadChallans = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest('/delivery-challans');
      const list = Array.isArray(res) ? res : res.challans || [];
      setChallans(list);
      const sRes = await apiRequest('/settings/system');
      setStockSetting(sRes.settings?.delivery_challan_affects_stock || 'YES');
    } catch (err: any) {
      console.error('Failed to load delivery challans:', err);
      setErrorMsg(err.message || 'Failed to load delivery challans from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallans();
  }, []);

  if (editorModalChallan !== null) {
    return (
      <FullScreenBillingEngine
        docType="DELIVERY_CHALLAN"
        editingDocId={editorModalChallan?.id}
        onBack={() => setEditorModalChallan(null)}
        onSaved={(saved) => {
          setEditorModalChallan(null);
          setViewingChallan(saved);
          loadChallans();
        }}
      />
    );
  }

  const handleSaved = (saved: any) => {
    setEditorModalChallan(null);
    setViewingChallan(null);
    loadChallans();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingChallan) return;
    setDeleteLoading(true);
    try {
      await apiRequest(`/delivery-challans/${deletingChallan.id}`, { method: 'DELETE' });
      setDeletingChallan(null);
      setViewingChallan(null);
      loadChallans();
    } catch (err: any) {
      alert(err.message || 'Failed to delete Delivery Challan');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredChallans = challans.filter((dc) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      dc.challanNumber?.toLowerCase().includes(q) ||
      dc.party?.name?.toLowerCase().includes(q) ||
      dc.vehicleNumber?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-slate-800" />
            Delivery Challans
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Stock Impact Setting: <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${stockSetting === 'YES' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {stockSetting === 'YES' ? 'ON (DC Deducts Stock)' : 'OFF (Invoice Deducts Stock)'}
            </span>
          </p>
        </div>

        <button
          onClick={() => setEditorModalChallan({})}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 shadow-lg shadow-slate-900/30 transition text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Delivery Challan</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm max-w-md">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Challan #, Customer Name, Vehicle #..."
          className="w-full text-xs outline-none bg-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 border-b text-gray-700 font-extrabold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Challan No.</th>
                <th className="p-4">Date</th>
                <th className="p-4">Customer Name</th>
                <th className="p-4">Reason / Dispatch</th>
                <th className="p-4">Vehicle No.</th>
                <th className="p-4 text-center">Stock Impact</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400 font-medium">Loading delivery challans...</td>
                </tr>
              ) : filteredChallans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400 font-medium">No delivery challans found</td>
                </tr>
              ) : (
                filteredChallans.map((dc) => (
                  <tr key={dc.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 font-extrabold font-mono text-slate-900">{dc.challanNumber}</td>
                    <td className="p-4 text-gray-600">{new Date(dc.challanDate).toLocaleDateString('en-IN')}</td>
                    <td className="p-4 font-bold text-gray-900">{dc.party?.name || 'N/A'}</td>
                    <td className="p-4 text-gray-700">{dc.reason}</td>
                    <td className="p-4 font-mono font-bold text-slate-800">{dc.vehicleNumber || '-'}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${dc.stockDeducted ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                        {dc.stockDeducted ? 'Stock Deducted' : 'No Stock Impact'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800">
                        {dc.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewingChallan(dc)}
                          title="View Challan"
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded-lg text-[11px] flex items-center gap-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <button
                          onClick={() => setEditorModalChallan(dc)}
                          title="Edit Challan"
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-[11px] flex items-center gap-1 transition"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => setViewingChallan(dc)}
                          title="Print Challan A4"
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-lg text-[11px] flex items-center gap-1 transition"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print
                        </button>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(`Smart Agro Machinerys\n\nDelivery Challan: ${dc.challanNumber}\nCustomer: ${dc.party?.name || 'Customer'}\nFarmer/Delivery To: ${dc.farmer?.name || dc.party?.name || 'Customer'}\nMachine: ${dc.items?.[0]?.itemName || 'Equipment'}\nQuantity: ${dc.items?.[0]?.quantity || 1}\nDelivery Location: ${dc.deliveryLocation || dc.deliveryAddress || 'N/A'}\n\nThank you,\nSmart Agro Machinerys`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Share via WhatsApp"
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[11px] flex items-center gap-1 transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Share
                        </a>
                        <button
                          onClick={() => setDeletingChallan(dc)}
                          title="Delete Challan"
                          className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg text-[11px] flex items-center gap-1 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
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



      {/* View Modal */}
      {viewingChallan && (
        <ViewChallanModal
          challan={viewingChallan}
          onEdit={() => {
            setEditorModalChallan(viewingChallan);
            setViewingChallan(null);
          }}
          onDelete={() => {
            setDeletingChallan(viewingChallan);
            setViewingChallan(null);
          }}
          onClose={() => setViewingChallan(null)}
        />
      )}

      {/* Delete Modal */}
      {deletingChallan && (
        <DeleteChallanModal
          challan={deletingChallan}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeletingChallan(null)}
          loading={deleteLoading}
        />
      )}

    </div>
  );
};
