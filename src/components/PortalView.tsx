import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  PlusCircle,
  FileText,
  Search,
  BookOpen,
  Grid,
  CheckCircle,
  Clock,
  Send,
  Star,
  Shield,
  HelpCircle,
  KeyRound,
  CheckCircle2,
  Lock,
  UserPlus,
  Check,
  Paperclip,
  Upload,
  Trash2,
  Laptop,
  MapPin,
  AlertTriangle,
  Plus,
  Mail,
  AtSign,
  Share2,
  Forward,
  RotateCw,
  CheckCheck,
} from 'lucide-react';
import { Ticket, KnowledgeArticle, ServiceCatalogItem, User, CustomFieldDefinition, Organization, Asset, DefaultEmailGatewayConfig, ApprovalRequest } from '../types';
import { api } from '../services/api';

interface PortalViewProps {
  currentUser: User | null;
  tickets: Ticket[];
  knowledgeArticles: KnowledgeArticle[];
  serviceCatalog: ServiceCatalogItem[];
  approvals?: ApprovalRequest[];
  customFields: CustomFieldDefinition[];
  organization?: Organization;
  organizations?: Organization[];
  systemSettings?: {
    requireOtpForTicketSubmission: boolean;
    enableTicketRating: boolean;
    enableCategoryAutoAssign: boolean;
  };
  assets?: Asset[];
  allowRequesterAssetSelfService?: boolean;
  onCreateAsset?: (data: Partial<Asset>) => Promise<any> | void;
  onUpdateAsset?: (id: string, data: Partial<Asset>) => Promise<any> | void;
  onDeleteAsset?: (id: string) => Promise<any> | void;
  onOpenNewTicket: () => void;
  onSelectTicket: (ticketId: string) => void;
  onNavigateToCatalog: () => void;
  onNavigateToKb: () => void;
  onSubmitSurvey: (ticketId: string, rating: number, comment?: string) => void;
  onSubmitTicket: (data: any) => Promise<any>;
  onUserRegistered?: (user: User) => void;
  onOpenLogin?: (type?: 'user' | 'admin') => void;
  initialTab?: string;
  defaultGateway?: DefaultEmailGatewayConfig;
  onSimulateInboundEmail?: (from: string, subject: string, body: string, cc?: string, managerEmail?: string) => Promise<any>;
}

