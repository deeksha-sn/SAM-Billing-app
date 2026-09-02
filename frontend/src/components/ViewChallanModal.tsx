import React, { useState, useEffect } from 'react';
import { PrintChallanModal } from './PrintChallanModal';
import { apiRequest } from '../api';

interface ViewChallanModalProps {
  challan: any;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const ViewChallanModal: React.FC<ViewChallanModalProps> = ({
  challan,
  onEdit,
  onDelete,
  onClose,
}) => {
  const [company, setCompany] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      const res = await apiRequest('/settings/company');
      setCompany(res.company || {
        companyName: 'Smart Agro Machinerys',
        address: 'Main Road, Haveri, Karnataka - 581110',
        phone: '+91 9844011223',
        email: 'info@smartagromachinerys.com',
        gstin: '29AAAAA0000A1Z5',
      });
    } catch {
      setCompany({
        companyName: 'Smart Agro Machinerys',
        address: 'Main Road, Haveri, Karnataka - 581110',
        phone: '+91 9844011223',
        email: 'info@smartagromachinerys.com',
        gstin: '29AAAAA0000A1Z5',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !company) {
    return (
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-700 font-bold text-xs">
          Loading Delivery Challan document preview...
        </div>
      </div>
    );
  }

  return (
    <PrintChallanModal
      challan={challan}
      company={company}
      onClose={onClose}
    />
  );
};
