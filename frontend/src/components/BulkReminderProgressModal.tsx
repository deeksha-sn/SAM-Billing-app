import React, { useState } from 'react';
import { X, Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../api';

interface BulkReminderProgressModalProps {
  todayCount: number;
  onFinished: () => void;
  onClose: () => void;
}

export const BulkReminderProgressModal: React.FC<BulkReminderProgressModalProps> = ({
  todayCount,
  onFinished,
  onClose,
}) => {
  const [running, setRunning] = useState(false);
  const [resultStats, setResultStats] = useState<any | null>(null);

  const handleStartBulk = async () => {
    setRunning(true);
    try {
      const res = await apiRequest('/services/remind-today-bulk', {
        method: 'POST',
      });
      setResultStats(res.stats || { sentCount: todayCount, failedCount: 0, skippedCount: 0 });
      onFinished();
    } catch (err: any) {
      alert(err.message || 'Failed to process bulk reminders');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-emerald-100 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Bulk Service Reminders</h2>
            <p className="text-xs text-gray-500 font-semibold">{todayCount} Customer(s) Due Today</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-auto">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="my-4 text-xs space-y-3">
          {!resultStats ? (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-emerald-950 leading-relaxed">
              <span className="font-bold block mb-1">Confirmation:</span>
              This will evaluate all {todayCount} customer services due today, skip opted-out or previously reminded customers, and send/log WhatsApp service reminders.
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Bulk Reminders Completed</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 text-center font-mono">
                <div className="p-2 bg-white rounded-xl border border-emerald-100">
                  <div className="text-[10px] text-gray-500 font-bold uppercase">Sent</div>
                  <div className="font-extrabold text-emerald-700 text-sm">{resultStats.sentCount}</div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-amber-100">
                  <div className="text-[10px] text-gray-500 font-bold uppercase">Skipped</div>
                  <div className="font-extrabold text-amber-700 text-sm">{resultStats.skippedCount}</div>
                </div>
                <div className="p-2 bg-white rounded-xl border border-red-100">
                  <div className="text-[10px] text-gray-500 font-bold uppercase">Failed</div>
                  <div className="font-extrabold text-red-700 text-sm">{resultStats.failedCount}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
          >
            {resultStats ? 'Close' : 'Cancel'}
          </button>
          {!resultStats && (
            <button
              type="button"
              onClick={handleStartBulk}
              disabled={running}
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-800/30 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>{running ? 'Sending Reminders...' : 'Send Reminders Now'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
