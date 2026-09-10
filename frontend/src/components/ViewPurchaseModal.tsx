import React, { useState } from 'react';
import { X, Edit, Trash2, Printer, Share2, ShoppingBag } from 'lucide-react';
import { TemplateCustomizerToolbar } from './TemplateCustomizerToolbar';
import { BillFieldsConfig, DEFAULT_PURCHASE_FIELDS, BillTemplate } from '../types/billTemplate';

interface ViewPurchaseModalProps {
  purchase: any;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const ViewPurchaseModal: React.FC<ViewPurchaseModalProps> = ({
  purchase,
  onEdit,
  onDelete,
  onClose,
}) => {
  const [fieldConfig, setFieldConfig] = useState<BillFieldsConfig>(DEFAULT_PURCHASE_FIELDS);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  if (!purchase) return null;

  const cfg = fieldConfig;
  const party = purchase.party || {};
  const items = purchase.items || [];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full my-6 overflow-hidden flex flex-col border border-gray-100 max-h-[92vh]">
        
        {/* Top Actions Header */}
        <div className="bg-emerald-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center text-emerald-300">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              {cfg.showDocNumber && <h2 className="text-base font-extrabold">{purchase.purchaseNumber}</h2>}
              <p className="text-xs text-emerald-300/80 font-semibold font-mono">
                {cfg.showPoNumber && `Supplier Inv: ${purchase.supplierInvoiceNo || 'N/A'} • `}{cfg.showDate && new Date(purchase.purchaseDate).toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
            >
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={onDelete}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
            <button onClick={onClose} className="text-emerald-400 hover:text-white p-1 rounded-lg ml-2">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Template Customizer Toolbar */}
        <div className="px-6 py-2 bg-emerald-900 border-b border-emerald-800">
          <TemplateCustomizerToolbar
            documentType="PURCHASE"
            activeConfig={fieldConfig}
            onChangeConfig={setFieldConfig}
            activeTemplateId={activeTemplateId}
            onSelectTemplate={(tmpl: BillTemplate) => setActiveTemplateId(tmpl.id)}
          />
        </div>

        {/* Purchase Info Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          
          {/* Supplier Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
            <div>
              {cfg.showCustomerName && <h3 className="font-extrabold text-emerald-950 text-sm mb-1">{party.name || 'Supplier'}</h3>}
              {cfg.showBillingAddress && party.mobile && <p className="text-gray-600">Mobile: <span className="font-mono font-bold text-gray-800">{party.mobile}</span></p>}
              {cfg.showGstin && party.gstin && <p className="text-gray-600">GSTIN: <span className="font-mono font-bold text-gray-800">{party.gstin}</span></p>}
              {cfg.showBillingAddress && party.address && <p className="text-gray-600 mt-1">{party.address}</p>}
            </div>

            <div className="space-y-1 font-mono text-right">
              {cfg.showPaymentMode && (
                <>
                  <div className="text-gray-500 font-semibold">Payment Status:</div>
                  <span className={`inline-block px-3 py-1 rounded-full font-bold text-xs ${
                    purchase.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {purchase.status}
                  </span>
                </>
              )}
              {cfg.showTotalAmount && (
                <>
                  <div className="pt-2 text-gray-600">Grand Total: <span className="font-extrabold text-emerald-950 text-base">₹{(purchase.grandTotal || 0).toLocaleString('en-IN')}</span></div>
                  <div className="text-gray-500">Balance Due: ₹{(purchase.balanceDue || 0).toLocaleString('en-IN')}</div>
                </>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h4 className="font-extrabold text-gray-900 mb-2 text-xs uppercase tracking-wider">Purchased Items</h4>
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 text-gray-700 font-extrabold uppercase text-[10px] tracking-wider border-b">
                  <tr>
                    <th className="p-3 w-10 text-center">#</th>
                    {cfg.showItemName && <th className="p-3">Item Description</th>}
                    {cfg.showHsn && <th className="p-3 w-20">HSN</th>}
                    {cfg.showQuantity && <th className="p-3 w-20 text-center">Qty</th>}
                    {cfg.showRate && <th className="p-3 w-28 text-right">Rate (₹)</th>}
                    {cfg.showGstRate && <th className="p-3 w-20 text-center">GST %</th>}
                    {cfg.showTotalAmount && <th className="p-3 w-32 text-right">Total (₹)</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {items.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="p-3 text-center text-gray-400 font-bold">{idx + 1}</td>
                      {cfg.showItemName && <td className="p-3 font-bold text-gray-900">{item.itemName}</td>}
                      {cfg.showHsn && <td className="p-3 font-mono text-gray-600">{item.hsnSac || '-'}</td>}
                      {cfg.showQuantity && <td className="p-3 text-center font-bold font-mono">{item.quantity} {item.unit}</td>}
                      {cfg.showRate && <td className="p-3 text-right font-mono">₹{item.rate.toLocaleString('en-IN')}</td>}
                      {cfg.showGstRate && <td className="p-3 text-center font-bold">{item.gstRate}%</td>}
                      {cfg.showTotalAmount && (
                        <td className="p-3 text-right font-mono font-bold text-gray-900">
                          ₹{item.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* HSN/SAC Tax Breakdown Summary Table */}
          <div>
            <h4 className="font-extrabold text-gray-900 mb-2 text-xs uppercase tracking-wider">GST Tax Breakdown (HSN/SAC Summary)</h4>
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-center border-collapse">
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b">
                  <tr>
                    <th className="p-2 border-r">HSN/SAC</th>
                    <th className="p-2 border-r text-right">Taxable Amount</th>
                    {!purchase.isInterState ? (
                      <>
                        <th className="p-2 border-r text-right">CGST Rate</th>
                        <th className="p-2 border-r text-right">CGST Amt</th>
                        <th className="p-2 border-r text-right">SGST Rate</th>
                        <th className="p-2 border-r text-right">SGST Amt</th>
                      </>
                    ) : (
                      <>
                        <th className="p-2 border-r text-right">IGST Rate</th>
                        <th className="p-2 border-r text-right">IGST Amt</th>
                      </>
                    )}
                    <th className="p-2 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-[11px]">
                  {(() => {
                    const hsnMap: { [hsn: string]: { taxable: number; cgstRate: number; cgstAmount: number; sgstRate: number; sgstAmount: number; igstRate: number; igstAmount: number; totalTax: number } } = {};
                    items.forEach((item: any) => {
                      const hsn = item.hsnSac || '8436';
                      const gstRate = item.gstRate || 0;
                      const isExempt = item.isExempt || gstRate === 0;
                      if (!hsnMap[hsn]) {
                        hsnMap[hsn] = {
                          taxable: 0,
                          cgstRate: !purchase.isInterState && !isExempt ? gstRate / 2 : 0,
                          cgstAmount: 0,
                          sgstRate: !purchase.isInterState && !isExempt ? gstRate / 2 : 0,
                          sgstAmount: 0,
                          igstRate: purchase.isInterState && !isExempt ? gstRate : 0,
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
                      <tr key={hsn} className="hover:bg-gray-50/50">
                        <td className="p-2 border-r font-mono font-bold">{hsn}</td>
                        <td className="p-2 border-r text-right font-mono">₹{data.taxable.toFixed(2)}</td>
                        {!purchase.isInterState ? (
                          <>
                            <td className="p-2 border-r text-right font-mono">{data.cgstRate}%</td>
                            <td className="p-2 border-r text-right font-mono">₹{data.cgstAmount.toFixed(2)}</td>
                            <td className="p-2 border-r text-right font-mono">{data.sgstRate}%</td>
                            <td className="p-2 border-r text-right font-mono">₹{data.sgstAmount.toFixed(2)}</td>
                          </>
                        ) : (
                          <>
                            <td className="p-2 border-r text-right font-mono">{data.igstRate}%</td>
                            <td className="p-2 border-r text-right font-mono">₹{data.igstAmount.toFixed(2)}</td>
                          </>
                        )}
                        <td className="p-2 text-right font-mono font-bold">₹{data.totalTax.toFixed(2)}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {cfg.showNotes && purchase.notes && (
            <div className="p-3 bg-gray-50 border rounded-xl text-gray-700">
              <span className="font-bold block text-gray-900 mb-0.5">Purchase Notes:</span>
              {purchase.notes}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
