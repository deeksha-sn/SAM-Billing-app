import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import {
  Wrench,
  Plus,
  Phone,
  MessageSquare,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Send,
  History,
  Search,
  Filter,
  ExternalLink,
  Clock,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

import { ServiceCompletionModal } from '../components/ServiceCompletionModal';
import { AssignTechnicianModal } from '../components/AssignTechnicianModal';
import { WhatsAppCustomerModal } from '../components/WhatsAppCustomerModal';
import { WhatsAppTechnicianDispatchModal } from '../components/WhatsAppTechnicianDispatchModal';
import { BulkReminderProgressModal } from '../components/BulkReminderProgressModal';
import { ReminderLogModal } from '../components/ReminderLogModal';
import { ServiceCalendarModal } from '../components/ServiceCalendarModal';

export const ServiceManagement: React.FC = () => {
  const [services, setServices] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    servicesToday: 0,
    overdueServices: 0,
    upcomingServices: 0,
    assigned: 0,
    unassigned: 0,
    completedToday: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<string>('today');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTechnicianFilter, setSelectedTechnicianFilter] = useState<string>('');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Technicians master list
  const [technicians, setTechnicians] = useState<any[]>([]);

  // Modals state
  const [completingService, setCompletingService] = useState<any | null>(null);
  const [assigningServiceIds, setAssigningServiceIds] = useState<string[] | null>(null);
  const [whatsAppCustomerService, setWhatsAppCustomerService] = useState<any | null>(null);
  const [showTechDispatchModal, setShowTechDispatchModal] = useState<boolean>(false);
  const [showBulkRemindModal, setShowBulkRemindModal] = useState<boolean>(false);
  const [showReminderLogs, setShowReminderLogs] = useState<boolean>(false);
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);

  useEffect(() => {
    loadSummary();
    loadServices();
    loadTechnicians();
  }, [activeTab, selectedTechnicianFilter, selectedCalendarDate]);

  const loadSummary = async () => {
    try {
      const res = await apiRequest('/services/summary');
      if (res.summary) setSummary(res.summary);
    } catch (err) {
      console.error('Failed to load services summary:', err);
    }
  };

  const loadServices = async () => {
    setLoading(true);
    try {
      let query = `?filter=${activeTab}`;
      if (selectedTechnicianFilter) query += `&technicianId=${selectedTechnicianFilter}`;
      if (selectedCalendarDate) query += `&date=${selectedCalendarDate}`;

      const res = await apiRequest(`/services${query}`);
      setServices(res.services || []);
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTechnicians = async () => {
    try {
      const res = await apiRequest('/users');
      const techUsers = (res.users || []).filter(
        (u: any) => u.role === 'SERVICE_MANAGER' || u.role === 'TECHNICIAN' || u.role === 'ADMIN'
      );
      setTechnicians(techUsers);
    } catch (err) {
      console.error('Failed to load technicians:', err);
    }
  };

  const handleCompleted = (result: any) => {
    setCompletingService(null);
    loadSummary();
    loadServices();
  };

  const handleAssigned = () => {
    setAssigningServiceIds(null);
    loadSummary();
    loadServices();
  };

  // Google Maps link generator
  const getGoogleMapsUrl = (party: any) => {
    if (party.latitude && party.longitude) {
      return `https://www.google.com/maps?q=${party.latitude},${party.longitude}`;
    }
    const fullAddress = [party.address, party.village, party.taluk, party.district, party.state, party.pincode]
      .filter(Boolean)
      .join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress || party.name)}`;
  };

  // Search Filtering
  const filteredServices = services.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.serviceNo?.toLowerCase().includes(q) ||
      s.serialNumber?.toLowerCase().includes(q) ||
      s.party?.name?.toLowerCase().includes(q) ||
      s.party?.mobile?.toLowerCase().includes(q) ||
      s.machine?.model?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-emerald-800" />
            Service Management & Daily Dispatch
          </h1>
          <p className="text-xs text-gray-500 font-medium">Real-World Service Reminders, Calendar & Technician Mobile Dispatch</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCalendarModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition"
          >
            <Calendar className="w-4 h-4 text-slate-700" />
            <span>Calendar View</span>
          </button>

          <button
            onClick={() => setShowTechDispatchModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-900 text-white rounded-xl font-bold text-xs hover:bg-blue-950 shadow-md transition"
          >
            <UserCheck className="w-4 h-4" />
            <span>WhatsApp Technician Dispatch</span>
          </button>

          <button
            onClick={() => setShowBulkRemindModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 text-white rounded-xl font-bold text-xs hover:bg-emerald-900 shadow-md transition"
          >
            <Send className="w-4 h-4" />
            <span>Remind Today's Customers ({summary.servicesToday})</span>
          </button>

          <button
            onClick={() => setShowReminderLogs(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs transition"
          >
            <History className="w-4 h-4 text-gray-600" />
            <span>Reminder Logs</span>
          </button>
        </div>
      </div>

      {/* Today's Summary Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => { setActiveTab('today'); setSelectedCalendarDate(null); }}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            activeTab === 'today' ? 'bg-emerald-900 text-white shadow-lg border-emerald-900' : 'bg-white border-gray-200 hover:border-emerald-500'
          }`}
        >
          <div className="text-[10px] font-extrabold uppercase opacity-80">Services Today</div>
          <div className="text-2xl font-black font-mono mt-1">{summary.servicesToday}</div>
        </div>

        <div
          onClick={() => { setActiveTab('overdue'); setSelectedCalendarDate(null); }}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            activeTab === 'overdue' ? 'bg-red-700 text-white shadow-lg border-red-700' : 'bg-white border-gray-200 hover:border-red-500'
          }`}
        >
          <div className="text-[10px] font-extrabold uppercase opacity-80">Overdue Services</div>
          <div className="text-2xl font-black font-mono mt-1">{summary.overdueServices}</div>
        </div>

        <div
          onClick={() => { setActiveTab('upcoming'); setSelectedCalendarDate(null); }}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            activeTab === 'upcoming' ? 'bg-blue-900 text-white shadow-lg border-blue-900' : 'bg-white border-gray-200 hover:border-blue-500'
          }`}
        >
          <div className="text-[10px] font-extrabold uppercase opacity-80">Upcoming Services</div>
          <div className="text-2xl font-black font-mono mt-1">{summary.upcomingServices}</div>
        </div>

        <div
          onClick={() => { setActiveTab('assigned'); setSelectedCalendarDate(null); }}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            activeTab === 'assigned' ? 'bg-slate-900 text-white shadow-lg border-slate-900' : 'bg-white border-gray-200 hover:border-slate-500'
          }`}
        >
          <div className="text-[10px] font-extrabold uppercase opacity-80">Assigned Today</div>
          <div className="text-2xl font-black font-mono mt-1">{summary.assigned}</div>
        </div>

        <div
          onClick={() => { setActiveTab('unassigned'); setSelectedCalendarDate(null); }}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            activeTab === 'unassigned' ? 'bg-amber-600 text-white shadow-lg border-amber-600' : 'bg-white border-gray-200 hover:border-amber-500'
          }`}
        >
          <div className="text-[10px] font-extrabold uppercase opacity-80">Unassigned Today</div>
          <div className="text-2xl font-black font-mono mt-1">{summary.unassigned}</div>
        </div>

        <div
          onClick={() => { setActiveTab('completed'); setSelectedCalendarDate(null); }}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            activeTab === 'completed' ? 'bg-emerald-700 text-white shadow-lg border-emerald-700' : 'bg-white border-gray-200 hover:border-emerald-600'
          }`}
        >
          <div className="text-[10px] font-extrabold uppercase opacity-80">Completed Today</div>
          <div className="text-2xl font-black font-mono mt-1">{summary.completedToday}</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto">
          {[
            { id: 'today', label: "Today's Due" },
            { id: 'tomorrow', label: 'Tomorrow' },
            { id: 'this_week', label: 'This Week' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedCalendarDate(null);
              }}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition whitespace-nowrap ${
                activeTab === tab.id && !selectedCalendarDate ? 'bg-emerald-800 text-white shadow' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Technician Filter Dropdown */}
          <select
            value={selectedTechnicianFilter}
            onChange={(e) => setSelectedTechnicianFilter(e.target.value)}
            className="p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800"
          >
            <option value="">All Technicians</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Search Bar */}
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-300 w-64">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer, phone, serial #..."
              className="w-full text-xs outline-none bg-transparent"
            />
          </div>
        </div>
      </div>

      {selectedCalendarDate && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between text-xs text-amber-950 font-semibold">
          <span>
            Calendar Filter Active: Viewing Services Scheduled for <span className="font-mono font-bold text-amber-900">{new Date(selectedCalendarDate).toLocaleDateString('en-IN')}</span>
          </span>
          <button
            onClick={() => setSelectedCalendarDate(null)}
            className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-lg"
          >
            Clear Date Filter
          </button>
        </div>
      )}

      {/* Services List / Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 bg-white rounded-3xl border text-center text-gray-400 font-medium">
            Loading service tasks...
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="p-12 bg-white rounded-3xl border text-center text-gray-400 font-medium">
            No service jobs found matching current filters.
          </div>
        ) : (
          filteredServices.map((srv) => {
            const p = srv.party || {};
            const m = srv.machine || {};
            const item = m.machineItem || {};
            const tech = srv.assignedTechnician;
            const isWarrantyActive = m.warrantyEnd && new Date(m.warrantyEnd) > new Date();

            return (
              <div
                key={srv.id}
                className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition space-y-4"
              >
                {/* Top Bar: Service No & Status */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold font-mono text-sm text-emerald-900 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                      {srv.serviceNo}
                    </span>
                    <span className="text-xs font-bold text-gray-500 font-mono">
                      Due: {new Date(srv.serviceDueDate).toLocaleDateString('en-IN')}
                    </span>
                    {isWarrantyActive ? (
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 font-extrabold text-[10px] rounded-md flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-700" /> ACTIVE WARRANTY
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 font-extrabold text-[10px] rounded-md flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-gray-400" /> WARRANTY EXPIRED
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                      srv.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                      srv.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' :
                      srv.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {srv.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Main Content Grid: Customer & Machine */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                  {/* Customer / Farmer Info */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Customer / Farmer Details</div>
                    {srv.farmer ? (
                      <>
                        <div className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                          <span>👨‍🌾 {srv.farmer.name}</span>
                          <span className="text-[10px] text-gray-500 font-normal">(under {p.name})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <Phone className="w-3.5 h-3.5 text-emerald-700" />
                          <a href={`tel:${srv.farmer.mobile}`} className="font-mono font-bold text-emerald-900 hover:underline">
                            {srv.farmer.mobile}
                          </a>
                        </div>
                        <div className="flex items-start gap-1.5 text-gray-600 pt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                          <span>{[srv.farmer.address || srv.farmer.village, srv.farmer.district, srv.farmer.state].filter(Boolean).join(', ')}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-extrabold text-sm text-gray-900">{p.name || 'N/A'}</div>
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <Phone className="w-3.5 h-3.5 text-emerald-700" />
                          <a href={`tel:${p.mobile}`} className="font-mono font-bold text-emerald-900 hover:underline">
                            {p.mobile}
                          </a>
                        </div>
                        <div className="flex items-start gap-1.5 text-gray-600 pt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                          <span>{[p.address, p.village, p.district].filter(Boolean).join(', ') || 'No address'}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Machine Info */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Machine & Interval</div>
                    <div className="font-bold text-gray-900">{m.model || item.name || 'Equipment'}</div>
                    <div className="font-mono text-gray-600">S/N: <span className="font-bold text-gray-900">{srv.serialNumber}</span></div>
                    <div className="text-gray-500">
                      Purchased: {m.saleDate ? new Date(m.saleDate).toLocaleDateString('en-IN') : 'N/A'}
                    </div>
                    <div className="text-gray-500 font-semibold">
                      Interval: {m.serviceIntervalValue || 3} {m.serviceIntervalUnit || 'MONTHS'}
                    </div>
                  </div>

                  {/* Technician & History */}
                  <div className="space-y-1 font-mono bg-gray-50 p-3 rounded-2xl border border-gray-200">
                    <div className="text-[10px] font-extrabold uppercase text-gray-500 font-sans">Assigned Technician</div>
                    <div className="font-bold text-gray-900 font-sans text-xs">
                      {tech ? `${tech.name} (${tech.mobile || 'No Phone'})` : '⚠️ Unassigned'}
                    </div>
                    <div className="text-[11px] text-gray-600 pt-1 font-sans">
                      Last Service: {m.lastServiceDate ? new Date(m.lastServiceDate).toLocaleDateString('en-IN') : 'None'}
                    </div>
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100 text-xs">
                  <div className="flex flex-wrap gap-2">
                    {/* Call Customer */}
                    <a
                      href={`tel:${p.mobile}`}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl flex items-center gap-1 transition"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>

                    {/* WhatsApp Customer */}
                    <button
                      onClick={() => setWhatsAppCustomerService(srv)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1 shadow-sm transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Customer
                    </button>

                    {/* Assign Technician */}
                    <button
                      onClick={() => setAssigningServiceIds([srv.id])}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold rounded-xl flex items-center gap-1 transition"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-blue-700" /> Assign Technician
                    </button>

                    {/* WhatsApp Technician */}
                    {tech && (
                      <button
                        onClick={() => setShowTechDispatchModal(true)}
                        className="px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl flex items-center gap-1 shadow-sm transition"
                      >
                        <Wrench className="w-3.5 h-3.5" /> WhatsApp Technician
                      </button>
                    )}

                    {/* Open Google Maps */}
                    <a
                      href={getGoogleMapsUrl(p)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl flex items-center gap-1 transition"
                    >
                      <MapPin className="w-3.5 h-3.5 text-red-600" /> Open Map <ExternalLink className="w-3 h-3 text-gray-400" />
                    </a>
                  </div>

                  {/* Complete Service Action */}
                  {srv.status !== 'COMPLETED' && (
                    <button
                      onClick={() => setCompletingService(srv)}
                      className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl shadow-md flex items-center gap-1.5 transition ml-auto"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Complete Service
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Completion Modal */}
      {completingService && (
        <ServiceCompletionModal
          service={completingService}
          onCompleted={handleCompleted}
          onClose={() => setCompletingService(null)}
        />
      )}

      {/* Assign Technician Modal */}
      {assigningServiceIds && (
        <AssignTechnicianModal
          serviceIds={assigningServiceIds}
          onAssigned={handleAssigned}
          onClose={() => setAssigningServiceIds(null)}
        />
      )}

      {/* WhatsApp Customer Modal */}
      {whatsAppCustomerService && (
        <WhatsAppCustomerModal
          service={whatsAppCustomerService}
          onClose={() => setWhatsAppCustomerService(null)}
        />
      )}

      {/* Technician Dispatch Modal */}
      {showTechDispatchModal && (
        <WhatsAppTechnicianDispatchModal
          technicians={technicians}
          onClose={() => setShowTechDispatchModal(false)}
        />
      )}

      {/* Bulk Remind Progress Modal */}
      {showBulkRemindModal && (
        <BulkReminderProgressModal
          todayCount={summary.servicesToday}
          onFinished={() => {
            loadSummary();
            loadServices();
          }}
          onClose={() => setShowBulkRemindModal(false)}
        />
      )}

      {/* Reminder Logs Modal */}
      {showReminderLogs && (
        <ReminderLogModal onClose={() => setShowReminderLogs(false)} />
      )}

      {/* Calendar View Modal */}
      {showCalendarModal && (
        <ServiceCalendarModal
          services={services}
          onSelectDate={(dateStr) => {
            setSelectedCalendarDate(dateStr);
            loadServices();
          }}
          onClose={() => setShowCalendarModal(false)}
        />
      )}

    </div>
  );
};
