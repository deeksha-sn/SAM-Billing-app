import React, { useState, useEffect } from 'react';
import { X, History, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { apiRequest } from '../api';

interface ReminderLogModalProps {
  onClose: () => void;
}

export const ReminderLogModal: React.FC<ReminderLogModalProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/services/reminder-logs');
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to load reminder logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full my-6 overflow-hidden flex flex-col border border-gray-100 max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold">WhatsApp & Service Reminder Logs</h2>
              <p className="text-xs text-slate-400 font-medium">Audit History of All Automated & Manual Reminders</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Table Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 text-gray-700 font-extrabold uppercase text-[10px] tracking-wider border-b">
                  <tr>
                    <th className="p-3">Sent Time</th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Reminder Type</th>
                    <th className="p-3 text-center">Mode</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3">Message Content</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400 font-medium">Loading reminder logs...</td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400 font-medium">No reminder logs found</td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono text-gray-600">
                          {new Date(log.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="p-3 font-bold text-gray-900">{log.recipientName}</td>
                        <td className="p-3 font-mono text-gray-800">{log.recipientPhone}</td>
                        <td className="p-3">
                          <span className="font-extrabold text-[10px] uppercase px-2 py-0.5 bg-blue-50 text-blue-800 rounded">
                            {log.reminderType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-[10px] text-gray-600 uppercase">
                          {log.isAutomatic ? 'Auto Cron' : 'Manual'}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                            log.status === 'SENT' ? 'bg-emerald-100 text-emerald-800' :
                            log.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                            log.status === 'OPTED_OUT' ? 'bg-amber-100 text-amber-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-gray-700 font-mono truncate max-w-xs" title={log.messageText}>
                          {log.messageText}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
