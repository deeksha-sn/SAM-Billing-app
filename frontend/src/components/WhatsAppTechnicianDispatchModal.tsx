import React, { useState, useEffect } from 'react';
import { X, Send, ExternalLink, Wrench, UserCheck } from 'lucide-react';
import { apiRequest } from '../api';

interface WhatsAppTechnicianDispatchModalProps {
  technicians: any[];
  defaultTechnicianId?: string;
  onClose: () => void;
}

export const WhatsAppTechnicianDispatchModal: React.FC<WhatsAppTechnicianDispatchModalProps> = ({
  technicians,
  defaultTechnicianId,
  onClose,
}) => {
  const [selectedTechId, setSelectedTechId] = useState(defaultTechnicianId || (technicians[0]?.id || ''));
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [techMobile, setTechMobile] = useState('');

  useEffect(() => {
    if (selectedTechId) fetchDispatchPreview(selectedTechId);
  }, [selectedTechId]);

  const fetchDispatchPreview = async (techId: string) => {
    setLoading(true);
    try {
      const res = await apiRequest('/services/dispatch-whatsapp', {
        method: 'POST',
        body: JSON.stringify({ technicianId: techId }),
      });
      setMessageText(res.messageText || '');
      setTechMobile(res.recipientMobile || '');
    } catch (err: any) {
      setMessageText(`No assigned service jobs found for this technician today.`);
    } finally {
      setLoading(false);
    }
  };

  const cleanPhone = techMobile.replace(/\D/g, '');
  const formattedPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
  const whatsappWebUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-blue-100 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Technician Daily Dispatch</h2>
            <p className="text-xs text-gray-500 font-semibold">Send Today's Service Job List to Technician</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-auto">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="my-4 space-y-3 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Select Service Technician *</label>
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900"
            >
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.mobile || 'No Phone'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Dispatched Jobs List Preview</label>
            {loading ? (
              <div className="p-8 text-center text-gray-400 font-medium">Generating technician dispatch text...</div>
            ) : (
              <textarea
                rows={9}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl font-sans text-xs leading-relaxed text-gray-900 font-medium"
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2 border-t">
          <a
            href={whatsappWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition text-center"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Send via WhatsApp App / Web</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
