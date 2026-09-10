import React, { useState, useEffect } from 'react';
import { X, Save, UserCheck, UserPlus, Eye, Edit, Trash2, Search, MapPin, Phone } from 'lucide-react';
import { apiRequest } from '../api';
import { FarmerEditorModal } from './FarmerEditorModal';
import { ViewFarmerModal } from './ViewFarmerModal';
import { INDIAN_STATES, getStateNameFromCode, extractStateFromGstin } from '../utils/gstHelper';

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

  // Simplified Address State
  const [address, setAddress] = useState(party?.address || '');
  const [shippingAddress, setShippingAddress] = useState(party?.shippingAddress || party?.address || '');
  const [sameAsBilling, setSameAsBilling] = useState(!party?.shippingAddress || party?.shippingAddress === party?.address);

  const [state, setState] = useState(party?.state || 'Karnataka');
  const [stateCode, setStateCode] = useState(party?.stateCode || '29');
  const [pincode, setPincode] = useState(party?.pincode || '');
  const [gstin, setGstin] = useState(party?.gstin || '');
  const [pan, setPan] = useState(party?.pan || '');
  const [openingBalance, setOpeningBalance] = useState(party?.openingBalance || 0);
  const [creditLimit, setCreditLimit] = useState(party?.creditLimit || 0);
  const [notes, setNotes] = useState(party?.notes || '');

  // Farmers state
  const [farmers, setFarmers] = useState<any[]>(party?.farmers || []);
  const [farmerSearch, setFarmerSearch] = useState('');
  const [editingFarmer, setEditingFarmer] = useState<any | null>(null);
  const [showAddFarmer, setShowAddFarmer] = useState(false);
  const [viewingFarmerId, setViewingFarmerId] = useState<string | null>(null);
  const [deletingFarmer, setDeletingFarmer] = useState<any | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && party?.id) {
      loadPartyFarmers();
    }
  }, [party?.id]);

  const loadPartyFarmers = async () => {
    try {
      const res = await apiRequest(`/parties/${party.id}`);
      if (res.party?.farmers) {
        setFarmers(res.party.farmers);
      }
    } catch (err) {
      console.error('Failed to load party farmers:', err);
    }
  };

  const handleFarmerSaved = (savedFarmer: any) => {
    setShowAddFarmer(false);
    setEditingFarmer(null);
    loadPartyFarmers();
  };

  const handleDeleteFarmer = async (farmerId: string) => {
    try {
      await apiRequest(`/farmers/${farmerId}`, { method: 'DELETE' });
      setDeletingFarmer(null);
      loadPartyFarmers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete farmer');
    }
  };

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
      shippingAddress: sameAsBilling ? address : shippingAddress,
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

  const filteredFarmers = farmers.filter((f) => {
    if (!farmerSearch.trim()) return true;
    const q = farmerSearch.toLowerCase().trim();
    return (
      f.name?.toLowerCase().includes(q) ||
      f.mobile?.includes(q) ||
      f.address?.toLowerCase().includes(q) ||
      f.shippingAddress?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full my-6 overflow-hidden flex flex-col border border-gray-100 max-h-[92vh]">
        
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
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
                onChange={(e) => {
                  const clean = e.target.value.toUpperCase();
                  setGstin(clean);
                  const extracted = extractStateFromGstin(clean);
                  if (extracted) {
                    setStateCode(extracted.stateCode);
                    setState(extracted.stateName);
                  }
                }}
                placeholder="29AAAAA0000A1Z5"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-mono uppercase"
              />
            </div>
          </div>

          {/* SIMPLIFIED BILLING & SHIPPING ADDRESS SECTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <div>
              <label className="block font-extrabold text-gray-800 uppercase tracking-wider text-[11px] mb-1">
                BILLING ADDRESS
              </label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (sameAsBilling) setShippingAddress(e.target.value);
                }}
                placeholder="Enter complete billing address (e.g. Main Road, Near Bus Stand, Haveri, Karnataka - 581110)"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs font-medium text-gray-900"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block font-extrabold text-gray-800 uppercase tracking-wider text-[11px]">
                  SHIPPING ADDRESS
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
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
                  <span>Same as Billing Address</span>
                </label>
              </div>

              <textarea
                rows={3}
                value={shippingAddress}
                disabled={sameAsBilling}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Enter complete shipping/delivery address"
                className={`w-full p-2.5 border rounded-xl text-xs font-medium text-gray-900 ${
                  sameAsBilling ? 'bg-gray-100 border-gray-200 opacity-80' : 'bg-white border-gray-300'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">State & State Code *</label>
              <div className="flex gap-2">
                <select
                  value={stateCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setStateCode(code);
                    setState(getStateNameFromCode(code));
                  }}
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  readOnly
                  value={stateCode}
                  className="w-16 p-2.5 bg-gray-100 border border-gray-300 rounded-xl text-center font-mono font-bold text-gray-700"
                  title="GST State Code"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">PIN Code</label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="6-digit PIN code"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-mono"
              />
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

          {/* ==================================================== */}
          {/* FARMERS / CONTACTS / LOCATIONS SECTION */}
          {/* ==================================================== */}
          <div className="pt-4 border-t border-gray-200 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-emerald-950 text-white p-4 rounded-2xl">
              <div>
                <h3 className="font-extrabold text-sm flex items-center gap-2 text-emerald-300">
                  <span>FARMERS / CONTACTS / LOCATIONS</span>
                  <span className="bg-emerald-800 text-white text-xs px-2.5 py-0.5 rounded-full font-mono">
                    {farmers.length}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300 font-medium">
                  Manage farmers, delivery locations and machine owners under {name || 'this party'}.
                </p>
              </div>

              {isEditing ? (
                <button
                  type="button"
                  onClick={() => setShowAddFarmer(true)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xs flex items-center gap-1.5 shadow transition shrink-0"
                >
                  <UserPlus className="w-4 h-4" /> + Add Farmer
                </button>
              ) : (
                <span className="text-[10px] bg-amber-900/80 text-amber-200 px-3 py-1 rounded-xl font-bold">
                  Save Party First to Add Farmers
                </span>
              )}
            </div>

            {/* Farmers Search Bar & Table */}
            {isEditing && (
              <div className="space-y-3">
                <div className="flex justify-between items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search Farmers by name, phone, address..."
                      value={farmerSearch}
                      onChange={(e) => setFarmerSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-gray-100 border border-gray-300 rounded-xl text-xs font-medium text-gray-900"
                    />
                  </div>
                </div>

                {filteredFarmers.length === 0 ? (
                  <div className="p-6 text-center bg-gray-50 border border-dashed border-gray-300 rounded-2xl text-gray-500 space-y-1">
                    <p className="font-bold text-xs text-gray-700">No farmers registered under {name}</p>
                    <p className="text-[11px] text-gray-400">Click "+ Add Farmer" above to add farmers, farm locations, or machine owners.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 text-gray-700 uppercase text-[10px] font-extrabold">
                        <tr>
                          <th className="p-3">Farmer Name</th>
                          <th className="p-3">Phone</th>
                          <th className="p-3">Shipping Address</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 font-medium text-gray-800">
                        {filteredFarmers.map((f: any) => (
                          <tr key={f.id} className="hover:bg-gray-50 transition">
                            <td className="p-3 font-bold text-gray-900 flex items-center gap-2">
                              <span>👨‍🌾 {f.name}</span>
                              {f.machines?.length > 0 && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                  {f.machines.length} Machine(s)
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono font-semibold">{f.mobile}</td>
                            <td className="p-3 max-w-xs truncate">
                              {f.shippingAddress || f.address || 'No address specified'}
                            </td>
                            <td className="p-3 text-right space-x-1.5">
                              <button
                                type="button"
                                onClick={() => setViewingFarmerId(f.id)}
                                className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded-lg text-[11px] transition"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingFarmer(f)}
                                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold rounded-lg text-[11px] transition"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingFarmer(f)}
                                className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-lg text-[11px] transition"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
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

      {/* ADD / EDIT FARMER MODAL */}
      {(showAddFarmer || editingFarmer) && (
        <FarmerEditorModal
          parentParty={party}
          farmer={editingFarmer}
          onSaved={handleFarmerSaved}
          onClose={() => {
            setShowAddFarmer(false);
            setEditingFarmer(null);
          }}
        />
      )}

      {/* VIEW FARMER PROFILE MODAL */}
      {viewingFarmerId && (
        <ViewFarmerModal
          farmerId={viewingFarmerId}
          onClose={() => setViewingFarmerId(null)}
        />
      )}

      {/* DELETE FARMER CONFIRMATION MODAL */}
      {deletingFarmer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-base text-red-400">Delete Farmer Record?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-white">"{deletingFarmer.name}"</span>?
              <br />
              Parent organization <span className="font-bold text-emerald-400">"{name}"</span> will remain 100% intact.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingFarmer(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteFarmer(deletingFarmer.id)}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs shadow-lg"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
