import React, { useState, useEffect } from 'react';
import { X, Save, UserPlus, UserCheck, MapPin, Phone, Building } from 'lucide-react';
import { apiRequest } from '../api';
import { INDIAN_STATES, getStateNameFromCode } from '../utils/gstHelper';

interface FarmerEditorModalProps {
  parentParty: any;
  farmer?: any; // If present, editing mode
  onSaved: (farmer: any) => void;
  onClose: () => void;
}

export const FarmerEditorModal: React.FC<FarmerEditorModalProps> = ({
  parentParty,
  farmer,
  onSaved,
  onClose,
}) => {
  const isEditing = Boolean(farmer?.id);

  const [name, setName] = useState(farmer?.name || '');
  const [mobile, setMobile] = useState(farmer?.mobile || '');
  const [altMobile, setAltMobile] = useState(farmer?.altMobile || '');
  const [email, setEmail] = useState(farmer?.email || '');
  const [address, setAddress] = useState(farmer?.address || '');
  const [village, setVillage] = useState(farmer?.village || '');
  const [taluk, setTaluk] = useState(farmer?.taluk || '');
  const [district, setDistrict] = useState(farmer?.district || parentParty?.district || '');
  const [stateCode, setStateCode] = useState(farmer?.stateCode || parentParty?.stateCode || '29');
  const [state, setState] = useState(farmer?.state || parentParty?.state || 'Karnataka');
  const [pincode, setPincode] = useState(farmer?.pincode || '');
  const [gstin, setGstin] = useState(farmer?.gstin || '');
  const [notes, setNotes] = useState(farmer?.notes || '');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStateChange = (code: string) => {
    setStateCode(code);
    setState(getStateNameFromCode(code));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      setErrorMsg('Farmer Name and Mobile Number are required.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const payload = {
      name: name.trim(),
      mobile: mobile.trim(),
      altMobile: altMobile.trim() || null,
      email: email.trim() || null,
      address: address.trim() || village.trim(),
      village: village.trim(),
      taluk: taluk.trim(),
      district: district.trim(),
      state: state.trim(),
      stateCode: stateCode.trim(),
      pincode: pincode.trim() || null,
      gstin: gstin.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      let res;
      if (isEditing) {
        res = await apiRequest(`/farmers/${farmer.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiRequest(`/parties/${parentParty.id}/farmers`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      onSaved(res.farmer);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save farmer record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto font-sans">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl shadow-2xl max-w-2xl w-full my-6 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
              {isEditing ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                {isEditing ? `Edit Farmer: ${farmer.name}` : '+ Add Farmer / Location'}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Parent Party: <span className="font-extrabold text-emerald-400">{parentParty?.name || 'Main Organization'}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-950 border border-red-700 text-red-200 font-bold rounded-xl text-xs">
              {errorMsg}
            </div>
          )}

          {/* Parent Party Read-Only Notice */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
            <span className="text-slate-400 font-medium">Parent Organization:</span>
            <span className="font-extrabold text-emerald-300 font-mono text-xs">{parentParty?.name}</span>
          </div>

          {/* Basic Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Farmer / Contact Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Agro Farm / Mahesh"
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-bold text-sm text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Mobile Number *</label>
              <input
                type="text"
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="e.g. 9844011223"
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-mono font-bold text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Alternate Phone</label>
              <input
                type="text"
                value={altMobile}
                onChange={(e) => setAltMobile(e.target.value)}
                placeholder="e.g. 6366959062"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="farmer@example.com"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>
          </div>

          {/* Location Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-300 mb-1">Farm / Installation Address *</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Door / Plot No, Main Road, Near Milk Dairy"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Village / City</label>
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="e.g. Haveri / Tiptur / Arasikere"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Taluk / Sub-District</label>
              <input
                type="text"
                value={taluk}
                onChange={(e) => setTaluk(e.target.value)}
                placeholder="Taluk name"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">District</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="District name"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">State & State Code</label>
              <select
                value={stateCode}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">PIN Code</label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="6-digit PIN"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">GSTIN (Optional)</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="29AAAAA0000A1Z5"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl font-mono uppercase text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Notes / Instructions</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special delivery notes, equipment preferences..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : isEditing ? 'Update Farmer' : 'Save Farmer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
