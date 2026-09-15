import React, { useState, useEffect } from 'react';
import { X, UserCheck, Wrench, Star, MapPin, Briefcase, CheckCircle2, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../api';

interface AssignTechnicianModalProps {
  serviceIds: string[];
  onAssigned: () => void;
  onClose: () => void;
}

export const AssignTechnicianModal: React.FC<AssignTechnicianModalProps> = ({
  serviceIds,
  onAssigned,
  onClose,
}) => {
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [recommendedTech, setRecommendedTech] = useState<any | null>(null);
  const [targetLocation, setTargetLocation] = useState<any | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, [serviceIds]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const firstServiceId = serviceIds[0];
      const query = firstServiceId ? `?serviceId=${firstServiceId}` : '';
      const res = await apiRequest(`/services/technicians/recommended${query}`);

      setTechnicians(res.technicians || []);
      setRecommendedTech(res.recommendedTechnician || null);
      setTargetLocation(res.targetLocation || null);

      if (res.recommendedTechnician) {
        setSelectedTechnicianId(res.recommendedTechnician.id);
      } else if (res.technicians?.length > 0) {
        setSelectedTechnicianId(res.technicians[0].id);
      }
    } catch (err) {
      console.error('Failed to load technician recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTechnicianId) {
      setErrorMsg('Please select a technician');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await apiRequest('/services/assign', {
        method: 'POST',
        body: JSON.stringify({
          serviceIds,
          technicianId: selectedTechnicianId,
        }),
      });
      onAssigned();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to assign technician');
    } finally {
      setSubmitting(false);
    }
  };

  const getBadgeStyle = (category: string) => {
    switch (category) {
      case 'SAME_PIN':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold';
      case 'SAME_TALUK':
        return 'bg-blue-100 text-blue-900 border-blue-300 font-extrabold';
      case 'SURROUNDING_PIN':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300 font-extrabold';
      case 'SAME_DISTRICT':
        return 'bg-purple-100 text-purple-900 border-purple-300 font-semibold';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 font-medium';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-gray-100 animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900">Location-Based Technician Assignment</h2>
            <p className="text-xs text-gray-500 font-semibold">{serviceIds.length} Service Job(s) Selected</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-auto">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="my-4 space-y-4 text-xs overflow-y-auto pr-1 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 font-semibold rounded-xl text-xs">
              {errorMsg}
            </div>
          )}

          {/* Service Target Location Box */}
          {targetLocation && (
            <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  Service Target Location
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  PIN: {targetLocation.pincode || 'N/A'}
                </span>
              </div>
              <div className="text-xs font-bold">
                Taluk: <span className="text-emerald-300">{targetLocation.taluk || 'N/A'}</span> | District: <span className="text-slate-300">{targetLocation.district || 'N/A'}</span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-gray-500 font-semibold">
              Calculating technician location & workload rankings...
            </div>
          ) : (
            <div className="space-y-2.5">
              <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10px]">
                Ranked Technicians (Highest Match First):
              </label>

              {technicians.map((t) => {
                const isSelected = selectedTechnicianId === t.id;

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTechnicianId(t.id)}
                    className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/60 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="technicianSelect"
                          checked={isSelected}
                          onChange={() => setSelectedTechnicianId(t.id)}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                            {t.name}
                            {t.isTopRecommendation && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-[10px] font-black">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> RECOMMENDED
                              </span>
                            )}
                          </span>
                          <p className="text-[11px] text-gray-500 font-medium">
                            📱 {t.mobile || 'No Phone'} • {t.role.replace('_', ' ')}
                          </p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-xl text-[10px] border ${getBadgeStyle(t.matchCategory)}`}>
                        {t.matchLabel}
                      </span>
                    </div>

                    {/* Location & Workload Sub-bar */}
                    <div className="flex items-center justify-between text-[11px] text-gray-600 pt-1 border-t border-gray-100">
                      <span className="flex items-center gap-1 font-semibold">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        PIN: {t.pincode || 'N/A'} | Taluk: {t.taluk || 'N/A'}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-slate-800">
                        <Briefcase className="w-3 h-3 text-indigo-600" />
                        {t.workloadCount} job(s) assigned
                      </span>
                    </div>
                  </div>
                );
              })}

              {technicians.length === 0 && (
                <div className="p-6 text-center text-gray-500 font-medium border border-dashed rounded-2xl">
                  No active service technicians found in master database.
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedTechnicianId}
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-lg flex items-center gap-2"
            >
              <Wrench className="w-4 h-4" />
              <span>{submitting ? 'Assigning...' : 'Assign Selected Job(s)'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
