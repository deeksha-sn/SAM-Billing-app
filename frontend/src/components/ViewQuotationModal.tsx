import React from 'react';
import { X, Edit, Printer, Share2, Download, Layers, Trash2, ArrowRightLeft, FileText } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface ViewQuotationModalProps {
  quotation: any;
  company: any;
  onClose: () => void;
  onEdit: () => void;
  onPrint: () => void;
  onShare: () => void;
  onConvert: () => void;
  onDelete: () => void;
}

export const ViewQuotationModal: React.FC<ViewQuotationModalProps> = ({
  quotation,
  company,
  onClose,
  onEdit,
  onPrint,
  onShare,
  onConvert,
  onDelete,
}) => {
  if (!quotation) return null;

  const party = quotation.party || {};
  const isConverted = quotation.status === 'CONVERTED';

  const handleDownloadPdf = () => {
    const element = document.getElementById('view-quotation-document');
    if (!element) return;

    const opt = {
      margin: 4,
      filename: `${quotation.quotationNumber || 'Quotation'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col my-4 max-h-[92vh] border border-gray-200 overflow-hidden">
        
        {/* Top Header Action Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-emerald-400" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">{quotation.quotationNumber}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  isConverted ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'
                }`}>
                  {quotation.status}
                </span>
              </div>
              <p className="text-xs text-slate-300">Quotation for: <span className="font-semibold text-white">{party.name}</span> | Date: {new Date(quotation.quotationDate).toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-100 border border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-700 transition"
            >
              <Edit className="w-3.5 h-3.5 text-amber-400" />
              <span>Edit Quotation</span>
            </button>

            {!isConverted && (
              <button
                onClick={onConvert}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition shadow"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Convert to Invoice</span>
              </button>
            )}

            <button
              onClick={onPrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-600 transition"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Print A4</span>
            </button>

            <button
              onClick={onShare}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition shadow"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition shadow"
              title="Delete Quotation"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quotation View Card Body */}
        <div className="p-6 overflow-y-auto space-y-6 bg-slate-50 flex-1" id="view-quotation-document">
          
          {/* Customer & Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1 text-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer Details</p>
              <p className="font-bold text-slate-900 text-sm">{party.name}</p>
              <p className="text-slate-600">{party.address || party.village}</p>
              <p className="text-slate-600">Mobile: <span className="font-semibold text-slate-900">{party.mobile}</span></p>
              {party.gstin && <p className="text-slate-600">GSTIN: <span className="font-semibold text-slate-900">{party.gstin}</span></p>}
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5 text-xs font-mono">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Quotation Meta</p>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500 font-sans">Quotation No:</span>
                <span className="font-bold text-slate-900">{quotation.quotationNumber}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500 font-sans">Quotation Date:</span>
                <span className="font-semibold">{new Date(quotation.quotationDate).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-slate-500 font-sans">Valid Until:</span>
                <span className="font-semibold text-emerald-700">{quotation.validityDate ? new Date(quotation.validityDate).toLocaleDateString('en-IN') : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Status:</span>
                <span className="font-bold uppercase text-emerald-600">{quotation.status}</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-xs text-slate-800 uppercase tracking-wider">
              Quotation Items & Pricing
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">Item Name</th>
                  <th className="p-3 text-center">HSN/SAC</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Price / Unit</th>
                  <th className="p-3 text-right">GST %</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(quotation.items || []).map((item: any, idx: number) => (
                  <tr key={item.id || idx}>
                    <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-semibold text-slate-900">{item.itemName}</td>
                    <td className="p-3 text-center font-mono text-slate-600">{item.hsnSac}</td>
                    <td className="p-3 text-center font-bold text-slate-900">{item.quantity}</td>
                    <td className="p-3 text-right font-mono text-slate-800">₹{item.rate?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right font-mono text-slate-600">{item.gstRate}%</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">₹{item.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total Summary */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-xs font-bold text-emerald-950 uppercase">Total Estimated Amount</p>
              <p className="text-xs text-emerald-800 mt-0.5">Includes all applicable GST taxes & discounts</p>
            </div>
            <div className="text-right font-mono">
              <span className="text-2xl font-black text-emerald-900">₹{(quotation.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
