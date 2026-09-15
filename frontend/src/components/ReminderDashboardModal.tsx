import React, { useState, useEffect } from 'react';
import { X, Bell, Calendar, Phone, MessageSquare, AlertTriangle, CheckCircle2, Clock, MapPin, RefreshCw, Send } from 'lucide-react';
import { apiRequest } from '../api';

interface ReminderDashboardModalProps {
  onClose: () => void;
  onOpenReschedule?: (service: any) => void;
  onOpenComplete?: (service: any) => void;
  onOpenAssign?: (serviceId: string) => void;
}

export const ReminderDashboardModal: React.FC<ReminderDashboardModalProps> = ({
  onClose,
  onOpenReschedule = () => {},
  onOpenComplete = () => {},
  onOpenAssign = () => {},
}) => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingReminders, setProcessingReminders] = useState<boolean>(false);

  useEffect(() => {
    fetchReminderSummary();
  }, []);

  const fetchReminderSummary = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/services/reminders/summary');
      setData(res);
    } catch (err) {
      console.error('Failed to load reminder summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessReminders = async () => {
    setProcessingReminders(true);
    try {
      const res = await apiRequest('/services/reminders/process', { method: 'POST' });
      alert(res.message || 'Reminder processing completed!');
      fetchReminderSummary();
    } catch (err: any) {
      alert(`Error processing reminders: ${err.message}`);
    } finally {
      setProcessingReminders(false);
    }
  };

  // Generate WhatsApp prefilled URL for customer
  const getWhatsAppUrl = (item: any, stageName: string) => {
    const phone = item.phone ? item.phone.replace(/[^0-9]/g, '') : '';
    const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;

    const text = `Dear ${item.farmerName || item.customerName},\n\n*SERVICE REMINDER - SMART AGRO MACHINERYS*\nStage: ${stageName}\n\n🚜 Machine: ${item.machine?.model || item.serialNumber}\n🔢 Serial No: ${item.serialNumber}\n📍 Location: ${item.fullAddress || 'Customer Location'} (PIN: ${item.pincode || 'N/A'})\n📅 Service Due Date: ${item.formattedDueDate}\n👨‍🔧 Assigned Technician: ${item.assignedTechnician?.name || 'Unassigned'}\n\nPlease contact us to confirm your service appointment.\nPhone: +91 98765 43210\nThank you!`;

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
  };

  const getFilteredItems = () => {
    if (!data?.stages) return [];

    switch (activeTab) {
      case 'days20':
        return data.stages.days20 || [];
      case 'days10':
        return data.stages.days10 || [];
      case 'days7':
        return data.stages.days7 || [];
      case 'days3':
        return data.stages.days3 || [];
      case 'today':
        return data.stages.todayReminders || [];
      case 'overdue':
        return data.stages.overdueReminders || [];
      default:
        return [
          ...(data.stages.overdueReminders || []),
          ...(data.stages.todayReminders || []),
          ...(data.stages.days3 || []),
          ...(data.stages.days7 || []),
          ...(data.stages.days10 || []),
          ...(data.stages.days20 || []),
        ];
    }
  };

  const counts = data?.counts || {
    days20: 0,
    days10: 0,
    days7: 0,
    days3: 0,
    today: 0,
    overdue: 0,
    totalDue: 0,
  };

  const items = getFilteredItems();

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full flex flex-col my-4 max-h-[92vh] border border-gray-200 overflow-hidden">
        
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>Customer Service Reminder Dashboard</span>
                <span className="px-2.5 py-0.5 bg-emerald-500 text-slate-950 font-mono text-[10px] font-black rounded-full">
                  {counts.totalDue} DUE
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-semibold">20-Day, 10-Day, 7-Day, 3-Day, Service-Day & Overdue Persistent Reminders</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleProcessReminders}
              disabled={processingReminders}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${processingReminders ? 'animate-spin' : ''}`} />
              <span>{processingReminders ? 'Running Engine...' : 'Run Auto Reminders'}</span>
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Stage Filter Tabs */}
        <div className="bg-slate-100 p-2 border-b border-gray-200 flex flex-wrap gap-1.5 shrink-0 text-xs">
          {[
            { id: 'all', label: 'All Due Reminders', count: counts.totalDue, color: 'bg-slate-900 text-white' },
            { id: 'overdue', label: 'Overdue', count: counts.overdue, color: 'bg-red-600 text-white' },
            { id: 'today', label: 'Service Day', count: counts.today, color: 'bg-amber-600 text-white' },
            { id: 'days3', label: '3 Days Before', count: counts.days3, color: 'bg-indigo-600 text-white' },
            { id: 'days7', label: '7 Days Before', count: counts.days7, color: 'bg-blue-600 text-white' },
            { id: 'days10', label: '10 Days Before', count: counts.days10, color: 'bg-purple-600 text-white' },
            { id: 'days20', label: '20 Days Before', count: counts.days20, color: 'bg-emerald-700 text-white' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow border border-gray-300'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono ${tab.color}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50 text-xs">
          {loading ? (
            <div className="p-12 text-center text-gray-500 font-bold">
              Loading reminder database records...
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center space-y-2 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="text-gray-800 font-bold text-sm">No reminders in this stage</p>
              <p className="text-gray-500 text-xs">All scheduled service reminders for this filter are up to date.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((item: any) => {
                const diff = item.diffDays;
                let stageBadge = 'bg-gray-100 text-gray-800 border-gray-300';
                let stageLabel = 'UPCOMING';

                if (diff < 0) {
                  stageBadge = 'bg-red-100 text-red-900 border-red-300 font-black';
                  stageLabel = `OVERDUE (${Math.abs(diff)} DAYS)`;
                } else if (diff === 0) {
                  stageBadge = 'bg-amber-100 text-amber-950 border-amber-300 font-black';
                  stageLabel = 'SERVICE DAY (TODAY)';
                } else if (diff === 3) {
                  stageBadge = 'bg-indigo-100 text-indigo-900 border-indigo-300 font-bold';
                  stageLabel = '3 DAYS BEFORE';
                } else if (diff === 7) {
                  stageBadge = 'bg-blue-100 text-blue-900 border-blue-300 font-bold';
                  stageLabel = '7 DAYS BEFORE';
                } else if (diff === 10) {
                  stageBadge = 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
                  stageLabel = '10 DAYS BEFORE';
                } else if (diff === 20) {
                  stageBadge = 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
                  stageLabel = '20 DAYS BEFORE';
                }

                const waUrl = getWhatsAppUrl(item, stageLabel);

                return (
                  <div
                    key={item.id}
                    className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2 border-b pb-2">
                        <div>
                          <span className="font-mono text-[10px] font-bold text-gray-400 block">{item.serviceNo}</span>
                          <h4 className="font-extrabold text-sm text-gray-900">{item.customerName}</h4>
                          {item.farmerName && item.farmerName !== item.customerName && (
                            <span className="text-[11px] font-semibold text-emerald-700 block">
                              Farmer: {item.farmerName}
                            </span>
                          )}
                        </div>
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] border ${stageBadge}`}>
                          {stageLabel}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <div>
                          <span className="text-gray-400 font-semibold block">Machine & Serial:</span>
                          <span className="font-bold text-gray-900">{item.machine?.model || item.serialNumber}</span>
                          <span className="block font-mono text-gray-500 font-bold">{item.serialNumber}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-semibold block">Scheduled Date:</span>
                          <span className="font-bold text-emerald-800 font-mono">{item.formattedDueDate}</span>
                          <span className="block text-gray-500">Tech: <strong className="text-gray-800">{item.assignedTechnician?.name || 'Unassigned'}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-start gap-1 text-[11px] text-gray-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{item.fullAddress} <strong className="text-gray-900 font-mono">(PIN: {item.pincode || 'N/A'})</strong></span>
                      </div>
                    </div>

                    {/* Action Toolbar */}
                    <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <a
                          href={`tel:${item.phone}`}
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-bold text-[11px] flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>Call</span>
                        </a>

                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      </div>

                      <div className="flex items-center gap-1">
                        {!item.assignedTechnicianId && (
                          <button
                            onClick={() => { onClose(); onOpenAssign(item.id); }}
                            className="px-2 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg font-bold text-[10px]"
                          >
                            Assign Tech
                          </button>
                        )}
                        <button
                          onClick={() => { onClose(); onOpenReschedule(item); }}
                          className="px-2 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-bold text-[10px]"
                        >
                          Reschedule
                        </button>
                        <button
                          onClick={() => { onClose(); onOpenComplete(item); }}
                          className="px-2 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg font-bold text-[10px]"
                        >
                          Complete
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
