import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import {
  TrendingUp,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Wrench,
  Package,
  Users,
  ArrowUpRight,
  Calendar,
  Filter,
  Bell,
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  UserCheck,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [reminderData, setReminderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Date Filter State
  const [period, setPeriod] = useState<string>('THIS_YEAR');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchDashboardData = (selectedPeriod: string, customStart?: string, customEnd?: string) => {
    setLoading(true);
    let query = `/reports/dashboard?period=${selectedPeriod}`;
    if (selectedPeriod === 'CUSTOM' && customStart && customEnd) {
      query += `&startDate=${customStart}&endDate=${customEnd}`;
    }
    apiRequest(query)
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const fetchReminderSummary = () => {
    apiRequest('/services/reminders/summary')
      .then((res) => setReminderData(res))
      .catch((err) => console.error('Failed to fetch reminder summary on dashboard:', err));
  };

  useEffect(() => {
    fetchDashboardData(period, startDate, endDate);
    fetchReminderSummary();
  }, [period]);

  const getWhatsAppUrl = (item: any) => {
    const phone = (item.phone || item.party?.mobile || item.farmer?.mobile || '').replace(/\D/g, '');
    if (!phone) return '#';
    const formattedPhone = phone.length === 10 ? '91' + phone : phone;

    const name = item.farmerName || item.customerName || item.party?.name || 'Customer';
    const machineName = item.machine?.model || item.machineName || 'Equipment';
    const dueDate = item.formattedDueDate || (item.serviceDueDate ? new Date(item.serviceDueDate).toLocaleDateString('en-IN') : 'Today');
    const pincode = item.pincode || item.farmer?.pincode || item.party?.pincode || 'N/A';
    const address = item.fullAddress || 'Karnataka';

    const msg = `Hello ${name},\n\nThis is a service reminder from Smart Agro Machinerys.\n\nMachine: ${machineName} (Serial No: ${item.serialNumber || 'N/A'})\nScheduled Date: ${dueDate}\nLocation: ${address} (PIN: ${pincode})\n\nPlease contact us to confirm your service appointment.\n\nThank you,\nSmart Agro Machinerys`;

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  };

  const handleApplyCustomFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate && endDate) {
      fetchDashboardData('CUSTOM', startDate, endDate);
    }
  };

  const s = data?.summary || {};
  const activePeriod = data?.period || period;

  const getSalesLabel = () => {
    switch (activePeriod) {
      case 'TODAY': return "Today's Sales";
      case 'THIS_WEEK': return "This Week's Sales";
      case 'THIS_MONTH': return "This Month's Sales";
      case 'THIS_YEAR': return `${data?.fyLabel || 'FY 2026-27'} Sales`;
      default: return "Period Sales";
    }
  };

  const getPurchasesLabel = () => {
    switch (activePeriod) {
      case 'TODAY': return "Today's Purchases";
      case 'THIS_WEEK': return "This Week's Purchases";
      case 'THIS_MONTH': return "This Month's Purchases";
      case 'THIS_YEAR': return `${data?.fyLabel || 'FY 2026-27'} Purchases`;
      default: return "Period Purchases";
    }
  };

  const getCollectionsLabel = () => {
    switch (activePeriod) {
      case 'TODAY': return "Collections Today";
      case 'THIS_WEEK': return "Collections This Week";
      case 'THIS_MONTH': return "Collections This Month";
      case 'THIS_YEAR': return `${data?.fyLabel || 'FY 2026-27'} Collections`;
      default: return "Period Collections";
    }
  };

  const getExpensesLabel = () => {
    switch (activePeriod) {
      case 'TODAY': return "Today's Expenses";
      case 'THIS_WEEK': return "This Week's Expenses";
      case 'THIS_MONTH': return "This Month's Expenses";
      case 'THIS_YEAR': return `${data?.fyLabel || 'FY 2026-27'} Expenses`;
      default: return "Period Expenses";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex justify-between items-center bg-gradient-to-r from-emerald-800 to-teal-900 p-6 rounded-2xl text-white shadow-lg">
        <div>
          <h1 className="text-2xl font-black">Smart Agro Machinerys Dashboard</h1>
          <p className="text-emerald-200 text-sm mt-1">Real-time Agro Machinery Business & Service Metrics</p>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <span className="px-3 py-1 bg-emerald-700 text-emerald-100 rounded-full text-xs font-semibold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {data?.fyLabel || 'FY 2026-27'} Active
          </span>
          <span className="text-[11px] text-emerald-300 font-mono">
            {activePeriod === 'THIS_YEAR'
              ? 'April 1, 2026 – March 31, 2027'
              : data?.startDate && data?.endDate
              ? `${new Date(data.startDate).toLocaleDateString('en-IN')} – ${new Date(data.endDate).toLocaleDateString('en-IN')}`
              : ''}
          </span>
        </div>
      </div>

      {/* Global Date Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-emerald-700" />
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Date Filter:</span>
          
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: 'TODAY', label: 'Today' },
              { key: 'THIS_WEEK', label: 'This Week' },
              { key: 'THIS_MONTH', label: 'This Month' },
              { key: 'THIS_YEAR', label: 'This Year (FY 2026-27)' },
              { key: 'CUSTOM', label: 'Custom Range' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setPeriod(item.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                  period === item.key
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {period === 'CUSTOM' && (
          <form onSubmit={handleApplyCustomFilter} className="flex items-center gap-2 shrink-0">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-emerald-500"
              required
            />
            <span className="text-xs text-gray-400 font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:ring-2 focus:ring-emerald-500"
              required
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition"
            >
              Apply
            </button>
          </form>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 font-medium bg-white rounded-2xl border border-gray-200">
          Loading filtered metrics...
        </div>
      ) : (
        <>
          {/* KPI Cards Grid (ALL CLICKABLE) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sales */}
            <div
              onClick={() => navigate('/sales')}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-500 transition cursor-pointer group"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{getSalesLabel()}</span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-gray-900 font-mono">₹{(s.periodSales || s.todaySales || 0).toLocaleString('en-IN')}</p>
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-2">
                View All Invoices <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>

            {/* Purchases */}
            <div
              onClick={() => navigate('/purchases')}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-500 transition cursor-pointer group"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{getPurchasesLabel()}</span>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition">
                  <ShoppingCart className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-gray-900 font-mono">₹{(s.periodPurchases || s.todayPurchases || 0).toLocaleString('en-IN')}</p>
              <span className="text-xs text-purple-600 font-semibold flex items-center gap-1 mt-2">
                View Purchases <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>

            {/* Collections */}
            <div
              onClick={() => navigate('/accounting')}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-500 transition cursor-pointer group"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{getCollectionsLabel()}</span>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-gray-900 font-mono">₹{(s.periodCollections || s.todayCollections || 0).toLocaleString('en-IN')}</p>
              <span className="text-xs text-blue-600 font-semibold flex items-center gap-1 mt-2">
                View Cash Flow <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>

            {/* Expenses */}
            <div
              onClick={() => navigate('/accounting')}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-rose-500 transition cursor-pointer group"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{getExpensesLabel()}</span>
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-gray-900 font-mono">₹{(s.periodExpenses || s.todayExpenses || 0).toLocaleString('en-IN')}</p>
              <span className="text-xs text-rose-600 font-semibold flex items-center gap-1 mt-2">
                View Expenses <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>

            {/* Receivables */}
            <div
              onClick={() => navigate('/reports?tab=receivables')}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-amber-500 transition cursor-pointer group"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Customer Receivables</span>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-amber-700 font-mono">₹{(s.receivables || 0).toLocaleString('en-IN')}</p>
              <span className="text-xs text-amber-600 font-semibold flex items-center gap-1 mt-2">
                View Receivables Report <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>

            {/* Payables */}
            <div
              onClick={() => navigate('/reports?tab=payables')}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-slate-500 transition cursor-pointer group"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Supplier Payables</span>
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-110 transition">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-800 font-mono">₹{(s.payables || 0).toLocaleString('en-IN')}</p>
              <span className="text-xs text-slate-600 font-semibold flex items-center gap-1 mt-2">
                View Payables Report <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>

            {/* Low Stock Warning */}
            <div
              onClick={() => navigate('/inventory')}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-red-500 transition cursor-pointer group"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Low-Stock Items</span>
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-110 transition">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-red-600 font-mono">{s.lowStockCount || 0}</p>
              <span className="text-xs text-red-600 font-semibold flex items-center gap-1 mt-2">
                Reorder Stock <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>

            {/* Services Summary Widget */}
            <div
              onClick={() => navigate('/services')}
              className="bg-emerald-950 p-5 rounded-2xl border border-emerald-900 shadow-md text-white hover:shadow-lg transition cursor-pointer group col-span-1 sm:col-span-2 lg:col-span-4"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-800/80 text-emerald-300 flex items-center justify-center shrink-0">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">TODAY'S SERVICE DISPATCH & REMINDERS</h3>
                    <p className="text-xs text-emerald-300/80 font-medium">Real-Time Machine Service Workload & Technician Dispatch</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-center font-mono">
                  <div className="bg-emerald-900/80 px-3 py-1.5 rounded-xl border border-emerald-800">
                    <div className="text-[10px] text-emerald-300 font-sans uppercase font-bold">Today</div>
                    <div className="text-xl font-black text-white">{s.servicesDueToday || 0}</div>
                  </div>
                  <div className="bg-red-950/80 px-3 py-1.5 rounded-xl border border-red-800">
                    <div className="text-[10px] text-red-300 font-sans uppercase font-bold">Overdue</div>
                    <div className="text-xl font-black text-red-400">{s.overdueServicesCount || 0}</div>
                  </div>
                  <div className="bg-blue-950/80 px-3 py-1.5 rounded-xl border border-blue-800">
                    <div className="text-[10px] text-blue-300 font-sans uppercase font-bold">Upcoming</div>
                    <div className="text-xl font-black text-blue-300">{s.upcomingServicesCount || 0}</div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/services');
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs rounded-xl shadow transition flex items-center gap-1"
                  >
                    <span>View Today's Services</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* TODAY'S REMINDERS DASHBOARD SECTION */}
          <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-amber-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold shadow-sm">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <span>TODAY'S REMINDERS</span>
                    <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 font-extrabold px-2.5 py-0.5 rounded-full font-mono">
                      LIVE DATABASE ENGINE
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">Stage Breakdown: 20-Day, 10-Day, 7-Day, 3-Day, Today & Overdue Reminders</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/services')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <span>Open Full Reminders Dashboard</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {/* LIVE REMINDER COUNTS BAR */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center font-mono">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                <div className="text-[10px] font-extrabold uppercase text-purple-900 font-sans">20 Days</div>
                <div className="text-xl font-black text-purple-900 mt-0.5">{reminderData?.counts?.days20 || 0}</div>
              </div>
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                <div className="text-[10px] font-extrabold uppercase text-indigo-900 font-sans">10 Days</div>
                <div className="text-xl font-black text-indigo-900 mt-0.5">{reminderData?.counts?.days10 || 0}</div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="text-[10px] font-extrabold uppercase text-blue-900 font-sans">7 Days</div>
                <div className="text-xl font-black text-blue-900 mt-0.5">{reminderData?.counts?.days7 || 0}</div>
              </div>
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl">
                <div className="text-[10px] font-extrabold uppercase text-sky-900 font-sans">3 Days</div>
                <div className="text-xl font-black text-sky-900 mt-0.5">{reminderData?.counts?.days3 || 0}</div>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl">
                <div className="text-[10px] font-extrabold uppercase text-emerald-900 font-sans">Today</div>
                <div className="text-xl font-black text-emerald-900 mt-0.5">{reminderData?.counts?.today || 0}</div>
              </div>
              <div className="p-3 bg-red-50 border border-red-300 rounded-xl">
                <div className="text-[10px] font-extrabold uppercase text-red-900 font-sans">Overdue</div>
                <div className="text-xl font-black text-red-700 mt-0.5">{reminderData?.counts?.overdue || 0}</div>
              </div>
            </div>

            {/* LIVE SAMPLE REMINDERS LIST */}
            <div className="space-y-3 pt-2">
              {(() => {
                const sampleItems: any[] = [
                  ...(reminderData?.stages?.todayReminders || []).map((i: any) => ({ ...i, stageBadge: 'TODAY', stageColor: 'bg-emerald-100 text-emerald-900 border-emerald-300' })),
                  ...(reminderData?.stages?.days3 || []).map((i: any) => ({ ...i, stageBadge: '3 DAYS BEFORE', stageColor: 'bg-sky-100 text-sky-900 border-sky-300' })),
                  ...(reminderData?.stages?.days7 || []).map((i: any) => ({ ...i, stageBadge: '7 DAYS BEFORE', stageColor: 'bg-blue-100 text-blue-900 border-blue-300' })),
                  ...(reminderData?.stages?.days10 || []).map((i: any) => ({ ...i, stageBadge: '10 DAYS BEFORE', stageColor: 'bg-indigo-100 text-indigo-900 border-indigo-300' })),
                  ...(reminderData?.stages?.days20 || []).map((i: any) => ({ ...i, stageBadge: '20 DAYS BEFORE', stageColor: 'bg-purple-100 text-purple-900 border-purple-300' })),
                  ...(reminderData?.stages?.overdueReminders || []).map((i: any) => ({ ...i, stageBadge: 'OVERDUE DAILY', stageColor: 'bg-red-100 text-red-900 border-red-300' })),
                ];

                if (sampleItems.length === 0) {
                  return <div className="text-xs text-gray-500 font-medium text-center py-4">No active reminders currently scheduled.</div>;
                }

                return sampleItems.slice(0, 5).map((item, idx) => (
                  <div key={item.id || idx} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-md border ${item.stageColor}`}>
                          {item.stageBadge}
                        </span>
                        <span className="font-black text-gray-900 text-sm">
                          👨‍🌾 {item.farmerName || item.customerName}
                        </span>
                        <span className="font-mono text-gray-500 text-[11px]">
                          ({item.phone})
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 text-gray-600 text-[11px]">
                        <span>📍 {item.fullAddress}</span>
                        <span className="font-mono font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          PIN: {item.pincode || 'N/A'}
                        </span>
                        <span>🚜 Machine: <strong className="text-gray-900">{item.machine?.model || item.machineName || 'Equipment'}</strong> ({item.serialNumber})</span>
                        <span>👨‍🔧 Tech: <strong className="text-gray-900">{item.assignedTechnician?.name || item.technician || 'Unassigned'}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <a
                        href={getWhatsAppUrl(item)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1 shadow-sm transition text-[11px]"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                      </a>
                      <a
                        href={`tel:${item.phone}`}
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-lg flex items-center gap-1 transition text-[11px]"
                      >
                        <Phone className="w-3.5 h-3.5 text-gray-600" /> Call
                      </a>
                      <button
                        onClick={() => navigate('/services')}
                        className="px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-lg flex items-center gap-1 shadow-sm transition text-[11px]"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Assign
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Performance Chart */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {activePeriod === 'THIS_YEAR'
                    ? `Financial Performance (${data?.fyLabel || 'FY 2026-27'} Monthly Breakdown)`
                    : `Financial Performance (${activePeriod} Breakdown)`}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Aggregated Sales, Purchases, Expenses & Net Profit from live database records
                </p>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.monthlyCharts || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN')}`} />
                  <Legend />
                  <Bar dataKey="sales" name="Sales" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="purchases" name="Purchases" fill="#9333ea" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Net Profit" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Grids: Low Stock Warning & Top Selling */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Low Stock Warning Table */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span>Low-Stock Inventory Alerts</span>
                </h3>
                <button onClick={() => navigate('/inventory')} className="text-xs text-emerald-600 font-bold hover:underline">
                  View All
                </button>
              </div>
              {data?.lowStockItems?.length > 0 ? (
                <div className="space-y-3">
                  {data.lowStockItems.map((item: any) => (
                    <div key={item.id} className="p-3 bg-red-50/60 rounded-xl flex justify-between items-center border border-red-100">
                      <div>
                        <p className="font-bold text-sm text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">SKU: <span className="font-mono">{item.sku}</span> | Min Threshold: {item.minStock}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full font-mono">
                          {item.currentStock} {item.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-4 text-center">All inventory stock levels are healthy.</p>
              )}
            </div>

            {/* Top Selling Products */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  <span>Top-Selling Products ({getSalesLabel()})</span>
                </h3>
                <button onClick={() => navigate('/reports?tab=sales')} className="text-xs text-emerald-600 font-bold hover:underline">
                  Sales Reports
                </button>
              </div>
              {data?.topItems?.length > 0 ? (
                <div className="space-y-3">
                  {data.topItems.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-xl flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-sm text-gray-900">{item.itemName}</p>
                          <p className="text-xs text-gray-500">Sold: {item._sum.quantity} units</p>
                        </div>
                      </div>
                      <p className="font-bold font-mono text-sm text-gray-900">₹{(item._sum.totalAmount || 0).toLocaleString('en-IN')}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-4 text-center">No sales recorded for this period.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
