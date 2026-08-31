import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeletePurchaseModalProps {
  purchase: any;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

export const DeletePurchaseModal: React.FC<DeletePurchaseModalProps> = ({
  purchase,
  onConfirm,
  onClose,
  loading = false,
}) => {
  if (!purchase) return null;

  const party = purchase.party || {};

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-red-200 animate-in fade-in zoom-in duration-200">
        
        {/* Header Icon & Title */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">Delete Purchase?</h2>
            <p className="text-xs text-red-600 font-semibold">Permanent Removal</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-auto">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Purchase Summary Box */}
        <div className="my-4 p-4 bg-red-50/70 border border-red-200 rounded-2xl space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600 font-medium">Purchase No:</span>
            <span className="font-bold font-mono text-red-900">{purchase.purchaseNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 font-medium">Supplier:</span>
            <span className="font-bold text-gray-900">{party.name || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 font-medium">Amount:</span>
            <span className="font-bold font-mono text-red-700">₹{(purchase.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Warning Text */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 mb-6 leading-relaxed">
          <span className="font-bold text-amber-950 block mb-0.5">Warning:</span>
          This permanently deletes this purchase and reverses its inventory additions and accounting/supplier ledger effects.
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-2 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>{loading ? 'Deleting...' : 'Delete Permanently'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
