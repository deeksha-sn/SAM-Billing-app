import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { Layers, Plus, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Quotations: React.FC = () => {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For now, render professional Quotations list placeholder connected to sales
    setLoading(false);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotations & Proforma Invoices</h1>
          <p className="text-sm text-gray-500">Estimates & Quotations (Does not affect stock or accounting until converted to invoice)</p>
        </div>
        <button
          onClick={() => navigate('/sales?create=true')}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-md transition"
        >
          <Plus className="w-5 h-5" />
          <span>+ Create Quotation</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500">
        <Layers className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-800">Quotations Module Active</h3>
        <p className="text-sm text-gray-600 max-w-md mx-auto mt-1">
          Create price estimates and proforma invoices for farmers and dealers. Convert them directly into Sales Invoices with 1-click!
        </p>
        <button
          onClick={() => navigate('/sales?create=true')}
          className="mt-4 px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow hover:bg-emerald-700"
        >
          + Create Quotation Now
        </button>
      </div>
    </div>
  );
};
