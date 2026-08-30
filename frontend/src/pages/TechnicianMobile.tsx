import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { Phone, MapPin, Wrench, CheckCircle, Plus, Smartphone, X } from 'lucide-react';

export const TechnicianMobile: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [workPerformed, setWorkPerformed] = useState('');
  const [techNotes, setTechNotes] = useState('');
  const [partsUsed, setPartsUsed] = useState<any[]>([{ itemId: '', quantity: 1 }]);

  useEffect(() => {
    loadJobs();
    loadItems();
  }, []);

  const loadJobs = async () => {
    try {
      const res = await apiRequest('/services/technician/today');
      setJobs(res.jobs);
    } catch (err) {
      console.error(err);
    }
  };

  const loadItems = async () => {
    try {
      const res = await apiRequest('/items');
      setItemsList(res.items);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    try {
      const validParts = partsUsed.filter((p) => p.itemId);
      await apiRequest(`/services/${selectedJob.id}/complete`, {
        method: 'PUT',
        body: JSON.stringify({
          workPerformed,
          technicianNotes: techNotes,
          partsUsed: validParts,
        }),
      });

      alert('Service Completed! Used parts stock auto-deducted from inventory.');
      setSelectedJob(null);
      loadJobs();
    } catch (err: any) {
      alert(`Error completing service: ${err.message}`);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      {/* Mobile Header Banner */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between">
        <div>
          <h1 className="font-extrabold text-base flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <span>Technician Mobile View</span>
          </h1>
          <p className="text-xs text-slate-400">Field Service Jobs & Parts Recording</p>
        </div>
        <span className="px-2.5 py-1 bg-emerald-600 text-xs font-bold rounded-full">{jobs.length} Jobs</span>
      </div>

      {/* Jobs Cards */}
      <div className="space-y-4">
        {jobs.map((job) => {
          const party = job.party || {};
          const machine = job.machine || {};
          const mapQuery = encodeURIComponent(`${party.village || ''}, ${party.district || ''}, Karnataka`);

          return (
            <div key={job.id} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-base text-gray-900">{party.name}</h3>
                  <p className="text-xs text-gray-500">{party.village}, {party.district}</p>
                </div>
                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase ${
                  job.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {job.status}
                </span>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-xs text-emerald-900">
                <p className="font-bold">{machine.model}</p>
                <p className="font-mono text-emerald-700">Serial S/N: {job.serialNumber}</p>
              </div>

              {/* Action Buttons: Call, Map, Complete */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <a
                  href={`tel:${party.mobile}`}
                  className="py-2.5 bg-blue-50 text-blue-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1 hover:bg-blue-100 border border-blue-200"
                >
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>

                <a
                  href={`https://maps.google.com/?q=${mapQuery}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1 hover:bg-emerald-100 border border-emerald-200"
                >
                  <MapPin className="w-3.5 h-3.5" /> Open Map
                </a>

                {job.status !== 'COMPLETED' ? (
                  <button
                    onClick={() => setSelectedJob(job)}
                    className="py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 hover:bg-emerald-700 shadow"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Complete
                  </button>
                ) : (
                  <span className="py-2.5 bg-gray-100 text-gray-500 rounded-xl font-bold text-[10px] text-center flex items-center justify-center">
                    Done
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* COMPLETE SERVICE MODAL FOR TECHNICIAN */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>Complete Service: {selectedJob.serviceNo}</span>
              </h3>
              <button onClick={() => setSelectedJob(null)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteService} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Work Performed / Service Summary *</label>
                <textarea
                  required
                  placeholder="e.g. Changed oil, tightened blades, checked motor alignment..."
                  value={workPerformed}
                  onChange={(e) => setWorkPerformed(e.target.value)}
                  className="w-full p-2.5 border rounded-xl"
                  rows={2}
                />
              </div>

              {/* Parts Used */}
              <div className="space-y-2 border-t pt-2">
                <label className="block font-bold text-gray-700">Spare Parts Used (Auto Stock Deducted)</label>
                {partsUsed.map((pu, idx) => (
                  <div key={idx} className="flex gap-2">
                    <select
                      value={pu.itemId}
                      onChange={(e) => {
                        const updated = [...partsUsed];
                        updated[idx].itemId = e.target.value;
                        setPartsUsed(updated);
                      }}
                      className="flex-1 p-2 border rounded-xl bg-white font-semibold"
                    >
                      <option value="">Select Spare Part...</option>
                      {itemsList.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} (Stock: {i.currentStock})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={pu.quantity}
                      onChange={(e) => {
                        const updated = [...partsUsed];
                        updated[idx].quantity = Number(e.target.value);
                        setPartsUsed(updated);
                      }}
                      className="w-16 p-2 border rounded-xl text-center font-bold"
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setPartsUsed([...partsUsed, { itemId: '', quantity: 1 }])}
                  className="font-bold text-emerald-600 hover:underline"
                >
                  + Add Used Spare Part
                </button>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setSelectedJob(null)} className="px-4 py-2 text-gray-600 font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow">
                  Submit & Deduct Parts Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
