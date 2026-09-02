import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteChallanModalProps {
  challan: any;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

export const DeleteChallanModal: React.FC<DeleteChallanModalProps> = ({
  challan,
  onConfirm,
  onClose,
  loading = false,
}) => {
  if (!challan) return null;

  const party = challan.party || {};

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-red-200 animate-in fade-in zoom-in duration-200">
        
        {/* Header Icon & Title */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-900">
              Are you sure you want to delete Delivery Challan {challan.challanNumber}?
            </h2>
            <p className="text-xs text-red-600 font-semibold">Permanent Removal</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-auto">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Text */}
        <div className="my-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 leading-relaxed font-medium">
          This action will permanently remove the challan. If stock was deducted, the stock will be restored.
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
