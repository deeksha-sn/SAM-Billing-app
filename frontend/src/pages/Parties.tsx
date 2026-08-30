import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { Users, Plus, Phone, MapPin, FileText, Wrench, ArrowRight } from 'lucide-react';
import { QuickAddPartyModal } from '../components/QuickAddPartyModal';

export const Parties: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [parties, setParties] = useState<any[]>([]);
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [partyDetail, setPartyDetail] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('create') === 'true');

  useEffect(() => {
    loadParties();
  }, [activeTab, search]);

  const loadParties = async () => {
    try {
      const res = await apiRequest(`/parties?type=${activeTab}&search=${encodeURIComponent(search)}`);
      setParties(res.parties);
    } catch (err) {
      console.error(err);
    }
  };

  const loadPartyDetail = async (partyId: string) => {
    try {
      const res = await apiRequest(`/parties/${partyId}`);
      setPartyDetail(res);
      setSelectedParty(res.party);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parties (Customers & Suppliers)</h1>
          <p className="text-sm text-gray-500">Party Master Directory with Connected Document History</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-md transition"
        >
          <Plus className="w-5 h-5" />
          <span>+ Add New Party</span>
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex bg-gray-200 p-1 rounded-xl">
          <button
            onClick={() => { setActiveTab('CUSTOMER'); setSelectedParty(null); }}
            className={`px-5 py-2 rounded-lg font-bold text-xs transition ${activeTab === 'CUSTOMER' ? 'bg-white text-emerald-800 shadow' : 'text-gray-600'}`}
          >
            Customers ({parties.length})
          </button>
          <button
            onClick={() => { setActiveTab('SUPPLIER'); setSelectedParty(null); }}
            className={`px-5 py-2 rounded-lg font-bold text-xs transition ${activeTab === 'SUPPLIER' ? 'bg-white text-purple-800 shadow' : 'text-gray-600'}`}
          >
            Suppliers
          </button>
        </div>

        <input
          type="text"
          placeholder="Search party by name, mobile, village, GSTIN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm w-72 focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Main Grid: List + Connected Profile View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parties Table */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden max-h-[700px] overflow-y-auto">
          <div className="divide-y divide-gray-100">
            {parties.map((p) => (
              <div
                key={p.id}
                onClick={() => loadPartyDetail(p.id)}
                className={`p-4 hover:bg-emerald-50 cursor-pointer transition ${selectedParty?.id === p.id ? 'bg-emerald-50/80 border-l-4 border-emerald-600' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-sm text-gray-900">{p.name}</h3>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                    {p.customerType || p.type}
                  </span>
                </div>
                <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                  <Phone className="w-3 h-3 text-gray-400" /> <span className="font-mono">{p.mobile}</span>
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-gray-400" /> {p.village ? `${p.village}, ` : ''}{p.district}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Party Profile Detail */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {selectedParty && partyDetail ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start pb-4 border-b">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedParty.name}</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedParty.address || selectedParty.village}, {selectedParty.taluk ? `${selectedParty.taluk}, ` : ''}{selectedParty.district}, {selectedParty.state} - {selectedParty.pincode}
                  </p>
                  <p className="text-xs text-gray-700 font-mono mt-1">Mobile: {selectedParty.mobile} {selectedParty.gstin ? `| GSTIN: ${selectedParty.gstin}` : ''}</p>
                </div>
                <div className="text-right bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <span className="text-xs text-emerald-700 font-bold uppercase">Total Lifetime Sales</span>
                  <p className="text-lg font-black font-mono text-emerald-900">₹{partyDetail.summary?.totalSales.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-red-600 font-bold mt-0.5">Outstanding: ₹{partyDetail.summary?.salesBalance.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Connected Machines */}
              {partyDetail.party.machines?.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Wrench className="w-4 h-4 text-emerald-600" /> Registered Machines
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {partyDetail.party.machines.map((m: any) => (
                      <div key={m.id} className="p-3 bg-gray-50 rounded-xl border text-xs">
                        <p className="font-bold text-gray-900">{m.model}</p>
                        <p className="text-gray-600 font-mono">S/N: {m.serialNumber}</p>
                        <p className="text-emerald-700 font-medium mt-1">Sale Date: {new Date(m.saleDate).toLocaleDateString('en-IN')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoices History */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <FileText className="w-4 h-4 text-emerald-600" /> Recent Invoices
                </h3>
                <div className="space-y-2">
                  {partyDetail.party.invoices?.map((inv: any) => (
                    <div key={inv.id} className="p-3 bg-gray-50 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold font-mono text-emerald-800">{inv.invoiceNumber}</span>
                        <span className="text-gray-500 ml-2">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold">₹{inv.grandTotal.toLocaleString('en-IN')}</span>
                        <span className={`ml-2 px-2 py-0.5 font-bold rounded ${inv.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold">Select a customer or supplier to view connected profile history.</p>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <QuickAddPartyModal
          type={activeTab}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadParties();
          }}
        />
      )}
    </div>
  );
};
