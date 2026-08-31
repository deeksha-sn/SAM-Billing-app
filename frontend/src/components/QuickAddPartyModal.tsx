import React, { useState } from 'react';
import { X, UserPlus, Building, MapPin } from 'lucide-react';
import { apiRequest } from '../api';
import { INDIAN_STATES, getStateNameFromCode } from '../utils/gstHelper';

interface QuickAddPartyModalProps {
  type: 'CUSTOMER' | 'SUPPLIER';
  onSuccess: (newParty: any) => void;
  onClose: () => void;
}

export const QuickAddPartyModal: React.FC<QuickAddPartyModalProps> = ({ type, onSuccess, onClose }) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('Haveri');
  const [stateCode, setStateCode] = useState('29');
  const [state, setState] = useState('Karnataka');
  const [gstin, setGstin] = useState('');
  const [customerType, setCustomerType] = useState('FARMER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStateChange = (code: string) => {
    setStateCode(code);
    setState(getStateNameFromCode(code));
  };

  const handleGstinChange = (val: string) => {
    const uppercaseVal = val.toUpperCase().trim();
    setGstin(uppercaseVal);
    // If user enters first 2 digits of GSTIN (e.g., 27 for MH, 29 for KA, 33 for TN), auto select state
    if (uppercaseVal.length >= 2) {
      const codeCandidate = uppercaseVal.substring(0, 2);
      const match = INDIAN_STATES.find((s) => s.code === codeCandidate);
      if (match) {
        setStateCode(match.code);
        setState(match.name);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      setError('Party Name and Mobile number are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiRequest('/parties', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          type,
          customerType,
          mobile: mobile.trim(),
          email: email.trim() || null,
          address: address.trim() || village.trim(),
          shippingAddress: shippingAddress.trim() || address.trim() || village.trim(),
          village: village.trim(),
          district: district.trim(),
          state: state.trim(),
          stateCode: stateCode.trim(),
          gstin: gstin.trim() || null,
        }),
      });

      onSuccess(res.party);
    } catch (err: any) {
      setError(err.message || 'Failed to create party');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-700">
          <h3 className="font-extrabold text-base text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            <span>+ Quick Add GST {type === 'CUSTOMER' ? 'Customer' : 'Supplier'}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="p-3 bg-red-900/80 border border-red-700 text-red-200 text-xs rounded-xl font-bold">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-sans">
          
          {/* Name */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
              {type === 'CUSTOMER' ? 'Customer' : 'Supplier'} Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Agro Farm / Vijay Logistics"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-bold text-white text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Mobile */}
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

            {/* Category */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">Category</label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="FARMER">Farmer</option>
                <option value="RETAIL">Retail Customer</option>
                <option value="DEALER">Dealer / Distributor</option>
                <option value="BUSINESS">Business / Company</option>
              </select>
            </div>
          </div>

          {/* GSTIN & State Code Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">GSTIN (Optional)</label>
              <input
                type="text"
                placeholder="29ABCDE1234F1Z5"
                value={gstin}
                onChange={(e) => handleGstinChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-mono font-bold text-amber-300 uppercase focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">State & State Code *</label>
              <select
                value={stateCode}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl font-bold text-white focus:ring-2 focus:ring-emerald-500"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Billing Address & Village */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">Billing Address / Village</label>
              <input
                type="text"
                placeholder="Village / Road / Town"
                value={village}
                onChange={(e) => {
                  setVillage(e.target.value);
                  if (!address) setAddress(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">District / City</label>
              <input
                type="text"
                placeholder="Haveri / Bangalore"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium"
              />
            </div>
          </div>

          {/* Shipping Address */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">Shipping Address / Delivery Site</label>
            <input
              type="text"
              placeholder="Same as Billing / Farm Site No. 2"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium"
            />
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
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
            >
              {loading ? 'Saving...' : 'Save & Auto-Select'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