export const PortalView: React.FC<PortalViewProps> = ({
  currentUser,
  tickets,
  knowledgeArticles,
  serviceCatalog,
  approvals = [],
  customFields,
  organization,
  organizations,
  systemSettings,
  assets = [],
  allowRequesterAssetSelfService = true,
  onCreateAsset,
  onUpdateAsset,
  onDeleteAsset,
  onOpenNewTicket,
  onSelectTicket,
  onNavigateToCatalog,
  onNavigateToKb,
  onSubmitSurvey,
  onSubmitTicket,
  onUserRegistered,
  onOpenLogin,
  initialTab,
  defaultGateway,
  onSimulateInboundEmail,
}) => {
  const requireOtp = systemSettings?.requireOtpForTicketSubmission === true;
  const isRatingEnabled = systemSettings?.enableTicketRating !== false;

  const allOrganizations = organizations && organizations.length > 0 ? organizations : (organization ? [organization] : []);
  const urlOrgId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('orgId') : null;

  const [activeTab, setActiveTab] = useState<'home' | 'submit' | 'my-tickets' | 'kb' | 'register' | 'my-assets' | 'catalog-status'>(
    (initialTab as any) || 'home'
  );

  useEffect(() => {
    if (initialTab) {
      if (initialTab === 'register' && currentUser) {
        setActiveTab('home');
      } else {
        setActiveTab(initialTab as any);
      }
    }
  }, [initialTab, currentUser]);

  useEffect(() => {
    if (currentUser && activeTab === 'register') {
      setActiveTab('home');
    }
  }, [currentUser, activeTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [ratingTicketId, setRatingTicketId] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [surveyComment, setSurveyComment] = useState('');
  const [surveySubmitted, setSurveySubmitted] = useState(false);

  // User Self-Registration State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regTitle, setRegTitle] = useState('');
  const [regDepartment, setRegDepartment] = useState('Operations');
  const [regPhone, setRegPhone] = useState('');
  const [regOtpCode, setRegOtpCode] = useState('');
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtpVerified, setRegOtpVerified] = useState(false);
  const [regOtpLoading, setRegOtpLoading] = useState(false);
  const [regOtpPreview, setRegOtpPreview] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regOrgId, setRegOrgId] = useState<string>(urlOrgId || organization?.id || 'org-lakhan-tech');
  const [regPsk, setRegPsk] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regEmployeeCode, setRegEmployeeCode] = useState('');

  // Guest Ticket Tracking State
  const [guestTrackId, setGuestTrackId] = useState('');
  const [guestTrackEmail, setGuestTrackEmail] = useState('');
  const [guestTrackSearched, setGuestTrackSearched] = useState(false);

  // In-Page Ticket Submission State (supports guest and logged in)
  const [submitName, setSubmitName] = useState(currentUser?.name || '');
  const [submitEmail, setSubmitEmail] = useState(currentUser?.email || '');
  const [formLocationDesk, setFormLocationDesk] = useState('');
  const [isOtpVerified, setIsOtpVerified] = useState(!requireOtp);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpPreview, setOtpPreview] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  const [formSubject, setFormSubject] = useState('');
  const [formCategory, setFormCategory] = useState('Software & Cloud Apps');
  const [formPriority, setFormPriority] = useState('normal');
  const [formDescription, setFormDescription] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, any>>({});
  const [formAttachments, setFormAttachments] = useState<Array<{ id: string; name: string; size: number; type: string; url: string; }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Manager CC & Forward Option in Ticket
  const [managerEmail, setManagerEmail] = useState('');
  const [ccRecipients, setCcRecipients] = useState('');
  const [forwardToManager, setForwardToManager] = useState(false);



  // Requester Asset Management State (Point 1-6)
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [newAssetName, setNewAssetName] = useState('CPU');
  const [newAssetType, setNewAssetType] = useState<any>('desktop');
  const [newAssetManufacturer, setNewAssetManufacturer] = useState('');
  const [newAssetModel, setNewAssetModel] = useState('');
  const [newAssetSerial, setNewAssetSerial] = useState('');
  const [newAssetLocationDesk, setNewAssetLocationDesk] = useState('');
  const [isSubmittingAsset, setIsSubmittingAsset] = useState(false);
  const [assetActionMsg, setAssetActionMsg] = useState<string | null>(null);
  const [assetActionError, setAssetActionError] = useState<string | null>(null);

  // Customizable Requester Asset Name Dropdown Options (CPU, Keyboard, Mouse, Display, Laptop, Headphone, Webcam)
  const allowedRequesterAssetNames = React.useMemo(() => {
    const custom = (organization?.systemSettings as any)?.requesterAssetOptions;
    if (custom && Array.isArray(custom) && custom.length > 0) {
      return custom;
    }
    return ['CPU', 'Keyboard', 'Mouse', 'Display', 'Laptop', 'Headphone', 'Webcam'];
  }, [organization?.systemSettings]);

  const isCsatEnabled = systemSettings?.enableTicketRating ?? organization?.systemSettings?.enableTicketRating ?? true;

  const mapAssetNameToType = (name: string): any => {
    const lower = name.toLowerCase();
    if (lower.includes('cpu') || lower.includes('workstation') || lower.includes('desktop')) return 'desktop';
    if (lower.includes('laptop')) return 'laptop';
    if (lower.includes('display') || lower.includes('monitor') || lower.includes('screen')) return 'monitor';
    if (lower.includes('keyboard') || lower.includes('mouse') || lower.includes('headphone') || lower.includes('webcam') || lower.includes('peripheral') || lower.includes('accessory')) return 'peripheral';
    return 'peripheral';
  };

  // Assets belonging/assigned to current user
  const myAssignedAssets = React.useMemo(() => {
    if (!currentUser || !assets) return [];
    return assets.filter(
      (a) =>
        a.assignedUserId === currentUser.id ||
        a.assignedToUserId === currentUser.id ||
        (a.assignedUserName && a.assignedUserName.toLowerCase() === currentUser.name.toLowerCase()) ||
        (a.assignedToUserName && a.assignedToUserName.toLowerCase() === currentUser.name.toLowerCase()) ||
        (a.assignedToUserEmail && a.assignedToUserEmail.toLowerCase() === currentUser.email.toLowerCase())
    );
  }, [currentUser, assets]);

  // Service Catalog requests submitted by current user with approval & fulfillment status
  const myCatalogRequests = React.useMemo(() => {
    if (!currentUser) return [];
    return tickets
      .filter(
        (t) =>
          (t.requesterId === currentUser.id ||
            t.requesterEmail?.toLowerCase() === currentUser.email?.toLowerCase()) &&
          (t.type === 'service_request' ||
            t.channel === 'service_catalog' ||
            t.subject.toLowerCase().startsWith('[service request]') ||
            t.tags?.includes('service-catalog'))
      )
      .map((t) => {
        const approval = approvals.find((a) => a.ticketId === t.id);
        const catalogItem = serviceCatalog.find(
          (c) =>
            approval?.catalogItemId === c.id ||
            t.subject.toLowerCase().includes(c.title.toLowerCase()) ||
            t.category.toLowerCase() === c.category.toLowerCase()
        );
        return {
          ticket: t,
          approval,
          catalogItem,
        };
      });
  }, [currentUser, tickets, approvals, serviceCatalog]);

  // Handle direct snip paste (Ctrl+V) into ticket description with 4 attachments & 2 MB total limit
  const handleFormPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (!file) continue;

        const currentTotal = formAttachments.reduce((acc, a) => acc + (a.size || 0), 0);
        if (formAttachments.length >= 4) {
          alert('Attachment limit reached: Maximum 4 attachments allowed per ticket.');
          return;
        }
        if (currentTotal + file.size > 2 * 1024 * 1024) {
          alert(`Attachment limit exceeded: Total attachments cannot exceed 2 MB. (Current: ${(currentTotal / (1024 * 1024)).toFixed(2)} MB)`);
          return;
        }

        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          const dataUrl = uploadEvent.target?.result as string;
          const newAttachment = {
            id: `att-portal-snip-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: `snip-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png`,
            size: file.size,
            type: file.type || 'image/png',
            url: dataUrl,
          };
          setFormAttachments((prev) => (prev.length < 4 ? [...prev, newAttachment] : prev));
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Handle file attachment upload with 4 attachments & 2 MB total limit
  const handleFormFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let currentTotal = formAttachments.reduce((acc, a) => acc + (a.size || 0), 0);
    let count = formAttachments.length;
    const acceptedFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (count >= 4) {
        alert('Attachment limit reached: Maximum 4 attachments allowed per ticket.');
        break;
      }
      if (currentTotal + file.size > 2 * 1024 * 1024) {
        alert(`Attachment limit exceeded: Total attachments cannot exceed 2 MB. (File "${file.name}" would exceed limit)`);
        break;
      }
      currentTotal += file.size;
      count++;
      acceptedFiles.push(file);
    }

    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newAtt = {
          id: `att-portal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          url: dataUrl,
        };
        setFormAttachments((prev) => (prev.length < 4 ? [...prev, newAtt] : prev));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Tickets belonging to current user
  const myTickets = currentUser
    ? tickets.filter(
        (t) => t.requesterId === currentUser.id || t.requesterEmail?.toLowerCase() === currentUser.email?.toLowerCase()
      )
    : [];

  useEffect(() => {
    if (currentUser) {
      setSubmitName(currentUser.name);
      setSubmitEmail(currentUser.email);
      api.getTeams().then((teams: any[]) => {
        const myTeam = teams.find(
          (tm) =>
            tm.id === (currentUser as any).groupId ||
            tm.id === (currentUser as any).teamId ||
            (currentUser.team && tm.name.toLowerCase() === currentUser.team.toLowerCase()) ||
            ((currentUser as any).managerId && tm.managerId === (currentUser as any).managerId)
        );
        if (myTeam?.managerEmail) {
          setManagerEmail(myTeam.managerEmail);
          setForwardToManager(true);
        }
      }).catch(() => {});
    }
  }, [currentUser]);

  // Check stored OTP verification for user email and URL tab parameter
  useEffect(() => {
    if (!requireOtp) {
      setIsOtpVerified(true);
    } else if (currentUser?.email) {
      const verified = sessionStorage.getItem(`otp_verified_${currentUser.email}`);
      if (verified === 'true') {
        setIsOtpVerified(true);
      }
    }
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'register') {
        if (!currentUser) {
          setActiveTab('register');
        } else {
          setActiveTab('home');
        }
      } else if (tabParam === 'submit' || tabParam === 'my-tickets') {
        setActiveTab(tabParam as any);
      }
    }
  }, [currentUser, requireOtp]);

  const handleSendRegOtp = async () => {
    if (!regEmail || !regEmail.includes('@')) {
      setRegError('Please enter a valid work email address.');
      return;
    }
    setRegOtpLoading(true);
    setRegError(null);
    try {
      const res = await api.sendOtp(regEmail);
      setRegOtpSent(true);
      setRegOtpPreview(res.previewCode);
    } catch (err: any) {
      setRegError(err.message || 'Failed to dispatch verification code.');
    } finally {
      setRegOtpLoading(false);
    }
  };

  const handleVerifyRegOtp = async () => {
    if (!regOtpCode || regOtpCode.length !== 6) {
      setRegError('Please enter the 6-digit confirmation code.');
      return;
    }
    setRegOtpLoading(true);
    setRegError(null);
    try {
      const res = await api.verifyOtp(regEmail, regOtpCode);
      if (res.verified) {
        setRegOtpVerified(true);
        sessionStorage.setItem(`otp_verified_${regEmail}`, 'true');
      }
    } catch (err: any) {
      setRegError('Incorrect confirmation code. Please check and try again.');
    } finally {
      setRegOtpLoading(false);
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) {
      setRegError('Please provide your name and work email.');
      return;
    }
    if (!regEmployeeCode.trim()) {
      setRegError('Employee Code is compulsory (e.g. CBPL2045).');
      return;
    }
    const hasPsk = Boolean(regPsk.trim());
    if (!hasPsk && !regOtpVerified) {
      setRegError('Please enter an Admin Pre-Shared Key (PSK) or verify your email via OTP before registering.');
      return;
    }
    if (!regPassword.trim() || regPassword.trim().length < 4) {
      setRegError('Please set a password of at least 4 characters.');
      return;
    }
    setRegSubmitting(true);
    setRegError(null);
    try {
      const res = await api.registerUser({
        name: regName.trim(),
        email: regEmail.trim(),
        employeeCode: regEmployeeCode.trim().toUpperCase(),
        title: regTitle.trim(),
        phone: regPhone.trim(),
        departmentId: regDepartment,
        organizationId: regOrgId || currentUser?.organizationId || organization?.id || 'org-lakhan-tech',
        preSharedKey: regPsk.trim() || undefined,
        password: regPassword.trim(),
      });
      const registeredUser = res.user;
      setRegSuccess(`Account created successfully! Welcome to the portal, ${registeredUser.name}.`);
      onUserRegistered?.(registeredUser);
      setSubmitEmail(registeredUser.email);
      setIsOtpVerified(true);
      setTimeout(() => {
        setActiveTab('submit');
        setRegSuccess(null);
      }, 1500);
    } catch (err: any) {
      setRegError(err.message || 'Registration failed.');
    } finally {
      setRegSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    if (!submitEmail || !submitEmail.includes('@')) {
      setOtpError('Please enter a valid email address.');
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    setOtpMessage(null);

    try {
      const res = await api.sendOtp(submitEmail);
      setOtpSent(true);
      setOtpMessage(res.message);
      setOtpPreview(res.previewCode);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to dispatch verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setOtpError('Please enter the 6-digit code received.');
      return;
    }
    setOtpLoading(true);
    setOtpError(null);

    try {
      const res = await api.verifyOtp(submitEmail, otpCode);
      if (res.verified) {
        setIsOtpVerified(true);
        setOtpMessage('✓ Email verified! You can now submit your request.');
        sessionStorage.setItem(`otp_verified_${submitEmail}`, 'true');
      }
    } catch (err: any) {
      setOtpError('Incorrect code. Please check and try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formSubject.trim()) {
      setSubmitError('Please enter a ticket subject / summary.');
      return;
    }

    if (!formDescription.trim()) {
      setSubmitError('Please provide a description of the issue.');
      return;
    }

    if (!formLocationDesk.trim()) {
      setSubmitError('Location / Desk No is mandatory for IT support requests.');
      return;
    }

    if (requireOtp && !isOtpVerified) {
      setSubmitError('Email confirmation required before ticket submission. Please verify your OTP.');
      return;
    }

    if (!submitEmail.trim()) {
      setSubmitError('Please provide a valid work email address.');
      return;
    }

    // Validate custom fields (e.g. VNC)
    for (const field of customFields) {
      if (field.visibleOnPortal && field.enabled !== false && field.required) {
        if (field.conditionalRule) {
          let cur = '';
          if (field.conditionalRule.dependsOnField === 'category') cur = formCategory;
          else if (field.conditionalRule.dependsOnField === 'priority') cur = formPriority;
          else cur = customValues[field.conditionalRule.dependsOnField] || '';

          const match =
            field.conditionalRule.operator === 'equals'
              ? cur === field.conditionalRule.value
              : cur !== field.conditionalRule.value;
          if (!match) continue;
        }

        const val = customValues[field.name];
        if (val === undefined || val === null || String(val).trim() === '') {
          setSubmitError(`Please fill out mandatory field: "${field.label || field.name}"`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const created = await onSubmitTicket({
        subject: formSubject.trim(),
        description: formDescription.trim(),
        category: formCategory,
        priority: formPriority,
        type: 'incident',
        channel: 'portal',
        locationDesk: formLocationDesk.trim(),
        requesterId: currentUser?.id,
        requesterName: submitName.trim() || currentUser?.name || submitEmail.split('@')[0],
        requesterEmail: submitEmail.trim(),
        requesterEmployeeCode: currentUser?.employeeCode,
        customFields: customValues,
        attachments: formAttachments,
        otpVerified: isOtpVerified,
        managerEmail: managerEmail.trim() || undefined,
        ccRecipients: ccRecipients ? ccRecipients.split(/[,;]/).map((s) => s.trim()).filter(Boolean) : undefined,
        forwardToManager: forwardToManager || Boolean(managerEmail.trim()),
      });

      const ticketRefId = created?.id || 'TIC-NEW';
      if (!currentUser) {
        setGuestTrackId(ticketRefId);
        setGuestTrackEmail(submitEmail.trim());
      }
      setSubmitSuccess(`✓ Your ticket [${ticketRefId}] has been successfully logged!${managerEmail ? ` (Forwarded to Manager: ${managerEmail})` : ''}`);
      setTimeout(() => {
        setSubmitSuccess(null);
        setFormSubject('');
        setFormDescription('');
        setFormLocationDesk('');
        setFormAttachments([]);
        setCustomValues({});
        setManagerEmail('');
        setCcRecipients('');
        setForwardToManager(false);
        if (currentUser) {
          setActiveTab('my-tickets');
        } else {
          setActiveTab('home');
        }
      }, 2000);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddRequesterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveName = (newAssetName.trim() || allowedRequesterAssetNames[0] || 'CPU');
    if (!newAssetManufacturer.trim()) {
      setAssetActionError('Manufacturer is mandatory (e.g. Dell, HP, Apple, Lenovo).');
      return;
    }
    if (!newAssetLocationDesk.trim()) {
      setAssetActionError('Location / Assigned Desk no. is mandatory.');
      return;
    }

    setIsSubmittingAsset(true);
    setAssetActionError(null);

    try {
      const assetPayload: Partial<Asset> = {
        name: effectiveName,
        type: newAssetType || mapAssetNameToType(effectiveName),
        manufacturer: newAssetManufacturer.trim(),
        model: newAssetModel.trim() || undefined,
        serialNumber: newAssetSerial.trim() || `TAG-${Date.now().toString().slice(-6)}`,
        locationDesk: newAssetLocationDesk.trim(),
        assignedUserId: currentUser?.id,
        assignedUserName: currentUser?.name,
        assignedToUserId: currentUser?.id,
        assignedToUserName: currentUser?.name,
        assignedToUserEmail: currentUser?.email,
        assignedDate: new Date().toISOString(),
        lifecycleStatus: 'in_service',
        status: 'in_service' as any,
        costStatus: 'Pending (Admin Verification)',
        purchaseCost: 0,
      };

      if (onCreateAsset) {
        await onCreateAsset(assetPayload);
      }
      setAssetActionMsg(`✓ Equipment "${effectiveName}" registered and marked In Service.`);
      setShowAddAssetModal(false);
      const defaultName = allowedRequesterAssetNames[0] || 'CPU';
      setNewAssetName(defaultName);
      setNewAssetType(mapAssetNameToType(defaultName));
      setNewAssetManufacturer('');
      setNewAssetModel('');
      setNewAssetSerial('');
      setNewAssetLocationDesk('');
      setAssetActionError(null);
      setTimeout(() => setAssetActionMsg(null), 3500);
    } catch (err: any) {
      setAssetActionError(err.message || 'Failed to add asset');
    } finally {
      setIsSubmittingAsset(false);
    }
  };

  const handleRemoveRequesterAsset = async (asset: Asset) => {
    if (!confirm(`Are you sure you want to remove/unassign "${asset.name}" (${asset.id}) from your portal profile?`)) {
      return;
    }
    try {
      if (onUpdateAsset) {
        await onUpdateAsset(asset.id, {
          assignedToUserId: undefined,
          assignedToUserName: undefined,
          assignedToUserEmail: undefined,
          status: 'in_stock',
        });
      } else if (onDeleteAsset) {
        await onDeleteAsset(asset.id);
      }
      setAssetActionMsg(`✓ Equipment "${asset.name}" removed from your assigned assets.`);
      setTimeout(() => setAssetActionMsg(null), 3000);
    } catch (err: any) {
      setAssetActionError(err.message || 'Failed to remove asset');
    }
  };

  const handleSurveySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingTicketId) return;
    onSubmitSurvey(ratingTicketId, selectedRating, surveyComment);
    setSurveySubmitted(true);
    setTimeout(() => {
      setRatingTicketId(null);
      setSurveySubmitted(false);
      setSurveyComment('');
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Portal Hero Header */}
      <div className="relative overflow-hidden rounded-2xl neu-flat p-6 sm:p-8 border border-slate-200/90 dark:border-white/10 bg-gradient-to-r from-sky-50/80 via-white to-indigo-50/80 dark:from-slate-900/95 dark:via-slate-900/90 dark:to-cyan-950/40 text-center sm:text-left shadow-sm">
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-mono uppercase bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30 font-bold inline-block">
              IT Self-Service Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              How can IT support assist you today, <span className="text-cyan-600 dark:text-cyan-400 font-mono">{currentUser ? `[${currentUser.employeeCode || (currentUser.name.toLowerCase().includes('lakhan') ? 'CBPL2045' : 'CBPL1010')}]${currentUser.name}` : 'there'}</span>?
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Submit support tickets, request hardware &amp; software, track open requests, or browse step-by-step guides.
            </p>
          </div>

          <div className="shrink-0 flex flex-col gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('submit')}
              className="neu-btn-primary px-5 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer text-center whitespace-nowrap"
            >
              {currentUser ? '+ Submit a Support Ticket' : '+ Submit Guest Ticket'}
            </button>
            {currentUser && (
              <button
                onClick={() => setActiveTab('my-tickets')}
                className="neu-btn px-5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-xl cursor-pointer text-center transition-all hover:text-cyan-700 dark:hover:text-cyan-300"
              >
                View My Requests ({myTickets.length})
              </button>
            )}
            {!currentUser && onOpenLogin && (
              <button
                onClick={() => onOpenLogin('user')}
                className="neu-btn px-5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-xl cursor-pointer text-center transition-all hover:text-cyan-700 dark:hover:text-cyan-300"
              >
                Employee Sign In &rarr;
              </button>
            )}
            {currentUser && (
              <button
                onClick={() => setActiveTab('my-assets')}
                className="neu-btn px-5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-xl cursor-pointer text-center transition-all hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center justify-center gap-1.5"
              >
                <Laptop className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>My Assigned Equipment ({myAssignedAssets.length})</span>
              </button>
            )}
            {currentUser && (
              <button
                onClick={() => setActiveTab('catalog-status')}
                className="neu-btn px-5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-xl cursor-pointer text-center transition-all hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center justify-center gap-1.5"
              >
                <Grid className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Service Requests ({myCatalogRequests.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="neu-flat p-1.5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('home')}
          className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'home'
              ? 'neu-btn-primary shadow-xs'
              : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
          }`}
        >
          {!currentUser ? 'Service Portal Guest' : 'Service Portal'}
        </button>
        <button
          onClick={() => setActiveTab('kb')}
          className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'kb'
              ? 'neu-btn-primary shadow-xs'
              : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Knowledge Base
        </button>
        {!currentUser ? (
          <>
            <button
              onClick={() => setActiveTab('submit')}
              className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'submit'
                  ? 'neu-btn-primary shadow-xs'
                  : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" /> Submit Guest Ticket
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'register'
                  ? 'neu-btn-primary shadow-xs'
                  : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Employee Registration
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('submit')}
              className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'submit'
                  ? 'neu-btn-primary shadow-xs'
                  : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" /> Submit Support Ticket
            </button>
            <button
              onClick={() => setActiveTab('my-tickets')}
              className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'my-tickets'
                  ? 'neu-btn-primary shadow-xs'
                  : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
              }`}
            >
              My Tickets ({myTickets.length})
            </button>
            <button
              onClick={() => setActiveTab('my-assets')}
              className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'my-assets'
                  ? 'neu-btn-primary shadow-xs'
                  : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" /> My Assigned Assets ({myAssignedAssets.length})
            </button>
            <button
              onClick={() => setActiveTab('catalog-status')}
              className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'catalog-status'
                  ? 'neu-btn-primary shadow-xs'
                  : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
              }`}
            >
              <Grid className="w-3.5 h-3.5 text-indigo-500" /> Service Requests &amp; Status ({myCatalogRequests.length})
            </button>
          </>
        )}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'home' && (
        <div className="space-y-6">
          {/* Feature Service Tiles: 2 tiles for guests, 4 tiles for logged-in requesters */}
          {!currentUser ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setActiveTab('submit')}
                className="neu-card p-6 rounded-2xl border border-cyan-300/80 dark:border-cyan-500/30 hover:border-cyan-500 cursor-pointer space-y-3 group bg-gradient-to-br from-cyan-50/60 to-transparent dark:from-cyan-950/20"
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Submit Guest Ticket</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1">
                    No login required. Submit an IT incident, hardware issue, or urgent support request directly.
                  </p>
                </div>
                <div className="text-xs font-bold text-cyan-700 dark:text-cyan-400 flex items-center gap-1 pt-1">
                  Create Guest Ticket &rarr;
                </div>
              </div>

              <div
                onClick={() => setActiveTab('register')}
                className="neu-card p-6 rounded-2xl border border-violet-300/80 dark:border-violet-500/30 hover:border-violet-500 cursor-pointer space-y-3 group bg-gradient-to-br from-violet-50/60 to-transparent dark:from-violet-950/20"
              >
                <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Employee Self-Registration</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1">
                    Register an official user account instantly with an Admin Pre-Shared Key (PSK) or OTP verification.
                  </p>
                </div>
                <div className="text-xs font-bold text-violet-700 dark:text-violet-400 flex items-center gap-1 pt-1">
                  Register Account &rarr;
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                onClick={() => setActiveTab('submit')}
                className="neu-card p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 hover:border-cyan-500/50 cursor-pointer space-y-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Report an Issue</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Lodge a bug, computer failure, network glitch, or urgent outage.
                </p>
              </div>

              <div
                onClick={onNavigateToCatalog}
                className="neu-card p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 hover:border-indigo-500/50 cursor-pointer space-y-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Grid className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Service Catalog</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Order a laptop, software license, AWS role, or VPN access.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('my-tickets')}
                className="neu-card p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 hover:border-emerald-500/50 cursor-pointer space-y-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Track Requests</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Check status of your open tickets and reply directly to IT staff.
                </p>
              </div>

              <div
                onClick={onNavigateToKb}
                className="neu-card p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 hover:border-amber-500/50 cursor-pointer space-y-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Browse Guides</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Search verified solutions for VPN, passwords, and Outlook issues.
                </p>
              </div>
            </div>
          )}

          {/* Quick FAQ / Popular Articles */}
          <div className="neu-flat p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Common IT Support Questions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {knowledgeArticles.slice(0, 4).map((art) => (
                <div
                  key={art.id}
                  onClick={onNavigateToKb}
                  className="p-3.5 rounded-xl neu-card hover:bg-cyan-50/70 dark:hover:bg-white/5 border border-slate-200/80 dark:border-white/5 cursor-pointer transition-colors space-y-1"
                >
                  <div className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1 hover:text-cyan-600 dark:hover:text-cyan-300">
                    {art.title}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{art.category}</span>
                    <span>·</span>
                    <span>{art.helpfulCount} people found this helpful</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Tab 2: Submit Support Ticket with OTP Confirmation Flow */}
      {activeTab === 'submit' && (
        <div className="neu-flat p-6 sm:p-8 rounded-2xl border border-slate-200/90 dark:border-white/10 max-w-2xl mx-auto space-y-6">
          <div className="space-y-1 pb-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                Submit IT Service Request
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {requireOtp
                  ? 'Please confirm your work email address via the 6-digit OTP code before submitting.'
                  : 'Fast-track ticket creation enabled. You can submit directly without login or OTP.'}
              </p>
            </div>
            {!currentUser && onOpenLogin && (
              <button
                type="button"
                onClick={() => onOpenLogin('user')}
                className="neu-btn px-3 py-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-400 rounded-xl hover:text-cyan-800 transition-all cursor-pointer whitespace-nowrap"
              >
                Sign In Instead
              </button>
            )}
          </div>

          {submitSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              {submitSuccess}
            </div>
          )}

          {/* Requester Information */}
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                Requester Details
              </span>
              {!requireOtp && (
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800/60">
                  OTP Not Required
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Miller"
                  value={submitName}
                  onChange={(e) => setSubmitName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Work Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. david.miller@company.com"
                  value={submitEmail}
                  onChange={(e) => {
                    setSubmitEmail(e.target.value);
                    if (requireOtp) setOtpSent(false);
                  }}
                  className="w-full px-3.5 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Conditional OTP Flow if requireOtp is enabled */}
          {requireOtp && (
            <div className="space-y-3">
              {!isOtpVerified ? (
                <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                    <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Security Check: OTP Verification Required
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    Superadmin has enabled OTP protection. A 6-digit confirmation code will be dispatched to your email.
                  </p>

                  {otpError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 text-xs font-semibold">
                      {otpError}
                    </div>
                  )}

                  {otpMessage && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs space-y-1 font-medium">
                      <div>{otpMessage}</div>
                      {otpPreview && (
                        <div className="font-mono font-bold text-amber-800 dark:text-amber-300 text-xs">
                          [Demo / Test OTP Code: {otpPreview}]
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {!otpSent ? (
                      <button
                        type="button"
                        disabled={otpLoading || !submitEmail.includes('@')}
                        onClick={handleSendOtp}
                        className="neu-btn-primary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap disabled:opacity-50"
                      >
                        {otpLoading ? 'Dispatching...' : 'Send 6-Digit OTP'}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="Enter OTP"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className="w-32 px-3 py-2 text-xs neu-input border-amber-400 rounded-xl text-amber-800 dark:text-amber-300 font-mono tracking-widest text-center font-bold"
                        />
                        <button
                          type="button"
                          disabled={otpLoading}
                          onClick={handleVerifyOtp}
                          className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl cursor-pointer shadow-sm"
                        >
                          {otpLoading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Email OTP Confirmed &amp; Verified</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpVerified(false);
                      setOtpSent(false);
                      setOtpCode('');
                    }}
                    className="text-[11px] text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer font-bold"
                  >
                    Re-verify
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Ticket Form Content */}
          {requireOtp && !isOtpVerified ? (
            <div className="p-8 rounded-2xl neu-card text-center space-y-3 border border-slate-200/90 dark:border-white/10">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400">
                <Lock className="w-6 h-6 text-amber-500 dark:text-amber-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ticket Details Form Locked</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium max-w-md mx-auto">
                Please verify your work email address with the 6-digit OTP code above. Once verified, the full ticket form and dynamic fields will automatically unlock for submission.
              </p>
            </div>
          ) : (
            <form noValidate onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Category *</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs neu-select rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
                >
                  <option value="Software & Cloud Apps">Software &amp; Cloud Apps</option>
                  <option value="Hardware & Workstations">Hardware &amp; Workstations</option>
                  <option value="Network & Connectivity">Network &amp; Connectivity</option>
                  <option value="Security & Access">Security &amp; Access</option>
                  <option value="User Accounts & Access">User Accounts &amp; Access</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Urgency / Priority *</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value)}
                  className="w-full px-3 py-2 text-xs neu-select rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
                >
                  <option value="low">Low (General Query)</option>
                  <option value="normal">Normal (Routine Incident)</option>
                  <option value="high">High (Impacting Daily Work)</option>
                  <option value="critical">Critical (Complete Workstation/Service Outage)</option>
                </select>
              </div>
            </div>

            {/* Mandatory Location / Desk No */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Location / Desk No *</span>
                </span>
                <span className="text-[10px] text-cyan-600 font-bold">Mandatory</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Building A - Floor 2 - Desk #42 / Remote Home Office"
                value={formLocationDesk}
                onChange={(e) => setFormLocationDesk(e.target.value)}
                className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 font-medium focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Subject / Summary *</label>
              <input
                type="text"
                required
                placeholder="e.g. Outlook indexing freeze or Wi-Fi certificate error"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 font-medium focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Problem Description * <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-normal ml-2">(Ctrl+V to paste snip / screenshots directly)</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="Please describe what happened, steps to reproduce, and any error message... (Direct screenshot paste supported: press Ctrl+V to attach)"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                onPaste={handleFormPaste}
                className="w-full p-3 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 font-medium focus:outline-none"
              />
            </div>

            {/* Attachments & Direct Pasted Snips */}
            <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-dashed border-cyan-500/40 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Attachments &amp; Snip Screenshots ({formAttachments.length})
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Paste screenshots with <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 font-mono font-bold text-[10px]">Ctrl+V</kbd> or upload files
                    </span>
                  </div>
                </div>

                <label className="neu-btn px-3 py-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-300 rounded-lg flex items-center gap-1.5 cursor-pointer hover:bg-cyan-50 dark:hover:bg-cyan-950/40 self-start sm:self-auto shrink-0 shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Attach File / Snip</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFormFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {formAttachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                  {formAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs shadow-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {att.type.startsWith('image/') || att.url.startsWith('data:image/') ? (
                          <div className="w-8 h-8 rounded bg-slate-900 overflow-hidden shrink-0">
                            <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <FileText className="w-4 h-4 text-cyan-600 shrink-0" />
                        )}
                        <div className="truncate">
                          <span className="font-semibold block truncate" title={att.name}>{att.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{Math.round(att.size / 1024)} KB</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        title="Remove attachment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dynamic Custom Fields Marked Visible to Portal */}
            {customFields.filter((f) => f.visibleOnPortal && f.enabled !== false).length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400">
                  Additional Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {customFields
                    .filter((f) => f.visibleOnPortal && f.enabled !== false)
                    .map((field) => {
                      if (field.conditionalRule) {
                        let cur = '';
                        if (field.conditionalRule.dependsOnField === 'category') cur = formCategory;
                        else if (field.conditionalRule.dependsOnField === 'priority') cur = formPriority;
                        else cur = customValues[field.conditionalRule.dependsOnField] || '';

                        const match =
                          field.conditionalRule.operator === 'equals'
                            ? cur === field.conditionalRule.value
                            : cur !== field.conditionalRule.value;
                        if (!match) return null;
                      }

                      return (
                        <div key={field.id}>
                          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                            <span>
                              {field.label} {field.required ? <span className="text-rose-500 font-bold">*</span> : ''}
                            </span>
                            {field.required && (
                              <span className="text-[10px] text-rose-500 font-semibold">Required</span>
                            )}
                          </label>

                          {field.type === 'select' ? (
                            <select
                              value={customValues[field.name] || ''}
                              onChange={(e) =>
                                setCustomValues({ ...customValues, [field.name]: e.target.value })
                              }
                              className="w-full px-3 py-2 text-xs neu-select rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
                            >
                              <option value="">Choose an option...</option>
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
                              value={customValues[field.name] || ''}
                              onChange={(e) =>
                                setCustomValues({ ...customValues, [field.name]: e.target.value })
                              }
                              className="w-full p-2.5 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 font-medium focus:outline-none"
                            />
                          ) : field.type === 'checkbox' ? (
                            <label className="flex items-center gap-2 p-2.5 rounded-xl neu-card border border-slate-200 dark:border-white/10 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!customValues[field.name]}
                                onChange={(e) =>
                                  setCustomValues({ ...customValues, [field.name]: e.target.checked })
                                }
                                className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                              />
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                {field.placeholder || `Enable / Confirm ${field.label}`}
                              </span>
                            </label>
                          ) : (
                            <input
                              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                              placeholder={field.placeholder || field.description || `Enter ${field.label}...`}
                              value={customValues[field.name] || ''}
                              onChange={(e) =>
                                setCustomValues({ ...customValues, [field.name]: e.target.value })
                              }
                              className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 font-medium focus:outline-none"
                            />
                          )}
                          {field.description && (
                            <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium mt-0.5">{field.description}</div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Forward to Manager & CC Option (User Request) */}
            <div className="p-4 rounded-xl neu-card bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Forward className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Forward to Manager &amp; CC Option
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forwardToManager}
                    onChange={(e) => setForwardToManager(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                  />
                  <span>Forward to Manager</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Manager Email {forwardToManager ? <span className="text-cyan-600 font-bold">*</span> : ''}</span>
                    <span className="text-[10px] text-slate-500 font-medium">Auto-forward</span>
                  </label>
                  <input
                    type="email"
                    placeholder="manager.email@company.com"
                    value={managerEmail}
                    onChange={(e) => setManagerEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 font-medium focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Your manager will receive a real-time copy and updates on this ticket.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Additional CC Email(s)</span>
                    <span className="text-[10px] text-slate-500 font-medium">Comma-separated</span>
                  </label>
                  <input
                    type="text"
                    placeholder="teammate@company.com, lead@company.com"
                    value={ccRecipients}
                    onChange={(e) => setCcRecipients(e.target.value)}
                    className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 font-medium focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    CC recipients will receive notification copies and can reply by email.
                  </p>
                </div>
              </div>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-end">
              <button
                type="submit"
                disabled={!isOtpVerified || submitting}
                className="neu-btn-primary px-6 py-2.5 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting Request...' : 'Submit Support Ticket'}
              </button>
            </div>
          </form>
        )}
        </div>
      )}

      {/* Tab 3: My Tickets List & Guest Ticket Lookup */}
      {activeTab === 'my-tickets' && (
        <div className="space-y-4">
          {!currentUser ? (
            <div className="neu-card p-12 rounded-2xl border border-slate-200/90 dark:border-white/10 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto shadow-xs">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Employee Authentication Required
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                  To view your submitted support tickets and track request status, please sign in with your employee account credentials.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                {onOpenLogin && (
                  <button
                    onClick={() => onOpenLogin('user')}
                    className="neu-btn-primary px-5 py-2.5 text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    Employee Sign In
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('submit')}
                  className="neu-btn px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
                >
                  Submit Guest Ticket
                </button>
              </div>
            </div>
          ) : (
            <div className="neu-card rounded-2xl border border-slate-200/90 dark:border-white/10 divide-y divide-slate-200/90 dark:divide-white/5 overflow-hidden">
              {myTickets.length === 0 ? (
                <div className="p-12 text-center text-slate-600 dark:text-slate-400 font-medium space-y-3">
                  <p>You have not submitted any tickets yet.</p>
                  <button
                    onClick={() => setActiveTab('submit')}
                    className="neu-btn-primary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Create Your First Ticket
                  </button>
                </div>
              ) : (
              myTickets.map((t) => (
                <div
                  key={t.id}
                  className="p-4 hover:bg-cyan-50/70 dark:hover:bg-white/5 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1 cursor-pointer" onClick={() => onSelectTicket(t.id)}>
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="font-mono text-cyan-700 dark:text-cyan-400 font-bold tabular-nums">{t.id}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">{t.category}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px] font-medium">
                        Updated {new Date(t.updatedAt).toLocaleDateString()}
                      </span>
                      {t.attachments && t.attachments.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-mono text-[10px] font-bold border border-cyan-300 dark:border-cyan-800">
                          <Paperclip className="w-3 h-3" /> {t.attachments.length} attachment(s)
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{t.subject}</div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 text-[11px] font-mono">
                      <span className="font-extrabold text-cyan-800 dark:text-cyan-300">
                        [{t.requesterEmployeeCode || currentUser?.employeeCode || (t.requesterName?.toLowerCase().includes('lakhan') ? 'CBPL2045' : 'CBPL1001')}] {t.requesterName}
                      </span>
                      <span className="hidden sm:inline text-slate-400">•</span>
                      <span className="text-slate-500 dark:text-slate-400 font-medium">{t.requesterEmail}</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">{t.description}</div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="capitalize text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-200">
                      {t.status.replace(/_/g, ' ')}
                    </span>

                    {/* CSAT Rating Option on User Side for all tickets (Controlled by CSAT Setting Toggle & 1 Ticket 1 Time Enforced) */}
                    {isCsatEnabled && (
                      t.satisfactionRating ? (
                        <div
                          className="px-2.5 py-1 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/40 rounded-lg flex items-center gap-1.5 font-bold cursor-default shadow-xs"
                          title={`Rating: ${t.satisfactionRating.rating}/5 stars. Submitted 1x (Locked).`}
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <div className="flex text-amber-500 text-xs">
                            {'★'.repeat(t.satisfactionRating.rating)}
                          </div>
                          <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                            {t.satisfactionRating.rating}/5 (Rated 1x)
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRatingTicketId(t.id);
                            setSelectedRating(5);
                            setSurveyComment('');
                            setSurveySubmitted(false);
                          }}
                          className="px-3 py-1 text-xs bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-500/30 border border-amber-300 dark:border-amber-500/40 rounded-lg flex items-center gap-1.5 transition-all font-bold cursor-pointer shadow-xs hover:scale-105"
                          title="Rate your IT support experience (1 rating per ticket)"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>Rate Support</span>
                        </button>
                      )
                    )}

                    <button
                      onClick={() => onSelectTicket(t.id)}
                      className="neu-btn px-3 py-1.5 text-xs text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 font-bold rounded-lg cursor-pointer"
                    >
                      View Details &rarr;
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          )}
        </div>
      )}

      {/* Tab: My Assigned Assets (Point 4) */}
      {activeTab === 'my-assets' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Header & Action Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 neu-flat rounded-2xl border border-slate-200/90 dark:border-white/10">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Laptop className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                My Assigned Hardware Assets &amp; Equipment
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Hardware equipment, laptops, workstations, monitors, and peripherals registered and assigned to your employee profile.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {allowRequesterAssetSelfService ? (
                <button
                  type="button"
                  onClick={() => {
                    const defaultName = allowedRequesterAssetNames[0] || 'CPU';
                    setNewAssetName(defaultName);
                    setNewAssetType(mapAssetNameToType(defaultName));
                    setNewAssetManufacturer('');
                    setNewAssetModel('');
                    setNewAssetSerial('');
                    setNewAssetLocationDesk('');
                    setAssetActionError(null);
                    setShowAddAssetModal(true);
                  }}
                  className="neu-btn-primary px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Register new assigned hardware or peripheral"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register Equipment</span>
                </button>
              ) : (
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800/40">
                  Self-Service Disabled by Admin
                </span>
              )}
            </div>
          </div>

          {assetActionMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{assetActionMsg}</span>
            </div>
          )}

          {!allowRequesterAssetSelfService && (
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400 font-medium">
              Self-service adding or removing assets is currently turned off by the Administrator or Asset Manager. You can still view all your assigned equipment below. To request changes or returns, submit a support ticket.
            </div>
          )}

          {!currentUser ? (
            <div className="neu-card p-10 text-center rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/40 flex items-center justify-center mx-auto text-cyan-600">
                <Laptop className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sign In to View Assigned Assets</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Please sign in with your employee account to view and manage company equipment and hardware assigned to you.
                </p>
              </div>
              {onOpenLogin && (
                <button
                  type="button"
                  onClick={() => onOpenLogin('user')}
                  className="neu-btn-primary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Sign In to Employee Portal
                </button>
              )}
            </div>
          ) : myAssignedAssets.length === 0 ? (
            <div className="neu-card p-10 text-center rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/40 flex items-center justify-center mx-auto text-cyan-600">
                <Laptop className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Hardware Assets Assigned</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  There are currently no company workstations, laptops, or equipment registered under your account.
                </p>
              </div>
              {allowRequesterAssetSelfService && (
                <button
                  type="button"
                  onClick={() => {
                    const defaultName = allowedRequesterAssetNames[0] || 'CPU';
                    setNewAssetName(defaultName);
                    setNewAssetType(mapAssetNameToType(defaultName));
                    setNewAssetManufacturer('');
                    setNewAssetModel('');
                    setNewAssetSerial('');
                    setNewAssetLocationDesk('');
                    setAssetActionError(null);
                    setShowAddAssetModal(true);
                  }}
                  className="neu-btn-primary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
                >
                  + Add Your First Asset
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAssignedAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="neu-card p-4 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 font-bold uppercase border border-cyan-300 dark:border-cyan-800/40">
                        {asset.type}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300">
                        {asset.lifecycleStatus === 'in_service' || asset.status === 'in_service' || !asset.lifecycleStatus ? 'In service' : (asset.lifecycleStatus || asset.status)}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{asset.name}</h3>

                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      {asset.manufacturer && (
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Manufacturer:</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-200">{asset.manufacturer}</span>
                        </div>
                      )}
                      {asset.model && (
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Model:</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-200">{asset.model}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Service Tag / ID:</span>
                        <span className="font-mono text-slate-900 dark:text-slate-200">{asset.serialNumber || 'Unassigned Tag'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-cyan-600" />
                          <span>Location / Desk No:</span>
                        </span>
                        <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400">
                          {asset.locationDesk || 'Assigned Desk'}
                        </span>
                      </div>
                      {asset.assignedDate && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-white/5">
                          <span>Assigned On:</span>
                          <span>{new Date(asset.assignedDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {allowRequesterAssetSelfService && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveRequesterAsset(asset)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-500 flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Remove / Return this equipment from your assigned profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Equipment</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Asset Modal for Requester (Strict 6 Fields + Admin Customization) */}
          {showAddAssetModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="glass-modal max-w-lg w-full p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add Requester Asset (Assigned Equipment)</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddAssetModal(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-900/50 text-[11px] text-cyan-800 dark:text-cyan-300">
                  <span className="font-bold">Automated Lifecycle:</span> This asset will be marked as <span className="font-bold text-emerald-600 dark:text-emerald-400">In service</span> and assigned to your profile. Asset cost is set to <span className="font-bold text-amber-600 dark:text-amber-400">Pending</span> for admin verification.
                </div>

                {assetActionError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 text-rose-700 text-xs font-medium">
                    {assetActionError}
                  </div>
                )}

                <form onSubmit={handleAddRequesterAsset} className="space-y-3.5">
                  {/* Field 1: Asset Name * (Dropdown select) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                      <span>1. Asset Name *</span>
                      <span className="text-[10px] text-cyan-600 font-semibold">Dropdown Selection</span>
                    </label>
                    <select
                      required
                      value={newAssetName || allowedRequesterAssetNames[0] || 'CPU'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewAssetName(val);
                        setNewAssetType(mapAssetNameToType(val));
                      }}
                      className="w-full px-3 py-2 text-xs neu-select rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
                    >
                      {allowedRequesterAssetNames.map((nameOpt) => (
                        <option key={nameOpt} value={nameOpt}>
                          {nameOpt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Field 2: Type * (Dropdown) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        2. Type *
                      </label>
                      <select
                        required
                        value={newAssetType}
                        onChange={(e) => setNewAssetType(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs neu-select rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
                      >
                        <option value="desktop">Desktop / Workstation</option>
                        <option value="laptop">Laptop</option>
                        <option value="monitor">Display / Monitor</option>
                        <option value="peripheral">Peripheral / Accessory</option>
                        <option value="mobile_tablet">Mobile / Tablet</option>
                        <option value="networking">Network Device</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Field 3: Manufacturer * */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        3. Manufacturer *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dell, HP, Apple, Logitech, Lenovo"
                        value={newAssetManufacturer}
                        onChange={(e) => setNewAssetManufacturer(e.target.value)}
                        className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Field 4: Model Specification (not compulsory) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                        <span>4. Model Specification</span>
                        <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. OptiPlex 7090, MX Master 3, ThinkPad"
                        value={newAssetModel}
                        onChange={(e) => setNewAssetModel(e.target.value)}
                        className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                      />
                    </div>

                    {/* Field 5: Service tag (not compulsory) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                        <span>5. Service Tag / Serial</span>
                        <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ST-78213 or auto-generated"
                        value={newAssetSerial}
                        onChange={(e) => setNewAssetSerial(e.target.value)}
                        className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-mono"
                      />
                    </div>
                  </div>

                  {/* Field 6: Location / Assigned Desk no. * */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                        <span>6. Location / Assigned Desk no. *</span>
                      </span>
                      <span className="text-[10px] text-cyan-600 font-bold">Mandatory</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Building A - Floor 3 - Desk #42 / Remote Home Office"
                      value={newAssetLocationDesk}
                      onChange={(e) => setNewAssetLocationDesk(e.target.value)}
                      className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                    />
                  </div>

                  {/* Note about admin fields */}
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] text-slate-500 dark:text-slate-400">
                    ℹ️ <span className="font-semibold text-slate-700 dark:text-slate-300">Admin Managed Fields:</span> Purchase Cost, Depreciation, Warranty, and Compliance Audits are maintained by Asset Administrators.
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowAddAssetModal(false)}
                      className="neu-btn px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingAsset}
                      className="neu-btn-primary px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isSubmittingAsset ? (
                        <span>Saving Equipment...</span>
                      ) : (
                        <span>Save &amp; Register Equipment</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Service Catalog Requests & Approval Status (Requester Service Catalog Status) */}
      {activeTab === 'catalog-status' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Header & Controls */}
          <div className="neu-flat p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                  <Grid className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Service Catalog Requests &amp; Fulfillment Status
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Live approval progress, manager reviews, hardware provisioning, and fulfillment milestones for your requests.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onNavigateToCatalog}
                className="neu-btn-primary px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Request New Catalog Item</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="neu-card p-3 rounded-xl border border-slate-200/80 dark:border-white/10">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Total Requests</div>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {myCatalogRequests.length}
              </div>
            </div>
            <div className="neu-card p-3 rounded-xl border border-amber-300/80 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/20">
              <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Awaiting Approval</div>
              <div className="text-xl font-black font-mono text-amber-700 dark:text-amber-300 mt-1">
                {myCatalogRequests.filter((r) => r.ticket.status === 'waiting_approval' || r.approval?.status === 'pending').length}
              </div>
            </div>
            <div className="neu-card p-3 rounded-xl border border-cyan-300/80 dark:border-cyan-800/40 bg-cyan-50/30 dark:bg-cyan-950/20">
              <div className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 uppercase">In Fulfillment</div>
              <div className="text-xl font-black font-mono text-cyan-700 dark:text-cyan-300 mt-1">
                {myCatalogRequests.filter((r) => (r.approval?.status === 'approved' || !r.ticket.status.includes('waiting')) && r.ticket.status !== 'resolved' && r.ticket.status !== 'closed' && r.ticket.status !== 'cancelled').length}
              </div>
            </div>
            <div className="neu-card p-3 rounded-xl border border-emerald-300/80 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-950/20">
              <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Fulfilled &amp; Closed</div>
              <div className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-300 mt-1">
                {myCatalogRequests.filter((r) => r.ticket.status === 'resolved' || r.ticket.status === 'closed').length}
              </div>
            </div>
          </div>

          {/* Requests List */}
          {!currentUser ? (
            <div className="neu-card p-10 text-center rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center mx-auto text-indigo-600">
                <Grid className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sign In to Track Service Requests</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Sign in with your employee portal credentials to review approval status, manager endorsements, and equipment provisioning.
              </p>
              {onOpenLogin && (
                <button
                  type="button"
                  onClick={() => onOpenLogin('user')}
                  className="neu-btn-primary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Sign In to Employee Portal
                </button>
              )}
            </div>
          ) : myCatalogRequests.length === 0 ? (
            <div className="neu-card p-10 text-center rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center mx-auto text-indigo-600">
                <Grid className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Service Requests Found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  You haven't requested any items from the IT Service Catalog yet. Browse the catalog to order workstations, accessories, software licenses, or system access.
                </p>
              </div>
              <button
                type="button"
                onClick={onNavigateToCatalog}
                className="neu-btn-primary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
              >
                Browse Service Catalog &rarr;
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myCatalogRequests.map(({ ticket, approval, catalogItem }) => {
                const isWaitingApproval = ticket.status === 'waiting_approval' || approval?.status === 'pending';
                const isApproved = approval?.status === 'approved' || (!ticket.status.includes('waiting') && approval?.status !== 'rejected');
                const isRejected = approval?.status === 'rejected' || ticket.status === 'cancelled';
                const isFulfilled = ticket.status === 'resolved' || ticket.status === 'closed';

                return (
                  <div
                    key={ticket.id}
                    className="neu-card p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-4 shadow-xs hover:border-indigo-500/40 transition-colors"
                  >
                    {/* Top Row: Title, ID & Overall Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200 dark:border-white/10">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800/40">
                            {ticket.id}
                          </span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-bold uppercase">
                            {ticket.category}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Requested on {new Date(ticket.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {ticket.subject.replace(/^\[Service Request\]:\s*/i, '')}
                        </h3>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        {isWaitingApproval ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Awaiting Manager Approval</span>
                          </span>
                        ) : isRejected ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Request Rejected</span>
                          </span>
                        ) : isFulfilled ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Fulfilled &amp; Closed</span>
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-300 flex items-center gap-1.5">
                            <RotateCw className="w-3.5 h-3.5 text-cyan-600 animate-spin" />
                            <span>Approved · In Fulfillment</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Multi-step Visual Workflow Tracker */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Workflow &amp; Approval Milestones
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Step 1: Lodged */}
                        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800/40 space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>1. Request Submitted</span>
                            </span>
                            <span className="text-[10px] font-mono text-emerald-600">✓ Done</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Submitted by {ticket.requesterName}
                          </p>
                        </div>

                        {/* Step 2: Manager Review */}
                        <div
                          className={`p-3 rounded-lg bg-white dark:bg-slate-900 border space-y-1 ${
                            isRejected
                              ? 'border-rose-300 dark:border-rose-800/50'
                              : isWaitingApproval
                              ? 'border-amber-300 dark:border-amber-800/50 ring-1 ring-amber-400/40'
                              : 'border-emerald-300 dark:border-emerald-800/40'
                          }`}
                        >
                          <div
                            className={`flex items-center justify-between text-xs font-bold ${
                              isRejected
                                ? 'text-rose-700 dark:text-rose-400'
                                : isWaitingApproval
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              {isRejected ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              ) : isWaitingApproval ? (
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                              <span>2. Manager Approval</span>
                            </span>
                            <span className="text-[10px] font-mono font-bold">
                              {isRejected ? '✕ Rejected' : isWaitingApproval ? '⏳ In Review' : '✓ Approved'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {approval?.approverName
                              ? `Reviewed by ${approval.approverName}`
                              : approval?.approverRole
                              ? `Assigned to ${approval.approverRole.toUpperCase()}`
                              : 'Manager Endorsement'}
                            {approval?.notes ? ` • "${approval.notes}"` : ''}
                          </p>
                        </div>

                        {/* Step 3: Fulfillment */}
                        <div
                          className={`p-3 rounded-lg bg-white dark:bg-slate-900 border space-y-1 ${
                            isFulfilled
                              ? 'border-emerald-300 dark:border-emerald-800/40'
                              : isApproved && !isWaitingApproval && !isRejected
                              ? 'border-cyan-300 dark:border-cyan-800/50 ring-1 ring-cyan-400/40'
                              : 'border-slate-200 dark:border-white/10 opacity-70'
                          }`}
                        >
                          <div
                            className={`flex items-center justify-between text-xs font-bold ${
                              isFulfilled
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : isApproved && !isWaitingApproval && !isRejected
                                ? 'text-cyan-700 dark:text-cyan-400'
                                : 'text-slate-500'
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              {isFulfilled ? (
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <RotateCw className={`w-3.5 h-3.5 ${isApproved && !isWaitingApproval && !isRejected ? 'animate-spin text-cyan-600' : ''}`} />
                              )}
                              <span>3. IT Provisioning</span>
                            </span>
                            <span className="text-[10px] font-mono font-bold">
                              {isFulfilled ? '✓ Delivered' : isApproved && !isWaitingApproval && !isRejected ? '⚙ Active' : 'Waiting'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {ticket.assignedTechnicianName ? `Technician: ${ticket.assignedTechnicianName}` : 'Workplace IT Support Team'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Form Specification parameters */}
                    {ticket.customFields && Object.keys(ticket.customFields).length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          Order Specifications &amp; Requirements:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(ticket.customFields).map(([k, v]) => (
                            <div
                              key={k}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono"
                            >
                              <span className="text-slate-500 dark:text-slate-400 capitalize">{k}: </span>
                              <strong className="text-slate-900 dark:text-white font-bold">{String(v)}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bottom Action Footer */}
                    <div className="pt-2 flex items-center justify-between">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {catalogItem?.estimatedHours ? (
                          <span>Estimated Turnaround: ~{catalogItem.estimatedHours} hours</span>
                        ) : (
                          <span>SLA Target: Standard SLA</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectTicket(ticket.id)}
                        className="neu-btn px-4 py-1.5 text-xs text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 font-bold rounded-lg cursor-pointer"
                      >
                        View Ticket &amp; Comments &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Knowledge Base View */}
      {activeTab === 'kb' && (
        <div className="space-y-4">
          <div className="neu-flat p-3.5 rounded-2xl border border-slate-200/90 dark:border-white/10">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-cyan-600 dark:text-cyan-400" />
              <input
                type="text"
                placeholder="Search self-help troubleshooting guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 font-medium focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {knowledgeArticles
              .filter(
                (a) =>
                  !searchQuery ||
                  a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  a.content.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((art) => (
                <div key={art.id} className="neu-card p-5 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-2">
                  <div className="text-[11px] font-mono text-cyan-700 dark:text-cyan-400 font-bold uppercase">{art.category}</div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{art.title}</h3>
                  <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap line-clamp-3 leading-relaxed">
                    {art.content}
                  </div>
                  <div className="pt-2 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between border-t border-slate-200/80 dark:border-white/5 font-medium">
                    <span>Helpful score: {art.helpfulCount}</span>
                    <button
                      onClick={onNavigateToKb}
                      className="text-cyan-700 dark:text-cyan-400 hover:underline font-bold cursor-pointer"
                    >
                      Read full article
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tab 5: User Self-Registration with OTP Verification (Guests only) */}
      {!currentUser && activeTab === 'register' && (
        <div className="neu-flat p-6 sm:p-8 rounded-2xl border border-slate-200/90 dark:border-white/10 max-w-xl mx-auto space-y-6">
          <div className="space-y-1 pb-4 border-b border-slate-200 dark:border-white/10">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              Employee Self-Registration Portal
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Register yourself to submit and track IT support tickets. Email verification is mandatory via a 6-digit OTP code.
            </p>
          </div>

          {regSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              {regSuccess}
            </div>
          )}

          {regError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 text-xs font-semibold">
              {regError}
            </div>
          )}

          {/* STEP 1: Verify Email with OTP or PSK */}
          {!regOtpVerified ? (
            <div className="p-4.5 rounded-xl border border-cyan-300 dark:border-cyan-500/30 bg-cyan-50/70 dark:bg-cyan-950/20 space-y-3.5">
              <div className="flex items-center justify-between text-xs font-bold text-cyan-900 dark:text-cyan-300 uppercase tracking-wide flex-wrap gap-2">
                <span className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Step 1: Work Email &amp; Verification
                </span>
                {regPsk.trim() && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-300">
                    PSK Direct Mode Active (OTP Bypassed)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                Enter your official work email. You can verify via email OTP below, or enter an Admin Pre-Shared Key (PSK) in Step 2 to register directly without OTP.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    setRegOtpSent(false);
                  }}
                  disabled={regOtpSent}
                  className="flex-1 px-3.5 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 disabled:opacity-60 font-semibold focus:outline-none"
                />
                {!regOtpSent ? (
                  <button
                    type="button"
                    disabled={regOtpLoading}
                    onClick={handleSendRegOtp}
                    className="neu-btn-primary px-4 py-2 text-xs font-bold rounded-xl shadow-xs cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    {regOtpLoading ? 'Dispatching...' : 'Send Verification OTP'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRegOtpSent(false)}
                    className="neu-btn px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300 font-semibold rounded-xl cursor-pointer"
                  >
                    Change Email
                  </button>
                )}
              </div>

              {regOtpSent && (
                <div className="pt-2 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="6-digit OTP"
                      value={regOtpCode}
                      onChange={(e) => setRegOtpCode(e.target.value)}
                      className="w-36 px-3 py-2 text-xs neu-input rounded-xl text-cyan-800 dark:text-cyan-300 font-mono tracking-widest text-center font-bold"
                    />
                    <button
                      type="button"
                      disabled={regOtpLoading}
                      onClick={handleVerifyRegOtp}
                      className="neu-btn-primary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      {regOtpLoading ? 'Checking...' : 'Verify OTP'}
                    </button>
                  </div>
                  {regOtpPreview && (
                    <div className="text-[11px] font-mono text-cyan-800 dark:text-cyan-300 bg-cyan-100/70 dark:bg-cyan-950/60 p-2 rounded-lg border border-cyan-300 dark:border-cyan-800/40">
                      OTP Code for testing: <strong>{regOtpPreview}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Email Confirmed &amp; Verified: <strong className="font-mono text-slate-900 dark:text-white">{regEmail}</strong>
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setRegOtpVerified(false);
                  setRegOtpSent(false);
                  setRegOtpCode('');
                }}
                className="text-[11px] underline text-emerald-700 dark:text-emerald-400 hover:opacity-80 font-bold"
              >
                Change
              </button>
            </div>
          )}

          {/* STEP 2: Profile Details */}
          <form onSubmit={handleCompleteRegistration} className="space-y-4">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wide">
              Step 2: Profile &amp; Department Information
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Your Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sarah Jenkins"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                <span>Employee Code *</span>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-bold">Compulsory (e.g. CBPL2045)</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CBPL2045"
                value={regEmployeeCode}
                onChange={(e) => setRegEmployeeCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-mono uppercase font-bold focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                Official staff employee code (compulsory). Will be visible alongside your name on all tickets like EmpID-Requester CBPL2045.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Designation / Post / Job Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Financial Analyst, Software Engineer"
                  value={regTitle}
                  onChange={(e) => setRegTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Department
                </label>
                <select
                  value={regDepartment}
                  onChange={(e) => setRegDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-bold"
                >
                  <option value="Operations">Operations</option>
                  <option value="Engineering">Engineering &amp; Dev</option>
                  <option value="Sales & Marketing">Sales &amp; Marketing</option>
                  <option value="Finance & Accounting">Finance &amp; Accounting</option>
                  <option value="Human Resources">Human Resources (HR)</option>
                  <option value="Legal & Compliance">Legal &amp; Compliance</option>
                  <option value="Customer Success">Customer Success</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Contact Phone Number
              </label>
              <input
                type="tel"
                placeholder="+1 (555) 012-3456"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                <span>Assigned Organization *</span>
                {urlOrgId ? (
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-bold">
                    ✓ Custom Link Organization Matched
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-normal">Choose your company/branch</span>
                )}
              </label>
              <select
                value={regOrgId}
                onChange={(e) => setRegOrgId(e.target.value)}
                className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-bold"
              >
                {allOrganizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.domain || o.id})
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                Tickets you submit will automatically be associated with this organization.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                  <span>Organization Pre-Shared Key</span>
                  <span className="text-[10px] text-slate-400 font-normal">If required</span>
                </label>
                <input
                  type="password"
                  placeholder="e.g. Sports@9433"
                  value={regPsk}
                  onChange={(e) => setRegPsk(e.target.value)}
                  className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                  <span>Create Account Password</span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                </label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                You will be immediately logged in to submit support tickets.
              </span>
              <button
                type="submit"
                disabled={(!regOtpVerified && !regPsk.trim()) || regSubmitting}
                className="neu-btn-primary px-5 py-2.5 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
              >
                {regSubmitting ? (
                  'Creating Account...'
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Complete Registration
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Survey Modal */}
      {ratingTicketId && (() => {
        const targetTicket = tickets.find((t) => t.id === ratingTicketId);
        const alreadyRated = Boolean(targetTicket?.satisfactionRating);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md neu-modal p-6 rounded-2xl border border-slate-200/90 dark:border-white/15 space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                How was your IT support experience?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Ticket <strong className="font-mono text-cyan-700 dark:text-cyan-400">[{ratingTicketId}]</strong> ({targetTicket?.subject || 'Support Request'}). Share your rating and remarks to help us maintain high service quality.
              </p>

              {surveySubmitted ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs text-center font-bold space-y-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                  <div>Thank you! Your feedback has been recorded.</div>
                </div>
              ) : (
                <form onSubmit={handleSurveySubmit} className="space-y-4">
                  {alreadyRated && (
                    <div className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>Current rating: <strong>{targetTicket?.satisfactionRating?.rating}/5 stars</strong>. You can update your rating or feedback below.</span>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-3 py-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setSelectedRating(star)}
                        className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= selectedRating
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-slate-300 dark:text-slate-700'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Optional Comments or Compliments
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Tell us about the technician's response time, clarity, or service experience..."
                      value={surveyComment}
                      onChange={(e) => setSurveyComment(e.target.value)}
                      className="w-full p-3 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 font-medium focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setRatingTicketId(null)}
                      className="neu-btn px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold rounded-lg cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      className="neu-btn-primary px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      {alreadyRated ? 'Update Feedback' : 'Submit Feedback'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        );
      })()}


    </div>
  );
};
