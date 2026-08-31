import React, { useState } from 'react';
import { X, Save, UserCheck } from 'lucide-react';
import { apiRequest } from '../api';

interface PartyEditorModalProps {
  party?: any;
  defaultType?: string;
  onSaved: (party: any) => void;
  onClose: () => void;
}

export const PartyEditorModal: React.FC<PartyEditorModalProps> = ({
  party,
  defaultType = 'CUSTOMER',
  onSaved,
  onClose,
}) => {
  const isEditing = Boolean(party?.id);
  const [name, setName] = useState(party?.name || '');
  const [type, setType] = useState(party?.type || defaultType);
  const [customerType, setCustomerType] = useState(party?.customerType || 'FARMER');
  const [contactPerson, setContactPerson] = useState(party?.contactPerson || '');
  const [mobile, setMobile] = useState(party?.mobile || '');
  const [altMobile, setAltMobile] = useState(party?.altMobile || '');
  const [email, setEmail] = useState(party?.email || '');
  const [address, setAddress] = useState(party?.address || '');
  const [village, setVillage] = useState(party?.village || '');
  const [taluk, setTaluk] = useState(party?.taluk || '');
  const [district, setDistrict] = useState(party?.district || '');
  const [state, setState] = useState(party?.state || 'Karnataka');
  const [stateCode, setStateCode] = useState(party?.stateCode || '29');
  const [pincode, setPincode] = useState(party?.pincode || '');
  const [gstin, setGstin] = useState(party?.gstin || '');
  const [pan, setPan] = useState(party?.pan || '');
  const [openingBalance, setOpeningBalance] = useState(party?.openingBalance || 0);
  const [creditLimit, setCreditLimit] = useState(party?.creditLimit || 0);
  const [notes, setNotes] = useState(party?.notes || '');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile) {
      setErrorMsg('Party Name and Mobile Number are required');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const payload = {
      name,
      type,
      customerType,
      contactPerson,
      mobile,
      altMobile,
      email,
      address,
      village,
      taluk,
      district,
      state,
      stateCode,
      pincode,
      gstin,
      pan,
      openingBalance: Number(openingBalance) || 0,
      creditLimit: Number(creditLimit) || 0,
      notes,
    };

    try {
      let res;
      if (isEditing) {
        res = await apiRequest(`/parties/${party.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiRequest('/parties', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      onSaved(res.party);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save party');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full my-6 overflow-hidden flex flex-col border border-gray-100 max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-blue-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-800 flex items-center justify-center text-blue-300">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold">
                {isEditing ? `Edit Party: ${party.name}` : `Create New ${type === 'SUPPLIER' ? 'Supplier' : 'Customer'}`}
              </h2>
              <p className="text-xs text-blue-300/80 font-medium">Customer & Supplier Master Profile</p>
            </div>
          </div>
          <button onClick={onClose} className="text-blue-400 hover:text-white p-1 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 font-semibold rounded-xl text-xs">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <div className="md:col-span-2">
              <label className="block font-bold text-gray-700 mb-1">Party / Business Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Ramesh Agro Farm / ABC Machinery"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-bold text-sm text-gray-900"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Party Category *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-bold"
              >
                <option value="CUSTOMER">CUSTOMER</option>
                <option value="SUPPLIER">SUPPLIER</option>
                <option value="BOTH">BOTH (Customer & Supplier)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Customer / Party Type</label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-semibold"
              >
                <option value="FARMER">FARMER (Agro)</option>
                <option value="RETAIL">RETAIL CUSTOMER</option>
                <option value="DEALER">DEALER / DISTRIBUTOR</option>
                <option value="BUSINESS">BUSINESS (B2B GST)</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Mobile Number *</label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
                placeholder="Primary 10-digit mobile"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-bold font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Alternate Mobile</label>
              <input
                type="text"
                value={altMobile}
                onChange={(e) => setAltMobile(e.target.value)}
                placeholder="Secondary mobile"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Key Contact Name"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="party@example.com"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">GSTIN Number</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="29AAAAA0000A1Z5"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block font-bold text-gray-700 mb-1">Billing Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address, shop number, plot details"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Village / City</label>
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="Village / Town / City"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Taluk / Sub-District</label>
              <input
                type="text"
                value={taluk}
                onChange={(e) => setTaluk(e.target.value)}
                placeholder="Taluk name"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">District</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="District name"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">State & Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl"
                />
                <input
                  type="text"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  className="w-16 p-2.5 bg-white border border-gray-300 rounded-xl text-center font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Opening Balance (₹)</label>
              <input
                type="number"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Credit Limit (₹)</label>
              <input
                type="number"
                step="0.01"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="0.00 (0 = Unlimited)"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional customer details, bank account details for suppliers..."
              className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl shadow-lg flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Party Profile'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
