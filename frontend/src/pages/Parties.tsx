import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { Users, Plus, Eye, Edit, Trash2, Search, Power } from 'lucide-react';
import { PartyEditorModal } from '../components/PartyEditorModal';
import { ViewPartyModal } from '../components/ViewPartyModal';
import { DeletePartyModal } from '../components/DeletePartyModal';

export const Parties: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'CUSTOMER' | 'SUPPLIER' | 'ALL'>('CUSTOMER');

  // Modals state
  const [editorModalParty, setEditorModalParty] = useState<any | null>(
    searchParams.get('create') === 'true' ? {} : null
  );
  const [viewingParty, setViewingParty] = useState<any | null>(null);
  const [partySummary, setPartySummary] = useState<any | null>(null);
  const [deletingParty, setDeletingParty] = useState<any | null>(null);

  useEffect(() => {
    loadParties();
  }, [activeTab]);

  const loadParties = async () => {
    setLoading(true);
    try {
      const typeQuery = activeTab !== 'ALL' ? `?type=${activeTab}` : '';
      const res = await apiRequest(`/parties${typeQuery}`);
      const list = Array.isArray(res) ? res : res.parties || [];
      setParties(list);
    } catch (err) {
      console.error('Failed to load parties:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenView = async (party: any) => {
    try {
      const res = await apiRequest(`/parties/${party.id}`);
      setViewingParty(res.party);
      setPartySummary(res.summary);
    } catch (err) {
      setViewingParty(party);
    }
  };

  const handleSaved = (saved: any) => {
    setEditorModalParty(null);
    setViewingParty(null);
    loadParties();
  };

  const handleDeleteSuccess = (msg: string) => {
    setDeletingParty(null);
    setViewingParty(null);
    loadParties();
  };

  const filteredParties = parties.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name?.toLowerCase().includes(q) ||
      p.mobile?.toLowerCase().includes(q) ||
      p.gstin?.toLowerCase().includes(q) ||
      p.village?.toLowerCase().includes(q) ||
      p.district?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-900" />
            Parties (Customers & Suppliers)
          </h1>
          <p className="text-xs text-gray-500 font-medium">Customer & Supplier Master Profiles with Historical Safety</p>
        </div>

        <button
          onClick={() => setEditorModalParty({})}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-900 text-white rounded-2xl font-bold hover:bg-blue-950 shadow-lg shadow-blue-900/30 transition text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Party</span>
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="flex bg-gray-200 p-1 rounded-2xl self-start">
          <button
            onClick={() => setActiveTab('CUSTOMER')}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition ${
              activeTab === 'CUSTOMER' ? 'bg-white text-blue-900 shadow' : 'text-gray-600'
            }`}
          >
            Customers
          </button>
          <button
            onClick={() => setActiveTab('SUPPLIER')}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition ${
              activeTab === 'SUPPLIER' ? 'bg-white text-purple-900 shadow' : 'text-gray-600'
            }`}
          >
            Suppliers
          </button>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition ${
              activeTab === 'ALL' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'
            }`}
          >
            All Parties ({parties.length})
          </button>
        </div>

        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm max-w-md w-full">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search party by name, mobile, GSTIN, village..."
            className="w-full text-xs outline-none bg-transparent"
          />
        </div>
      </div>

      {/* Parties Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 border-b text-gray-700 font-extrabold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-4">Party Name</th>
                <th className="p-4">Mobile</th>
                <th className="p-4">Category</th>
                <th className="p-4">Village / City</th>
                <th className="p-4">GSTIN</th>
                <th className="p-4 text-right">Opening Balance</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400 font-medium">Loading party records...</td>
                </tr>
              ) : filteredParties.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400 font-medium">No parties found</td>
                </tr>
              ) : (
                filteredParties.map((p) => (
                  <tr key={p.id} className="hover:bg-blue-50/30 transition">
                    <td className="p-4 font-extrabold text-gray-900">{p.name}</td>
                    <td className="p-4 font-mono font-bold text-gray-800">{p.mobile}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-gray-100 text-gray-700">
                        {p.type} • {p.customerType}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">{p.village || p.district || '-'}</td>
                    <td className="p-4 font-mono text-gray-600">{p.gstin || '-'}</td>
                    <td className="p-4 text-right font-mono font-bold text-gray-800">
                      ₹{(p.openingBalance || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                        p.active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {p.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenView(p)}
                          title="View Profile"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditorModalParty(p)}
                          title="Edit Party"
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingParty(p)}
                          title={p.active ? 'Delete / Deactivate Party' : 'Reactivate Party'}
                          className={`p-1.5 rounded-lg transition ${p.active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                        >
                          {p.active ? <Trash2 className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal */}
      {editorModalParty && (
        <PartyEditorModal
          party={editorModalParty.id ? editorModalParty : undefined}
          defaultType={activeTab !== 'ALL' ? activeTab : 'CUSTOMER'}
          onSaved={handleSaved}
          onClose={() => setEditorModalParty(null)}
        />
      )}

      {/* View Modal */}
      {viewingParty && (
        <ViewPartyModal
          party={viewingParty}
          summary={partySummary}
          onEdit={() => {
            setEditorModalParty(viewingParty);
            setViewingParty(null);
          }}
          onDelete={() => {
            setDeletingParty(viewingParty);
            setViewingParty(null);
          }}
          onClose={() => setViewingParty(null)}
          onPartyUpdated={() => handleOpenView(viewingParty)}
        />
      )}

      {/* Delete / Deactivate Modal */}
      {deletingParty && (
        <DeletePartyModal
          party={deletingParty}
          onSuccess={handleDeleteSuccess}
          onClose={() => setDeletingParty(null)}
        />
      )}

    </div>
  );
};
