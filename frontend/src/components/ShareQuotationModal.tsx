import React, { useState } from 'react';
import { X, MessageSquare, Copy, Download, Printer, Check, Share2 } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface ShareQuotationModalProps {
  quotation: any;
  company: any;
  onClose: () => void;
  onPrint: () => void;
}

export const ShareQuotationModal: React.FC<ShareQuotationModalProps> = ({
  quotation,
  company,
  onClose,
  onPrint,
}) => {
  if (!quotation) return null;

  const [copied, setCopied] = useState(false);
  const party = quotation.party || {};

  const validUntilStr = quotation.validityDate
    ? new Date(quotation.validityDate).toLocaleDateString('en-IN')
    : 'N/A';

  const messageText = `Smart Agro Machinerys

Quotation No: ${quotation.quotationNumber}

Customer: ${party.name || 'Valued Customer'}

Quotation Amount: ₹${quotation.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}

Valid Until: ${validUntilStr}

Thank you for your enquiry!`;

  const handleWhatsAppShare = () => {
    let cleanMobile = (party.mobile || '').replace(/\D/g, '');
    if (cleanMobile.length === 10) {
      cleanMobile = '91' + cleanMobile;
    }
    const encodedText = encodeURIComponent(messageText);
    const whatsappUrl = cleanMobile
      ? `https://wa.me/${cleanMobile}?text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(whatsappUrl, '_blank');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPdf = () => {
    const element = document.getElementById('printable-quotation-area');
    if (!element) {
      alert('Please open Print Preview to generate PDF');
      return;
    }

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-gray-100">
        
        {/* Modal Title */}
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center gap-2 text-gray-900 font-bold">
            <Share2 className="w-5 h-5 text-emerald-600" />
            <h3>Share Quotation</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-lg p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quotation Summary Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs font-mono text-slate-800">
          <p className="font-bold text-slate-900 text-sm">{quotation.quotationNumber}</p>
          <p>Customer: <span className="font-bold">{party.name}</span></p>
          <p>Amount: <span className="font-bold text-emerald-700">₹{quotation.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></p>
          <p>Valid Until: <span className="font-semibold text-slate-700">{validUntilStr}</span></p>
        </div>

        {/* Share Action Grid */}
        <div className="grid grid-cols-2 gap-3">
          
          {/* WhatsApp Share */}
          <button
            onClick={handleWhatsAppShare}
            className="flex flex-col items-center justify-center p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-800 transition text-center space-y-1.5 group"
          >
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs">Share on WhatsApp</span>
            <span className="text-[10px] text-emerald-700">Direct Message</span>
          </button>

          {/* Copy Summary */}
          <button
            onClick={handleCopyText}
            className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-800 transition text-center space-y-1.5 group"
          >
            <div className="w-10 h-10 bg-slate-700 text-white rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition">
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </div>
            <span className="font-bold text-xs">{copied ? 'Copied!' : 'Copy Details'}</span>
            <span className="text-[10px] text-slate-500">Copy to clipboard</span>
          </button>

          {/* Download PDF */}
          <button
            onClick={handleDownloadPdf}
            className="flex flex-col items-center justify-center p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-indigo-800 transition text-center space-y-1.5 group"
          >
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition">
              <Download className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs">Download PDF</span>
            <span className="text-[10px] text-indigo-700">A4 Quotation PDF</span>
          </button>

          {/* Print */}
          <button
            onClick={() => {
              onClose();
              onPrint();
            }}
            className="flex flex-col items-center justify-center p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-amber-900 transition text-center space-y-1.5 group"
          >
            <div className="w-10 h-10 bg-amber-600 text-white rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition">
              <Printer className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs">Print Quotation</span>
            <span className="text-[10px] text-amber-700">Print preview</span>
          </button>

        </div>

      </div>
    </div>
  );
};
