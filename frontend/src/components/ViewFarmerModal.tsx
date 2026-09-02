import React, { useState, useEffect } from 'react';
import { X, User, Phone, MapPin, Wrench, FileText, Truck, RefreshCw, Edit, Trash2, Calendar, ShieldCheck, AlertTriangle, Plus } from 'lucide-react';
import { apiRequest } from '../api';
import { AssignMachineModal } from './AssignMachineModal';

interface ViewFarmerModalProps {
  farmerId: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose: () => void;
}

export const ViewFarmerModal: React.FC<ViewFarmerModalProps> = ({ farmerId, onEdit, onDelete, onClose }) => {
  const [farmer, setFarmer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'MACHINES' | 'INVOICES' | 'QUOTATIONS' | 'CHALLANS' | 'SERVICES'>('MACHINES');
  const [showAssignMachine, setShowAssignMachine] = useState(false);

  useEffect(() => {
    loadFarmer();
  }, [farmerId]);

  const loadFarmer = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/farmers/${farmerId}`);
      setFarmer(res.farmer);
    } catch (err) {
      console.error('Error loading farmer detail:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl p-8 max-w-sm w-full text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
          <p className="font-extrabold text-sm text-slate-300">Loading Farmer Profile & History...</p>
        </div>
      </div>
    );
  }

  if (!farmer) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto font-sans">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl shadow-2xl max-w-4xl w-full my-6 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-xl">
              👨‍🌾
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white">{farmer.name}</h2>
                <span className="bg-amber-900/80 text-amber-200 border border-amber-700 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                  FARMER / LOCATION
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Parent Organization: <span className="font-bold text-emerald-300">{farmer.party?.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
              >
                <Edit className="w-4 h-4" /> Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-3.5 py-2 bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Profile Card Summary Grid */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div className="space-y-1.5">
              <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Contact Information</div>
              <div className="font-mono text-sm font-bold text-white flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>{farmer.mobile}</span>
                {farmer.altMobile && <span className="text-slate-400 font-normal">/ {farmer.altMobile}</span>}
              </div>
              {farmer.email && <div className="text-slate-400 font-medium">{farmer.email}</div>}
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Location & Address</div>
              <div className="flex items-start gap-1.5 text-slate-200 font-medium">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">{farmer.village || farmer.address || 'Location Not Specified'}</div>
                  <div className="text-slate-400">
                    {[farmer.taluk, farmer.district, farmer.state].filter(Boolean).join(', ')} {farmer.pincode ? `- ${farmer.pincode}` : ''}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Parent Organization</div>
              <div className="font-extrabold text-emerald-400 text-sm">{farmer.party?.name}</div>
              {farmer.party?.gstin && (
                <div className="font-mono text-[10px] text-slate-400">GSTIN: {farmer.party.gstin}</div>
              )}
            </div>
          </div>

          {/* DATABASE-LINKED HISTORY TABS */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
              <button
                onClick={() => setActiveTab('MACHINES')}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                  activeTab === 'MACHINES' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Wrench className="w-4 h-4" /> Machines ({farmer.machines?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab('SERVICES')}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                  activeTab === 'SERVICES' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <RefreshCw className="w-4 h-4" /> Service History ({farmer.serviceTasks?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab('INVOICES')}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                  activeTab === 'INVOICES' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" /> Invoices ({farmer.invoices?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab('QUOTATIONS')}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                  activeTab === 'QUOTATIONS' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" /> Quotations ({farmer.quotations?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab('CHALLANS')}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                  activeTab === 'CHALLANS' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Truck className="w-4 h-4" /> Delivery Challans ({farmer.deliveryChallans?.length || 0})
              </button>
            </div>

            {/* TAB 1: ASSIGNED MACHINES */}
            {activeTab === 'MACHINES' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="font-extrabold text-amber-300 text-xs">MACHINES & SERIAL NUMBERS</span>
                  <button
                    onClick={() => setShowAssignMachine(true)}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-extrabold text-xs flex items-center gap-1 shadow transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Assign Machine
                  </button>
                </div>

                {farmer.machines?.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 font-medium">
                    No machines assigned to {farmer.name} yet. Click "+ Assign Machine" above to register equipment.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {farmer.machines?.map((m: any) => (
                      <div key={m.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-extrabold text-white text-sm">{m.machineItem?.name || m.model}</div>
                            <div className="font-mono text-emerald-400 font-bold text-xs">S/N: {m.serialNumber}</div>
                          </div>
                          <span className="px-2 py-0.5 bg-emerald-900/80 text-emerald-200 border border-emerald-700 rounded text-[10px] font-bold">
                            ACTIVE
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-850">
                          <span>Installed: {new Date(m.saleDate).toLocaleDateString('en-IN')}</span>
                          <span>Next Srv: {m.nextServiceDate ? new Date(m.nextServiceDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SERVICE HISTORY */}
            {activeTab === 'SERVICES' && (
              <div className="space-y-2">
                {farmer.serviceTasks?.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 font-medium">
                    No service tasks recorded for {farmer.name}.
                  </div>
                ) : (
                  farmer.serviceTasks?.map((srv: any) => (
                    <div key={srv.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white font-mono">{srv.serviceNo} • {srv.serialNumber}</div>
                        <div className="text-slate-400 text-[11px]">Due: {new Date(srv.serviceDueDate).toLocaleDateString('en-IN')}</div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${srv.status === 'COMPLETED' ? 'bg-emerald-900 text-emerald-200' : 'bg-amber-900 text-amber-200'}`}>
                        {srv.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: INVOICES */}
            {activeTab === 'INVOICES' && (
              <div className="space-y-2">
                {farmer.invoices?.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 font-medium">
                    No invoices linked to {farmer.name}.
                  </div>
                ) : (
                  farmer.invoices?.map((inv: any) => (
                    <div key={inv.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white font-mono">{inv.invoiceNumber}</div>
                        <div className="text-slate-400 text-[11px]">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</div>
                      </div>
                      <div className="font-mono font-bold text-emerald-400">₹{inv.grandTotal?.toLocaleString('en-IN')}</div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 4: QUOTATIONS */}
            {activeTab === 'QUOTATIONS' && (
              <div className="space-y-2">
                {farmer.quotations?.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 font-medium">
                    No quotations linked to {farmer.name}.
                  </div>
                ) : (
                  farmer.quotations?.map((q: any) => (
                    <div key={q.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white font-mono">{q.quotationNumber}</div>
                        <div className="text-slate-400 text-[11px]">{new Date(q.quotationDate).toLocaleDateString('en-IN')}</div>
                      </div>
                      <div className="font-mono font-bold text-amber-400">₹{q.grandTotal?.toLocaleString('en-IN')}</div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 5: CHALLANS */}
            {activeTab === 'CHALLANS' && (
              <div className="space-y-2">
                {farmer.deliveryChallans?.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-2xl text-slate-400 font-medium">
                    No delivery challans linked to {farmer.name}.
                  </div>
                ) : (
                  farmer.deliveryChallans?.map((dc: any) => (
                    <div key={dc.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white font-mono">{dc.challanNumber}</div>
                        <div className="text-slate-400 text-[11px]">{new Date(dc.challanDate).toLocaleDateString('en-IN')}</div>
                      </div>
                      <span className="px-2 py-0.5 bg-blue-900 text-blue-200 rounded text-[10px] font-bold">
                        {dc.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>

        </div>
      </div>

      {/* ASSIGN MACHINE MODAL */}
      {showAssignMachine && (
        <AssignMachineModal
          farmer={farmer}
          onSuccess={() => {
            setShowAssignMachine(false);
            loadFarmer();
          }}
          onClose={() => setShowAssignMachine(false)}
        />
      )}
    </div>
  );
};
