import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { DollarSign, TrendingUp, ShoppingCart, Calculator } from 'lucide-react';

export const Accounting: React.FC = () => {
  const [pnl, setPnl] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/reports/pnl')
      .then((res) => setPnl(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading Financial P&L...</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Connected Business Accounting</h1>
        <p className="text-sm text-gray-500">Real-time Profit & Loss Summary and Material Cost Analysis</p>
      </div>

      {/* P&L Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Sales Turnover</span>
          <p className="text-3xl font-black text-emerald-800 font-mono mt-2">₹{(pnl?.sales || 0).toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Raw Material Purchases</span>
          <p className="text-3xl font-black text-purple-800 font-mono mt-2">₹{(pnl?.purchases || 0).toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Operating Expenses</span>
          <p className="text-3xl font-black text-rose-700 font-mono mt-2">₹{(pnl?.expenses || 0).toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* BOM Gross Profit Analysis Card */}
      <div className="bg-gradient-to-br from-slate-900 to-emerald-950 p-6 rounded-3xl text-white shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <span>Manufacturing BOM Costing & Gross Profit</span>
          </h2>
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-bold text-xs rounded-full border border-emerald-500/30">
            ESTIMATED GROSS PROFIT
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-xs text-slate-400">Total Material Cost (BOM Component Breakdown):</p>
            <p className="text-2xl font-black font-mono text-amber-400 mt-1">₹{(pnl?.bomMaterialCost || 0).toLocaleString('en-IN')}</p>
            <p className="text-xs text-slate-400 mt-2">
              Calculated based on component purchase prices for all finished machines sold.
            </p>
          </div>

          <div className="text-right border-l border-slate-800 pl-6">
            <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">ESTIMATED GROSS PROFIT:</p>
            <p className="text-4xl font-black font-mono text-emerald-400 mt-1">
              ₹{(pnl?.estimatedGrossProfit || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              (Sales Turnover minus BOM Material Cost)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
