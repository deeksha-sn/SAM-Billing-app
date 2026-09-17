import React, { useState } from 'react';
import { Printer, Download, X, MessageSquare, Send } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { TemplateCustomizerToolbar } from './TemplateCustomizerToolbar';
import { BillFieldsConfig, DEFAULT_CHALLAN_FIELDS, BillTemplate } from '../types/billTemplate';

interface PrintChallanModalProps {
  challan: any;
  company: any;
  onClose: () => void;
}

export const PrintChallanModal: React.FC<PrintChallanModalProps> = ({ challan, company, onClose }) => {
  const [fieldConfig, setFieldConfig] = useState<BillFieldsConfig>(() => {
    let base: BillFieldsConfig = DEFAULT_CHALLAN_FIELDS;
    if (challan?.fieldsConfigSnapshot) {
      try {
        base = typeof challan.fieldsConfigSnapshot === 'string'
          ? JSON.parse(challan.fieldsConfigSnapshot)
          : challan.fieldsConfigSnapshot;
      } catch (err) {
        console.error('Failed to parse challan fieldsConfigSnapshot:', err);
      }
    }
    const defaultSig = company?.showSignatureByDefault !== false;
    return {
      ...base,
      showSignature: base.showSignature !== undefined ? base.showSignature : defaultSig,
      showAuthSignature: base.showAuthSignature !== undefined ? base.showAuthSignature : defaultSig,
    };
  });
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(challan?.billTemplateId || null);

  if (!challan || !company) return null;

  const cfg = fieldConfig;
  const party = challan.party || {};
  const farmer = challan.farmer || null;
  const items = challan.items || [];

  // Parse terms snapshot
  let termsList: string[] = [];
  if (challan.termsSnapshot) {
    try {
      if (typeof challan.termsSnapshot === 'string' && challan.termsSnapshot.startsWith('[')) {
        termsList = JSON.parse(challan.termsSnapshot);
      } else if (Array.isArray(challan.termsSnapshot)) {
        termsList = challan.termsSnapshot;
      } else if (typeof challan.termsSnapshot === 'string') {
        termsList = [challan.termsSnapshot];
      }
    } catch {
      termsList = [String(challan.termsSnapshot)];
    }
  }

  if (termsList.length === 0) {
    termsList = [
      '1. Goods delivered in good condition.',
      '2. Please check equipment and serial numbers before accepting delivery.',
      '3. Goods once delivered cannot be returned without prior written approval.',
      '4. Subject to Karnataka Jurisdiction.',
    ];
  }

  const recipientName = farmer?.name || party.name || 'Customer';
  const recipientPhone = farmer?.mobile || party.mobile || challan.contactNumber || '';
  const deliveryLoc = challan.deliveryLocation || challan.deliveryAddress || farmer?.shippingAddress || party.address || 'Address Not Specified';

  // Construct WhatsApp Sharing Message
  const firstItem = items[0] || {};
  const whatsappMsgText = `Smart Agro Machinerys

Delivery Challan: ${challan.challanNumber}
Customer: ${party.name || 'Customer'}
Farmer/Delivery To: ${recipientName}
Machine: ${firstItem.itemName || 'Equipment'}
Serial No: ${firstItem.serialNumber || 'N/A'}
Quantity: ${firstItem.quantity || 1}
Delivery Location: ${deliveryLoc}

Thank you,
Smart Agro Machinerys`;

  const cleanPhone = recipientPhone ? recipientPhone.replace(/\D/g, '') : '';
  const formattedPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(whatsappMsgText)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const element = document.getElementById('printable-challan-content');
    if (!element) return;

    const opt = {
      margin: 5,
      filename: `${challan.challanNumber || 'Delivery_Challan'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-2 sm:p-4 overflow-y-auto font-sans">
      
      {/* Top Action Bar */}
      <div className="bg-slate-900 text-white rounded-t-2xl max-w-4xl w-full px-6 py-3 flex flex-col gap-2 shadow-xl print:hidden border-b border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-amber-400 font-mono text-sm">{challan.challanNumber}</span>
              <span className="text-xs text-slate-400 font-medium">| A4 Print Preview</span>
            </div>

            <div className="flex items-center gap-3 border-l border-slate-700 pl-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Signature:</span>
              <label className="flex items-center gap-1.5 text-xs font-bold text-white cursor-pointer hover:text-emerald-300">
                <input
                  type="checkbox"
                  checked={cfg.showSignature !== false && cfg.showAuthSignature !== false}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setFieldConfig((prev) => ({
                      ...prev,
                      showSignature: isChecked,
                      showAuthSignature: isChecked,
                    }));
                  }}
                  className="w-4 h-4 text-emerald-500 rounded border-slate-600 focus:ring-emerald-500"
                />
                <span>Show Authorized Signature</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs font-bold text-white cursor-pointer hover:text-emerald-300">
                <input
                  type="checkbox"
                  checked={Boolean(cfg.showCustomerSignature)}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setFieldConfig((prev) => ({
                      ...prev,
                      showCustomerSignature: isChecked,
                    }));
                  }}
                  className="w-4 h-4 text-emerald-500 rounded border-slate-600 focus:ring-emerald-500"
                />
                <span>Show Receiver Signature</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow transition"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Share WhatsApp
            </a>

            <button
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow transition"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 shadow transition"
            >
              <Printer className="w-3.5 h-3.5" /> Print A4
            </button>

            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Template Customizer Toolbar */}
        <div className="pt-2 border-t border-slate-800">
          <TemplateCustomizerToolbar
            documentType="DELIVERY_CHALLAN"
            activeConfig={fieldConfig}
            onChangeConfig={setFieldConfig}
            activeTemplateId={activeTemplateId}
            onSelectTemplate={(tmpl: BillTemplate) => setActiveTemplateId(tmpl.id)}
          />
        </div>
      </div>

      {/* A4 Printable Document Container */}
      <div className="bg-slate-200 p-2 sm:p-6 rounded-b-2xl max-w-4xl w-full overflow-y-auto max-h-[88vh] print:p-0 print:m-0 print:max-w-none print:w-full print:bg-white print:max-h-none print:overflow-visible">
        
        <div
          id="printable-challan-content"
          className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-2xl max-w-[210mm] mx-auto text-xs leading-normal border border-gray-300 print:shadow-none print:border-none print:p-4 print:w-full print:m-0"
        >
          {/* Company Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-4">
            <div className="flex gap-4 items-center">
              {cfg.showLogo && (company.logoUrl ? (
                <img src={company.logoUrl} alt="Company Logo" className="w-20 h-20 object-contain rounded-xl border border-gray-200" />
              ) : (
                <div className="w-16 h-16 bg-slate-900 text-amber-400 rounded-xl flex items-center justify-center font-black text-2xl">
                  SAM
                </div>
              ))}
              <div>
                <h1 className="text-xl font-black uppercase text-slate-900 tracking-tight">{company.companyName || 'Smart Agro Machinerys'}</h1>
                {cfg.showCompanyContact && (
                  <>
                    <p className="text-[11px] font-medium text-slate-700 max-w-md leading-snug">{company.address}</p>
                    <p className="text-[11px] font-semibold text-slate-800 mt-0.5">
                      Phone: <span className="font-mono">{company.phone}</span> {company.email && `| Email: ${company.email}`}
                    </p>
                    {company.gstin && (
                      <p className="text-[11px] font-bold text-slate-900 font-mono">GSTIN: {company.gstin}</p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="text-right space-y-1">
              <div className="inline-block bg-slate-900 text-white font-black px-4 py-1.5 rounded-lg text-sm tracking-wider uppercase">
                DELIVERY CHALLAN
              </div>
              {cfg.showDocNumber && <div className="font-mono text-sm font-extrabold text-slate-900 mt-1">{challan.challanNumber}</div>}
              {cfg.showDate && <div className="font-mono text-xs font-bold text-slate-700">Date: {new Date(challan.challanDate).toLocaleDateString('en-IN')}</div>}
              {challan.refOrderNo && <div className="font-mono text-[11px] text-slate-600">Ref / Invoice No: {challan.refOrderNo}</div>}
              {cfg.showPoNumber && challan.poNumber && <div className="font-mono text-[11px] text-slate-600">PO No: {challan.poNumber}</div>}
            </div>
          </div>

          {/* Party & Deliver-To Grid */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-[11px]">
            {/* BILL TO */}
            <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50 space-y-1">
              <div className="font-black uppercase text-[10px] text-slate-500 tracking-wider border-b border-slate-200 pb-1 mb-1">
                BILL TO (BUYER)
              </div>
              {cfg.showCustomerName && <div className="font-extrabold text-sm text-slate-900">{party.name || 'N/A'}</div>}
              {cfg.showBillingAddress && (
                <>
                  <div className="font-medium text-slate-700 leading-snug">{party.address || 'Address Not Specified'}</div>
                  <div className="font-semibold text-slate-800">Phone: <span className="font-mono font-bold">{party.mobile}</span></div>
                </>
              )}
              {cfg.showGstin && party.gstin && <div className="font-mono font-bold text-slate-900">GSTIN: {party.gstin}</div>}
              {party.state && <div className="text-slate-600">State: {party.state} ({party.stateCode || '29'})</div>}
            </div>

            {/* DELIVER TO / FARMER */}
            {cfg.showShippingAddress && (
              <div className="border border-slate-300 rounded-xl p-3 bg-amber-50/40 space-y-1">
                <div className="font-black uppercase text-[10px] text-amber-800 tracking-wider border-b border-amber-200 pb-1 mb-1 flex justify-between">
                  <span>DELIVER TO (FARMER / SITE)</span>
                  {farmer && <span className="font-bold text-amber-900">👨‍🌾 Sub-Contact</span>}
                </div>
                <div className="font-extrabold text-sm text-slate-900">{recipientName}</div>
                <div className="font-medium text-slate-800 leading-snug">{deliveryLoc}</div>
                <div className="font-semibold text-slate-800">Phone: <span className="font-mono font-bold">{recipientPhone}</span></div>
                {cfg.showVehicleNumber && challan.vehicleNumber && <div className="font-mono font-bold text-slate-900">Vehicle No: {challan.vehicleNumber}</div>}
                {cfg.showTransport && challan.transporter && <div className="font-semibold text-slate-800">Transporter: {challan.transporter}</div>}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="mb-4 overflow-hidden border border-slate-300 rounded-xl">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-slate-900 text-white font-extrabold text-[10px] uppercase">
                <tr>
                  <th className="p-2 w-10 text-center">#</th>
                  {cfg.showItemName && <th className="p-2">Item / Equipment Description</th>}
                  {cfg.showHsn && <th className="p-2 w-20 text-center">HSN/SAC</th>}
                  {cfg.showUnit && <th className="p-2 w-16 text-center">Unit</th>}
                  {cfg.showQuantity && <th className="p-2 w-16 text-center">Qty</th>}
                  {cfg.showFreeQuantity && <th className="p-2 w-16 text-center">Free Qty</th>}
                  {cfg.showSerialNumber && <th className="p-2 w-28 text-center">Serial Number</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-900">
                {items.map((item: any, index: number) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="p-2 text-center font-bold text-slate-500">{index + 1}</td>
                    {cfg.showItemName && (
                      <td className="p-2">
                        <div className="font-bold text-slate-900">{item.itemName}</div>
                        {cfg.showDescription && item.description && <div className="text-[10px] text-slate-600 leading-tight">{item.description}</div>}
                        {cfg.showNotes && item.notes && <div className="text-[10px] text-amber-800 font-semibold">{item.notes}</div>}
                      </td>
                    )}
                    {cfg.showHsn && <td className="p-2 text-center font-mono font-semibold text-slate-700">{item.hsnSac || '-'}</td>}
                    {cfg.showUnit && <td className="p-2 text-center font-semibold text-slate-700">{item.unit || 'Nos'}</td>}
                    {cfg.showQuantity && <td className="p-2 text-center font-black font-mono text-xs">{item.quantity}</td>}
                    {cfg.showFreeQuantity && <td className="p-2 text-center font-bold font-mono text-slate-600">{item.freeQuantity || 0}</td>}
                    {cfg.showSerialNumber && <td className="p-2 text-center font-mono font-extrabold text-emerald-800">{item.serialNumber || '-'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Transport, Reason & Notes Bar */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="font-extrabold text-slate-900 block mb-0.5">Dispatch Reason:</span>
              <span className="font-semibold text-slate-700">{challan.reason || 'Delivery against sale'}</span>
              {cfg.showNotes && challan.notes && (
                <div className="mt-1.5">
                  <span className="font-extrabold text-slate-900 block mb-0.5">Notes:</span>
                  <span className="text-slate-600 leading-tight">{challan.notes}</span>
                </div>
              )}
            </div>

            <div className="text-right space-y-0.5 font-medium">
              {cfg.showTransport && <div>Transporter / Vehicle: <span className="font-bold text-slate-900">{challan.transporter || 'Direct Delivery'}</span></div>}
              {cfg.showVehicleNumber && challan.vehicleNumber && <div>Vehicle Reg No: <span className="font-mono font-bold text-slate-900">{challan.vehicleNumber}</span></div>}
              <div>Stock Impact: <span className="font-bold text-emerald-800">{challan.stockDeducted ? 'Deducted from Inventory' : 'No Stock Impact'}</span></div>
            </div>
          </div>

          {/* Terms & Conditions Snapshot */}
          {cfg.showTerms && (
            <div className="border-t border-slate-300 pt-3 mb-6">
              <div className="font-extrabold text-[10px] uppercase text-slate-600 tracking-wider mb-1">
                Terms & Conditions
              </div>
              <ul className="list-decimal list-inside text-[10px] text-slate-700 space-y-0.5 font-medium">
                {termsList.map((term, i) => (
                  <li key={i}>{term}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Signatures Footer */}
          <div className="flex justify-between items-end pt-6 border-t-2 border-slate-900 text-[11px]">
            <div>
              {cfg.showCustomerSignature && (
                <div>
                  <div className="h-10"></div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-slate-700">Receiver's Signature & Stamp</div>
                </div>
              )}
            </div>

            <div className="text-right">
              {(cfg.showSignature !== false && cfg.showAuthSignature !== false) && (
                <div>
                  <div className="font-extrabold text-slate-900 mb-1">For {company.businessName || company.companyName || 'Smart Agro Machinerys'}</div>
                  <div className="my-1 min-h-[40px] flex justify-end items-center">
                    {company.signatureUrl ? (
                      <img
                        src={company.signatureUrl}
                        alt="Authorized Signature"
                        className="h-10 max-w-[140px] object-contain"
                      />
                    ) : (
                      <div className="h-8" />
                    )}
                  </div>
                  <div className="border-t border-slate-900 pt-1 font-black text-slate-900 uppercase">Authorised Signatory</div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
