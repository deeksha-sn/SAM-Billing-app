import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Check, X, ChevronDown, Phone, MapPin, User, ChevronUp } from 'lucide-react';
import { QuickAddPartyModal } from './QuickAddPartyModal';
import { QuickAddFarmerModal } from './QuickAddFarmerModal';
import { INDIAN_STATES } from '../utils/gstHelper';

export interface SearchablePartyComboboxProps {
  partyType: 'CUSTOMER' | 'SUPPLIER' | 'ALL';
  selectedPartyId: string;
  selectedFarmerId?: string;
  onSelectParty: (party: any | null) => void;
  onSelectFarmer?: (farmer: any | null) => void;
  parties: any[];
  onPartyCreated?: (newParty: any) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export const SearchablePartyCombobox: React.FC<SearchablePartyComboboxProps> = ({
  partyType,
  selectedPartyId,
  selectedFarmerId,
  onSelectParty,
  onSelectFarmer,
  parties,
  onPartyCreated,
  placeholder,
  label,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showQuickFarmer, setShowQuickFarmer] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Inline New Party Details State
  const [inlineDetails, setInlineDetails] = useState({
    mobile: '',
    altMobile: '',
    gstin: '',
    address: '',
    shippingAddress: '',
    stateCode: '29',
    state: 'Karnataka',
    pincode: '',
    isShippingSameAsBilling: true,
  });

  const selectedParty = parties.find((p) => p.id === selectedPartyId) || null;
  const selectedFarmer = selectedParty?.farmers?.find((f: any) => f.id === selectedFarmerId) || null;
  const isExistingSelected = Boolean(selectedParty && selectedParty.id !== 'NEW');

  useEffect(() => {
    if (selectedParty && selectedParty.id !== 'NEW') {
      setQuery(selectedParty.name);
    }
  }, [selectedPartyId, selectedParty]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (selectedParty && selectedParty.id !== 'NEW') {
          setQuery(selectedParty.name);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedParty]);

  // Filter main parties and nested farmers live by query
  const filteredParties = parties.filter((p) => {
    if (partyType === 'CUSTOMER' && p.type !== 'CUSTOMER') return false;
    if (partyType === 'SUPPLIER' && p.type !== 'SUPPLIER') return false;

    if (!query.trim()) return true;

    const q = query.toLowerCase().trim();
    const nameMatch = (p.name || '').toLowerCase().includes(q);
    const mobileMatch = (p.mobile || '').includes(q);
    const gstinMatch = (p.gstin || '').toLowerCase().includes(q);
    const addressMatch = (p.address || '').toLowerCase().includes(q);
    const villageMatch = (p.village || '').toLowerCase().includes(q);
    const districtMatch = (p.district || '').toLowerCase().includes(q);

    const farmerMatch = (p.farmers || []).some((f: any) => {
      return (
        (f.name || '').toLowerCase().includes(q) ||
        (f.mobile || '').includes(q) ||
        (f.village || '').toLowerCase().includes(q) ||
        (f.district || '').toLowerCase().includes(q)
      );
    });

    return nameMatch || mobileMatch || gstinMatch || addressMatch || villageMatch || districtMatch || farmerMatch;
  });

  const emitDraftParty = (currentName: string, updatedDetails = inlineDetails) => {
    if (!currentName.trim()) return;

    const shipAddr = updatedDetails.isShippingSameAsBilling
      ? updatedDetails.address
      : updatedDetails.shippingAddress;

    const draftObj = {
      id: 'NEW',
      isNew: true,
      name: currentName.trim(),
      type: partyType === 'ALL' ? 'CUSTOMER' : partyType,
      mobile: updatedDetails.mobile.trim() || null,
      altMobile: updatedDetails.altMobile.trim() || null,
      gstin: updatedDetails.gstin.trim() || null,
      address: updatedDetails.address.trim() || null,
      shippingAddress: shipAddr ? shipAddr.trim() : null,
      stateCode: updatedDetails.stateCode,
      state: updatedDetails.state,
      pincode: updatedDetails.pincode.trim() || null,
    };

    onSelectParty(draftObj);
  };

  const handleSelectParty = (party: any, farmer?: any) => {
    onSelectParty(party);
    if (onSelectFarmer) {
      onSelectFarmer(farmer || null);
    }
    setQuery(party.name);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectParty(null);
    if (onSelectFarmer) onSelectFarmer(null);
    setQuery('');
    setInlineDetails({
      mobile: '',
      altMobile: '',
      gstin: '',
      address: '',
      shippingAddress: '',
      stateCode: '29',
      state: 'Karnataka',
      pincode: '',
      isShippingSameAsBilling: true,
    });
    setIsOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);

    if (!val.trim()) {
      onSelectParty(null);
      if (onSelectFarmer) onSelectFarmer(null);
    } else {
      // Check if exact match exists
      const exactMatch = parties.find(
        (p) => p.name.toLowerCase() === val.toLowerCase().trim()
      );
      if (exactMatch) {
        onSelectParty(exactMatch);
      } else {
        // Emit inline draft party
        emitDraftParty(val);
      }
    }
  };

