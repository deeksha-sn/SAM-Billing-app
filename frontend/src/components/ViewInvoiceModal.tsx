import React from 'react';
import { X, Edit, Printer, Share2, Download, FileText, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface ViewInvoiceModalProps {
  invoice: any;
  company: any;
  onClose: () => void;
  onEdit: () => void;
  onPrint: () => void;
  onShare: () => void;
  onDelete?: () => void;
}

function numberToWords(num: number): string {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'Zero Rupees Only';

  function inWords(val: number): string {
    if (val < 20) return a[val];
    if (val < 100) return b[Math.floor(val / 10)] + (val % 10 !== 0 ? ' ' + a[val % 10] : ' ');
    if (val < 1000) return a[Math.floor(val / 100)] + 'Hundred ' + (val % 100 !== 0 ? inWords(val % 100) : '');
    if (val < 100000) return inWords(Math.floor(val / 1000)) + 'Thousand ' + (val % 1000 !== 0 ? inWords(val % 1000) : '');
    if (val < 10000000) return inWords(Math.floor(val / 100000)) + 'Lakh ' + (val % 100000 !== 0 ? inWords(val % 100000) : '');
    return inWords(Math.floor(val / 10000000)) + 'Crore ' + (val % 10000000 !== 0 ? inWords(val % 10000000) : '');
  }

  return inWords(n).trim() + ' Rupees Only';
}

export const ViewInvoiceModal: React.FC<ViewInvoiceModalProps> = ({
  invoice,
  company,
  onClose,
  onEdit,
  onPrint,
  onShare,
  onDelete,
}) => {
  if (!invoice) return null;

  const party = invoice.party || {};
  const isDraft = invoice.status === 'DRAFT';
  const isCancelled = invoice.status === 'CANCELLED';

  const handleDownloadPdf = () => {
    const element = document.getElementById('view-invoice-document');
    if (!element) return;

    const opt = {
      margin: 4,
      filename: `${invoice.invoiceNumber || 'Tax_Invoice'}.pdf`,
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
            <FileText className="w-6 h-6 text-emerald-400" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">{invoice.invoiceNumber}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  isDraft ? 'bg-amber-400 text-amber-950' :
                  isCancelled ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                }`}>
                  {invoice.status}
                </span>
              </div>
              <p className="text-xs text-slate-300">Issued to: <span className="font-semibold text-white">{party.name}</span> | Date: {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!isCancelled && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 text-slate-100 border border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-700 transition"
              >
                <Edit className="w-3.5 h-3.5 text-amber-400" />
                <span>Edit Invoice</span>
              </button>
            )}
            <button
              onClick={onPrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4</span>
            </button>
            <button
              onClick={onShare}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition shadow"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-600 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            {onDelete && (
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition shadow"
                title="Delete Bill Permanently"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Bill</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Summary Card Body */}
        <div className="p-6 overflow-y-auto space-y-6 bg-slate-50 flex-1">
          
          {/* Main Visual Invoice Sheet */}
          <div id="view-invoice-document" className="bg-white border-2 border-black rounded-lg p-5 shadow-sm space-y-4 text-xs">
            
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4">
              <div className="flex items-center gap-3">
                {company.logoUrl && (
                  <img src={company.logoUrl} alt="Company Logo" className="h-12 max-w-[120px] object-contain" />
                )}
                <div>
                  <h1 className="text-sm font-black text-black uppercase">{company.businessName || 'SMART AGRO MACHINERYS'}</h1>
                  <p className="text-[11px] text-gray-600">{company.address}</p>
                  <p className="text-[11px] text-gray-600">GSTIN: <span className="font-mono font-bold text-black">{company.gstin}</span></p>
                </div>
              </div>
              <div className="text-right text-[11px]">
                <p className="font-black text-sm text-emerald-950">TAX INVOICE</p>
                <p className="font-mono font-bold">{invoice.invoiceNumber}</p>
                <p className="text-gray-600">Date: {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</p>
              </div>
            </div>

            {/* Bill To & Ship To */}
            <div className="grid grid-cols-2 gap-4 border-b border-gray-300 pb-3 text-[11px]">
              <div>
                <p className="font-bold text-gray-500 uppercase text-[10px]">Billed To:</p>
                <p className="font-bold text-gray-900 text-xs">{party.name}</p>
                <p className="text-gray-700">{party.address || party.village}</p>
                <p className="text-gray-700">Mobile: <span className="font-mono">{party.mobile}</span></p>
                {party.gstin && <p className="font-bold">GSTIN: {party.gstin}</p>}
              </div>
              <div>
                <p className="font-bold text-gray-500 uppercase text-[10px]">Shipped To:</p>
                <p className="font-bold text-gray-900 text-xs">{party.name}</p>
                <p className="text-gray-700">{invoice.deliveryAddress || party.address || party.village}</p>
                <p className="text-gray-700">Place of Supply: <span className="font-semibold">{invoice.placeOfSupply || party.state}</span></p>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-y border-black font-bold text-slate-800">
                  <th className="p-2 text-center w-8">#</th>
                  <th className="p-2 text-left">Item Description</th>
                  <th className="p-2 text-center w-20">HSN</th>
                  <th className="p-2 text-right w-16">Qty</th>
                  <th className="p-2 text-right w-24">Price (₹)</th>
                  <th className="p-2 text-right w-24">GST</th>
                  <th className="p-2 text-right w-28">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item: any, idx: number) => {
                  const itemGst = (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);
                  return (
                    <tr key={item.id || idx} className="border-b border-gray-200">
                      <td className="p-2 text-center font-mono text-gray-500">{idx + 1}</td>
                      <td className="p-2 font-bold text-gray-900">
                        {item.itemName}
                        {item.serialNumber && <span className="block text-[10px] font-mono text-emerald-700">S/N: {item.serialNumber}</span>}
                      </td>
                      <td className="p-2 text-center font-mono">{item.hsnSac}</td>
                      <td className="p-2 text-right font-bold font-mono">{item.quantity}</td>
                      <td className="p-2 text-right font-mono">₹{item.rate.toFixed(2)}</td>
                      <td className="p-2 text-right font-mono text-[11px]">₹{itemGst.toFixed(2)} ({item.gstRate}%)</td>
                      <td className="p-2 text-right font-mono font-bold">₹{item.totalAmount.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals Summary */}
            <div className="flex justify-between items-start pt-2 border-t-2 border-black">
              <div className="space-y-1">
                <p className="font-bold text-gray-600 text-[10px]">Amount in Words:</p>
                <p className="font-bold text-gray-900 italic text-xs">{numberToWords(invoice.grandTotal)}</p>
              </div>
              <div className="text-right space-y-1 min-w-[200px]">
                <div className="flex justify-between text-gray-600">
                  <span>Sub Total:</span>
                  <span className="font-mono">₹{invoice.taxableAmount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Total Tax:</span>
                  <span className="font-mono">₹{((invoice.cgstAmount || 0) + (invoice.sgstAmount || 0) + (invoice.igstAmount || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-emerald-950 border-t border-gray-400 pt-1">
                  <span>Grand Total:</span>
                  <span className="font-mono">₹{invoice.grandTotal?.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
