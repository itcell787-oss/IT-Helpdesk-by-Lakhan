import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sliders,
  Shield,
  Clock,
  Zap,
  Plus,
  Check,
  Palette,
  CheckCircle,
  Mail,
  Server,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit2,
  Eye,
  Send,
  Lock,
  Layers,
  HelpCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  User as UserIcon,
  Users,
  UserPlus,
  Copy,
  Terminal,
  ShieldAlert,
  Cpu,
} from 'lucide-react';
import {
  CustomFieldDefinition,
  SlaPolicy,
  AutomationRule,
  Organization,
  User,
  UserRole,
  MailboxConnectionConfig,
  DefaultEmailGatewayConfig,
} from '../types';

interface SettingsViewProps {
  organization: Organization;
  currentUser: User;
  availableUsers: User[];
  customFields: CustomFieldDefinition[];
  slaPolicies: SlaPolicy[];
  automationRules: AutomationRule[];
  adminMailboxes: MailboxConnectionConfig[];
  defaultGateway: DefaultEmailGatewayConfig;
  onUpdateOrganization: (id: string, payload: Partial<Organization>) => void;
  onCreateCustomField: (data: Partial<CustomFieldDefinition>) => void;
  onUpdateCustomField: (id: string, data: Partial<CustomFieldDefinition>) => void;
  onDeleteCustomField: (id: string) => void;
  onReorderCustomFields: (orderedIds: string[]) => void;
  onToggleRule: (id: string) => void;
  onSaveUserMailbox: (userId: string, data: Partial<MailboxConnectionConfig>) => Promise<any>;
  onTestUserMailbox: (data: any) => Promise<any>;
  onSaveDefaultGateway: (data: Partial<DefaultEmailGatewayConfig>) => Promise<any>;
  onTestDefaultGateway: (email?: string) => Promise<any>;
  onUpdateUser?: (id: string, data: Partial<User>) => Promise<any>;
  onCreateUser?: (data: Partial<User>) => Promise<any>;
  onDeleteUser?: (id: string) => Promise<any>;
  initialTab?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  organization,
  currentUser,
  availableUsers,
  customFields,
  slaPolicies,
  automationRules,
  adminMailboxes,
  defaultGateway,
  onUpdateOrganization,
  onCreateCustomField,
  onUpdateCustomField,
  onDeleteCustomField,
  onReorderCustomFields,
  onToggleRule,
  onSaveUserMailbox,
  onTestUserMailbox,
  onSaveDefaultGateway,
  onTestDefaultGateway,
  onUpdateUser,
  onCreateUser,
  onDeleteUser,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<
    'profile' | 'users' | 'fields' | 'admin-mailbox' | 'default-gateway' | 'sla' | 'automations' | 'branding' | 'linux-host'
  >((initialTab as any) || 'profile');

