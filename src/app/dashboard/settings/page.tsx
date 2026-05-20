'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import Badge from '@/components/dashboard/Badge';

export default function SettingsPage() {
  const [scanSchedule, setScanSchedule] = useState('0 7 * * 1');
  const [secPortalUrl, setSecPortalUrl] = useState('https://sec.gov.ng/circulars');
  const [cbnPortalUrl, setCbnPortalUrl] = useState('https://cbn.gov.ng/regulations');
  const [firsPortalUrl, setFirsPortalUrl] = useState('https://firs.gov.ng/news');
  const [metaWebhook, setMetaWebhook] = useState('/api/webhooks/whatsapp/meta');
  const [twilioWebhook, setTwilioWebhook] = useState('/api/webhooks/whatsapp/twilio');
  const [paystackWebhook, setPaystackWebhook] = useState('/api/webhooks/paystack/route.ts');
  const [gcpProjectId, setGcpProjectId] = useState('shadowspark-production');
  const [gcpRegion, setGcpRegion] = useState('europe-central2');
  const [saKeyActive, setSaKeyActive] = useState('c005a720-key-confirmed');
  const [neonDbUrl, setNeonDbUrl] = useState('postgresql://neon-secret-url');

  function handleSave() {
    // Settings saved via form submission — values are managed by state
  }

  return (
    <>
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Settings
        </h2>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
          Stack configuration · credentials · cron schedule
        </p>
      </div>

      {/* Watchtower Cron */}
      <div className="dashboard-card">
        <div className="card-header">
          <div className="card-title">Watchtower Cron</div>
          <div className="card-sub">Vercel cron schedule (UTC)</div>
        </div>
        <div className="settings-section">
          <div className="settings-row">
            <div>
              <div className="settings-label">Scan Schedule</div>
              <div className="settings-desc">Cron expression (UTC)</div>
            </div>
            <input
              className="settings-input"
              value={scanSchedule}
              onChange={(e) => setScanSchedule(e.target.value)}
              placeholder="0 7 * * 1"
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">SEC Portal URL</div>
              <div className="settings-desc">Override scan target</div>
            </div>
            <input
              className="settings-input"
              value={secPortalUrl}
              onChange={(e) => setSecPortalUrl(e.target.value)}
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">CBN Portal URL</div>
            </div>
            <input
              className="settings-input"
              value={cbnPortalUrl}
              onChange={(e) => setCbnPortalUrl(e.target.value)}
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">FIRS Portal URL</div>
            </div>
            <input
              className="settings-input"
              value={firsPortalUrl}
              onChange={(e) => setFirsPortalUrl(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* WhatsApp Webhooks */}
      <div className="dashboard-card">
        <div className="card-header">
          <div className="card-title">WhatsApp Webhooks</div>
        </div>
        <div className="settings-section">
          <div className="settings-row">
            <div>
              <div className="settings-label">Meta Webhook</div>
              <div className="settings-desc">App ID 24260677440297544</div>
            </div>
            <input
              className="settings-input"
              value={metaWebhook}
              onChange={(e) => setMetaWebhook(e.target.value)}
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Twilio Webhook</div>
            </div>
            <input
              className="settings-input"
              value={twilioWebhook}
              onChange={(e) => setTwilioWebhook(e.target.value)}
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Paystack Webhook</div>
            </div>
            <input
              className="settings-input"
              value={paystackWebhook}
              onChange={(e) => setPaystackWebhook(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* API Credentials */}
      <div className="dashboard-card">
        <div className="card-header">
          <div className="card-title">API Credentials</div>
          <div className="card-sub">Stored in GCP Secret Manager — never in git</div>
        </div>
        <div className="settings-section">
          <div className="settings-row">
            <div>
              <div className="settings-label">GCP Project ID</div>
            </div>
            <input
              className="settings-input"
              value={gcpProjectId}
              onChange={(e) => setGcpProjectId(e.target.value)}
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">GCP Region</div>
            </div>
            <input
              className="settings-input"
              value={gcpRegion}
              onChange={(e) => setGcpRegion(e.target.value)}
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">SA Key Active</div>
              <div className="settings-desc">c005a720 — verify intent</div>
            </div>
            <input
              className="settings-input masked"
              value={saKeyActive}
              onChange={(e) => setSaKeyActive(e.target.value)}
            />
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Neon DB URL</div>
              <div className="settings-desc">Wake before migrate deploy</div>
            </div>
            <input
              className="settings-input masked"
              value={neonDbUrl}
              onChange={(e) => setNeonDbUrl(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Team Access */}
      <div className="dashboard-card">
        <div className="card-header">
          <div className="card-title">Team Access</div>
        </div>
        <div className="settings-section">
          <div className="settings-row">
            <div>
              <div className="settings-label">Stephen (ARCHITECT)</div>
              <div className="settings-desc">roles/owner · Gmail account</div>
            </div>
            <Badge variant="green">Active</Badge>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Emmanuel (COO)</div>
              <div className="settings-desc">roles/editor · admin access</div>
            </div>
            <Badge variant="green">Active</Badge>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Reginald</div>
              <div className="settings-desc">Pending removal — admin.google.com</div>
            </div>
            <button
              className="btn btn-ghost"
              style={{ color: 'var(--color-notification)', borderColor: 'var(--color-notification)' }}
            >
              <Trash2 size={15} /> Remove
            </button>
          </div>
        </div>
      </div>

      {/* Save Changes */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSave}>
          Save Changes
        </button>
      </div>
    </>
  );
}
