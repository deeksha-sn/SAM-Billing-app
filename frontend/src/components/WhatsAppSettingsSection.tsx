import React, { useState, useEffect } from 'react';
import { MessageSquare, Save, Send, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiRequest } from '../api';

export const WhatsAppSettingsSection: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [businessAccountId, setBusinessAccountId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [businessPhone, setBusinessPhone] = useState('+91 9844011223');
  const [autoRemindersEnabled, setAutoRemindersEnabled] = useState(false);
  const [upcomingDays, setUpcomingDays] = useState('7,3,1');
  const [overdueDays, setOverdueDays] = useState('1,7');
  const [paymentReminderDays, setPaymentReminderDays] = useState('3,0,3');

  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/whatsapp/config');
      const cfg = res.config || {};
      setEnabled(cfg.enabled || false);
      setPhoneNumberId(cfg.phoneNumberId || '');
      setBusinessAccountId(cfg.businessAccountId || '');
      setAccessToken(cfg.accessTokenMasked || '');
      setBusinessPhone(cfg.businessPhone || '+91 9844011223');
      setAutoRemindersEnabled(cfg.autoRemindersEnabled || false);
      setUpcomingDays(cfg.upcomingDays || '7,3,1');
      setOverdueDays(cfg.overdueDays || '1,7');
      setPaymentReminderDays(cfg.paymentReminderDays || '3,0,3');
    } catch (err) {
      console.error('Failed to fetch WhatsApp config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    const payload = {
      enabled,
      phoneNumberId,
      businessAccountId,
      accessToken,
      businessPhone,
      autoRemindersEnabled,
      upcomingDays,
      overdueDays,
      paymentReminderDays,
    };

    try {
      const res = await apiRequest('/whatsapp/config', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setStatusMsg(res.message || 'WhatsApp Business configuration saved!');
      fetchConfig();
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!testPhone) {
      setTestResult({ success: false, msg: 'Enter a valid test mobile number' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await apiRequest('/whatsapp/test-connection', {
        method: 'POST',
        body: JSON.stringify({ testPhone }),
      });
      setTestResult({ success: true, msg: res.message || 'Test message sent!' });
    } catch (err: any) {
      setTestResult({ success: false, msg: err.message || 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-400 font-medium">Loading WhatsApp configuration...</div>;

  return (
    <form onSubmit={handleSave} className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-6 text-xs">
      
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-900">WhatsApp Business Cloud API Settings</h2>
            <p className="text-xs text-gray-500 font-medium">Official Meta Cloud API Integration for Automatic Service & Payment Reminders</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-700">Enable Cloud API:</span>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
              enabled ? 'bg-emerald-600 justify-end' : 'bg-gray-300 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-3.5 rounded-2xl text-xs font-semibold ${
          statusMsg.startsWith('Error') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
        }`}>
          {statusMsg}
        </div>
      )}

      {/* Meta API Credentials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
        <div>
          <label className="block font-bold text-gray-700 mb-1">Phone Number ID *</label>
          <input
            type="text"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            placeholder="e.g. 1092837465012"
            className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-mono"
          />
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-1">WhatsApp Business Account ID</label>
          <input
            type="text"
            value={businessAccountId}
            onChange={(e) => setBusinessAccountId(e.target.value)}
            placeholder="e.g. 9876543210123"
            className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-mono"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block font-bold text-gray-700 mb-1">System Access Token (Meta Permanent Token) *</label>
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="EAAG..."
            className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-mono"
          />
          <span className="text-[10px] text-gray-400 font-medium block mt-1">
            <ShieldCheck className="w-3.5 h-3.5 inline text-emerald-600 mr-1" />
            Tokens are stored securely in backend server configuration and never exposed to public frontend code.
          </span>
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-1">Business Support Phone Number</label>
          <input
            type="text"
            value={businessPhone}
            onChange={(e) => setBusinessPhone(e.target.value)}
            placeholder="+91 9844011223"
            className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-mono"
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl">
          <div>
            <span className="font-bold block text-gray-900">Automatic Daily Reminders</span>
            <span className="text-gray-500 text-[10px]">Automatically dispatch due/overdue reminders without manual clicks</span>
          </div>
          <button
            type="button"
            onClick={() => setAutoRemindersEnabled(!autoRemindersEnabled)}
            className={`w-10 h-5 rounded-full transition-colors p-0.5 flex items-center ${
              autoRemindersEnabled ? 'bg-emerald-600 justify-end' : 'bg-gray-300 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
          </button>
        </div>
      </div>

      {/* Reminder Schedule Config */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block font-bold text-gray-700 mb-1">Upcoming Service Reminders (Days Before)</label>
          <input
            type="text"
            value={upcomingDays}
            onChange={(e) => setUpcomingDays(e.target.value)}
            placeholder="7,3,1"
            className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-mono"
          />
          <span className="text-[10px] text-gray-400">Comma separated e.g. 7,3,1 (Remind 7d, 3d, 1d before due date)</span>
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-1">Overdue Service Reminders (Days After)</label>
          <input
            type="text"
            value={overdueDays}
            onChange={(e) => setOverdueDays(e.target.value)}
            placeholder="1,7"
            className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-mono"
          />
          <span className="text-[10px] text-gray-400">Comma separated e.g. 1,7 (Remind 1d, 7d after due date)</span>
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-1">Payment Overdue Reminders (Days)</label>
          <input
            type="text"
            value={paymentReminderDays}
            onChange={(e) => setPaymentReminderDays(e.target.value)}
            placeholder="3,0,3"
            className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-mono"
          />
          <span className="text-[10px] text-gray-400">Comma separated e.g. 3,0,3 (3d before, on due date, 3d after)</span>
        </div>
      </div>

      {/* Connection Test Section */}
      <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
        <h3 className="font-extrabold text-emerald-950 text-xs uppercase tracking-wider">Test WhatsApp Connection</h3>
        <div className="flex gap-3 items-center">
          <input
            type="text"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="Enter mobile number e.g. 9844011223"
            className="p-2.5 bg-white border border-emerald-300 rounded-xl font-mono text-xs max-w-sm w-full"
          />
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl flex items-center gap-1.5 transition shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>{testing ? 'Testing...' : 'Send Test Ping'}</span>
          </button>
        </div>

        {testResult && (
          <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
            testResult.success ? 'bg-white border-emerald-300 text-emerald-900' : 'bg-white border-red-300 text-red-800'
          }`}>
            {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{testResult.msg}</span>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-3 border-t">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-emerald-900 hover:bg-emerald-950 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/30 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving Settings...' : 'Save WhatsApp Configuration'}</span>
        </button>
      </div>

    </form>
  );
};
