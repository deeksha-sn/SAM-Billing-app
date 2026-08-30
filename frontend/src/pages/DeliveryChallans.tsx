import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { Truck, Plus, Printer, X } from 'lucide-react';
import { QuickAddPartyModal } from '../components/QuickAddPartyModal';
import { useNavigate } from 'react-router-dom';

export const DeliveryChallans: React.FC = () => {
  const navigate = useNavigate();
  const [challans, setChallans] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [stockSetting, setStockSetting] = useState('YES');

  // Form
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [reason, setReason] = useState('Delivery against sale');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [transporter, setTransporter] = useState('');
  const [lines, setLines] = useState<any[]>([{ itemId: '', quantity: 1 }]);

  useEffect(() => {
    loadChallans();
    loadMasters();
  }, []);

  const loadChallans = async () => {
    try {
      const res = await apiRequest('/delivery-challans');
      setChallans(res.challans);
      const sRes = await apiRequest('/settings/system');
      setStockSetting(sRes.settings?.delivery_challan_affects_stock || 'YES');
    } catch (err) {
      console.error(err);
    }
  };

  const loadMasters = async () => {
    try {
      const pRes = await apiRequest('/parties?type=CUSTOMER');
      setCustomers(pRes.parties);
      const iRes = await apiRequest('/items');
      setItemsList(iRes.items);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert('Select customer');
      return;
    }

    try {
      const res = await apiRequest('/delivery-challans', {
        method: 'POST',
        body: JSON.stringify({
          partyId: selectedCustomerId,
          reason,
          vehicleNumber,
          transporter,
          items: lines.map((l) => {
            const itemObj = itemsList.find((i) => i.id === l.itemId);
            return {
              itemId: l.itemId,
              itemName: itemObj?.name || 'Item',
              unit: itemObj?.unit || 'Nos',
              quantity: Number(l.quantity),
            };
          }),
        }),
      });

      alert(`Delivery Challan ${res.challan.challanNumber} created!`);
      setShowCreateModal(false);
      loadChallans();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Challans</h1>
          <p className="text-sm text-gray-500">
            Stock Deduction Status: <span className={`font-bold px-2 py-0.5 rounded text-xs ${stockSetting === 'YES' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
              {stockSetting === 'YES' ? 'ON (DC Deducts Stock)' : 'OFF (Invoice Deducts Stock)'}
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-md transition"
        >
          <Plus className="w-5 h-5" />
          <span>+ Create Delivery Challan</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b text-gray-700 font-bold uppercase text-xs">
            <tr>
              <th className="p-4">Challan #</th>
              <th className="p-4">Date</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Reason</th>
              <th className="p-4">Vehicle #</th>
              <th className="p-4">Stock Impact</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {challans.map((dc) => (
              <tr key={dc.id} className="hover:bg-gray-50">
                <td className="p-4 font-bold font-mono text-blue-800">{dc.challanNumber}</td>
                <td className="p-4 text-gray-600">{new Date(dc.challanDate).toLocaleDateString('en-IN')}</td>
                <td className="p-4 font-semibold text-gray-900">{dc.party?.name}</td>
                <td className="p-4 text-gray-700">{dc.reason}</td>
                <td className="p-4 font-mono text-gray-700">{dc.vehicleNumber || 'N/A'}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded ${dc.stockDeducted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                    {dc.stockDeducted ? 'Stock Deducted' : 'No Stock Impact'}
                  </span>
                </td>
                <td className="p-4">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
                    {dc.status}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  {dc.status !== 'CONVERTED_TO_INVOICE' && (
                    <button
                      onClick={() => navigate(`/sales?create=true&dcId=${dc.id}`)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow"
                    >
                      Convert to Invoice
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE DC MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6">
            <div className="flex justify-between items-center pb-4 border-b mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Truck className="w-6 h-6 text-blue-600" />
                <span>Create Delivery Challan</span>
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-700 uppercase">Customer *</label>
                    <button type="button" onClick={() => setShowQuickCustomer(true)} className="text-xs font-bold text-emerald-600 hover:underline">
                      + Quick Add
                    </button>
                  </div>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required
                    className="w-full p-2.5 border rounded-xl text-sm font-semibold"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Reason for Transport</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-sm font-semibold"
                  >
                    <option value="Delivery against sale">Delivery against sale</option>
                    <option value="Service">Service</option>
                    <option value="Repair">Repair</option>
                    <option value="Replacement">Replacement</option>
                    <option value="Demonstration">Demonstration</option>
                    <option value="Job work">Job work</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    placeholder="KA-27-M-1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Transporter Name</label>
                  <input
                    type="text"
                    placeholder="e.g. VRL Logistics"
                    value={transporter}
                    onChange={(e) => setTransporter(e.target.value)}
                    className="w-full p-2.5 border rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2 border-t pt-3">
                <label className="block text-xs font-bold text-gray-700 uppercase">Items to Deliver</label>
                {lines.map((l, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <select
                      value={l.itemId}
                      onChange={(e) => {
                        const updated = [...lines];
                        updated[idx].itemId = e.target.value;
                        setLines(updated);
                      }}
                      className="flex-1 p-2 border rounded-xl text-sm font-semibold"
                    >
                      <option value="">Select Item...</option>
                      {itemsList.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.sku}) - Stock: {i.currentStock}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={l.quantity}
                      onChange={(e) => {
                        const updated = [...lines];
                        updated[idx].quantity = e.target.value;
                        setLines(updated);
                      }}
                      className="w-24 p-2 border rounded-xl text-sm font-bold text-center"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setLines([...lines, { itemId: '', quantity: 1 }])}
                  className="text-xs font-bold text-emerald-600 hover:underline"
                >
                  + Add Item
                </button>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 font-semibold text-xs">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow">
                  Create Delivery Challan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQuickCustomer && (
        <QuickAddPartyModal
          type="CUSTOMER"
          onClose={() => setShowQuickCustomer(false)}
          onSuccess={(nc) => {
            setCustomers([...customers, nc]);
            setSelectedCustomerId(nc.id);
            setShowQuickCustomer(false);
          }}
        />
      )}
    </div>
  );
};
