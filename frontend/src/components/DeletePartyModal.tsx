import React, { useState } from 'react';
import { AlertTriangle, Trash2, Power, X, ShieldAlert } from 'lucide-react';
import { apiRequest } from '../api';

interface DeletePartyModalProps {
  party: any;
  onSuccess: (msg: string) => void;
  onClose: () => void;
}

export const DeletePartyModal: React.FC<DeletePartyModalProps> = ({
  party,
  onSuccess,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [references, setReferences] = useState<any | null>(null);

  if (!party) return null;

  const handleDelete = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest(`/parties/${party.id}`, { method: 'DELETE' });
      onSuccess(res.message || 'Party deleted permanently.');
    } catch (err: any) {
      if (err.message && err.message.includes('associated with')) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(err.message || 'Failed to delete party');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDeactivate = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest(`/parties/${party.id}/toggle-status`, { method: 'POST' });
      onSuccess(res.message || `Party status updated.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update party status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-gray-200 animate-in fade-in zoom-in duration-200">
        
        {/* Header Icon & Title */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className={`w-12 h-12 rounded-2xl ${party.active ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'} flex items-center justify-center shrink-0`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">
              {party.active ? 'Delete or Deactivate Party?' : 'Reactivate Party?'}
            </h2>
            <p className="text-xs text-gray-500 font-semibold">{party.type} • {party.mobile}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-auto">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Party Detail Box */}
        <div className="my-4 p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600 font-medium">Party Name:</span>
            <span className="font-bold text-gray-900">{party.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 font-medium">Mobile:</span>
            <span className="font-mono text-gray-800">{party.mobile}</span>
          </div>
          {party.gstin && (
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">GSTIN:</span>
              <span className="font-mono text-gray-800">{party.gstin}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600 font-medium">Current Status:</span>
            <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${party.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {party.active ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
        </div>

        {/* Error / Reference Warning Message */}
        {errorMsg && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 mb-4 leading-relaxed flex gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-950 block mb-0.5">Historical References Found:</span>
              {errorMsg}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t">
          {party.active ? (
            <>
              {errorMsg ? (
                /* When party has history, present Deactivate */
                <button
                  type="button"
                  onClick={handleToggleDeactivate}
                  disabled={loading}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition"
                >
                  <Power className="w-4 h-4" />
                  <span>{loading ? 'Deactivating...' : 'Deactivate Party Instead'}</span>
                </button>
              ) : (
                /* Initial Attempt: Delete Permanently */
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{loading ? 'Deleting...' : 'Delete Permanently'}</span>
                </button>
              )}
            </>
          ) : (
            /* Reactivate Party */
            <button
              type="button"
              onClick={handleToggleDeactivate}
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition"
            >
              <Power className="w-4 h-4" />
              <span>{loading ? 'Reactivating...' : 'Reactivate Party'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition mt-1"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};