  const handleInlineFieldChange = (field: string, val: any) => {
    const updated = { ...inlineDetails, [field]: val };
    if (field === 'address' && updated.isShippingSameAsBilling) {
      updated.shippingAddress = val;
    }
    setInlineDetails(updated);
    emitDraftParty(query, updated);
  };

  const partyLabel = partyType === 'SUPPLIER' ? 'Supplier' : 'Customer';
  const showInlineForm = !isExistingSelected && query.trim().length > 0;

  return (
    <div className="relative space-y-2" ref={containerRef}>
      {label && (
        <div className="flex justify-between items-center mb-1">
          <label className="font-extrabold text-slate-300 uppercase tracking-wider text-[11px]">
            {label} {required && <span className="text-red-400">*</span>}
          </label>

          <button
            type="button"
            onClick={() => setShowQuickAdd(true)}
            className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 text-[11px] transition"
          >
            <UserPlus className="w-3.5 h-3.5" /> + Quick Add Modal
          </button>
        </div>
      )}

      {/* Input Field with Icons */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />

        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={handleInputChange}
          placeholder={placeholder || `Type ${partyLabel.toLowerCase()} name, mobile, GSTIN, location...`}
          className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-600 rounded-xl font-bold text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition shadow-sm placeholder:text-slate-500"
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {(selectedParty || query) && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-slate-400 hover:text-white"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Selected Existing Party Summary Pill */}
      {isExistingSelected && selectedParty && (
        <div className="px-3 py-2 bg-emerald-950/80 border border-emerald-700/60 rounded-xl text-[11px] flex flex-wrap justify-between items-center gap-2 text-emerald-300">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-xs">✓ Linked Customer: {selectedParty.name}</span>
            {selectedParty.mobile && <span>• 📱 {selectedParty.mobile}</span>}
            {(selectedParty.village || selectedParty.district || selectedParty.address) && (
              <span>• 📍 {selectedParty.village ? `${selectedParty.village}, ` : ''}{selectedParty.district || selectedParty.address || selectedParty.state}</span>
            )}
            {selectedParty.farmers?.length > 0 && (
              <span className="bg-emerald-900/90 text-emerald-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
                {selectedParty.farmers.length} Farmers / Locations
              </span>
            )}
          </div>
          {selectedParty.gstin && (
            <span className="font-mono bg-emerald-900/90 px-2 py-0.5 rounded text-[10px] text-emerald-200">
              GST: {selectedParty.gstin}
            </span>
          )}
        </div>
      )}

      {/* Live Dropdown Results Overlay */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto divide-y divide-slate-800">
          
          {/* Create Inline Party Hint Header */}
          {query.trim() && !filteredParties.some((p) => p.name.toLowerCase() === query.trim().toLowerCase()) && (
            <div className="p-2.5 bg-emerald-950/60 text-emerald-300 font-extrabold text-xs flex items-center justify-between border-b border-slate-700">
              <span className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Creating New {partyLabel}: "{query.trim()}"</span>
              </span>
              <span className="text-[10px] bg-emerald-700 text-white px-2 py-0.5 rounded font-mono">
                Inline Entry Below
              </span>
            </div>
          )}

          {/* Existing Results List */}
          {filteredParties.length === 0 ? (
            <div className="p-3 text-center text-slate-400 text-xs">
              No existing {partyLabel.toLowerCase()} matched "{query}". Fill details below to save as new {partyLabel.toLowerCase()}.
            </div>
          ) : (
            filteredParties.map((p) => {
              const isSelected = p.id === selectedPartyId;
              return (
                <div key={p.id} className="divide-y divide-slate-800/50">
                  <div
                    onClick={() => handleSelectParty(p)}
                    className={`p-3 hover:bg-slate-800/90 cursor-pointer transition flex justify-between items-center text-xs ${
                      isSelected ? 'bg-slate-800 border-l-4 border-emerald-500' : ''
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        <span>{p.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-slate-400 text-[11px]">
                        {p.mobile && (
                          <span className="flex items-center gap-1 font-mono text-slate-300">
                            <Phone className="w-3 h-3 text-emerald-400" /> {p.mobile}
                          </span>
                        )}
                        {(p.village || p.district || p.state) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {p.village ? `${p.village}, ` : ''}{p.district || p.state}
                          </span>
                        )}
                      </div>
                    </div>

                    {p.gstin && (
                      <span className="font-mono text-[10px] font-bold px-2 py-1 bg-slate-800 border border-slate-700 text-emerald-300 rounded-lg shrink-0">
                        {p.gstin}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* INLINE NEW CUSTOMER DETAILS ENTRY FORM */}
      {showInlineForm && (
        <div className="p-4 bg-slate-900/90 border border-emerald-500/40 rounded-2xl space-y-3 shadow-lg text-xs">
          <div className="flex justify-between items-center border-b border-slate-700/80 pb-2">
            <span className="font-extrabold text-emerald-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-emerald-400" /> {partyLabel} Details (New Customer Entry)
            </span>
            <span className="text-[10px] text-slate-400 italic">
              Phone is optional • Will save automatically with bill
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Customer Name */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                {partyLabel} Name *
              </label>
              <input
                type="text"
                value={query}
                onChange={handleInputChange}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl font-bold text-white text-xs focus:ring-1 focus:ring-emerald-500"
                placeholder="e.g. Deeksha"
              />
            </div>

            {/* Phone Number (OPTIONAL!) */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                Phone Number <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={inlineDetails.mobile}
                onChange={(e) => handleInlineFieldChange('mobile', e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white text-xs focus:ring-1 focus:ring-emerald-500"
                placeholder="Optional mobile number"
              />
            </div>

            {/* Alternate Phone */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                Alt Phone <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={inlineDetails.altMobile}
                onChange={(e) => handleInlineFieldChange('altMobile', e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white text-xs focus:ring-1 focus:ring-emerald-500"
                placeholder="Secondary mobile"
              />
            </div>

            {/* GSTIN */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                GSTIN <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={inlineDetails.gstin}
                onChange={(e) => handleInlineFieldChange('gstin', e.target.value.toUpperCase())}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl font-mono uppercase text-emerald-300 text-xs focus:ring-1 focus:ring-emerald-500"
                placeholder="e.g. 29ABCDE1234F1Z5"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                State / State Code
              </label>
              <select
                value={`${inlineDetails.stateCode}-${inlineDetails.state}`}
                onChange={(e) => {
                  const parts = e.target.value.split('-');
                  const code = parts[0];
                  const stName = parts.slice(1).join('-');
                  const updated = { ...inlineDetails, stateCode: code, state: stName };
                  setInlineDetails(updated);
                  emitDraftParty(query, updated);
                }}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl font-semibold text-white text-xs focus:ring-1 focus:ring-emerald-500"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={`${s.code}-${s.name}`}>
                    {s.code}-{s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* PIN Code */}
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                PIN Code <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={inlineDetails.pincode}
                onChange={(e) => handleInlineFieldChange('pincode', e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white text-xs focus:ring-1 focus:ring-emerald-500"
                placeholder="e.g. 570001"
              />
            </div>

            {/* Billing Address */}
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1">
                Billing Address <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={inlineDetails.address}
                onChange={(e) => handleInlineFieldChange('address', e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-1 focus:ring-emerald-500"
                placeholder="Street address, village, taluk..."
              />
            </div>

            {/* Shipping Address & Same Checkbox */}
            <div className="md:col-span-2 lg:col-span-3 space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-300 uppercase">
                  Shipping Address <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-emerald-400 select-none font-bold">
                  <input
                    type="checkbox"
                    checked={inlineDetails.isShippingSameAsBilling}
                    onChange={(e) => handleInlineFieldChange('isShippingSameAsBilling', e.target.checked)}
                    className="w-3.5 h-3.5 accent-emerald-500 rounded"
                  />
                  <span>Same as Billing Address</span>
                </label>
              </div>

              {!inlineDetails.isShippingSameAsBilling && (
                <input
                  type="text"
                  value={inlineDetails.shippingAddress}
                  onChange={(e) => handleInlineFieldChange('shippingAddress', e.target.value)}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-1 focus:ring-emerald-500"
                  placeholder="Different shipping destination..."
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD MAIN PARTY MODAL */}
      {showQuickAdd && (
        <QuickAddPartyModal
          type={partyType === 'ALL' ? 'CUSTOMER' : partyType}
          onSuccess={(newP) => {
            if (onPartyCreated) {
              onPartyCreated(newP);
            }
            handleSelectParty(newP);
            setShowQuickAdd(false);
          }}
          onClose={() => setShowQuickAdd(false)}
        />
      )}

      {/* QUICK ADD FARMER MODAL */}
      {showQuickFarmer && selectedParty && (
        <QuickAddFarmerModal
          parentParty={selectedParty}
          onSuccess={(newFarmer) => {
            const updatedFarmers = [...(selectedParty.farmers || []), newFarmer];
            const updatedParty = { ...selectedParty, farmers: updatedFarmers };
            if (onPartyCreated) onPartyCreated(updatedParty);
            handleSelectParty(updatedParty, newFarmer);
            setShowQuickFarmer(false);
          }}
          onClose={() => setShowQuickFarmer(false)}
        />
      )}
    </div>
  );
};
