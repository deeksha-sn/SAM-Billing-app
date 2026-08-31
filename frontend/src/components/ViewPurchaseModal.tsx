import React from 'react';
import { X, Edit, Trash2, Printer, Share2, ShoppingBag } from 'lucide-react';

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
  if (!purchase) return null;

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
              <h2 className="text-base font-extrabold">{purchase.purchaseNumber}</h2>
              <p className="text-xs text-emerald-300/80 font-semibold font-mono">
                Supplier Inv: {purchase.supplierInvoiceNo || 'N/A'} • {new Date(purchase.purchaseDate).toLocaleDateString('en-IN')}
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

        {/* Purchase Info Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          
          {/* Supplier Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
            <div>
              <h3 className="font-extrabold text-emerald-950 text-sm mb-1">{party.name || 'Supplier'}</h3>
              <p className="text-gray-600">Mobile: <span className="font-mono font-bold text-gray-800">{party.mobile}</span></p>
              {party.gstin && <p className="text-gray-600">GSTIN: <span className="font-mono font-bold text-gray-800">{party.gstin}</span></p>}
              {party.address && <p className="text-gray-600 mt-1">{party.address}</p>}
            </div>

            <div className="space-y-1 font-mono text-right">
              <div className="text-gray-500 font-semibold">Payment Status:</div>
              <span className={`inline-block px-3 py-1 rounded-full font-bold text-xs ${
                purchase.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {purchase.status}
              </span>
              <div className="pt-2 text-gray-600">Grand Total: <span className="font-extrabold text-emerald-950 text-base">₹{(purchase.grandTotal || 0).toLocaleString('en-IN')}</span></div>
              <div className="text-gray-500">Balance Due: ₹{(purchase.balanceDue || 0).toLocaleString('en-IN')}</div>
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
                    <th className="p-3">Item Description</th>
                    <th className="p-3 w-20">HSN</th>
                    <th className="p-3 w-20 text-center">Qty</th>
                    <th className="p-3 w-28 text-right">Rate (₹)</th>
                    <th className="p-3 w-20 text-center">GST %</th>
                    <th className="p-3 w-32 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {items.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="p-3 text-center text-gray-400 font-bold">{idx + 1}</td>
                      <td className="p-3 font-bold text-gray-900">{item.itemName}</td>
                      <td className="p-3 font-mono text-gray-600">{item.hsnSac || '-'}</td>
                      <td className="p-3 text-center font-bold font-mono">{item.quantity} {item.unit}</td>
                      <td className="p-3 text-right font-mono">₹{item.rate.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-center font-bold">{item.gstRate}%</td>
                      <td className="p-3 text-right font-mono font-bold text-gray-900">
                        ₹{item.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {purchase.notes && (
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
