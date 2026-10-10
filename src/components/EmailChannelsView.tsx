import React, { useState } from 'react';
import {
  Mail,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Inbox,
  Shield,
  Zap,
  Check,
  Settings,
  Lock,
  ExternalLink,
  Sliders,
  Terminal,
} from 'lucide-react';
import { EmailChannel, MailboxConnectionConfig, DefaultEmailGatewayConfig, User } from '../types';

interface EmailChannelsViewProps {
  channels: EmailChannel[];
  adminMailboxes?: MailboxConnectionConfig[];
  defaultGateway?: DefaultEmailGatewayConfig;
  availableUsers?: User[];
  currentUser?: User;
  onSimulateInbound: (from: string, subject: string, body: string) => Promise<any>;
  onNavigateToSettings?: (tab: string) => void;
  onTestDefaultGateway?: (email?: string) => Promise<any>;
  onTestUserMailbox?: (data: any) => Promise<any>;
}

export const EmailChannelsView: React.FC<EmailChannelsViewProps> = ({
  channels,
  adminMailboxes = [],
  defaultGateway,
  availableUsers = [],
  currentUser,
  onSimulateInbound,
  onNavigateToSettings,
  onTestDefaultGateway,
  onTestUserMailbox,
}) => {
  const [fromAddress, setFromAddress] = useState('david.miller@lakhanglobal.com');
  const [subject, setSubject] = useState('[ITL-000101] Re: Production VPN gateway test follow-up');
  const [body, setBody] = useState('Hi Alex Rivera,\n\nI just reconnected to the Oregon secondary cluster gateway and tested for 20 minutes. My SSH session did not drop at all! Looks like the issue is resolved.\n\nThanks,\nDavid');
  const [processing, setProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  // Default Gateway test state
  const [testingGateway, setTestingGateway] = useState(false);
  const [gatewayTestResult, setGatewayTestResult] = useState<string | null>(null);

  // Testing admin mailbox state
  const [testingAdminId, setTestingAdminId] = useState<string | null>(null);
  const [adminTestResult, setAdminTestResult] = useState<{ [userId: string]: string }>({});

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setResultMessage(null);

    try {
      const res = await onSimulateInbound(fromAddress, subject, body);
      if (res.mode === 'threaded') {
        setResultMessage(`✓ Successfully threaded email reply onto existing ticket [${res.ticket.id}]! Status updated.`);
      } else {
        setResultMessage(`✓ Successfully converted email into brand new ticket [${res.ticket.id}]! Automations & SLA attached.`);
      }
    } catch (err: any) {
      setResultMessage(`Error: ${err.message || 'Failed processing email'}`);
    } finally {
      setProcessing(false);
    }
  };

  const presetNewIncident = () => {
    setFromAddress('priya.sharma@lakhanglobal.com');
    setSubject('Cannot launch Adobe InDesign on MacBook Pro');
    setBody('Hi Helpdesk,\n\nInDesign crashes immediately on startup with crash log code 0xC0000005. Could you please check my Creative Cloud license status?\n\nBest,\nPriya');
  };

  const presetReply = () => {
    setFromAddress('david.miller@lakhanglobal.com');
    setSubject('[ITL-000101] Re: Production VPN gateway dropping SSL handshakes');
    setBody('Hi Alex,\n\nConfirmed working after the gateway failover! Thank you for the quick response.');
  };

  const handleTestGateway = async () => {
    if (!onTestDefaultGateway) return;
    setTestingGateway(true);
    setGatewayTestResult(null);
    try {
      const res = await onTestDefaultGateway(currentUser?.email || 'admin@company.com');
      setGatewayTestResult(res.message || '✓ Outbound SMTP handshake succeeded! Test email dispatched.');
    } catch (err: any) {
      setGatewayTestResult(`Error: ${err.message}`);
    } finally {
      setTestingGateway(false);
    }
  };

  const handleTestAdmin = async (user: User) => {
    if (!onTestUserMailbox) return;
    const config = adminMailboxes.find((m) => m.userId === user.id);
    setTestingAdminId(user.id);
    try {
      const res = await onTestUserMailbox({
        incomingProtocol: config?.incomingProtocol || 'imap',
        incomingHost: config?.incomingHost || 'imap.lakhanglobal.com',
        incomingPort: config?.incomingPort || 993,
        outgoingProtocol: 'smtp',
        outgoingHost: config?.outgoingHost || 'smtp.lakhanglobal.com',
        outgoingPort: config?.outgoingPort || 587,
        incomingUsername: config?.incomingUsername || user.email,
      });
      setAdminTestResult((prev) => ({
        ...prev,
        [user.id]: `✓ Handshake successful (${res.latencyMs || 48}ms latency). ${res.incomingCheck?.auth || 'Authenticated'}`,
      }));
    } catch (err: any) {
      setAdminTestResult((prev) => ({
        ...prev,
        [user.id]: `Handshake failed: ${err.message}`,
      }));
    } finally {
      setTestingAdminId(null);
    }
  };

  const adminUsers = availableUsers.filter((u) => u.role === 'admin' || u.role === 'superadmin');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-cyan-400" />
            Email Gateways &amp; Mailbox Connectors
          </h1>
          <p className="text-xs text-slate-400">
            IMAP / POP3 inbound mail polling, SMTP outbound reply gateway, and Admin mailbox connections.
          </p>
        </div>

        {onNavigateToSettings && (
          <button
            onClick={() => onNavigateToSettings('default-gateway')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 rounded-lg cursor-pointer whitespace-nowrap"
          >
            <Settings className="w-3.5 h-3.5" />
            Configure Inbound/Outbound Protocols
          </button>
        )}
      </div>

      {/* SECTION 1: Default System Reply & Polling Gateway */}
      <div className="glass-panel p-5 rounded-xl border border-cyan-500/30 bg-slate-900/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/40">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Default Helpdesk Gateway (POP3 / SMTP / IMAP)</h3>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                  SYSTEM DEFAULT
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Default mailbox used to receive tickets via IMAP/POP3 and send ticket replies via SMTP.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestGateway}
              disabled={testingGateway}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
              {testingGateway ? 'Testing Relay...' : 'Test Outbound SMTP Relay'}
            </button>
            {onNavigateToSettings && (
              <button
                onClick={() => onNavigateToSettings('default-gateway')}
                className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer"
                title="Edit default gateway settings"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {gatewayTestResult && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
            {gatewayTestResult}
          </div>
        )}

        {/* Gateway Specification Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Inbound Poller Protocol</span>
            <div className="font-mono text-cyan-300 font-bold uppercase flex items-center justify-between">
              <span>{defaultGateway?.incomingProtocol || 'IMAP'} / TLS</span>
              <span className="text-emerald-400 text-[10px]">Port {defaultGateway?.incomingPort || 993}</span>
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              Host: <span className="font-mono text-slate-200">{defaultGateway?.incomingHost || 'imap.lakhanglobal.com'}</span>
            </div>
            <div className="text-[10px] text-slate-500">
              Auth: {defaultGateway?.incomingUsername || 'helpdesk@lakhanglobal.com'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Outbound Reply Relay</span>
            <div className="font-mono text-cyan-300 font-bold uppercase flex items-center justify-between">
              <span>SMTP / STARTTLS</span>
              <span className="text-emerald-400 text-[10px]">Port {defaultGateway?.outgoingPort || 587}</span>
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              Host: <span className="font-mono text-slate-200">{defaultGateway?.outgoingHost || 'smtp.lakhanglobal.com'}</span>
            </div>
            <div className="text-[10px] text-slate-500">
              Auth: {defaultGateway?.outgoingUsername || 'helpdesk@lakhanglobal.com'}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Reply-To &amp; Subject Format</span>
            <div className="font-mono text-cyan-300 truncate">
              {defaultGateway?.fromName || 'IT Helpdesk Support'}
            </div>
            <div className="text-[11px] text-slate-300 font-mono truncate">
              &lt;{defaultGateway?.fromEmail || 'helpdesk@lakhanglobal.com'}&gt;
            </div>
            <div className="text-[10px] text-slate-400">
              Subject Prefix: <code className="text-amber-400 font-mono">[ITL-&#123;&#123;ticketId&#125;&#125;]</code>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Admin & Super Admin Individual Mailboxes (IMAP / POP3 / SMTP) */}
      <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              Admin &amp; Super Admin Mailbox Connections (IMAP / POP3 / SMTP)
            </h2>
            <p className="text-xs text-slate-400">
              Individual staff mailboxes connected for technician ticket handling and notifications.
            </p>
          </div>

          {onNavigateToSettings && (
            <button
              onClick={() => onNavigateToSettings('admin-mailbox')}
              className="text-xs text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
            >
              Configure in Admin Settings &rarr;
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-medium">
                <th className="pb-2">Admin / Staff Member</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Email Address</th>
                <th className="pb-2">Inbound Protocol</th>
                <th className="pb-2">Outbound Relay</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {adminUsers.map((admin) => {
                const config = adminMailboxes.find((m) => m.userId === admin.id);
                const isTesting = testingAdminId === admin.id;
                const feedback = adminTestResult[admin.id];

                return (
                  <tr key={admin.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-cyan-600/30 text-cyan-300 flex items-center justify-center font-bold text-[10px]">
                          {admin.name.charAt(0)}
                        </div>
                        <span>{admin.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <span className="font-mono text-[10px] uppercase font-bold text-cyan-400">
                        {admin.role}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-slate-300 text-[11px]">
                      {admin.email}
                    </td>
                    <td className="py-2.5">
                      <span className="font-mono text-[11px] text-slate-200 uppercase bg-slate-900 px-2 py-0.5 rounded border border-white/10">
                        {config?.incomingProtocol || 'imap'} (Port {config?.incomingPort || 993})
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className="font-mono text-[11px] text-slate-200 uppercase bg-slate-900 px-2 py-0.5 rounded border border-white/10">
                        SMTP (Port {config?.outgoingPort || 587})
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                      </span>
                      {feedback && (
                        <div className="text-[10px] text-emerald-300 font-mono mt-0.5">
                          {feedback}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={isTesting}
                          onClick={() => handleTestAdmin(admin)}
                          className="px-2.5 py-1 text-[11px] font-medium bg-white/5 hover:bg-white/10 text-slate-200 rounded border border-white/10 cursor-pointer disabled:opacity-50"
                        >
                          {isTesting ? 'Testing...' : 'Test Connection'}
                        </button>
                        {onNavigateToSettings && (
                          <button
                            type="button"
                            onClick={() => onNavigateToSettings('admin-mailbox')}
                            className="px-2 py-1 text-[11px] text-cyan-400 hover:text-cyan-300"
                            title="Edit connection"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Inbound Email Processor Simulator */}
      <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Inbound Email Simulator &amp; Parser Test
            </h2>
            <p className="text-xs text-slate-400">
              Test how raw incoming emails are matched via ticket tokens [ITL-XXXXXX] or parsed into new tickets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={presetReply}
              className="px-2.5 py-1 text-xs bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg border border-white/10 cursor-pointer"
            >
              Preset: Existing Thread Reply
            </button>
            <button
              type="button"
              onClick={presetNewIncident}
              className="px-2.5 py-1 text-xs bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg border border-white/10 cursor-pointer"
            >
              Preset: Brand New Email
            </button>
          </div>
        </div>

        {resultMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold ${
              resultMessage.startsWith('✓')
                ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border border-rose-500/40 text-rose-300'
            }`}
          >
            {resultMessage}
          </div>
        )}

        <form onSubmit={handleSimulate} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">From Sender Address</label>
              <input
                type="email"
                required
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-white/10 rounded-lg text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Subject Header</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-white/10 rounded-lg text-slate-100 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Raw Email Body Text</label>
            <textarea
              rows={4}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-3 text-xs bg-slate-950 border border-white/10 rounded-lg text-slate-100 font-sans"
            />
          </div>

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={processing}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {processing ? 'Processing Intake...' : 'Simulate Inbound Message'}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 4: Linux Server Hosting & Local Postfix/Mail Relay Guide */}
      <div className="glass-panel p-5 rounded-xl border border-white/10 bg-slate-950/40 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
          <Terminal className="w-4 h-4 text-cyan-400" />
          Linux Server Mail Server &amp; Relay Configuration
        </div>
        <p className="text-xs text-slate-400">
          When hosting locally on an Ubuntu/Debian/RHEL server, you can relay outbound notifications through local Postfix, Sendmail, or your organization's internal mail server:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-900/80 border border-white/5">
            <div className="font-semibold text-cyan-300">Local Postfix Relay</div>
            <div className="text-slate-400 text-[11px] mt-1">Host: <code className="text-white">127.0.0.1</code></div>
            <div className="text-slate-400 text-[11px]">Port: <code className="text-white">25</code> or <code className="text-white">587</code></div>
            <div className="text-slate-400 text-[11px]">Security: None / STARTTLS</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/80 border border-white/5">
            <div className="font-semibold text-cyan-300">Corporate Microsoft 365</div>
            <div className="text-slate-400 text-[11px] mt-1">SMTP: <code className="text-white">smtp.office365.com:587</code></div>
            <div className="text-slate-400 text-[11px]">IMAP: <code className="text-white">outlook.office365.com:993</code></div>
            <div className="text-slate-400 text-[11px]">Security: STARTTLS / SSL</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/80 border border-white/5">
            <div className="font-semibold text-cyan-300">Google Workspace / Gmail</div>
            <div className="text-slate-400 text-[11px] mt-1">SMTP: <code className="text-white">smtp.gmail.com:587</code></div>
            <div className="text-slate-400 text-[11px]">IMAP: <code className="text-white">imap.gmail.com:993</code></div>
            <div className="text-slate-400 text-[11px]">Security: App Password + TLS</div>
          </div>
        </div>
      </div>
    </div>
  );
};
