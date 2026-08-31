import React, { useState } from 'react';
import { Search, Plus, LogOut, Bell, FileText, ShoppingCart, Users, Package, Wrench, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showQuickModal, setShowQuickModal] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await apiRequest(`/search?query=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 no-print">
      <div className="px-6 py-3 flex items-center justify-between gap-4">
        {/* Global Search Bar */}
        <div className="relative flex-1 max-w-xl">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers, invoices, machines, serial numbers, items (e.g. Ramesh, INV-001, CC-2026)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value) setSearchResults(null);
                }}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
          </form>

          {/* Search Overlay Results */}
          {searchResults && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 max-h-96 overflow-y-auto z-50">
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Search Results</span>
                <button onClick={() => setSearchResults(null)} className="text-xs text-red-600 hover:underline">Close</button>
              </div>

              {/* Customers */}
              {searchResults.parties?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-bold text-emerald-700 uppercase mb-1">Customers / Suppliers</p>
                  {searchResults.parties.map((p: any) => (
                    <div
                      key={p.id}
                      onClick={() => { navigate(`/parties?id=${p.id}`); setSearchResults(null); }}
                      className="p-2 hover:bg-emerald-50 rounded cursor-pointer text-sm flex justify-between"
                    >
                      <span className="font-semibold text-gray-800">{p.name} ({p.mobile})</span>
                      <span className="text-xs text-gray-500">{p.district}, {p.state}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Invoices */}
              {searchResults.invoices?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-bold text-blue-700 uppercase mb-1">Invoices</p>
                  {searchResults.invoices.map((inv: any) => (
                    <div
                      key={inv.id}
                      onClick={() => { navigate(`/sales?id=${inv.id}`); setSearchResults(null); }}
                      className="p-2 hover:bg-blue-50 rounded cursor-pointer text-sm flex justify-between"
                    >
                      <span className="font-semibold text-gray-800">{inv.invoiceNumber} - {inv.party.name}</span>
                      <span className="text-xs font-bold text-gray-700">₹{inv.grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Machines */}
              {searchResults.machines?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-bold text-amber-700 uppercase mb-1">Machines (Serial S/N)</p>
                  {searchResults.machines.map((m: any) => (
                    <div
                      key={m.id}
                      onClick={() => { navigate(`/services?serial=${m.serialNumber}`); setSearchResults(null); }}
                      className="p-2 hover:bg-amber-50 rounded cursor-pointer text-sm flex justify-between"
                    >
                      <span className="font-semibold text-gray-800">S/N: {m.serialNumber} ({m.model})</span>
                      <span className="text-xs text-gray-600">{m.party.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Actions Button */}
          <button
            onClick={() => setShowQuickModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Action</span>
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Quick Action Modal Overlay */}
      {showQuickModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
              <button onClick={() => setShowQuickModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => { navigate('/sales?create=true'); setShowQuickModal(false); }}
                className="p-3.5 bg-emerald-50 hover:bg-emerald-100 rounded-xl flex flex-col items-center gap-1.5 border border-emerald-200 text-emerald-800 font-bold text-xs transition"
              >
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>+ Sales Invoice</span>
              </button>

              <button
                onClick={() => { navigate('/quotations?create=true'); setShowQuickModal(false); }}
                className="p-3.5 bg-blue-50 hover:bg-blue-100 rounded-xl flex flex-col items-center gap-1.5 border border-blue-200 text-blue-800 font-bold text-xs transition"
              >
                <FileText className="w-5 h-5 text-blue-600" />
                <span>+ Quotation</span>
              </button>

              <button
                onClick={() => { navigate('/purchases?create=true'); setShowQuickModal(false); }}
                className="p-3.5 bg-purple-50 hover:bg-purple-100 rounded-xl flex flex-col items-center gap-1.5 border border-purple-200 text-purple-800 font-bold text-xs transition"
              >
                <ShoppingCart className="w-5 h-5 text-purple-600" />
                <span>+ Purchase</span>
              </button>

              <button
                onClick={() => { navigate('/delivery-challans?create=true'); setShowQuickModal(false); }}
                className="p-3.5 bg-indigo-50 hover:bg-indigo-100 rounded-xl flex flex-col items-center gap-1.5 border border-indigo-200 text-indigo-800 font-bold text-xs transition"
              >
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>+ Delivery Challan</span>
              </button>

              <button
                onClick={() => { navigate('/parties?create=true'); setShowQuickModal(false); }}
                className="p-3.5 bg-amber-50 hover:bg-amber-100 rounded-xl flex flex-col items-center gap-1.5 border border-amber-200 text-amber-800 font-bold text-xs transition"
              >
                <Users className="w-5 h-5 text-amber-600" />
                <span>+ Party / Customer</span>
              </button>

              <button
                onClick={() => { navigate('/inventory?create=true'); setShowQuickModal(false); }}
                className="p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl flex flex-col items-center gap-1.5 border border-slate-200 text-slate-800 font-bold text-xs transition"
              >
                <Package className="w-5 h-5 text-slate-600" />
                <span>+ Item / Machine</span>
              </button>

              <button
                onClick={() => { navigate('/accounting?payment=true'); setShowQuickModal(false); }}
                className="p-3.5 bg-teal-50 hover:bg-teal-100 rounded-xl flex flex-col items-center gap-1.5 border border-teal-200 text-teal-800 font-bold text-xs transition"
              >
                <DollarSign className="w-5 h-5 text-teal-600" />
                <span>+ Payment</span>
              </button>

              <button
                onClick={() => { navigate('/expenses?create=true'); setShowQuickModal(false); }}
                className="p-3.5 bg-rose-50 hover:bg-rose-100 rounded-xl flex flex-col items-center gap-1.5 border border-rose-200 text-rose-800 font-bold text-xs transition"
              >
                <DollarSign className="w-5 h-5 text-rose-600" />
                <span>+ Expense</span>
              </button>

              <button
                onClick={() => { navigate('/services?create=true'); setShowQuickModal(false); }}
                className="p-3.5 bg-emerald-50 hover:bg-emerald-100 rounded-xl flex flex-col items-center gap-1.5 border border-emerald-200 text-emerald-800 font-bold text-xs transition"
              >
                <Wrench className="w-5 h-5 text-emerald-700" />
                <span>+ Service Task</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
