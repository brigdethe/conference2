import React, { useState, useEffect, useCallback } from 'react';
import { Save, Mail, MessageSquare, CreditCard, Loader2, Plus, Trash2, Bell, ToggleLeft, ToggleRight, Send, FileText, Users, Sparkles } from 'lucide-react';

interface SettingValue {
  key: string;
  value: string | null;
}

interface AdminRecipient {
  id: number;
  recipient_type: 'email' | 'phone';
  value: string;
  enabled: boolean;
}

export const SettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({
    ticket_price: '150',
    merchant_code: '',
    merchant_name: '',
    smtp_email: '',
    smtp_password: '',
    smtp_sender_name: 'Ghana Competition Law Seminar',
    arkesel_api_key: '',
    arkesel_sender_id: '',
    test_sms_phone: '0241293754',
    notifications_email_enabled: 'true',
    notifications_sms_enabled: 'true',
    max_capacity: '500',
    groq_api_key: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingSms, setTestingSms] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [adminRecipients, setAdminRecipients] = useState<AdminRecipient[]>([]);
  const [newRecipientType, setNewRecipientType] = useState<'email' | 'phone'>('email');
  const [newRecipientValue, setNewRecipientValue] = useState('');
  const [addingRecipient, setAddingRecipient] = useState(false);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [sendingReport, setSendingReport] = useState(false);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [sendingSurvey, setSendingSurvey] = useState(false);

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

  const fetchAdminRecipients = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/admin-recipients');
      if (res.ok) {
        const data = await res.json();
        console.log('Admin recipients:', data);
        setAdminRecipients(data.recipients || []);
      } else {
        console.error('Failed to fetch admin recipients:', res.status);
      }
    } catch (err) {
      console.error('Failed to fetch admin recipients:', err);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchAdminRecipients();
  }, [fetchSettings, fetchAdminRecipients]);

  const addAdminRecipient = async () => {
    if (!newRecipientValue.trim()) return;
    setAddingRecipient(true);
    try {
      const res = await fetch('/api/settings/admin-recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_type: newRecipientType, value: newRecipientValue.trim() }),
      });
      if (res.ok) {
        setNewRecipientValue('');
        fetchAdminRecipients();
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.detail || 'Failed to add recipient' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to add recipient' });
    } finally {
      setAddingRecipient(false);
    }
  };

  const toggleRecipient = async (id: number) => {
    try {
      await fetch(`/api/settings/admin-recipients/${id}/toggle`, { method: 'PATCH' });
      fetchAdminRecipients();
    } catch (err) {
      console.error('Failed to toggle recipient:', err);
    }
  };

  const deleteRecipient = async (id: number) => {
    if (!confirm('Remove this recipient?')) return;
    try {
      await fetch(`/api/settings/admin-recipients/${id}`, { method: 'DELETE' });
      fetchAdminRecipients();
    } catch (err) {
      console.error('Failed to delete recipient:', err);
    }
  };

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

  const sendReminderEmail = async (template: string, testOnly: boolean = false) => {
    setSendingReminder(template);
    setMessage(null);
    try {
      const body: { template: string; test_email?: string } = { template };
      if (testOnly) {
        body.test_email = 'agyarefredrick22@gmail.com';
      }
      const res = await fetch('/api/notifications/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setMessage({
        type: data.success ? 'success' : 'error',
        text: data.message || (data.success ? 'Emails sent!' : 'Failed to send'),
      });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to send reminder emails' });
    } finally {
      setSendingReminder(null);
    }
  };

  const sendRegistrationReport = async (testOnly: boolean = false) => {
    setSendingReport(true);
    setMessage(null);
    try {
      const res = await fetch('/api/notifications/send-registration-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_only: testOnly }),
      });
      const data = await res.json();
      setMessage({
        type: data.success ? 'success' : 'error',
        text: data.message || (data.success ? 'Report sent!' : 'Failed to send report'),
      });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to send registration report' });
    } finally {
      setSendingReport(false);
    }
  };

  const sendSMSTickets = async (test: boolean) => {
    setSendingSMS(true);
    setMessage(null);
    try {
      const body: { test_phone?: string } = {};
      if (test) {
        body.test_phone = settings.test_sms_phone || '0241293754';
      }
      const res = await fetch('/api/notifications/send-sms-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setMessage({
        type: data.success ? 'success' : 'error',
        text: data.message || (data.success ? 'SMS sent!' : 'Failed to send SMS'),
      });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to send SMS ticket reminders' });
    } finally {
      setSendingSMS(false);
    }
  };

  const sendSurveyInvite = async (test: boolean) => {
    setSendingSurvey(true);
    setMessage(null);
    try {
      const res = await fetch('/api/notifications/send-survey-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_only: test }),
      });
      const data = await res.json();
      setMessage({
        type: data.success ? 'success' : 'error',
        text: data.message || (data.success ? 'Survey invitations sent!' : 'Failed to send invitations'),
      });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to send survey invitations' });
    } finally {
      setSendingSurvey(false);
    }
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
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Max Capacity
              </label>
              <input
                type="number"
                value={settings.max_capacity}
                onChange={(e) => updateSetting('max_capacity', e.target.value)}
                placeholder="500"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
              />
              <p className="mt-1 text-xs text-slate-400">
                Maximum number of attendees allowed to register
              </p>
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
          <div className="mb-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-medium text-slate-700 mb-1">Setup Instructions:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Go to <span className="font-medium">myaccount.google.com</span></li>
              <li>Security &gt; 2-Step Verification (enable if not already)</li>
              <li>Search "App passwords" &gt; Create new app password</li>
              <li>Copy the 16-character password and paste below</li>
            </ol>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Sender Name
              </label>
              <input
                type="text"
                value={settings.smtp_sender_name}
                onChange={(e) => updateSetting('smtp_sender_name', e.target.value)}
                placeholder="Ghana Competition Law Seminar"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
              />
              <p className="mt-1 text-xs text-slate-400">
                Name recipients will see when they receive emails
              </p>
            </div>
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
                placeholder="16-character app password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
              />
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
          <div className="grid gap-4 sm:grid-cols-3">
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
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Test Phone Number
              </label>
              <input
                type="text"
                value={settings.test_sms_phone}
                onChange={(e) => updateSetting('test_sms_phone', e.target.value)}
                placeholder="0241293754"
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

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">AI Analysis (Groq)</h3>
              <p className="text-xs text-slate-500">API key for AI-powered feedback analysis</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Groq API Key
              </label>
              <input
                type="password"
                value={settings.groq_api_key}
                onChange={(e) => updateSetting('groq_api_key', e.target.value)}
                placeholder="gsk_..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100"
              />
              <p className="mt-1 text-xs text-slate-400">
                Get a free key at <a href="https://console.groq.com" target="_blank" rel="noreferrer" className="text-purple-500 underline">console.groq.com</a>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-2">
                <Bell className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Admin Notifications</h3>
                <p className="text-xs text-slate-500">Receive alerts when payments need verification</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.notifications_email_enabled === 'true'}
                  onChange={(e) => updateSetting('notifications_email_enabled', e.target.checked ? 'true' : 'false')}
                  className="rounded border-slate-300"
                />
                Email
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.notifications_sms_enabled === 'true'}
                  onChange={(e) => updateSetting('notifications_sms_enabled', e.target.checked ? 'true' : 'false')}
                  className="rounded border-slate-300"
                />
                SMS
              </label>
            </div>
          </div>

          <div className="mb-4 flex gap-2">
            <select
              value={newRecipientType}
              onChange={(e) => setNewRecipientType(e.target.value as 'email' | 'phone')}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
            </select>
            <input
              type="text"
              value={newRecipientValue}
              onChange={(e) => setNewRecipientValue(e.target.value)}
              placeholder={newRecipientType === 'email' ? 'admin@example.com' : '0241234567'}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm placeholder-slate-400 focus:border-slate-300 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && addAdminRecipient()}
            />
            <button
              onClick={addAdminRecipient}
              disabled={addingRecipient || !newRecipientValue.trim()}
              className="flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {addingRecipient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </button>
          </div>

          {adminRecipients.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No admin recipients configured</p>
          ) : (
            <div className="space-y-2">
              {adminRecipients.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.recipient_type === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {r.recipient_type}
                    </span>
                    <span className={`text-sm ${r.enabled ? 'text-slate-900' : 'text-slate-400 line-through'}`}>{r.value}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRecipient(r.id)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                      title={r.enabled ? 'Disable' : 'Enable'}
                    >
                      {r.enabled ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => deleteRecipient(r.id)}
                      className="p-1 text-slate-400 hover:text-red-600"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email Tools Section */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <Send className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Email Tools</h3>
              <p className="text-xs text-slate-500">Send reminder emails to attendees and reports to admins</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Reminder Emails */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-600" />
                Reminder Emails
              </h4>
              <p className="text-xs text-slate-500 mb-4">Send preset reminder emails to all confirmed attendees</p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-white border border-slate-200 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Submit Questions</p>
                    <p className="text-xs text-slate-500">Remind attendees to submit questions</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendReminderEmail('questions_reminder', true)}
                      disabled={sendingReminder !== null}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => sendReminderEmail('questions_reminder', false)}
                      disabled={sendingReminder !== null}
                      className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {sendingReminder === 'questions_reminder' && <Loader2 className="h-3 w-3 animate-spin" />}
                      Send All
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-white border border-slate-200 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Invite Others</p>
                    <p className="text-xs text-slate-500">Encourage inviting colleagues</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendReminderEmail('invite_others', true)}
                      disabled={sendingReminder !== null}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => sendReminderEmail('invite_others', false)}
                      disabled={sendingReminder !== null}
                      className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                      {sendingReminder === 'invite_others' && <Loader2 className="h-3 w-3 animate-spin" />}
                      Send All
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-white border border-slate-200 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Event Reminder</p>
                    <p className="text-xs text-slate-500">General event reminder with details</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendReminderEmail('event_reminder', true)}
                      disabled={sendingReminder !== null}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => sendReminderEmail('event_reminder', false)}
                      disabled={sendingReminder !== null}
                      className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {sendingReminder === 'event_reminder' && <Loader2 className="h-3 w-3 animate-spin" />}
                      Send All
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-amber-50 border-2 border-amber-300 p-3">
                  <div>
                    <p className="text-sm font-medium text-amber-900">🔔 Final Reminder (Tomorrow!)</p>
                    <p className="text-xs text-amber-700">Ticket code, QR instructions, program PDF attached</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendReminderEmail('final_reminder', true)}
                      disabled={sendingReminder !== null}
                      className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => sendReminderEmail('final_reminder', false)}
                      disabled={sendingReminder !== null}
                      className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      {sendingReminder === 'final_reminder' && <Loader2 className="h-3 w-3 animate-spin" />}
                      Send All
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-purple-50 border-2 border-purple-300 p-3">
                  <div>
                    <p className="text-sm font-medium text-purple-900">📱 SMS Ticket Reminder</p>
                    <p className="text-xs text-purple-700">Send ticket code via SMS to all attendees</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendSMSTickets(true)}
                      disabled={sendingSMS}
                      className="rounded-lg border border-purple-300 bg-white px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => sendSMSTickets(false)}
                      disabled={sendingSMS}
                      className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                      {sendingSMS && <Loader2 className="h-3 w-3 animate-spin" />}
                      Send All
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-teal-50 border-2 border-teal-300 p-3">
                  <div>
                    <p className="text-sm font-medium text-teal-900">📋 Survey Invitation</p>
                    <p className="text-xs text-teal-700">Invite attendees to fill feedback survey for digital souvenir</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendSurveyInvite(true)}
                      disabled={sendingSurvey}
                      className="rounded-lg border border-teal-300 bg-white px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-50"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => sendSurveyInvite(false)}
                      disabled={sendingSurvey}
                      className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      {sendingSurvey && <Loader2 className="h-3 w-3 animate-spin" />}
                      Send All
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Registration Report */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-600" />
                Registration Report
              </h4>
              <p className="text-xs text-slate-500 mb-4">Send registration summary with CSV to admin team</p>
              
              <div className="rounded-lg bg-white border border-slate-200 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="h-8 w-8 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Send Report to Admins</p>
                    <p className="text-xs text-slate-500">Includes attendee count and CSV attachment</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Recipients: kofi.datsa@gmail.com, eleanor.sarpong@yahoo.com, agyarefredrick22@gmail.com, george.attopany@databankgroup.com
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => sendRegistrationReport(true)}
                    disabled={sendingReport}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Test (Fredrick only)
                  </button>
                  <button
                    onClick={() => sendRegistrationReport(false)}
                    disabled={sendingReport}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {sendingReport && <Loader2 className="h-4 w-4 animate-spin" />}
                    Send to All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
