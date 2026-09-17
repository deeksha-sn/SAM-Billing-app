import React, { useState } from 'react';
import { Printer, Download, X } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { TemplateCustomizerToolbar } from './TemplateCustomizerToolbar';
import { BillFieldsConfig, DEFAULT_INVOICE_FIELDS, BillTemplate } from '../types/billTemplate';

interface PrintInvoiceModalProps {
  invoice: any;
  company: any;
  onClose: () => void;
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

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({ invoice, company, onClose }) => {
  if (!invoice || !company) return null;

  const [fieldConfig, setFieldConfig] = useState<BillFieldsConfig>(() => {
    if (invoice?.fieldsConfigSnapshot) {
      try {
        return typeof invoice.fieldsConfigSnapshot === 'string'
          ? JSON.parse(invoice.fieldsConfigSnapshot)
          : invoice.fieldsConfigSnapshot;
      } catch (err) {
        console.error('Failed to parse invoice fieldsConfigSnapshot:', err);
      }
    }
    return DEFAULT_INVOICE_FIELDS;
  });
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(invoice?.billTemplateId || null);

  const party = invoice.party || {};
  const isInter = invoice.isInterState;
  const items = invoice.items || [];
  const cfg = fieldConfig;

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

  if (termsList.length === 0) {
    termsList = [
      '1.Company is not responsible for transportation damages.',
      '2.No replacement, No onsite service, No exchange.',
      '3.Extra charge aplicable for spare parts.',
      '4.Goods once sold are cannot be taken back at any conditions.',
      'Subjected to Banglore Jurisdiction only.',
      'Thanks for doing business with us!',
    ];
  }

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const element = document.getElementById('printable-area');
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-2 md:p-4 overflow-y-auto">
      <div className="bg-gray-100 rounded-xl shadow-2xl max-w-5xl w-full p-4 my-4 max-h-[96vh] flex flex-col">
        
        {/* Print specific CSS embedded for exact A4 rendering */}
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 6mm 6mm 6mm 6mm;
            }
            html, body {
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print, header, nav, sidebar, button {
              display: none !important;
            }
            #printable-area {
              display: block !important;
              visibility: visible !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 198mm !important;
              margin: 0 auto !important;
              padding: 4mm !important;
              background: #ffffff !important;
              box-shadow: none !important;
              border: 2px solid #000000 !important;
              box-sizing: border-box !important;
            }
          }
        `}</style>

        {/* Action Header */}
        <div className="no-print bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-black uppercase tracking-wider">A4 Tax Invoice Print Preview</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Document</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Save PDF</span>
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Customizer Toolbar */}
        <div className="no-print mb-3">
          <TemplateCustomizerToolbar
            documentType="INVOICE"
            activeConfig={fieldConfig}
            onChangeConfig={setFieldConfig}
            activeTemplateId={activeTemplateId}
            onSelectTemplate={(tmpl: BillTemplate) => setActiveTemplateId(tmpl.id)}
          />
        </div>

        {/* Print Preview Container */}
        <div className="flex-1 overflow-y-auto bg-gray-200 p-4 rounded-xl flex justify-center">
          
          <div
            id="printable-area"
            className="bg-white border-2 border-black p-6 w-[210mm] min-h-[297mm] shadow-lg flex flex-col justify-between text-[11px] leading-tight font-sans text-black"
          >
            <div className="space-y-4">
              
              {/* Top Header */}
              <div className="flex justify-between items-start border-b-2 border-black pb-3">
                <div className="flex items-center gap-3">
                  {cfg.showLogo && company.logoUrl && (
                    <img src={company.logoUrl} alt="Company Logo" className="h-14 max-w-[130px] object-contain" />
                  )}
                  <div>
                    <h1 className="text-base font-black text-black uppercase tracking-tight">{company.businessName || 'SMART AGRO MACHINERYS'}</h1>
                    {cfg.showCompanyContact && (
                      <>
                        <p className="text-[10px] text-gray-700">{company.address}</p>
                        <p className="text-[10px] text-gray-700">Ph: {company.phone} | Email: {company.email}</p>
                        <p className="text-[10px] font-bold">GSTIN: <span className="font-mono">{company.gstin}</span> | State: {company.state} ({company.stateCode})</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right border-l-2 border-black pl-4">
                  <h2 className="text-sm font-black uppercase text-emerald-950">TAX INVOICE</h2>
                  {cfg.showDocNumber && <p className="font-mono font-bold text-xs">{invoice.invoiceNumber}</p>}
                  {cfg.showDate && <p className="text-[10px]">Date: {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</p>}
                  {cfg.showDueDate && invoice.dueDate && (
                    <p className="text-[10px]">Due Date: {new Date(invoice.dueDate).toLocaleDateString('en-IN')}</p>
                  )}
                </div>
              </div>

              {/* References Bar (PO, E-Way Bill, Transport, Vehicle) */}
              {(cfg.showPoNumber || cfg.showPoDate || cfg.showEwayBill || cfg.showTransport || cfg.showVehicleNumber) && (
                <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2 rounded border border-black text-[10px]">
                  {cfg.showPoNumber && invoice.poNumber && <div><span className="font-bold">PO No:</span> {invoice.poNumber}</div>}
                  {cfg.showPoDate && invoice.poDate && <div><span className="font-bold">PO Date:</span> {new Date(invoice.poDate).toLocaleDateString('en-IN')}</div>}
                  {cfg.showEwayBill && invoice.ewayBillNo && <div><span className="font-bold">E-Way Bill:</span> {invoice.ewayBillNo}</div>}
                  {cfg.showTransport && invoice.transportName && <div><span className="font-bold">Transporter:</span> {invoice.transportName}</div>}
                  {cfg.showVehicleNumber && invoice.vehicleNumber && <div><span className="font-bold">Vehicle:</span> {invoice.vehicleNumber}</div>}
                </div>
              )}

              {/* Bill To & Ship To */}
              <div className="grid grid-cols-2 gap-4 border-b border-black pb-3 text-[11px]">
                <div className="space-y-0.5">
                  <p className="font-bold uppercase text-[9px] text-gray-600">Details of Receiver (Billed To):</p>
                  {cfg.showCustomerName && <p className="font-bold text-xs">{party.name}</p>}
                  {cfg.showBillingAddress && <p>{party.address || party.village}</p>}
                  <p>Mobile: <span className="font-mono">{party.mobile}</span></p>
                  {cfg.showGstin && party.gstin && <p className="font-bold">GSTIN: {party.gstin}</p>}
                  {cfg.showPlaceOfSupply && <p>State: {party.state} ({party.stateCode})</p>}
                </div>

                <div className="space-y-0.5 border-l border-gray-300 pl-4">
                  <p className="font-bold uppercase text-[9px] text-gray-600">Details of Consignee (Shipped To):</p>
                  {cfg.showCustomerName && <p className="font-bold text-xs">{party.name}</p>}
                  {cfg.showShippingAddress && <p>{invoice.deliveryAddress || party.address || party.village}</p>}
                  {cfg.showDeliveryLocation && invoice.deliveryLocation && <p>Location: {invoice.deliveryLocation}</p>}
                  {cfg.showPlaceOfSupply && <p>Place of Supply: <span className="font-semibold">{invoice.placeOfSupply || party.state}</span></p>}
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-[11px] border-collapse border border-black">
                <thead>
                  <tr className="bg-slate-200 border-b border-black font-bold text-black text-[10px]">
                    <th className="border border-black p-1.5 text-center w-6">#</th>
                    {cfg.showItemName && <th className="border border-black p-1.5 text-left">Item Description</th>}
                    {cfg.showHsn && <th className="border border-black p-1.5 text-center w-16">HSN/SAC</th>}
                    {cfg.showQuantity && <th className="border border-black p-1.5 text-right w-12">Qty</th>}
                    {cfg.showFreeQuantity && <th className="border border-black p-1.5 text-right w-12">Free</th>}
                    {cfg.showUnit && <th className="border border-black p-1.5 text-center w-12">Unit</th>}
                    {cfg.showRate && <th className="border border-black p-1.5 text-right w-20">Price (₹)</th>}
                    {cfg.showDiscount && <th className="border border-black p-1.5 text-right w-14">Disc</th>}
                    {cfg.showGstRate && <th className="border border-black p-1.5 text-right w-14">GST %</th>}
                    {cfg.showTaxAmount && <th className="border border-black p-1.5 text-right w-20">Tax (₹)</th>}
                    {cfg.showTotalAmount && <th className="border border-black p-1.5 text-right w-24">Amount (₹)</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, idx: number) => {
                    const itemGst = (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);
                    return (
                      <tr key={item.id || idx} className="border-b border-gray-300">
                        <td className="border border-black p-1.5 text-center font-mono">{idx + 1}</td>
                        {cfg.showItemName && (
                          <td className="border border-black p-1.5 font-bold">
                            {item.itemName}
                            {cfg.showDescription && item.description && <span className="block text-[9px] font-normal text-gray-700">{item.description}</span>}
                            {cfg.showSerialNumber && item.serialNumber && <span className="block text-[9px] font-mono text-emerald-800">S/N: {item.serialNumber}</span>}
                          </td>
                        )}
                        {cfg.showHsn && <td className="border border-black p-1.5 text-center font-mono">{item.hsnSac}</td>}
                        {cfg.showQuantity && <td className="border border-black p-1.5 text-right font-bold font-mono">{item.quantity}</td>}
                        {cfg.showFreeQuantity && <td className="border border-black p-1.5 text-right font-mono">{item.freeQuantity || 0}</td>}
                        {cfg.showUnit && <td className="border border-black p-1.5 text-center">{item.unit || 'Nos'}</td>}
                        {cfg.showRate && <td className="border border-black p-1.5 text-right font-mono">₹{item.rate.toFixed(2)}</td>}
                        {cfg.showDiscount && <td className="border border-black p-1.5 text-right font-mono">₹{(item.discountAmount || 0).toFixed(2)}</td>}
                        {cfg.showGstRate && <td className="border border-black p-1.5 text-right font-mono">{item.gstRate}%</td>}
                        {cfg.showTaxAmount && <td className="border border-black p-1.5 text-right font-mono">₹{itemGst.toFixed(2)}</td>}
                        {cfg.showTotalAmount && <td className="border border-black p-1.5 text-right font-mono font-bold">₹{item.totalAmount.toFixed(2)}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* HSN/SAC Tax Breakdown Summary Table */}
              <div className="mt-3 mb-2">
                <p className="font-bold text-[9px] uppercase tracking-wider mb-1 text-gray-700">GST Tax Breakdown (HSN/SAC Summary)</p>
                <table className="w-full text-[9px] border border-black text-center border-collapse">
                  <thead>
                    <tr className="bg-gray-100 font-bold border-b border-black">
                      <th className="border-r border-black p-1">HSN/SAC</th>
                      <th className="border-r border-black p-1 text-right">Taxable Amount</th>
                      {!invoice.isInterState ? (
                        <>
                          <th className="border-r border-black p-1 text-right">CGST Rate</th>
                          <th className="border-r border-black p-1 text-right">CGST Amt</th>
                          <th className="border-r border-black p-1 text-right">SGST Rate</th>
                          <th className="border-r border-black p-1 text-right">SGST Amt</th>
                        </>
                      ) : (
                        <>
                          <th className="border-r border-black p-1 text-right">IGST Rate</th>
                          <th className="border-r border-black p-1 text-right">IGST Amt</th>
                        </>
                      )}
                      <th className="p-1 text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const hsnMap: { [hsn: string]: { taxable: number; cgstRate: number; cgstAmount: number; sgstRate: number; sgstAmount: number; igstRate: number; igstAmount: number; totalTax: number } } = {};
                      items.forEach((item: any) => {
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
                        <tr key={hsn} className="border-b border-gray-300">
                          <td className="border-r border-black p-1 font-mono font-bold">{hsn}</td>
                          <td className="border-r border-black p-1 text-right font-mono">₹{data.taxable.toFixed(2)}</td>
                          {!invoice.isInterState ? (
                            <>
                              <td className="border-r border-black p-1 text-right font-mono">{data.cgstRate}%</td>
                              <td className="border-r border-black p-1 text-right font-mono">₹{data.cgstAmount.toFixed(2)}</td>
                              <td className="border-r border-black p-1 text-right font-mono">{data.sgstRate}%</td>
                              <td className="border-r border-black p-1 text-right font-mono">₹{data.sgstAmount.toFixed(2)}</td>
                            </>
                          ) : (
                            <>
                              <td className="border-r border-black p-1 text-right font-mono">{data.igstRate}%</td>
                              <td className="border-r border-black p-1 text-right font-mono">₹{data.igstAmount.toFixed(2)}</td>
                            </>
                          )}
                          <td className="p-1 text-right font-mono font-bold">₹{data.totalTax.toFixed(2)}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Totals & Bank Section */}
              <div className="flex justify-between items-start pt-2 border-t-2 border-black gap-4">
                <div className="space-y-2 flex-1">
                  {cfg.showAmountInWords && (
                    <div>
                      <p className="font-bold text-gray-600 text-[9px]">Amount in Words:</p>
                      <p className="font-bold text-black italic text-[11px]">{numberToWords(invoice.grandTotal)}</p>
                    </div>
                  )}

                  {cfg.showPaymentMode && (
                    <p className="text-[10px]">Payment Mode: <span className="font-bold">{invoice.paymentMode || 'Credit'}</span></p>
                  )}

                  {cfg.showBankDetails && company.bankName && (
                    <div className="border border-black p-2 rounded bg-slate-50 text-[9.5px]">
                      <p className="font-bold uppercase border-b border-gray-300 pb-0.5 mb-1">Company Bank Details:</p>
                      <p>Bank: <span className="font-bold">{company.bankName}</span> | A/C No: <span className="font-mono font-bold">{company.bankAccountNo}</span></p>
                      <p>IFSC Code: <span className="font-mono">{company.ifsc}</span> | UPI ID: <span className="font-mono">{company.upiId}</span></p>
                    </div>
                  )}

                  {cfg.showNotes && invoice.notes && (
                    <div className="text-[10px]">
                      <span className="font-bold">Notes: </span>{invoice.notes}
                    </div>
                  )}
                </div>

                <div className="text-right space-y-1 min-w-[220px]">
                  <div className="flex justify-between border-b border-gray-200 pb-0.5">
                    <span>Taxable Amount:</span>
                    <span className="font-mono font-bold">₹{invoice.taxableAmount?.toFixed(2)}</span>
                  </div>

                  {!invoice.isInterState ? (
                    <>
                      {cfg.showCgst && (
                        <div className="flex justify-between">
                          <span>CGST:</span>
                          <span className="font-mono">₹{(invoice.cgstAmount || 0).toFixed(2)}</span>
                        </div>
                      )}

                      {cfg.showSgst && (
                        <div className="flex justify-between">
                          <span>SGST:</span>
                          <span className="font-mono">₹{(invoice.sgstAmount || 0).toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {cfg.showIgst && (
                        <div className="flex justify-between">
                          <span>IGST:</span>
                          <span className="font-mono">₹{(invoice.igstAmount || 0).toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}

                  {cfg.showTaxAmount && (
                    <div className="flex justify-between border-t border-gray-300 pt-0.5">
                      <span>Total Tax Amount:</span>
                      <span className="font-mono font-bold">₹{((invoice.cgstAmount || 0) + (invoice.sgstAmount || 0) + (invoice.igstAmount || 0)).toFixed(2)}</span>
                    </div>
                  )}

                  {cfg.showTotalAmount && (
                    <div className="flex justify-between font-black text-sm border-t-2 border-black pt-1">
                      <span>Grand Total:</span>
                      <span className="font-mono">₹{invoice.grandTotal?.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Terms & Conditions and Signature Footer */}
            <div className="pt-4 border-t-2 border-black mt-4 grid grid-cols-2 gap-4 text-[9.5px]">
              <div>
                {cfg.showTerms && termsList.length > 0 && (
                  <div>
                    <p className="font-bold uppercase text-[9px] mb-1">Terms & Conditions:</p>
                    <ul className="list-disc pl-3 text-gray-700 space-y-0.5">
                      {termsList.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="text-right flex flex-col justify-end items-end space-y-6">
                {cfg.showSignature && (
                  <>
                    <p className="font-bold text-xs">For {company.businessName || 'SMART AGRO MACHINERYS'}</p>
                    <div className="pt-6">
                      <p className="border-t border-black pt-1 font-bold text-xs uppercase">Authorised Signatory</p>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
