import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { BarChart3, Download, Printer, FileSpreadsheet, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'GST' | 'SALES' | 'STOCK' | 'LEDGER'>('GST');
  const [gstData, setGstData] = useState<any>(null);
  const [parties, setParties] = useState<any[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'GST') loadGSTReport();
    if (activeTab === 'LEDGER') loadParties();
  }, [activeTab]);

  const loadGSTReport = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/reports/gst');
      setGstData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadParties = async () => {
    try {
      const res = await apiRequest('/parties');
      setParties(res.parties);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFetchLedger = async (partyId: string) => {
    setSelectedPartyId(partyId);
    if (!partyId) return;
    setLoading(true);
    try {
      const res = await apiRequest(`/reports/party-ledger/${partyId}`);
      setLedgerData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = (tableData: any[], filename: string) => {
    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dedicated Reports Hub</h1>
          <p className="text-sm text-gray-500">GST GSTR-1/3B Summaries, HSN Breakdowns, Party Ledgers & Excel Exports</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-200 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('GST')}
          className={`px-5 py-2 rounded-lg font-bold text-xs transition ${activeTab === 'GST' ? 'bg-white text-emerald-800 shadow' : 'text-gray-600'}`}
        >
          GST Reports & HSN Summary
        </button>
        <button
          onClick={() => setActiveTab('LEDGER')}
          className={`px-5 py-2 rounded-lg font-bold text-xs transition ${activeTab === 'LEDGER' ? 'bg-white text-blue-800 shadow' : 'text-gray-600'}`}
        >
          Party Account Ledgers
        </button>
      </div>

      {/* GST REPORT TAB */}
      {activeTab === 'GST' && gstData && (
        <div className="space-y-6">
          {/* GST Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sales GST */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-2">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-bold text-gray-900 text-sm">Output GST (Sales Invoices)</h3>
                <button
                  onClick={() => exportToExcel([gstData.salesGST], 'Sales_GST_Summary')}
                  className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p>Taxable Value: <span className="font-mono font-bold">₹{gstData.salesGST?.taxable.toLocaleString('en-IN')}</span></p>
                <p>Total GST Collected: <span className="font-mono font-bold text-emerald-700">₹{gstData.salesGST?.totalTax.toLocaleString('en-IN')}</span></p>
                <p>CGST: <span className="font-mono">₹{gstData.salesGST?.cgst.toLocaleString('en-IN')}</span></p>
                <p>SGST: <span className="font-mono">₹{gstData.salesGST?.sgst.toLocaleString('en-IN')}</span></p>
                <p>IGST: <span className="font-mono">₹{gstData.salesGST?.igst.toLocaleString('en-IN')}</span></p>
              </div>
            </div>

            {/* Purchase GST */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-2">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-bold text-gray-900 text-sm">Input Tax Credit (Purchases)</h3>
                <button
                  onClick={() => exportToExcel([gstData.purchaseGST], 'Purchase_GST_Summary')}
                  className="text-xs text-purple-600 font-bold hover:underline flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p>Taxable Value: <span className="font-mono font-bold">₹{gstData.purchaseGST?.taxable.toLocaleString('en-IN')}</span></p>
                <p>Input Tax Paid: <span className="font-mono font-bold text-purple-700">₹{gstData.purchaseGST?.totalTax.toLocaleString('en-IN')}</span></p>
                <p>CGST: <span className="font-mono">₹{gstData.purchaseGST?.cgst.toLocaleString('en-IN')}</span></p>
                <p>SGST: <span className="font-mono">₹{gstData.purchaseGST?.sgst.toLocaleString('en-IN')}</span></p>
                <p>IGST: <span className="font-mono">₹{gstData.purchaseGST?.igst.toLocaleString('en-IN')}</span></p>
              </div>
            </div>
          </div>

          {/* HSN Summary Table */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900">HSN/SAC Sales Summary Table</h3>
              <button
                onClick={() => exportToExcel(gstData.hsnSummary || [], 'HSN_Summary_Report')}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 flex items-center gap-1"
              >
                <FileSpreadsheet className="w-4 h-4" /> Download HSN Excel
              </button>
            </div>

            <table className="w-full text-left text-xs border">
              <thead className="bg-gray-100 border-b font-bold">
                <tr>
                  <th className="p-3 border">HSN/SAC</th>
                  <th className="p-3 border">Item Description</th>
                  <th className="p-3 border text-right">Total Qty</th>
                  <th className="p-3 border text-right">Taxable Value (₹)</th>
                  <th className="p-3 border text-right">CGST (₹)</th>
                  <th className="p-3 border text-right">SGST (₹)</th>
                  <th className="p-3 border text-right">Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {gstData.hsnSummary?.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50 border-b">
                    <td className="p-3 border font-mono font-bold">{row.hsnSac}</td>
                    <td className="p-3 border font-semibold">{row.description}</td>
                    <td className="p-3 border text-right font-mono">{row.totalQty}</td>
                    <td className="p-3 border text-right font-mono">{row.taxableValue.toFixed(2)}</td>
                    <td className="p-3 border text-right font-mono">{row.cgstAmount.toFixed(2)}</td>
                    <td className="p-3 border text-right font-mono">{row.sgstAmount.toFixed(2)}</td>
                    <td className="p-3 border text-right font-mono font-bold">{row.totalAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PARTY LEDGER TAB */}
      {activeTab === 'LEDGER' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <label className="text-xs font-bold text-gray-700 uppercase">Select Party / Customer:</label>
            <select
              value={selectedPartyId}
              onChange={(e) => handleFetchLedger(e.target.value)}
              className="p-2.5 bg-gray-50 border rounded-xl font-semibold text-sm w-72"
            >
              <option value="">-- Select Customer or Supplier --</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.mobile})
                </option>
              ))}
            </select>
            {ledgerData && (
              <button
                onClick={() => exportToExcel(ledgerData.ledger || [], `${ledgerData.party?.name}_Ledger`)}
                className="px-3 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1 ml-auto"
              >
                <FileSpreadsheet className="w-4 h-4" /> Export Ledger Excel
              </button>
            )}
          </div>

          {ledgerData && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="font-bold text-lg text-gray-900 mb-4">{ledgerData.party?.name} - Statement of Account</h3>
              <table className="w-full text-left text-xs border">
                <thead className="bg-gray-100 border-b font-bold">
                  <tr>
                    <th className="p-3 border">Date</th>
                    <th className="p-3 border">Particulars</th>
                    <th className="p-3 border">Reference</th>
                    <th className="p-3 border text-right text-emerald-800">Debit (₹)</th>
                    <th className="p-3 border text-right text-red-800">Credit (₹)</th>
                    <th className="p-3 border text-right">Running Balance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerData.ledger?.map((row: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 border-b">
                      <td className="p-3 border text-gray-600">{new Date(row.date).toLocaleDateString('en-IN')}</td>
                      <td className="p-3 border font-semibold">{row.particulars}</td>
                      <td className="p-3 border font-mono">{row.reference}</td>
                      <td className="p-3 border text-right font-mono text-emerald-700 font-bold">{row.debit > 0 ? row.debit.toFixed(2) : '-'}</td>
                      <td className="p-3 border text-right font-mono text-red-600 font-bold">{row.credit > 0 ? row.credit.toFixed(2) : '-'}</td>
                      <td className="p-3 border text-right font-mono font-black">{row.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
