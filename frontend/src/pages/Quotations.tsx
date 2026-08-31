import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import { useAuth } from '../context/AuthContext';
import { Layers, Plus, Printer, Eye, Edit, Share2, Search, CheckCircle2, AlertCircle, RefreshCw, Trash2, ArrowRightLeft } from 'lucide-react';
import { PrintQuotationModal } from '../components/PrintQuotationModal';
import { ViewQuotationModal } from '../components/ViewQuotationModal';
import { ShareQuotationModal } from '../components/ShareQuotationModal';
import { DeleteQuotationModal } from '../components/DeleteQuotationModal';
import { FullScreenBillingEngine } from '../components/FullScreenBillingEngine';

export const Quotations: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [quotations, setQuotations] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Active Modals State
  const [showEditorModal, setShowEditorModal] = useState(searchParams.get('create') === 'true');
  const [editingQuotation, setEditingQuotation] = useState<any>(null);
  const [viewingQuotation, setViewingQuotation] = useState<any>(null);
  const [printingQuotation, setPrintingQuotation] = useState<any>(null);
  const [sharingQuotation, setSharingQuotation] = useState<any>(null);
  const [deletingQuotation, setDeletingQuotation] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  if (showEditorModal) {
    return (
      <FullScreenBillingEngine
        docType="QUOTATION"
        editingDocId={editingQuotation?.id}
        onBack={() => {
          setShowEditorModal(false);
          setEditingQuotation(null);
          setSearchParams({});
        }}
        onSaved={(saved) => {
          setShowEditorModal(false);
          setEditingQuotation(null);
          setSearchParams({});
          loadQuotations();
        }}
      />
    );
  }

  useEffect(() => {
    loadQuotations();
    loadCompany();
  }, []);

  const loadQuotations = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/quotations');
      setQuotations(res.quotations || []);
    } catch (err) {
      console.error('Error loading quotations:', err);
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

  // Actions
  const handleOpenCreate = () => {
    setEditingQuotation(null);
    setShowEditorModal(true);
  };

  const handleOpenEdit = (quotation: any) => {
    setEditingQuotation(quotation);
    setShowEditorModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingQuotation) return;
    setActionLoading(true);

    try {
      await apiRequest(`/quotations/${deletingQuotation.id}`, { method: 'DELETE' });
      alert(`Quotation ${deletingQuotation.quotationNumber} deleted permanently!`);
      setDeletingQuotation(null);
      if (viewingQuotation?.id === deletingQuotation.id) {
        setViewingQuotation(null);
      }
      loadQuotations();
    } catch (err: any) {
      alert(`Error deleting quotation: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToInvoice = async (quotation: any) => {
    if (!window.confirm(`Convert Quotation ${quotation.quotationNumber} to a Sales Invoice? A NEW Sales Invoice number will be generated.`)) {
      return;
    }

    try {
      const res = await apiRequest(`/quotations/${quotation.id}/convert-to-invoice`, {
        method: 'POST',
        body: JSON.stringify({ invoiceStatus: 'CONFIRMED' }),
      });

      alert(`Quotation ${quotation.quotationNumber} successfully converted to Sales Invoice ${res.invoice.invoiceNumber}!`);
      loadQuotations();
      // Navigate to Sales Invoices page with created invoice open
      navigate('/sales');
    } catch (err: any) {
      alert(`Error converting quotation: ${err.message}`);
    }
  };

  const filteredQuotations = quotations.filter((quo) => {
    const q = searchQuery.toLowerCase();
    const quoNo = (quo.quotationNumber || '').toLowerCase();
    const partyName = (quo.party?.name || '').toLowerCase();
    const status = (quo.status || '').toLowerCase();
    return quoNo.includes(q) || partyName.includes(q) || status.includes(q);
  });

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-600" />
            <span>Quotations & Estimates</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, view, edit, print A4 Quotations, and convert to Sales Invoices with 1-click
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={loadQuotations}
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
            <span>+ New Quotation</span>
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
          placeholder="Search by quotation number, customer name, or status..."
          className="flex-1 bg-transparent text-xs text-slate-900 focus:outline-none placeholder-slate-400 font-medium"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Quotations List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">All Quotations ({filteredQuotations.length})</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-semibold text-xs">
            Loading Quotations...
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <Layers className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No Quotations Found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery ? 'No quotations matched your search criteria.' : 'Create price estimates and proforma quotes for customers.'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleOpenCreate}
                className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow hover:bg-emerald-700 transition"
              >
                + Create First Quotation
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 pl-5">Quotation No</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Valid Until</th>
                  <th className="p-3.5">Customer Name</th>
                  <th className="p-3.5 text-right">Amount</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotations.map((quo) => {
                  const party = quo.party || {};
                  const isConverted = quo.status === 'CONVERTED';

                  return (
                    <tr key={quo.id} className="hover:bg-slate-50 transition-colors group">
                      
                      {/* Quotation No */}
                      <td className="p-3.5 pl-5 font-bold font-mono text-slate-900">
                        {quo.quotationNumber}
                      </td>

                      {/* Date */}
                      <td className="p-3.5 text-slate-600">
                        {new Date(quo.quotationDate).toLocaleDateString('en-IN')}
                      </td>

                      {/* Valid Until */}
                      <td className="p-3.5 font-semibold text-emerald-800">
                        {quo.validityDate ? new Date(quo.validityDate).toLocaleDateString('en-IN') : 'N/A'}
                      </td>

                      {/* Customer */}
                      <td className="p-3.5 font-semibold text-slate-900">
                        {party.name || 'N/A'}
                        <span className="block text-[10px] text-slate-500 font-normal">{party.mobile}</span>
                      </td>

                      {/* Amount */}
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                        ₹{(quo.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          isConverted ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                          'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {quo.status}
                        </span>
                      </td>

                      {/* Row Action Buttons */}
                      <td className="p-3.5 pr-5 text-right space-x-1">
                        
                        {/* View */}
                        <button
                          onClick={() => setViewingQuotation(quo)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                          title="View Quotation"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => handleOpenEdit(quo)}
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition"
                          title="Edit Quotation"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Convert to Invoice */}
                        {!isConverted && (
                          <button
                            onClick={() => handleConvertToInvoice(quo)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition"
                            title="Convert to Sales Invoice"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Print */}
                        <button
                          onClick={() => setPrintingQuotation(quo)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                          title="Print A4 Quotation"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Share */}
                        <button
                          onClick={() => setSharingQuotation(quo)}
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition"
                          title="Share Quotation"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeletingQuotation(quo)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition"
                          title="Delete Quotation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

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
      {viewingQuotation && (
        <ViewQuotationModal
          quotation={viewingQuotation}
          company={company}
          onClose={() => setViewingQuotation(null)}
          onEdit={() => {
            const q = viewingQuotation;
            setViewingQuotation(null);
            handleOpenEdit(q);
          }}
          onPrint={() => {
            const q = viewingQuotation;
            setViewingQuotation(null);
            setPrintingQuotation(q);
          }}
          onShare={() => {
            const q = viewingQuotation;
            setViewingQuotation(null);
            setSharingQuotation(q);
          }}
          onConvert={() => {
            const q = viewingQuotation;
            setViewingQuotation(null);
            handleConvertToInvoice(q);
          }}
          onDelete={() => {
            const q = viewingQuotation;
            setDeletingQuotation(q);
          }}
        />
      )}

      {/* Print Modal */}
      {printingQuotation && (
        <PrintQuotationModal
          quotation={printingQuotation}
          company={company}
          onClose={() => setPrintingQuotation(null)}
        />
      )}

      {/* Share Modal */}
      {sharingQuotation && (
        <ShareQuotationModal
          quotation={sharingQuotation}
          company={company}
          onClose={() => setSharingQuotation(null)}
          onPrint={() => {
            const q = sharingQuotation;
            setSharingQuotation(null);
            setPrintingQuotation(q);
          }}
        />
      )}

      {/* Delete Modal */}
      {deletingQuotation && (
        <DeleteQuotationModal
          quotation={deletingQuotation}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeletingQuotation(null)}
          loading={actionLoading}
        />
      )}

    </div>
  );
};
