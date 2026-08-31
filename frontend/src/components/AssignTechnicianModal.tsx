import React, { useState, useEffect } from 'react';
import { X, UserCheck, Wrench } from 'lucide-react';
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
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    try {
      const res = await apiRequest('/users');
      const techUsers = (res.users || []).filter(
        (u: any) => u.role === 'SERVICE_MANAGER' || u.role === 'TECHNICIAN' || u.role === 'ADMIN'
      );
      setTechnicians(techUsers);
      if (techUsers.length > 0) setSelectedTechnicianId(techUsers[0].id);
    } catch (err) {
      console.error('Failed to load technicians list:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTechnicianId) {
      setErrorMsg('Please select a technician');
      return;
    }

    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-gray-100 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Assign Technician</h2>
            <p className="text-xs text-gray-500 font-semibold">{serviceIds.length} Service Job(s) Selected</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-auto">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="my-4 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 font-semibold rounded-xl text-xs">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block font-bold text-gray-700 mb-1">Select Service Technician *</label>
            <select
              value={selectedTechnicianId}
              onChange={(e) => setSelectedTechnicianId(e.target.value)}
              className="w-full p-3 bg-white border border-gray-300 rounded-xl font-bold text-sm text-gray-900 focus:ring-2 focus:ring-blue-900"
            >
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.role.replace('_', ' ')}) • {t.mobile || 'No Phone'}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 leading-relaxed text-xs">
            <span className="font-bold block mb-0.5">Technician Notification:</span>
            Assigning will update service status to <span className="font-mono font-bold text-blue-950">ASSIGNED</span> and make jobs available on the technician's mobile interface.
          </div>

          {/* Action Buttons */}
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
              className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl shadow-lg shadow-blue-900/30 flex items-center gap-2"
            >
              <Wrench className="w-4 h-4" />
              <span>{loading ? 'Assigning...' : 'Assign Job(s)'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
