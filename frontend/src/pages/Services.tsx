import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { Wrench, Plus, Calendar, CheckCircle, Phone, MapPin, Printer, User } from 'lucide-react';
import { QuickAddPartyModal } from '../components/QuickAddPartyModal';

export const Services: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [services, setServices] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(searchParams.get('create') === 'true');

  // Form State
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignedTechId, setAssignedTechId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadServices();
    loadMasters();
  }, []);

  const loadServices = async () => {
    try {
      const res = await apiRequest('/services');
      setServices(res.services);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMasters = async () => {
    try {
      const mRes = await apiRequest('/machines');
      setMachines(mRes.machines);
      const uRes = await apiRequest('/users');
      setTechnicians(uRes.users.filter((u: any) => u.role === 'SERVICE_TECHNICIAN' || u.role === 'ADMIN'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachineId) {
      alert('Select machine');
      return;
    }

    try {
      await apiRequest('/services', {
        method: 'POST',
        body: JSON.stringify({
          machineId: selectedMachineId,
          serviceDueDate: dueDate,
          assignedTechnicianId: assignedTechId || null,
          notes,
        }),
      });

      alert('Service scheduled successfully!');
      setShowScheduleModal(false);
      loadServices();
    } catch (err: any) {
      alert(`Error scheduling service: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Management & Scheduling</h1>
          <p className="text-sm text-gray-500">Track Machinery Maintenance, Assign Field Technicians & Record Parts Stock Consumption</p>
        </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 shadow-md transition"
        >
          <Plus className="w-5 h-5" />
          <span>+ Schedule Service Task</span>
        </button>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b text-gray-700 font-bold uppercase text-xs">
            <tr>
              <th className="p-4">Service #</th>
              <th className="p-4">Due Date</th>
              <th className="p-4">Customer & Phone</th>
              <th className="p-4">Machine & Serial S/N</th>
              <th className="p-4">Technician</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Parts Used</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {services.map((srv) => (
              <tr key={srv.id} className="hover:bg-gray-50">
                <td className="p-4 font-bold font-mono text-teal-800">{srv.serviceNo}</td>
                <td className="p-4 text-gray-600">{new Date(srv.serviceDueDate).toLocaleDateString('en-IN')}</td>
                <td className="p-4">
                  <p className="font-bold text-gray-900">{srv.party?.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{srv.party?.mobile}</p>
                </td>
                <td className="p-4">
                  <p className="font-bold text-gray-900">{srv.machine?.model}</p>
                  <p className="text-xs text-emerald-700 font-mono">S/N: {srv.serialNumber}</p>
                </td>
                <td className="p-4 font-semibold text-gray-800">{srv.assignedTechnician?.name || 'Unassigned'}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                    srv.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    srv.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {srv.status}
                  </span>
                </td>
                <td className="p-4 text-right font-mono font-semibold">
                  {srv.parts?.length > 0 ? `${srv.parts.length} items` : 'None'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SCHEDULE MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center pb-4 border-b mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Wrench className="w-6 h-6 text-teal-600" />
                <span>Schedule Service Task</span>
              </h2>
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-400">
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Select Registered Machine *</label>
                <select
                  value={selectedMachineId}
                  onChange={(e) => setSelectedMachineId(e.target.value)}
                  required
                  className="w-full p-3 border rounded-xl font-semibold bg-white"
                >
                  <option value="">-- Choose Machine --</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.model} (S/N: {m.serialNumber}) - {m.party?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Service Due Date *</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="w-full p-3 border rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Assign Technician</label>
                <select
                  value={assignedTechId}
                  onChange={(e) => setAssignedTechId(e.target.value)}
                  className="w-full p-3 border rounded-xl font-semibold bg-white"
                >
                  <option value="">-- Assign Technician --</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Service Checkup Notes</label>
                <input
                  type="text"
                  placeholder="e.g. 90-day free service checkup"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowScheduleModal(false)} className="px-4 py-2 text-gray-600 font-semibold text-xs">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-teal-600 text-white font-bold text-xs rounded-xl shadow">
                  Schedule Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
