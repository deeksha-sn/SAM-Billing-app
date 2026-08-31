import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Plus, Trash2, Wrench, Calendar, Sparkles } from 'lucide-react';
import { apiRequest } from '../api';

interface ServiceCompletionModalProps {
  service: any;
  onCompleted: (result: any) => void;
  onClose: () => void;
}

export const ServiceCompletionModal: React.FC<ServiceCompletionModalProps> = ({
  service,
  onCompleted,
  onClose,
}) => {
  const [workPerformed, setWorkPerformed] = useState('Routine Service & Inspection Completed');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [customerFeedback, setCustomerFeedback] = useState('Satisfied');
  const [serviceCharge, setServiceCharge] = useState<number>(0);

  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [usedParts, setUsedParts] = useState<{ itemId: string; quantity: number; rate: number }[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await apiRequest('/items');
      setAvailableItems(res.items || []);
    } catch (err) {
      console.error('Failed to load parts items:', err);
    }
  };

  const handleAddPartRow = () => {
    setUsedParts([...usedParts, { itemId: '', quantity: 1, rate: 0 }]);
  };

  const handleRemovePartRow = (index: number) => {
    setUsedParts(usedParts.filter((_, i) => i !== index));
  };

  const handlePartChange = (index: number, itemId: string) => {
    const selected = availableItems.find((i) => i.id === itemId);
    const updated = [...usedParts];
    if (selected) {
      updated[index] = {
        itemId: selected.id,
        quantity: updated[index].quantity || 1,
        rate: selected.sellingPrice || 0,
      };
    } else {
      updated[index].itemId = itemId;
    }
    setUsedParts(updated);
  };

  const handlePartFieldChange = (index: number, field: string, value: any) => {
    const updated = [...usedParts];
    updated[index] = { ...updated[index], [field]: Number(value) || 0 };
    setUsedParts(updated);
  };

  // Calculate totals
  const partsTotal = usedParts.reduce((sum, p) => sum + (p.quantity || 0) * (p.rate || 0), 0);
  const grandTotal = Math.round((Number(serviceCharge) || 0) + partsTotal);

  // Next service calculation preview
  const machine = service.machine || {};
  const intervalVal = machine.serviceIntervalValue || 3;
  const intervalUnit = machine.serviceIntervalUnit || 'MONTHS';

  const previewNextDate = new Date();
  if (intervalUnit.toUpperCase() === 'DAYS') previewNextDate.setDate(previewNextDate.getDate() + intervalVal);
  else if (intervalUnit.toUpperCase() === 'WEEKS') previewNextDate.setDate(previewNextDate.getDate() + intervalVal * 7);
  else if (intervalUnit.toUpperCase() === 'YEARS') previewNextDate.setFullYear(previewNextDate.getFullYear() + intervalVal);
  else previewNextDate.setMonth(previewNextDate.getMonth() + intervalVal);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const payload = {
      workPerformed,
      technicianNotes,
      customerFeedback,
      serviceCharge: Number(serviceCharge) || 0,
      parts: usedParts.filter((p) => p.itemId),
    };

    try {
      const res = await apiRequest(`/services/${service.id}/complete`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      onCompleted(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full my-6 overflow-hidden flex flex-col border border-gray-100 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-emerald-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center text-emerald-300">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold">Complete Service: {service.serviceNo}</h2>
              <p className="text-xs text-emerald-300/80 font-medium font-mono">
                {machine.model || 'Machine'} • Serial: {service.serialNumber}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-emerald-400 hover:text-white p-1 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 font-semibold rounded-xl text-xs">
              {errorMsg}
            </div>
          )}

          {/* Customer & Machine Banner */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex justify-between items-center text-xs">
            <div>
              <span className="text-gray-500 font-medium">Customer: </span>
              <span className="font-extrabold text-gray-900">{service.party?.name}</span>
              <span className="text-gray-500 ml-3">Mobile: </span>
              <span className="font-bold font-mono text-gray-800">{service.party?.mobile}</span>
            </div>
            <div className="text-right font-mono font-bold text-emerald-900">
              {machine.warrantyEnd && new Date(machine.warrantyEnd) > new Date() ? (
                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded text-[10px]">WARRANTY ACTIVE</span>
              ) : (
                <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-[10px]">WARRANTY EXPIRED</span>
              )}
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Work Performed *</label>
            <input
              type="text"
              value={workPerformed}
              onChange={(e) => setWorkPerformed(e.target.value)}
              required
              placeholder="Summary of service work carried out..."
              className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-semibold text-gray-900"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Technician Notes</label>
              <textarea
                rows={2}
                value={technicianNotes}
                onChange={(e) => setTechnicianNotes(e.target.value)}
                placeholder="Observations, oil change, belt replacement details..."
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Customer Feedback</label>
              <select
                value={customerFeedback}
                onChange={(e) => setCustomerFeedback(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-semibold"
              >
                <option value="Highly Satisfied">Highly Satisfied</option>
                <option value="Satisfied">Satisfied</option>
                <option value="Neutral">Neutral</option>
                <option value="Needs Follow Up">Needs Follow Up</option>
              </select>
            </div>
          </div>

          {/* Replacement Parts Used (Auto Stock Deduction) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-extrabold text-gray-900 text-xs flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-emerald-700" />
                Spare Parts Used (Deducted from Inventory)
              </label>
              <button
                type="button"
                onClick={handleAddPartRow}
                className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-lg text-[11px] flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Part
              </button>
            </div>

            {usedParts.length === 0 ? (
              <div className="p-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center text-gray-400 text-xs">
                No spare parts used for this service task.
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-100 text-gray-700 font-bold text-[10px] uppercase border-b">
                    <tr>
                      <th className="p-2">Part / Item</th>
                      <th className="p-2 w-20 text-center">Qty</th>
                      <th className="p-2 w-24 text-right">Price (₹)</th>
                      <th className="p-2 w-24 text-right">Amount</th>
                      <th className="p-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {usedParts.map((row, idx) => (
                      <tr key={idx}>
                        <td className="p-1.5">
                          <select
                            value={row.itemId}
                            onChange={(e) => handlePartChange(idx, e.target.value)}
                            className="w-full p-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium"
                          >
                            <option value="">-- Select Spare Part --</option>
                            {availableItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} (Stock: {item.currentStock})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => handlePartFieldChange(idx, 'quantity', e.target.value)}
                            className="w-full p-1.5 bg-white border border-gray-300 rounded-lg text-center font-bold"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            min="0"
                            value={row.rate}
                            onChange={(e) => handlePartFieldChange(idx, 'rate', e.target.value)}
                            className="w-full p-1.5 bg-white border border-gray-300 rounded-lg text-right font-mono"
                          />
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-gray-900">
                          ₹{((row.quantity || 0) * (row.rate || 0)).toLocaleString('en-IN')}
                        </td>
                        <td className="p-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePartRow(idx)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Service Charge & Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Service Labour Charge (₹)</label>
              <input
                type="number"
                min="0"
                value={serviceCharge}
                onChange={(e) => setServiceCharge(Number(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-mono font-bold text-sm"
              />
            </div>

            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-1 font-mono text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Parts Total:</span>
                <span>₹{partsTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Service Charge:</span>
                <span>₹{(Number(serviceCharge) || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-extrabold text-emerald-950 text-sm pt-1 border-t border-emerald-200">
                <span>Total Amount:</span>
                <span>₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Automatic Next Service Preview Banner */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-950">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <span className="font-bold">Auto-Schedule Next Service:</span>
                <div className="text-[11px] text-blue-800 font-medium">
                  Interval: {intervalVal} {intervalUnit} (Calculated Date Rule)
                </div>
              </div>
            </div>
            <div className="font-mono font-extrabold text-blue-900 bg-white px-3 py-1 rounded-xl border border-blue-200">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />
              {previewNextDate.toLocaleDateString('en-IN')}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-lg shadow-emerald-800/30 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Completing...' : 'Complete & Schedule Next'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
