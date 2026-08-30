import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { apiRequest } from '../api';

interface QuickAddPartyModalProps {
  type: 'CUSTOMER' | 'SUPPLIER';
  onSuccess: (newParty: any) => void;
  onClose: () => void;
}

export const QuickAddPartyModal: React.FC<QuickAddPartyModalProps> = ({ type, onSuccess, onClose }) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('Haveri');
  const [state, setState] = useState('Karnataka');
  const [stateCode, setStateCode] = useState('29');
  const [gstin, setGstin] = useState('');
  const [customerType, setCustomerType] = useState('FARMER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      setError('Name and Mobile number are required');
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center pb-3 border-b mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            <span>+ Quick Add {type === 'CUSTOMER' ? 'Customer' : 'Supplier'}</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{type === 'CUSTOMER' ? 'Customer' : 'Supplier'} Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Agro Farm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. 9845012345"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="FARMER">Farmer</option>
                <option value="RETAIL">Retail</option>
                <option value="DEALER">Dealer</option>
                <option value="BUSINESS">Business</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Village / Address</label>
              <input
                type="text"
                placeholder="Village/Town"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">District</label>
              <input
                type="text"
                placeholder="District"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">State & Code</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-2/3 px-2 py-2 border rounded-lg text-xs"
                />
                <input
                  type="text"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  className="w-1/3 px-2 py-2 border rounded-lg text-xs text-center font-mono"
                  placeholder="Code"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">GSTIN (Optional)</label>
              <input
                type="text"
                placeholder="29ABCDE1234F1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-xs uppercase"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-semibold">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow"
            >
              {loading ? 'Saving...' : 'Save & Select'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
