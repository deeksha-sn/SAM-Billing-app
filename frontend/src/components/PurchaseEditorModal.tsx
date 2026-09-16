import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, ShoppingBag, UserPlus } from 'lucide-react';
import { apiRequest } from '../api';
import { SearchablePartyCombobox } from './SearchablePartyCombobox';
import { BillingItemSelect } from './BillingItemSelect';

interface PurchaseEditorModalProps {
  purchase?: any;
  onSaved: (purchase: any) => void;
  onClose: () => void;
}

export const PurchaseEditorModal: React.FC<PurchaseEditorModalProps> = ({
  purchase,
  onSaved,
  onClose,
}) => {
  const isEditing = Boolean(purchase?.id);
  const [purchaseNumber, setPurchaseNumber] = useState(purchase?.purchaseNumber || '');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState(purchase?.supplierInvoiceNo || '');
  const [purchaseDate, setPurchaseDate] = useState(
    purchase?.purchaseDate
      ? new Date(purchase.purchaseDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [partyId, setPartyId] = useState(purchase?.partyId || '');
  const [notes, setNotes] = useState(purchase?.notes || '');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState(purchase?.amountPaid || 0);

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<any[]>(
    purchase?.items?.length > 0
      ? purchase.items.map((i: any) => ({
          itemId: i.itemId,
          itemName: i.itemName,
          hsnSac: i.hsnSac || '8436',
          unit: i.unit || 'Nos',
          quantity: i.quantity,
          rate: i.rate,
          discountPercent: i.discountPercent || 0,
          gstRate: i.gstRate || 18,
        }))
      : [
          {
            itemId: '',
            itemName: '',
            hsnSac: '8436',
            unit: 'Nos',
            quantity: 1,
            rate: 0,
            discountPercent: 0,
            gstRate: 18,
          },
        ]
  );

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [suppliersRes, itemsRes] = await Promise.all([
        apiRequest('/parties?active=true'),
        apiRequest('/items'),
      ]);
      setSuppliers(suppliersRes.parties || []);
      setItemsList(itemsRes.items || []);
    } catch (err) {
      console.error('Failed to load purchase editor data:', err);
    }
  };

  const handleAddItemRow = () => {
    setLineItems([
      ...lineItems,
      {
        itemId: '',
        itemName: '',
        hsnSac: '8436',
        unit: 'Nos',
        quantity: 1,
        rate: 0,
        discountPercent: 0,
        gstRate: 18,
      },
    ]);
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
        hsnSac: selected.hsnSac || '8436',
        unit: selected.unit || 'Nos',
        rate: selected.purchasePrice || selected.sellingPrice || 0,
        gstRate: selected.gstRate || 18,
      };
    } else {
      updated[index].itemId = itemId;
    }
    setLineItems(updated);
  };

  const handleLineFieldChange = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  // Live Totals Calculation
  const calculateTotals = () => {
    let taxableTotal = 0;
    let taxTotal = 0;
    let grandTotal = 0;

    lineItems.forEach((row) => {
      const qty = Number(row.quantity) || 0;
      const rate = Number(row.rate) || 0;
      const disc = Number(row.discountPercent) || 0;
      const gst = Number(row.gstRate) || 0;

      const base = qty * rate;
      const discVal = (base * disc) / 100;
      const taxable = base - discVal;
      const tax = (taxable * gst) / 100;

      taxableTotal += taxable;
      taxTotal += tax;
      grandTotal += taxable + tax;
    });

    return {
      taxableTotal: Number(taxableTotal.toFixed(2)),
      taxTotal: Number(taxTotal.toFixed(2)),
      grandTotal: Math.round(grandTotal),
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId) {
      setErrorMsg('Please select a Supplier');
      return;
    }
    if (lineItems.some((i) => !i.itemId)) {
      setErrorMsg('Please select an item for all item rows');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const payload: any = {
      partyId,
      purchaseNumber,
      supplierInvoiceNo,
      purchaseDate,
      items: lineItems,
      paymentMode,
      amountPaid: Number(amountPaid) || 0,
      notes,
    };

    try {
      let res;
      if (isEditing) {
        res = await apiRequest(`/purchases/${purchase.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiRequest('/purchases', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      onSaved(res.purchase);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save purchase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full my-6 overflow-hidden flex flex-col border border-gray-100 max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-emerald-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800/80 flex items-center justify-center text-emerald-300">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold">
                {isEditing ? `Edit Purchase: ${purchase.purchaseNumber}` : 'Create New Purchase'}
              </h2>
              <p className="text-xs text-emerald-300/80 font-medium">Record Inventory Inward & Supplier Bill</p>
            </div>
          </div>
          <button onClick={onClose} className="text-emerald-400 hover:text-white p-1 rounded-lg">
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

          {/* Supplier & Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <div>
              <SearchablePartyCombobox
                label="Supplier"
                required={true}
                partyType="SUPPLIER"
                selectedPartyId={partyId}
                parties={suppliers}
                onSelectParty={(p) => {
                  if (p) {
                    setPartyId(p.id);
                  } else {
                    setPartyId('');
                  }
                }}
                onPartyCreated={(newP) => {
                  setSuppliers([...suppliers, newP]);
                  setPartyId(newP.id);
                }}
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Supplier Invoice No.</label>
              <input
                type="text"
                value={supplierInvoiceNo}
                onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                placeholder="e.g. INV-98231"
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-medium"
              >
                <option value="Cash">Cash</option>
                <option value="UPI / PhonePe">UPI / PhonePe</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Credit">Credit (Unpaid)</option>
              </select>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-extrabold text-gray-900 text-sm">Purchase Items</h3>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-lg flex items-center gap-1 transition"
              >
                <Plus className="w-4 h-4" /> Add Item Row
              </button>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 text-gray-700 font-extrabold uppercase text-[10px] tracking-wider border-b">
                  <tr>
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3">Item Description</th>
                    <th className="p-3 w-24">HSN/SAC</th>
                    <th className="p-3 w-20">Qty</th>
                    <th className="p-3 w-28">Price / Unit</th>
                    <th className="p-3 w-20">GST %</th>
                    <th className="p-3 w-32 text-right">Amount (₹)</th>
                    <th className="p-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {lineItems.map((row, idx) => {
                    const lineAmount = (Number(row.quantity) || 0) * (Number(row.rate) || 0) * (1 + (Number(row.gstRate) || 0) / 100);
                    return (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="p-3 text-center text-gray-400 font-bold">{idx + 1}</td>
                        <td className="p-2">
                          <BillingItemSelect
                            value={row.itemId}
                            onChange={(itemId) => handleItemChange(idx, itemId)}
                            items={itemsList}
                            documentType="PURCHASE"
                            className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.hsnSac}
                            onChange={(e) => handleLineFieldChange(idx, 'hsnSac', e.target.value)}
                            className="w-full p-2 bg-white border border-gray-300 rounded-lg font-mono text-center"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => handleLineFieldChange(idx, 'quantity', e.target.value)}
                            className="w-full p-2 bg-white border border-gray-300 rounded-lg text-center font-bold"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.rate}
                            onChange={(e) => handleLineFieldChange(idx, 'rate', e.target.value)}
                            className="w-full p-2 bg-white border border-gray-300 rounded-lg font-mono text-right"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={row.isExempt ? 'EXEMPT' : row.gstRate}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'EXEMPT') {
                                handleLineFieldChange(idx, 'gstRate', 0);
                                handleLineFieldChange(idx, 'isExempt', true);
                              } else {
                                handleLineFieldChange(idx, 'gstRate', Number(val) || 0);
                                handleLineFieldChange(idx, 'isExempt', false);
                              }
                            }}
                            className="w-full p-2 bg-white border border-gray-300 rounded-lg text-center font-bold font-mono text-xs"
                          >
                            <option value={0}>0%</option>
                            <option value={0.25}>0.25%</option>
                            <option value={3}>3%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                            <option value={40}>40%</option>
                            <option value="EXEMPT">Exempted</option>
                          </select>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-gray-900">
                          ₹{lineAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals & Notes Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Purchase Notes & Reference</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional supplier notes, LR number, vehicle number..."
                className="w-full p-2.5 bg-white border border-gray-300 rounded-xl text-xs"
              />
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl space-y-2 font-mono">
              <div className="flex justify-between text-gray-600">
                <span>Taxable Value:</span>
                <span>₹{totals.taxableTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST Tax:</span>
                <span>₹{totals.taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-emerald-950 pt-2 border-t border-emerald-200">
                <span>Grand Total:</span>
                <span>₹{totals.grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
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
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-lg shadow-emerald-700/30 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Purchase'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
