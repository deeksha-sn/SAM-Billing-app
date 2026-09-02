import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Check, X, ChevronDown, Building, Phone, MapPin, User } from 'lucide-react';
import { QuickAddPartyModal } from './QuickAddPartyModal';
import { QuickAddFarmerModal } from './QuickAddFarmerModal';

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

  const selectedParty = parties.find((p) => p.id === selectedPartyId) || null;
  const selectedFarmer = selectedParty?.farmers?.find((f: any) => f.id === selectedFarmerId) || null;

  useEffect(() => {
    if (selectedParty) {
      setQuery(selectedParty.name);
    } else {
      setQuery('');
    }
  }, [selectedPartyId, selectedParty]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (selectedParty) {
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

    // Also match any child farmer's name/phone/village/district
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
    setIsOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
    if (!e.target.value.trim()) {
      onSelectParty(null);
      if (onSelectFarmer) onSelectFarmer(null);
    }
  };

  const partyLabel = partyType === 'SUPPLIER' ? 'Supplier' : 'Customer';

  return (
    <div className="relative space-y-1.5" ref={containerRef}>
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
            <UserPlus className="w-3.5 h-3.5" /> + Quick Add {partyLabel}
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
          placeholder={placeholder || `Type ${partyLabel.toLowerCase()} or farmer name, mobile, GSTIN, location...`}
          className="w-full pl-9 pr-10 py-2.5 bg-slate-900 border border-slate-600 rounded-xl font-bold text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition shadow-sm placeholder:text-slate-500"
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {selectedParty && (
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

      {/* Selected Party Summary Pill */}
      {selectedParty && (
        <div className="px-3 py-2 bg-emerald-950/80 border border-emerald-700/60 rounded-xl text-[11px] flex flex-wrap justify-between items-center gap-2 text-emerald-300">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-xs">{selectedParty.name}</span>
            {selectedParty.mobile && <span>• 📱 {selectedParty.mobile}</span>}
            {(selectedParty.village || selectedParty.district) && (
              <span>• 📍 {selectedParty.village ? `${selectedParty.village}, ` : ''}{selectedParty.district || selectedParty.state}</span>
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

      {/* Delivery / Farmer Selector for Organizations / Main Parties */}
      {selectedParty && (
        <div className="p-3 bg-slate-900 border border-slate-700 rounded-2xl space-y-1.5 shadow-md">
          <div className="flex justify-between items-center text-xs">
            <span className="font-extrabold text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Delivery / Farmer Recipient
            </span>
            <button
              type="button"
              onClick={() => setShowQuickFarmer(true)}
              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 text-[11px] transition"
            >
              <UserPlus className="w-3 h-3" /> + Add Farmer to {selectedParty.name}
            </button>
          </div>

          <select
            value={selectedFarmerId || ''}
            onChange={(e) => {
              const fid = e.target.value;
              const f = selectedParty.farmers?.find((farm: any) => farm.id === fid) || null;
              if (onSelectFarmer) onSelectFarmer(f);
            }}
            className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl font-bold text-xs text-white focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">-- Deliver to Main Party ({selectedParty.name}) Directly --</option>
            {selectedParty.farmers?.map((f: any) => (
              <option key={f.id} value={f.id}>
                {f.name} • 📱 {f.mobile} ({f.village || f.district || f.state}) {f.machines?.length ? `[${f.machines.length} Machines]` : ''}
              </option>
            ))}
          </select>

          {selectedFarmer && (
            <div className="mt-1 px-3 py-1.5 bg-amber-950/60 border border-amber-800/60 rounded-xl text-[11px] flex items-center justify-between text-amber-200">
              <div>
                <span className="font-bold text-white">Deliver / Ship To:</span> {selectedFarmer.name} (📱 {selectedFarmer.mobile})
                <span className="block text-[10px] text-amber-300/80">{selectedFarmer.address || selectedFarmer.village}, {selectedFarmer.district}</span>
              </div>
              <button
                type="button"
                onClick={() => onSelectFarmer && onSelectFarmer(null)}
                className="text-slate-400 hover:text-white text-[10px] underline"
              >
                Reset Farmer
              </button>
            </div>
          )}
        </div>
      )}

      {/* Live Dropdown Results Overlay */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto divide-y divide-slate-800">
          
          {/* Add New Party Button */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setShowQuickAdd(true);
            }}
            className="w-full p-3 bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 font-extrabold text-xs flex items-center justify-between border-b border-slate-700 transition"
          >
            <span className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>+ Add New {partyLabel} "{query.trim() || ''}"</span>
            </span>
            <span className="text-[10px] bg-emerald-700 text-white px-2 py-0.5 rounded font-mono">
              Quick Create
            </span>
          </button>

          {/* Results List */}
          {filteredParties.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs">
              No matching {partyLabel.toLowerCase()} found for "{query}".
            </div>
          ) : (
            filteredParties.map((p) => {
              const isSelected = p.id === selectedPartyId;
              const matchedFarmers = (p.farmers || []).filter((f: any) => {
                if (!query.trim()) return false;
                const q = query.toLowerCase().trim();
                return (
                  (f.name || '').toLowerCase().includes(q) ||
                  (f.mobile || '').includes(q) ||
                  (f.village || '').toLowerCase().includes(q)
                );
              });

              return (
                <div key={p.id} className="divide-y divide-slate-800/50">
                  {/* Main Party Row */}
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

                  {/* Matched Farmer Sub-rows if query matched a specific farmer */}
                  {matchedFarmers.map((f: any) => (
                    <div
                      key={f.id}
                      onClick={() => handleSelectParty(p, f)}
                      className="p-2.5 pl-8 bg-slate-950/70 hover:bg-emerald-950/60 cursor-pointer transition flex justify-between items-center text-xs border-t border-slate-800"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                          <span>👨‍🌾 Farmer: {f.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">(under {p.name})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          📱 {f.mobile} • 📍 {f.village || f.district || f.state}
                        </div>
                      </div>
                      <span className="text-[10px] bg-amber-900/60 text-amber-200 px-2 py-0.5 rounded font-bold">
                        Select Farmer
                      </span>
                    </div>
                  ))}
                </div>
              );
            })
          )}
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
