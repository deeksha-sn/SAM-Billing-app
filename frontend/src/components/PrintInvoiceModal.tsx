import React from 'react';
import { Printer, Download, X } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

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

  return inWords(n).trim() + ' Rupees Only';
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({ invoice, company, onClose }) => {
  if (!invoice || !company) return null;

  const party = invoice.party || {};
  const isInter = invoice.isInterState;
  const items = invoice.items || [];

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

  // Calculate HSN summary table
  const hsnMap: { [hsn: string]: { taxable: number; cgstRate: number; cgstAmount: number; sgstRate: number; sgstAmount: number; igstRate: number; igstAmount: number; totalTax: number } } = {};
  
  let totalQty = 0;
  let totalGstSum = 0;
  let totalTaxableSum = 0;
  let totalCgstSum = 0;
  let totalSgstSum = 0;
  let totalIgstSum = 0;

  items.forEach((item: any) => {
    const qty = Number(item.quantity) || 0;
    totalQty += qty;
    const itemGstAmt = (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);
    totalGstSum += itemGstAmt;
    totalTaxableSum += item.taxableValue || 0;
    totalCgstSum += item.cgstAmount || 0;
    totalSgstSum += item.sgstAmount || 0;
    totalIgstSum += item.igstAmount || 0;

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
    hsnMap[hsn].totalTax += itemGstAmt;
  });

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
        
        {/* Print specific CSS embedded for exact A4 rendering with outer border */}
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
            #printable-area, #printable-area * {
              visibility: visible !important;
            }
            #printable-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 198mm !important;
              min-height: 280mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              border: 1.5px solid #000000 !important;
              box-shadow: none !important;
              background: #ffffff !important;
              color: #000000 !important;
            }
            .print-avoid-break {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}</style>

        {/* Modal Header Controls (Hidden in Print) */}
        <div className="flex justify-between items-center pb-3 border-b border-gray-300 no-print">
          <div>
            <h2 className="text-base font-bold text-gray-900">A4 Tax Invoice Print & PDF Preview</h2>
            <p className="text-xs text-gray-500">Smart Agro Machinerys Official Pattern with Enclosed Outer Border</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 shadow transition"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold text-xs hover:bg-emerald-800 shadow transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable A4 Document Sheet matching exact visual pattern of reference document */}
        <div className="overflow-y-auto flex-1 py-4 flex justify-center bg-gray-200">
          <div
            id="printable-area"
            className="w-[198mm] bg-white text-black font-sans text-xs border-2 border-black p-0 shadow-lg leading-tight"
          >
            {/* Top Centered Title inside border */}
            <div className="text-center font-bold text-sm py-1 border-b border-black uppercase tracking-wide bg-white">
              Tax Invoice
            </div>

            {/* Header Block: Company Details Left | Invoice Details Table Right */}
            <div className="grid grid-cols-12 border-b border-black print-avoid-break">
              
              {/* Left Column: Logo & Company Address */}
              <div className="col-span-7 p-2 border-r border-black flex items-start gap-3">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt={company.businessName}
                    className="h-16 max-w-[130px] object-contain shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 bg-emerald-800 text-white rounded-full flex items-center justify-center font-black text-xl shrink-0 border border-gray-400">
                    SAM
                  </div>
                )}
                <div className="space-y-0.5 min-w-0">
                  <h1 className="font-bold text-sm text-black uppercase tracking-tight">
                    {company.businessName || 'SMART AGRO MACHINERYS'}
                  </h1>
                  <p className="text-[10px] text-gray-800 leading-tight">
                    {company.address || 'No-02, 2nd cross, Gopalaiah layout, Chikkagollarahatti, Magadi Main Road, Bangalore-560091.'}
                  </p>
                  <p className="text-[10px] text-gray-800">Phone no.: {company.phone || '7892066495 / 9880674805'}</p>
                  <p className="text-[10px] text-gray-800">Email: {company.email || 'smartagromachinerys@gmail.com'}</p>
                  <p className="text-[10px] font-bold text-black">GSTIN: {company.gstin || '29ALFPN3529D1Z4'}</p>
                  <p className="text-[10px] text-gray-800">State: {company.stateCode || '29'}-{company.state || 'Karnataka'}</p>
                </div>
              </div>

              {/* Right Column: Invoice Info Grid Table */}
              <div className="col-span-5 grid grid-cols-2 text-[10px] border-collapse bg-white">
                <div className="p-1 border-r border-b border-black font-bold">Invoice No.</div>
                <div className="p-1 border-b border-black font-bold text-black">{invoice.invoiceNumber}</div>

                <div className="p-1 border-r border-b border-black font-bold">Date</div>
                <div className="p-1 border-b border-black font-bold">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</div>

                <div className="p-1 border-r border-b border-black font-bold">E-way Bill number</div>
                <div className="p-1 border-b border-black font-mono font-bold">{invoice.ewayBillNo || '-'}</div>

                <div className="p-1 border-r border-b border-black font-bold">Place of supply</div>
                <div className="p-1 border-b border-black font-bold">{invoice.placeOfSupply || `${party.stateCode || '29'}-${party.state || 'Karnataka'}`}</div>

                <div className="p-1 border-r border-black font-bold">PO date</div>
                <div className="p-1 border-r border-black">{invoice.poDate ? new Date(invoice.poDate).toLocaleDateString('en-IN') : '-'}</div>

                <div className="p-1 font-bold border-black">PO number</div>
                <div className="p-1 font-mono text-[9px]">{invoice.poNumber || '-'}</div>
              </div>
            </div>

            {/* Bill To & Ship To Side-by-Side Block */}
            <div className="grid grid-cols-2 border-b border-black print-avoid-break">
              <div className="p-2 border-r border-black space-y-0.5 text-[10.5px]">
                <p className="font-bold text-black uppercase text-[10px] mb-0.5">Bill To</p>
                <p className="font-bold text-black text-xs uppercase">{party.name}</p>
                <p className="text-gray-800">{party.address || party.village}</p>
                <p className="text-gray-800">{party.taluk ? `${party.taluk}, ` : ''}{party.district ? `${party.district}, ` : ''}{party.state} - {party.pincode || ''}</p>
                <p className="text-gray-800">Contact No. : {party.mobile}</p>
                {party.gstin && <p className="font-bold text-black">GSTIN : {party.gstin}</p>}
                <p className="text-gray-800">State: {party.stateCode || '29'}-{party.state || 'Karnataka'}</p>
              </div>

              <div className="p-2 space-y-0.5 text-[10.5px]">
                <p className="font-bold text-black uppercase text-[10px] mb-0.5">Ship To</p>
                <p className="font-bold text-black text-xs uppercase">{party.name}</p>
                <p className="text-gray-800">{invoice.deliveryAddress || party.address || party.village}</p>
                <p className="text-gray-800">{party.taluk ? `${party.taluk}, ` : ''}{party.district ? `${party.district}, ` : ''}{party.state}</p>
                <p className="text-gray-800 font-semibold">CONTACT NO:{party.mobile}</p>
              </div>
            </div>

            {/* Item Table */}
            <table className="w-full text-[10.5px] border-b border-black border-collapse">
              <thead>
                <tr className="bg-gray-100 font-bold border-b border-black text-black">
                  <th className="p-1 border-r border-black text-center w-7">#</th>
                  <th className="p-1 border-r border-black text-left">Item name</th>
                  <th className="p-1 border-r border-black text-center w-24">HSN/ SAC</th>
                  <th className="p-1 border-r border-black text-center w-16">Quantity</th>
                  <th className="p-1 border-r border-black text-right w-24">Price/ Unit</th>
                  <th className="p-1 border-r border-black text-right w-28">GST</th>
                  <th className="p-1 text-right w-24">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, idx: number) => {
                  const itemGst = (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);

                  return (
                    <tr key={item.id || idx} className="border-b border-gray-400 print-avoid-break">
                      <td className="p-1.5 border-r border-black text-center">{idx + 1}</td>
                      <td className="p-1.5 border-r border-black font-bold text-black">
                        {item.itemName}
                        {item.serialNumber && (
                          <span className="block text-[9.5px] font-normal text-gray-700 font-mono">S/N: {item.serialNumber}</span>
                        )}
                      </td>
                      <td className="p-1.5 border-r border-black text-center font-mono">{item.hsnSac}</td>
                      <td className="p-1.5 border-r border-black text-center font-bold">{item.quantity}</td>
                      <td className="p-1.5 border-r border-black text-right font-mono">
                        ₹ {item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-1.5 border-r border-black text-right font-mono text-[9.5px]">
                        ₹ {itemGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({item.gstRate}%)
                      </td>
                      <td className="p-1.5 text-right font-mono font-bold">
                        ₹ {item.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold border-t border-black text-[10.5px] print-avoid-break">
                  <td colSpan={2} className="p-1.5 border-r border-black text-left font-bold">Total</td>
                  <td className="p-1.5 border-r border-black text-center"></td>
                  <td className="p-1.5 border-r border-black text-center font-bold">{totalQty}</td>
                  <td className="p-1.5 border-r border-black"></td>
                  <td className="p-1.5 border-r border-black text-right font-mono font-bold">
                    ₹ {totalGstSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-1.5 text-right font-mono font-bold">
                    ₹ {invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Amount in Words & Sub Total / Total Block */}
            <div className="grid grid-cols-12 border-b border-black text-[10.5px] print-avoid-break">
              <div className="col-span-7 p-2 border-r border-black space-y-1">
                <p className="text-gray-700 font-medium">Invoice Amount in Words</p>
                <p className="font-bold text-black text-xs leading-snug">{numberToWords(invoice.grandTotal)}</p>
              </div>
              <div className="col-span-5 p-2 space-y-1">
                <p className="font-bold text-gray-700">Amounts</p>
                <div className="flex justify-between border-b border-gray-300 pb-0.5">
                  <span>Sub Total</span>
                  <span className="font-mono font-bold">
                    ₹ {invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-xs">
                  <span>Total</span>
                  <span className="font-mono font-bold">
                    ₹ {invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* HSN/SAC Tax Summary Table */}
            <div className="border-b border-black text-[10px] print-avoid-break">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 font-bold border-b border-black">
                    <th className="p-1 border-r border-black text-center" rowSpan={2}>HSN/ SAC</th>
                    <th className="p-1 border-r border-black text-right" rowSpan={2}>Taxable amount</th>
                    {!isInter ? (
                      <>
                        <th className="p-0.5 border-r border-black text-center" colSpan={2}>CGST</th>
                        <th className="p-0.5 border-r border-black text-center" colSpan={2}>SGST</th>
                      </>
                    ) : (
                      <th className="p-0.5 border-r border-black text-center" colSpan={2}>IGST</th>
                    )}
                    <th className="p-1 text-right" rowSpan={2}>Total Tax Amount</th>
                  </tr>
                  <tr className="bg-gray-100 font-bold border-b border-black">
                    {!isInter ? (
                      <>
                        <th className="p-0.5 border-r border-black text-center">Rate</th>
                        <th className="p-0.5 border-r border-black text-right">Amount</th>
                        <th className="p-0.5 border-r border-black text-center">Rate</th>
                        <th className="p-0.5 border-r border-black text-right">Amount</th>
                      </>
                    ) : (
                      <>
                        <th className="p-0.5 border-r border-black text-center">Rate</th>
                        <th className="p-0.5 border-r border-black text-right">Amount</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(hsnMap).map(([hsn, data]) => (
                    <tr key={hsn} className="border-b border-gray-300">
                      <td className="p-1 border-r border-black text-center font-mono">{hsn}</td>
                      <td className="p-1 border-r border-black text-right font-mono">
                        ₹ {data.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      {!isInter ? (
                        <>
                          <td className="p-1 border-r border-black text-center">{data.cgstRate}%</td>
                          <td className="p-1 border-r border-black text-right font-mono">
                            ₹ {data.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-1 border-r border-black text-center">{data.sgstRate}%</td>
                          <td className="p-1 border-r border-black text-right font-mono">
                            ₹ {data.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-1 border-r border-black text-center">{data.igstRate}%</td>
                          <td className="p-1 border-r border-black text-right font-mono">
                            ₹ {data.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </>
                      )}
                      <td className="p-1 text-right font-mono font-bold">
                        ₹ {data.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td className="p-1 border-r border-black text-left">Total</td>
                    <td className="p-1 border-r border-black text-right font-mono">
                      ₹ {totalTaxableSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    {!isInter ? (
                      <>
                        <td className="p-1 border-r border-black"></td>
                        <td className="p-1 border-r border-black text-right font-mono">
                          ₹ {totalCgstSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-1 border-r border-black"></td>
                        <td className="p-1 border-r border-black text-right font-mono">
                          ₹ {totalSgstSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-1 border-r border-black"></td>
                        <td className="p-1 border-r border-black text-right font-mono">
                          ₹ {totalIgstSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </>
                    )}
                    <td className="p-1 text-right font-mono font-bold">
                      ₹ {totalGstSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Bottom 3-Column Footer: Bank Details | Terms & Conditions Snapshot | Authorized Signature */}
            <div className="grid grid-cols-12 text-[10px] min-h-[110px] print-avoid-break border-b border-black">
              
              {/* Col 1: Bank Details */}
              <div className="col-span-4 p-2 border-r border-black space-y-1">
                <p className="font-bold text-black uppercase">Bank Details</p>
                <p>Account No. : <span className="font-bold font-mono">{company.bankAccountNo || '62188006438'}</span></p>
                <p>IFSC code : <span className="font-bold font-mono">{company.ifsc || 'SBIN0040894'}</span></p>
                {company.upiId && <p>UPI ID : <span className="font-bold font-mono">{company.upiId}</span></p>}
              </div>

              {/* Col 2: Terms and Conditions Snapshot */}
              <div className="col-span-5 p-2 border-r border-black space-y-0.5">
                <p className="font-bold text-black uppercase mb-0.5">Terms and conditions</p>
                <ol className="list-decimal list-inside space-y-0.5 text-[9.5px] text-gray-900">
                  {termsList.map((t, idx) => (
                    <li key={idx} className="leading-tight">
                      {t.replace(/^\d+\.\s*/, '')}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Col 3: Signature Area */}
              <div className="col-span-3 p-2 flex flex-col justify-between items-center text-center">
                <p className="font-bold text-black text-[10.5px]">For : {company.businessName || 'SMART AGRO MACHINERYS'}</p>
                
                <div className="my-1">
                  <div className="text-[9px] font-bold text-emerald-900 border border-emerald-800 px-2 py-0.5 rounded uppercase tracking-wider inline-block">
                    {company.businessName || 'SMART AGRO MACHINERYS'}
                  </div>
                </div>

                <p className="font-bold text-black text-[10px]">Authorised signature</p>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
