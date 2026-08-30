import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { DollarSign, Plus, X } from 'lucide-react';

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [category, setCategory] = useState('Office');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const res = await apiRequest('/expenses');
      setExpenses(res.expenses);
      setTotalAmount(res.totalAmount);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) {
      alert('Description and amount are required');
      return;
    }

    try {
      await apiRequest('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category,
          description,
          amount: Number(amount),
          paymentMode,
        }),
      });

      alert('Expense recorded successfully!');
      setShowCreateModal(false);
      loadExpenses();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
          <p className="text-sm text-gray-500">Track Operating Expenses (Total: ₹{totalAmount.toLocaleString('en-IN')})</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 shadow-md transition"
        >
          <Plus className="w-5 h-5" />
          <span>+ Record Expense</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b text-gray-700 font-bold uppercase text-xs">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Category</th>
              <th className="p-4">Description</th>
              <th className="p-4">Payment Mode</th>
              <th className="p-4 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {expenses.map((exp) => (
              <tr key={exp.id} className="hover:bg-gray-50">
                <td className="p-4 text-gray-600 text-xs">{new Date(exp.date).toLocaleDateString('en-IN')}</td>
                <td className="p-4">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800">
                    {exp.category}
                  </span>
                </td>
                <td className="p-4 font-semibold text-gray-900">{exp.description}</td>
                <td className="p-4 text-gray-600">{exp.paymentMode}</td>
                <td className="p-4 text-right font-mono font-bold text-rose-700">₹{exp.amount.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center pb-4 border-b mb-4">
              <h2 className="text-lg font-bold text-gray-900">Record New Expense</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white font-semibold">
                  <option value="Fuel">Fuel</option>
                  <option value="Transport">Transport</option>
                  <option value="Salary">Salary</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Rent">Rent</option>
                  <option value="Repair">Repair</option>
                  <option value="Office">Office</option>
                  <option value="Travel">Travel</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diesel for service vehicle"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2.5 border rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Payment Mode</label>
                <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white font-semibold">
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 font-semibold text-xs">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl shadow">
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
