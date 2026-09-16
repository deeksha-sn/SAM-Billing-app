import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Truck } from 'lucide-react';
import { apiRequest } from '../api';
import { SearchablePartyCombobox } from './SearchablePartyCombobox';
import { BillingItemSelect } from './BillingItemSelect';

interface ChallanEditorModalProps {
  challan?: any;
  onSaved: (challan: any) => void;
  onClose: () => void;
}

export const ChallanEditorModal: React.FC<ChallanEditorModalProps> = ({
  challan,
  onSaved,
  onClose,
}) => {
  const isEditing = Boolean(challan?.id);
  const [challanNumber, setChallanNumber] = useState(challan?.challanNumber || '');
  const [partyId, setPartyId] = useState(challan?.partyId || '');
  const [challanDate, setChallanDate] = useState(
    challan?.challanDate
      ? new Date(challan.challanDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [deliveryAddress, setDeliveryAddress] = useState(challan?.deliveryAddress || '');
  const [contactNumber, setContactNumber] = useState(challan?.contactNumber || '');
  const [vehicleNumber, setVehicleNumber] = useState(challan?.vehicleNumber || '');
  const [transporter, setTransporter] = useState(challan?.transporter || '');
  const [reason, setReason] = useState(challan?.reason || 'Delivery against sale');
  const [refOrderNo, setRefOrderNo] = useState(challan?.refOrderNo || '');
  const [notes, setNotes] = useState(challan?.notes || '');

  const [customers, setCustomers] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<any[]>(
    challan?.items?.length > 0
      ? challan.items.map((i: any) => ({
          itemId: i.itemId,
          itemName: i.itemName,
          unit: i.unit || 'Nos',
          quantity: i.quantity,
        }))
      : [{ itemId: '', itemName: '', unit: 'Nos', quantity: 1 }]
  );

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [custRes, itemsRes] = await Promise.all([
        apiRequest('/parties?active=true'),
        apiRequest('/items'),
      ]);
      setCustomers(custRes.parties || []);
      setItemsList(itemsRes.items || []);
    } catch (err) {
      console.error('Failed to load challan data:', err);
    }
  };

  const handlePartyChange = (id: string) => {
    setPartyId(id);
    const selected = customers.find((c) => c.id === id);
    if (selected) {
      setDeliveryAddress(selected.address || `${selected.village || ''}, ${selected.district || ''}`);
      setContactNumber(selected.mobile || '');
    }
  };

  const handleAddItemRow = () => {
    setLineItems([...lineItems, { itemId: '', itemName: '', unit: 'Nos', quantity: 1 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, itemId: string) => {
    const selected = itemsList.find((i) => i.id === itemId);
    const updated = [...lineItems];
    if (selected) {
      updated[index] = {
        ...updated[index],
        itemId: selected.id,
        itemName: selected.name,
        unit: selected.unit || 'Nos',
      };
    } else {
      updated[index].itemId = itemId;
    }
    setLineItems(updated);
  };

  const handleLineQtyChange = (index: number, qty: number) => {
    const updated = [...lineItems];
    updated[index].quantity = Number(qty) || 1;
    setLineItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId) {
      setErrorMsg('Please select a Customer');
      return;
    }
    if (lineItems.some((i) => !i.itemId)) {
      setErrorMsg('Please select an item for all item rows');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const payload = {
      challanNumber,
      partyId,
      challanDate,
      deliveryAddress,
      contactNumber,
      vehicleNumber,
      transporter,
      reason,
      refOrderNo,
      items: lineItems,
      notes,
    };

    try {
      let res;
      if (isEditing) {
        res = await apiRequest(`/delivery-challans/${challan.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiRequest('/delivery-challans', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      onSaved(res.challan);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save Delivery Challan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full my-6 overflow-hidden flex flex-col border border-gray-100 max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold">
                {isEditing ? `Edit Delivery Challan: ${challan.challanNumber}` : 'Create New Delivery Challan'}
              </h2>
              <p className="text-xs text-slate-400 font-medium">Material Issue & Transport Challan</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 font-semibold rounded-xl text-xs">
              {errorMsg}
            </div>
          )}

          {/* Customer & Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <div>
              <SearchablePartyCombobox
                label="Customer"
                required={true}
                partyType="CUSTOMER"
                selectedPartyId={partyId}
                parties={customers}
                onSelectParty={(p) => {
                  if (p) {
                    handlePartyChange(p.id);
                  } else {
                    setPartyId('');
                  }
                }}
                onPartyCreated={(newP) => {
                  setCustomers([...customers, newP]);
                  handlePartyChange(newP.id);
                }}
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Challan Date</label>
              <input
                type="date"
                value={challanDate}
                onChange={(e) => setChallanDate(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Contact Mobile</label>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="Customer Contact No."
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-medium"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-gray-700 mb-1">Delivery Address</label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Delivery destination address"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Vehicle Number</label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. KA-27-M-1234"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-medium uppercase"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Transporter</label>
              <input
                type="text"
                value={transporter}
                onChange={(e) => setTransporter(e.target.value)}
                placeholder="Transport Company Name"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Reason for Dispatch</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Sale, Demo, Repair, Job Work"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Ref Order / PO No.</label>
              <input
                type="text"
                value={refOrderNo}
                onChange={(e) => setRefOrderNo(e.target.value)}
                placeholder="Reference PO No."
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-medium"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-extrabold text-gray-900 text-sm">Challan Items</h3>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg flex items-center gap-1 transition"
              >
                <Plus className="w-4 h-4" /> Add Item Row
              </button>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 text-gray-700 font-extrabold uppercase text-[10px] tracking-wider border-b">
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">Item Description</th>
                    <th className="p-3 w-28 text-center">Unit</th>
                    <th className="p-3 w-32 text-center">Quantity</th>
                    <th className="p-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {lineItems.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="p-3 text-center text-gray-400 font-bold">{idx + 1}</td>
                      <td className="p-2">
                        <BillingItemSelect
                          value={row.itemId}
                          onChange={(itemId) => handleItemChange(idx, itemId)}
                          items={itemsList}
                          documentType="DELIVERY_CHALLAN"
                          className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold"
                        />
                      </td>
                      <td className="p-2 text-center font-bold text-gray-600">
                        {row.unit || 'Nos'}
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) => handleLineQtyChange(idx, Number(e.target.value))}
                          className="w-full p-2 bg-white border border-gray-300 rounded-lg text-center font-bold"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Challan Notes & Instructions</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special delivery instructions, driver details..."
              className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Delivery Challan'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
