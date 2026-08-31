import React from 'react';
import { X, Edit, Trash2, User, Phone, MapPin, FileText } from 'lucide-react';

interface ViewPartyModalProps {
  party: any;
  summary?: any;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const ViewPartyModal: React.FC<ViewPartyModalProps> = ({
  party,
  summary,
  onEdit,
  onDelete,
  onClose,
}) => {
  if (!party) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full my-6 overflow-hidden flex flex-col border border-gray-100 max-h-[92vh]">
        
        {/* Top Header */}
        <div className="bg-blue-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-800 flex items-center justify-center text-blue-300">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold">{party.name}</h2>
              <p className="text-xs text-blue-300/80 font-semibold font-mono">
                {party.type} • {party.customerType || 'GENERAL'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="px-3.5 py-2 bg-blue-800 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
            >
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button
              onClick={onDelete}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-4 h-4" /> Delete / Deactivate
            </button>
            <button onClick={onClose} className="text-blue-400 hover:text-white p-1 rounded-lg ml-2">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${party.active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
              {party.active ? '● ACTIVE PARTY' : '● INACTIVE (DEACTIVATED)'}
            </span>
            {party.gstin && <span className="font-mono bg-gray-100 px-3 py-1 rounded-lg font-bold text-gray-800">GSTIN: {party.gstin}</span>}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="w-4 h-4 text-blue-600" />
                <span className="font-mono font-bold">{party.mobile}</span>
                {party.altMobile && <span className="text-gray-400 font-mono">/ {party.altMobile}</span>}
              </div>

              {party.email && (
                <div className="text-gray-600 pl-6">{party.email}</div>
              )}

              <div className="flex items-start gap-2 text-gray-700 pt-1">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">{party.address || 'No address line'}</div>
                  <div className="text-gray-500">
                    {[party.village, party.taluk, party.district, party.state].filter(Boolean).join(', ')} {party.pincode ? `- ${party.pincode}` : ''}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 font-mono text-right bg-white p-3 rounded-xl border border-gray-200">
              <div className="text-gray-500 font-medium text-[11px]">Opening Balance:</div>
              <div className="font-bold text-gray-900">₹{(party.openingBalance || 0).toLocaleString('en-IN')}</div>
              <div className="text-gray-500 font-medium text-[11px] pt-1">Credit Limit:</div>
              <div className="font-bold text-blue-900">
                {party.creditLimit > 0 ? `₹${party.creditLimit.toLocaleString('en-IN')}` : 'Unlimited'}
              </div>
            </div>
          </div>

          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
                <div className="text-gray-500 text-[10px] uppercase font-bold">Total Sales</div>
                <div className="font-mono font-extrabold text-blue-900 text-sm mt-0.5">₹{(summary.totalSales || 0).toLocaleString('en-IN')}</div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                <div className="text-gray-500 text-[10px] uppercase font-bold">Sales Balance Due</div>
                <div className="font-mono font-extrabold text-amber-900 text-sm mt-0.5">₹{(summary.salesBalance || 0).toLocaleString('en-IN')}</div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center col-span-2 md:col-span-1">
                <div className="text-gray-500 text-[10px] uppercase font-bold">Total Purchases</div>
                <div className="font-mono font-extrabold text-emerald-900 text-sm mt-0.5">₹{(summary.totalPurchases || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>
          )}

          {party.notes && (
            <div className="p-3 bg-gray-50 border rounded-xl text-gray-700">
              <span className="font-bold block text-gray-900 mb-0.5">Notes:</span>
              {party.notes}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
