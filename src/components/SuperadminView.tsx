import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Shield,
  Server,
  Building,
  Users,
  Database,
  Activity,
  Key,
  HardDrive,
  Clock,
  AlertTriangle,
  Search,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  ExternalLink,
  UserPlus,
  Layers,
  Grid,
  X,
  Star,
  KeyRound,
  Sliders,
  Check,
  RefreshCw,
  MessageSquare,
  Sparkles,
  Image,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Copy,
  Upload,
  Laptop,
  Mail,
  Send,
  Inbox,
} from 'lucide-react';
import { Organization, AuditLog, User as UserType, UserRole, ServiceCatalogItem, SatisfactionSurvey, SlaPolicy, DefaultEmailGatewayConfig, Ticket } from '../types';
import { api } from '../services/api';

interface SuperadminViewProps {
  organizations: Organization[];
  auditLogs: AuditLog[];
  defaultGateway?: DefaultEmailGatewayConfig;
  onSaveDefaultGateway?: (data: Partial<DefaultEmailGatewayConfig>) => Promise<any>;
  onTestDefaultGateway?: (email?: string) => Promise<any>;
  users?: UserType[];
  catalogItems?: ServiceCatalogItem[];
  stats: {
    totalOrganizations: number;
    activeTenants: number;
    totalUsers: number;
    totalTickets: number;
    totalAssets: number;
    systemUptimeHours: number;
    emailQueueHealth: string;
    backgroundWorkerStatus: string;
    databaseSizeKb: number;
  };
  onCreateOrganization?: (data: Partial<Organization>) => void;
  onUpdateOrganization?: (id: string, data: Partial<Organization>) => void;
  onDeleteOrganization?: (id: string) => void;
  onCreateAgent?: (data: Partial<UserType>) => void;
  onUpdateUser?: (id: string, data: Partial<UserType>) => void;
  onDeleteUser?: (id: string) => void;
  onCreateCatalogItem?: (data: Partial<ServiceCatalogItem>) => void;
  onUpdateCatalogItem?: (id: string, data: Partial<ServiceCatalogItem>) => void;
  onDeleteCatalogItem?: (id: string) => void;
}

