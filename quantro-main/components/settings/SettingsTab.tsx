import React, { useState, useEffect, useCallback } from 'react';
import { Save, Mail, MessageSquare, CreditCard, Loader2 } from 'lucide-react';

interface SettingValue {
  key: string;
  value: string | null;
}

export const SettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({
    ticket_price: '150',
    merchant_code: '',
    merchant_name: '',
    smtp_email: '',
    smtp_password: '',
    arkesel_api_key: '',
    arkesel_sender_id: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingSms, setTestingSms] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data: SettingValue[] = await res.json();
        const settingsObj: Record<string, string> = {};
        data.forEach((s) => {
          settingsObj[s.key] = s.value || '';
        });
        setSettings((prev) => ({ ...prev, ...settingsObj }));
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully' });
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const testEmailConnection = async () => {
    setTestingEmail(true);
    setMessage(null);
    try {
      const res = await fetch('/api/notifications/test-email', { method: 'POST' });
      const data = await res.json();
      setMessage({
        type: data.success ? 'success' : 'error',
        text: data.message,
      });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to test email connection' });
    } finally {
      setTestingEmail(false);
    }
  };

  const testSmsConnection = async () => {
    setTestingSms(true);
    setMessage(null);
    try {
      const res = await fetch('/api/notifications/test-sms', { method: 'POST' });
      const data = await res.json();
      setMessage({
        type: data.success ? 'success' : 'error',
        text: data.message + (data.balance ? ` (Balance: ${data.balance})` : ''),
      });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to test SMS connection' });
    } finally {
      setTestingSms(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Settings</h2>
          <p className="text-sm text-slate-500">Configure payment, email, and SMS settings</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </button>
      </div>

      {message && (
        <div
          className={`rounded-xl border p-4 ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-2">
              <CreditCard className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Payment Settings</h3>
              <p className="text-xs text-slate-500">MTN MoMo merchant configuration</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Ticket Price (GHS)
              </label>
              <input
                type="number"
                value={settings.ticket_price}
                onChange={(e) => updateSetting('ticket_price', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Merchant Code
              </label>
              <input
                type="text"
                value={settings.merchant_code}
                onChange={(e) => updateSetting('merchant_code', e.target.value)}
                placeholder="Enter MTN MoMo merchant code"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Merchant Name
              </label>
              <input
                type="text"
                value={settings.merchant_name}
                onChange={(e) => updateSetting('merchant_name', e.target.value)}
                placeholder="Enter merchant display name"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-2">
              <Mail className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Email Settings</h3>
              <p className="text-xs text-slate-500">Gmail SMTP configuration</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Gmail Address
              </label>
              <input
                type="email"
                value={settings.smtp_email}
                onChange={(e) => updateSetting('smtp_email', e.target.value)}
                placeholder="your-email@gmail.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                App Password
              </label>
              <input
                type="password"
                value={settings.smtp_password}
                onChange={(e) => updateSetting('smtp_password', e.target.value)}
                placeholder="Gmail app password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
              />
              <p className="mt-1 text-xs text-slate-400">
                Use an app-specific password from Google Account settings
              </p>
            </div>
            <button
              onClick={testEmailConnection}
              disabled={testingEmail}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {testingEmail && <Loader2 className="h-4 w-4 animate-spin" />}
              Test Connection
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-2">
              <MessageSquare className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">SMS Settings</h3>
              <p className="text-xs text-slate-500">Arkesel SMS configuration</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Arkesel API Key
              </label>
              <input
                type="password"
                value={settings.arkesel_api_key}
                onChange={(e) => updateSetting('arkesel_api_key', e.target.value)}
                placeholder="Enter Arkesel API key"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Sender ID
              </label>
              <input
                type="text"
                value={settings.arkesel_sender_id}
                onChange={(e) => updateSetting('arkesel_sender_id', e.target.value)}
                placeholder="e.g., Conference"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
              />
            </div>
          </div>
          <button
            onClick={testSmsConnection}
            disabled={testingSms}
            className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {testingSms && <Loader2 className="h-4 w-4 animate-spin" />}
            Test Connection
          </button>
        </div>
      </div>
    </div>
  );
};
