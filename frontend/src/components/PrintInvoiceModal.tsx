import React from 'react';
import { Printer, X } from 'lucide-react';

interface PrintInvoiceModalProps {
  invoice: any;
  company: any;
  onClose: () => void;
}

// Convert numbers to Indian Rupees text representation
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

  return 'Rupees ' + inWords(n).trim() + ' Only';
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({ invoice, company, onClose }) => {
  if (!invoice || !company) return null;

  const party = invoice.party || {};
  const isInter = invoice.isInterState;

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
      '1. Company is not responsible for transportation damages.',
      '2. No replacement, No onsite service, No exchange.',
      '3. Extra charge applicable for spare parts.',
      '4. Goods once sold cannot be taken back under any conditions.',
      '5. Subject to Bangalore Jurisdiction only.',
      '6. Thanks for doing business with us!',
    ];
  }

  // Calculate HSN summary table
  const hsnMap: { [hsn: string]: { taxable: number; cgstRate: number; cgstAmount: number; sgstRate: number; sgstAmount: number; igstRate: number; igstAmount: number; totalTax: number } } = {};
  
  (invoice.items || []).forEach((item: any) => {
    const hsn = item.hsnSac || '8436';
    if (!hsnMap[hsn]) {
      hsnMap[hsn] = {
        taxable: 0,
        cgstRate: !isInter ? item.gstRate / 2 : 0,
        cgstAmount: 0,
        sgstRate: !isInter ? item.gstRate / 2 : 0,
        sgstAmount: 0,
        igstRate: isInter ? item.gstRate : 0,
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 my-8">
        
        {/* Print specific CSS embedded for exact A4 sizing */}
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm 8mm 8mm 8mm;
            }
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: none !important;
            }
            #printable-area {
              position: relative !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
            }
            .print-avoid-break {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}</style>

        {/* Modal Controls (Hidden in Print) */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-200 no-print">
          <h2 className="text-lg font-bold text-gray-800">TAX INVOICE PREVIEW & PRINT</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 shadow transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF (A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Printable A4 Document Area matching reference layout */}
        <div id="printable-area" className="p-5 bg-white text-gray-900 font-sans border border-gray-400 mt-4 rounded-sm text-xs leading-tight">
          
          {/* Top Banner Title */}
          <div className="text-center font-black border-b border-gray-400 pb-1 mb-1.5 uppercase text-xs tracking-wider">
            TAX INVOICE
          </div>

          {/* Header Grid: Company Details Left | Invoice Meta Right */}
          <div className="grid grid-cols-12 border border-gray-400 print-avoid-break">
            {/* Company Info with Optional Logo (Cols 7) */}
            <div className="col-span-7 p-2 border-r border-gray-400 flex items-start gap-2.5">
              {company.logoUrl && (
                <img
                  src={company.logoUrl}
                  alt={company.businessName}
                  className="max-h-14 max-w-[130px] object-contain border border-gray-200 p-0.5 rounded-xs bg-white shrink-0"
                />
              )}
              <div className="space-y-0.5 min-w-0">
                <h1 className="text-sm font-black text-emerald-950 uppercase tracking-tight leading-tight truncate">
                  {company.businessName || 'SMART AGRO MACHINERYS'}
                </h1>
                <p className="text-[10px] text-gray-700 leading-tight">{company.address || 'APMC Yard, Near Bus Stand'}</p>
                <p className="text-[10px] text-gray-700">Phone: <span className="font-semibold">{company.phone}</span> | Email: {company.email || 'info@smartagromachinerys.com'}</p>
                <p className="text-[10px] font-bold text-gray-800 pt-0.5">
                  GSTIN: <span className="font-mono">{company.gstin}</span> | State: <span className="font-mono">{company.stateCode || '29'}-{company.state || 'Karnataka'}</span>
                </p>
              </div>
            </div>

            {/* Invoice Info (Cols 5) */}
            <div className="col-span-5 p-2 bg-gray-50/50 space-y-0.5 text-[10.5px]">
              <div className="flex justify-between border-b border-gray-200 pb-0.5">
                <span className="font-bold text-gray-700">Invoice No:</span>
                <span className="font-mono font-bold text-emerald-950">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-0.5">
                <span className="font-bold text-gray-700">Date:</span>
                <span className="font-semibold">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</span>
              </div>
              {invoice.ewayBillNo && (
                <div className="flex justify-between border-b border-gray-200 pb-0.5">
                  <span className="font-bold text-gray-700">E-Way Bill No:</span>
                  <span className="font-mono">{invoice.ewayBillNo}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-gray-200 pb-0.5">
                <span className="font-bold text-gray-700">Place of Supply:</span>
                <span>{invoice.placeOfSupply || `${party.stateCode || '29'}-${party.state || 'Karnataka'}`}</span>
              </div>
              {invoice.poNumber && (
                <div className="flex justify-between border-b border-gray-200 pb-0.5">
                  <span className="font-bold text-gray-700">PO Number:</span>
                  <span className="font-mono">{invoice.poNumber}</span>
                </div>
              )}
              {invoice.poDate && (
                <div className="flex justify-between">
                  <span className="font-bold text-gray-700">PO Date:</span>
                  <span>{new Date(invoice.poDate).toLocaleDateString('en-IN')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bill To & Ship To Side-by-Side */}
          <div className="grid grid-cols-2 border-x border-b border-gray-400 print-avoid-break">
            <div className="p-2 border-r border-gray-400 space-y-0.5 text-[10.5px]">
              <p className="font-bold text-gray-700 uppercase tracking-wider text-[9.5px] bg-gray-100 px-1 py-0.5 rounded-xs inline-block mb-0.5">Details of Receiver | Billed To:</p>
              <p className="font-bold text-gray-900 text-xs">{party.name}</p>
              <p className="text-gray-700">{party.address || party.village}</p>
              <p className="text-gray-700">{party.taluk ? `${party.taluk}, ` : ''}{party.district ? `${party.district}, ` : ''}{party.state} - {party.pincode || ''}</p>
              <p className="text-gray-700">Contact: <span className="font-mono font-semibold">{party.mobile}</span></p>
              {party.gstin && <p className="font-semibold text-gray-800">GSTIN: <span className="font-mono">{party.gstin}</span></p>}
              <p className="text-gray-700">State: <span className="font-semibold">{party.state} ({party.stateCode})</span></p>
            </div>

            <div className="p-2 space-y-0.5 text-[10.5px]">
              <p className="font-bold text-gray-700 uppercase tracking-wider text-[9.5px] bg-gray-100 px-1 py-0.5 rounded-xs inline-block mb-0.5">Details of Consignee | Shipped To:</p>
              <p className="font-bold text-gray-900 text-xs">{party.name}</p>
              <p className="text-gray-700">{invoice.deliveryAddress || party.address || party.village}</p>
              <p className="text-gray-700">{party.taluk ? `${party.taluk}, ` : ''}{party.district ? `${party.district}, ` : ''}{party.state}</p>
              <p className="text-gray-700">Contact: <span className="font-mono font-semibold">{party.mobile}</span></p>
              <p className="text-gray-700">State: <span className="font-semibold">{party.state} ({party.stateCode})</span></p>
            </div>
          </div>

          {/* Item Table */}
          <table className="w-full text-[10.5px] border-x border-b border-gray-400 border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-800 font-bold border-b border-gray-400">
                <th className="p-1 border-r border-gray-400 text-center w-7">#</th>
                <th className="p-1 border-r border-gray-400 text-left">Item Description</th>
                <th className="p-1 border-r border-gray-400 text-center w-14">HSN/SAC</th>
                <th className="p-1 border-r border-gray-400 text-right w-12">Qty</th>
                <th className="p-1 border-r border-gray-400 text-right w-16">Price/Unit (₹)</th>
                <th className="p-1 border-r border-gray-400 text-right w-24">GST</th>
                <th className="p-1 text-right w-20">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((item: any, idx: number) => {
                const totalGstAmt = (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);

                return (
                  <tr key={item.id || idx} className="border-b border-gray-300 print-avoid-break">
                    <td className="p-1 border-r border-gray-400 text-center font-mono">{idx + 1}</td>
                    <td className="p-1 border-r border-gray-400 font-semibold text-gray-900">
                      {item.itemName}
                      {item.serialNumber && (
                        <span className="block text-[9.5px] text-emerald-800 font-mono">S/N: {item.serialNumber}</span>
                      )}
                    </td>
                    <td className="p-1 border-r border-gray-400 text-center font-mono">{item.hsnSac}</td>
                    <td className="p-1 border-r border-gray-400 text-right font-mono font-semibold">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="p-1 border-r border-gray-400 text-right font-mono">{item.rate.toFixed(2)}</td>
                    <td className="p-1 border-r border-gray-400 text-right font-mono text-[9.5px]">
                      ₹{totalGstAmt.toFixed(2)} ({item.gstRate}%)
                    </td>
                    <td className="p-1 text-right font-mono font-bold">₹{item.totalAmount.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold border-t border-gray-400 text-[10.5px] print-avoid-break">
                <td colSpan={3} className="p-1 border-r border-gray-400 text-right">Total:</td>
                <td className="p-1 border-r border-gray-400 text-right font-mono">
                  {(invoice.items || []).reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)}
                </td>
                <td className="p-1 border-r border-gray-400"></td>
                <td className="p-1 border-r border-gray-400 text-right font-mono">
                  ₹{((invoice.cgstAmount || 0) + (invoice.sgstAmount || 0) + (invoice.igstAmount || 0)).toFixed(2)}
                </td>
                <td className="p-1 text-right font-mono font-bold">₹{invoice.grandTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Amount in Words & Totals Section */}
          <div className="grid grid-cols-12 border-x border-b border-gray-400 text-[10.5px] print-avoid-break">
            {/* Left: Amount in Words */}
            <div className="col-span-7 p-1.5 border-r border-gray-400 space-y-0.5">
              <p className="font-bold text-gray-700 text-[10px]">Amount Chargeable (in words):</p>
              <p className="font-bold text-gray-900 italic text-[11px]">{numberToWords(invoice.grandTotal)}</p>
            </div>

            {/* Right: Taxable, Tax, Round off, Grand Total */}
            <div className="col-span-5 p-1.5 space-y-0.5 text-right">
              <div className="flex justify-between border-b border-gray-200 pb-0.5">
                <span className="text-gray-600">Sub Total (Taxable):</span>
                <span className="font-mono">₹{invoice.taxableAmount.toFixed(2)}</span>
              </div>
              {!isInter ? (
                <>
                  <div className="flex justify-between border-b border-gray-200 pb-0.5">
                    <span className="text-gray-600">CGST Amount:</span>
                    <span className="font-mono">₹{invoice.cgstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-0.5">
                    <span className="text-gray-600">SGST Amount:</span>
                    <span className="font-mono">₹{invoice.sgstAmount.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between border-b border-gray-200 pb-0.5">
                  <span className="text-gray-600">IGST Amount:</span>
                  <span className="font-mono">₹{invoice.igstAmount.toFixed(2)}</span>
                </div>
              )}
              {invoice.roundOff !== 0 && (
                <div className="flex justify-between border-b border-gray-200 pb-0.5 text-gray-500">
                  <span>Round Off:</span>
                  <span className="font-mono">₹{invoice.roundOff.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-0.5 border-t-2 border-gray-800 font-black text-xs text-emerald-950">
                <span>Grand Total:</span>
                <span className="font-mono">₹{invoice.grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* HSN/SAC Tax Summary Table */}
          <div className="border-x border-b border-gray-400 print-avoid-break">
            <p className="font-bold text-[9.5px] uppercase bg-gray-100 p-1 border-b border-gray-400 tracking-wider">
              HSN/SAC Tax Breakdown Summary
            </p>
            <table className="w-full text-[9.5px] border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-300 font-bold text-gray-700">
                  <th className="p-0.5 border-r border-gray-300 text-center">HSN/SAC</th>
                  <th className="p-0.5 border-r border-gray-300 text-right">Taxable Amount (₹)</th>
                  {!isInter ? (
                    <>
                      <th className="p-0.5 border-r border-gray-300 text-right">CGST Rate</th>
                      <th className="p-0.5 border-r border-gray-300 text-right">CGST Amt (₹)</th>
                      <th className="p-0.5 border-r border-gray-300 text-right">SGST Rate</th>
                      <th className="p-0.5 border-r border-gray-300 text-right">SGST Amt (₹)</th>
                    </>
                  ) : (
                    <>
                      <th className="p-0.5 border-r border-gray-300 text-right">IGST Rate</th>
                      <th className="p-0.5 border-r border-gray-300 text-right">IGST Amt (₹)</th>
                    </>
                  )}
                  <th className="p-0.5 text-right">Total Tax (₹)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(hsnMap).map(([hsn, data]) => (
                  <tr key={hsn} className="border-b border-gray-200">
                    <td className="p-0.5 border-r border-gray-300 text-center font-mono">{hsn}</td>
                    <td className="p-0.5 border-r border-gray-300 text-right font-mono">{data.taxable.toFixed(2)}</td>
                    {!isInter ? (
                      <>
                        <td className="p-0.5 border-r border-gray-300 text-right font-mono">{data.cgstRate}%</td>
                        <td className="p-0.5 border-r border-gray-300 text-right font-mono">{data.cgstAmount.toFixed(2)}</td>
                        <td className="p-0.5 border-r border-gray-300 text-right font-mono">{data.sgstRate}%</td>
                        <td className="p-0.5 border-r border-gray-300 text-right font-mono">{data.sgstAmount.toFixed(2)}</td>
                      </>
                    ) : (
                      <>
                        <td className="p-0.5 border-r border-gray-300 text-right font-mono">{data.igstRate}%</td>
                        <td className="p-0.5 border-r border-gray-300 text-right font-mono">{data.igstAmount.toFixed(2)}</td>
                      </>
                    )}
                    <td className="p-0.5 text-right font-mono font-bold">{data.totalTax.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom 3-Column Section: Bank Details | Terms & Conditions Snapshot | Authorized Signature */}
          <div className="grid grid-cols-12 border-x border-b border-gray-400 text-[9.5px] print-avoid-break">
            {/* Col 1: Bank Details */}
            <div className="col-span-4 p-1.5 border-r border-gray-400 space-y-0.5">
              <p className="font-bold text-gray-800 uppercase tracking-wider text-[8.5px] mb-0.5">Company Bank Details:</p>
              <p>Bank: <span className="font-semibold text-gray-900">{company.bankName || 'State Bank of India'}</span></p>
              <p>A/C No: <span className="font-mono font-bold text-gray-900">{company.bankAccountNo || '38901234567'}</span></p>
              <p>IFSC: <span className="font-mono font-bold text-gray-900">{company.ifsc || 'SBIN0001234'}</span></p>
              <p>UPI ID: <span className="font-mono font-bold text-emerald-800">{company.upiId || 'smartagro@sbi'}</span></p>
            </div>

            {/* Col 2: Terms & Conditions Snapshot */}
            <div className="col-span-5 p-1.5 border-r border-gray-400 space-y-0.5">
              <p className="font-bold text-gray-800 uppercase tracking-wider text-[8.5px] mb-0.5">Terms and Conditions:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-[9px] text-gray-800">
                {termsList.map((term, tIdx) => (
                  <li key={tIdx} className="leading-tight">
                    {term.replace(/^\d+\.\s*/, '')}
                  </li>
                ))}
              </ol>
            </div>

            {/* Col 3: Signature Area */}
            <div className="col-span-3 p-1.5 flex flex-col justify-between items-center text-center">
              <p className="font-bold text-gray-900 text-[9.5px]">For {company.businessName || 'SMART AGRO MACHINERYS'}</p>
              <div className="h-8"></div>
              <p className="font-bold text-gray-800 text-[9px] border-t border-gray-400 w-full pt-0.5">Authorised Signatory</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
