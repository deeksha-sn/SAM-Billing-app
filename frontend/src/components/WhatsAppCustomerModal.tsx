import React, { useState } from 'react';
import { X, Send, ExternalLink, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { apiRequest } from '../api';

interface WhatsAppCustomerModalProps {
  service: any;
  onClose: () => void;
}

export const WhatsAppCustomerModal: React.FC<WhatsAppCustomerModalProps> = ({
  service,
  onClose,
}) => {
  const party = service.party || {};
  const farmer = service.farmer || null;
  const machine = service.machine || {};

  const recipientName = farmer?.name || party.name || 'Customer';
  const recipientPhone = farmer?.mobile || party.mobile || '';
  const location = farmer
    ? [farmer.village, farmer.district].filter(Boolean).join(', ')
    : [party.village, party.district].filter(Boolean).join(', ');

  const cleanPhone = recipientPhone ? recipientPhone.replace(/\D/g, '') : '';
  const formattedPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;

  const dueDateStr = new Date(service.serviceDueDate).toLocaleDateString('en-IN');

  const defaultMessage = `Hello ${recipientName},

This is a service reminder from Smart Agro Machinerys.

Your ${machine.model || 'Milking Machine'} (Serial No: ${service.serialNumber || 'N/A'}) is due for service today.

Location: ${location || 'Karnataka'}.

Please contact us to schedule the service.

Thank you,
Smart Agro Machinerys`;

  const [messageText, setMessageText] = useState(defaultMessage);
  const [sendingApi, setSendingApi] = useState(false);
  const [apiResult, setApiResult] = useState<{ success: boolean; msg: string } | null>(null);

  // Manual WhatsApp web/app link
  const whatsappWebUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;

  const handleSendAutomaticApi = async () => {
    setSendingApi(true);
    setApiResult(null);

    try {
      const res = await apiRequest('/services/remind-today-bulk', {
        method: 'POST',
      });
      setApiResult({
        success: true,
        msg: res.message || 'WhatsApp message sent via Cloud API!',
      });
    } catch (err: any) {
      setApiResult({
        success: false,
        msg: err.message || 'Cloud API not configured. Please use Manual WhatsApp link.',
      });
    } finally {
      setSendingApi(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-emerald-100 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-900">WhatsApp Customer Reminder</h2>
            <p className="text-xs text-gray-500 font-semibold">{party.name} • {party.mobile}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-auto">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Editor */}
        <div className="my-4 space-y-3 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Recipient Mobile Number</label>
            <input
              type="text"
              readOnly
              value={party.mobile ? `+91 ${party.mobile}` : 'No mobile number'}
              className="w-full p-2.5 bg-gray-100 border border-gray-300 rounded-xl font-mono font-bold text-gray-800"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Pre-filled Message Preview</label>
            <textarea
              rows={7}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl font-sans text-xs leading-relaxed text-gray-900"
            />
          </div>

          {apiResult && (
            <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
              apiResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              {apiResult.success ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
              <span>{apiResult.msg}</span>
            </div>
          )}
        </div>

        {/* Dual Mode Action Buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t">
          <a
            href={whatsappWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition text-center"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open WhatsApp App / Web (Manual)</span>
          </a>

          <button
            type="button"
            onClick={handleSendAutomaticApi}
            disabled={sendingApi}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
          >
            <Send className="w-4 h-4" />
            <span>{sendingApi ? 'Sending via API...' : 'Send via WhatsApp Business Cloud API'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition mt-1"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
