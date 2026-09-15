import React, { useState, useEffect } from 'react';
import { X, MapPin, Navigation, UserCheck, Calendar, CheckCircle2, ArrowRight } from 'lucide-react';
import { apiRequest } from '../api';

interface RoutePlanningModalProps {
  onClose: () => void;
  technicians?: any[];
  onOpenAssign?: (serviceIds: string[]) => void;
}

export const RoutePlanningModal: React.FC<RoutePlanningModalProps> = ({
  onClose,
  technicians = [],
  onOpenAssign = () => {},
}) => {
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchRouteGroups();
  }, [selectedTechId]);

  const fetchRouteGroups = async () => {
    setLoading(true);
    try {
      const query = selectedTechId ? `?technicianId=${selectedTechId}` : '';
      const res = await apiRequest(`/services/route-planning${query}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load route planning groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const groups: any[] = data?.groups || [];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col my-4 max-h-[92vh] border border-gray-200 overflow-hidden">
        
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">Weekly Nearby Service Grouping & Route Planning</h2>
              <p className="text-xs text-slate-400 font-semibold">Group services by PIN Code & Taluk to send one technician to nearby locations</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="bg-slate-100 p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <label className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">Filter Technician:</label>
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="p-2 bg-white border border-gray-300 rounded-xl font-bold text-xs text-gray-900 focus:ring-2 focus:ring-indigo-600"
            >
              <option value="">-- All Technicians (All Locations) --</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} • PIN: {t.pincode || 'N/A'} ({t.taluk || 'N/A'})
                </option>
              ))}
            </select>
          </div>

          {data && (
            <div className="bg-indigo-900 text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{data.summaryMessage}</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50 text-xs">
          {loading ? (
            <div className="p-12 text-center text-gray-500 font-bold">
              Analyzing service locations & clustering routes by PIN code...
            </div>
          ) : groups.length === 0 ? (
            <div className="p-12 text-center space-y-2 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <Navigation className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-gray-800 font-bold text-sm">No active services this week for route grouping</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group: any, idx: number) => {
                const isMultiService = group.services.length >= 2;
                const serviceIds = group.services.map((s: any) => s.id);

                return (
                  <div
                    key={idx}
                    className={`bg-white rounded-2xl border p-5 shadow-sm space-y-3 ${
                      isMultiService ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-900 font-black flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                            <span>PIN Code: <strong className="font-mono text-indigo-900">{group.pincode}</strong></span>
                            <span className="text-gray-400 font-normal">•</span>
                            <span>Taluk: <strong className="text-gray-800">{group.taluk}</strong></span>
                          </h3>
                          {isMultiService && (
                            <p className="text-[11px] text-emerald-700 font-bold">
                              ✨ {group.services.length} nearby services can be grouped into one route for efficient technician dispatch!
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => { onClose(); onOpenAssign(serviceIds); }}
                        className="px-4 py-2 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Assign Group ({group.services.length} Jobs)</span>
                      </button>
                    </div>

                    {/* Services in this location cluster */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {group.services.map((s: any) => (
                        <div key={s.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1 text-[11px]">
                          <div className="flex justify-between items-start">
                            <span className="font-mono text-gray-400 font-bold text-[10px]">{s.serviceNo}</span>
                            <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {new Date(s.serviceDueDate).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                          <p className="font-extrabold text-gray-900 text-xs">{s.party?.name || 'Customer'}</p>
                          {s.farmer?.name && (
                            <p className="text-emerald-700 font-semibold">Farmer: {s.farmer.name}</p>
                          )}
                          <p className="text-gray-600">🚜 {s.machine?.model || s.serialNumber} ({s.serialNumber})</p>
                          <p className="text-gray-500 font-medium">📍 {s.farmer?.address || s.party.address || 'Location'}, {group.pincode}</p>
                        </div>
                      ))}
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
