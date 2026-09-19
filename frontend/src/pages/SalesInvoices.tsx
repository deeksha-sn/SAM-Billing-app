import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import { FileText, Plus, Printer, Eye, Edit, Share2, Ban, Search, CheckCircle2, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { PrintInvoiceModal } from '../components/PrintInvoiceModal';
import { ViewInvoiceModal } from '../components/ViewInvoiceModal';
import { ShareInvoiceModal } from '../components/ShareInvoiceModal';
import { FullScreenBillingEngine } from '../components/FullScreenBillingEngine';

export const SalesInvoices: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Modals State
  const [showEditorModal, setShowEditorModal] = useState(searchParams.get('create') === 'true');
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [viewingInvoice, setViewingInvoice] = useState<any>(null);
  const [printingInvoice, setPrintingInvoice] = useState<any>(null);
  const [sharingInvoice, setSharingInvoice] = useState<any>(null);

  const loadInvoices = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest('/sales/invoices');
      const list = Array.isArray(res) ? res : res.invoices || [];
      setInvoices(list);
    } catch (err: any) {
      console.error('Error loading invoices:', err);
      setErrorMsg(err.message || 'Failed to load sales invoices from server');
    } finally {
      setLoading(false);
    }
  };

  const loadCompany = async () => {
    try {
      const res = await apiRequest('/settings/company');
      setCompany(res.company);
    } catch (err) {
      console.error('Error loading company profile:', err);
    }
  };

  useEffect(() => {
    loadInvoices();
    loadCompany();
  }, []);

  if (showEditorModal) {
    return (
      <FullScreenBillingEngine
        docType="INVOICE"
        editingDocId={editingInvoice?.id}
        onBack={() => {
          setShowEditorModal(false);
          setEditingInvoice(null);
          setSearchParams({});
        }}
        onSaved={(saved) => {
          setShowEditorModal(false);
          setEditingInvoice(null);
          setViewingInvoice(saved);
          setSearchParams({});
          loadInvoices();
        }}
      />
    );
  }

  // Actions
  const handleOpenCreate = () => {
    setEditingInvoice(null);
    setShowEditorModal(true);
  };

  const handleOpenEdit = (invoice: any) => {
    setEditingInvoice(invoice);
    setShowEditorModal(true);
  };

  const handleCancelInvoice = async (invoice: any) => {
    if (invoice.status === 'CANCELLED') {
      alert('Invoice is already cancelled');
      return;
    }

    if (!window.confirm(`Are you sure you want to cancel Invoice ${invoice.invoiceNumber}? Stock deduction will be reversed automatically.`)) {
      return;
    }

    try {
      await apiRequest(`/sales/invoices/${invoice.id}/cancel`, { method: 'POST' });
      alert(`Invoice ${invoice.invoiceNumber} cancelled successfully and stock restored!`);
      loadInvoices();
    } catch (err: any) {
      alert(`Error cancelling invoice: ${err.message}`);
    }
  };

  const handleDeleteInvoice = async (invoice: any) => {
    if (invoice.status !== 'DRAFT' && user?.role !== 'ADMIN') {
      alert('Only ADMIN users can permanently delete confirmed invoices');
      return;
    }

    const confirmMsg = `Are you sure you want to PERMANENTLY DELETE Invoice ${invoice.invoiceNumber}?\n\nWARNING: This will permanently remove this invoice record from the database and automatically reverse associated BOM/inventory stock, GST reports, customer ledgers, and payment allocations.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await apiRequest(`/sales/invoices/${invoice.id}`, { method: 'DELETE' });
      alert(`Invoice ${invoice.invoiceNumber} deleted permanently!`);
      loadInvoices();
    } catch (err: any) {
      alert(`Error deleting invoice: ${err.message}`);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase();
    const invNo = (inv.invoiceNumber || '').toLowerCase();
    const partyName = (inv.party?.name || '').toLowerCase();
    const status = (inv.status || '').toLowerCase();
    return invNo.includes(q) || partyName.includes(q) || status.includes(q);
  });

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      
      {/* Top Header & New Invoice Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" />
            <span>Sales & Tax Invoices</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, view, edit, print A4 Tax Invoices, and share with customers via WhatsApp
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={loadInvoices}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/20 transition w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Invoice</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by invoice number, customer name, or status..."
          className="w-full text-xs font-semibold text-slate-800 focus:outline-none"
        />
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs font-bold flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Loading sales invoices...</span>
          </div>
        ) : errorMsg ? (
          <div className="p-12 text-center space-y-3 bg-red-50/50">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
            <p className="text-red-800 font-bold text-sm">{errorMsg}</p>
            <button
              onClick={loadInvoices}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Loading
            </button>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-slate-600 font-bold text-sm">No sales invoices found</p>
            <p className="text-slate-400 text-xs">Click "+ New Invoice" to generate your first Tax Invoice.</p>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Invoice</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <th className="p-4">Invoice No.</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4 text-right">Grand Total</th>
                  <th className="p-4 text-center">Payment Status</th>
                  <th className="p-4 text-center">Invoice Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {filteredInvoices.map((inv) => {
                  const isDraft = inv.status === 'DRAFT';
                  const isCancelled = inv.status === 'CANCELLED';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 font-mono font-bold text-emerald-950">
                        {inv.invoiceNumber}
                      </td>
                      <td className="p-4 text-slate-600">
                        {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="p-4 text-slate-900 font-bold">
                        {inv.party?.name || 'Customer'}
                        {inv.party?.mobile && (
                          <span className="block text-[10px] text-slate-500 font-normal">{inv.party.mobile}</span>
                        )}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-slate-900 text-sm">
                        ₹{inv.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          inv.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                          inv.paymentStatus === 'PARTIALLY_PAID' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {inv.paymentStatus || 'UNPAID'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          isDraft ? 'bg-amber-100 text-amber-900' :
                          isCancelled ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-900'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* View */}
                          <button
                            onClick={() => setViewingInvoice(inv)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="View Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          {!isCancelled && (
                            <button
                              onClick={() => handleOpenEdit(inv)}
                              className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                              title="Edit Invoice"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Print */}
                          <button
                            onClick={() => setPrintingInvoice(inv)}
                            className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition"
                            title="Print A4 Tax Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Share */}
                          <button
                            onClick={() => setSharingInvoice(inv)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                            title="Share on WhatsApp / PDF"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {/* Cancel */}
                          {!isCancelled && (
                            <button
                              onClick={() => handleCancelInvoice(inv)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="Cancel Invoice"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Bill */}
                          {(isDraft || user?.role === 'ADMIN') && (
                            <button
                              onClick={() => handleDeleteInvoice(inv)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Bill Permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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



      {/* View Modal */}
      {viewingInvoice && (
        <ViewInvoiceModal
          invoice={viewingInvoice}
          company={company}
          onClose={() => setViewingInvoice(null)}
          onEdit={() => {
            const target = viewingInvoice;
            setViewingInvoice(null);
            handleOpenEdit(target);
          }}
          onPrint={() => {
            const target = viewingInvoice;
            setViewingInvoice(null);
            setPrintingInvoice(target);
          }}
          onShare={() => {
            const target = viewingInvoice;
            setViewingInvoice(null);
            setSharingInvoice(target);
          }}
          onDelete={() => {
            const target = viewingInvoice;
            setViewingInvoice(null);
            handleDeleteInvoice(target);
          }}
        />
      )}

      {/* Print Modal */}
      {printingInvoice && (
        <PrintInvoiceModal
          invoice={printingInvoice}
          company={company}
          onClose={() => setPrintingInvoice(null)}
        />
      )}

      {/* Share Modal */}
      {sharingInvoice && (
        <ShareInvoiceModal
          invoice={sharingInvoice}
          company={company}
          onClose={() => setSharingInvoice(null)}
          onPrint={() => {
            const target = sharingInvoice;
            setSharingInvoice(null);
            setPrintingInvoice(target);
          }}
        />
      )}

    </div>
  );
};
