import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Check, X, ChevronDown, Building, Phone, MapPin } from 'lucide-react';
import { QuickAddPartyModal } from './QuickAddPartyModal';

export interface SearchablePartyComboboxProps {
  partyType: 'CUSTOMER' | 'SUPPLIER' | 'ALL';
  selectedPartyId: string;
  onSelectParty: (party: any | null) => void;
  parties: any[];
  onPartyCreated?: (newParty: any) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export const SearchablePartyCombobox: React.FC<SearchablePartyComboboxProps> = ({
  partyType,
  selectedPartyId,
  onSelectParty,
  parties,
  onPartyCreated,
  placeholder,
  label,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedParty = parties.find((p) => p.id === selectedPartyId) || null;

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
        // Reset query string to selected party name if closed without selecting
        if (selectedParty) {
          setQuery(selectedParty.name);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedParty]);

  // Filter parties live by name, mobile, gstin, village, district, address
  const filteredParties = parties.filter((p) => {
    // Type filter
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

    return nameMatch || mobileMatch || gstinMatch || addressMatch || villageMatch || districtMatch;
  });

  const handleSelect = (party: any) => {
    onSelectParty(party);
    setQuery(party.name);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectParty(null);
    setQuery('');
    setIsOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
    if (!e.target.value.trim()) {
      onSelectParty(null);
    }
  };

  const partyLabel = partyType === 'SUPPLIER' ? 'Supplier' : 'Customer';

  return (
    <div className="relative space-y-1" ref={containerRef}>
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
          placeholder={placeholder || `Type ${partyLabel.toLowerCase()} name, mobile, GSTIN, location...`}
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
        <div className="mt-1 px-3 py-1.5 bg-emerald-950/70 border border-emerald-700/60 rounded-xl text-[11px] flex flex-wrap justify-between items-center gap-2 text-emerald-300">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-xs">{selectedParty.name}</span>
            {selectedParty.mobile && <span>• 📱 {selectedParty.mobile}</span>}
            {(selectedParty.village || selectedParty.district) && (
              <span>• 📍 {selectedParty.village ? `${selectedParty.village}, ` : ''}{selectedParty.district || selectedParty.state}</span>
            )}
          </div>
          {selectedParty.gstin && (
            <span className="font-mono bg-emerald-900/80 px-2 py-0.5 rounded text-[10px] text-emerald-200">
              GST: {selectedParty.gstin}
            </span>
          )}
        </div>
      )}

      {/* Live Dropdown Results Overlay */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto divide-y divide-slate-800">
          
          {/* Add New Customer Action Button at Top of List */}
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
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelect(p)}
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

                  {/* GSTIN badge */}
                  {p.gstin && (
                    <span className="font-mono text-[10px] font-bold px-2 py-1 bg-slate-800 border border-slate-700 text-emerald-300 rounded-lg shrink-0">
                      {p.gstin}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* QUICK ADD PARTY MODAL */}
      {showQuickAdd && (
        <QuickAddPartyModal
          type={partyType === 'ALL' ? 'CUSTOMER' : partyType}
          onSuccess={(newP) => {
            if (onPartyCreated) {
              onPartyCreated(newP);
            }
            onSelectParty(newP);
            setQuery(newP.name);
            setShowQuickAdd(false);
          }}
          onClose={() => setShowQuickAdd(false)}
        />
      )}
    </div>
  );
};
