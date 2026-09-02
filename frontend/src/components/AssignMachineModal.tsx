import React, { useState, useEffect } from 'react';
import { X, Wrench, Save } from 'lucide-react';
import { apiRequest } from '../api';

interface AssignMachineModalProps {
  farmer: any;
  onSuccess: (newMachine: any) => void;
  onClose: () => void;
}

export const AssignMachineModal: React.FC<AssignMachineModalProps> = ({ farmer, onSuccess, onClose }) => {
  const [items, setItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [installationDate, setInstallationDate] = useState(new Date().toISOString().split('T')[0]);
  const [warrantyMonths, setWarrantyMonths] = useState(12);
  const [serviceIntervalDays, setServiceIntervalDays] = useState(90);
  const [location, setLocation] = useState(farmer ? `${farmer.village || farmer.address || ''}, ${farmer.district || ''}` : '');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadMachineItems();
  }, []);

  const loadMachineItems = async () => {
    try {
      const res = await apiRequest('/items');
      const machineItems = (res.items || []).filter((i: any) => i.type === 'FINISHED_MACHINE' || i.type === 'EQUIPMENT' || i.type === 'PRODUCT');
      setItems(machineItems.length > 0 ? machineItems : res.items || []);
      if (machineItems.length > 0) {
        setSelectedItemId(machineItems[0].id);
        setModel(machineItems[0].name);
      }
    } catch (err) {
      console.error('Failed to load items:', err);
    }
  };

  const handleItemChange = (itemId: string) => {
    setSelectedItemId(itemId);
    const selected = items.find((i) => i.id === itemId);
    if (selected) {
      setModel(selected.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialNumber.trim()) {
      setErrorMsg('Machine Serial Number is required.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await apiRequest('/machines', {
        method: 'POST',
        body: JSON.stringify({
          partyId: farmer.partyId,
          farmerId: farmer.id,
          machineItemId: selectedItemId || items[0]?.id,
          model: model || 'Agro Equipment',
          serialNumber: serialNumber.trim(),
          saleDate: installationDate,
          warrantyMonths: Number(warrantyMonths) || 12,
          serviceIntervalDays: Number(serviceIntervalDays) || 90,
          location: location,
          notes: notes,
        }),
      });

      onSuccess(res.machine);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to assign machine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-3 overflow-y-auto font-sans">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4">
        
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-400" />
              <span>+ Assign Machine to {farmer?.name}</span>
            </h3>
            <p className="text-xs text-slate-400 font-medium">Register machine serial number and schedule warranty/service.</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && <div className="p-3 bg-red-950 border border-red-700 text-red-200 text-xs rounded-xl font-bold">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          
          <div>
            <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
              Select Machine Model / Equipment *
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => handleItemChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-bold text-white text-xs focus:ring-2 focus:ring-amber-500"
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (SKU: {i.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
              Machine Serial Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. MM-001 / SAM-2026-99"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-mono font-bold text-emerald-400 text-sm focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">Installation / Sale Date</label>
              <input
                type="date"
                value={installationDate}
                onChange={(e) => setInstallationDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">Warranty (Months)</label>
              <input
                type="number"
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">Service Interval (Days)</label>
              <input
                type="number"
                value={serviceIntervalDays}
                onChange={(e) => setServiceIntervalDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">Installation Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Village / Farm location"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">Notes</label>
            <input
              type="text"
              placeholder="e.g. Double bucket set, installed at milk collection center"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white font-bold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/30 transition"
            >
              {loading ? 'Registering...' : 'Save & Assign Machine'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
