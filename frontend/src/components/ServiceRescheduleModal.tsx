import React, { useState } from 'react';
import { X, Calendar, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { apiRequest } from '../api';

interface ServiceRescheduleModalProps {
  service: any;
  onRescheduled: () => void;
  onClose: () => void;
}

export const ServiceRescheduleModal: React.FC<ServiceRescheduleModalProps> = ({
  service,
  onRescheduled,
  onClose,
}) => {
  const [newDate, setNewDate] = useState<string>(
    service?.serviceDueDate
      ? new Date(service.serviceDueDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!service) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) {
      setErrorMsg('Please select a new service due date');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await apiRequest(`/services/${service.id}/reschedule`, {
        method: 'PUT',
        body: JSON.stringify({
          newServiceDueDate: newDate,
          reason: reason.trim() || undefined,
        }),
      });

      alert(`Service ${service.serviceNo} rescheduled to ${new Date(newDate).toLocaleDateString('en-IN')}. Reminder schedule recalculated.`);
      onRescheduled();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reschedule service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-gray-100 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900">Reschedule Service Task</h2>
            <p className="text-xs text-gray-500 font-semibold">{service.serviceNo} • {service.serialNumber}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-auto">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="my-4 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 font-semibold rounded-xl text-xs">
              {errorMsg}
            </div>
          )}

          {/* Current Info Snapshot */}
          <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400">Current Service Info</div>
            <div className="text-xs font-bold text-emerald-400">{service.party?.name || 'Customer'}</div>
            <div className="text-xs text-slate-300">
              Machine: {service.machine?.model || service.serialNumber}
            </div>
            <div className="text-xs text-slate-400">
              Current Due Date: <span className="font-mono text-amber-300 font-bold">{new Date(service.serviceDueDate).toLocaleDateString('en-IN')}</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10px] mb-1">
              Select New Service Date *
            </label>
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full p-3 bg-white border border-gray-300 rounded-xl font-mono font-bold text-sm text-gray-900 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10px] mb-1">
              Reason for Rescheduling (Optional)
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer requested delay, machine unavailable..."
              className="w-full p-3 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900"
            ></textarea>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed text-xs">
            <span className="font-bold block mb-0.5">Automated Reminder Recalculation:</span>
            Rescheduling updates the service due date and automatically resets the 20-day, 10-day, 7-day, 3-day, and service-day reminder schedule.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{loading ? 'Rescheduling...' : 'Confirm Reschedule'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
