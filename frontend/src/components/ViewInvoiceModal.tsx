import React, { useState } from 'react';
import { X, Edit, Printer, Share2, Download, FileText, Trash2, MessageSquare } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { TemplateCustomizerToolbar } from './TemplateCustomizerToolbar';
import { BillFieldsConfig, DEFAULT_INVOICE_FIELDS, BillTemplate } from '../types/billTemplate';

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

  const [fieldConfig, setFieldConfig] = useState<BillFieldsConfig>(DEFAULT_INVOICE_FIELDS);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  const party = invoice.party || {};
  const isDraft = invoice.status === 'DRAFT';
  const isCancelled = invoice.status === 'CANCELLED';
  const cfg = fieldConfig;

  // Build WhatsApp text based on visible fields
  const whatsappPhone = party.mobile ? String(party.mobile).replace(/\D/g, '') : '';
  const formattedPhone = whatsappPhone.length === 10 ? `91${whatsappPhone}` : whatsappPhone;

  let whatsappMsg = `Smart Agro Machinerys\n\n`;
  if (cfg.showDocNumber) whatsappMsg += `Invoice No: ${invoice.invoiceNumber}\n`;
  if (cfg.showCustomerName) whatsappMsg += `Customer: ${party.name || 'Customer'}\n`;
  if (cfg.showTotalAmount) whatsappMsg += `Invoice Amount: ₹${(invoice.grandTotal || 0).toLocaleString('en-IN')}\n`;
  if (cfg.showDueDate) whatsappMsg += `Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'Immediate'}\n`;
  whatsappMsg += `\nThank you for your business!`;

  const whatsappUrl = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(whatsappMsg)}`
    : `https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`;

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

  // Parse terms snapshot
  let termsList: string[] = [];
  if (invoice.termsSnapshot) {
    try {
      if (typeof invoice.termsSnapshot === 'string' && invoice.termsSnapshot.startsWith('[')) {
        termsList = JSON.parse(invoice.termsSnapshot);
      } else if (Array.isArray(invoice.termsSnapshot)) {
        termsList = invoice.termsSnapshot;
      } else if (typeof invoice.termsSnapshot === 'string') {
        termsList = [invoice.termsSnapshot];
      }
    } catch {
      termsList = [String(invoice.termsSnapshot)];
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col my-4 max-h-[94vh] border border-gray-200 overflow-hidden">
        
        {/* Top Header Action Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap justify-between items-center gap-3 border-b border-slate-800">
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
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition shadow"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
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

        {/* Template Customizer Toolbar Bar */}
        <div className="px-6 py-2 bg-slate-900 border-b border-slate-800">
          <TemplateCustomizerToolbar
            documentType="INVOICE"
            activeConfig={fieldConfig}
            onChangeConfig={setFieldConfig}
            activeTemplateId={activeTemplateId}
            onSelectTemplate={(tmpl: BillTemplate) => setActiveTemplateId(tmpl.id)}
          />
        </div>

        {/* Live Bill Sheet */}
        <div className="p-6 overflow-y-auto space-y-6 bg-slate-100 flex-1">
          
          <div id="view-invoice-document" className="bg-white border-2 border-black rounded-lg p-6 shadow-sm space-y-4 text-xs">
            
            {/* Header / Company Info */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4">
              <div className="flex items-center gap-3">
                {cfg.showLogo && company.logoUrl && (
                  <img src={company.logoUrl} alt="Company Logo" className="h-12 max-w-[120px] object-contain" />
                )}
                <div>
                  <h1 className="text-sm font-black text-black uppercase">{company.businessName || 'SMART AGRO MACHINERYS'}</h1>
                  {cfg.showCompanyContact && (
                    <>
                      <p className="text-[11px] text-gray-600">{company.address}</p>
                      <p className="text-[11px] text-gray-600">Ph: {company.phone} | GSTIN: <span className="font-mono font-bold text-black">{company.gstin}</span></p>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right text-[11px]">
                <p className="font-black text-sm text-emerald-950">TAX INVOICE</p>
                {cfg.showDocNumber && <p className="font-mono font-bold">{invoice.invoiceNumber}</p>}
                {cfg.showDate && <p className="text-gray-600">Date: {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</p>}
                {cfg.showDueDate && invoice.dueDate && (
                  <p className="text-gray-600">Due: {new Date(invoice.dueDate).toLocaleDateString('en-IN')}</p>
                )}
              </div>
            </div>

            {/* References Bar (PO, E-Way Bill, Transport, Vehicle) */}
            {(cfg.showPoNumber || cfg.showPoDate || cfg.showEwayBill || cfg.showTransport || cfg.showVehicleNumber) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2 rounded border border-gray-300 text-[10px]">
                {cfg.showPoNumber && invoice.poNumber && <div><span className="font-bold">PO No:</span> {invoice.poNumber}</div>}
                {cfg.showPoDate && invoice.poDate && <div><span className="font-bold">PO Date:</span> {new Date(invoice.poDate).toLocaleDateString('en-IN')}</div>}
                {cfg.showEwayBill && invoice.ewayBillNo && <div><span className="font-bold">E-Way Bill:</span> {invoice.ewayBillNo}</div>}
                {cfg.showTransport && invoice.transportName && <div><span className="font-bold">Transport:</span> {invoice.transportName}</div>}
                {cfg.showVehicleNumber && invoice.vehicleNumber && <div><span className="font-bold">Vehicle:</span> {invoice.vehicleNumber}</div>}
              </div>
            )}

            {/* Bill To & Ship To */}
            <div className="grid grid-cols-2 gap-4 border-b border-gray-300 pb-3 text-[11px]">
              <div>
                <p className="font-bold text-gray-500 uppercase text-[10px]">Billed To:</p>
                {cfg.showCustomerName && <p className="font-bold text-gray-900 text-xs">{party.name}</p>}
                {cfg.showBillingAddress && <p className="text-gray-700">{party.address || party.village}</p>}
                <p className="text-gray-700">Mobile: <span className="font-mono">{party.mobile}</span></p>
                {cfg.showGstin && party.gstin && <p className="font-bold">GSTIN: {party.gstin}</p>}
              </div>
              <div>
                <p className="font-bold text-gray-500 uppercase text-[10px]">Shipped / Delivered To:</p>
                {cfg.showCustomerName && <p className="font-bold text-gray-900 text-xs">{party.name}</p>}
                {cfg.showShippingAddress && <p className="text-gray-700">{invoice.deliveryAddress || party.address || party.village}</p>}
                {cfg.showDeliveryLocation && invoice.deliveryLocation && <p className="text-gray-700">Location: {invoice.deliveryLocation}</p>}
                {cfg.showPlaceOfSupply && <p className="text-gray-700">Place of Supply: <span className="font-semibold">{invoice.placeOfSupply || party.state}</span></p>}
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-y border-black font-bold text-slate-800">
                  <th className="p-2 text-center w-8">#</th>
                  {cfg.showItemName && <th className="p-2 text-left">Item Description</th>}
                  {cfg.showHsn && <th className="p-2 text-center w-20">HSN</th>}
                  {cfg.showQuantity && <th className="p-2 text-right w-14">Qty</th>}
                  {cfg.showFreeQuantity && <th className="p-2 text-right w-14">Free</th>}
                  {cfg.showUnit && <th className="p-2 text-center w-14">Unit</th>}
                  {cfg.showRate && <th className="p-2 text-right w-20">Price (₹)</th>}
                  {cfg.showDiscount && <th className="p-2 text-right w-16">Disc</th>}
                  {cfg.showGstRate && <th className="p-2 text-right w-16">GST %</th>}
                  {cfg.showTaxAmount && <th className="p-2 text-right w-20">Tax (₹)</th>}
                  {cfg.showTotalAmount && <th className="p-2 text-right w-24">Amount (₹)</th>}
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item: any, idx: number) => {
                  const itemGst = (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);
                  return (
                    <tr key={item.id || idx} className="border-b border-gray-200">
                      <td className="p-2 text-center font-mono text-gray-500">{idx + 1}</td>
                      {cfg.showItemName && (
                        <td className="p-2 font-bold text-gray-900">
                          {item.itemName}
                          {cfg.showDescription && item.description && <span className="block text-[10px] text-gray-600 font-normal">{item.description}</span>}
                          {cfg.showSerialNumber && item.serialNumber && <span className="block text-[10px] font-mono text-emerald-700">S/N: {item.serialNumber}</span>}
                        </td>
                      )}
                      {cfg.showHsn && <td className="p-2 text-center font-mono">{item.hsnSac}</td>}
                      {cfg.showQuantity && <td className="p-2 text-right font-bold font-mono">{item.quantity}</td>}
                      {cfg.showFreeQuantity && <td className="p-2 text-right font-mono text-gray-500">{item.freeQuantity || 0}</td>}
                      {cfg.showUnit && <td className="p-2 text-center text-gray-600">{item.unit || 'Nos'}</td>}
                      {cfg.showRate && <td className="p-2 text-right font-mono">₹{item.rate.toFixed(2)}</td>}
                      {cfg.showDiscount && <td className="p-2 text-right font-mono">₹{(item.discountAmount || 0).toFixed(2)}</td>}
                      {cfg.showGstRate && <td className="p-2 text-right font-mono">{item.gstRate}%</td>}
                      {cfg.showTaxAmount && <td className="p-2 text-right font-mono text-[11px]">₹{itemGst.toFixed(2)}</td>}
                      {cfg.showTotalAmount && <td className="p-2 text-right font-mono font-bold">₹{item.totalAmount.toFixed(2)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* HSN/SAC Tax Breakdown Summary Table */}
            <div className="mt-3 mb-2">
              <p className="font-bold text-[10px] uppercase tracking-wider mb-1 text-slate-700">GST Tax Breakdown (HSN/SAC Summary)</p>
              <table className="w-full text-[10px] border border-gray-300 text-center border-collapse">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b border-gray-300">
                    <th className="border-r border-gray-300 p-1">HSN/SAC</th>
                    <th className="border-r border-gray-300 p-1 text-right">Taxable Amount</th>
                    {!invoice.isInterState ? (
                      <>
                        <th className="border-r border-gray-300 p-1 text-right">CGST Rate</th>
                        <th className="border-r border-gray-300 p-1 text-right">CGST Amt</th>
                        <th className="border-r border-gray-300 p-1 text-right">SGST Rate</th>
                        <th className="border-r border-gray-300 p-1 text-right">SGST Amt</th>
                      </>
                    ) : (
                      <>
                        <th className="border-r border-gray-300 p-1 text-right">IGST Rate</th>
                        <th className="border-r border-gray-300 p-1 text-right">IGST Amt</th>
                      </>
                    )}
                    <th className="p-1 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const hsnMap: { [hsn: string]: { taxable: number; cgstRate: number; cgstAmount: number; sgstRate: number; sgstAmount: number; igstRate: number; igstAmount: number; totalTax: number } } = {};
                    (invoice.items || []).forEach((item: any) => {
                      const hsn = item.hsnSac || '8436';
                      const gstRate = item.gstRate || 0;
                      const isExempt = item.isExempt || gstRate === 0;
                      if (!hsnMap[hsn]) {
                        hsnMap[hsn] = {
                          taxable: 0,
                          cgstRate: !invoice.isInterState && !isExempt ? gstRate / 2 : 0,
                          cgstAmount: 0,
                          sgstRate: !invoice.isInterState && !isExempt ? gstRate / 2 : 0,
                          sgstAmount: 0,
                          igstRate: invoice.isInterState && !isExempt ? gstRate : 0,
                          igstAmount: 0,
                          totalTax: 0,
                        };
                      }
                      hsnMap[hsn].taxable += item.taxableValue || 0;
                      hsnMap[hsn].cgstAmount += item.cgstAmount || 0;
                      hsnMap[hsn].sgstAmount += item.sgstAmount || 0;
                      hsnMap[hsn].igstAmount += item.igstAmount || 0;
                      hsnMap[hsn].totalTax += (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);
                    });

                    return Object.entries(hsnMap).map(([hsn, data]) => (
                      <tr key={hsn} className="border-b border-gray-200">
                        <td className="border-r border-gray-300 p-1 font-mono font-bold">{hsn}</td>
                        <td className="border-r border-gray-300 p-1 text-right font-mono">₹{data.taxable.toFixed(2)}</td>
                        {!invoice.isInterState ? (
                          <>
                            <td className="border-r border-gray-300 p-1 text-right font-mono">{data.cgstRate}%</td>
                            <td className="border-r border-gray-300 p-1 text-right font-mono">₹{data.cgstAmount.toFixed(2)}</td>
                            <td className="border-r border-gray-300 p-1 text-right font-mono">{data.sgstRate}%</td>
                            <td className="border-r border-gray-300 p-1 text-right font-mono">₹{data.sgstAmount.toFixed(2)}</td>
                          </>
                        ) : (
                          <>
                            <td className="border-r border-gray-300 p-1 text-right font-mono">{data.igstRate}%</td>
                            <td className="border-r border-gray-300 p-1 text-right font-mono">₹{data.igstAmount.toFixed(2)}</td>
                          </>
                        )}
                        <td className="p-1 text-right font-mono font-bold">₹{data.totalTax.toFixed(2)}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="flex justify-between items-start pt-2 border-t-2 border-black gap-4">
              <div className="space-y-2 flex-1">
                {cfg.showAmountInWords && (
                  <div>
                    <p className="font-bold text-gray-600 text-[10px]">Amount in Words:</p>
                    <p className="font-bold text-gray-900 italic text-xs">{numberToWords(invoice.grandTotal)}</p>
                  </div>
                )}

                {cfg.showPaymentMode && (
                  <p className="text-[11px] text-gray-700">Payment Mode: <span className="font-bold">{invoice.paymentMode || 'Credit'}</span></p>
                )}

                {cfg.showBankDetails && company.bankName && (
                  <div className="bg-slate-50 p-2 rounded border border-gray-300 text-[10px] space-y-0.5">
                    <p className="font-bold text-slate-800 uppercase">Bank Account Details:</p>
                    <p>Bank: <span className="font-bold">{company.bankName}</span> | A/C: <span className="font-mono font-bold">{company.bankAccountNo}</span></p>
                    <p>IFSC: <span className="font-mono">{company.ifsc}</span> | UPI ID: <span className="font-mono">{company.upiId}</span></p>
                  </div>
                )}

                {cfg.showNotes && invoice.notes && (
                  <div className="text-[10px]">
                    <span className="font-bold text-gray-600">Notes: </span>
                    <span className="text-gray-800">{invoice.notes}</span>
                  </div>
                )}
              </div>

              <div className="text-right space-y-1 min-w-[220px]">
                <div className="flex justify-between text-gray-600">
                  <span>Sub Total:</span>
                  <span className="font-mono">₹{invoice.taxableAmount?.toFixed(2)}</span>
                </div>

                {!invoice.isInterState ? (
                  <>
                    {cfg.showCgst && (
                      <div className="flex justify-between text-gray-600">
                        <span>CGST:</span>
                        <span className="font-mono">₹{(invoice.cgstAmount || 0).toFixed(2)}</span>
                      </div>
                    )}

                    {cfg.showSgst && (
                      <div className="flex justify-between text-gray-600">
                        <span>SGST:</span>
                        <span className="font-mono">₹{(invoice.sgstAmount || 0).toFixed(2)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {cfg.showIgst && (
                      <div className="flex justify-between text-gray-600">
                        <span>IGST:</span>
                        <span className="font-mono">₹{(invoice.igstAmount || 0).toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}

                {cfg.showTaxAmount && (
                  <div className="flex justify-between text-gray-600">
                    <span>Total Tax:</span>
                    <span className="font-mono">₹{((invoice.cgstAmount || 0) + (invoice.sgstAmount || 0) + (invoice.igstAmount || 0)).toFixed(2)}</span>
                  </div>
                )}

                {cfg.showTotalAmount && (
                  <div className="flex justify-between font-black text-sm text-emerald-950 border-t border-gray-400 pt-1">
                    <span>Grand Total:</span>
                    <span className="font-mono">₹{invoice.grandTotal?.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Terms & Signature */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-300 text-[10px]">
              <div>
                {cfg.showTerms && termsList.length > 0 && (
                  <div>
                    <p className="font-bold text-gray-700 uppercase mb-1">Terms & Conditions:</p>
                    <ul className="list-disc pl-3 text-gray-600 space-y-0.5">
                      {termsList.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="text-right flex flex-col justify-end items-end">
                {cfg.showSignature && (
                  <div className="space-y-8 pt-4">
                    <p className="font-bold text-gray-800">For {company.businessName || 'SMART AGRO MACHINERYS'}</p>
                    <p className="border-t border-black pt-1 font-bold text-gray-700 uppercase">Authorised Signatory</p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
