import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { apiRequest } from '../api';
import { INDIAN_STATES, getStateNameFromCode } from '../utils/gstHelper';

interface QuickAddFarmerModalProps {
  parentParty: any;
  onSuccess: (newFarmer: any) => void;
  onClose: () => void;
}

export const QuickAddFarmerModal: React.FC<QuickAddFarmerModalProps> = ({ parentParty, onSuccess, onClose }) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [altMobile, setAltMobile] = useState('');
  const [email, setEmail] = useState('');
  
  // Simplified Address
  const [address, setAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [sameAsBilling, setSameAsBilling] = useState(true);

  const [stateCode, setStateCode] = useState(parentParty?.stateCode || '29');
  const [state, setState] = useState(parentParty?.state || 'Karnataka');
  const [pincode, setPincode] = useState('');
  const [gstin, setGstin] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStateChange = (code: string) => {
    setStateCode(code);
    setState(getStateNameFromCode(code));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      setError('Farmer Name and Mobile number are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiRequest(`/parties/${parentParty.id}/farmers`, {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          mobile: mobile.trim(),
          altMobile: altMobile.trim() || null,
          email: email.trim() || null,
          address: address.trim(),
          shippingAddress: sameAsBilling ? address.trim() : shippingAddress.trim(),
          state: state.trim(),
          stateCode: stateCode.trim(),
          pincode: pincode.trim() || null,
          gstin: gstin.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      onSuccess(res.farmer);
    } catch (err: any) {
      setError(err.message || 'Failed to create farmer/contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-700">
          <div>
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              <span>+ Quick Add Farmer / Location</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Under Organization: <span className="font-bold text-emerald-300">{parentParty?.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="p-3 bg-red-900/80 border border-red-700 text-red-200 text-xs rounded-xl font-bold">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          
          {/* Farmer Name */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
              Farmer / Contact Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh / Mahesh / Suma Agro Farm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-bold text-white text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">Mobile Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. 9844011223"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-mono font-bold text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">Alternate Phone</label>
              <input
                type="text"
                placeholder="e.g. 9110855151"
                value={altMobile}
                onChange={(e) => setAltMobile(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white"
              />
            </div>
          </div>

          {/* SIMPLIFIED ADDRESS */}
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                BILLING ADDRESS
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (sameAsBilling) setShippingAddress(e.target.value);
                }}
                placeholder="Full address (e.g. Main Road, Haveri, Karnataka - 581110)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">
                  SHIPPING ADDRESS
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-emerald-400">
                  <input
                    type="checkbox"
                    checked={sameAsBilling}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSameAsBilling(checked);
                      if (checked) setShippingAddress(address);
                    }}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                  />
                  <span>Same as Billing</span>
                </label>
              </div>
              <textarea
                rows={2}
                value={shippingAddress}
                disabled={sameAsBilling}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Shipping/delivery address"
                className={`w-full px-3 py-2 border rounded-xl text-white font-medium ${
                  sameAsBilling ? 'bg-slate-950 border-slate-800 opacity-60' : 'bg-slate-950 border-slate-700'
                }`}
              />
            </div>
          </div>

          {/* State & PIN */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">State</label>
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
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">PIN Code</label>
              <input
                type="text"
                placeholder="6-digit PIN"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex justify-end gap-2 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/30 transition"
            >
              {loading ? 'Saving...' : 'Save & Select Farmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