  // -------------------------------------------------------------
  // Profile Management State (Super Admin & Admin Profile Editing)
  // -------------------------------------------------------------
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profileEmail, setProfileEmail] = useState(currentUser.email);
  const [profileTitle, setProfileTitle] = useState(currentUser.title || 'Senior System Administrator');
  const [profilePhone, setProfilePhone] = useState(currentUser.phone || '+1 (555) 019-2834');
  const [profileAvatar, setProfileAvatar] = useState(currentUser.avatar || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setProfileName(currentUser.name);
    setProfileEmail(currentUser.email);
    setProfileTitle(currentUser.title || '');
    setProfilePhone(currentUser.phone || '');
    setProfileAvatar(currentUser.avatar || '');
  }, [currentUser]);

  // -------------------------------------------------------------
  // User Management State (All Admins Manage Users & Registration)
  // -------------------------------------------------------------
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userFormName, setUserFormName] = useState('');
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormRole, setUserFormRole] = useState<UserRole>('requester');
  const [userFormTitle, setUserFormTitle] = useState('');
  const [userFormPhone, setUserFormPhone] = useState('');
  const [userFormStatus, setUserFormStatus] = useState<'active' | 'suspended'>('active');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [linuxDistro, setLinuxDistro] = useState<'ubuntu' | 'debian' | 'rhel' | 'docker'>('ubuntu');

  // -------------------------------------------------------------
  // Custom Fields & Form Builder State
  // -------------------------------------------------------------
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'off' | 'portal' | 'technician'>('off');

  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldDefinition['type']>('text');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldRequiredOnClose, setFieldRequiredOnClose] = useState(false);
  const [fieldPortalVisible, setFieldPortalVisible] = useState(true);
  const [fieldOptions, setFieldOptions] = useState('');
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldDescription, setFieldDescription] = useState('');
  const [fieldSection, setFieldSection] = useState<'general' | 'technical' | 'environment' | 'closure'>('general');
  const [hasConditionalRule, setHasConditionalRule] = useState(false);
  const [condField, setCondField] = useState('category');
  const [condOperator, setCondOperator] = useState<'equals' | 'not_equals'>('equals');
  const [condValue, setCondValue] = useState('Hardware & Workstations');

  // Preview form test values
  const [previewFormValues, setPreviewFormValues] = useState<Record<string, any>>({
    category: 'Hardware & Workstations',
    priority: 'normal',
  });

  // -------------------------------------------------------------
  // Admin Individual Mailbox (IMAP/POP3/SMTP) State
  // -------------------------------------------------------------
  const adminUsers = availableUsers.filter((u) => u.role === 'admin' || u.role === 'superadmin');
  const [selectedAdminId, setSelectedAdminId] = useState<string>(currentUser.id);
  const [mailboxIncomingProtocol, setMailboxIncomingProtocol] = useState<'imap' | 'pop3'>('imap');
  const [mailboxIncomingHost, setMailboxIncomingHost] = useState('');
  const [mailboxIncomingPort, setMailboxIncomingPort] = useState(993);
  const [mailboxIncomingSecurity, setMailboxIncomingSecurity] = useState<'ssl' | 'starttls' | 'none'>('ssl');
  const [mailboxIncomingUser, setMailboxIncomingUser] = useState('');
  const [mailboxIncomingPass, setMailboxIncomingPass] = useState('••••••••••••');
  const [mailboxOutgoingProtocol, setMailboxOutgoingProtocol] = useState<'smtp'>('smtp');
  const [mailboxOutgoingHost, setMailboxOutgoingHost] = useState('');
  const [mailboxOutgoingPort, setMailboxOutgoingPort] = useState(587);
  const [mailboxOutgoingSecurity, setMailboxOutgoingSecurity] = useState<'ssl' | 'starttls' | 'none'>('starttls');
  const [mailboxOutgoingUser, setMailboxOutgoingUser] = useState('');
  const [mailboxOutgoingPass, setMailboxOutgoingPass] = useState('••••••••••••');
  const [mailboxFromName, setMailboxFromName] = useState('');
  const [mailboxFromEmail, setMailboxFromEmail] = useState('');
  const [mailboxTesting, setMailboxTesting] = useState(false);
  const [mailboxTestResult, setMailboxTestResult] = useState<any>(null);
  const [mailboxSaveStatus, setMailboxSaveStatus] = useState<string | null>(null);

  // Sync selected admin config
  useEffect(() => {
    const config = adminMailboxes.find((m) => m.userId === selectedAdminId);
    const targetUser = availableUsers.find((u) => u.id === selectedAdminId) || currentUser;

    if (config) {
      setMailboxIncomingProtocol(config.incomingProtocol || 'imap');
      setMailboxIncomingHost(config.incomingHost || 'imap.lakhanglobal.com');
      setMailboxIncomingPort(config.incomingPort || (config.incomingProtocol === 'pop3' ? 995 : 993));
      setMailboxIncomingSecurity(config.incomingSecurity || 'ssl');
      setMailboxIncomingUser(config.incomingUsername || targetUser.email);
      setMailboxOutgoingProtocol('smtp');
      setMailboxOutgoingHost(config.outgoingHost || 'smtp.lakhanglobal.com');
      setMailboxOutgoingPort(config.outgoingPort || 587);
      setMailboxOutgoingSecurity(config.outgoingSecurity || 'starttls');
      setMailboxOutgoingUser(config.outgoingUsername || targetUser.email);
      setMailboxFromName(config.fromName || targetUser.name);
      setMailboxFromEmail(config.fromEmail || targetUser.email);
    } else {
      setMailboxIncomingProtocol('imap');
      setMailboxIncomingHost(`imap.${targetUser.email.split('@')[1] || 'lakhanglobal.com'}`);
      setMailboxIncomingPort(993);
      setMailboxIncomingSecurity('ssl');
      setMailboxIncomingUser(targetUser.email);
      setMailboxOutgoingProtocol('smtp');
      setMailboxOutgoingHost(`smtp.${targetUser.email.split('@')[1] || 'lakhanglobal.com'}`);
      setMailboxOutgoingPort(587);
      setMailboxOutgoingSecurity('starttls');
      setMailboxOutgoingUser(targetUser.email);
      setMailboxFromName(targetUser.name);
      setMailboxFromEmail(targetUser.email);
    }
    setMailboxTestResult(null);
  }, [selectedAdminId, adminMailboxes, availableUsers, currentUser]);

  // -------------------------------------------------------------
  // Default Organization Reply & Polling Gateway State
  // -------------------------------------------------------------
  const [gwIncomingProtocol, setGwIncomingProtocol] = useState<'imap' | 'pop3'>(defaultGateway.incomingProtocol || 'imap');
  const [gwIncomingHost, setGwIncomingHost] = useState(defaultGateway.incomingHost || 'imap.lakhanglobal.com');
  const [gwIncomingPort, setGwIncomingPort] = useState(defaultGateway.incomingPort || 993);
  const [gwIncomingSecurity, setGwIncomingSecurity] = useState(defaultGateway.incomingSecurity || 'ssl');
  const [gwIncomingUser, setGwIncomingUser] = useState(defaultGateway.incomingUsername || 'helpdesk@lakhanglobal.com');
  const [gwOutgoingHost, setGwOutgoingHost] = useState(defaultGateway.outgoingHost || 'smtp.lakhanglobal.com');
  const [gwOutgoingPort, setGwOutgoingPort] = useState(defaultGateway.outgoingPort || 587);
  const [gwOutgoingSecurity, setGwOutgoingSecurity] = useState(defaultGateway.outgoingSecurity || 'starttls');
  const [gwOutgoingUser, setGwOutgoingUser] = useState(defaultGateway.outgoingUsername || 'helpdesk@lakhanglobal.com');
  const [gwFromName, setGwFromName] = useState(defaultGateway.fromName || 'IT Helpdesk Support');
  const [gwFromEmail, setGwFromEmail] = useState(defaultGateway.fromEmail || 'helpdesk@lakhanglobal.com');
  const [gwReplyToEmail, setGwReplyToEmail] = useState(defaultGateway.replyToEmail || 'helpdesk@lakhanglobal.com');
  const [gwSubjectPrefix, setGwSubjectPrefix] = useState(defaultGateway.subjectPrefix || '[ITL-{{ticketId}}]');
  const [gwTesting, setGwTesting] = useState(false);
  const [gwTestResult, setGwTestResult] = useState<string | null>(null);
  const [gwTestEmailRecipient, setGwTestEmailRecipient] = useState(currentUser.email);

  // -------------------------------------------------------------
  // Organization Branding State
  // -------------------------------------------------------------
  const [brandTitle, setBrandTitle] = useState(organization.branding.productName);
  const [brandEmail, setBrandEmail] = useState(organization.branding.supportEmail);
  const [portalWelcome, setPortalWelcome] = useState(organization.branding.portalWelcome);
  const [savedBranding, setSavedBranding] = useState(false);

  // Handlers for Custom Fields
  const handleOpenNewField = () => {
    setEditingFieldId(null);
    setFieldLabel('');
    setFieldKey('');
    setFieldType('text');
    setFieldRequired(false);
    setFieldRequiredOnClose(false);
    setFieldPortalVisible(true);
    setFieldOptions('');
    setFieldPlaceholder('');
    setFieldDescription('');
    setFieldSection('general');
    setHasConditionalRule(false);
    setShowFieldModal(true);
  };

  const handleEditField = (f: CustomFieldDefinition) => {
    setEditingFieldId(f.id);
    setFieldLabel(f.label);
    setFieldKey(f.name);
    setFieldType(f.type);
    setFieldRequired(f.required);
    setFieldRequiredOnClose(f.requiredOnClose);
    setFieldPortalVisible(f.visibleOnPortal);
    setFieldOptions((f.options || []).join(', '));
    setFieldPlaceholder(f.placeholder || '');
    setFieldDescription(f.description || '');
    setFieldSection(f.section || 'general');
    if (f.conditionalRule) {
      setHasConditionalRule(true);
      setCondField(f.conditionalRule.dependsOnField);
      setCondOperator(f.conditionalRule.operator);
      setCondValue(f.conditionalRule.value);
    } else {
      setHasConditionalRule(false);
    }
    setShowFieldModal(true);
  };

  const handleSaveFieldForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldLabel.trim()) return;

    const payload: Partial<CustomFieldDefinition> = {
      label: fieldLabel.trim(),
      name: fieldKey.trim() || fieldLabel.toLowerCase().replace(/[^a-z0-9]+/g, ''),
      type: fieldType,
      required: fieldRequired,
      requiredOnClose: fieldRequiredOnClose,
      visibleOnPortal: fieldPortalVisible,
      description: fieldDescription,
      placeholder: fieldPlaceholder,
      section: fieldSection,
      options: fieldType === 'select' || fieldType === 'multiselect'
        ? fieldOptions.split(',').map((o) => o.trim()).filter(Boolean)
        : undefined,
      conditionalRule: hasConditionalRule
        ? {
            dependsOnField: condField,
            operator: condOperator,
            value: condValue,
          }
        : undefined,
    };

    if (editingFieldId) {
      onUpdateCustomField(editingFieldId, payload);
    } else {
      onCreateCustomField(payload);
    }

    setShowFieldModal(false);
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= customFields.length) return;
    const reordered = [...customFields];
    const temp = reordered[index];
    reordered[index] = reordered[newIdx];
    reordered[newIdx] = temp;
    onReorderCustomFields(reordered.map((f) => f.id));
  };

  // Handlers for Admin Mailbox
  const handleTestAdminMailbox = async () => {
    setMailboxTesting(true);
    setMailboxTestResult(null);
    try {
      const res = await onTestUserMailbox({
        incomingProtocol: mailboxIncomingProtocol,
        incomingHost: mailboxIncomingHost,
        incomingPort: mailboxIncomingPort,
        outgoingProtocol: mailboxOutgoingProtocol,
        outgoingHost: mailboxOutgoingHost,
        outgoingPort: mailboxOutgoingPort,
        incomingUsername: mailboxIncomingUser,
      });
      setMailboxTestResult(res);
    } catch (err: any) {
      setMailboxTestResult({ error: err.message || 'Connection handshake failed' });
    } finally {
      setMailboxTesting(false);
    }
  };

  const handleSaveAdminMailbox = async (e: React.FormEvent) => {
    e.preventDefault();
    setMailboxSaveStatus('Saving...');
    try {
      await onSaveUserMailbox(selectedAdminId, {
        incomingProtocol: mailboxIncomingProtocol,
        incomingHost: mailboxIncomingHost,
        incomingPort: Number(mailboxIncomingPort),
        incomingSecurity: mailboxIncomingSecurity,
        incomingUsername: mailboxIncomingUser,
        outgoingProtocol: mailboxOutgoingProtocol,
        outgoingHost: mailboxOutgoingHost,
        outgoingPort: Number(mailboxOutgoingPort),
        outgoingSecurity: mailboxOutgoingSecurity,
        outgoingUsername: mailboxOutgoingUser,
        fromName: mailboxFromName,
        fromEmail: mailboxFromEmail,
        status: 'connected',
      });
      setMailboxSaveStatus('✓ Mailbox connection saved successfully!');
      setTimeout(() => setMailboxSaveStatus(null), 3000);
    } catch (err: any) {
      setMailboxSaveStatus(`Error: ${err.message}`);
    }
  };

  // Handlers for Default Gateway
  const handleSaveDefaultGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSaveDefaultGateway({
        incomingProtocol: gwIncomingProtocol,
        incomingHost: gwIncomingHost,
        incomingPort: Number(gwIncomingPort),
        incomingSecurity: gwIncomingSecurity,
        incomingUsername: gwIncomingUser,
        outgoingProtocol: 'smtp',
        outgoingHost: gwOutgoingHost,
        outgoingPort: Number(gwOutgoingPort),
        outgoingSecurity: gwOutgoingSecurity,
        outgoingUsername: gwOutgoingUser,
        fromName: gwFromName,
        fromEmail: gwFromEmail,
        replyToEmail: gwReplyToEmail,
        subjectPrefix: gwSubjectPrefix,
      });
      setGwTestResult('✓ Default reply and polling gateway saved successfully!');
      setTimeout(() => setGwTestResult(null), 3500);
    } catch (err: any) {
      setGwTestResult(`Error saving: ${err.message}`);
    }
  };

  const handleTestDefaultGateway = async () => {
    setGwTesting(true);
    setGwTestResult(null);
    try {
      const res = await onTestDefaultGateway(gwTestEmailRecipient);
      setGwTestResult(res.message);
    } catch (err: any) {
      setGwTestResult(`Error: ${err.message}`);
    } finally {
      setGwTesting(false);
    }
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateOrganization(organization.id, {
      branding: {
        ...organization.branding,
        productName: brandTitle,
        supportEmail: brandEmail,
        portalWelcome,
      },
    });
    setSavedBranding(true);
    setTimeout(() => setSavedBranding(false), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !profileEmail.trim()) return;
    setProfileSaving(true);
    setProfileSuccessMsg(null);
    try {
      if (onUpdateUser) {
        await onUpdateUser(currentUser.id, {
          name: profileName.trim(),
          email: profileEmail.trim(),
          title: profileTitle.trim(),
          phone: profilePhone.trim(),
          avatar: profileAvatar.trim(),
        });
      }
      setProfileSuccessMsg('Profile updated successfully! Role and contact details synced.');
      setTimeout(() => setProfileSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleOpenNewUser = () => {
    setEditingUserId(null);
    setUserFormName('');
    setUserFormEmail('');
    setUserFormRole('requester');
    setUserFormTitle('Staff Member');
    setUserFormPhone('');
    setUserFormStatus('active');
    setShowUserModal(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setUserFormName(user.name);
    setUserFormEmail(user.email);
    setUserFormRole(user.role);
    setUserFormTitle(user.title || '');
    setUserFormPhone(user.phone || '');
    setUserFormStatus(user.status === 'suspended' ? 'suspended' : 'active');
    setShowUserModal(true);
  };

  const handleSaveUserForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormName.trim() || !userFormEmail.trim()) return;
    try {
      if (editingUserId) {
        if (onUpdateUser) {
          await onUpdateUser(editingUserId, {
            name: userFormName.trim(),
            email: userFormEmail.trim(),
            role: userFormRole,
            title: userFormTitle.trim(),
            phone: userFormPhone.trim(),
            status: userFormStatus,
          });
        }
      } else {
        if (onCreateUser) {
          await onCreateUser({
            name: userFormName.trim(),
            email: userFormEmail.trim(),
            role: userFormRole,
            title: userFormTitle.trim(),
            phone: userFormPhone.trim(),
            status: userFormStatus,
            organizationId: organization.id,
          });
        }
      }
      setShowUserModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed saving user');
    }
  };

  const executeDeleteUser = async () => {
    if (!userToDelete || !onDeleteUser) return;
    try {
      await onDeleteUser(userToDelete.id);
      setUserToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const handleCopyRegistrationLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const link = `${origin}/?view=portal&tab=register`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  const filteredUsers = availableUsers.filter((u) => {
    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      const match =
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.title && u.title.toLowerCase().includes(q)) ||
        u.id.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          Helpdesk Administration &amp; System Configuration
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Admin mailbox connectors, default reply gateway (POP3/SMTP/IMAP), dynamic form builder, SLAs, user directory, and Linux local hosting.
        </p>
      </div>

      {/* Neumorphic Navigation Tab Deck with smooth horizontal scroll and clear active states */}
      <div className="w-full overflow-x-auto custom-scrollbar pb-1">
        <div className="inline-flex items-center gap-2 p-1.5 neu-flat rounded-2xl border border-slate-200 dark:border-white/10 min-w-max">
          {[
            { id: 'profile', label: 'My Profile & Role', icon: UserIcon },
            { id: 'users', label: 'User Directory & Registration', icon: Users },
            { id: 'fields', label: 'Custom Fields & Form Builder', icon: Sliders },
            { id: 'admin-mailbox', label: 'Admin Mailboxes (IMAP/POP3/SMTP)', icon: Mail },
            { id: 'default-gateway', label: 'Default Reply & Polling Gateway', icon: Server },
            { id: 'sla', label: 'SLA Target Matrix', icon: Clock },
            { id: 'automations', label: 'Automation Rules', icon: Zap },
            { id: 'branding', label: 'Branding & Identity', icon: Palette },
            { id: 'linux-host', label: 'Linux Self-Hosting Guide', icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'neu-pressed text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 shadow-inner'
                    : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================= */}
      {/* TAB: My Profile & Role (Super Admin & Admin Profile Editing)  */}
      {/* ============================================================= */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Admin Profile Management &amp; Identity
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Update your official name, email address, job title/post, and phone number across the system.
              </p>
            </div>
            <div className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300">
              User ID: {currentUser.id}
            </div>
          </div>

          {profileSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              {profileSuccessMsg}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-2 neu-flat p-6 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Official Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 block font-medium">
                      Used for ticket reply attribution, notifications, and mailbox sync.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Designation / Post / Job Title *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lead Administrator, IT Operations Head"
                      value={profileTitle}
                      onChange={(e) => setProfileTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Direct Contact Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Profile Avatar URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or leave blank for initials"
                    value={profileAvatar}
                    onChange={(e) => setProfileAvatar(e.target.value)}
                    className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-200 dark:border-white/10">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    Changes take effect across all portal tickets and audit logs immediately.
                  </span>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="neu-btn-primary px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {profileSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving Profile...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Save Profile Details
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Profile Card & Permissions */}
            <div className="space-y-4">
              <div className="neu-card p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4 text-center sm:text-left">
                <div className="flex items-center gap-3">
                  {profileAvatar ? (
                    <img
                      src={profileAvatar}
                      alt={profileName}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-cyan-500/40 shadow-sm"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-cyan-700 dark:bg-cyan-600 text-white font-bold text-lg flex items-center justify-center border-2 border-cyan-500/40 shadow-sm">
                      {profileName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{profileName}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                      {profileTitle || 'IT Professional'}
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/40">
                      {currentUser.role}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Email:</span>
                    <span className="font-mono text-[11px] font-bold text-slate-900 dark:text-slate-100">{profileEmail}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Phone:</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{profilePhone || 'Not set'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Organization:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{organization.name}</span>
                  </div>
                </div>
              </div>

              <div className="neu-flat p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-2 text-xs">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Role Capabilities &amp; Access
                </div>
                <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 text-[11px]">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 font-bold" /> Ticket lifecycle &amp; administrative deletion rights
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 font-bold" /> Hardware Asset lifecycle &amp; stats reporting
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 font-bold" /> User directory &amp; self-registration management
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 font-bold" /> Dynamic form builder &amp; SLA matrix configuration
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB: User Management & Self-Registration Link                */}
      {/* ============================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                User Directory &amp; Registration Portal
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                All administrators can register new users, edit user roles/posts, or provide the self-registration link to staff.
              </p>
            </div>
            <button
              onClick={handleOpenNewUser}
              className="neu-btn-primary flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <UserPlus className="w-3.5 h-3.5" /> Register New User
            </button>
          </div>

          {/* Registration Link Share Banner */}
          <div className="neu-flat p-4.5 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-transparent space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <ExternalLink className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Self-Registration Link for Normal Users &amp; Employees
              </div>
              <button
                type="button"
                onClick={handleCopyRegistrationLink}
                className="neu-btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                {linkCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copied Link!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Registration Link
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              Share this link with employees so they can self-register with their email. The portal sends a 6-digit OTP to verify ownership before account creation and ticket submission.
            </p>
            <div className="p-2.5 rounded-xl neu-inset bg-slate-100 dark:bg-slate-950/80 border border-slate-300 dark:border-white/10 font-mono text-[11px] font-bold text-cyan-800 dark:text-cyan-300 break-all select-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/?view=portal&tab=register` : 'http://localhost:3000/?view=portal&tab=register'}
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Search by name, email, post/title..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 font-medium"
              />
              <UserIcon className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Filter Role:</span>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
              >
                <option value="all">All Roles ({availableUsers.length})</option>
                <option value="superadmin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="technician">Technician / Agent</option>
                <option value="requester">User / Requester</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="neu-flat rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 font-bold">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Designation / Post</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-lg object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-cyan-600 text-white font-bold text-[10px] flex items-center justify-center">
                              {user.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{user.name}</div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            user.role === 'superadmin'
                              ? 'text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-950/60 border-violet-300 dark:border-violet-800/40'
                              : user.role === 'admin'
                              ? 'text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-800/40'
                              : user.role === 'manager'
                              ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800/40'
                              : user.role === 'technician'
                              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800/40'
                              : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700/40'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {user.title || <span className="text-slate-400 italic">Not specified</span>}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {user.phone || <span className="text-slate-400">—</span>}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            user.status === 'suspended'
                              ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/30'
                              : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.status === 'suspended' ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                          />
                          {user.status === 'suspended' ? 'Suspended' : 'Active'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditUser(user)}
                            className="p-1.5 text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-300 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            title="Edit user details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setUserToDelete(user)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        No users found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 1: Advanced Dynamic Custom Fields & Form Builder */}
      {/* ============================================================= */}
      {activeTab === 'fields' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Dynamic Form Fields &amp; Attributes</h2>
              <p className="text-xs text-slate-400">
                Create custom fields, set closure validation gates, configure conditional logic, and preview form layouts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewMode(previewMode === 'off' ? 'portal' : 'off')}
                className={`neu-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  previewMode !== 'off'
                    ? 'neu-pressed text-indigo-700 dark:text-indigo-300 border border-indigo-500/40'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                {previewMode === 'off' ? 'Preview Live Form' : 'Hide Form Preview'}
              </button>
              <button
                onClick={handleOpenNewField}
                className="neu-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Field
              </button>
            </div>
          </div>

          {/* Form Live Preview Mode */}
          {previewMode !== 'off' && (
            <div className="neu-flat p-5 rounded-2xl border border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-indigo-200 dark:border-indigo-500/30">
                <div className="flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-300 font-bold">
                  <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Live Dynamic Form Preview
                </div>
                <div className="flex items-center gap-1 neu-inset p-1 rounded-lg border border-slate-200 dark:border-white/10 text-[11px]">
                  <button
                    onClick={() => setPreviewMode('portal')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                      previewMode === 'portal' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Requester (Portal View)
                  </button>
                  <button
                    onClick={() => setPreviewMode('technician')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                      previewMode === 'technician' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Technician (Console View)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Preview Ticket Category</label>
                  <select
                    value={previewFormValues['category'] || ''}
                    onChange={(e) =>
                      setPreviewFormValues({ ...previewFormValues, category: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="Software & Cloud Apps">Software &amp; Cloud Apps</option>
                    <option value="Hardware & Workstations">Hardware &amp; Workstations</option>
                    <option value="Network & Connectivity">Network &amp; Connectivity</option>
                    <option value="Security & Access">Security &amp; Access</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Preview Priority</label>
                  <select
                    value={previewFormValues['priority'] || ''}
                    onChange={(e) =>
                      setPreviewFormValues({ ...previewFormValues, priority: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                {customFields
                  .filter((f) => (previewMode === 'portal' ? f.visibleOnPortal : true))
                  .map((field) => {
                    // Check conditional rule
                    if (field.conditionalRule) {
                      const currentVal = previewFormValues[field.conditionalRule.dependsOnField];
                      const targetVal = field.conditionalRule.value;
                      const matches =
                        field.conditionalRule.operator === 'equals'
                          ? currentVal === targetVal
                          : currentVal !== targetVal;
                      if (!matches) return null;
                    }

                    return (
                      <div key={field.id} className="p-3 rounded-xl neu-card bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 space-y-1">
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                          {field.label} {field.required && <span className="text-rose-500 font-bold">*</span>}
                        </label>
                        {field.description && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{field.description}</div>
                        )}
                        {field.type === 'select' ? (
                          <select
                            value={previewFormValues[field.name] || ''}
                            onChange={(e) =>
                              setPreviewFormValues({ ...previewFormValues, [field.name]: e.target.value })
                            }
                            className="w-full px-2.5 py-1 text-xs neu-select bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                          >
                            <option value="">Select option...</option>
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : field.type === 'textarea' ? (
                          <textarea
                            rows={2}
                            placeholder={field.placeholder || ''}
                            value={previewFormValues[field.name] || ''}
                            onChange={(e) =>
                              setPreviewFormValues({ ...previewFormValues, [field.name]: e.target.value })
                            }
                            className="w-full p-2 text-xs neu-input bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                          />
                        ) : (
                          <input
                            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                            placeholder={field.placeholder || ''}
                            value={previewFormValues[field.name] || ''}
                            onChange={(e) =>
                              setPreviewFormValues({ ...previewFormValues, [field.name]: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 text-xs neu-input bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Fields Table wrapped in responsive scroll container */}
          <div className="neu-flat rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-100/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-white/10 uppercase tracking-wider font-bold text-[10px]">
                  <tr>
                    <th className="py-3 px-3 w-16 text-center">Order</th>
                    <th className="py-3 px-3">Field Label</th>
                    <th className="py-3 px-3">Variable Key</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Section</th>
                    <th className="py-3 px-3">Mandatory on Create</th>
                    <th className="py-3 px-3">Closure Gate</th>
                    <th className="py-3 px-3">Portal Visible</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {customFields.map((f, index) => (
                    <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-500 dark:text-slate-400">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveField(index, 'up')}
                            className="p-1 hover:text-cyan-600 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === customFields.length - 1}
                            onClick={() => handleMoveField(index, 'down')}
                            className="p-1 hover:text-cyan-600 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        {f.label}
                        {f.conditionalRule && (
                          <span className="block text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-medium">
                            ↳ if {f.conditionalRule.dependsOnField} == "{f.conditionalRule.value}"
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] font-bold text-cyan-700 dark:text-cyan-400">{f.name}</td>
                      <td className="py-3 px-3 font-mono text-[11px] uppercase font-bold text-slate-700 dark:text-slate-300">{f.type}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 capitalize font-medium">{f.section || 'General'}</td>
                      <td className="py-3 px-3">
                        {f.required ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold">Yes</span>
                        ) : (
                          <span className="text-slate-500 font-medium">Optional</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {f.requiredOnClose ? (
                          <span className="text-amber-700 dark:text-amber-400 font-bold">Yes (Gate)</span>
                        ) : (
                          <span className="text-slate-500 font-medium">No</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {f.visibleOnPortal ? (
                          <span className="text-cyan-700 dark:text-cyan-400 font-bold">Visible</span>
                        ) : (
                          <span className="text-slate-500 font-medium">Staff Only</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditField(f)}
                            className="p-1 text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-300 transition-colors cursor-pointer"
                            title="Edit Field"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete custom field "${f.label}"?`)) {
                                onDeleteCustomField(f.id);
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete Field"
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

      {/* ============================================================= */}
      {/* TAB 2: Admin & Super Admin Mailboxes (IMAP / POP3 / SMTP) */}
      {/* ============================================================= */}
      {activeTab === 'admin-mailbox' && (
        <div className="space-y-6">
          <div className="neu-flat p-6 rounded-2xl border border-slate-200 dark:border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-white/10">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  Admin &amp; Super Admin Mailbox Connector
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Connect administrator personal or shared email accounts via IMAP, POP3, and SMTP for bidirectional ticket processing.
                </p>
              </div>

              {/* User Selector if superadmin */}
              {currentUser.role === 'superadmin' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Configure for:</span>
                  <select
                    value={selectedAdminId}
                    onChange={(e) => setSelectedAdminId(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    {adminUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {mailboxSaveStatus && (
              <div
                className={`p-3.5 rounded-xl text-xs font-bold border ${
                  mailboxSaveStatus.startsWith('✓')
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300'
                }`}
              >
                {mailboxSaveStatus}
              </div>
            )}

            <form onSubmit={handleSaveAdminMailbox} className="space-y-6">
              {/* Section 1: Inbound Mail Server (IMAP / POP3) */}
              <div className="neu-card p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  1. Incoming Mail Server (IMAP or POP3)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Inbound Protocol *</label>
                    <select
                      value={mailboxIncomingProtocol}
                      onChange={(e) => {
                        const proto = e.target.value as 'imap' | 'pop3';
                        setMailboxIncomingProtocol(proto);
                        setMailboxIncomingPort(proto === 'pop3' ? 995 : 993);
                      }}
                      className="w-full px-3 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                    >
                      <option value="imap">IMAP (Recommended)</option>
                      <option value="pop3">POP3</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Server Hostname / IP *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. imap.company.com or pop.mail.com"
                      value={mailboxIncomingHost}
                      onChange={(e) => setMailboxIncomingHost(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Port *</label>
                    <input
                      type="number"
                      required
                      value={mailboxIncomingPort}
                      onChange={(e) => setMailboxIncomingPort(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Security / Encryption</label>
                    <select
                      value={mailboxIncomingSecurity}
                      onChange={(e) => setMailboxIncomingSecurity(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                    >
                      <option value="ssl">SSL / TLS (Encrypted)</option>
                      <option value="starttls">STARTTLS</option>
                      <option value="none">None (Plaintext)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Username / Mailbox</label>
                    <input
                      type="text"
                      required
                      value={mailboxIncomingUser}
                      onChange={(e) => setMailboxIncomingUser(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Password / App Key</label>
                    <input
                      type="password"
                      value={mailboxIncomingPass}
                      onChange={(e) => setMailboxIncomingPass(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Outbound Mail Server (SMTP) */}
              <div className="neu-card p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  2. Outgoing Mail Server (SMTP)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Protocol</label>
                    <input
                      type="text"
                      disabled
                      value="SMTP"
                      className="w-full px-3 py-1.5 text-xs neu-inset bg-slate-100 dark:bg-slate-900/50 border border-slate-300 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-300 font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">SMTP Hostname *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. smtp.company.com or smtp.office365.com"
                      value={mailboxOutgoingHost}
                      onChange={(e) => setMailboxOutgoingHost(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">SMTP Port *</label>
                    <input
                      type="number"
                      required
                      value={mailboxOutgoingPort}
                      onChange={(e) => setMailboxOutgoingPort(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Encryption</label>
                    <select
                      value={mailboxOutgoingSecurity}
                      onChange={(e) => setMailboxOutgoingSecurity(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                    >
                      <option value="starttls">STARTTLS (Port 587)</option>
                      <option value="ssl">SSL / TLS (Port 465)</option>
                      <option value="none">None (Port 25)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">SMTP Username</label>
                    <input
                      type="text"
                      value={mailboxOutgoingUser}
                      onChange={(e) => setMailboxOutgoingUser(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Sender Display Name</label>
                    <input
                      type="text"
                      value={mailboxFromName}
                      onChange={(e) => setMailboxFromName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">From Email Address</label>
                    <input
                      type="email"
                      value={mailboxFromEmail}
                      onChange={(e) => setMailboxFromEmail(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Test Handshake Results */}
              {mailboxTestResult && (
                <div
                  className={`p-4 rounded-xl text-xs space-y-2 border ${
                    mailboxTestResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <div className="font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Mailbox Handshake Test Passed (Latency: {mailboxTestResult.latencyMs}ms)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono font-medium">
                    <div>• Inbound: {mailboxTestResult.incomingCheck?.status}</div>
                    <div>• Outbound: {mailboxTestResult.outgoingCheck?.status}</div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  disabled={mailboxTesting}
                  onClick={handleTestAdminMailbox}
                  className="neu-btn flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${mailboxTesting ? 'animate-spin' : ''}`} />
                  {mailboxTesting ? 'Testing Handshake...' : 'Test Connection Handshake'}
                </button>

                <button
                  type="submit"
                  className="neu-btn-primary px-5 py-2 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Save Mailbox Connection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 3: Default Organization Reply & Polling Gateway */}
      {/* ============================================================= */}
      {activeTab === 'default-gateway' && (
        <div className="neu-flat p-6 rounded-2xl border border-slate-200 dark:border-white/10 space-y-6 max-w-full overflow-x-hidden">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              Default Reply &amp; Inbound Ticket Gateway Configuration
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Configure the central POP3 / SMTP / IMAP parameters used by default to email ticket responses to users and poll incoming emails.
            </p>
          </div>

          {gwTestResult && (
            <div
              className={`p-3.5 rounded-xl text-xs font-bold border ${
                gwTestResult.startsWith('✓') || gwTestResult.startsWith('Test')
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300'
              }`}
            >
              {gwTestResult}
            </div>
          )}

          <form onSubmit={handleSaveDefaultGateway} className="space-y-6">
            {/* Outgoing Mailer for Public Replies */}
            <div className="neu-card p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <Send className="w-4 h-4" />
                Default Outbound Mailer for Public Replies (SMTP)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">SMTP Server Hostname *</label>
                  <input
                    type="text"
                    required
                    value={gwOutgoingHost}
                    onChange={(e) => setGwOutgoingHost(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">SMTP Port *</label>
                  <input
                    type="number"
                    required
                    value={gwOutgoingPort}
                    onChange={(e) => setGwOutgoingPort(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Security</label>
                  <select
                    value={gwOutgoingSecurity}
                    onChange={(e) => setGwOutgoingSecurity(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="starttls">STARTTLS</option>
                    <option value="ssl">SSL / TLS</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">SMTP Username</label>
                  <input
                    type="text"
                    value={gwOutgoingUser}
                    onChange={(e) => setGwOutgoingUser(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">From Name</label>
                  <input
                    type="text"
                    value={gwFromName}
                    onChange={(e) => setGwFromName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Sender From Email</label>
                  <input
                    type="email"
                    value={gwFromEmail}
                    onChange={(e) => setGwFromEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Reply-To Address</label>
                  <input
                    type="email"
                    value={gwReplyToEmail}
                    onChange={(e) => setGwReplyToEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Subject Threading Token Pattern</label>
                <input
                  type="text"
                  value={gwSubjectPrefix}
                  onChange={(e) => setGwSubjectPrefix(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-medium"
                />
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium mt-0.5 block">
                  Must include <code className="text-cyan-700 dark:text-cyan-400 font-mono font-bold">[ITL-&#123;&#123;ticketId&#125;&#125;]</code> to automatically thread incoming replies back to the ticket.
                </span>
              </div>
            </div>

            {/* Inbound Polling Server */}
            <div className="neu-card p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 flex items-center gap-2">
                <Server className="w-4 h-4" />
                Default Inbound Poller (IMAP or POP3)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Protocol</label>
                  <select
                    value={gwIncomingProtocol}
                    onChange={(e) => setGwIncomingProtocol(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="imap">IMAP</option>
                    <option value="pop3">POP3</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Inbound Server Host</label>
                  <input
                    type="text"
                    value={gwIncomingHost}
                    onChange={(e) => setGwIncomingHost(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Port</label>
                  <input
                    type="number"
                    value={gwIncomingPort}
                    onChange={(e) => setGwIncomingPort(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="email"
                  placeholder="recipient@example.com"
                  value={gwTestEmailRecipient}
                  onChange={(e) => setGwTestEmailRecipient(e.target.value)}
                  className="px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 w-52"
                />
                <button
                  type="button"
                  disabled={gwTesting}
                  onClick={handleTestDefaultGateway}
                  className="neu-btn px-3.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {gwTesting ? 'Sending Test...' : 'Send Live Test Email'}
                </button>
              </div>

              <button
                type="submit"
                className="neu-btn-primary px-5 py-2 text-xs font-bold rounded-xl cursor-pointer"
              >
                Save Default Gateway
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 4: SLA Policies */}
      {/* ============================================================= */}
      {activeTab === 'sla' && (
        <div className="neu-flat p-6 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4 max-w-full overflow-x-hidden">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              Service Level Agreement (SLA) Matrix
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Target response times and final resolution windows categorized by ticket severity priority.
            </p>
          </div>

          <div className="neu-card rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead className="bg-slate-100/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-white/10 uppercase tracking-wider font-bold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Priority Level</th>
                    <th className="py-3 px-4">Policy Name &amp; Description</th>
                    <th className="py-3 px-4">First Response Target</th>
                    <th className="py-3 px-4">Resolution Target</th>
                    <th className="py-3 px-4 text-right">Operating Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {slaPolicies.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-bold uppercase font-mono text-cyan-700 dark:text-cyan-400">{p.priority}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{p.description}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {p.firstResponseMinutes < 60
                          ? `${p.firstResponseMinutes} mins`
                          : `${p.firstResponseMinutes / 60} hours`}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-cyan-700 dark:text-cyan-400">
                        {p.resolutionMinutes / 60} hours
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {p.businessHoursOnly ? '9AM - 6PM Business Days' : '24x7 Continuous'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 5: Automation Rules */}
      {/* ============================================================= */}
      {activeTab === 'automations' && (
        <div className="neu-flat p-6 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4 max-w-full overflow-x-hidden">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              Automated Incident Routing &amp; Escalation Rules
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Event-driven routing triggers, auto-assignment, and SLA warning notifications.
            </p>
          </div>

          <div className="space-y-3">
            {automationRules.map((rule) => (
              <div key={rule.id} className="neu-card p-4.5 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">{rule.name}</h3>
                    <span className="text-[10px] font-mono font-bold text-cyan-800 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-300 dark:border-cyan-800/40">
                      Trigger: {rule.trigger}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{rule.description}</p>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Executed {rule.executionCount || 0} times &bull; Last run: {rule.lastExecutedAt ? new Date(rule.lastExecutedAt).toLocaleTimeString() : 'Never'}
                  </div>
                </div>

                <button
                  onClick={() => onToggleRule(rule.id)}
                  className={`px-3.5 py-1.5 text-xs rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto ${
                    rule.enabled
                      ? 'neu-btn-primary'
                      : 'neu-btn text-slate-500'
                  }`}
                >
                  {rule.enabled ? 'Active Rule' : 'Disabled'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 6: Branding & Portal Identity */}
      {/* ============================================================= */}
      {activeTab === 'branding' && (
        <div className="neu-flat p-6 rounded-2xl border border-slate-200 dark:border-white/10 max-w-2xl space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              Portal Branding &amp; Organization Identity
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Customize product title, contact support email, and user welcome banner.
            </p>
          </div>

          {savedBranding && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              ✓ Branding settings saved successfully!
            </div>
          )}

          <form onSubmit={handleSaveBranding} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Product Title</label>
              <input
                type="text"
                value={brandTitle}
                onChange={(e) => setBrandTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Support Email Address</label>
              <input
                type="email"
                value={brandEmail}
                onChange={(e) => setBrandEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Portal Welcome Notice</label>
              <textarea
                rows={3}
                value={portalWelcome}
                onChange={(e) => setPortalWelcome(e.target.value)}
                className="w-full p-2.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="neu-btn-primary px-5 py-2 text-xs font-bold rounded-xl cursor-pointer"
              >
                Save Branding Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB: Linux Self-Hosting Guide & Local Server Setup           */}
      {/* ============================================================= */}
      {activeTab === 'linux-host' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-500" />
                Local Linux Server Deployment &amp; Hosting Guide
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Run IT Helpdesk locally on your Ubuntu, Debian, or RHEL server as a standalone systemd daemon or container.
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Express Backend Ready (0.0.0.0:3000)
            </div>
          </div>

          {/* Quick Distro Selector */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
            {[
              { id: 'ubuntu', label: 'Ubuntu / Debian (Native systemd)' },
              { id: 'rhel', label: 'RHEL / Rocky / AlmaLinux' },
              { id: 'docker', label: 'Docker & Compose' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setLinuxDistro(d.id as any)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  linuxDistro === d.id
                    ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Installation Instructions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Step 1 & 2 */}
            <div className="neu-flat p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                  1
                </span>
                Prerequisites &amp; Repository Setup
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                Install Node.js 20+ LTS and npm, then clone and build the application inside your server directory (e.g. <code>/opt/it-helpdesk</code>):
              </p>
              <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-1.5 overflow-x-auto custom-scrollbar select-all border border-slate-800 shadow-inner">
                {linuxDistro === 'ubuntu' || linuxDistro === 'debian' ? (
                  <>
                    <div className="text-slate-400"># Install Node.js 20 LTS on Ubuntu/Debian</div>
                    <div>curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -</div>
                    <div>sudo apt-get install -y nodejs git build-essential</div>
                  </>
                ) : linuxDistro === 'rhel' ? (
                  <>
                    <div className="text-slate-400"># Install Node.js 20 LTS on RHEL / Rocky Linux</div>
                    <div>sudo dnf module enable nodejs:20 -y</div>
                    <div>sudo dnf install -y nodejs git gcc-c++ make</div>
                  </>
                ) : (
                  <>
                    <div className="text-slate-400"># Docker engine check</div>
                    <div>docker --version &amp;&amp; docker compose version</div>
                  </>
                )}
                <div className="text-slate-400 pt-1"># Clone &amp; Install App Dependencies</div>
                <div>git clone &lt;your-repo-url&gt; /opt/it-helpdesk</div>
                <div>cd /opt/it-helpdesk &amp;&amp; npm install</div>
                <div>npm run build</div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white pt-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                  2
                </span>
                Environment Variables (<code>/opt/it-helpdesk/.env</code>)
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-1 overflow-x-auto custom-scrollbar select-all border border-slate-800 shadow-inner">
                <div className="text-cyan-400">PORT=3000</div>
                <div className="text-cyan-400">NODE_ENV=production</div>
                <div className="text-cyan-400">HOST=0.0.0.0</div>
                <div className="text-slate-400"># Optional IMAP/SMTP Poller intervals</div>
                <div>EMAIL_POLL_INTERVAL_SEC=60</div>
              </div>
            </div>

            {/* Step 3: systemd daemon or docker-compose */}
            <div className="neu-flat p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                  3
                </span>
                {linuxDistro === 'docker' ? 'docker-compose.yml Service' : 'systemd Service Daemon'}
              </div>

              {linuxDistro === 'docker' ? (
                <>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    Create <code>docker-compose.yml</code> for single-command start:
                  </p>
                  <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto custom-scrollbar select-all border border-slate-800 leading-relaxed shadow-inner">
{`version: '3.8'
services:
  it-helpdesk:
    build: .
    restart: always
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
    volumes:
      - ./data:/app/data`}
                  </pre>
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
                    docker compose up -d
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    Create <code>/etc/systemd/system/it-helpdesk.service</code> so the portal restarts on server reboot:
                  </p>
                  <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto custom-scrollbar select-all border border-slate-800 leading-relaxed shadow-inner">
{`[Unit]
Description=IT Helpdesk Service by Lakhan
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/it-helpdesk
ExecStart=/usr/bin/npx tsx server.ts
Restart=on-failure
RestartSec=5s
Environment=NODE_ENV=production PORT=3000

[Install]
WantedBy=multi-user.target`}
                  </pre>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400 space-y-1">
                    <div>sudo systemctl daemon-reload</div>
                    <div>sudo systemctl enable --now it-helpdesk</div>
                    <div>sudo systemctl status it-helpdesk</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Nginx & Firewall */}
          <div className="neu-flat p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Nginx Reverse Proxy &amp; SSL (Optional HTTPS Domain)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Proxy incoming port 80/443 traffic to local port 3000 with WebSocket support:
            </p>
            <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto select-all border border-slate-800 leading-relaxed">
{`server {
    listen 80;
    server_name helpdesk.yourcompany.local;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}`}
            </pre>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* Modal: Create or Edit User (Admin Management)                */}
      {/* ============================================================= */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md neu-modal p-6 rounded-2xl border border-slate-200 dark:border-white/15 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-base pb-3 border-b border-slate-200 dark:border-white/10">
              <UserPlus className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              {editingUserId ? 'Edit User Profile & Role' : 'Register New User'}
            </div>

            <form onSubmit={handleSaveUserForm} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={userFormName}
                  onChange={(e) => setUserFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={userFormEmail}
                  onChange={(e) => setUserFormEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Role</label>
                  <select
                    value={userFormRole}
                    onChange={(e) => setUserFormRole(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="requester">User / Requester</option>
                    <option value="technician">Technician / Agent</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrator</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Status</label>
                  <select
                    value={userFormStatus}
                    onChange={(e) => setUserFormStatus(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Designation / Post / Job Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Finance Analyst, Cloud Engineer"
                  value={userFormTitle}
                  onChange={(e) => setUserFormTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Phone</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={userFormPhone}
                  onChange={(e) => setUserFormPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="neu-btn px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="neu-btn-primary px-5 py-2 text-xs font-bold rounded-xl cursor-pointer"
                >
                  {editingUserId ? 'Save Changes' : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* Modal: Delete User Confirmation                               */}
      {/* ============================================================= */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full neu-modal p-6 rounded-2xl border border-rose-300 dark:border-rose-500/30 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete User Confirmation</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Permanently remove user from directory</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              Are you sure you want to permanently remove <span className="font-bold text-slate-900 dark:text-white">{userToDelete.name}</span> ({userToDelete.email})? They will lose access to the portal immediately.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="neu-btn px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteUser}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-xs cursor-pointer"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* Modal: Create or Edit Dynamic Custom Field */}
      {/* ============================================================= */}
      {showFieldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg neu-modal p-6 rounded-2xl border border-slate-200 dark:border-white/15 max-h-[90vh] overflow-y-auto custom-scrollbar space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
              <Sliders className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              {editingFieldId ? 'Edit Custom Field' : 'Create Dynamic Custom Field'}
            </h3>

            <form onSubmit={handleSaveFieldForm} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Display Label *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Device Asset Tag"
                    value={fieldLabel}
                    onChange={(e) => {
                      setFieldLabel(e.target.value);
                      if (!editingFieldId) {
                        setFieldKey(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, ''));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Field Key (JSON)</label>
                  <input
                    type="text"
                    required
                    value={fieldKey}
                    onChange={(e) => setFieldKey(e.target.value)}
                    className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Data Type</label>
                  <select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="text">Single-line Text</option>
                    <option value="textarea">Multi-line Text</option>
                    <option value="select">Dropdown Select</option>
                    <option value="multiselect">Multi-select Checkboxes</option>
                    <option value="number">Integer / Number</option>
                    <option value="date">Date</option>
                    <option value="checkbox">Yes / No Checkbox</option>
                    <option value="user">User Selector</option>
                    <option value="asset">Asset Selector</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Display Section</label>
                  <select
                    value={fieldSection}
                    onChange={(e) => setFieldSection(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="general">General Information</option>
                    <option value="technical">Technical Specifications</option>
                    <option value="environment">Environment &amp; Infrastructure</option>
                    <option value="closure">Closure &amp; Post-Mortem</option>
                  </select>
                </div>
              </div>

              {(fieldType === 'select' || fieldType === 'multiselect') && (
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Allowed Options (comma separated) *
                  </label>
                  <input
                    type="text"
                    placeholder="Option 1, Option 2, Option 3"
                    value={fieldOptions}
                    onChange={(e) => setFieldOptions(e.target.value)}
                    className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Placeholder Text</label>
                  <input
                    type="text"
                    placeholder="e.g. Enter AST-1042..."
                    value={fieldPlaceholder}
                    onChange={(e) => setFieldPlaceholder(e.target.value)}
                    className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Help Description</label>
                  <input
                    type="text"
                    placeholder="Guidance shown below field"
                    value={fieldDescription}
                    onChange={(e) => setFieldDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>
              </div>

              {/* Behavior & Gate Toggles */}
              <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="mReq"
                    checked={fieldRequired}
                    onChange={(e) => setFieldRequired(e.target.checked)}
                    className="rounded border-slate-300 text-cyan-600"
                  />
                  <label htmlFor="mReq" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Mandatory when creating ticket
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="mClose"
                    checked={fieldRequiredOnClose}
                    onChange={(e) => setFieldRequiredOnClose(e.target.checked)}
                    className="rounded border-slate-300 text-cyan-600"
                  />
                  <label htmlFor="mClose" className="text-xs font-bold text-amber-700 dark:text-amber-300 cursor-pointer">
                    Mandatory on Closure Gate (Enforce before resolving/closing)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="mPortal"
                    checked={fieldPortalVisible}
                    onChange={(e) => setFieldPortalVisible(e.target.checked)}
                    className="rounded border-slate-300 text-cyan-600"
                  />
                  <label htmlFor="mPortal" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Visible to normal users on Self-Service Portal
                  </label>
                </div>
              </div>

              {/* Conditional Visibility Rules */}
              <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="mCond"
                    checked={hasConditionalRule}
                    onChange={(e) => setHasConditionalRule(e.target.checked)}
                    className="rounded border-slate-300 text-cyan-600"
                  />
                  <label htmlFor="mCond" className="text-xs font-bold text-indigo-700 dark:text-indigo-300 cursor-pointer">
                    Enable Conditional Display Rule (Show only when condition met)
                  </label>
                </div>

                {hasConditionalRule && (
                  <div className="p-3 rounded-xl neu-card bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 block text-[10px] font-bold mb-0.5">When Field</span>
                      <select
                        value={condField}
                        onChange={(e) => setCondField(e.target.value)}
                        className="w-full px-2 py-1 text-xs neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-200 font-semibold"
                      >
                        <option value="category">Category</option>
                        <option value="priority">Priority</option>
                        <option value="type">Type</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-slate-600 dark:text-slate-400 block text-[10px] font-bold mb-0.5">Operator</span>
                      <select
                        value={condOperator}
                        onChange={(e) => setCondOperator(e.target.value as any)}
                        className="w-full px-2 py-1 text-xs neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-200 font-semibold"
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Does Not Equal</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-slate-600 dark:text-slate-400 block text-[10px] font-bold mb-0.5">Target Value</span>
                      <input
                        type="text"
                        value={condValue}
                        onChange={(e) => setCondValue(e.target.value)}
                        className="w-full px-2 py-1 text-xs neu-input bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowFieldModal(false)}
                  className="neu-btn px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="neu-btn-primary px-5 py-2 text-xs font-bold rounded-xl cursor-pointer"
                >
                  {editingFieldId ? 'Update Field' : 'Create Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
