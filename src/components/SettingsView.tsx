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
  KeyRound,
  ShieldCheck,
  HardDrive,
  CheckSquare,
  Square,
  Download,
  Key,
  Search,
  EyeOff,
  Sparkles,
  Building2,
  Upload,
  Laptop,
  Tag,
} from 'lucide-react';
import { api } from '../services/api';
import {
  CustomFieldDefinition,
  SlaPolicy,
  AutomationRule,
  Organization,
  User,
  UserRole,
  AdminPrivileges,
  MailboxConnectionConfig,
  DefaultEmailGatewayConfig,
  Asset,
  Team,
} from '../types';
import { AssetFormModal } from './AssetFormModal';
import { SearchableEmployeeSelect } from './SearchableEmployeeSelect';

interface SettingsViewProps {
  organization: Organization;
  organizations?: Organization[];
  currentUser: User;
  availableUsers: User[];
  customFields: CustomFieldDefinition[];
  slaPolicies: SlaPolicy[];
  automationRules: AutomationRule[];
  adminMailboxes: MailboxConnectionConfig[];
  defaultGateway: DefaultEmailGatewayConfig;
  assets?: Asset[];
  onUpdateOrganization: (id: string, payload: Partial<Organization>) => void;
  onCreateCustomField: (data: Partial<CustomFieldDefinition>) => void;
  onUpdateCustomField: (id: string, data: Partial<CustomFieldDefinition>) => void;
  onDeleteCustomField: (id: string) => void;
  onReorderCustomFields: (orderedIds: string[]) => void;
  onToggleRule: (id: string) => void;
  onCreateAutomationRule?: (rule: Partial<AutomationRule>) => Promise<void>;
  onUpdateAutomationRule?: (id: string, updates: Partial<AutomationRule>) => Promise<void>;
  onDeleteAutomationRule?: (id: string) => Promise<void>;
  onSaveUserMailbox: (userId: string, data: Partial<MailboxConnectionConfig>) => Promise<any>;
  onTestUserMailbox: (data: any) => Promise<any>;
  onSaveDefaultGateway: (data: Partial<DefaultEmailGatewayConfig>) => Promise<any>;
  onTestDefaultGateway: (email?: string) => Promise<any>;
  onUpdateUser?: (id: string, data: Partial<User>) => Promise<any>;
  onCreateUser?: (data: Partial<User>) => Promise<any>;
  onDeleteUser?: (id: string) => Promise<any>;
  onCreateAsset?: (data: Partial<Asset>) => void;
  onUpdateAsset?: (id: string, data: Partial<Asset>) => void;
  onDeleteAsset?: (id: string) => void;
  onBulkDeleteAssets?: (ids: string[]) => void;
  onBulkCreateAssets?: (assets: Partial<Asset>[]) => void;
  initialTab?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  organization,
  organizations = [],
  currentUser,
  availableUsers,
  customFields,
  slaPolicies,
  automationRules,
  adminMailboxes,
  defaultGateway,
  assets = [],
  onUpdateOrganization,
  onCreateCustomField,
  onUpdateCustomField,
  onDeleteCustomField,
  onReorderCustomFields,
  onToggleRule,
  onCreateAutomationRule,
  onUpdateAutomationRule,
  onDeleteAutomationRule,
  onSaveUserMailbox,
  onTestUserMailbox,
  onSaveDefaultGateway,
  onTestDefaultGateway,
  onUpdateUser,
  onCreateUser,
  onDeleteUser,
  onCreateAsset,
  onUpdateAsset,
  onDeleteAsset,
  onBulkDeleteAssets,
  onBulkCreateAssets,
  initialTab,
}) => {
  const allOrganizations = organizations && organizations.length > 0 ? organizations : [organization];

  const [activeTab, setActiveTab] = useState<
    'profile' | 'users' | 'assets' | 'fields' | 'admin-mailbox' | 'default-gateway' | 'sla' | 'automations' | 'branding' | 'linux-host'
  >(() => {
    // If initialTab is branding but user is not superadmin, fallback to profile
    if (initialTab === 'branding' && currentUser.role !== 'superadmin') return 'profile';
    return (initialTab as any) || 'profile';
  });

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

  // Profile Change Password State (Super Admin & Users can change password in Profile Settings)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrMsg, setPasswordErrMsg] = useState<string | null>(null);

  const [userFormOrgId, setUserFormOrgId] = useState(organization.id);
  const [copiedOrgId, setCopiedOrgId] = useState<string | null>(null);

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
  const [userSegmentTab, setUserSegmentTab] = useState<'all' | 'admins' | 'staff' | 'requesters'>('all');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userFormName, setUserFormName] = useState('');
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormEmployeeCode, setUserFormEmployeeCode] = useState('');
  const [userFormRole, setUserFormRole] = useState<UserRole>('requester');
  const [userFormTitle, setUserFormTitle] = useState('');
  const [userFormPhone, setUserFormPhone] = useState('');
  const [userFormTeam, setUserFormTeam] = useState('General Operations');
  const [userFormGroupId, setUserFormGroupId] = useState('');
  const [userFormGroupName, setUserFormGroupName] = useState('');
  const [userFormManagerId, setUserFormManagerId] = useState('');
  const [userFormStatus, setUserFormStatus] = useState<'active' | 'suspended'>('active');
  const [userFormCanManageTickets, setUserFormCanManageTickets] = useState(true);
  const [userFormCanDeleteTickets, setUserFormCanDeleteTickets] = useState(false);
  const [userFormCanManageAssets, setUserFormCanManageAssets] = useState(true);
  const [userFormCanManageKb, setUserFormCanManageKb] = useState(false);
  const [userFormCanManageApprovals, setUserFormCanManageApprovals] = useState(false);
  // Left pane navigation view privileges
  const [userFormCanViewDashboard, setUserFormCanViewDashboard] = useState(true);
  const [userFormCanViewTickets, setUserFormCanViewTickets] = useState(true);
  const [userFormCanViewAssets, setUserFormCanViewAssets] = useState(true);
  const [userFormCanViewApprovals, setUserFormCanViewApprovals] = useState(false);
  const [userFormCanViewReports, setUserFormCanViewReports] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Requester Groups & Teams loaded from backend
  const [dbTeams, setDbTeams] = useState<Team[]>([]);

  useEffect(() => {
    api.getTeams().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setDbTeams(data);
      }
    }).catch(() => {});
  }, []);

  // Super Admin Reset Password of Everyone State
  const [resetUserTarget, setResetUserTarget] = useState<User | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [resetErrMsg, setResetErrMsg] = useState<string | null>(null);

  const [linkCopied, setLinkCopied] = useState(false);
  const [linuxDistro, setLinuxDistro] = useState<'ubuntu' | 'debian' | 'rhel' | 'docker'>('ubuntu');

  // Pre-Shared Key (PSK) State (Point 3: Super Admin Option to Create/Update PSK)
  const [pskValue, setPskValue] = useState('Sports@9433');
  const [pskVisible, setPskVisible] = useState(false);
  const [pskSaving, setPskSaving] = useState(false);
  const [pskCopied, setPskCopied] = useState(false);
  const [pskSuccessMsg, setPskSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    api.getSystemSettings().then((res) => {
      if (res && res.preSharedKey) {
        setPskValue(res.preSharedKey);
      }
    }).catch(() => {});
  }, []);

  // Database Backup & Disaster Recovery State
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const [restoreErrMsg, setRestoreErrMsg] = useState<string | null>(null);

  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    try {
      const blob = await api.downloadBackup();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `it-helpdesk-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to download backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleUploadRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('WARNING: Restoring a database backup will overwrite existing tickets, users, and settings. Are you sure you want to proceed?')) {
      e.target.value = '';
      return;
    }
    setRestoreLoading(true);
    setRestoreErrMsg(null);
    setRestoreSuccessMsg(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = await api.restoreBackup(json);
        setRestoreSuccessMsg(res.message || 'Database restored successfully! Refreshing...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err: any) {
        setRestoreErrMsg(err.message || 'Failed to restore database from backup file.');
      } finally {
        setRestoreLoading(false);
      }
    };
    reader.readAsText(file);
  };

  // Per-Organization PSK and Custom Registration Link State
  const [orgPskValues, setOrgPskValues] = useState<Record<string, string>>({});
  const [orgPskVisible, setOrgPskVisible] = useState<Record<string, boolean>>({});
  const [orgPskSaving, setOrgPskSaving] = useState<Record<string, boolean>>({});
  const [orgCopiedLink, setOrgCopiedLink] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initial: Record<string, string> = {};
    allOrganizations.forEach((org) => {
      initial[org.id] = org.preSharedKey || org.systemSettings?.preSharedKey || 'Sports@9433';
    });
    setOrgPskValues(initial);
  }, [allOrganizations]);

  const handleCopyOrgLink = (orgId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const link = `${origin}/?view=portal&tab=register&orgId=${orgId}`;
    navigator.clipboard.writeText(link);
    setOrgCopiedLink((prev) => ({ ...prev, [orgId]: true }));
    setTimeout(() => {
      setOrgCopiedLink((prev) => ({ ...prev, [orgId]: false }));
    }, 2500);
  };

  const handleGenerateOrgPsk = (orgId: string) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let generated = '';
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setOrgPskValues((prev) => ({ ...prev, [orgId]: generated }));
  };

  const handleSaveOrgPsk = async (orgId: string) => {
    const newKey = orgPskValues[orgId]?.trim();
    if (!newKey) {
      alert('Pre-Shared Key cannot be empty');
      return;
    }
    setOrgPskSaving((prev) => ({ ...prev, [orgId]: true }));
    try {
      if (onUpdateOrganization) {
        await onUpdateOrganization(orgId, { preSharedKey: newKey });
      } else {
        await api.updateOrganization(orgId, { preSharedKey: newKey });
      }
      setPskSuccessMsg(`Pre-Shared Key for organization updated successfully!`);
      setTimeout(() => setPskSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed updating Pre-Shared Key');
    } finally {
      setOrgPskSaving((prev) => ({ ...prev, [orgId]: false }));
    }
  };

  // -------------------------------------------------------------
  // Automation Rules Management State (Super Admin & Admin Custom Automations)
  // -------------------------------------------------------------
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [ruleTrigger, setRuleTrigger] = useState<'ticket_created' | 'ticket_updated' | 'status_changed' | 'priority_changed'>('ticket_created');
  const [ruleConditions, setRuleConditions] = useState<Array<{ field: string; operator: 'equals' | 'contains' | 'is_empty' | 'not_equals'; value: string }>>([
    { field: 'category', operator: 'contains', value: '' }
  ]);
  const [ruleActions, setRuleActions] = useState<Array<{ type: 'assign_technician' | 'assign_team' | 'set_priority' | 'set_status' | 'add_internal_note' | 'add_tag'; value: string }>>([
    { type: 'assign_team', value: 'team-infra-net' }
  ]);
  const [ruleEnabled, setRuleEnabled] = useState(true);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<AutomationRule | null>(null);

  const AVAILABLE_TEAMS = [
    { id: 'team-l1-helpdesk', name: 'Tier 1 Service Desk' },
    { id: 'team-infra-net', name: 'Cloud & Network Operations' },
    { id: 'team-sec-ops', name: 'Cybersecurity & Compliance' },
    { id: 'team-workplace', name: 'Workplace Hardware Logistics' },
  ];

  const AUTOMATION_TEMPLATES = [
    {
      name: 'Auto-Route Network & VPN to Cloud & NetOps',
      description: 'Directly assign all network incidents to the Cloud & Network Operations team with High priority.',
      trigger: 'ticket_created' as const,
      conditions: [{ field: 'category', operator: 'contains' as const, value: 'Network' }],
      actions: [
        { type: 'assign_team' as const, value: 'team-infra-net' },
        { type: 'set_priority' as const, value: 'high' },
        { type: 'add_tag' as const, value: 'netops-auto' }
      ],
    },
    {
      name: 'Auto-Escalate Critical Incidents to P1',
      description: 'When ticket priority is critical, mark with tag and post internal emergency incident protocol.',
      trigger: 'ticket_created' as const,
      conditions: [{ field: 'priority', operator: 'equals' as const, value: 'critical' }],
      actions: [
        { type: 'add_internal_note' as const, value: '[AUTO-ESCALATION]: Critical Sev-1 ticket created. Incident commander notified per P1 SLA Runbook.' },
        { type: 'add_tag' as const, value: 'p1-escalated' }
      ],
    },
    {
      name: 'Auto-Assign Hardware Faults to Workplace Logistics',
      description: 'Route defective hardware, laptop, and monitor tickets to Hardware Logistics.',
      trigger: 'ticket_created' as const,
      conditions: [{ field: 'category', operator: 'contains' as const, value: 'Hardware' }],
      actions: [
        { type: 'assign_team' as const, value: 'team-workplace' },
        { type: 'add_tag' as const, value: 'hw-logistics' }
      ],
    },
    {
      name: 'Auto-Prioritize Security & Phishing Reports',
      description: 'Elevate security reports to High and route immediately to SecOps team.',
      trigger: 'ticket_created' as const,
      conditions: [{ field: 'category', operator: 'contains' as const, value: 'Security' }],
      actions: [
        { type: 'set_priority' as const, value: 'high' },
        { type: 'assign_team' as const, value: 'team-sec-ops' },
        { type: 'add_tag' as const, value: 'sec-alert' }
      ],
    },
    {
      name: 'Auto-Resolution Protocol on Resolved Status',
      description: 'When status changes to resolved, automatically append resolution audit note.',
      trigger: 'status_changed' as const,
      conditions: [{ field: 'status', operator: 'equals' as const, value: 'resolved' }],
      actions: [
        { type: 'add_internal_note' as const, value: 'System note: Ticket marked resolved. Requester has been notified for feedback.' },
        { type: 'add_tag' as const, value: 'auto-notified' }
      ],
    },
  ];

  const handleOpenCreateRule = () => {
    setEditingRuleId(null);
    setRuleName('');
    setRuleDescription('');
    setRuleTrigger('ticket_created');
    setRuleConditions([{ field: 'category', operator: 'contains', value: '' }]);
    setRuleActions([{ type: 'assign_team', value: 'team-infra-net' }]);
    setRuleEnabled(true);
    setRuleError(null);
    setShowRuleModal(true);
  };

  const handleOpenEditRule = (rule: AutomationRule) => {
    setEditingRuleId(rule.id);
    setRuleName(rule.name);
    setRuleDescription(rule.description || '');
    setRuleTrigger(rule.trigger);
    setRuleConditions(rule.conditions && rule.conditions.length > 0 ? rule.conditions : [{ field: 'category', operator: 'contains', value: '' }]);
    setRuleActions(rule.actions && rule.actions.length > 0 ? rule.actions : [{ type: 'assign_team', value: 'team-infra-net' }]);
    setRuleEnabled(rule.enabled);
    setRuleError(null);
    setShowRuleModal(true);
  };

  const handleApplyTemplate = (template: typeof AUTOMATION_TEMPLATES[0]) => {
    setRuleName(template.name);
    setRuleDescription(template.description);
    setRuleTrigger(template.trigger);
    setRuleConditions([...template.conditions]);
    setRuleActions([...template.actions]);
  };

  const handleAddCondition = () => {
    setRuleConditions((prev) => [...prev, { field: 'category', operator: 'equals', value: '' }]);
  };

  const handleRemoveCondition = (index: number) => {
    setRuleConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConditionChange = (index: number, key: 'field' | 'operator' | 'value', val: string) => {
    setRuleConditions((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c;
        if (key === 'field') {
          return { ...c, field: val, value: '' };
        }
        return { ...c, [key]: val };
      })
    );
  };

  const handleAddAction = () => {
    setRuleActions((prev) => [...prev, { type: 'add_tag', value: '' }]);
  };

  const handleRemoveAction = (index: number) => {
    setRuleActions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleActionChange = (index: number, key: 'type' | 'value', val: string) => {
    setRuleActions((prev) =>
      prev.map((a, i) => {
        if (i !== index) return a;
        if (key === 'type') {
          let defaultValue = '';
          if (val === 'assign_team') defaultValue = 'team-infra-net';
          else if (val === 'assign_technician') {
            const firstStaff = availableUsers.find(u => u.role === 'technician' || u.role === 'admin' || u.role === 'superadmin');
            defaultValue = firstStaff?.id || '';
          } else if (val === 'set_priority') defaultValue = 'high';
          else if (val === 'set_status') defaultValue = 'in_progress';
          return { type: val as any, value: defaultValue };
        }
        return { ...a, [key]: val };
      })
    );
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) {
      setRuleError('Rule name is required.');
      return;
    }
    if (ruleConditions.length === 0) {
      setRuleError('Please configure at least one trigger condition.');
      return;
    }
    if (ruleActions.length === 0) {
      setRuleError('Please configure at least one automated action.');
      return;
    }

    for (let i = 0; i < ruleConditions.length; i++) {
      const c = ruleConditions[i];
      if (c.operator !== 'is_empty' && (!c.value || !c.value.trim())) {
        setRuleError(`Condition #${i + 1} (${c.field}) requires a target value.`);
        return;
      }
    }

    for (let i = 0; i < ruleActions.length; i++) {
      const a = ruleActions[i];
      if (!a.value || !a.value.trim()) {
        setRuleError(`Action #${i + 1} (${a.type}) requires a target value.`);
        return;
      }
    }

    setRuleSaving(true);
    setRuleError(null);

    try {
      const payload: Partial<AutomationRule> = {
        name: ruleName.trim(),
        description: ruleDescription.trim(),
        trigger: ruleTrigger,
        conditions: ruleConditions,
        actions: ruleActions,
        enabled: ruleEnabled,
        organizationId: organization.id,
      };

      if (editingRuleId) {
        if (onUpdateAutomationRule) {
          await onUpdateAutomationRule(editingRuleId, payload);
        } else {
          await api.updateAutomationRule(editingRuleId, payload);
        }
      } else {
        if (onCreateAutomationRule) {
          await onCreateAutomationRule(payload);
        } else {
          await api.createAutomationRule(payload);
        }
      }

      setShowRuleModal(false);
    } catch (err: any) {
      setRuleError(err.message || 'Failed to save automation rule');
    } finally {
      setRuleSaving(false);
    }
  };

  const handleConfirmDeleteRule = async () => {
    if (!ruleToDelete) return;
    try {
      if (onDeleteAutomationRule) {
        await onDeleteAutomationRule(ruleToDelete.id);
      } else {
        await api.deleteAutomationRule(ruleToDelete.id);
      }
      setRuleToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete automation rule');
    }
  };

  // Admin Access Level & Privileges Modal State
  const [privilegeUser, setPrivilegeUser] = useState<User | null>(null);
  const [privCanManageTickets, setPrivCanManageTickets] = useState(true);
  const [privCanDeleteTickets, setPrivCanDeleteTickets] = useState(false);
  const [privCanManageAssets, setPrivCanManageAssets] = useState(true);
  const [privCanManageKb, setPrivCanManageKb] = useState(false);
  const [privCanManageApprovals, setPrivCanManageApprovals] = useState(false);
  // Left pane navigation view privileges
  const [privCanViewDashboard, setPrivCanViewDashboard] = useState(true);
  const [privCanViewTickets, setPrivCanViewTickets] = useState(true);
  const [privCanViewAssets, setPrivCanViewAssets] = useState(true);
  const [privCanViewApprovals, setPrivCanViewApprovals] = useState(false);
  const [privCanViewReports, setPrivCanViewReports] = useState(false);
  const [privSaving, setPrivSaving] = useState(false);

  // -------------------------------------------------------------
  // Hardware Asset Management State in Settings (Point 4)
  // -------------------------------------------------------------
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [settingsAssetToEdit, setSettingsAssetToEdit] = useState<Asset | null>(null);
  const [settingsAssetToDelete, setSettingsAssetToDelete] = useState<Asset | null>(null);
  const [assetSearch, setAssetSearch] = useState('');
  const [assetTypeFilter, setAssetTypeFilter] = useState('all');
  const [assetAssignedFilter, setAssetAssignedFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [markedSettingsAssetIds, setMarkedSettingsAssetIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Quick Add Asset Form State (Point 4)
  const [quickAssetName, setQuickAssetName] = useState('');
  const [quickAssetCost, setQuickAssetCost] = useState('');
  const [quickAssetCostCurrency, setQuickAssetCostCurrency] = useState<'$' | '₹'>('$');
  const [quickAssetType, setQuickAssetType] = useState<Asset['type']>('laptop');
  const [quickAssetManufacturer, setQuickAssetManufacturer] = useState('Apple');
  const [quickAssetModel, setQuickAssetModel] = useState('');
  const [quickAssetSerial, setQuickAssetSerial] = useState(`SN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
  const [quickAssetAssignedUserId, setQuickAssetAssignedUserId] = useState<string | undefined>(undefined);
  const [quickAssetUnassigned, setQuickAssetUnassigned] = useState(true);
  const [quickAssetLifecycleStatus, setQuickAssetLifecycleStatus] = useState<Asset['lifecycleStatus']>('in_stock');
  const [quickAssetPurchaseDate, setQuickAssetPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quickAssetWarrantyPeriod, setQuickAssetWarrantyPeriod] = useState<'6Months' | '1 year' | '2 year' | '3 year'>('1 year');
  const [quickAssetCustomFields, setQuickAssetCustomFields] = useState<Array<{ key: string; value: string }>>([]);

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
  // Staff Individual Mailbox (IMAP/POP3/SMTP) State - Configured by Admin for Staff
  // -------------------------------------------------------------
  const staffUsers = availableUsers.filter((u) => ['superadmin', 'admin', 'technician', 'inventory_manager', 'auditor'].includes(u.role));
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
  const [brandLogoUrl, setBrandLogoUrl] = useState(organization.branding?.logoUrl || '');
  const [brandLogoTemplate, setBrandLogoTemplate] = useState<'round' | 'square' | 'rectangle'>(
    organization.branding?.logoTemplate || 'rectangle'
  );
  const [brandLogoWidth, setBrandLogoWidth] = useState(organization.branding?.logoWidth || 200);
  const [brandLogoHeight, setBrandLogoHeight] = useState(organization.branding?.logoHeight || 80);
  const [brandLogoLoadError, setBrandLogoLoadError] = useState(false);
  const [brandTitle, setBrandTitle] = useState(organization.branding.productName || 'IT Helpdesk by Lakhan');
  const [brandSubtitle, setBrandSubtitle] = useState((organization.branding as any).subtitle || 'Enterprise Support');
  const [brandEmail, setBrandEmail] = useState(organization.branding.supportEmail || 'helpdesk@lakhanglobal.com');
  const [portalWelcome, setPortalWelcome] = useState(organization.branding.portalWelcome || '');
  const [savedBranding, setSavedBranding] = useState(false);

  useEffect(() => {
    if (organization?.branding) {
      if (organization.branding.logoUrl !== undefined) {
        setBrandLogoUrl(organization.branding.logoUrl || '');
      }
      if (organization.branding.logoTemplate) {
        setBrandLogoTemplate(organization.branding.logoTemplate);
      }
      if ((organization.branding as any).subtitle) {
        setBrandSubtitle((organization.branding as any).subtitle);
      }
      if (organization.branding.logoWidth) {
        setBrandLogoWidth(organization.branding.logoWidth);
      }
      if (organization.branding.logoHeight) {
        setBrandLogoHeight(organization.branding.logoHeight);
      }
      if (organization.branding.productName) {
        setBrandTitle(organization.branding.productName);
      }
      if (organization.branding.supportEmail) {
        setBrandEmail(organization.branding.supportEmail);
      }
      if (organization.branding.portalWelcome) {
        setPortalWelcome(organization.branding.portalWelcome);
      }
    }
  }, [organization]);

  useEffect(() => {
    setBrandLogoLoadError(false);
  }, [brandLogoUrl]);

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
        logoUrl: brandLogoUrl.trim() || undefined,
        logoTemplate: brandLogoTemplate,
        productName: brandTitle.trim() || 'IT Helpdesk by Lakhan',
        subtitle: brandSubtitle.trim() || 'Enterprise Support',
        supportEmail: brandEmail.trim(),
        portalWelcome: portalWelcome.trim(),
        logoWidth: Number(brandLogoWidth) || 200,
        logoHeight: Number(brandLogoHeight) || 80,
      } as any,
    });
    setSavedBranding(true);
    setTimeout(() => setSavedBranding(false), 2500);
  };

  const handleToggleRequesterAssetSelfService = async () => {
    const currentVal = organization.systemSettings?.allowRequesterAssetSelfService !== false;
    const nextVal = !currentVal;
    try {
      await api.updateSystemSettings({ allowRequesterAssetSelfService: nextVal });
      if (onUpdateOrganization) {
        onUpdateOrganization(organization.id, {
          systemSettings: {
            ...organization.systemSettings,
            allowRequesterAssetSelfService: nextVal,
          } as any,
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update asset setting');
    }
  };

  // Requester Asset Name Dropdown Options Customization (Admin control)
  const defaultRequesterOptions = ['CPU', 'Keyboard', 'Mouse', 'Display', 'Laptop', 'Headphone', 'Webcam'];
  const [requesterAssetOptions, setRequesterAssetOptions] = useState<string[]>(
    organization.systemSettings?.requesterAssetOptions || defaultRequesterOptions
  );
  const [newDropdownOption, setNewDropdownOption] = useState('');
  const [assetOptionsSaveMsg, setAssetOptionsSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (organization.systemSettings?.requesterAssetOptions) {
      setRequesterAssetOptions(organization.systemSettings.requesterAssetOptions);
    }
  }, [organization.systemSettings?.requesterAssetOptions]);

  const handleSaveRequesterAssetOptions = async (updated: string[]) => {
    try {
      setAssetOptionsSaveMsg('Saving...');
      await api.updateSystemSettings({ requesterAssetOptions: updated });
      if (onUpdateOrganization) {
        onUpdateOrganization(organization.id, {
          systemSettings: {
            ...organization.systemSettings,
            requesterAssetOptions: updated,
          } as any,
        });
      }
      setRequesterAssetOptions(updated);
      setAssetOptionsSaveMsg('✓ Requester dropdown options updated!');
      setTimeout(() => setAssetOptionsSaveMsg(null), 3000);
    } catch (err: any) {
      setAssetOptionsSaveMsg('Failed to save options');
    }
  };

  const handleAddRequesterOption = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDropdownOption.trim();
    if (!trimmed) return;
    if (requesterAssetOptions.some((o) => o.toLowerCase() === trimmed.toLowerCase())) {
      setAssetOptionsSaveMsg('Option already exists.');
      setTimeout(() => setAssetOptionsSaveMsg(null), 2500);
      return;
    }
    const next = [...requesterAssetOptions, trimmed];
    setNewDropdownOption('');
    handleSaveRequesterAssetOptions(next);
  };

  const handleRemoveRequesterOption = (optToRemove: string) => {
    if (requesterAssetOptions.length <= 1) {
      alert('At least one dropdown option is required.');
      return;
    }
    const next = requesterAssetOptions.filter((o) => o !== optToRemove);
    handleSaveRequesterAssetOptions(next);
  };

  const handleResetRequesterOptions = () => {
    handleSaveRequesterAssetOptions(defaultRequesterOptions);
  };

  // Ticket Categories (Hardware & Workstations, Software & Cloud Apps, etc.) Customization
  const defaultTicketCategories = [
    'Hardware & Workstations',
    'Software & Cloud Apps',
    'Network & Connectivity',
    'Security & Access',
    'User Accounts & Permissions',
    'AV & Conference Rooms',
  ];
  const [ticketCategories, setTicketCategories] = useState<string[]>(
    organization.systemSettings?.ticketCategories || defaultTicketCategories
  );
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [editingCategoryIdx, setEditingCategoryIdx] = useState<number | null>(null);
  const [editingCategoryText, setEditingCategoryText] = useState('');
  const [ticketCategoriesSaveMsg, setTicketCategoriesSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (organization.systemSettings?.ticketCategories && organization.systemSettings.ticketCategories.length > 0) {
      setTicketCategories(organization.systemSettings.ticketCategories);
    }
  }, [organization.systemSettings?.ticketCategories]);

  const handleSaveTicketCategories = async (updated: string[]) => {
    try {
      setTicketCategoriesSaveMsg('Saving...');
      await api.updateSystemSettings({ ticketCategories: updated });
      if (onUpdateOrganization) {
        onUpdateOrganization(organization.id, {
          systemSettings: {
            ...organization.systemSettings,
            ticketCategories: updated,
          } as any,
        });
      }
      setTicketCategories(updated);
      setTicketCategoriesSaveMsg('✓ Ticket categories saved successfully!');
      setTimeout(() => setTicketCategoriesSaveMsg(null), 3000);
    } catch (err: any) {
      setTicketCategoriesSaveMsg('Failed to save categories');
    }
  };

  const handleAddTicketCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (ticketCategories.includes(trimmed)) {
      alert('This ticket category already exists.');
      return;
    }
    const updated = [...ticketCategories, trimmed];
    handleSaveTicketCategories(updated);
    setNewCategoryInput('');
  };

  const handleRemoveTicketCategory = (cat: string) => {
    if (ticketCategories.length <= 1) {
      alert('You must retain at least one ticket category.');
      return;
    }
    const updated = ticketCategories.filter((c) => c !== cat);
    handleSaveTicketCategories(updated);
  };

  const handleStartEditCategory = (idx: number, currentVal: string) => {
    setEditingCategoryIdx(idx);
    setEditingCategoryText(currentVal);
  };

  const handleSaveEditCategory = (idx: number) => {
    const trimmed = editingCategoryText.trim();
    if (!trimmed) return;
    const updated = [...ticketCategories];
    updated[idx] = trimmed;
    handleSaveTicketCategories(updated);
    setEditingCategoryIdx(null);
    setEditingCategoryText('');
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrMsg(null);
    setPasswordSuccessMsg(null);
    if (!newPassword || newPassword.length < 6) {
      setPasswordErrMsg('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErrMsg('New passwords do not match. Please verify.');
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await api.changePassword(currentUser.id, newPassword, currentPassword || undefined);
      setPasswordSuccessMsg(res.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccessMsg(null), 4000);
    } catch (err: any) {
      setPasswordErrMsg(err.message || 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(png|svg|jpg|jpeg)$/i)) {
      alert('Please upload a valid PNG, SVG, or JPG image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setBrandLogoUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenNewUser = () => {
    setEditingUserId(null);
    setUserFormName('');
    setUserFormEmail('');
    setUserFormEmployeeCode('');
    setUserFormRole('requester');
    setUserFormTitle('Staff Requester');
    setUserFormPhone('');
    setUserFormTeam('General Operations');
    setUserFormGroupId('');
    setUserFormGroupName('');
    setUserFormManagerId('');
    setUserFormStatus('active');
    setUserFormOrgId(organization.id);
    setUserFormCanManageTickets(true);
    setUserFormCanDeleteTickets(false);
    setUserFormCanManageAssets(true);
    setUserFormCanManageKb(false);
    setUserFormCanManageApprovals(false);
    // Left pane navigation view privileges
    setUserFormCanViewDashboard(true);
    setUserFormCanViewTickets(true);
    setUserFormCanViewAssets(true);
    setUserFormCanViewApprovals(false);
    setUserFormCanViewReports(false);
    setShowUserModal(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setUserFormName(user.name);
    setUserFormEmail(user.email);
    setUserFormEmployeeCode(user.employeeCode || '');
    setUserFormRole(user.role);
    setUserFormTitle(user.title || '');
    setUserFormPhone(user.phone || '');
    setUserFormTeam(user.team || 'General Operations');
    setUserFormGroupId(user.groupId || '');
    setUserFormGroupName(user.groupName || '');
    setUserFormManagerId(user.managerId || '');
    setUserFormStatus(user.status === 'suspended' ? 'suspended' : 'active');
    setUserFormOrgId(user.organizationId || organization.id);
    setUserFormCanManageTickets(user.privileges?.canManageTickets ?? (user.role !== 'inventory_manager' && user.role !== 'auditor'));
    setUserFormCanDeleteTickets(user.privileges?.canDeleteTickets ?? (user.role === 'superadmin'));
    setUserFormCanManageAssets(user.privileges?.canManageAssets ?? true);
    setUserFormCanManageKb(user.privileges?.canManageKnowledgeBase ?? (user.role === 'admin' || user.role === 'superadmin'));
    setUserFormCanManageApprovals(user.privileges?.canManageApprovals ?? (user.role === 'manager' || user.role === 'admin' || user.role === 'superadmin'));

    // Left pane views
    const hasViews = Array.isArray(user.privileges?.allowedViews);
    setUserFormCanViewDashboard(user.privileges?.canViewDashboard ?? (hasViews ? user.privileges!.allowedViews!.includes('dashboard') : (user.role !== 'inventory_manager')));
    setUserFormCanViewTickets(user.privileges?.canViewTickets ?? (hasViews ? user.privileges!.allowedViews!.includes('tickets') : (user.role !== 'inventory_manager' && user.role !== 'auditor')));
    setUserFormCanViewAssets(user.privileges?.canViewAssets ?? (hasViews ? user.privileges!.allowedViews!.includes('assets') : true));
    setUserFormCanViewApprovals(user.privileges?.canViewApprovals ?? (hasViews ? user.privileges!.allowedViews!.includes('approvals') : (user.role === 'manager' || user.role === 'admin' || user.role === 'superadmin')));
    setUserFormCanViewReports(user.privileges?.canViewReports ?? (hasViews ? user.privileges!.allowedViews!.includes('reports') : (user.role === 'superadmin' || user.role === 'admin' || user.role === 'technician')));

    setShowUserModal(true);
  };

  const handleSaveUserForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormName.trim() || !userFormEmail.trim()) return;
    try {
      const allowedViewsList: string[] = [];
      if (userFormCanViewDashboard) allowedViewsList.push('dashboard');
      if (userFormCanViewTickets) allowedViewsList.push('tickets');
      if (userFormCanViewAssets) allowedViewsList.push('assets');
      if (userFormCanViewApprovals) allowedViewsList.push('approvals');
      if (userFormCanViewReports) allowedViewsList.push('reports');

      const privilegesPayload = userFormRole !== 'requester' ? {
        canManageTickets: userFormCanManageTickets,
        canDeleteTickets: userFormCanDeleteTickets,
        canManageAssets: userFormCanManageAssets,
        canManageKnowledgeBase: userFormCanManageKb,
        canManageApprovals: userFormCanManageApprovals,
        canViewDashboard: userFormCanViewDashboard,
        canViewTickets: userFormCanViewTickets,
        canViewAssets: userFormCanViewAssets,
        canViewApprovals: userFormCanViewApprovals,
        canViewReports: userFormCanViewReports,
        allowedViews: allowedViewsList,
      } : undefined;

      if (editingUserId) {
        if (onUpdateUser) {
          await onUpdateUser(editingUserId, {
            name: userFormName.trim(),
            email: userFormEmail.trim(),
            employeeCode: userFormEmployeeCode.trim().toUpperCase() || undefined,
            role: userFormRole,
            title: userFormTitle.trim(),
            phone: userFormPhone.trim(),
            team: userFormTeam,
            groupId: userFormGroupId || undefined,
            groupName: userFormGroupName || undefined,
            managerId: userFormManagerId || undefined,
            status: userFormStatus,
            organizationId: userFormOrgId,
            privileges: privilegesPayload,
          });
        }
      } else {
        if (onCreateUser) {
          await onCreateUser({
            name: userFormName.trim(),
            email: userFormEmail.trim(),
            employeeCode: userFormEmployeeCode.trim().toUpperCase() || undefined,
            role: userFormRole,
            title: userFormTitle.trim(),
            phone: userFormPhone.trim(),
            team: userFormTeam,
            groupId: userFormGroupId || undefined,
            groupName: userFormGroupName || undefined,
            managerId: userFormManagerId || undefined,
            status: userFormStatus,
            organizationId: userFormOrgId,
            privileges: privilegesPayload,
          });
        }
      }
      setShowUserModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed saving user');
    }
  };

  const handleResetUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserTarget || !newPasswordVal.trim()) return;
    if (newPasswordVal.trim().length < 6) {
      setResetErrMsg('New password must contain at least 6 characters.');
      return;
    }
    setResetLoading(true);
    setResetErrMsg(null);
    setResetSuccessMsg(null);
    try {
      const res = await api.resetUserPassword(resetUserTarget.id, newPasswordVal.trim());
      setResetSuccessMsg(res.message || `Password for ${resetUserTarget.name} has been reset.`);
      setTimeout(() => {
        setResetUserTarget(null);
        setResetSuccessMsg(null);
        setNewPasswordVal('');
      }, 1800);
    } catch (err: any) {
      setResetErrMsg(err.message || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const executeDeleteUser = async () => {
    if (!userToDelete || !onDeleteUser) return;
    if (userToDelete.role === 'superadmin') {
      alert('Super Admin accounts are permanently protected system identities and cannot be deleted by anyone.');
      setUserToDelete(null);
      return;
    }
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

  const handleSavePsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pskValue.trim()) {
      alert('Pre-Shared Key cannot be empty.');
      return;
    }
    setPskSaving(true);
    try {
      await api.updateSystemSettings({ preSharedKey: pskValue.trim() });
      setPskSuccessMsg('Pre-Shared Key (PSK) updated successfully! Users can now use this key to set passwords.');
      setTimeout(() => setPskSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed updating Pre-Shared Key');
    } finally {
      setPskSaving(false);
    }
  };

  const openPrivilegeModal = (user: User) => {
    setPrivilegeUser(user);
    setPrivCanManageTickets(user.privileges?.canManageTickets ?? (user.role !== 'inventory_manager' && user.role !== 'auditor'));
    setPrivCanDeleteTickets(user.privileges?.canDeleteTickets ?? (user.role === 'superadmin'));
    setPrivCanManageAssets(user.privileges?.canManageAssets ?? true);
    setPrivCanManageKb(user.privileges?.canManageKnowledgeBase ?? (user.role === 'admin' || user.role === 'superadmin'));
    setPrivCanManageApprovals(user.privileges?.canManageApprovals ?? (user.role === 'manager' || user.role === 'admin' || user.role === 'superadmin'));

    const hasAllowedViews = Array.isArray(user.privileges?.allowedViews);
    setPrivCanViewDashboard(user.privileges?.canViewDashboard ?? (hasAllowedViews ? user.privileges!.allowedViews!.includes('dashboard') : (user.role !== 'inventory_manager')));
    setPrivCanViewTickets(user.privileges?.canViewTickets ?? (hasAllowedViews ? user.privileges!.allowedViews!.includes('tickets') : (user.role !== 'inventory_manager' && user.role !== 'auditor')));
    setPrivCanViewAssets(user.privileges?.canViewAssets ?? (hasAllowedViews ? user.privileges!.allowedViews!.includes('assets') : true));
    setPrivCanViewApprovals(user.privileges?.canViewApprovals ?? (hasAllowedViews ? user.privileges!.allowedViews!.includes('approvals') : (user.role === 'manager' || user.role === 'admin' || user.role === 'superadmin')));
    setPrivCanViewReports(user.privileges?.canViewReports ?? (hasAllowedViews ? user.privileges!.allowedViews!.includes('reports') : (user.role === 'superadmin' || user.role === 'admin' || user.role === 'technician')));
  };

  const handleSavePrivileges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privilegeUser) return;
    setPrivSaving(true);
    try {
      const allowedViewsList: string[] = [];
      if (privCanViewDashboard) allowedViewsList.push('dashboard');
      if (privCanViewTickets) allowedViewsList.push('tickets');
      if (privCanViewAssets) allowedViewsList.push('assets');
      if (privCanViewApprovals) allowedViewsList.push('approvals');
      if (privCanViewReports) allowedViewsList.push('reports');

      const updated = await api.updateUserPrivileges(privilegeUser.id, {
        canManageTickets: privCanManageTickets,
        canDeleteTickets: privCanDeleteTickets,
        canManageAssets: privCanManageAssets,
        canManageKnowledgeBase: privCanManageKb,
        canManageApprovals: privCanManageApprovals,
        canViewDashboard: privCanViewDashboard,
        canViewTickets: privCanViewTickets,
        canViewAssets: privCanViewAssets,
        canViewApprovals: privCanViewApprovals,
        canViewReports: privCanViewReports,
        allowedViews: allowedViewsList,
      });
      if (onUpdateUser) {
        await onUpdateUser(privilegeUser.id, updated);
      }
      setPrivilegeUser(null);
      alert(`Access privileges & left pane views updated successfully for ${privilegeUser.name}!\n• Views: ${allowedViewsList.join(', ')}\n• Tickets: ${privCanManageTickets ? 'Allowed' : 'Disabled'}\n• Delete: ${privCanDeleteTickets ? 'Allowed' : 'Disabled'}\n• Assets: ${privCanManageAssets ? 'Allowed' : 'Disabled'}\n• Approvals: ${privCanManageApprovals ? 'Allowed' : 'Disabled'}`);
    } catch (err: any) {
      alert(err.message || 'Failed to update access privileges');
    } finally {
      setPrivSaving(false);
    }
  };

  // Counts for Segmented Views
  const adminsCount = availableUsers.filter((u) => u.role === 'admin' || u.role === 'superadmin').length;
  const staffCount = availableUsers.filter((u) => u.role === 'manager' || u.role === 'technician' || u.role === 'inventory_manager' || u.role === 'auditor').length;
  const requestersCount = availableUsers.filter((u) => u.role === 'requester').length;

  const filteredUsers = availableUsers.filter((u) => {
    // Segment Tab Filter
    if (userSegmentTab === 'admins' && !(u.role === 'admin' || u.role === 'superadmin')) return false;
    if (userSegmentTab === 'staff' && !(u.role === 'manager' || u.role === 'technician' || u.role === 'inventory_manager' || u.role === 'auditor')) return false;
    if (userSegmentTab === 'requesters' && u.role !== 'requester') return false;

    // Direct Role Filter
    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;

    // Search Query
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
            { id: 'profile', label: 'My Profile & Role', icon: UserIcon, roles: ['superadmin', 'admin', 'manager', 'technician', 'requester', 'auditor', 'inventory_manager'] },
            { id: 'users', label: 'User Directory & Registration', icon: Users, roles: ['superadmin', 'admin'] },
            { id: 'assets', label: 'Hardware Assets & CMDB', icon: HardDrive, roles: ['superadmin', 'admin', 'inventory_manager'] },
            { id: 'fields', label: 'Custom Fields & Form Builder', icon: Sliders, roles: ['superadmin', 'admin'] },
            { id: 'admin-mailbox', label: 'Staff Mailboxes (IMAP/POP3/SMTP)', icon: Mail, roles: ['superadmin', 'admin'] },
            { id: 'default-gateway', label: 'Default Reply & Polling Gateway', icon: Server, roles: ['superadmin', 'admin'] },
            { id: 'sla', label: 'SLA Target Matrix', icon: Clock, roles: ['superadmin', 'admin'] },
            { id: 'automations', label: 'Automation Rules', icon: Zap, roles: ['superadmin', 'admin'] },
            { id: 'branding', label: 'Branding & Identity', icon: Palette, roles: ['superadmin'] },
            { id: 'linux-host', label: 'Linux Self-Hosting Guide', icon: Terminal, roles: ['superadmin', 'admin'] },
          ]
            .filter((tab) => tab.roles.includes(currentUser.role))
            .map((tab) => {
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

              {/* Account Password Change Form */}
              <div className="neu-flat p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    Change Account Password
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Update your personal login password. Must be at least 6 characters.
                  </p>
                </div>

                {passwordSuccessMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{passwordSuccessMsg}</span>
                  </div>
                )}

                {passwordErrMsg && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 text-xs font-semibold">
                    {passwordErrMsg}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-2.5">
                  {currentUser.role !== 'superadmin' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      New Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="w-full neu-btn-primary py-2 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {passwordSaving ? 'Updating Password...' : 'Update Password'}
                  </button>
                </form>
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

          {/* Organization-Specific Self-Registration Links & Custom PSK Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Organization Custom Registration Links &amp; Pre-Shared Keys
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Each organization has a custom registration link. When users join via this link, their account is automatically provisioned under that organization.
                </p>
              </div>
              <div className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                {allOrganizations.length} Registered Organizations
              </div>
            </div>

            {pskSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{pskSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {allOrganizations.map((org) => {
                const orgPsk = orgPskValues[org.id] || org.preSharedKey || org.systemSettings?.preSharedKey || 'Sports@9433';
                const isPskVis = orgPskVisible[org.id] || false;
                const isSaving = orgPskSaving[org.id] || false;
                const isLinkCopied = orgCopiedLink[org.id] || false;
                const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                const customRegUrl = `${origin}/?view=portal&tab=register&orgId=${org.id}`;

                return (
                  <div
                    key={org.id}
                    className="neu-flat p-4.5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3 bg-white/70 dark:bg-slate-900/60"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-white/5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                          {org.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{org.name}</span>
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                              {org.domain || org.id}
                            </span>
                            {org.id === organization.id && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
                                Primary Org
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Plan: <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">{org.plan}</span> · Status: <span className="capitalize text-emerald-600 dark:text-emerald-400 font-semibold">{org.status}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyOrgLink(org.id)}
                        className="neu-btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
                      >
                        {isLinkCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Copied Link!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Custom Link
                          </>
                        )}
                      </button>
                    </div>

                    {/* Custom Registration URL */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                        <span>Organization Registration URL:</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                          Auto-assigns user to {org.name}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl neu-inset bg-slate-100 dark:bg-slate-950/80 border border-slate-300 dark:border-white/10 font-mono text-[11px] font-bold text-cyan-800 dark:text-cyan-300 break-all select-all flex items-center justify-between gap-2">
                        <span>{customRegUrl}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </div>
                    </div>

                    {/* Pre-Shared Key (PSK) Setting for this organization (Super Admin only can edit/generate) */}
                    {currentUser.role === 'superadmin' ? (
                      <div className="pt-2 border-t border-slate-200/80 dark:border-white/5 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <KeyRound className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                            <span>Pre-Shared Key (PSK) for {org.name}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-bold">
                              Super Admin Restricted
                            </span>
                          </label>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleGenerateOrgPsk(org.id)}
                              className="px-2 py-1 text-[11px] neu-btn rounded-lg text-violet-700 dark:text-violet-300 font-bold flex items-center gap-1 cursor-pointer"
                              title="Generate new secure Pre-Shared Key"
                            >
                              <Sparkles className="w-3 h-3 text-violet-600" /> Generate Key
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(orgPsk);
                                alert(`Copied Pre-Shared Key for ${org.name}`);
                              }}
                              className="px-2 py-1 text-[11px] neu-btn rounded-lg text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" /> Copy Key
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type={isPskVis ? 'text' : 'password'}
                              value={orgPsk}
                              onChange={(e) =>
                                setOrgPskValues((prev) => ({ ...prev, [org.id]: e.target.value }))
                              }
                              placeholder="e.g. Sports@9433 or Helpdesk#2026!"
                              className="w-full pl-3 pr-9 py-1.5 text-xs font-mono font-bold neu-input bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setOrgPskVisible((prev) => ({ ...prev, [org.id]: !isPskVis }))
                              }
                              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            >
                              {isPskVis ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleSaveOrgPsk(org.id)}
                            className="neu-btn-primary px-3.5 py-1.5 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 whitespace-nowrap"
                          >
                            {isSaving ? 'Saving...' : 'Save PSK'}
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                          Employees registering under {org.name} enter this key to verify their organization membership and set their password.
                        </span>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-200/80 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Pre-Shared Key configured and managed by Super Administrator.
                        </span>
                        <span className="font-mono text-[10px] bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">
                          PSK Protected
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Segmented User Role Category Deck: Admins, Staff/Managers, Requesters */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-900/60 rounded-xl border border-slate-300/80 dark:border-white/5 w-fit overflow-x-auto custom-scrollbar">
            {[
              { id: 'all', label: 'All Accounts', count: availableUsers.length, icon: Users },
              { id: 'admins', label: 'Admins & Super Admins', count: adminsCount, icon: ShieldCheck },
              { id: 'staff', label: 'Ticket Managers & Technicians', count: staffCount, icon: KeyRound },
              { id: 'requesters', label: 'End Users & Requesters', count: requestersCount, icon: UserIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = userSegmentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setUserSegmentTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'neu-btn-primary shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-300 dark:bg-white/10 text-slate-800 dark:text-slate-200'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
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
                <option value="inventory_manager">Inventory Manager</option>
                <option value="auditor">Auditor</option>
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
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Organization</th>
                    <th className="py-3 px-3">Access Privileges</th>
                    <th className="py-3 px-3">Designation / Post</th>
                    <th className="py-3 px-3">Contact</th>
                    <th className="py-3 px-3">Status</th>
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
                            <div className="font-semibold text-slate-900 dark:text-white font-mono text-xs">
                              [{user.employeeCode || (user.name.toLowerCase().includes('lakhan') ? 'CBPL2045' : 'CBPL1010')}]{user.name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
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
                              : user.role === 'inventory_manager'
                              ? 'text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/60 border-teal-300 dark:border-teal-800/40'
                              : user.role === 'auditor'
                              ? 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800/40'
                              : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700/40'
                          }`}
                        >
                          {user.role === 'inventory_manager' ? 'Inv Manager' : user.role}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-800/30">
                          <Building2 className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                          <span className="truncate max-w-[130px]">
                            {allOrganizations.find((o) => o.id === user.organizationId)?.name || organization.name}
                          </span>
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {user.role === 'requester' ? (
                          <span className="text-[10px] text-slate-400 font-medium italic">Standard Portal Access</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5 max-w-[260px]">
                            <button
                              type="button"
                              onClick={() => currentUser.role === 'superadmin' && openPrivilegeModal(user)}
                              disabled={currentUser.role !== 'superadmin'}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                                currentUser.role === 'superadmin' ? 'hover:scale-105 cursor-pointer shadow-xs' : 'cursor-default'
                              } ${
                                user.privileges?.canManageTickets !== false
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/40'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 line-through'
                              }`}
                              title={currentUser.role === 'superadmin' ? "Click to configure Ticket View & Manage privilege" : "Ticket management privilege"}
                            >
                              {user.privileges?.canManageTickets !== false ? 'Tickets' : 'No-Tickets'}
                            </button>
                            <button
                              type="button"
                              onClick={() => currentUser.role === 'superadmin' && openPrivilegeModal(user)}
                              disabled={currentUser.role !== 'superadmin'}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                                currentUser.role === 'superadmin' ? 'hover:scale-105 cursor-pointer shadow-xs' : 'cursor-default'
                              } ${
                                user.privileges?.canDeleteTickets
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800/40'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                              }`}
                              title={currentUser.role === 'superadmin' ? "Click to configure Delete Ticket privilege" : "Delete ticket privilege"}
                            >
                              {user.privileges?.canDeleteTickets ? 'Delete' : 'No-Del'}
                            </button>
                            <button
                              type="button"
                              onClick={() => currentUser.role === 'superadmin' && openPrivilegeModal(user)}
                              disabled={currentUser.role !== 'superadmin'}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                                currentUser.role === 'superadmin' ? 'hover:scale-105 cursor-pointer shadow-xs' : 'cursor-default'
                              } ${
                                user.privileges?.canManageAssets !== false
                                  ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/40'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500 line-through'
                              }`}
                              title={currentUser.role === 'superadmin' ? "Click to configure Asset Management privilege" : "Asset management privilege"}
                            >
                              {user.privileges?.canManageAssets !== false ? 'Assets' : 'No-Assets'}
                            </button>
                            <button
                              type="button"
                              onClick={() => currentUser.role === 'superadmin' && openPrivilegeModal(user)}
                              disabled={currentUser.role !== 'superadmin'}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                                currentUser.role === 'superadmin' ? 'hover:scale-105 cursor-pointer shadow-xs' : 'cursor-default'
                              } ${
                                user.privileges?.canManageKnowledgeBase
                                  ? 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-300 dark:border-violet-800/40'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                              }`}
                              title={currentUser.role === 'superadmin' ? "Click to configure KB Management privilege" : "KB management privilege"}
                            >
                              {user.privileges?.canManageKnowledgeBase ? 'KB' : 'No-KB'}
                            </button>
                            <button
                              type="button"
                              onClick={() => currentUser.role === 'superadmin' && openPrivilegeModal(user)}
                              disabled={currentUser.role !== 'superadmin'}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                                currentUser.role === 'superadmin' ? 'hover:scale-105 cursor-pointer shadow-xs' : 'cursor-default'
                              } ${
                                user.privileges?.canManageApprovals
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800/40'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                              }`}
                              title={currentUser.role === 'superadmin' ? "Click to configure Approval Requests privilege" : "Approvals privilege"}
                            >
                              {user.privileges?.canManageApprovals ? 'Approvals' : 'No-Appr'}
                            </button>
                            {currentUser.role === 'superadmin' && (
                              <button
                                type="button"
                                onClick={() => openPrivilegeModal(user)}
                                className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5 ml-0.5"
                                title="Open granular privilege editor"
                              >
                                <KeyRound className="w-2.5 h-2.5" />
                                <span>Edit</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                        <div>{user.title || <span className="text-slate-400 italic">Not specified</span>}</div>
                        {user.groupName && (
                          <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-bold mt-0.5">
                            Group: {user.groupName}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {user.phone || <span className="text-slate-400">—</span>}
                      </td>

                      <td className="py-3 px-3">
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
                          {/* Superadmin can manage access privileges of staff */}
                          {currentUser.role === 'superadmin' && user.role !== 'requester' && (
                            <button
                              type="button"
                              onClick={() => openPrivilegeModal(user)}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/40 rounded-lg transition-colors cursor-pointer"
                              title="Set View/Delete Ticket, Asset Manage & Approval Privileges"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Privileges</span>
                            </button>
                          )}
                          {/* Superadmin can reset password of everyone */}
                          {currentUser.role === 'superadmin' && (
                            <button
                              type="button"
                              onClick={() => {
                                setResetUserTarget(user);
                                setNewPasswordVal('');
                                setResetErrMsg(null);
                                setResetSuccessMsg(null);
                              }}
                              className="p-1.5 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 transition-colors cursor-pointer"
                              title={`Reset password for ${user.name} (${user.role})`}
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEditUser(user)}
                            className="p-1.5 text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-300 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            title="Edit user details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {user.role === 'superadmin' ? (
                            <span
                              className="p-1.5 text-amber-600 dark:text-amber-400 rounded-lg inline-flex items-center cursor-not-allowed opacity-80"
                              title="Super Admin account is permanently protected and cannot be deleted by anyone"
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setUserToDelete(user)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                              title="Delete user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
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
      {/* TAB: Hardware Assets & IT Inventory CMDB (Point 4)             */}
      {/* ============================================================= */}
      {activeTab === 'assets' && (
        <div className="space-y-6">
          {/* Asset Form Modal for Full / Edit Operations */}
          <AssetFormModal
            isOpen={showAssetModal || !!settingsAssetToEdit}
            onClose={() => {
              setShowAssetModal(false);
              setSettingsAssetToEdit(null);
            }}
            users={availableUsers}
            initialData={settingsAssetToEdit}
            title={settingsAssetToEdit ? `Edit Asset: ${settingsAssetToEdit.name}` : 'Add New Hardware Asset'}
            onSubmit={(payload) => {
              if (settingsAssetToEdit && onUpdateAsset) {
                onUpdateAsset(settingsAssetToEdit.id, payload);
              } else if (onCreateAsset) {
                onCreateAsset(payload);
              }
            }}
          />

          {/* Delete Asset Modal */}
          {settingsAssetToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="glass-modal max-w-md w-full p-6 rounded-2xl border border-rose-500/30 shadow-2xl space-y-4">
                <div className="flex items-center gap-3 text-rose-500">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Hardware Asset</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Permanently remove from database</p>
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    &ldquo;{settingsAssetToDelete.name}&rdquo;
                  </span>{' '}
                  ({settingsAssetToDelete.id})?
                </p>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setSettingsAssetToDelete(null)}
                    className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeleteAsset) onDeleteAsset(settingsAssetToDelete.id);
                      setSettingsAssetToDelete(null);
                    }}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-rose-600 hover:bg-rose-500 shadow-sm transition-all cursor-pointer"
                  >
                    Yes, Delete Asset
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Hardware Assets &amp; Inventory CMDB Management
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Register hardware equipment, track serials &amp; models, assign to verified staff, configure warranty periods, and manage custom attributes.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setSettingsAssetToEdit(null);
                  setShowAssetModal(true);
                }}
                className="neu-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Asset (Modal Form)
              </button>
            </div>
          </div>

          {/* Requester Portal Asset Self-Service Card (Admin Console Toggle) */}
          <div className="neu-flat p-4 rounded-2xl border border-cyan-500/30 bg-cyan-50/20 dark:bg-cyan-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Requester Portal Asset Self-Service (Add &amp; Remove Feature)
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                    organization.systemSettings?.allowRequesterAssetSelfService !== false
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300'
                  }`}>
                    {organization.systemSettings?.allowRequesterAssetSelfService !== false ? 'ENABLED' : 'DISABLED'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Allow requesters and employees to view their assigned hardware assets in their portal and register or remove equipment.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleToggleRequesterAssetSelfService}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  organization.systemSettings?.allowRequesterAssetSelfService !== false ? 'bg-cyan-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                role="switch"
                aria-checked={organization.systemSettings?.allowRequesterAssetSelfService !== false}
                title="Toggle Requester Asset Self-Service"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    organization.systemSettings?.allowRequesterAssetSelfService !== false ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Requester Asset Name Dropdown Customization Card (Admin Customization) */}
          <div className="neu-flat p-4 rounded-2xl border border-cyan-500/30 bg-cyan-50/20 dark:bg-cyan-950/20 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-cyan-500/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Requester Asset Name Dropdown Options
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 font-bold border border-cyan-300">
                      {requesterAssetOptions.length} Options Configured
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Customize the equipment categories employees can pick when adding their assigned hardware (Default: CPU, Keyboard, Mouse, Display, Laptop, Headphone, Webcam).
                  </p>
                </div>
              </div>

              {assetOptionsSaveMsg && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                  {assetOptionsSaveMsg}
                </span>
              )}
            </div>

            {/* Badges of current allowed options */}
            <div className="flex flex-wrap items-center gap-2">
              {requesterAssetOptions.map((opt) => (
                <div
                  key={opt}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl neu-card text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-white/10 shadow-xs"
                >
                  <span>{opt}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRequesterOption(opt)}
                    className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors ml-0.5 text-xs font-bold"
                    title={`Remove ${opt} from dropdown`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Add new option input and Reset button */}
            <form onSubmit={handleAddRequesterOption} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Enter new dropdown option (e.g. Docking Station, iPad, Desk Phone)..."
                value={newDropdownOption}
                onChange={(e) => setNewDropdownOption(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs neu-input bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
              />
              <button
                type="submit"
                disabled={!newDropdownOption.trim()}
                className="neu-btn-primary px-3.5 py-1.5 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                + Add Option
              </button>
              <button
                type="button"
                onClick={handleResetRequesterOptions}
                className="neu-btn px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 font-semibold rounded-xl cursor-pointer hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
                title="Reset to default 7 options"
              >
                Reset Defaults
              </button>
            </form>
          </div>

          {/* POINT 4: DEDICATED QUICK ASSET ADD FIELD CONTAINER */}
          <div className="neu-flat p-5 rounded-2xl border border-cyan-500/30 bg-cyan-50/20 dark:bg-cyan-950/20 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Add New Hardware Asset to System
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Direct asset registration with specifications, cost, warranty period, and custom fields
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/70 text-cyan-800 dark:text-cyan-300 font-bold border border-cyan-300">
                Administration CMDB
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!quickAssetName.trim() || !quickAssetSerial.trim() || !onCreateAsset) {
                  alert('Asset Name and Serial Number are required.');
                  return;
                }

                const assignedUser = !quickAssetUnassigned && quickAssetAssignedUserId
                  ? availableUsers.find((u) => u.id === quickAssetAssignedUserId)
                  : null;

                const expiryDate = new Date(quickAssetPurchaseDate || new Date());
                switch (quickAssetWarrantyPeriod) {
                  case '6Months':
                    expiryDate.setMonth(expiryDate.getMonth() + 6);
                    break;
                  case '1 year':
                    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                    break;
                  case '2 year':
                    expiryDate.setFullYear(expiryDate.getFullYear() + 2);
                    break;
                  case '3 year':
                    expiryDate.setFullYear(expiryDate.getFullYear() + 3);
                    break;
                }

                const customFieldsObj: Record<string, string> = {};
                for (const cf of quickAssetCustomFields) {
                  if (cf.key.trim()) customFieldsObj[cf.key.trim()] = cf.value.trim();
                }

                onCreateAsset({
                  name: quickAssetName.trim(),
                  type: quickAssetType,
                  manufacturer: quickAssetManufacturer.trim(),
                  model: quickAssetModel.trim(),
                  serialNumber: quickAssetSerial.trim(),
                  purchaseCost: quickAssetCost ? Number(quickAssetCost) : undefined,
                  costCurrency: quickAssetCostCurrency,
                  lifecycleStatus: quickAssetUnassigned ? 'in_stock' : quickAssetLifecycleStatus,
                  assignedUserId: assignedUser?.id,
                  assignedUserName: assignedUser?.name,
                  purchaseDate: quickAssetPurchaseDate,
                  warrantyPeriod: quickAssetWarrantyPeriod,
                  warrantyExpiry: expiryDate.toISOString().split('T')[0],
                  customFields: Object.keys(customFieldsObj).length > 0 ? customFieldsObj : undefined,
                });

                // Reset quick form
                setQuickAssetName('');
                setQuickAssetCost('');
                setQuickAssetModel('');
                setQuickAssetSerial(`SN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
                setQuickAssetAssignedUserId(undefined);
                setQuickAssetUnassigned(true);
                setQuickAssetLifecycleStatus('in_stock');
                setQuickAssetCustomFields([]);
              }}
              className="space-y-4"
            >
              {/* Row 1: Asset Name & Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Asset Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={quickAssetName}
                    onChange={(e) => setQuickAssetName(e.target.value)}
                    placeholder="e.g. Apple MacBook Pro 16 / Dell Latitude 7440"
                    className="w-full px-3 py-2 text-xs neu-input bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Cost (Optional) in $, ₹
                  </label>
                  <div className="flex items-center gap-1">
                    <select
                      value={quickAssetCostCurrency}
                      onChange={(e) => setQuickAssetCostCurrency(e.target.value as '$' | '₹')}
                      className="w-16 px-2 py-2 text-xs font-bold neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="$">$ (USD)</option>
                      <option value="₹">₹ (INR)</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={quickAssetCost}
                      onChange={(e) => setQuickAssetCost(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs neu-input bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Type, Manufacturer, Model Specification */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Type *
                  </label>
                  <select
                    value={quickAssetType}
                    onChange={(e) => setQuickAssetType(e.target.value as Asset['type'])}
                    className="w-full px-3 py-2 text-xs font-semibold neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="laptop">Laptop Computer</option>
                    <option value="desktop">Desktop / Workstation</option>
                    <option value="server">Server / Rack Unit</option>
                    <option value="monitor">Display / Monitor</option>
                    <option value="mobile">Mobile / Tablet</option>
                    <option value="switch">Network Switch / Router</option>
                    <option value="peripheral">Printer / Peripheral</option>
                    <option value="license">Software License</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Manufacturer *
                  </label>
                  <input
                    type="text"
                    required
                    value={quickAssetManufacturer}
                    onChange={(e) => setQuickAssetManufacturer(e.target.value)}
                    placeholder="e.g. Apple, Dell, Lenovo, HP, Cisco"
                    className="w-full px-3 py-2 text-xs neu-input bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Model Specification *
                  </label>
                  <input
                    type="text"
                    required
                    value={quickAssetModel}
                    onChange={(e) => setQuickAssetModel(e.target.value)}
                    placeholder="e.g. 16-inch M3 Max 32GB"
                    className="w-full px-3 py-2 text-xs neu-input bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
              </div>

              {/* Row 3: Serial Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Serial Number / Service Tag *
                  </label>
                  <input
                    type="text"
                    required
                    value={quickAssetSerial}
                    onChange={(e) => setQuickAssetSerial(e.target.value)}
                    placeholder="e.g. C02G789XYZ12"
                    className="w-full px-3 py-2 text-xs neu-input bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>

                {/* Assignment & Unassigned (In Pool) toggle */}
                <div className="relative z-20">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Assigned Employee (Point 6 Search)
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 select-none">
                      <input
                        type="checkbox"
                        checked={quickAssetUnassigned}
                        onChange={(e) => {
                          setQuickAssetUnassigned(e.target.checked);
                          if (e.target.checked) {
                            setQuickAssetAssignedUserId(undefined);
                            setQuickAssetLifecycleStatus('in_stock');
                          } else {
                            if (quickAssetLifecycleStatus === 'in_stock') setQuickAssetLifecycleStatus('in_service');
                          }
                        }}
                        className="rounded text-cyan-600 focus:ring-cyan-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>Unassigned (In Pool)</span>
                    </label>
                  </div>
                  <SearchableEmployeeSelect
                    users={availableUsers}
                    selectedUserId={quickAssetAssignedUserId}
                    disabled={quickAssetUnassigned}
                    allowUnassigned={true}
                    placeholder="Search 1000+ employees by name, email..."
                    onSelect={(user) => {
                      if (user) {
                        setQuickAssetAssignedUserId(user.id);
                        setQuickAssetUnassigned(false);
                        if (quickAssetLifecycleStatus === 'in_stock') setQuickAssetLifecycleStatus('in_service');
                      } else {
                        setQuickAssetAssignedUserId(undefined);
                        setQuickAssetUnassigned(true);
                        setQuickAssetLifecycleStatus('in_stock');
                      }
                    }}
                  />
                </div>
              </div>

              {/* Row 4: Lifecycle Status, Purchase Date, Warranty Period */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Lifecycle Status *
                  </label>
                  <select
                    value={quickAssetLifecycleStatus}
                    onChange={(e) => setQuickAssetLifecycleStatus(e.target.value as Asset['lifecycleStatus'])}
                    className="w-full px-3 py-2 text-xs font-semibold neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="in_service">In Service (Active / Deployed)</option>
                    <option value="in_stock">In Stock (In Pool / Available)</option>
                    <option value="in_repair">In Repair (Maintenance)</option>
                    <option value="retired">Retired (Decommissioned)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={quickAssetPurchaseDate}
                    onChange={(e) => setQuickAssetPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs neu-input bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Warranty Period *
                  </label>
                  <select
                    value={quickAssetWarrantyPeriod}
                    onChange={(e) =>
                      setQuickAssetWarrantyPeriod(e.target.value as '6Months' | '1 year' | '2 year' | '3 year')
                    }
                    className="w-full px-3 py-2 text-xs font-bold neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="6Months">6 Months</option>
                    <option value="1 year">1 Year (Default)</option>
                    <option value="2 year">2 Years</option>
                    <option value="3 year">3 Years</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Custom Fields builder */}
              <div className="p-3 rounded-xl neu-card bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Custom Fields &amp; Specs (can be added custom field)
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuickAssetCustomFields([...quickAssetCustomFields, { key: '', value: '' }])}
                    className="text-[11px] font-bold text-cyan-700 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Custom Field
                  </button>
                </div>

                {quickAssetCustomFields.map((cf, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Field Name (e.g. RAM, Processor, Location)"
                      value={cf.key}
                      onChange={(e) => {
                        const copy = [...quickAssetCustomFields];
                        copy[idx].key = e.target.value;
                        setQuickAssetCustomFields(copy);
                      }}
                      className="w-1/2 px-2.5 py-1 text-xs neu-input bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. 32GB DDR5, M3 Max)"
                      value={cf.value}
                      onChange={(e) => {
                        const copy = [...quickAssetCustomFields];
                        copy[idx].value = e.target.value;
                        setQuickAssetCustomFields(copy);
                      }}
                      className="w-1/2 px-2.5 py-1 text-xs neu-input bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => setQuickAssetCustomFields(quickAssetCustomFields.filter((_, i) => i !== idx))}
                      className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end pt-1">
                <button
                  type="submit"
                  className="neu-btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  Save Hardware Asset to CMDB
                </button>
              </div>
            </form>
          </div>

          {/* Asset CMDB Table Section */}
          <div className="neu-card p-4 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  placeholder="Filter assets by device name, serial, user, model..."
                  className="w-full px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={assetTypeFilter}
                  onChange={(e) => setAssetTypeFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="laptop">Laptops</option>
                  <option value="desktop">Desktops</option>
                  <option value="server">Servers</option>
                  <option value="monitor">Monitors</option>
                  <option value="mobile">Mobiles</option>
                  <option value="switch">Switches</option>
                  <option value="peripheral">Peripherals</option>
                </select>

                <select
                  value={assetAssignedFilter}
                  onChange={(e) => setAssetAssignedFilter(e.target.value as any)}
                  className="px-3 py-1.5 text-xs font-bold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
                >
                  <option value="all">All Allocation</option>
                  <option value="assigned">Assigned Staff</option>
                  <option value="unassigned">In Pool (Unassigned)</option>
                </select>

                {markedSettingsAssetIds.length > 0 && onBulkDeleteAssets && (
                  <button
                    type="button"
                    onClick={() => setShowBulkDeleteModal(true)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white cursor-pointer flex items-center gap-1.5 shadow-xs"
                    title="Bulk delete all checked assets from CMDB"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Marked ({markedSettingsAssetIds.length})</span>
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs min-w-[900px]">
                <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-white/10 uppercase tracking-wider font-extrabold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={assets.length > 0 && markedSettingsAssetIds.length === assets.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setMarkedSettingsAssetIds(assets.map((a) => a.id));
                          } else {
                            setMarkedSettingsAssetIds([]);
                          }
                        }}
                        className="rounded text-cyan-600 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3">Asset ID</th>
                    <th className="py-2.5 px-3">Name &amp; Model</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Serial</th>
                    <th className="py-2.5 px-3">Assigned User</th>
                    <th className="py-2.5 px-3">Cost</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Warranty</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {assets
                    .filter((a) => {
                      if (assetTypeFilter !== 'all' && a.type !== assetTypeFilter) return false;
                      if (assetAssignedFilter === 'assigned' && !a.assignedUserId) return false;
                      if (assetAssignedFilter === 'unassigned' && a.assignedUserId) return false;
                      if (assetSearch.trim()) {
                        const q = assetSearch.toLowerCase();
                        const match =
                          a.name.toLowerCase().includes(q) ||
                          a.serialNumber.toLowerCase().includes(q) ||
                          a.id.toLowerCase().includes(q) ||
                          (a.assignedUserName && a.assignedUserName.toLowerCase().includes(q));
                        if (!match) return false;
                      }
                      return true;
                    })
                    .map((a) => {
                      const isMarked = markedSettingsAssetIds.includes(a.id);
                      return (
                        <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isMarked}
                              onChange={() => {
                                setMarkedSettingsAssetIds((prev) =>
                                  prev.includes(a.id) ? prev.filter((id) => id !== a.id) : [...prev, a.id]
                                );
                              }}
                              className="rounded text-cyan-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-cyan-700 dark:text-cyan-400">
                            {a.id}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 dark:text-white">{a.name}</div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {a.manufacturer} {a.model}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 capitalize font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            {a.type}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-800 dark:text-slate-300">
                            {a.serialNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            {a.assignedUserName ? (
                              <span className="font-bold text-slate-900 dark:text-white">{a.assignedUserName}</span>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">Unassigned (In Pool)</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-semibold">
                            {a.purchaseCost !== undefined ? `${(a.costCurrency && a.costCurrency !== '$' ? a.costCurrency : (organization.systemSettings?.defaultCurrency || '₹'))}${Number(a.purchaseCost).toLocaleString()}` : '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                a.lifecycleStatus === 'in_service'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300'
                                  : a.lifecycleStatus === 'in_stock'
                                  ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-300'
                                  : a.lifecycleStatus === 'in_repair'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300'
                                  : 'bg-slate-200 text-slate-700 border-slate-300'
                              }`}
                            >
                              {a.lifecycleStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {a.warrantyExpiry || '—'} {a.warrantyPeriod ? `(${a.warrantyPeriod})` : ''}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSettingsAssetToEdit(a)}
                                className="p-1 text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 rounded hover:bg-cyan-50 dark:hover:bg-cyan-950/40 cursor-pointer"
                                title="Edit Asset"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setSettingsAssetToDelete(a)}
                                className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                title="Delete Asset"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Dynamic Form Fields &amp; Attributes</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Preview Ticket Category
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('ticket-categories-manager');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-2.5 h-2.5" /> Edit Categories
                    </button>
                  </div>
                  <select
                    value={previewFormValues['category'] || ticketCategories[0] || ''}
                    onChange={(e) =>
                      setPreviewFormValues({ ...previewFormValues, category: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    {ticketCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
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
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                            {field.label} {field.required && <span className="text-rose-500 font-bold">*</span>}
                          </label>
                          <button
                            type="button"
                            onClick={() => handleEditField(field)}
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/40"
                            title="Edit this custom field (Operating System & Version, etc.)"
                          >
                            <Edit2 className="w-2.5 h-2.5" /> Edit Field
                          </button>
                        </div>
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

          {/* Ticket Categories & Taxonomy Manager (Hardware & Workstations, Software & Cloud Apps, etc.) */}
          <div id="ticket-categories-manager" className="neu-flat p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Ticket Categories &amp; Taxonomy (Super Admin Managed)
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  Categories available when submitting tickets and defining conditional routing rules (Hardware &amp; Workstations, Software &amp; Cloud Apps, etc.).
                </p>
              </div>

              {ticketCategoriesSaveMsg && (
                <div className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300">
                  {ticketCategoriesSaveMsg}
                </div>
              )}
            </div>

            {/* List of categories with inline edit / delete */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {ticketCategories.map((cat, idx) => (
                <div
                  key={cat}
                  className="flex items-center justify-between p-2.5 rounded-xl neu-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs"
                >
                  {editingCategoryIdx === idx ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={editingCategoryText}
                        onChange={(e) => setEditingCategoryText(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs neu-input bg-slate-50 dark:bg-slate-950 border border-cyan-500 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEditCategory(idx);
                          if (e.key === 'Escape') setEditingCategoryIdx(null);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditCategory(idx)}
                        className="px-2 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCategoryIdx(null)}
                        className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
                        <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                        <span className="truncate">{cat}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditCategory(idx, cat)}
                          className="p-1 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer"
                          title="Edit Category Name"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveTicketCategory(cat)}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Add Category Form */}
            <form onSubmit={handleAddTicketCategory} className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="Add new ticket category (e.g. Facilities & Infrastructure, Mobile Devices)..."
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
              />
              <button
                type="submit"
                className="neu-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Add Category
              </button>
            </form>
          </div>

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
                  Staff &amp; Admin Mailbox Connector
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Administrator setup for staff mailboxes (Technician, Inventory Manager, Auditor, Administrators) for automated email handling and ticketing.
                </p>
              </div>

              {/* User Selector for Staff (Technician, Inventory Manager, Auditor, Administrators) */}
              {(currentUser.role === 'superadmin' || currentUser.role === 'admin') && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Configure for Staff:</span>
                  <select
                    value={selectedAdminId}
                    onChange={(e) => setSelectedAdminId(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    {staffUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role.replace('_', ' ').toUpperCase()})
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
      {/* ============================================================= */}
      {/* TAB 5: Automation Rules */}
      {/* ============================================================= */}
      {activeTab === 'automations' && (
        <div className="neu-flat p-6 rounded-2xl border border-slate-200 dark:border-white/10 space-y-6 max-w-full overflow-x-hidden">
          {/* Header & Create Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Ticket Automation &amp; Escalation Rules
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-normal">
                      {automationRules.length} rules
                    </span>
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Automate incident triage, team assignments, SLA escalations, tags, and internal runbook updates.
                  </p>
                </div>
              </div>
            </div>

            {/* Super Admin / Admin Create Custom Automation Rule Button */}
            {(currentUser.role === 'superadmin' || currentUser.role === 'admin') && (
              <button
                type="button"
                onClick={handleOpenCreateRule}
                className="neu-btn-primary px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all self-start sm:self-auto shrink-0"
              >
                <Plus className="w-4 h-4" />
                Create Custom Automation Rule
              </button>
            )}
          </div>

          {/* Quick-Start Preset Templates */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Quick-Start Automation Templates
              </span>
              <span className="text-[11px] text-slate-500">Click to customize &amp; activate</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {AUTOMATION_TEMPLATES.map((tmpl, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl neu-card border border-slate-200 dark:border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between gap-2.5 bg-slate-50/50 dark:bg-slate-900/40"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{tmpl.name}</h4>
                      <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                        {tmpl.trigger.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">{tmpl.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleApplyTemplate(tmpl);
                      setEditingRuleId(null);
                      setRuleEnabled(true);
                      setRuleError(null);
                      setShowRuleModal(true);
                    }}
                    className="w-full py-1.5 px-3 text-[11px] font-bold rounded-lg neu-btn text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Existing Rules List */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Configured Rules ({automationRules.length})</h3>
            
            {automationRules.length === 0 ? (
              <div className="p-8 text-center neu-card rounded-2xl border border-dashed border-slate-300 dark:border-white/15 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">No automation rules configured</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Create custom automations to route incoming tickets, assign teams, or trigger notifications.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateRule}
                  className="neu-btn-primary px-4 py-2 text-xs font-bold rounded-xl inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create First Automation Rule
                </button>
              </div>
            ) : (
              automationRules.map((rule) => {
                const triggerLabels: Record<string, string> = {
                  ticket_created: 'On Ticket Created',
                  ticket_updated: 'On Ticket Updated',
                  status_changed: 'On Status Changed',
                  priority_changed: 'On Priority Changed',
                };

                return (
                  <div
                    key={rule.id}
                    className={`neu-card p-4.5 rounded-xl border transition-all space-y-3.5 ${
                      rule.enabled
                        ? 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60'
                        : 'border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/40 opacity-75'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`w-2 h-2 rounded-full ${rule.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{rule.name}</h3>
                          <span className="text-[10px] font-mono font-bold text-cyan-800 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-300 dark:border-cyan-800/40">
                            ⚡ {triggerLabels[rule.trigger] || rule.trigger}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              rule.enabled
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/50'
                                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {rule.enabled ? 'ACTIVE' : 'DISABLED'}
                          </span>
                        </div>
                        {rule.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{rule.description}</p>
                        )}
                      </div>

                      {/* Rule Actions: Toggle, Edit, Delete */}
                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => onToggleRule(rule.id)}
                          className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                            rule.enabled
                              ? 'neu-btn text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                              : 'neu-btn text-slate-500'
                          }`}
                          title={rule.enabled ? 'Click to disable' : 'Click to activate'}
                        >
                          {rule.enabled ? 'Active Rule' : 'Disabled'}
                        </button>

                        {(currentUser.role === 'superadmin' || currentUser.role === 'admin') && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditRule(rule)}
                              className="neu-btn p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer"
                              title="Edit Automation Rule"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRuleToDelete(rule)}
                              className="neu-btn p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                              title="Delete Automation Rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Visual Breakdown of Conditions & Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200/70 dark:border-white/5 text-xs">
                      {/* IF Conditions */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1">
                          <span className="text-amber-600 dark:text-amber-400 font-black">IF</span> Trigger Conditions:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {rule.conditions && rule.conditions.length > 0 ? (
                            rule.conditions.map((c, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-white/10"
                              >
                                <span className="font-semibold text-slate-900 dark:text-white capitalize">{c.field}</span>
                                <span className="text-slate-500 font-mono text-[10px]">{c.operator.replace('_', ' ')}</span>
                                {c.operator !== 'is_empty' && (
                                  <span className="font-bold text-amber-600 dark:text-amber-400">"{c.value}"</span>
                                )}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No specific conditions (always runs)</span>
                          )}
                        </div>
                      </div>

                      {/* THEN Actions */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1">
                          <span className="text-cyan-600 dark:text-cyan-400 font-black">THEN</span> Automated Actions:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {rule.actions && rule.actions.length > 0 ? (
                            rule.actions.map((a, i) => {
                              let actionLabel = a.type.replace('_', ' ');
                              let valDisplay = a.value;

                              if (a.type === 'assign_team') {
                                const t = AVAILABLE_TEAMS.find(team => team.id === a.value);
                                valDisplay = t ? t.name : a.value;
                              } else if (a.type === 'assign_technician') {
                                const u = availableUsers.find(user => user.id === a.value);
                                valDisplay = u ? u.name : a.value;
                              }

                              return (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 text-[11px] font-medium border border-cyan-200 dark:border-cyan-800/40"
                                >
                                  <span className="capitalize">{actionLabel}:</span>
                                  <span className="font-bold truncate max-w-[150px]">{valDisplay}</span>
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No actions defined</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats Footer */}
                    <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5">
                      <span>
                        Executed <strong className="text-slate-800 dark:text-slate-200">{rule.executionCount || 0}</strong> times
                      </span>
                      <span>
                        Last run: {rule.lastExecutedAt ? new Date(rule.lastExecutedAt).toLocaleString() : 'Never'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
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

          <form onSubmit={handleSaveBranding} className="space-y-5">
            {/* Shape / Template Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Logo Shape &amp; Display Template
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setBrandLogoTemplate('rectangle');
                    setBrandLogoWidth(200);
                    setBrandLogoHeight(80);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    brandLogoTemplate === 'rectangle'
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-800 dark:text-cyan-300 shadow-sm ring-1 ring-cyan-500/40'
                      : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-3 rounded-xs border-2 border-current" />
                    <span className="text-xs font-bold">Rectangle Banner</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Horizontal company wordmarks, full width SVGs/PNGs (auto scales in header).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBrandLogoTemplate('round');
                    setBrandLogoWidth(80);
                    setBrandLogoHeight(80);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    brandLogoTemplate === 'round'
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-800 dark:text-cyan-300 shadow-sm ring-1 ring-cyan-500/40'
                      : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 rounded-full border-2 border-current" />
                    <span className="text-xs font-bold">Round (Circle)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Emblems, circular stamps, seals, or avatars with rounded ring.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBrandLogoTemplate('square');
                    setBrandLogoWidth(80);
                    setBrandLogoHeight(80);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    brandLogoTemplate === 'square'
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-800 dark:text-cyan-300 shadow-sm ring-1 ring-cyan-500/40'
                      : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 rounded-xs border-2 border-current" />
                    <span className="text-xs font-bold">Square Icon</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    App icons, square shields, favicons with subtle rounded corners.
                  </p>
                </button>
              </div>
            </div>

            {/* Logo Upload & URL Box */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                <span>Upload Logo or Specify Image URL</span>
                <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                  Accepts PNG, SVG, JPG, WebP (Transparent supported)
                </span>
              </label>

              <div className="flex flex-col md:flex-row items-start gap-4 p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-300 dark:border-white/10">
                {/* Visual Preview Box */}
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <div
                    className={`w-[200px] h-[120px] rounded-xl border-2 border-dashed border-cyan-500/40 bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden p-2 relative shadow-inner group ${
                      brandLogoTemplate === 'round' ? 'p-1' : ''
                    }`}
                    title="Logo Preview Frame"
                  >
                    {brandLogoUrl && !brandLogoLoadError ? (
                      <div
                        className={`w-full h-full flex items-center justify-center ${
                          brandLogoTemplate === 'round'
                            ? 'rounded-full overflow-hidden'
                            : brandLogoTemplate === 'square'
                            ? 'rounded-lg overflow-hidden'
                            : ''
                        }`}
                      >
                        <img
                          src={brandLogoUrl}
                          alt="Brand Logo Preview"
                          className={`max-w-full max-h-full ${
                            brandLogoTemplate === 'round'
                              ? 'w-full h-full object-cover rounded-full'
                              : 'object-contain'
                          } select-none transition-transform group-hover:scale-105`}
                          onError={() => setBrandLogoLoadError(true)}
                        />
                      </div>
                    ) : brandLogoUrl && brandLogoLoadError ? (
                      <div className="text-center p-2 text-rose-600 dark:text-rose-400 space-y-1">
                        <AlertCircle className="w-5 h-5 mx-auto text-rose-500" />
                        <div className="text-[11px] font-bold">Image failed to load</div>
                        <div className="text-[10px] text-slate-500">Check URL or select a preset</div>
                      </div>
                    ) : (
                      <div className="text-center p-3 text-slate-400 dark:text-slate-500 space-y-1">
                        <Palette className="w-7 h-7 mx-auto text-cyan-500/60" />
                        <div className="text-[11px] font-bold">Upload Any Logo</div>
                        <div className="text-[10px]">PNG · SVG · JPG</div>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-semibold capitalize">
                    {brandLogoTemplate} Preview
                  </span>
                </div>

                {/* Upload & Controls */}
                <div className="flex-1 space-y-3 w-full">
                  <div>
                    <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-cyan-500/50 hover:border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 text-cyan-800 dark:text-cyan-300 text-xs font-bold cursor-pointer transition-all hover:bg-cyan-100/60 dark:hover:bg-cyan-950/40 shadow-xs">
                      <Upload className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      <span>Choose File (PNG, SVG, JPG, WebP)</span>
                      <input
                        type="file"
                        accept=".png,.svg,.jpg,.jpeg,.webp,image/png,image/svg+xml,image/jpeg,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const result = event.target?.result as string;
                            setBrandLogoUrl(result);
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Or Paste Logo Image URL / SVG Data
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="https://example.com/logo.png or data:image/png;base64,..."
                        value={brandLogoUrl}
                        onChange={(e) => setBrandLogoUrl(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
                      />
                      {brandLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setBrandLogoUrl('')}
                          className="px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 neu-btn rounded-lg font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        >
                          Clear Logo
                        </button>
                      )}
                    </div>
                  </div>

                  {/* One-Click Presets */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Sample SVG Logo Presets:
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setBrandLogoUrl(
                            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60"><rect width="200" height="60" rx="10" fill="%230f172a"/><path d="M30 15 L45 22 V38 C45 48 30 54 30 54 C30 54 15 48 15 38 V22 Z" fill="%230284c7" stroke="%2338bdf8" stroke-width="2"/><text x="55" y="32" fill="%23ffffff" font-family="sans-serif" font-weight="900" font-size="14">IT HELPDESK</text><text x="55" y="45" fill="%2338bdf8" font-family="sans-serif" font-weight="700" font-size="9">BY LAKHAN</text></svg>'
                          );
                          setBrandLogoTemplate('rectangle');
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg neu-btn text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 cursor-pointer"
                      >
                        Cyber Wordmark (Rectangle)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBrandLogoUrl(
                            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%230284c7"/><path d="M50 20 L75 32 V58 C75 73 50 82 50 82 C50 82 25 73 25 58 V32 Z" fill="%230f172a" stroke="%23ffffff" stroke-width="3"/><path d="M50 35 L58 52 H42 L50 68" stroke="%2338bdf8" stroke-width="3" stroke-linecap="round" fill="none"/></svg>'
                          );
                          setBrandLogoTemplate('round');
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg neu-btn text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer"
                      >
                        Shield Seal (Round)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBrandLogoUrl(
                            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%234f46e5"/><circle cx="50" cy="50" r="28" fill="none" stroke="%23ffffff" stroke-width="5"/><ellipse cx="50" cy="50" rx="28" ry="12" fill="none" stroke="%23a5b4fc" stroke-width="3"/><circle cx="50" cy="50" r="6" fill="%23ffffff"/></svg>'
                          );
                          setBrandLogoTemplate('square');
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg neu-btn text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                      >
                        Apex Orb (Square)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Header Navbar Preview Widget */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Live Header Navbar Rendering Preview
                </span>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold uppercase font-mono">
                  Real-time Simulation
                </span>
              </div>
              <div className="h-16 w-full px-4 rounded-xl bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
                {/* Simulated Header Brand */}
                <div className="flex items-center gap-3">
                  {brandLogoUrl && !brandLogoLoadError ? (
                    <>
                      {brandLogoTemplate === 'round' && (
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 shadow-xs flex items-center justify-center p-0.5 shrink-0 ring-2 ring-cyan-500/20">
                          <img
                            src={brandLogoUrl}
                            alt="Preview"
                            className="w-full h-full object-cover rounded-full"
                          />
                        </div>
                      )}
                      {brandLogoTemplate === 'square' && (
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 shadow-xs flex items-center justify-center p-1.5 shrink-0 ring-2 ring-cyan-500/20">
                          <img
                            src={brandLogoUrl}
                            alt="Preview"
                            className="w-full h-full object-contain rounded-lg"
                          />
                        </div>
                      )}
                      {brandLogoTemplate === 'rectangle' && (
                        <div className="h-10 max-h-11 flex items-center shrink-0 max-w-[210px] overflow-hidden p-1 rounded-xl bg-white/60 dark:bg-slate-900/50 border border-slate-200/70 dark:border-white/10">
                          <img
                            src={brandLogoUrl}
                            alt="Preview"
                            className="h-full w-auto max-h-9 object-contain"
                          />
                        </div>
                      )}
                      <div className={`flex flex-col leading-tight ${brandLogoTemplate === 'rectangle' ? 'pl-2 border-l border-slate-200 dark:border-slate-800' : ''}`}>
                        <span className="font-extrabold text-[15px] tracking-tight text-slate-900 dark:text-white">
                          {brandTitle || 'IT Helpdesk by Lakhan'}
                        </span>
                        <span className="text-[10px] font-bold tracking-wider text-cyan-600 dark:text-cyan-400 uppercase font-mono">
                          {brandSubtitle || 'Enterprise Support'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-600 to-indigo-600 flex items-center justify-center shadow-md text-white shrink-0 ring-1 ring-cyan-400/30">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex flex-col leading-tight">
                        <span className="font-extrabold text-[15px] tracking-tight text-slate-900 dark:text-white">
                          {brandTitle || 'IT Helpdesk by Lakhan'}
                        </span>
                        <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-cyan-400/90 uppercase font-mono">
                          {brandSubtitle || 'Enterprise Support'}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Simulated Header Navigation & Profile Badges */}
                <div className="hidden sm:flex items-center gap-2">
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-cyan-500/15 text-cyan-600 border border-cyan-500/30">
                    Console
                  </span>
                  <span className="px-2.5 py-1 text-[11px] font-medium text-slate-400">
                    Tickets
                  </span>
                  <span className="px-2.5 py-1 text-[11px] font-medium text-slate-400">
                    Assets &amp; Inventory
                  </span>
                </div>
              </div>
            </div>

            {/* Title & Subtitle Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Product / Helpdesk Title
                </label>
                <input
                  type="text"
                  value={brandTitle}
                  onChange={(e) => setBrandTitle(e.target.value)}
                  placeholder="IT Helpdesk by Lakhan"
                  className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Header Subtitle / Tagline
                </label>
                <input
                  type="text"
                  value={brandSubtitle}
                  onChange={(e) => setBrandSubtitle(e.target.value)}
                  placeholder="Enterprise Support"
                  className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Support Email Address</label>
                <input
                  type="email"
                  value={brandEmail}
                  onChange={(e) => setBrandEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Portal Welcome Notice</label>
                <input
                  type="text"
                  value={portalWelcome}
                  onChange={(e) => setPortalWelcome(e.target.value)}
                  className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="neu-btn-primary px-6 py-2.5 text-xs font-bold rounded-xl cursor-pointer shadow-md flex items-center gap-2"
              >
                <span>Save Branding &amp; Apply Logo</span>
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
              { id: 'ubuntu', label: 'Ubuntu / Debian (Native systemd & PM2)' },
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

          {/* ZERO DATA LOSS UPDATE NOTICE (CRITICAL FOR PRODUCTION HOSTING) */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/40 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Zero-Data-Loss Updates Anytime (Pulling New GitHub Features)
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Automated Protection Included
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              When you push updates from AI Studio to your GitHub repository (<code>https://github.com/itcell787-oss/IT-Helpdesk-by-Lakhan</code>), run the automated update script on your Ubuntu server. It automatically creates a timestamped backup, safely pulls changes, rebuilds, and preserves all your tickets, users, assets, and configurations:
            </p>
            <div className="p-3.5 rounded-xl bg-slate-950 font-mono text-xs text-emerald-400 border border-slate-800 flex items-center justify-between select-all shadow-inner">
              <span>cd /opt/it-helpdesk &amp;&amp; ./update.sh</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('cd /opt/it-helpdesk && ./update.sh');
                  alert('Copied update command to clipboard!');
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 cursor-pointer"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Database Backup & Disaster Recovery in UI */}
          {currentUser.role === 'superadmin' && (
            <div className="neu-flat p-5 rounded-2xl border border-cyan-500/30 bg-cyan-950/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <Download className="w-4 h-4 text-cyan-500" />
                    Database Backup &amp; Disaster Recovery (Superadmin Only)
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    Download full production database snapshots directly in your browser or restore from previous backup.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    disabled={backupLoading}
                    className="neu-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {backupLoading ? 'Exporting...' : 'Download Database (.json)'}
                  </button>

                  <label className="neu-btn flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl cursor-pointer text-slate-700 dark:text-slate-300 hover:text-cyan-600">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{restoreLoading ? 'Restoring...' : 'Restore from Backup'}</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleUploadRestore}
                      className="hidden"
                      disabled={restoreLoading}
                    />
                  </label>
                </div>
              </div>

              {restoreSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  ✓ {restoreSuccessMsg}
                </div>
              )}
              {restoreErrMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 text-xs font-bold">
                  ✕ {restoreErrMsg}
                </div>
              )}

              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Persistent storage location on Ubuntu: <code className="text-cyan-400 font-mono">/opt/it-helpdesk/data/database.json</code> (or custom path via <code className="text-cyan-400 font-mono">DB_FILE</code> environment variable).
              </div>
            </div>
          )}

          {/* Installation Instructions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Step 1 & 2 */}
            <div className="neu-flat p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                  1
                </span>
                Ubuntu Server Initial Setup (One Command)
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                Clone directly from your synced GitHub repository and run the included installer:
              </p>
              <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-1.5 overflow-x-auto custom-scrollbar select-all border border-slate-800 shadow-inner">
                <div className="text-slate-400"># 1. Clone your repository to /opt/it-helpdesk</div>
                <div>git clone https://github.com/itcell787-oss/IT-Helpdesk-by-Lakhan.git /opt/it-helpdesk</div>
                <div>cd /opt/it-helpdesk</div>
                <div className="text-slate-400 pt-1"># 2. Make scripts executable and run installer</div>
                <div>chmod +x install-ubuntu.sh update.sh</div>
                <div>sudo ./install-ubuntu.sh</div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white pt-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                  2
                </span>
                Production Environment File (<code>/opt/it-helpdesk/.env</code>)
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-1 overflow-x-auto custom-scrollbar select-all border border-slate-800 shadow-inner">
                <div className="text-cyan-400">PORT=3000</div>
                <div className="text-cyan-400">NODE_ENV=production</div>
                <div className="text-cyan-400">HOST=0.0.0.0</div>
                <div className="text-slate-400"># Optional custom persistent database path outside repo:</div>
                <div className="text-slate-400"># DB_FILE=/var/lib/it-helpdesk/database.json</div>
              </div>
            </div>

            {/* Step 3: PM2 daemon or systemd */}
            <div className="neu-flat p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                  3
                </span>
                Managing the Service (PM2 / systemd)
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                The installer sets up PM2 process manager to run 24/7 and auto-restart on boot:
              </p>
              <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] space-y-1.5 overflow-x-auto custom-scrollbar select-all border border-slate-800 shadow-inner">
                <div className="text-slate-400"># Check status of IT Helpdesk:</div>
                <div>pm2 status it-helpdesk</div>
                <div className="text-slate-400 pt-1"># View live real-time server logs:</div>
                <div>pm2 logs it-helpdesk</div>
                <div className="text-slate-400 pt-1"># Restart application manually:</div>
                <div>pm2 restart it-helpdesk</div>
              </div>
            </div>
          </div>

          {/* Nginx & Firewall */}
          <div className="neu-flat p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Nginx Reverse Proxy &amp; SSL (HTTPS Domain)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Proxy incoming port 80/443 traffic to local port 3000 with WebSocket support:
            </p>
            <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto select-all border border-slate-800 leading-relaxed">
{`server {
    listen 80;
    server_name helpdesk.yourdomain.com;

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

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                  <span>Employee Code (EMP code) *</span>
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-bold">Compulsory (e.g. CBPL1010)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CBPL1010"
                  value={userFormEmployeeCode}
                  onChange={(e) => setUserFormEmployeeCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold tracking-wide"
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
                    <option value="manager">Team Manager</option>
                    <option value="inventory_manager">Inventory Manager</option>
                    <option value="auditor">Compliance Auditor</option>
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

              {userFormRole === 'requester' && (
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                    <span>Requester Group &amp; Assigned Manager for Approval</span>
                    <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-bold">Manager Routing</span>
                  </label>
                  <select
                    value={userFormGroupId}
                    onChange={(e) => {
                      const gid = e.target.value;
                      setUserFormGroupId(gid);
                      const team = dbTeams.find((t) => t.id === gid);
                      if (team) {
                        setUserFormGroupName(team.name);
                        setUserFormManagerId(team.managerId || '');
                      } else {
                        setUserFormGroupName('');
                        setUserFormManagerId('');
                      }
                    }}
                    className="w-full px-3 py-1.5 text-xs neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="">No Group Assigned (Unassigned)</option>
                    {dbTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.managerName ? `(Manager: ${t.managerName})` : ''}
                      </option>
                    ))}
                  </select>
                  {userFormManagerId ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block font-medium">
                      ✓ Tickets and approvals from this requester route to Team Manager: <strong>{dbTeams.find((t) => t.id === userFormGroupId)?.managerName || 'Assigned Manager'}</strong>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block font-medium">
                      Assign this requester to a group so their respective Team Manager can view and approve their requests.
                    </span>
                  )}
                </div>
              )}

              {userFormRole === 'manager' && (
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Managed Team / Requester Group
                  </label>
                  <select
                    value={userFormGroupId}
                    onChange={(e) => {
                      const gid = e.target.value;
                      setUserFormGroupId(gid);
                      const team = dbTeams.find((t) => t.id === gid);
                      if (team) {
                        setUserFormGroupName(team.name);
                      } else {
                        setUserFormGroupName('');
                      }
                    }}
                    className="w-full px-3 py-1.5 text-xs neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="">Select team to manage...</option>
                    {dbTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5 block font-medium">
                    This manager will only be permitted to view and close tickets and inventory belonging to this group/team.
                  </span>
                </div>
              )}

              {userFormRole === 'requester' && (
                <div className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Assigned Requester Group / Team
                    </label>
                    <select
                      value={userFormGroupId}
                      onChange={(e) => {
                        const gid = e.target.value;
                        setUserFormGroupId(gid);
                        const team = dbTeams.find((t) => t.id === gid);
                        if (team) {
                          setUserFormGroupName(team.name);
                          if (team.managerId) {
                            setUserFormManagerId(team.managerId);
                          }
                        } else {
                          setUserFormGroupName('');
                        }
                      }}
                      className="w-full px-3 py-1.5 text-xs neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
                    >
                      <option value="">Select requester group...</option>
                      {dbTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Assigned Manager or Admin *
                    </label>
                    <select
                      value={userFormManagerId}
                      onChange={(e) => setUserFormManagerId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
                    >
                      <option value="">Select assigned manager/admin...</option>
                      {availableUsers
                        .filter((u) => u.role === 'manager' || u.role === 'admin' || u.role === 'superadmin')
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role.toUpperCase()})
                          </option>
                        ))}
                    </select>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block font-medium">
                      Hierarchy: Each requester must have one assigned Manager or Admin for approvals and oversight.
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                  <span>Assigned Organization *</span>
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-bold">Multi-Tenant Routing</span>
                </label>
                <select
                  value={userFormOrgId}
                  onChange={(e) => setUserFormOrgId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
                >
                  {allOrganizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.domain || org.id})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block font-medium">
                  When this user submits tickets, they will automatically be classified under this organization.
                </span>
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
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Assigned Team *
                </label>
                <select
                  value={userFormTeam}
                  onChange={(e) => setUserFormTeam(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="General Operations">General Operations</option>
                  <option value="Finance & Accounting">Finance & Accounting</option>
                  <option value="Global Sales & Marketing">Global Sales & Marketing</option>
                  <option value="Software & Infrastructure">Software & Infrastructure</option>
                  <option value="People & HR Operations">People & HR Operations</option>
                  <option value="Tier 1 Service Desk">Tier 1 Service Desk</option>
                  <option value="Cloud & Network Operations">Cloud & Network Operations</option>
                  <option value="Cybersecurity & Compliance">Cybersecurity & Compliance</option>
                  <option value="Workplace Hardware Logistics">Workplace Hardware Logistics</option>
                </select>
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

              {userFormRole !== 'requester' && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Role Access Privileges</span>
                    <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-normal">Super Admin Controlled</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 cursor-pointer hover:border-cyan-500/30">
                      <input
                        type="checkbox"
                        checked={userFormCanManageTickets}
                        onChange={(e) => setUserFormCanManageTickets(e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">View/Manage Tickets</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 cursor-pointer hover:border-rose-500/30">
                      <input
                        type="checkbox"
                        checked={userFormCanDeleteTickets}
                        onChange={(e) => setUserFormCanDeleteTickets(e.target.checked)}
                        className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                      <span className="font-semibold text-rose-700 dark:text-rose-400">Delete Tickets</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 cursor-pointer hover:border-cyan-500/30">
                      <input
                        type="checkbox"
                        checked={userFormCanManageAssets}
                        onChange={(e) => setUserFormCanManageAssets(e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Manage Assets</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 cursor-pointer hover:border-cyan-500/30">
                      <input
                        type="checkbox"
                        checked={userFormCanManageApprovals}
                        onChange={(e) => setUserFormCanManageApprovals(e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Manage Approvals</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 cursor-pointer hover:border-cyan-500/30 col-span-1 sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={userFormCanManageKb}
                        onChange={(e) => setUserFormCanManageKb(e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Manage Knowledge Base</span>
                    </label>
                  </div>

                  {/* Left Navigation Pane Views Privileges */}
                  <div className="pt-2.5 border-t border-slate-200 dark:border-white/10 space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Left Navigation Pane Views</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Toggle views visible in sidebar</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 cursor-pointer hover:border-cyan-500/30">
                        <input
                          type="checkbox"
                          checked={userFormCanViewDashboard}
                          onChange={(e) => setUserFormCanViewDashboard(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Dashboard</span>
                      </label>
                      <label className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 cursor-pointer hover:border-cyan-500/30">
                        <input
                          type="checkbox"
                          checked={userFormCanViewTickets}
                          onChange={(e) => setUserFormCanViewTickets(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Tickets</span>
                      </label>
                      <label className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 cursor-pointer hover:border-cyan-500/30">
                        <input
                          type="checkbox"
                          checked={userFormCanViewAssets}
                          onChange={(e) => setUserFormCanViewAssets(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Assets</span>
                      </label>
                      <label className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 cursor-pointer hover:border-cyan-500/30">
                        <input
                          type="checkbox"
                          checked={userFormCanViewApprovals}
                          onChange={(e) => setUserFormCanViewApprovals(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Approvals</span>
                      </label>
                      <label className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 cursor-pointer hover:border-cyan-500/30 col-span-2">
                        <input
                          type="checkbox"
                          checked={userFormCanViewReports}
                          onChange={(e) => setUserFormCanViewReports(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Reports &amp; SLA Metrics</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

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

      {/* Modal: Superadmin Reset Password of Everyone */}
      {resetUserTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md neu-modal p-6 rounded-2xl border border-amber-300 dark:border-amber-500/30 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Reset User Password
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Superadmin override for <strong className="text-slate-900 dark:text-white">{resetUserTarget.name}</strong> ({resetUserTarget.email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetUserTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {resetErrMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs">
                {resetErrMsg}
              </div>
            )}
            {resetSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                {resetSuccessMsg}
              </div>
            )}

            <form onSubmit={handleResetUserPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  New Password *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter new password (min. 6 characters)"
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setResetUserTarget(null)}
                  className="neu-btn px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="neu-btn-primary px-5 py-2 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {resetLoading ? 'Resetting...' : 'Confirm Password Reset'}
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
      {/* Modal: Superadmin Manage Admin Privileges & Access Level      */}
      {/* ============================================================= */}
      {privilegeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg neu-modal p-6 rounded-2xl border border-indigo-300 dark:border-indigo-500/30 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Access Level &amp; Administrative Privileges
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure granular permissions for <span className="font-bold text-slate-900 dark:text-white">{privilegeUser.name}</span> ({privilegeUser.role.toUpperCase()})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrivilegeUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePrivileges} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Granular Privilege Flags
                </div>

                {/* Flag 1: Manage Tickets */}
                <label className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 cursor-pointer hover:border-cyan-500/40 transition-colors">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Manage Tickets (View, Assign, Reply, Close)</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Allows handling support tickets, adding public and internal notes, and updating statuses.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={privCanManageTickets}
                    onChange={(e) => setPrivCanManageTickets(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer mt-0.5"
                  />
                </label>

                {/* Flag 2: Delete Tickets (Critical Privilege) */}
                <label className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 cursor-pointer hover:border-rose-500/40 transition-colors">
                  <div>
                    <div className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <span>Delete Tickets (Permanent Destruction)</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Superadmin privilege to permanently expunge tickets and audit trails from the database.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={privCanDeleteTickets}
                    onChange={(e) => setPrivCanDeleteTickets(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer mt-0.5"
                  />
                </label>

                {/* Flag 3: Manage Assets */}
                <label className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 cursor-pointer hover:border-cyan-500/40 transition-colors">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Manage Hardware Assets &amp; Inventory</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Full access to register new CMDB hardware, edit serials/IPs, export Excel, and scrap defective assets.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={privCanManageAssets}
                    onChange={(e) => setPrivCanManageAssets(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer mt-0.5"
                  />
                </label>

                {/* Flag 4: Manage Knowledge Base */}
                <label className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 cursor-pointer hover:border-cyan-500/40 transition-colors">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Manage Knowledge Base Articles</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Author, edit, publish, and delete self-service helpdesk solutions.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={privCanManageKb}
                    onChange={(e) => setPrivCanManageKb(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer mt-0.5"
                  />
                </label>

                {/* Flag 5: Manage Approvals */}
                <label className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 cursor-pointer hover:border-cyan-500/40 transition-colors">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Manage Approval Requests</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Authorize equipment purchase requisitions and system change workflows.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={privCanManageApprovals}
                    onChange={(e) => setPrivCanManageApprovals(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer mt-0.5"
                  />
                </label>

                {/* Left Navigation Pane Views Section */}
                <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>Left Navigation Pane Views</span>
                    <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold">Sidebar Menu Visibility</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 cursor-pointer hover:border-cyan-500/40 transition-colors">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Dashboard</span>
                      <input
                        type="checkbox"
                        checked={privCanViewDashboard}
                        onChange={(e) => setPrivCanViewDashboard(e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 cursor-pointer hover:border-cyan-500/40 transition-colors">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Tickets</span>
                      <input
                        type="checkbox"
                        checked={privCanViewTickets}
                        onChange={(e) => setPrivCanViewTickets(e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 cursor-pointer hover:border-cyan-500/40 transition-colors">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Assets</span>
                      <input
                        type="checkbox"
                        checked={privCanViewAssets}
                        onChange={(e) => setPrivCanViewAssets(e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 cursor-pointer hover:border-cyan-500/40 transition-colors">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Approvals</span>
                      <input
                        type="checkbox"
                        checked={privCanViewApprovals}
                        onChange={(e) => setPrivCanViewApprovals(e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 cursor-pointer hover:border-cyan-500/40 transition-colors col-span-2">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Reports &amp; SLA Metrics</span>
                      <input
                        type="checkbox"
                        checked={privCanViewReports}
                        onChange={(e) => setPrivCanViewReports(e.target.checked)}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setPrivilegeUser(null)}
                  className="neu-btn px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={privSaving}
                  className="neu-btn-primary px-5 py-2 text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {privSaving ? 'Saving...' : 'Save Privileges'}
                </button>
              </div>
            </form>
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

      {/* ============================================================= */}
      {/* Modal: Create / Edit Custom Automation Rule */}
      {/* ============================================================= */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-2xl neu-modal p-6 rounded-2xl border border-slate-200 dark:border-white/15 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar space-y-5 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingRuleId ? 'Edit Automation Rule' : 'Create Custom Automation Rule'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Define trigger conditions and automatic actions executed on tickets
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRuleModal(false)}
                className="neu-btn p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Error Message */}
            {ruleError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{ruleError}</span>
              </div>
            )}

            {/* Quick Templates Bar */}
            {!editingRuleId && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  Pre-fill with Template:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {AUTOMATION_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl)}
                      className="px-2.5 py-1 text-[11px] rounded-lg neu-btn text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 font-medium cursor-pointer"
                    >
                      {tmpl.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveRule} className="space-y-4">
              {/* Rule Name & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="e.g., Auto-Route Network Incidents to NetOps"
                    className="w-full px-3 py-2 text-xs neu-input bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Status
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-xl neu-card border border-slate-200 dark:border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ruleEnabled}
                      onChange={(e) => setRuleEnabled(e.target.checked)}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {ruleEnabled ? 'Active Rule' : 'Disabled'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  placeholder="Optional brief explanation of what this automation executes"
                  className="w-full px-3 py-2 text-xs neu-input bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              {/* Trigger Event */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                  <span>Trigger Event *</span>
                  <span className="text-[10px] text-slate-500 font-normal">When should this rule execute?</span>
                </label>
                <select
                  value={ruleTrigger}
                  onChange={(e) => setRuleTrigger(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
                >
                  <option value="ticket_created">When Ticket is Created (Inbound or Manual)</option>
                  <option value="ticket_updated">When Ticket is Updated</option>
                  <option value="status_changed">When Ticket Status Changes</option>
                  <option value="priority_changed">When Ticket Priority Changes</option>
                </select>
              </div>

              {/* SECTION: Trigger Conditions (IF) */}
              <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono text-[10px] font-black border border-amber-500/20">
                      IF
                    </span>
                    Trigger Conditions (All conditions must be satisfied - AND logic)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCondition}
                    className="neu-btn px-2.5 py-1 text-[11px] font-bold rounded-lg text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Add Condition
                  </button>
                </div>

                <div className="space-y-2">
                  {ruleConditions.map((condition, index) => {
                    const selectOptions: Record<string, string[]> = {
                      priority: ['low', 'medium', 'high', 'critical'],
                      impact: ['low', 'medium', 'high', 'critical'],
                      urgency: ['low', 'medium', 'high', 'critical'],
                      status: ['open', 'in_progress', 'pending_customer', 'resolved', 'closed'],
                      category: ['Hardware', 'Software', 'Network', 'Access & Identity', 'Cloud & Email', 'Security', 'Procurement', 'Other'],
                      source: ['portal', 'email', 'phone', 'chat', 'walk_in'],
                    };

                    const hasPresetValues = Boolean(selectOptions[condition.field]);

                    return (
                      <div
                        key={index}
                        className="p-3 rounded-xl neu-card bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs"
                      >
                        {/* Field */}
                        <div className="flex-1 min-w-[130px]">
                          <span className="block text-[10px] font-bold text-slate-500 mb-0.5">Field</span>
                          <select
                            value={condition.field}
                            onChange={(e) => handleConditionChange(index, 'field', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
                          >
                            <option value="category">Category</option>
                            <option value="priority">Priority</option>
                            <option value="impact">Impact</option>
                            <option value="urgency">Urgency</option>
                            <option value="status">Status</option>
                            <option value="source">Source Channel</option>
                            <option value="title">Title / Subject</option>
                            <option value="description">Description Content</option>
                            <option value="requesterEmail">Requester Email</option>
                          </select>
                        </div>

                        {/* Operator */}
                        <div className="w-full sm:w-[130px]">
                          <span className="block text-[10px] font-bold text-slate-500 mb-0.5">Operator</span>
                          <select
                            value={condition.operator}
                            onChange={(e) => handleConditionChange(index, 'operator', e.target.value as any)}
                            className="w-full px-2.5 py-1.5 text-xs neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
                          >
                            <option value="equals">Equals</option>
                            <option value="not_equals">Does Not Equal</option>
                            <option value="contains">Contains</option>
                            <option value="is_empty">Is Empty</option>
                          </select>
                        </div>

                        {/* Value */}
                        {condition.operator !== 'is_empty' && (
                          <div className="flex-1 min-w-[150px]">
                            <span className="block text-[10px] font-bold text-slate-500 mb-0.5">Target Value</span>
                            {hasPresetValues ? (
                              <select
                                value={condition.value}
                                onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
                              >
                                <option value="">-- Select Value --</option>
                                {selectOptions[condition.field].map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={condition.value}
                                onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
                                placeholder="Enter match text"
                                className="w-full px-2.5 py-1.5 text-xs neu-input bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                              />
                            )}
                          </div>
                        )}

                        {/* Remove condition */}
                        {ruleConditions.length > 1 && (
                          <div className="self-end sm:self-center sm:pt-4">
                            <button
                              type="button"
                              onClick={() => handleRemoveCondition(index)}
                              className="neu-btn p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                              title="Remove Condition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: Automated Actions (THEN) */}
              <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-mono text-[10px] font-black border border-cyan-500/20">
                      THEN
                    </span>
                    Automated Actions (Actions executed on matched tickets)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddAction}
                    className="neu-btn px-2.5 py-1 text-[11px] font-bold rounded-lg text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Add Action
                  </button>
                </div>

                <div className="space-y-2">
                  {ruleActions.map((action, index) => {
                    const staff = availableUsers.filter(u => ['superadmin', 'admin', 'manager', 'technician'].includes(u.role));

                    return (
                      <div
                        key={index}
                        className="p-3 rounded-xl neu-card bg-cyan-50/40 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/40 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs"
                      >
                        {/* Action Type */}
                        <div className="w-full sm:w-[180px]">
                          <span className="block text-[10px] font-bold text-slate-500 mb-0.5">Action Type</span>
                          <select
                            value={action.type}
                            onChange={(e) => handleActionChange(index, 'type', e.target.value as any)}
                            className="w-full px-2.5 py-1.5 text-xs neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
                          >
                            <option value="assign_team">Assign to Support Team</option>
                            <option value="assign_technician">Assign to Technician</option>
                            <option value="set_priority">Set Priority Level</option>
                            <option value="set_status">Set Ticket Status</option>
                            <option value="add_tag">Add Tag</option>
                            <option value="add_internal_note">Post Internal Runbook Note</option>
                          </select>
                        </div>

                        {/* Action Value based on type */}
                        <div className="flex-1 min-w-[180px]">
                          <span className="block text-[10px] font-bold text-slate-500 mb-0.5">Action Parameter</span>

                          {action.type === 'assign_team' && (
                            <select
                              value={action.value}
                              onChange={(e) => handleActionChange(index, 'value', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
                            >
                              {AVAILABLE_TEAMS.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          )}

                          {action.type === 'assign_technician' && (
                            <select
                              value={action.value}
                              onChange={(e) => handleActionChange(index, 'value', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
                            >
                              <option value="">-- Select Staff Assignee --</option>
                              {staff.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name} ({u.role})
                                </option>
                              ))}
                            </select>
                          )}

                          {action.type === 'set_priority' && (
                            <select
                              value={action.value}
                              onChange={(e) => handleActionChange(index, 'value', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="critical">Critical (Sev-1)</option>
                            </select>
                          )}

                          {action.type === 'set_status' && (
                            <select
                              value={action.value}
                              onChange={(e) => handleActionChange(index, 'value', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
                            >
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="pending_customer">Pending Customer</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                          )}

                          {action.type === 'add_tag' && (
                            <input
                              type="text"
                              value={action.value}
                              onChange={(e) => handleActionChange(index, 'value', e.target.value)}
                              placeholder="e.g. netops-auto, p1-escalated, vip"
                              className="w-full px-2.5 py-1.5 text-xs neu-input bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                            />
                          )}

                          {action.type === 'add_internal_note' && (
                            <textarea
                              rows={2}
                              value={action.value}
                              onChange={(e) => handleActionChange(index, 'value', e.target.value)}
                              placeholder="Internal runbook comment posted to the ticket..."
                              className="w-full px-2.5 py-1.5 text-xs neu-input bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium custom-scrollbar"
                            />
                          )}
                        </div>

                        {/* Remove action */}
                        {ruleActions.length > 1 && (
                          <div className="self-end sm:self-center sm:pt-4">
                            <button
                              type="button"
                              onClick={() => handleRemoveAction(index)}
                              className="neu-btn p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                              title="Remove Action"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="neu-btn px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ruleSaving}
                  className="neu-btn-primary px-5 py-2 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {ruleSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {editingRuleId ? 'Update Automation Rule' : 'Create Automation Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* Modal: Delete Automation Rule Confirmation */}
      {/* ============================================================= */}
      {ruleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md neu-modal p-6 rounded-2xl border border-rose-300 dark:border-rose-900/60 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Automation Rule</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently delete the automation rule{' '}
              <strong className="text-slate-900 dark:text-white font-bold">"{ruleToDelete.name}"</strong>?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setRuleToDelete(null)}
                className="neu-btn px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRule}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-sm"
              >
                Delete Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* Modal: Create or Edit Hardware Asset (Admin Management)       */}
      {/* ============================================================= */}
      {(showAssetModal || settingsAssetToEdit) && (
        <AssetFormModal
          isOpen={showAssetModal || !!settingsAssetToEdit}
          onClose={() => {
            setShowAssetModal(false);
            setSettingsAssetToEdit(null);
          }}
          initialData={settingsAssetToEdit}
          users={availableUsers}
          defaultCurrency={organization.systemSettings?.defaultCurrency || '₹'}
          title={settingsAssetToEdit ? `Edit Asset: ${settingsAssetToEdit.name}` : 'Register New Hardware Asset'}
          onSubmit={async (assetData) => {
            try {
              if (settingsAssetToEdit && onUpdateAsset) {
                await onUpdateAsset(settingsAssetToEdit.id, assetData);
              } else if (onCreateAsset) {
                await onCreateAsset(assetData);
              }
              setShowAssetModal(false);
              setSettingsAssetToEdit(null);
            } catch (err: any) {
              alert(err.message || 'Failed to save asset');
            }
          }}
        />
      )}

      {/* ============================================================= */}
      {/* Modal: Delete Hardware Asset Confirmation                     */}
      {/* ============================================================= */}
      {settingsAssetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full neu-modal p-6 rounded-2xl border border-rose-300 dark:border-rose-500/30 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Asset Confirmation</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Permanently remove hardware from CMDB</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">{settingsAssetToDelete.name}</span> ({settingsAssetToDelete.serialNumber})? This will unassign it from any user and remove it from inventory.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setSettingsAssetToDelete(null)}
                className="neu-btn px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (onDeleteAsset) {
                      await onDeleteAsset(settingsAssetToDelete.id);
                    }
                    setSettingsAssetToDelete(null);
                  } catch (err: any) {
                    alert(err.message || 'Failed to delete asset');
                  }
                }}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-xs cursor-pointer"
              >
                Delete Asset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* Modal: Bulk Delete Marked Assets Confirmation                 */}
      {/* ============================================================= */}
      {showBulkDeleteModal && markedSettingsAssetIds.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full neu-modal p-6 rounded-2xl border border-rose-300 dark:border-rose-500/30 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Marked Assets</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Permanently purge marked hardware from CMDB</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              Are you sure you want to permanently delete <strong className="text-slate-900 dark:text-white">{markedSettingsAssetIds.length} marked assets</strong>? This will remove them from the IT asset CMDB inventory and unassign them from any employees.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="neu-btn px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (onBulkDeleteAssets) {
                      await onBulkDeleteAssets(markedSettingsAssetIds);
                    }
                    setMarkedSettingsAssetIds([]);
                    setShowBulkDeleteModal(false);
                  } catch (err: any) {
                    alert(err.message || 'Failed deleting marked assets');
                  }
                }}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-xs cursor-pointer"
              >
                Permanently Delete ({markedSettingsAssetIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