export const SuperadminView: React.FC<SuperadminViewProps> = ({
  organizations,
  auditLogs,
  defaultGateway,
  onSaveDefaultGateway,
  onTestDefaultGateway,
  users = [],
  catalogItems = [],
  stats,
  onCreateOrganization,
  onUpdateOrganization,
  onDeleteOrganization,
  onCreateAgent,
  onUpdateUser,
  onDeleteUser,
  onCreateCatalogItem,
  onUpdateCatalogItem,
  onDeleteCatalogItem,
}) => {
  const [activeTab, setActiveTab] = useState<'tenants' | 'agents' | 'policies' | 'sla' | 'branding' | 'storage' | 'ratings' | 'catalogs' | 'audit' | 'system' | 'email-gateway'>('policies');
  const [searchAudit, setSearchAudit] = useState('');
  const [searchCatalog, setSearchCatalog] = useState('');

  // Default Email Gateway State (Super Admin exclusive)
  const [gwIncomingProtocol, setGwIncomingProtocol] = useState<'imap' | 'pop3'>(defaultGateway?.incomingProtocol || 'imap');
  const [gwIncomingHost, setGwIncomingHost] = useState(defaultGateway?.incomingHost || 'imap.lakhanglobal.com');
  const [gwIncomingPort, setGwIncomingPort] = useState(defaultGateway?.incomingPort || 993);
  const [gwIncomingSecurity, setGwIncomingSecurity] = useState<'ssl' | 'starttls' | 'none'>(defaultGateway?.incomingSecurity || 'ssl');
  const [gwIncomingUser, setGwIncomingUser] = useState(defaultGateway?.incomingUsername || 'helpdesk@lakhanglobal.com');
  const [gwIncomingPassword, setGwIncomingPassword] = useState(defaultGateway?.incomingPassword || 'SecureGateway@2026');
  const [showIncomingPass, setShowIncomingPass] = useState(false);

  const [gwOutgoingHost, setGwOutgoingHost] = useState(defaultGateway?.outgoingHost || 'smtp.lakhanglobal.com');
  const [gwOutgoingPort, setGwOutgoingPort] = useState(defaultGateway?.outgoingPort || 587);
  const [gwOutgoingSecurity, setGwOutgoingSecurity] = useState<'ssl' | 'starttls' | 'none'>(defaultGateway?.outgoingSecurity || 'starttls');
  const [gwOutgoingUser, setGwOutgoingUser] = useState(defaultGateway?.outgoingUsername || 'helpdesk@lakhanglobal.com');
  const [gwOutgoingPassword, setGwOutgoingPassword] = useState(defaultGateway?.outgoingPassword || 'SecureGateway@2026');
  const [showOutgoingPass, setShowOutgoingPass] = useState(false);

  const [gwFromName, setGwFromName] = useState(defaultGateway?.fromName || 'IT Helpdesk Support');
  const [gwFromEmail, setGwFromEmail] = useState(defaultGateway?.fromEmail || 'helpdesk@lakhanglobal.com');
  const [gwReplyToEmail, setGwReplyToEmail] = useState(defaultGateway?.replyToEmail || 'helpdesk@lakhanglobal.com');
  const [gwSubjectPrefix, setGwSubjectPrefix] = useState(defaultGateway?.subjectPrefix || '[ITL-{{ticketId}}]');

  const [gwSaving, setGwSaving] = useState(false);
  const [gwTesting, setGwTesting] = useState(false);
  const [gwTestResult, setGwTestResult] = useState<{ success: boolean; message: string; testedAt?: string } | null>(null);
  const [gwTestEmail, setGwTestEmail] = useState('admin@lakhanglobal.com');
  const [gwSuccessMsg, setGwSuccessMsg] = useState<string | null>(null);
  const [gwErrorMsg, setGwErrorMsg] = useState<string | null>(null);

  // Super Admin Inbound Simulator State
  const [simFromEmail, setSimFromEmail] = useState('user.ticket@company.com');
  const [simSubject, setSimSubject] = useState('Urgent: Unable to access production database cluster');
  const [simBody, setSimBody] = useState('Hi Helpdesk Team,\n\nI am experiencing connection timeouts accessing our cluster. Please advise.\n\nThanks,\nEngineering Team');
  const [simCc, setSimCc] = useState('');
  const [simManagerEmail, setSimManagerEmail] = useState('');
  const [simSubmitting, setSimSubmitting] = useState(false);
  const [simResult, setSimResult] = useState<{ mode: string; ticket: Ticket; comment?: any } | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultGateway) {
      setGwIncomingProtocol(defaultGateway.incomingProtocol || 'imap');
      setGwIncomingHost(defaultGateway.incomingHost || 'imap.lakhanglobal.com');
      setGwIncomingPort(defaultGateway.incomingPort || 993);
      setGwIncomingSecurity(defaultGateway.incomingSecurity || 'ssl');
      setGwIncomingUser(defaultGateway.incomingUsername || 'helpdesk@lakhanglobal.com');
      if (defaultGateway.incomingPassword) setGwIncomingPassword(defaultGateway.incomingPassword);

      setGwOutgoingHost(defaultGateway.outgoingHost || 'smtp.lakhanglobal.com');
      setGwOutgoingPort(defaultGateway.outgoingPort || 587);
      setGwOutgoingSecurity(defaultGateway.outgoingSecurity || 'starttls');
      setGwOutgoingUser(defaultGateway.outgoingUsername || 'helpdesk@lakhanglobal.com');
      if (defaultGateway.outgoingPassword) setGwOutgoingPassword(defaultGateway.outgoingPassword);

      setGwFromName(defaultGateway.fromName || 'IT Helpdesk Support');
      setGwFromEmail(defaultGateway.fromEmail || 'helpdesk@lakhanglobal.com');
      setGwReplyToEmail(defaultGateway.replyToEmail || 'helpdesk@lakhanglobal.com');
      setGwSubjectPrefix(defaultGateway.subjectPrefix || '[ITL-{{ticketId}}]');
    } else {
      api.getDefaultGatewayConfig().then((cfg) => {
        if (cfg) {
          setGwIncomingProtocol(cfg.incomingProtocol || 'imap');
          setGwIncomingHost(cfg.incomingHost || 'imap.lakhanglobal.com');
          setGwIncomingPort(cfg.incomingPort || 993);
          setGwIncomingSecurity(cfg.incomingSecurity || 'ssl');
          setGwIncomingUser(cfg.incomingUsername || 'helpdesk@lakhanglobal.com');
          if (cfg.incomingPassword) setGwIncomingPassword(cfg.incomingPassword);

          setGwOutgoingHost(cfg.outgoingHost || 'smtp.lakhanglobal.com');
          setGwOutgoingPort(cfg.outgoingPort || 587);
          setGwOutgoingSecurity(cfg.outgoingSecurity || 'starttls');
          setGwOutgoingUser(cfg.outgoingUsername || 'helpdesk@lakhanglobal.com');
          if (cfg.outgoingPassword) setGwOutgoingPassword(cfg.outgoingPassword);

          setGwFromName(cfg.fromName || 'IT Helpdesk Support');
          setGwFromEmail(cfg.fromEmail || 'helpdesk@lakhanglobal.com');
          setGwReplyToEmail(cfg.replyToEmail || 'helpdesk@lakhanglobal.com');
          setGwSubjectPrefix(cfg.subjectPrefix || '[ITL-{{ticketId}}]');
        }
      }).catch(() => {});
    }
  }, [defaultGateway]);
  const [searchTenant, setSearchTenant] = useState('');
  const [searchAgent, setSearchAgent] = useState('');
  const [searchRating, setSearchRating] = useState('');

  // Global System Settings State
  const [systemSettingsState, setSystemSettingsState] = useState<{
    requireOtpForTicketSubmission: boolean;
    enableTicketRating: boolean;
    enableCategoryAutoAssign: boolean;
    allowRequesterAssetSelfService?: boolean;
    defaultCurrency?: string;
    categoryAutoAssignRules: Record<string, { technicianId: string; technicianName: string }>;
  }>({
    requireOtpForTicketSubmission: false,
    enableTicketRating: true,
    enableCategoryAutoAssign: true,
    allowRequesterAssetSelfService: true,
    defaultCurrency: '₹',
    categoryAutoAssignRules: {
      'Hardware & Workstations': { technicianId: 'usr-lakhan-super', technicianName: 'Lakhan Verma' },
      'Software & Cloud Apps': { technicianId: 'usr-lakhan-super', technicianName: 'Lakhan Verma' },
      'Network & Connectivity': { technicianId: 'usr-lakhan-super', technicianName: 'Lakhan Verma' },
      'Security & Access': { technicianId: 'usr-lakhan-super', technicianName: 'Lakhan Verma' },
    },
  });

  const [surveys, setSurveys] = useState<SatisfactionSurvey[]>([]);
  const [surveyToDelete, setSurveyToDelete] = useState<SatisfactionSurvey | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  // Live Engine & Hosting Diagnostics State
  const [liveSystemStatus, setLiveSystemStatus] = useState<any>(null);
  const [systemLoading, setSystemLoading] = useState(false);

  const fetchLiveSystemStatus = React.useCallback(async () => {
    try {
      const res = await api.getSystemStatus();
      if (res) setLiveSystemStatus(res);
    } catch (err) {
      console.error('Failed fetching live system status:', err);
    }
  }, []);

  // Super Admin Managed SLA Policies State
  const [slaList, setSlaList] = useState<SlaPolicy[]>([]);
  const [editingSlaPolicy, setEditingSlaPolicy] = useState<SlaPolicy | null>(null);
  const [slaUrgentHours, setSlaUrgentHours] = useState(4);
  const [slaHighHours, setSlaHighHours] = useState(8);
  const [slaMediumHours, setSlaMediumHours] = useState(24);
  const [slaLowHours, setSlaLowHours] = useState(48);
  const [slaFirstResponseHours, setSlaFirstResponseHours] = useState(1);
  const [slaBusinessHoursOnly, setSlaBusinessHoursOnly] = useState(true);
  const [slaEscalationManagerId, setSlaEscalationManagerId] = useState('usr-lakhan-super');
  const [slaSaving, setSlaSaving] = useState(false);

  // Super Admin Branding & Logo Customization State
  const primaryOrg = organizations[0];
  const [brandingLogoUrl, setBrandingLogoUrl] = useState(primaryOrg?.branding?.logoUrl || '');
  const [brandingLogoLoadError, setBrandingLogoLoadError] = useState(false);
  const [brandingLogoTemplate, setBrandingLogoTemplate] = useState<'round' | 'square' | 'rectangle'>(
    primaryOrg?.branding?.logoTemplate || 'rectangle'
  );
  const [brandingLogoWidth, setBrandingLogoWidth] = useState<number>(primaryOrg?.branding?.logoWidth || 200);
  const [brandingLogoHeight, setBrandingLogoHeight] = useState<number>(primaryOrg?.branding?.logoHeight || 80);
  const [brandingProductName, setBrandingProductName] = useState(primaryOrg?.branding?.productName || primaryOrg?.name || 'IT Helpdesk by Lakhan');
  const [brandingSubtitle, setBrandingSubtitle] = useState((primaryOrg?.branding as any)?.subtitle || 'Enterprise Support');
  const [brandingSupportEmail, setBrandingSupportEmail] = useState(primaryOrg?.branding?.supportEmail || 'helpdesk@lakhanglobal.com');
  const [brandingWelcomeMsg, setBrandingWelcomeMsg] = useState(primaryOrg?.branding?.portalWelcome || 'Welcome to the 24/7 IT Enterprise Support Desk.');
  const [brandingSaving, setBrandingSaving] = useState(false);

  useEffect(() => {
    if (primaryOrg) {
      if (primaryOrg.branding?.logoUrl !== undefined) {
        setBrandingLogoUrl(primaryOrg.branding.logoUrl || '');
      }
      if (primaryOrg.branding?.logoTemplate) {
        setBrandingLogoTemplate(primaryOrg.branding.logoTemplate);
      }
      if (primaryOrg.branding?.logoWidth) {
        setBrandingLogoWidth(primaryOrg.branding.logoWidth);
      }
      if (primaryOrg.branding?.logoHeight) {
        setBrandingLogoHeight(primaryOrg.branding.logoHeight);
      }
      if (primaryOrg.branding?.productName) {
        setBrandingProductName(primaryOrg.branding.productName);
      }
      if (primaryOrg.branding?.supportEmail) {
        setBrandingSupportEmail(primaryOrg.branding.supportEmail);
      }
      if (primaryOrg.branding?.portalWelcome) {
        setBrandingWelcomeMsg(primaryOrg.branding.portalWelcome);
      }
    }
  }, [primaryOrg]);

  useEffect(() => {
    setBrandingLogoLoadError(false);
  }, [brandingLogoUrl]);

  // Super Admin Ticket Purge / Storage Cleanup State
  const [purgeStartDate, setPurgeStartDate] = useState('');
  const [purgeEndDate, setPurgeEndDate] = useState('');
  const [purgeStatusFilter, setPurgeStatusFilter] = useState<'all' | 'resolved_closed'>('resolved_closed');
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeConfirmOpen, setPurgeConfirmOpen] = useState(false);
  const [purgeResult, setPurgeResult] = useState<{
    success: boolean;
    deletedCount: number;
    remainingCount: number;
    freedKbEstimate: number;
    message: string;
  } | null>(null);

  // Tab horizontal scroll ref (Point 1)
  const tabsScrollRef = React.useRef<HTMLDivElement>(null);

  // Pre-Shared Key (PSK) Configuration State (Point 3)
  const [pskValue, setPskValue] = useState(primaryOrg?.systemSettings?.preSharedKey || 'Sports@9433');
  const [pskVisible, setPskVisible] = useState(false);
  const [pskSaving, setPskSaving] = useState(false);
  const [pskCopied, setPskCopied] = useState(false);

  // Load system settings, surveys, and SLA policies on mount
  useEffect(() => {
    api.getSystemSettings().then((s) => {
      if (s) {
        setSystemSettingsState(s);
        if (s.preSharedKey) {
          setPskValue(s.preSharedKey);
        }
      }
    }).catch(console.error);

    api.getSurveys().then((sv) => {
      if (sv) setSurveys(sv);
    }).catch(console.error);

    api.getSlaPolicies().then((policies) => {
      if (policies && policies.length > 0) {
        setSlaList(policies);
        const urgentP = policies.find((p) => p.priority === 'urgent' || p.priority === 'critical');
        const highP = policies.find((p) => p.priority === 'high');
        const normalP = policies.find((p) => p.priority === 'normal');
        const lowP = policies.find((p) => p.priority === 'low');

        if (urgentP) {
          setSlaUrgentHours(Math.round(urgentP.resolutionMinutes / 60) || 4);
          setSlaFirstResponseHours(Math.round(urgentP.firstResponseMinutes / 60) || 1);
          setSlaBusinessHoursOnly(urgentP.businessHoursOnly);
        }
        if (highP) setSlaHighHours(Math.round(highP.resolutionMinutes / 60) || 8);
        if (normalP) setSlaMediumHours(Math.round(normalP.resolutionMinutes / 60) || 24);
        if (lowP) setSlaLowHours(Math.round(lowP.resolutionMinutes / 60) || 48);
        setEditingSlaPolicy(policies[0]);
      }
    }).catch(console.error);

    fetchLiveSystemStatus();
    const statusInterval = setInterval(fetchLiveSystemStatus, 8000);
    return () => clearInterval(statusInterval);
  }, [fetchLiveSystemStatus]);

  const handleSavePsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pskValue.trim()) {
      setSettingsSuccess('⚠️ Pre-Shared Key cannot be empty.');
      setTimeout(() => setSettingsSuccess(null), 3500);
      return;
    }
    setPskSaving(true);
    try {
      await api.updateSystemSettings({ preSharedKey: pskValue.trim() });
      setSettingsSuccess('Pre-Shared Key (PSK) updated successfully! Users can now use this key to set passwords.');
      setTimeout(() => setSettingsSuccess(null), 3500);
    } catch (err: any) {
      setSettingsSuccess(`Error: ${err.message || 'Failed updating Pre-Shared Key'}`);
      setTimeout(() => setSettingsSuccess(null), 4000);
    } finally {
      setPskSaving(false);
    }
  };

  const handleGeneratePsk = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let generated = 'Helpdesk@';
    for (let i = 0; i < 6; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    generated += '!2026';
    setPskValue(generated);
  };

  const handleCopyPsk = () => {
    navigator.clipboard.writeText(pskValue);
    setPskCopied(true);
    setTimeout(() => setPskCopied(false), 2500);
  };

  const handleToggleOtp = async () => {
    const updated = {
      ...systemSettingsState,
      requireOtpForTicketSubmission: !systemSettingsState.requireOtpForTicketSubmission,
    };
    setSystemSettingsState(updated);
    await api.updateSystemSettings({ requireOtpForTicketSubmission: updated.requireOtpForTicketSubmission });
    setSettingsSuccess(`Ticket OTP verification is now ${updated.requireOtpForTicketSubmission ? 'ENABLED (Mandatory OTP)' : 'DISABLED (Direct / No OTP)'}`);
    setTimeout(() => setSettingsSuccess(null), 3000);
  };

  const handleToggleRating = async () => {
    const updated = {
      ...systemSettingsState,
      enableTicketRating: !systemSettingsState.enableTicketRating,
    };
    setSystemSettingsState(updated);
    await api.updateSystemSettings({ enableTicketRating: updated.enableTicketRating });
    setSettingsSuccess(`Ticket Satisfaction Rating is now ${updated.enableTicketRating ? 'ENABLED' : 'DISABLED'}`);
    setTimeout(() => setSettingsSuccess(null), 3000);
  };

  const handleToggleAutoAssign = async () => {
    const updated = {
      ...systemSettingsState,
      enableCategoryAutoAssign: !systemSettingsState.enableCategoryAutoAssign,
    };
    setSystemSettingsState(updated);
    await api.updateSystemSettings({ enableCategoryAutoAssign: updated.enableCategoryAutoAssign });
    setSettingsSuccess(`Category Auto-Assignment is now ${updated.enableCategoryAutoAssign ? 'ENABLED' : 'DISABLED'}`);
    setTimeout(() => setSettingsSuccess(null), 3000);
  };

  const handleToggleRequesterAssetSelfService = async () => {
    const nextVal = systemSettingsState.allowRequesterAssetSelfService === false ? true : false;
    const updated = {
      ...systemSettingsState,
      allowRequesterAssetSelfService: nextVal,
    };
    setSystemSettingsState(updated);
    try {
      await api.updateSystemSettings({ allowRequesterAssetSelfService: nextVal });
      setSettingsSuccess(`Requester Asset Self-Service (Add/Remove) is now ${nextVal ? 'ENABLED' : 'DISABLED'}`);
      setTimeout(() => setSettingsSuccess(null), 3000);
    } catch (err: any) {
      setSettingsSuccess(`Error: ${err.message || 'Failed to update system settings'}`);
      setTimeout(() => setSettingsSuccess(null), 4000);
    }
  };

  const handleUpdateCategoryRule = async (cat: string, techId: string) => {
    const tech = users.find((u) => u.id === techId);
    if (!tech) return;
    const newRules = {
      ...systemSettingsState.categoryAutoAssignRules,
      [cat]: { technicianId: tech.id, technicianName: tech.name },
    };
    const updated = { ...systemSettingsState, categoryAutoAssignRules: newRules };
    setSystemSettingsState(updated);
    await api.updateSystemSettings({ categoryAutoAssignRules: newRules });
    setSettingsSuccess(`Auto-assign rule for "${cat}" set to ${tech.name}`);
    setTimeout(() => setSettingsSuccess(null), 3000);
  };

  const handleUpdateDefaultCurrency = async (newCurrency: string) => {
    const updated = {
      ...systemSettingsState,
      defaultCurrency: newCurrency,
    };
    setSystemSettingsState(updated);
    try {
      await api.updateSystemSettings({ defaultCurrency: newCurrency });
      setSettingsSuccess(`Default currency updated to ${newCurrency}! Automatically applied across all IT Assets & CMDB.`);
      setTimeout(() => setSettingsSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed updating default currency');
    }
  };

  const handleDeleteSurvey = async (id: string) => {
    await api.deleteSurvey(id);
    setSurveys((prev) => prev.filter((s) => s.id !== id));
    setSurveyToDelete(null);
  };

  const handleSaveSlaPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlaSaving(true);
    try {
      for (const policy of slaList) {
        let resM = slaMediumHours * 60;
        let respM = slaFirstResponseHours * 60;
        if (policy.priority === 'urgent' || policy.priority === 'critical') {
          resM = slaUrgentHours * 60;
          respM = slaFirstResponseHours * 60;
        } else if (policy.priority === 'high') {
          resM = slaHighHours * 60;
          respM = slaFirstResponseHours * 2 * 60;
        } else if (policy.priority === 'normal') {
          resM = slaMediumHours * 60;
          respM = slaFirstResponseHours * 4 * 60;
        } else if (policy.priority === 'low') {
          resM = slaLowHours * 60;
          respM = slaFirstResponseHours * 8 * 60;
        }

        await api.updateSlaPolicy(policy.id, {
          firstResponseMinutes: respM,
          resolutionMinutes: resM,
          businessHoursOnly: slaBusinessHoursOnly,
        });
      }
      const refreshed = await api.getSlaPolicies();
      setSlaList(refreshed);
      setSettingsSuccess('SLA Policy & Target Timers updated! New deadlines will be enforced automatically.');
      setTimeout(() => setSettingsSuccess(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed updating SLA policy');
    } finally {
      setSlaSaving(false);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryOrg) return;
    setBrandingSaving(true);
    try {
      const brandingPayload = {
        branding: {
          ...primaryOrg.branding,
          logoUrl: brandingLogoUrl.trim() || undefined,
          logoTemplate: brandingLogoTemplate,
          logoWidth: Number(brandingLogoWidth) || 200,
          logoHeight: Number(brandingLogoHeight) || 80,
          productName: brandingProductName.trim(),
          subtitle: brandingSubtitle.trim() || 'Enterprise Support',
          supportEmail: brandingSupportEmail.trim(),
          portalWelcome: brandingWelcomeMsg.trim(),
          portalTitle: brandingProductName.trim(),
        },
      };
      if (onUpdateOrganization) {
        await onUpdateOrganization(primaryOrg.id, brandingPayload);
      } else {
        await api.updateOrganization(primaryOrg.id, brandingPayload);
      }
      setSettingsSuccess('Branding customized! Logo, product name, and support portal updated.');
      setTimeout(() => setSettingsSuccess(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed saving branding settings');
    } finally {
      setBrandingSaving(false);
    }
  };

  const handleExecutePurge = async () => {
    if (!purgeStartDate || !purgeEndDate) {
      alert('Please select both Start Date and End Date for the ticket purge.');
      return;
    }
    setPurgeLoading(true);
    try {
      const res = await api.purgeOldTickets({
        startDate: purgeStartDate,
        endDate: purgeEndDate,
        statusFilter: purgeStatusFilter,
      });
      setPurgeResult(res);
      setPurgeConfirmOpen(false);
      setSettingsSuccess(`Storage freed! Permanently purged ${res.deletedCount} tickets (${res.freedKbEstimate} KB reclaimed).`);
      setTimeout(() => setSettingsSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed purging tickets');
    } finally {
      setPurgeLoading(false);
    }
  };

  const handleSaveDefaultGatewayConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setGwSaving(true);
    setGwSuccessMsg(null);
    setGwErrorMsg(null);
    try {
      const payload: Partial<DefaultEmailGatewayConfig> = {
        incomingProtocol: gwIncomingProtocol,
        incomingHost: gwIncomingHost.trim(),
        incomingPort: Number(gwIncomingPort),
        incomingSecurity: gwIncomingSecurity,
        incomingUsername: gwIncomingUser.trim(),
        incomingPassword: gwIncomingPassword,
        outgoingProtocol: 'smtp',
        outgoingHost: gwOutgoingHost.trim(),
        outgoingPort: Number(gwOutgoingPort),
        outgoingSecurity: gwOutgoingSecurity,
        outgoingUsername: gwOutgoingUser.trim(),
        outgoingPassword: gwOutgoingPassword,
        fromName: gwFromName.trim(),
        fromEmail: gwFromEmail.trim(),
        replyToEmail: gwReplyToEmail.trim(),
        subjectPrefix: gwSubjectPrefix.trim(),
      };
      if (onSaveDefaultGateway) {
        await onSaveDefaultGateway(payload);
      } else {
        await api.saveDefaultGatewayConfig(payload);
      }
      setGwSuccessMsg('Default email support & poller gateway settings saved! All ticket replies and automated intake will use these parameters.');
      setTimeout(() => setGwSuccessMsg(null), 4000);
    } catch (err: any) {
      setGwErrorMsg(err.message || 'Failed saving default email gateway');
    } finally {
      setGwSaving(false);
    }
  };

  const handleTestDefaultGatewayConnection = async () => {
    setGwTesting(true);
    setGwTestResult(null);
    setGwErrorMsg(null);
    try {
      const res = onTestDefaultGateway
        ? await onTestDefaultGateway(gwTestEmail.trim())
        : await api.testDefaultGateway(gwTestEmail.trim());
      setGwTestResult({
        success: true,
        message: res.message || `Handshake test successful! Outbound SMTP dispatch verified to ${gwTestEmail.trim()}.`,
        testedAt: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      setGwTestResult({
        success: false,
        message: err.message || 'Connection test failed. Please verify credentials and server ports.',
        testedAt: new Date().toLocaleTimeString(),
      });
    } finally {
      setGwTesting(false);
    }
  };

  const handleSimulateInboundSuperadmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simFromEmail || !simSubject || !simBody) {
      setSimError('Sender Email, Subject, and Body are required.');
      return;
    }
    setSimSubmitting(true);
    setSimError(null);
    try {
      const res = await api.simulateInboundEmail(
        simFromEmail.trim(),
        simSubject.trim(),
        simBody.trim(),
        simCc.trim() || undefined,
        simManagerEmail.trim() || undefined
      );
      setSimResult(res);
    } catch (err: any) {
      setSimError(err.message || 'Failed to simulate email intake.');
    } finally {
      setSimSubmitting(false);
    }
  };

  // Modals
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<UserType | null>(null);
  const [catalogToEdit, setCatalogToEdit] = useState<ServiceCatalogItem | null>(null);
  const [catalogToDelete, setCatalogToDelete] = useState<ServiceCatalogItem | null>(null);

  // Catalog Form state
  const [catTitle, setCatTitle] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catCategory, setCatCategory] = useState('Hardware & Workstations');
  const [catIcon, setCatIcon] = useState('Laptop');
  const [catHours, setCatHours] = useState(24);
  const [catApproval, setCatApproval] = useState(false);
  const [catPriority, setCatPriority] = useState<any>('normal');

  // New Organization form state
  const [orgName, setOrgName] = useState('');
  const [orgDomain, setOrgDomain] = useState('');
  const [orgPlan, setOrgPlan] = useState<'starter' | 'professional' | 'enterprise'>('professional');
  const [orgStorageMb, setOrgStorageMb] = useState(500);

  // New Agent form state
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentRole, setAgentRole] = useState<UserRole>('technician');
  const [agentTitle, setAgentTitle] = useState('IT Support Specialist');
  const [agentPhone, setAgentPhone] = useState('');
  const [agentOrgId, setAgentOrgId] = useState(organizations[0]?.id || '');

  // Filtered lists
  const filteredOrganizations = organizations.filter((org) => {
    if (!searchTenant) return true;
    const q = searchTenant.toLowerCase();
    return org.name.toLowerCase().includes(q) || org.domain.toLowerCase().includes(q) || org.id.toLowerCase().includes(q);
  });

  const agentsList = users.filter((u) => u.role === 'technician' || u.role === 'manager' || u.role === 'admin' || u.role === 'superadmin');
  const filteredAgents = agentsList.filter((a) => {
    if (!searchAgent) return true;
    const q = searchAgent.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.title && a.title.toLowerCase().includes(q)) ||
      a.role.toLowerCase().includes(q)
    );
  });

  const filteredLogs = auditLogs.filter((log) => {
    if (!searchAudit) return true;
    const q = searchAudit.toLowerCase();
    return (
      log.actorName.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.entityId.toLowerCase().includes(q)
    );
  });

  const handleCreateOrgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !orgDomain || !onCreateOrganization) return;
    onCreateOrganization({
      name: orgName,
      domain: orgDomain,
      plan: orgPlan,
      storageUsedMb: Number(orgStorageMb),
    });
    setShowOrgModal(false);
    setOrgName('');
    setOrgDomain('');
  };

  const handleCreateAgentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName || !agentEmail || !onCreateAgent) return;
    onCreateAgent({
      name: agentName,
      email: agentEmail,
      role: agentRole,
      title: agentTitle,
      phone: agentPhone,
      organizationId: agentOrgId || organizations[0]?.id,
    });
    setShowAgentModal(false);
    setAgentName('');
    setAgentEmail('');
    setAgentPhone('');
  };

  return (
    <div className="space-y-6">
      {/* Delete Org Modal */}
      {orgToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-modal max-w-md w-full p-6 rounded-2xl border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Organization</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Permanently remove tenant and its workspaces</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300">
              Are you sure you want to permanently delete organization <span className="font-semibold text-slate-900 dark:text-white">&ldquo;{orgToDelete.name}&rdquo;</span> ({orgToDelete.domain})? This cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setOrgToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteOrganization) {
                    onDeleteOrganization(orgToDelete.id);
                    setOrgToDelete(null);
                  }
                }}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white bg-rose-600 hover:bg-rose-500 shadow-sm transition-all cursor-pointer"
              >
                Yes, Delete Organization
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Agent Modal */}
      {agentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-modal max-w-md w-full p-6 rounded-2xl border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Remove Support Agent</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Revoke permissions and delete agent profile</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300">
              Are you sure you want to remove agent <span className="font-semibold text-slate-900 dark:text-white">&ldquo;{agentToDelete.name}&rdquo;</span> ({agentToDelete.email}) with role <span className="font-mono text-cyan-600 dark:text-cyan-400">[{agentToDelete.role}]</span>?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAgentToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (agentToDelete?.role === 'superadmin') {
                    alert('Super Admin accounts are permanently protected system identities and cannot be deleted by anyone.');
                    setAgentToDelete(null);
                    return;
                  }
                  if (onDeleteUser && agentToDelete) {
                    onDeleteUser(agentToDelete.id);
                    setAgentToDelete(null);
                  }
                }}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white bg-rose-600 hover:bg-rose-500 shadow-sm transition-all cursor-pointer"
              >
                Yes, Remove Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          Superadmin Platform Management Console
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Create &amp; delete organizations, manage support agents/technicians, inspect audit logs, and monitor server health.
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Customer Tenants</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {stats.totalOrganizations}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400">All tenants operational</div>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Support Agents</div>
          <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 font-mono tabular-nums">
            {agentsList.length}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Technicians, managers &amp; admins</div>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Platform Uptime</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {stats.systemUptimeHours}h
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">99.98% Service Availability</div>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-1">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Database Persistence</div>
          <div className="text-2xl font-bold text-violet-600 dark:text-violet-400 font-mono tabular-nums">
            {stats.databaseSizeKb} KB
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Atomic file-backed JSON store</div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {settingsSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{settingsSuccess}</span>
        </div>
      )}

      {/* POINT 1: Segmented Tabs Navigation with Smooth Horizontal Scrolling Controls */}
      <div className="relative w-full max-w-full neu-flat rounded-2xl border border-slate-200 dark:border-white/10 p-1.5 shadow-sm overflow-hidden flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            tabsScrollRef.current?.scrollBy({ left: -220, behavior: 'smooth' });
          }}
          className="p-1.5 rounded-xl neu-btn text-slate-600 dark:text-slate-300 hover:text-cyan-600 shrink-0 cursor-pointer flex items-center justify-center"
          title="Scroll tabs left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={tabsScrollRef}
          className="flex-1 flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-1 px-1 scroll-smooth min-w-0"
        >
          <button
            onClick={() => setActiveTab('policies')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'policies'
                ? 'neu-pressed bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/40 shadow-inner'
                : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-violet-700 dark:hover:text-violet-300'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span>Policies &amp; Toggles</span>
          </button>
          <button
            onClick={() => setActiveTab('sla')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'sla'
                ? 'neu-pressed bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-inner'
                : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>SLA Timers (Superadmin)</span>
          </button>
          <button
            onClick={() => setActiveTab('branding')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'branding'
                ? 'neu-pressed bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-inner'
                : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Branding &amp; Logo</span>
          </button>
          <button
            onClick={() => setActiveTab('email-gateway')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'email-gateway'
                ? 'neu-pressed bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-inner'
                : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Email Gateway (POP3/IMAP/SMTP)</span>
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'storage'
                ? 'neu-pressed bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40 shadow-inner'
                : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-300'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-rose-500" />
            <span>Purge Old Tickets</span>
          </button>
          <button
            onClick={() => setActiveTab('ratings')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'ratings'
                ? 'neu-pressed bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-inner'
                : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-300'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>CSAT Ratings ({surveys.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('agents')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'agents'
                ? 'neu-pressed bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-inner'
                : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff &amp; Technicians ({agentsList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('tenants')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'tenants'
                ? 'neu-pressed bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/40 shadow-inner'
                : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-violet-700 dark:hover:text-violet-300'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Organizations ({organizations.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('catalogs')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'catalogs'
                ? 'neu-pressed bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/40 shadow-inner'
                : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Service Catalogs ({catalogItems.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'audit'
                ? 'neu-pressed bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shadow-inner'
                : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Security Audit Trail ({auditLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === 'system'
                ? 'neu-pressed bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-inner'
                : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Engine &amp; Hosting Diagnostics</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            tabsScrollRef.current?.scrollBy({ left: 220, behavior: 'smooth' });
          }}
          className="p-1.5 rounded-xl neu-btn text-slate-600 dark:text-slate-300 hover:text-cyan-600 shrink-0 cursor-pointer flex items-center justify-center"
          title="Scroll tabs right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ============================================================= */}
      {/* TAB: Global Policies, OTP, Ratings & Category Auto-Assign     */}
      {/* ============================================================= */}
      {activeTab === 'policies' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                Global Helpdesk Governance &amp; Automation Toggles
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Configure ticket generation OTP enforcement, customer satisfaction rating systems, and category-based auto dispatching.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Toggle Card 1: Ticket Submission OTP Verification */}
            <div className="neu-flat p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Ticket Submission OTP Verification
                    </h3>
                    <span className="text-[10px] text-slate-500 font-medium">Authentication &amp; Fraud Prevention</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleOtp}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    systemSettingsState.requireOtpForTicketSubmission ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  role="switch"
                  aria-checked={systemSettingsState.requireOtpForTicketSubmission}
                  title="Toggle OTP Verification"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      systemSettingsState.requireOtpForTicketSubmission ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                Controls whether normal users and portal guests can submit tickets directly without verification, or must confirm ownership of their email address using a 6-digit OTP code before ticket creation.
              </p>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-600 dark:text-slate-400">Current Status:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    systemSettingsState.requireOtpForTicketSubmission
                      ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
                  }`}
                >
                  {systemSettingsState.requireOtpForTicketSubmission
                    ? 'OTP VERIFICATION MANDATORY (ON)'
                    : 'DIRECT / NO OTP REQUIRED (DEFAULT - OFF)'}
                </span>
              </div>
            </div>

            {/* Toggle Card 2: Ticket Satisfaction Rating (CSAT) */}
            <div className="neu-flat p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      End-User Ticket Satisfaction Rating (CSAT)
                    </h3>
                    <span className="text-[10px] text-slate-500 font-medium">Customer Feedback &amp; Quality Metrics</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleRating}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    systemSettingsState.enableTicketRating ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  role="switch"
                  aria-checked={systemSettingsState.enableTicketRating}
                  title="Toggle Satisfaction Ratings"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      systemSettingsState.enableTicketRating ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                Enables or disables 1-to-5 star satisfaction feedback on resolved tickets. When active, requesters can submit survey reviews and comments directly from their user portal.
              </p>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-600 dark:text-slate-400">Current Status:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    systemSettingsState.enableTicketRating
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {systemSettingsState.enableTicketRating
                    ? 'CSAT RATINGS ENABLED (ON)'
                    : 'RATINGS DISABLED (OFF)'}
                </span>
              </div>
            </div>
          </div>

          {/* Toggle Card 3 & Matrix: Category-Based Ticket Auto-Assignment */}
          <div className="neu-flat p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Category-Based Automatic Ticket Assignment
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Automatically dispatch incoming tickets to specialized technicians and team queues based on the selected category.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
                  {systemSettingsState.enableCategoryAutoAssign ? 'AUTO-ROUTING ACTIVE' : 'UNASSIGNED QUEUE'}
                </span>
                <button
                  type="button"
                  onClick={handleToggleAutoAssign}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    systemSettingsState.enableCategoryAutoAssign ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  role="switch"
                  aria-checked={systemSettingsState.enableCategoryAutoAssign}
                  title="Toggle Category Auto-Assignment"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      systemSettingsState.enableCategoryAutoAssign ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Category Auto-Assignment Rules Matrix */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Category Routing Rules
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { category: 'Hardware & Workstations', defaultTech: 'usr-lakhan-super' },
                  { category: 'Software & Cloud Apps', defaultTech: 'usr-lakhan-super' },
                  { category: 'Network & Connectivity', defaultTech: 'usr-lakhan-super' },
                  { category: 'Security & Access', defaultTech: 'usr-lakhan-super' },
                  { category: 'User Accounts & Access', defaultTech: 'usr-lakhan-super' },
                  { category: 'AV & Conference Rooms', defaultTech: 'usr-lakhan-super' },
                ].map((item) => {
                  const currentRule = systemSettingsState.categoryAutoAssignRules?.[item.category];
                  const assignedTechId = currentRule?.technicianId || item.defaultTech;
                  return (
                    <div
                      key={item.category}
                      className="p-3 rounded-xl neu-card bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{item.category}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold">
                          Rule Active
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 shrink-0">Assign to:</span>
                        <select
                          value={assignedTechId}
                          onChange={(e) => handleUpdateCategoryRule(item.category, e.target.value)}
                          disabled={!systemSettingsState.enableCategoryAutoAssign}
                          className="flex-1 px-2.5 py-1 text-xs neu-select bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium disabled:opacity-50 cursor-pointer"
                        >
                          {agentsList.map((agent) => (
                            <option key={agent.id} value={agent.id}>
                              {agent.name} ({agent.role.toUpperCase()})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DEFAULT CURRENCY CONFIGURATION CARD (SUPER ADMIN EXCLUSIVE) */}
            <div className="neu-flat p-5 rounded-2xl border border-cyan-500/30 bg-cyan-50/20 dark:bg-cyan-950/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 flex items-center justify-center min-w-[40px] h-10">
                    <span className="font-mono text-xl font-extrabold">{systemSettingsState.defaultCurrency || '₹'}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Default IT Asset Currency (CMDB Valuation)
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 font-bold border border-cyan-300">
                        Default: Rupee (₹ INR)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Configure the default valuation currency across Hardware &amp; IT Assets CMDB, asset purchase costing, and KPI decks.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { symbol: '₹', label: 'Rupee (₹ INR - Default)', desc: 'Indian Rupee' },
                  { symbol: '$', label: 'Dollar ($ USD)', desc: 'US Dollar' },
                  { symbol: '€', label: 'Euro (€ EUR)', desc: 'European Euro' },
                  { symbol: '£', label: 'Pound (£ GBP)', desc: 'British Pound' },
                ].map((cur) => {
                  const isSelected = (systemSettingsState.defaultCurrency || '₹') === cur.symbol;
                  return (
                    <button
                      key={cur.symbol}
                      type="button"
                      onClick={() => handleUpdateDefaultCurrency(cur.symbol)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-cyan-500 ring-2 ring-cyan-500/20 neu-pressed bg-cyan-50 dark:bg-cyan-950/40'
                          : 'border-slate-200 dark:border-white/10 hover:border-cyan-400/50 neu-btn'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-extrabold font-mono text-cyan-700 dark:text-cyan-300">{cur.symbol}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">{cur.desc}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{cur.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* REQUESTER ASSET SELF-SERVICE TOGGLE CARD (SUPER ADMIN CONSOLE) */}
            <div className="neu-flat p-5 rounded-2xl border border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Requester Portal Asset Self-Service (Add &amp; Remove Feature)
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold border border-emerald-300">
                        {systemSettingsState.allowRequesterAssetSelfService !== false ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Control whether employees and requesters can register, view, and remove/return their assigned IT hardware equipment from the User Service Portal.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300">
                    {systemSettingsState.allowRequesterAssetSelfService !== false ? 'SELF-SERVICE ACTIVE' : 'LOCKED (ADMIN/MANAGER ONLY)'}
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleRequesterAssetSelfService}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      systemSettingsState.allowRequesterAssetSelfService !== false ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                    role="switch"
                    aria-checked={systemSettingsState.allowRequesterAssetSelfService !== false}
                    title="Toggle Requester Asset Self-Service"
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        systemSettingsState.allowRequesterAssetSelfService !== false ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* POINT 3: PRE-SHARED KEY (PSK) CONFIGURATION CARD */}
            <div className="neu-flat p-5 rounded-2xl border border-violet-500/30 bg-violet-50/20 dark:bg-violet-950/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Pre-Shared Key (PSK) Security &amp; Master Passcode
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 font-bold border border-violet-300">
                        Superadmin Exclusive
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Configure, create, or regenerate the pre-shared key required for user onboarding, account activation, and password resets.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGeneratePsk}
                    className="neu-btn px-3 py-1.5 text-xs font-bold rounded-xl text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-950/60 flex items-center gap-1.5 cursor-pointer"
                    title="Generate a randomized strong Pre-Shared Key"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                    Generate Secure Key
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPsk}
                    className="neu-btn px-3 py-1.5 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 hover:text-violet-600 flex items-center gap-1.5 cursor-pointer"
                    title="Copy Pre-Shared Key to clipboard"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {pskCopied ? 'Copied!' : 'Copy Key'}
                  </button>
                </div>
              </div>

              <form onSubmit={handleSavePsk} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Current Pre-Shared Key (PSK) *
                  </label>
                  <div className="relative">
                    <input
                      type={pskVisible ? 'text' : 'password'}
                      required
                      value={pskValue}
                      onChange={(e) => setPskValue(e.target.value)}
                      placeholder="e.g. Sports@9433 or Helpdesk#2026!"
                      className="w-full pl-3 pr-28 py-2 text-xs font-mono font-bold neu-input bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                    />
                    <div className="absolute right-2 top-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPskVisible(!pskVisible)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={pskVisible ? 'Hide Key' : 'Reveal Key'}
                      >
                        {pskVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="submit"
                        disabled={pskSaving}
                        className="neu-btn-primary px-3 py-1 text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
                      >
                        {pskSaving ? 'Saving...' : 'Save PSK'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">How is this Pre-Shared Key used?</div>
                  <p className="leading-relaxed text-[11px]">
                    Employees and staff who do not have an existing password can click <strong className="text-cyan-600 dark:text-cyan-400">&ldquo;Use Pre-Shared Key (PSK)&rdquo;</strong> in the Sign In modal, provide their User ID / Email address and this Pre-Shared Key to securely set and activate their personal password.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB: SLA Policies & Target Timers (Super Admin Exclusive)     */}
      {/* ============================================================= */}
      {activeTab === 'sla' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                SLA Policies &amp; Target Timers (Super Admin Managed)
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Managed exclusively by Super Administrator. Decide first response windows, resolution deadlines per priority, and business hours enforcement.
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-800/40 text-cyan-700 dark:text-cyan-300 text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              SLA Engine Authoritative
            </div>
          </div>

          <form onSubmit={handleSaveSlaPolicy} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Left 2 Columns */}
            <div className="lg:col-span-2 space-y-5">
              <div className="neu-flat p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  Resolution Target Windows by Priority
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-800 dark:text-rose-300">Urgent / Critical</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-200/80 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200">
                        P1 Severe
                      </span>
                    </div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400">Resolution Deadline (Hours)</label>
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={slaUrgentHours}
                      onChange={(e) => setSlaUrgentHours(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs neu-input rounded-lg font-bold text-rose-900 dark:text-rose-200 font-mono"
                      required
                    />
                    <span className="text-[10px] text-slate-500 block">System outage or business blocker</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300">High Priority</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                        P2 High
                      </span>
                    </div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400">Resolution Deadline (Hours)</label>
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={slaHighHours}
                      onChange={(e) => setSlaHighHours(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs neu-input rounded-lg font-bold text-amber-900 dark:text-amber-200 font-mono"
                      required
                    />
                    <span className="text-[10px] text-slate-500 block">Department-wide degradation</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-800 dark:text-cyan-300">Normal / Medium</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-200/80 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200">
                        P3 Standard
                      </span>
                    </div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400">Resolution Deadline (Hours)</label>
                    <input
                      type="number"
                      min={1}
                      max={360}
                      value={slaMediumHours}
                      onChange={(e) => setSlaMediumHours(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs neu-input rounded-lg font-bold text-cyan-900 dark:text-cyan-200 font-mono"
                      required
                    />
                    <span className="text-[10px] text-slate-500 block">General employee request or glitch</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-300">Low Priority</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        P4 Low
                      </span>
                    </div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400">Resolution Deadline (Hours)</label>
                    <input
                      type="number"
                      min={1}
                      max={720}
                      value={slaLowHours}
                      onChange={(e) => setSlaLowHours(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs neu-input rounded-lg font-bold text-slate-900 dark:text-slate-100 font-mono"
                      required
                    />
                    <span className="text-[10px] text-slate-500 block">Minor query or equipment inquiry</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Initial First Response Deadline (Hours) *
                    </label>
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      max={48}
                      value={slaFirstResponseHours}
                      onChange={(e) => setSlaFirstResponseHours(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs neu-input rounded-xl font-bold font-mono"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Maximum elapsed time before first agent acknowledgment</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Business Hours SLA Calculation
                    </label>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="superSlaBusinessHours"
                        checked={slaBusinessHoursOnly}
                        onChange={(e) => setSlaBusinessHoursOnly(e.target.checked)}
                        className="rounded border-slate-400 dark:border-slate-700 text-cyan-600 focus:ring-0 cursor-pointer w-4 h-4"
                      />
                      <label htmlFor="superSlaBusinessHours" className="text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                        Count 09:00 - 18:00 Mon-Fri Only (Pause weekends)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={slaSaving}
                    className="neu-btn-primary px-5 py-2 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {slaSaving ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>Applying SLA Timers...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save &amp; Enforce SLA Policy (Superadmin)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar Right Column: SLA Rules Summary */}
            <div className="space-y-4">
              <div className="neu-flat p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Active SLA Engine Matrix
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  The SLA engine actively recalculates countdowns on all tickets every 30 seconds. Breached deadlines automatically fire escalation alerts.
                </p>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-100 dark:bg-slate-900/60 font-medium">
                    <span className="text-slate-600 dark:text-slate-400">Urgent Target:</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{slaUrgentHours} Hours</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-100 dark:bg-slate-900/60 font-medium">
                    <span className="text-slate-600 dark:text-slate-400">High Target:</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{slaHighHours} Hours</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-100 dark:bg-slate-900/60 font-medium">
                    <span className="text-slate-600 dark:text-slate-400">Medium Target:</span>
                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{slaMediumHours} Hours</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-100 dark:bg-slate-900/60 font-medium">
                    <span className="text-slate-600 dark:text-slate-400">Low Target:</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{slaLowHours} Hours</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-100 dark:bg-slate-900/60 font-medium">
                    <span className="text-slate-600 dark:text-slate-400">Timer Mode:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {slaBusinessHoursOnly ? '9x5 Business Hours' : '24x7 Continuous'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB: Branding Field & Logo Customization (Super Admin)       */}
      {/* ============================================================= */}
      {activeTab === 'branding' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Custom Branding &amp; Organization Logo
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Super Admin brand control. Specify enterprise logo, helpdesk title, and portal greetings rendered in the navigation header.
              </p>
            </div>
            {primaryOrg && (
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold">
                Organization: <span className="text-slate-900 dark:text-white font-bold">{primaryOrg.name}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSaveBranding} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4 neu-flat p-6 rounded-2xl border border-slate-200 dark:border-white/10">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Image className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Branding Identity Settings
              </h3>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Logo Image &amp; Shape Customization *
                  </label>
                  <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                    Default: 200 × 80 px (Customizable)
                  </span>
                </div>

                {/* Template Selector: Round, Square, Rectangle */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    Logo Template / Shape
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setBrandingLogoTemplate('rectangle');
                        setBrandingLogoWidth(200);
                        setBrandingLogoHeight(80);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                        brandingLogoTemplate === 'rectangle'
                          ? 'bg-cyan-500/15 border-cyan-500 text-cyan-700 dark:text-cyan-300 shadow-sm'
                          : 'neu-btn text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                      }`}
                    >
                      <div className="w-5 h-2.5 rounded-sm border border-current" />
                      <span>Rectangle (200×80)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBrandingLogoTemplate('round');
                        setBrandingLogoWidth(80);
                        setBrandingLogoHeight(80);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                        brandingLogoTemplate === 'round'
                          ? 'bg-cyan-500/15 border-cyan-500 text-cyan-700 dark:text-cyan-300 shadow-sm'
                          : 'neu-btn text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full border border-current" />
                      <span>Round (Circle)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBrandingLogoTemplate('square');
                        setBrandingLogoWidth(80);
                        setBrandingLogoHeight(80);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                        brandingLogoTemplate === 'square'
                          ? 'bg-cyan-500/15 border-cyan-500 text-cyan-700 dark:text-cyan-300 shadow-sm'
                          : 'neu-btn text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-none border border-current" />
                      <span>Square</span>
                    </button>
                  </div>
                </div>

                {/* Custom Dimensions */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Logo Width (px)
                    </label>
                    <input
                      type="number"
                      min={40}
                      max={400}
                      value={brandingLogoWidth}
                      onChange={(e) => setBrandingLogoWidth(Number(e.target.value) || 200)}
                      className="w-full px-3 py-1.5 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Logo Height (px)
                    </label>
                    <input
                      type="number"
                      min={30}
                      max={160}
                      value={brandingLogoHeight}
                      onChange={(e) => setBrandingLogoHeight(Number(e.target.value) || 80)}
                      className="w-full px-3 py-1.5 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-bold"
                    />
                  </div>
                </div>

                {/* Dynamic Preview & Upload Frame */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10">
                  <div
                    style={{
                      width: `${Math.min(brandingLogoWidth, 240)}px`,
                      height: `${Math.min(brandingLogoHeight, 120)}px`,
                    }}
                    className={`border-2 border-dashed border-cyan-500/50 bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden p-1 relative shrink-0 shadow-inner ${
                      brandingLogoTemplate === 'round'
                        ? 'rounded-full aspect-square'
                        : brandingLogoTemplate === 'square'
                        ? 'rounded-none aspect-square'
                        : 'rounded-xl'
                    }`}
                  >
                    {brandingLogoUrl && !brandingLogoLoadError ? (
                      <img
                        src={brandingLogoUrl}
                        alt="Logo Preview"
                        className={`w-full h-full ${
                          brandingLogoTemplate === 'round' || brandingLogoTemplate === 'square'
                            ? 'object-cover'
                            : 'object-contain'
                        } select-none ${
                          brandingLogoTemplate === 'round'
                            ? 'rounded-full'
                            : brandingLogoTemplate === 'square'
                            ? 'rounded-none'
                            : 'rounded-lg'
                        }`}
                        onError={() => setBrandingLogoLoadError(true)}
                      />
                    ) : brandingLogoUrl && brandingLogoLoadError ? (
                      <div className="text-center p-2 text-rose-500 space-y-1">
                        <AlertTriangle className="w-5 h-5 mx-auto text-rose-500" />
                        <div className="text-[10px] font-bold">Failed to load</div>
                      </div>
                    ) : (
                      <div className="text-center p-2 text-slate-400 space-y-0.5">
                        <Image className="w-6 h-6 mx-auto text-cyan-500/60" />
                        <div className="text-[10px] font-bold">{brandingLogoWidth} × {brandingLogoHeight} px</div>
                        <div className="text-[9px] capitalize">{brandingLogoTemplate}</div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2.5 w-full">
                    <div>
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block mb-1">
                        Upload Image File
                      </span>
                      <label className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border-2 border-dashed border-cyan-500/50 hover:border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 text-cyan-800 dark:text-cyan-300 text-xs font-bold cursor-pointer transition-all hover:bg-cyan-100/60 dark:hover:bg-cyan-950/40">
                        <Upload className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span>Choose PNG, SVG, JPG ({brandingLogoWidth} × {brandingLogoHeight} px)</span>
                        <input
                          type="file"
                          accept=".png,.svg,.jpg,.jpeg,image/png,image/svg+xml,image/jpeg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const result = event.target?.result as string;
                              setBrandingLogoUrl(result);
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        Or Paste Logo URL
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          placeholder="https://example.com/assets/logo.png"
                          value={brandingLogoUrl}
                          onChange={(e) => setBrandingLogoUrl(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-mono font-medium"
                        />
                        {brandingLogoUrl && (
                          <button
                            type="button"
                            onClick={() => setBrandingLogoUrl('')}
                            className="px-2.5 py-1.5 neu-btn text-xs text-rose-600 rounded-xl font-bold cursor-pointer hover:bg-rose-50"
                            title="Clear logo"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Presets:</span>
                      {[
                        {
                          label: '200×80 Rectangle SVG',
                          template: 'rectangle' as const,
                          width: 200,
                          height: 80,
                          url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80"><rect width="200" height="80" rx="12" fill="%230f172a"/><path d="M35 20 L55 30 V50 C55 64 35 70 35 70 C35 70 15 64 15 50 V30 Z" fill="%230284c7" stroke="%2338bdf8" stroke-width="2"/><text x="68" y="42" fill="%23f8fafc" font-family="sans-serif" font-weight="900" font-size="16">APEX DESK</text><text x="68" y="58" fill="%2338bdf8" font-family="sans-serif" font-weight="700" font-size="10">IT SERVICE HUB</text></svg>',
                        },
                        {
                          label: '80×80 Round SVG',
                          template: 'round' as const,
                          width: 80,
                          height: 80,
                          url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="39" fill="%230f172a" stroke="%230284c7" stroke-width="2"/><path d="M40 16 L56 24 V44 C56 56 40 62 40 62 C40 62 24 56 24 44 V24 Z" fill="%230284c7" stroke="%2338bdf8" stroke-width="2"/><circle cx="40" cy="38" r="6" fill="%23ffffff"/></svg>',
                        },
                        {
                          label: '80×80 Square SVG',
                          template: 'square' as const,
                          width: 80,
                          height: 80,
                          url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="%230f172a" stroke="%2306b6d4" stroke-width="2"/><circle cx="40" cy="40" r="24" fill="none" stroke="%2338bdf8" stroke-width="3"/><rect x="32" y="32" width="16" height="16" fill="%2306b6d4"/></svg>',
                        },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setBrandingLogoUrl(preset.url);
                            setBrandingLogoTemplate(preset.template);
                            setBrandingLogoWidth(preset.width);
                            setBrandingLogoHeight(preset.height);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-bold neu-btn text-cyan-700 dark:text-cyan-400 cursor-pointer hover:bg-cyan-50 dark:hover:bg-cyan-950/40"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Product / Helpdesk Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={brandingProductName}
                    onChange={(e) => setBrandingProductName(e.target.value)}
                    className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Header Subtitle / Tagline *
                  </label>
                  <input
                    type="text"
                    required
                    value={brandingSubtitle}
                    onChange={(e) => setBrandingSubtitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Support Inbound Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={brandingSupportEmail}
                    onChange={(e) => setBrandingSupportEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Portal Welcome Banner Notice
                </label>
                <textarea
                  rows={2}
                  value={brandingWelcomeMsg}
                  onChange={(e) => setBrandingWelcomeMsg(e.target.value)}
                  className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={brandingSaving}
                  className="neu-btn-primary px-5 py-2 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {brandingSaving ? 'Saving...' : 'Save Branding & Apply Logo'}
                </button>
              </div>
            </div>

            {/* Live Preview Card */}
            <div className="neu-flat p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Live Brand Preview
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This is how your branding and logo render in the navigation bar and portal:
              </p>

              <div className="p-4 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900 space-y-3">
                <div className="flex items-center gap-3">
                  {brandingLogoUrl ? (
                    <img
                      src={brandingLogoUrl}
                      alt="Brand Logo"
                      className="w-10 h-10 rounded-xl object-contain border border-slate-200 dark:border-white/10 p-1 bg-white shadow-xs"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                      {brandingProductName.charAt(0) || 'I'}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-black tracking-tight text-slate-900 dark:text-white">
                      {brandingProductName}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {brandingSupportEmail}
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40 text-[11px] text-cyan-800 dark:text-cyan-300 font-medium">
                  {brandingWelcomeMsg}
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB: Ticket Purge & Storage Cleanup by Date Range             */}
      {/* ============================================================= */}
      {activeTab === 'storage' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                Old Ticket Storage Purge (Super Admin Space Reclamation)
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Permanently delete historical tickets created within a specific date range to reclaim database storage and optimize for 1000+ daily requests.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-500">Current Storage:</span>
              <span className="font-bold text-violet-600 dark:text-violet-400">{stats.databaseSizeKb} KB</span>
            </div>
          </div>

          {purgeResult && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs space-y-1 font-bold animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{purgeResult.message}</span>
              </div>
              <div className="text-[11px] font-mono font-normal">
                Deleted {purgeResult.deletedCount} tickets · Reclaimed ~{purgeResult.freedKbEstimate} KB disk space · {purgeResult.remainingCount} tickets remaining in active pool
              </div>
            </div>
          )}

          <div className="neu-flat p-6 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4 max-w-2xl">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              Specify Deletion Date Range &amp; Filter
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={purgeStartDate}
                  onChange={(e) => setPurgeStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={purgeEndDate}
                  onChange={(e) => setPurgeEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Target Ticket Status Filter
              </label>
              <select
                value={purgeStatusFilter}
                onChange={(e) => setPurgeStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
              >
                <option value="resolved_closed">Resolved &amp; Closed Tickets Only (Safest - Reclaims space without affecting open tickets)</option>
                <option value="all">All Tickets within Date Range (Including Open / In-Progress)</option>
              </select>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                Permanent Data Removal Notice
              </span>
              <p className="text-[11px] leading-relaxed">
                Purging tickets also removes associated comments, work logs, satisfaction reviews, and timeline events to completely clean storage. This action cannot be reversed.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={!purgeStartDate || !purgeEndDate || purgeLoading}
                onClick={() => setPurgeConfirmOpen(true)}
                className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-rose-600 hover:bg-rose-500 shadow-sm cursor-pointer disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Review &amp; Purge Tickets in Range</span>
              </button>
            </div>
          </div>

          {/* Purge Confirmation Modal */}
          {purgeConfirmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="max-w-md w-full neu-modal p-6 rounded-2xl border border-rose-300 dark:border-rose-500/30 space-y-4 shadow-2xl">
                <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Permanent Purge</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Superadmin Data Cleanup</p>
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  Are you absolutely certain you want to purge tickets created between <span className="font-bold text-slate-900 dark:text-white">{purgeStartDate}</span> and <span className="font-bold text-slate-900 dark:text-white">{purgeEndDate}</span> ({purgeStatusFilter === 'resolved_closed' ? 'resolved & closed only' : 'all statuses'})?
                </p>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setPurgeConfirmOpen(false)}
                    className="neu-btn px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={purgeLoading}
                    onClick={handleExecutePurge}
                    className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-rose-600 hover:bg-rose-500 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {purgeLoading ? 'Purging Records...' : 'Yes, Permanently Purge'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB: CSAT Ratings & Customer Satisfaction Reviews             */}
      {/* ============================================================= */}
      {activeTab === 'ratings' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Customer Satisfaction (CSAT) Ratings &amp; Feedback Management
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Review, analyze, and moderate satisfaction survey scores submitted by end-users upon ticket completion.
              </p>
            </div>
          </div>

          {/* KPI Analytics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="neu-card p-3 rounded-xl border border-slate-200 dark:border-white/10 text-center">
              <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Total Reviews</div>
              <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">{surveys.length}</div>
              <div className="text-[10px] text-slate-500">Submitted surveys</div>
            </div>

            <div className="neu-card p-3 rounded-xl border border-slate-200 dark:border-white/10 text-center">
              <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Average CSAT</div>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {surveys.length
                  ? (surveys.reduce((sum, s) => sum + s.rating, 0) / surveys.length).toFixed(1)
                  : '5.0'} / 5.0
              </div>
              <div className="text-[10px] text-slate-500">Customer satisfaction score</div>
            </div>

            <div className="neu-card p-3 rounded-xl border border-slate-200 dark:border-white/10 text-center">
              <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">5-Star Excellence</div>
              <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                {surveys.filter((s) => s.rating === 5).length}
              </div>
              <div className="text-[10px] text-slate-500">Top rating tier</div>
            </div>

            <div className="neu-card p-3 rounded-xl border border-slate-200 dark:border-white/10 text-center">
              <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Rating System State</div>
              <div className="text-sm font-bold font-mono text-violet-600 dark:text-violet-400 mt-2">
                {systemSettingsState.enableTicketRating ? 'Active' : 'Disabled'}
              </div>
              <div className="text-[10px] text-slate-500">Superadmin toggle</div>
            </div>
          </div>

          {/* Ratings Moderation List */}
          <div className="neu-flat rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
            <div className="p-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Customer Survey Responses ({surveys.length})
              </div>
              <div className="text-[11px] text-slate-500">
                Super Administrator has permission to delete/moderate inappropriate feedback.
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 font-bold">
                    <th className="py-3 px-3">Rating</th>
                    <th className="py-3 px-3">Ticket ID</th>
                    <th className="py-3 px-3">Requester Name</th>
                    <th className="py-3 px-3">Customer Comment</th>
                    <th className="py-3 px-3">Submitted At</th>
                    <th className="py-3 px-3 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {surveys.map((survey) => (
                    <tr key={survey.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < survey.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'
                              }`}
                            />
                          ))}
                          <span className="font-mono font-bold text-slate-900 dark:text-white ml-1">
                            {survey.rating}/5
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        {survey.ticketId}
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        {survey.requesterName}
                      </td>

                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300 italic max-w-xs">
                        &ldquo;{survey.comment || 'No written comment'}&rdquo;
                      </td>

                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {new Date(survey.submittedAt).toLocaleDateString()} {new Date(survey.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSurveyToDelete(survey)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                          title="Delete / Moderate Survey"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {surveys.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        No customer satisfaction ratings recorded yet. Requesters can rate resolved tickets.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Delete Survey Confirmation Modal */}
      {surveyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="neu-modal max-w-md w-full p-6 rounded-2xl border border-rose-300 dark:border-rose-500/30 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Rating Review</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Permanently remove customer feedback record</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              Are you sure you want to permanently delete satisfaction review for ticket <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">[{surveyToDelete.ticketId}]</span> from <span className="font-bold text-slate-900 dark:text-white">{surveyToDelete.requesterName}</span>?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setSurveyToDelete(null)}
                className="neu-btn px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSurvey(surveyToDelete.id)}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-xs cursor-pointer"
              >
                Delete Rating
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Organizations Management */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search organizations by name or domain..."
                value={searchTenant}
                onChange={(e) => setSearchTenant(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            <button
              onClick={() => setShowOrgModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Create Organization
            </button>
          </div>

          <div className="glass-panel rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Organization Name</th>
                    <th className="py-3 px-3">Domain</th>
                    <th className="py-3 px-3">Tier Plan</th>
                    <th className="py-3 px-3">Storage Quota</th>
                    <th className="py-3 px-3">Ticket Volume</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {filteredOrganizations.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-100/70 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{org.name}</div>
                        <div className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">{org.id}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">{org.domain}</td>
                      <td className="py-3 px-3">
                        <span className="capitalize px-2 py-0.5 rounded text-[10px] font-mono bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-800/40">
                          {org.plan}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">{org.storageUsedMb} MB / 5 GB</td>
                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300 tabular-nums">{org.ticketCount}</td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold capitalize font-mono text-[11px]">
                          ● {org.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setOrgToDelete(org)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title={`Delete organization ${org.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Support Agents Management */}
      {activeTab === 'agents' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search support agents by name, email, or role..."
                value={searchAgent}
                onChange={(e) => setSearchAgent(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            <button
              onClick={() => setShowAgentModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" /> Add Support Agent
            </button>
          </div>

          <div className="glass-panel rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Agent Name</th>
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">Job Post / Title</th>
                    <th className="py-3 px-3">System Role</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {filteredAgents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-slate-100/70 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-[10px]">
                            {agent.name.charAt(0)}
                          </div>
                          <span>{agent.name}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 ml-8">{agent.id}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">{agent.email}</td>
                      <td className="py-3 px-3 text-slate-800 dark:text-slate-200 font-medium">
                        {agent.title || 'Support Engineer'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="capitalize px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-100 dark:bg-cyan-950/50 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/40">
                          {agent.role}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold capitalize font-mono text-[11px]">
                          ● {agent.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {agent.role === 'superadmin' ? (
                          <span
                            className="p-1 text-amber-500 inline-flex items-center cursor-not-allowed opacity-80"
                            title="Super Admin account is permanently protected and cannot be deleted by anyone"
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAgentToDelete(agent)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title={`Remove agent ${agent.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Service Catalogs Management */}
      {activeTab === 'catalogs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog offerings by title, category..."
                value={searchCatalog}
                onChange={(e) => setSearchCatalog(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            <button
              onClick={() => {
                setCatalogToEdit(null);
                setCatTitle('');
                setCatDescription('');
                setCatCategory('Hardware & Workstations');
                setCatIcon('Laptop');
                setCatHours(24);
                setCatApproval(false);
                setCatPriority('normal');
                setShowCatalogModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Add Catalog Offering
            </button>
          </div>

          <div className="neu-flat rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-white/10 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Offering Title</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">SLA Turnaround</th>
                    <th className="py-3 px-3">Approval Required</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {catalogItems
                    .filter((c) => {
                      if (!searchCatalog) return true;
                      const q = searchCatalog.toLowerCase();
                      return c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
                    })
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-100/70 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span className="p-1 rounded bg-slate-200 dark:bg-slate-800 text-violet-600 dark:text-violet-400 font-mono text-[10px]">
                              {item.icon}
                            </span>
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{item.description}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                          ~{item.estimatedHours} hours
                        </td>
                        <td className="py-3 px-3">
                          {item.requiresApproval ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                              Yes ({item.approverRole || 'Manager'})
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">No Approval</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="capitalize font-mono text-[11px] text-cyan-700 dark:text-cyan-400 font-semibold">
                            {item.defaultPriority}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setCatalogToEdit(item);
                                setCatTitle(item.title);
                                setCatDescription(item.description);
                                setCatCategory(item.category);
                                setCatIcon(item.icon);
                                setCatHours(item.estimatedHours);
                                setCatApproval(item.requiresApproval);
                                setCatPriority(item.defaultPriority);
                                setShowCatalogModal(true);
                              }}
                              className="p-1 rounded text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors cursor-pointer"
                              title={`Edit offering ${item.title}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCatalogToDelete(item)}
                              className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title={`Delete offering ${item.title}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Delete Catalog Item Modal */}
      {catalogToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="neu-modal max-w-md w-full p-6 rounded-2xl border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Catalog Offering</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Permanently remove service catalog offering</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300">
              Are you sure you want to permanently delete catalog offering &ldquo;<strong>{catalogToDelete.title}</strong>&rdquo;? Requesters will no longer be able to select this service item.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCatalogToDelete(null)}
                className="neu-btn px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteCatalogItem) {
                    onDeleteCatalogItem(catalogToDelete.id);
                    setCatalogToDelete(null);
                  }
                }}
                className="px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-rose-600 hover:bg-rose-500 shadow-sm transition-all cursor-pointer"
              >
                Yes, Delete Offering
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Catalog Item Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="neu-modal max-w-lg w-full p-6 rounded-2xl border border-slate-200 dark:border-white/15 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Grid className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                {catalogToEdit ? 'Edit Service Catalog Offering' : 'Add Service Catalog Offering'}
              </h3>
              <button onClick={() => setShowCatalogModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!catTitle.trim()) return;
                if (catalogToEdit && onUpdateCatalogItem) {
                  onUpdateCatalogItem(catalogToEdit.id, {
                    title: catTitle,
                    description: catDescription,
                    category: catCategory,
                    icon: catIcon,
                    estimatedHours: Number(catHours),
                    requiresApproval: catApproval,
                    defaultPriority: catPriority,
                  });
                } else if (onCreateCatalogItem) {
                  onCreateCatalogItem({
                    title: catTitle,
                    description: catDescription,
                    category: catCategory,
                    icon: catIcon,
                    estimatedHours: Number(catHours),
                    requiresApproval: catApproval,
                    defaultPriority: catPriority,
                  });
                }
                setShowCatalogModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Offering Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Cloud Sandbox Account Request"
                  value={catTitle}
                  onChange={(e) => setCatTitle(e.target.value)}
                  className="neu-input w-full px-3 py-1.5 text-xs rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detailed description of service delivery and fulfillment..."
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  className="neu-input w-full p-2.5 text-xs rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Category</label>
                  <select
                    value={catCategory}
                    onChange={(e) => setCatCategory(e.target.value)}
                    className="neu-input w-full px-3 py-1.5 text-xs rounded-lg focus:outline-none"
                  >
                    <option value="Hardware & Workstations">Hardware &amp; Workstations</option>
                    <option value="Software & Cloud Apps">Software &amp; Cloud Apps</option>
                    <option value="Security & Access">Security &amp; Access</option>
                    <option value="Network & Connectivity">Network &amp; Connectivity</option>
                    <option value="Office & Facilities">Office &amp; Facilities</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Icon</label>
                  <select
                    value={catIcon}
                    onChange={(e) => setCatIcon(e.target.value)}
                    className="neu-input w-full px-3 py-1.5 text-xs rounded-lg focus:outline-none"
                  >
                    <option value="Laptop">Laptop Workstation</option>
                    <option value="Layers">Software Layers</option>
                    <option value="Shield">Security Shield</option>
                    <option value="Wifi">Network Wifi</option>
                    <option value="HardDrive">Hard Drive</option>
                    <option value="Cpu">Compute</option>
                    <option value="Grid">Grid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Fulfillment SLA (Hours)</label>
                  <input
                    type="number"
                    min={1}
                    value={catHours}
                    onChange={(e) => setCatHours(Number(e.target.value))}
                    className="neu-input w-full px-3 py-1.5 text-xs rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Default Priority</label>
                  <select
                    value={catPriority}
                    onChange={(e) => setCatPriority(e.target.value)}
                    className="neu-input w-full px-3 py-1.5 text-xs rounded-lg focus:outline-none"
                  >
                    <option value="low">Low (P4)</option>
                    <option value="normal">Normal (P3)</option>
                    <option value="high">High (P2)</option>
                    <option value="urgent">Urgent (P1)</option>
                  </select>
                </div>
              </div>

              <div className="p-2.5 rounded-xl neu-card flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cat-appr"
                  checked={catApproval}
                  onChange={(e) => setCatApproval(e.target.checked)}
                  className="rounded border-slate-300 text-violet-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="cat-appr" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  Requires Line Manager Approval Prior to Fulfillment
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCatalogModal(false)}
                  className="neu-btn px-3 py-1.5 text-xs rounded-lg text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg shadow-sm cursor-pointer"
                >
                  {catalogToEdit ? 'Save Changes' : 'Create Offering'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="glass-panel p-3 rounded-xl border border-slate-200 dark:border-white/10 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter audit trail by actor, ticket ID, or action..."
              value={searchAudit}
              onChange={(e) => setSearchAudit(e.target.value)}
              className="w-full text-xs bg-transparent border-0 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="glass-panel rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-3 px-3 w-40">Timestamp</th>
                    <th className="py-3 px-3">Actor / Role</th>
                    <th className="py-3 px-3">Action Identifier</th>
                    <th className="py-3 px-3">Target Entity</th>
                    <th className="py-3 px-3">Audit Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-mono text-[11px]">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-100/70 dark:hover:bg-white/5">
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                        {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">
                        <span className="font-sans font-medium text-slate-900 dark:text-white">{log.actorName}</span>
                        <span className="text-slate-500 ml-1">({log.actorRole})</span>
                      </td>
                      <td className="py-2.5 px-3 text-cyan-600 dark:text-cyan-400 font-bold">{log.action}</td>
                      <td className="py-2.5 px-3 text-indigo-600 dark:text-indigo-300">{log.entityId}</td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-sans text-xs">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: System Health & Real-Time Engine Diagnostics */}
      {activeTab === 'system' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Top Live Uptime & Engine Status Banner */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md bg-gradient-to-r from-slate-50 via-white to-cyan-50/30 dark:from-slate-900 dark:via-slate-900/90 dark:to-cyan-950/20">
            <div className="flex items-center gap-3">
              <div className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Engine Status: Online &amp; Operational</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/40">
                    HEALTHY
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  Engines Uptime: <strong className="text-cyan-700 dark:text-cyan-400">{liveSystemStatus?.engineUptimeFormatted || `${stats.systemUptimeHours}h`}</strong> · Process PID: <strong className="text-slate-700 dark:text-slate-300">{liveSystemStatus?.processId || 'PID'}</strong> · Title: <strong className="text-slate-700 dark:text-slate-300">{liveSystemStatus?.processTitle || 'node'}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 hidden sm:inline">
                {liveSystemStatus?.timestamp ? `Refreshed ${new Date(liveSystemStatus.timestamp).toLocaleTimeString()}` : 'Live Auto-Polling (8s)'}
              </span>
              <button
                type="button"
                onClick={fetchLiveSystemStatus}
                className="neu-btn px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-cyan-600 cursor-pointer shadow-xs"
                title="Force refresh live engine status"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Refresh Live</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Runtime Environment & Hosting */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3 shadow-md">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Runtime Environment &amp; Hosting
              </h3>
              <div className="text-xs space-y-2.5 text-slate-700 dark:text-slate-300 divide-y divide-slate-200/80 dark:divide-white/5">
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Platform:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {liveSystemStatus?.platform || 'Linux Server (x86_64)'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Node.js Engine:</span>
                  <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400">
                    {liveSystemStatus?.nodeEngine || 'v22.x LTS'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Memory RSS:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {liveSystemStatus?.memoryRss || '84.2 MB'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Port &amp; Proxy:</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {liveSystemStatus?.portAndProxy || 'Port 3000 (Express + Nginx)'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Host Kernel / OS:</span>
                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {liveSystemStatus?.osType ? `${liveSystemStatus.osType} ${liveSystemStatus.osRelease}` : 'Linux 6.x'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Data Integrity & Storage */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3 shadow-md">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Data Integrity &amp; Storage
              </h3>
              <div className="text-xs space-y-2.5 text-slate-700 dark:text-slate-300 divide-y divide-slate-200/80 dark:divide-white/5">
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Primary Database:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {liveSystemStatus?.primaryDatabase || 'data/database.json'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Write Mode:</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {liveSystemStatus?.writeMode || 'Atomic fs.writeFileSync'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Database Size:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {liveSystemStatus?.databaseSize || `${stats.databaseSizeKb} KB`}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Tenant Multi-Tenancy:</span>
                  <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                    {liveSystemStatus?.tenantMultiTenancy || 'Enforced'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Active Isolated Sessions:</span>
                  <span className="font-mono font-bold text-violet-600 dark:text-violet-400">
                    {liveSystemStatus?.activeSessionsCount ?? 1} independent client session(s)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Hardware & Host Diagnostic Strip */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5">
              <div className="text-[10px] uppercase font-bold text-slate-500">Heap Memory Used</div>
              <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                {liveSystemStatus?.heapUsed || '38.4 MB'}
              </div>
              <div className="text-[10px] text-slate-400">Total: {liveSystemStatus?.heapTotal || '78.2 MB'}</div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5">
              <div className="text-[10px] uppercase font-bold text-slate-500">System Physical RAM</div>
              <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                {liveSystemStatus?.systemFreeRam || '4.2 GB'} free
              </div>
              <div className="text-[10px] text-slate-400">of {liveSystemStatus?.systemTotalRam || '8.0 GB'}</div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5">
              <div className="text-[10px] uppercase font-bold text-slate-500">Processor Cores</div>
              <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                {liveSystemStatus?.cpuCount || 4} vCPUs
              </div>
              <div className="text-[10px] text-slate-400 truncate">{liveSystemStatus?.cpuModel?.slice(0, 24) || 'Multi-core'}</div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5">
              <div className="text-[10px] uppercase font-bold text-slate-500">Host Machine Uptime</div>
              <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                {liveSystemStatus?.systemUptimeFormatted || 'Operational'}
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">● System Healthy</div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB: Default Email Support & Poller Gateway (POP3/IMAP/SMTP)  */}
      {/* ============================================================= */}
      {activeTab === 'email-gateway' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header */}
          <div className="neu-flat p-6 rounded-2xl border border-cyan-300/80 dark:border-cyan-500/30 space-y-2 bg-gradient-to-br from-cyan-50/50 via-transparent to-indigo-50/30 dark:from-cyan-950/20 dark:to-indigo-950/15">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Default Email Support &amp; Poller Gateway (POP3 / IMAP / SMTP)
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50">
                      Super Admin Exclusive
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50">
                      Hidden from Users &amp; Guest Portal
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Configure the centralized organization email credentials used for ticket reply dispatching (SMTP) and automated email-to-ticket ingestion (POP3 or IMAP). Only accessible to Super Administrator.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Alert Messages */}
          {gwSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{gwSuccessMsg}</span>
            </div>
          )}

          {gwErrorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700/60 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{gwErrorMsg}</span>
            </div>
          )}

          {gwTestResult && (
            <div
              className={`p-4 rounded-xl text-xs space-y-1.5 border ${
                gwTestResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  {gwTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                  {gwTestResult.success ? 'Gateway Connection & Outbound Handshake Succeeded' : 'Gateway Connection Failed'}
                </span>
                {gwTestResult.testedAt && (
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    Tested at {gwTestResult.testedAt}
                  </span>
                )}
              </div>
              <p className="text-xs font-medium">{gwTestResult.message}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSaveDefaultGatewayConfig} className="space-y-6">
            {/* Box 1: Support Email Identity & Subject Pattern */}
            <div className="neu-card p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                1. Default Reply &amp; Inbound Intake Identity
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Sender Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={gwFromName}
                    onChange={(e) => setGwFromName(e.target.value)}
                    placeholder="e.g. IT Helpdesk Support"
                    className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Displayed on outbound notification emails</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Default From / Intake Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={gwFromEmail}
                    onChange={(e) => setGwFromEmail(e.target.value)}
                    placeholder="helpdesk@lakhanglobal.com"
                    className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-none text-cyan-700 dark:text-cyan-400"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Inbound emails to this address automatically generate tickets</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Reply-To Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={gwReplyToEmail}
                    onChange={(e) => setGwReplyToEmail(e.target.value)}
                    placeholder="helpdesk@lakhanglobal.com"
                    className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-mono font-medium focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Target address when users click reply in mail clients</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Subject Threading Token Pattern
                </label>
                <input
                  type="text"
                  required
                  value={gwSubjectPrefix}
                  onChange={(e) => setGwSubjectPrefix(e.target.value)}
                  className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-mono font-medium focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Must include <code className="font-mono font-bold text-cyan-600 dark:text-cyan-400">[ITL-&#123;&#123;ticketId&#125;&#125;]</code> so replies from users thread into the ticket history rather than creating duplicates.
                </span>
              </div>
            </div>

            {/* Box 2: Inbound Mail Server (IMAP or POP3) */}
            <div className="neu-card p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  2. Inbound Ticket Poller (POP3 / IMAP)
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Incoming Protocol:</span>
                  <div className="inline-flex rounded-xl p-0.5 neu-inset bg-slate-100 dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => {
                        setGwIncomingProtocol('imap');
                        if (gwIncomingPort === 995 || gwIncomingPort === 110) setGwIncomingPort(993);
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                        gwIncomingProtocol === 'imap'
                          ? 'neu-btn-primary shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      IMAP (Recommended)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGwIncomingProtocol('pop3');
                        if (gwIncomingPort === 993 || gwIncomingPort === 143) setGwIncomingPort(995);
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                        gwIncomingProtocol === 'pop3'
                          ? 'neu-btn-primary shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      POP3
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    {gwIncomingProtocol.toUpperCase()} Server Host *
                  </label>
                  <input
                    type="text"
                    required
                    value={gwIncomingHost}
                    onChange={(e) => setGwIncomingHost(e.target.value)}
                    placeholder={gwIncomingProtocol === 'pop3' ? 'pop.company.com' : 'imap.company.com'}
                    className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-mono font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Server Port *
                    </label>
                    <div className="flex gap-1">
                      {gwIncomingProtocol === 'imap' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => { setGwIncomingPort(993); setGwIncomingSecurity('ssl'); }}
                            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded neu-btn hover:text-cyan-600 cursor-pointer"
                          >
                            993 (SSL)
                          </button>
                          <button
                            type="button"
                            onClick={() => { setGwIncomingPort(143); setGwIncomingSecurity('starttls'); }}
                            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded neu-btn hover:text-cyan-600 cursor-pointer"
                          >
                            143
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => { setGwIncomingPort(995); setGwIncomingSecurity('ssl'); }}
                            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded neu-btn hover:text-cyan-600 cursor-pointer"
                          >
                            995 (SSL)
                          </button>
                          <button
                            type="button"
                            onClick={() => { setGwIncomingPort(110); setGwIncomingSecurity('none'); }}
                            className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded neu-btn hover:text-cyan-600 cursor-pointer"
                          >
                            110
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <input
                    type="number"
                    required
                    value={gwIncomingPort}
                    onChange={(e) => setGwIncomingPort(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Security / Encryption
                  </label>
                  <select
                    value={gwIncomingSecurity}
                    onChange={(e) => setGwIncomingSecurity(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs neu-select rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="ssl">SSL / TLS (Encrypted)</option>
                    <option value="starttls">STARTTLS</option>
                    <option value="none">None (Plaintext)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Inbound Username (Account Email) *
                  </label>
                  <input
                    type="text"
                    required
                    value={gwIncomingUser}
                    onChange={(e) => setGwIncomingUser(e.target.value)}
                    placeholder="helpdesk@company.com"
                    className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Inbound Password / App Key
                  </label>
                  <div className="relative">
                    <input
                      type={showIncomingPass ? 'text' : 'password'}
                      value={gwIncomingPassword}
                      onChange={(e) => setGwIncomingPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 pr-9 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowIncomingPass(!showIncomingPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showIncomingPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 3: Outbound Mail Server (SMTP) */}
            <div className="neu-card p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  3. Outbound Ticket Reply Dispatch (SMTP)
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  SMTP Protocol
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    SMTP Server Host *
                  </label>
                  <input
                    type="text"
                    required
                    value={gwOutgoingHost}
                    onChange={(e) => setGwOutgoingHost(e.target.value)}
                    placeholder="smtp.company.com or smtp.gmail.com"
                    className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-mono font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      SMTP Port *
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => { setGwOutgoingPort(587); setGwOutgoingSecurity('starttls'); }}
                        className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded neu-btn hover:text-cyan-600 cursor-pointer"
                      >
                        587 (TLS)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setGwOutgoingPort(465); setGwOutgoingSecurity('ssl'); }}
                        className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded neu-btn hover:text-cyan-600 cursor-pointer"
                      >
                        465 (SSL)
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    required
                    value={gwOutgoingPort}
                    onChange={(e) => setGwOutgoingPort(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    SMTP Encryption
                  </label>
                  <select
                    value={gwOutgoingSecurity}
                    onChange={(e) => setGwOutgoingSecurity(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs neu-select rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="starttls">STARTTLS (Port 587)</option>
                    <option value="ssl">SSL / TLS (Port 465)</option>
                    <option value="none">None (Port 25)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    SMTP Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={gwOutgoingUser}
                    onChange={(e) => setGwOutgoingUser(e.target.value)}
                    placeholder="helpdesk@company.com"
                    className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    SMTP Password / App Key
                  </label>
                  <div className="relative">
                    <input
                      type={showOutgoingPass ? 'text' : 'password'}
                      value={gwOutgoingPassword}
                      onChange={(e) => setGwOutgoingPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 pr-9 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOutgoingPass(!showOutgoingPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showOutgoingPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Bar: Test Handshake & Save */}
            <div className="neu-card p-5 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap flex-1">
                <input
                  type="email"
                  value={gwTestEmail}
                  onChange={(e) => setGwTestEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none w-64"
                />
                <button
                  type="button"
                  disabled={gwTesting}
                  onClick={handleTestDefaultGatewayConnection}
                  className="neu-btn px-4 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-300 rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-cyan-600" />
                  <span>{gwTesting ? 'Testing Handshake...' : 'Test Connection Handshake'}</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={gwSaving}
                className="neu-btn-primary px-6 py-2.5 text-xs font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{gwSaving ? 'Saving Gateway...' : 'Save Default Gateway Settings'}</span>
              </button>
            </div>
          </form>

          {/* Superadmin Inbound Email Poller & Intake Simulator */}
          <div className="neu-card p-6 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30">
                  <Inbox className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Superadmin Inbound Email Poller &amp; Intake Simulator
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Verify POP3/IMAP ticket creation, automatic manager forwarding, and threaded replies
                  </p>
                </div>
              </div>
            </div>

            {simError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{simError}</span>
              </div>
            )}

            {simResult ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    {simResult.mode === 'threaded' ? 'Email Threaded to Existing Ticket' : 'New Ticket Created via Inbound Email Intake'}
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    [{simResult.ticket.id}]
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Subject: <span className="font-semibold">{simResult.ticket.subject}</span>
                </p>
                {simResult.ticket.ccRecipients && simResult.ticket.ccRecipients.length > 0 && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                    CC Recipients: {simResult.ticket.ccRecipients.join(', ')}
                  </p>
                )}
                {simResult.ticket.managerEmail && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Forwarded to Manager: <span className="font-mono font-bold">{simResult.ticket.managerEmail}</span>
                  </p>
                )}
                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSimResult(null);
                      setSimSubject('Urgent: Unable to access production database cluster');
                    }}
                    className="neu-btn px-4 py-1.5 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Simulate Another Intake
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSimulateInboundSuperadmin} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      From (Sender Email) *
                    </label>
                    <input
                      type="email"
                      required
                      value={simFromEmail}
                      onChange={(e) => setSimFromEmail(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Subject (Use [ITL-XXXXXX] for threading) *
                    </label>
                    <input
                      type="text"
                      required
                      value={simSubject}
                      onChange={(e) => setSimSubject(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none"
                      placeholder="e.g. Re: [ITL-1001] Updated log trace"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Body / Message *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={simBody}
                    onChange={(e) => setSimBody(e.target.value)}
                    className="w-full p-2.5 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none"
                    placeholder="Type email body content..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      CC Recipients
                    </label>
                    <input
                      type="text"
                      value={simCc}
                      onChange={(e) => setSimCc(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none"
                      placeholder="teammate@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Manager Email (Forward on Intake)
                    </label>
                    <input
                      type="email"
                      value={simManagerEmail}
                      onChange={(e) => setSimManagerEmail(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none"
                      placeholder="manager@company.com"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={simSubmitting}
                    className="neu-btn-primary px-5 py-2 text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {simSubmitting ? 'Simulating Intake...' : 'Dispatch Inbound Email Intake'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Provision Organization */}
      {showOrgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-modal max-w-lg w-full p-6 rounded-2xl border border-slate-200 dark:border-white/15 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              Provision New Customer Organization
            </h3>

            <form onSubmit={handleCreateOrgSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Dynamics Ltd"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Domain *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. apexdynamics.io"
                  value={orgDomain}
                  onChange={(e) => setOrgDomain(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Subscription Plan</label>
                  <select
                    value={orgPlan}
                    onChange={(e) => setOrgPlan(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200"
                  >
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Initial Storage (MB)</label>
                  <input
                    type="number"
                    value={orgStorageMb}
                    onChange={(e) => setOrgStorageMb(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowOrgModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg shadow-sm cursor-pointer"
                >
                  Provision Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Support Agent */}
      {showAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-modal max-w-lg w-full p-6 rounded-2xl border border-slate-200 dark:border-white/15 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              Add Support Agent / Technician
            </h3>

            <form onSubmit={handleCreateAgentSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. maya.lin@company.com"
                  value={agentEmail}
                  onChange={(e) => setAgentEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Post / Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Tier-2 Helpdesk Agent"
                    value={agentTitle}
                    onChange={(e) => setAgentTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Role Permission *</label>
                  <select
                    value={agentRole}
                    onChange={(e) => setAgentRole(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200"
                  >
                    <option value="technician">Technician / Agent</option>
                    <option value="manager">Service Desk Manager</option>
                    <option value="admin">System Administrator</option>
                    <option value="auditor">Auditor (Read-Only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +1 555-0199"
                  value={agentPhone}
                  onChange={(e) => setAgentPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAgentModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg shadow-sm cursor-pointer"
                >
                  Add Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
