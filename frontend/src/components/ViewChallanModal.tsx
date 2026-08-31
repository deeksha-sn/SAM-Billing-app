import React from 'react';
import { X, Edit, Trash2, Printer, Truck } from 'lucide-react';

interface ViewChallanModalProps {
  challan: any;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const ViewChallanModal: React.FC<ViewChallanModalProps> = ({
  challan,
  onEdit,
  onDelete,
  onClose,
}) => {
  if (!challan) return null;

  const party = challan.party || {};
  const items = challan.items || [];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full my-6 overflow-hidden flex flex-col border border-gray-100 max-h-[92vh]">
        
        {/* Top Actions Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold">{challan.challanNumber}</h2>
              <p className="text-xs text-slate-400 font-semibold font-mono">
                Date: {new Date(challan.challanDate).toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
            >
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={onDelete}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg ml-2">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Challan Info Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm mb-1">{party.name || 'Customer'}</h3>
              <p className="text-gray-600">Mobile: <span className="font-mono font-bold text-gray-800">{challan.contactNumber || party.mobile}</span></p>
              <p className="text-gray-600 mt-1">Delivery Destination: <span className="font-semibold text-gray-900">{challan.deliveryAddress}</span></p>
            </div>

            <div className="space-y-1 font-mono text-right text-gray-700">
              {challan.vehicleNumber && <div>Vehicle No: <span className="font-bold text-slate-900">{challan.vehicleNumber}</span></div>}
              {challan.transporter && <div>Transporter: <span className="font-bold text-slate-900">{challan.transporter}</span></div>}
              <div>Dispatch Reason: <span className="font-bold text-slate-900">{challan.reason}</span></div>
              {challan.refOrderNo && <div>Ref PO No: <span className="font-bold text-slate-900">{challan.refOrderNo}</span></div>}
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h4 className="font-extrabold text-gray-900 mb-2 text-xs uppercase tracking-wider">Dispatched Line Items</h4>
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 text-gray-700 font-extrabold uppercase text-[10px] tracking-wider border-b">
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">Item Description</th>
                    <th className="p-3 w-28 text-center">Unit</th>
                    <th className="p-3 w-32 text-center">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {items.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="p-3 text-center text-gray-400 font-bold">{idx + 1}</td>
                      <td className="p-3 font-bold text-gray-900">{item.itemName}</td>
                      <td className="p-3 text-center font-semibold text-gray-600">{item.unit || 'Nos'}</td>
                      <td className="p-3 text-center font-bold font-mono text-base text-slate-900">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {challan.notes && (
            <div className="p-3 bg-gray-50 border rounded-xl text-gray-700">
              <span className="font-bold block text-gray-900 mb-0.5">Delivery Notes:</span>
              {challan.notes}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
