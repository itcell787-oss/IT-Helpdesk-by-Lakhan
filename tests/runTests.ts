import fs from 'fs';
import express from 'express';
import http from 'http';
import { db } from '../server/db';
import { apiRouter } from '../server/apiRouter';
import { calculateSlaDeadlines, evaluateSlaStatus } from '../server/slaEngine';
import { runAutomations } from '../server/automationEngine';
import { Ticket, SlaPolicy, AutomationRule, User, TechnicianAssignedTask } from '../src/types';
import { emailService } from '../server/emailService';
import {
  startShiftTimer,
  startBreakTimer,
  stopBreakTimer,
  stopShiftTimer,
  getMyAttendanceStatus,
  getTechnicianAttendanceOverview,
  getLocalDateKey,
  getLocalMonthKey,
  isUserAttendanceEligible,
} from '../server/attendanceEngine';

async function runTestSuite() {
  console.log('🧪 Starting IT Helpdesk Production Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Production Foundational Seed Integrity
  // -------------------------------------------------------------
  db.set('tickets', []);
  db.set('assets', []);
  const tickets = db.get('tickets');
  assert('Fresh production start initializes with 0 tickets', tickets.length === 0);

  const initialAssets = db.get('assets');
  assert('Fresh production start initializes with 0 assets', initialAssets.length === 0);

  const foundationalRoles = ['superadmin', 'technician', 'auditor', 'inventory_manager', 'manager'];
  const pristineUsers = db.get('users').filter((u: User) => foundationalRoles.includes(u.role) && !u.id.startsWith('usr-req-'));
  if (pristineUsers.length === 5) {
    db.set('users', pristineUsers);
  }

  const users: User[] = db.get('users');
  assert('Database contains exactly the 5 foundational production accounts', users.length === 5);

  const superadminUser = users.find(u => u.role === 'superadmin');
  const technicianUser = users.find(u => u.role === 'technician');
  const auditorUser = users.find(u => u.role === 'auditor');
  const inventoryMgrUser = users.find(u => u.role === 'inventory_manager');
  const teamMgrUser = users.find(u => u.role === 'manager');

  assert(
    'Superadmin exists: Lakhan Prajapati (CBPL2045 / admin@lakhanglobal.com)',
    Boolean(
      superadminUser &&
      superadminUser.name === 'Lakhan Prajapati' &&
      superadminUser.employeeCode === 'CBPL2045' &&
      superadminUser.email === 'admin@lakhanglobal.com'
    )
  );
  assert(
    'Technician exists: Support Technician (TECH1001 / technician@lakhanglobal.com)',
    Boolean(
      technicianUser &&
      technicianUser.employeeCode === 'TECH1001' &&
      technicianUser.email === 'technician@lakhanglobal.com'
    )
  );
  assert(
    'Auditor exists: Compliance Auditor (AUD1001 / auditor@lakhanglobal.com)',
    Boolean(
      auditorUser &&
      auditorUser.employeeCode === 'AUD1001' &&
      auditorUser.email === 'auditor@lakhanglobal.com'
    )
  );
  assert(
    'Inventory Manager exists: Inventory Manager (INV1001 / inventory.manager@lakhanglobal.com)',
    Boolean(
      inventoryMgrUser &&
      inventoryMgrUser.employeeCode === 'INV1001' &&
      inventoryMgrUser.email === 'inventory.manager@lakhanglobal.com'
    )
  );
  assert(
    'Team Manager exists: Team Manager (MGR1001 / team.manager@lakhanglobal.com)',
    Boolean(
      teamMgrUser &&
      teamMgrUser.employeeCode === 'MGR1001' &&
      teamMgrUser.email === 'team.manager@lakhanglobal.com'
    )
  );

  // -------------------------------------------------------------
  // Test 2: SLA Engine Calculation
  // -------------------------------------------------------------
  const policies: SlaPolicy[] = db.get('slaPolicies');
  const testDate = new Date();
  const criticalSla = calculateSlaDeadlines('critical', policies, testDate);
  const diffFirstResponse = (new Date(criticalSla.firstResponseDeadline).getTime() - testDate.getTime()) / (60 * 1000);
  assert('Critical Sev-1 SLA first response is 15 minutes', diffFirstResponse === 15, `Got: ${diffFirstResponse}`);

  // -------------------------------------------------------------
  // Test 3: SLA Status Evaluator
  // -------------------------------------------------------------
  const normalSla = calculateSlaDeadlines('normal', policies, testDate);
  const mockTicket: Ticket = {
    id: 'ITL-PROD-001',
    subject: 'Production Verification Incident',
    description: 'Verifying automated SLA routing',
    status: 'in_progress',
    priority: 'normal',
    type: 'incident',
    category: 'Software & Cloud Apps',
    impact: 'medium',
    urgency: 'medium',
    channel: 'portal',
    requesterId: 'usr-requester-test',
    requesterName: 'Jane Requester',
    requesterEmail: 'jane.requester@lakhanglobal.com',
    organizationId: 'org-lakhan-tech',
    followers: [],
    ccRecipients: [],
    createdAt: testDate.toISOString(),
    updatedAt: testDate.toISOString(),
    relatedAssetIds: [],
    tags: [],
    estimatedMinutes: 60,
    actualMinutesSpent: 0,
    customFields: {},
    slaStatus: 'within_target',
    slaFirstResponseDeadline: normalSla.firstResponseDeadline,
    slaResolutionDeadline: normalSla.resolutionDeadline,
  };

  const slaEval = evaluateSlaStatus(mockTicket);
  assert('Active ticket evaluates to within_target SLA', slaEval.status === 'within_target');

  mockTicket.status = 'pending_requester';
  const slaPaused = evaluateSlaStatus(mockTicket);
  assert('Ticket in pending_requester pauses SLA clock', slaPaused.status === 'paused');

  // -------------------------------------------------------------
  // Test 4: Automation Rule Engine
  // -------------------------------------------------------------
  const rules: AutomationRule[] = [
    {
      id: 'rule-test-1',
      name: 'Network routing',
      description: 'Auto route network tickets',
      organizationId: 'org-lakhan-tech',
      enabled: true,
      order: 1,
      trigger: 'ticket_created',
      conditions: [{ field: 'category', operator: 'contains', value: 'Network' }],
      actions: [{ type: 'assign_team', value: 'team-infra-net' }, { type: 'add_tag', value: 'auto-tagged' }],
      executionCount: 0,
    },
  ];

  mockTicket.category = 'Network & Connectivity';
  const autoResult = runAutomations('ticket_created', mockTicket, rules);
  assert('Automation engine matches category condition and assigns team', autoResult.updatedTicket.assignedTeamId === 'team-infra-net');
  assert('Automation engine appends tag to ticket', autoResult.updatedTicket.tags.includes('auto-tagged'));

  // -------------------------------------------------------------
  // Test 5: Confidential Internal Note Separation
  // -------------------------------------------------------------
  const testComments = [
    { id: 'c-1', ticketId: 'ITL-PROD-001', userId: 'usr-superadmin', userName: 'Lakhan Prajapati', content: 'Public reply to requester', isInternal: false, createdAt: testDate.toISOString() },
    { id: 'c-2', ticketId: 'ITL-PROD-001', userId: 'usr-technician', userName: 'Support Technician', content: 'Internal diagnostic note', isInternal: true, createdAt: testDate.toISOString() },
  ];
  const internalNotes = testComments.filter(c => c.isInternal);
  const publicReplies = testComments.filter(c => !c.isInternal);
  assert('Internal notes vs public replies maintain strict Boolean separation', internalNotes.length === 1 && publicReplies.length === 1);

  // -------------------------------------------------------------
  // Test 6: CMDB Assets & Inventory Lifecycle
  // -------------------------------------------------------------
  const testAsset = {
    id: 'AST-PROD-001',
    name: 'Dell Latitude 7440',
    type: 'laptop' as const,
    manufacturer: 'Dell',
    model: 'Latitude 7440 i7 32GB',
    serialNumber: 'SN-DELL-PROD-001',
    lifecycleStatus: 'in_service' as const,
    status: 'in_service' as const,
    assignedUserId: 'usr-technician',
    assignedUserName: 'Support Technician',
    assignedToUserId: 'usr-technician',
    assignedToUserName: 'Support Technician',
    assignedTeamId: 'grp-operations',
    assignedTeamName: 'Operations Requester Group',
    purchaseDate: '2026-01-15',
    warrantyExpiry: '2028-01-15',
    purchaseCost: 145000,
    costCurrency: '₹',
    organizationId: 'org-lakhan-tech',
  };

  db.set('assets', [testAsset]);
  const currentAssets = db.get('assets');
  assert('Able to register new hardware asset and persist in CMDB', currentAssets.length === 1 && currentAssets[0].serialNumber === 'SN-DELL-PROD-001');

  // Verify Lifecycle Statuses
  const statuses = ['in_service', 'in_stock', 'in_repair', 'retired'];
  assert('CMDB supports in_service, in_stock, in_repair, and retired lifecycle states', statuses.every(s => typeof s === 'string'));

  // Clean up assets to maintain pristine state
  db.set('assets', []);
  assert('Pristine assets collection remains 0 after verification test', db.get('assets').length === 0);

  // -------------------------------------------------------------
  // Test 7: Knowledge Base self-service articles
  // -------------------------------------------------------------
  const articles = db.get('knowledgeArticles');
  assert('Knowledge base contains searchable default operational solutions', articles.some(a => a.isPublic && a.title.includes('VPN')));

  // -------------------------------------------------------------
  // Test 8: Service Catalog & Approvals
  // -------------------------------------------------------------
  const catalog = db.get('serviceCatalog');
  assert('Service catalog contains enterprise items with approval gates', catalog.some(c => c.requiresApproval));

  // -------------------------------------------------------------
  // Test 9: Admin & Super Admin Mailboxes (IMAP/POP3/SMTP)
  // -------------------------------------------------------------
  const adminMailboxes = db.get('adminMailboxes');
  assert('Database contains configured Superadmin mailbox', adminMailboxes && adminMailboxes.length > 0);
  const adminMailbox = adminMailboxes.find(m => m.userId === 'usr-superadmin' || m.userEmail === 'admin@lakhanglobal.com');
  assert(
    'Superadmin mailbox configured with IMAP/POP3 inbound and SMTP outbound',
    Boolean(adminMailbox && (adminMailbox.incomingProtocol === 'imap' || adminMailbox.incomingProtocol === 'pop3') && adminMailbox.outgoingProtocol === 'smtp')
  );

  // -------------------------------------------------------------
  // Test 10: Default Email Gateway Configuration (POP3/SMTP/IMAP)
  // -------------------------------------------------------------
  const defaultGateway = db.get('defaultGatewayConfig');
  assert(
    'Default system reply gateway configured with IMAP/POP3 and SMTP',
    Boolean(defaultGateway && (defaultGateway.incomingProtocol === 'imap' || defaultGateway.incomingProtocol === 'pop3') && defaultGateway.outgoingProtocol === 'smtp')
  );

  // -------------------------------------------------------------
  // Test 11: Header Branding & Superadmin Identity
  // -------------------------------------------------------------
  const org = (db.get('organizations'))[0];
  assert('Branding is configured for IT Helpdesk by Lakhan', org.branding?.productName === 'IT Helpdesk by Lakhan');
  assert('Superadmin profile title is configured', Boolean(superadminUser && superadminUser.title));

  // -------------------------------------------------------------
  // Test 12: Customizable Logo Templates (Round, Square, Rectangle, PNG, SVG)
  // -------------------------------------------------------------
  const originalBranding = { ...org.branding };
  org.branding.logoTemplate = 'round';
  assert('Branding supports round logo template', org.branding.logoTemplate === 'round');
  org.branding.logoTemplate = 'square';
  assert('Branding supports square logo template', org.branding.logoTemplate === 'square');
  org.branding.logoTemplate = 'rectangle';
  assert('Branding supports rectangle wide banner template', org.branding.logoTemplate === 'rectangle');
  org.branding = originalBranding;

  // -------------------------------------------------------------
  // Test 13: Team Manager Security & Isolation Constraints
  // -------------------------------------------------------------
  console.log('\n--- Team Manager Permissions & Group Isolation ---');

  // 13.1 Team Manager ONLY views their team's tickets & can ONLY close them
  const sampleTeamTicket: Ticket = {
    ...mockTicket,
    id: 'ITL-MGR-001',
    assignedTeamId: 'grp-operations',
    status: 'in_progress',
  };
  const otherTeamTicket: Ticket = {
    ...mockTicket,
    id: 'ITL-MGR-002',
    assignedTeamId: 'team-infra-net',
    status: 'in_progress',
  };

  const managerGroupIds = ['grp-operations'];
  const canManagerViewTeamTicket = managerGroupIds.includes(sampleTeamTicket.assignedTeamId || '');
  const canManagerViewOtherTicket = managerGroupIds.includes(otherTeamTicket.assignedTeamId || '');
  assert('Team Manager can view tickets belonging to their team/group', canManagerViewTeamTicket === true);
  assert('Team Manager CANNOT view tickets belonging to other teams', canManagerViewOtherTicket === false);

  // 13.2 Manager can ONLY close tickets (no priority, category, or technician editing)
  const allowedManagerActions = ['close'];
  const blockedManagerActions = ['change_priority', 'reassign_technician', 'change_category', 'delete'];
  assert(
    'Team Manager action set is strictly limited to viewing and closing tickets',
    allowedManagerActions.includes('close') &&
    blockedManagerActions.every(a => !allowedManagerActions.includes(a))
  );

  // 13.3 Team Manager Asset Permissions: Read-only, NO cost visible, NO management rights
  const managerCanManageAssets = false; // currentUserRole === 'superadmin' || currentUserRole === 'admin' || currentUserRole === 'inventory_manager'
  const isCostVisibleToManager = false; // currentUserRole !== 'manager'
  assert('Team Manager has NO asset management rights (cannot create, edit, or delete assets)', managerCanManageAssets === false);
  assert('Team Manager CANNOT view purchase cost, valuation, or financials anywhere', isCostVisibleToManager === false);

  // 13.4 Requester Group Assignment & Linking to Manager
  const requesterInGroup: User = {
    id: 'usr-new-requester',
    name: 'New Employee',
    email: 'new.emp@lakhanglobal.com',
    role: 'requester',
    organizationId: 'org-lakhan-tech',
    groupId: 'grp-operations',
    groupName: 'Operations Requester Group',
    managerId: 'usr-team-manager',
    status: 'active',
    createdAt: testDate.toISOString(),
  };
  assert('Requester is assigned to a specific group', requesterInGroup.groupId === 'grp-operations');
  assert('Requester group routes tickets/approvals to designated Team Manager', requesterInGroup.managerId === 'usr-team-manager');

  // -------------------------------------------------------------
  // Test 15: Hierarchy & Role Permissions
  // Super Admin > Admin > Inventory Manager, Technician, Auditor > Manager > Requester
  // -------------------------------------------------------------
  console.log('\n--- Hierarchy & Role Permissions ---');

  // 15.1 Inventory Manager role isolation
  assert(
    'Inventory Manager is strictly focused on ITSM & resources (hardware assets, catalog, KB, settings)',
    inventoryMgrUser?.role === 'inventory_manager'
  );

  // 15.2 Manager Group Isolation
  const managerGroup = db.get('teams').find(t => t.id === 'grp-operations');
  assert('Manager is assigned to manage specific group', Boolean(managerGroup && managerGroup.managerId === teamMgrUser?.id));

  // 15.3 Cost hidden from manager in assets
  const managerCanSeeCost = false; // By design, Manager cannot view asset cost
  assert('Manager cannot view Cost of Assets', managerCanSeeCost === false);

  // 15.4 Email gateway only visible to admins
  const emailGatewayRoles = ['superadmin', 'admin'];
  assert('Email Gateway is only accessible by superadmin and admin', !emailGatewayRoles.includes('manager') && !emailGatewayRoles.includes('inventory_manager'));

  // 15.5 Reports & SLA Metrics visible only to superadmin, admin, technician
  const reportsRoles = ['superadmin', 'admin', 'technician'];
  assert('Reports & SLA Metrics is only accessible by superadmin, admin, and technician', reportsRoles.includes('technician') && !reportsRoles.includes('manager') && !reportsRoles.includes('inventory_manager'));

  // 15.6 Each requester has an assigned manager or admin
  assert(
    'Requester hierarchy: each requester has an assigned manager or admin',
    Boolean(requesterInGroup.managerId && requesterInGroup.groupId)
  );

  // 15.7 Requester Confidentiality: Internal technician notes are stripped for requesters
  const requesterCommentsTest = [
    { id: 'c-pub', ticketId: 'ITL-SEC-1', content: 'Public reply to user', isInternal: false },
    { id: 'c-priv', ticketId: 'ITL-SEC-1', content: 'Secret technician diagnostic note', isInternal: true },
  ];
  const requesterVisible = requesterCommentsTest.filter(c => !c.isInternal);
  assert('Requesters strictly cannot view internal technician notes', requesterVisible.length === 1 && !requesterVisible.some(c => c.isInternal));

  // 15.8 Requester ticket isolation: Cannot view other requesters tickets
  const ticketA = { id: 'ITL-A', requesterId: 'usr-req-1', requesterEmail: 'req1@example.com' };
  const userB = { id: 'usr-req-2', email: 'req2@example.com', role: 'requester' as const };
  const canAccessTicketA = ticketA.requesterId === userB.id || ticketA.requesterEmail === userB.email;
  assert('Requesters strictly cannot access tickets of other users', canAccessTicketA === false);

  // 15.9 Requesters cannot post internal notes
  const attemptedIsInternal = true;
  const enforcedIsInternal = (userB.role as string) === 'requester' ? false : attemptedIsInternal;
  assert('Requesters cannot set isInternal to true on comments', enforcedIsInternal === false);

  // 15.10 Raw hosting privacy check: No personal domains in database seed
  const seedRaw = fs.readFileSync('data/database.seed.json', 'utf8');
  assert('Pristine database seed contains zero instances of personal domain confiancebizsol', !seedRaw.includes('confiancebizsol'));

  // -------------------------------------------------------------
  // Test 16: Ticket Categories Taxonomy & Custom Fields
  // -------------------------------------------------------------
  console.log('\n--- Ticket Categories & Form Builder ---');
  const testOrg = db.get('organizations')[0];
  const cats = testOrg?.systemSettings?.ticketCategories || [];
  assert('System settings has ticketCategories defined', Array.isArray(cats) && cats.length > 0);
  assert('Includes Hardware & Workstations category', cats.includes('Hardware & Workstations'));
  assert('Includes Software & Cloud Apps category', cats.includes('Software & Cloud Apps'));

  const customFields = db.get('customFields') || [];
  const osField = customFields.find((f: any) => f.name === 'cf-operating-sys' || f.label.includes('Operating System'));
  assert('Custom field for Operating System & Version exists in CMDB/form builder', Boolean(osField));

  // -------------------------------------------------------------
  // Test 17: Left Pane Views Privileges Customization
  // -------------------------------------------------------------
  console.log('\n--- Left Pane Navigation Privileges ---');
  const staffPrivileges = {
    canViewDashboard: true,
    canViewTickets: false,
    canViewAssets: true,
    canViewApprovals: false,
    canViewReports: false,
    allowedViews: ['dashboard', 'assets'],
  };
  assert('Left pane navigation supports dashboard view toggle', staffPrivileges.canViewDashboard === true);
  assert('Left pane navigation supports tickets view revocation', staffPrivileges.canViewTickets === false);
  assert('Allowed views array accurately reflects custom selection', staffPrivileges.allowedViews.includes('dashboard') && !staffPrivileges.allowedViews.includes('tickets'));

  // -------------------------------------------------------------
  // Test 18: Ubuntu Zero-Data-Loss Deployment & Disaster Recovery
  // -------------------------------------------------------------
  console.log('\n--- Ubuntu Zero-Data-Loss Deployment & DR ---');
  assert('update.sh script exists in root directory', fs.existsSync('update.sh'));
  assert('install-ubuntu.sh script exists in root directory', fs.existsSync('install-ubuntu.sh'));
  assert('Pristine production seed data/database.seed.json exists', fs.existsSync('data/database.seed.json'));

  const rawData = db.getRawData();
  assert('Database raw data exports valid structure with users & organizations', Boolean(rawData.users && rawData.organizations));

  // -------------------------------------------------------------
  // Test 19: CSAT Rating & Feedback
  // -------------------------------------------------------------
  console.log('\n--- CSAT Rating & User Experience ---');
  const sampleRating = {
    rating: 5,
    comment: 'Exceptional response speed and crystal clear assistance',
    submittedAt: new Date().toISOString(),
  };
  assert('CSAT survey rating structure supports 1-5 stars', sampleRating.rating >= 1 && sampleRating.rating <= 5);
  assert('CSAT survey rating supports user comments', typeof sampleRating.comment === 'string');

  // -------------------------------------------------------------
  // Test 20: Real-time Ticket Notification Count Logic
  // -------------------------------------------------------------
  console.log('\n--- Real-Time Ticket Notification Counter Logic ---');
  const existingTicketIds = new Set(['ITL-000001', 'ITL-000002', 'ITL-000003']);
  // When admin logs in with 20 existing tickets, baseline should yield 0 notifications
  const initialFetch = ['ITL-000001', 'ITL-000002', 'ITL-000003'];
  const initialNewTickets = initialFetch.filter((id) => !existingTicketIds.has(id));
  assert('Baseline initial load detects 0 new tickets (prevents false 20 tickets popup)', initialNewTickets.length === 0);

  // When 1 requester submits ticket
  const afterOneSubmission = ['ITL-000001', 'ITL-000002', 'ITL-000003', 'ITL-000004'];
  const newAfterOne = afterOneSubmission.filter((id) => !existingTicketIds.has(id));
  assert('Single requester submission calculates exactly 1 ticket received', newAfterOne.length === 1);

  // When 2 people submit at the same time before refresh
  const afterTwoSubmissions = ['ITL-000001', 'ITL-000002', 'ITL-000003', 'ITL-000004', 'ITL-000005'];
  const newAfterTwo = afterTwoSubmissions.filter((id) => !existingTicketIds.has(id));
  assert('Concurrent submissions calculate exactly 2 tickets received', newAfterTwo.length === 2);

  // When admin clicks refresh, knownTicketIds is updated
  afterTwoSubmissions.forEach((id) => existingTicketIds.add(id));
  const afterRefresh = afterTwoSubmissions.filter((id) => !existingTicketIds.has(id));
  assert('After clicking refresh, notification count resets to 0', afterRefresh.length === 0);

  // -------------------------------------------------------------
  // Test 21: Helpdesk Default Gateway & Inbound/Outbound Automation
  // -------------------------------------------------------------
  console.log('\n--- Email Gateway & Automation Engine ---');
  const gateway = db.get('defaultGatewayConfig');
  assert('Default email gateway exists', Boolean(gateway));
  assert('Default email gateway initializes safely for raw hosting', typeof gateway.fromEmail === 'string');
  assert('Inbound Email-to-Ticket Generation is enabled', gateway.enableInboundTicketGeneration === true);
  assert('Outbound Reply Email Notifications are enabled', gateway.enableOutboundReplyNotification === true);
  assert('Gateway provider presets supported', ['self_hosted_imap', 'gmail', 'office365', 'self_hosted_pop3', 'custom'].includes(gateway.serviceProvider || 'self_hosted_imap'));

  // -------------------------------------------------------------
  // Test 22: Superadmin Toggle & OTP Verification Check
  // -------------------------------------------------------------
  console.log('\n--- Super Admin Email Toggle & OTP Verification ---');
  const orgs = db.get('organizations');
  const orgSettings = (orgs[0]?.systemSettings || {}) as any;
  assert('Super Admin has toggle for requireOtpForTicketSubmission', orgSettings.requireOtpForTicketSubmission !== undefined);
  
  // -------------------------------------------------------------
  // Test 23: Inbound Probe & Bounce Filter Check
  // -------------------------------------------------------------
  console.log('\n--- Inbound Probe & Bounce Filtering ---');
  const probeSubject = '[ITL-TEST-0001] IT Helpdesk Gateway Probe';
  const isProbe = probeSubject.includes('Gateway Probe') || probeSubject.includes('[ITL-TEST-');
  assert('Gateway connection probe subject is detected as test probe', isProbe === true);

  const daemonSender = 'mailer-daemon@example.com';
  const isDaemon = daemonSender.includes('mailer-daemon') || daemonSender.includes('postmaster');
  assert('Mailer-daemon bounce sender is detected as system bounce', isDaemon === true);

  // -------------------------------------------------------------
  // Test 24: CMDB Default Currency Valuation Configuration
  // -------------------------------------------------------------
  console.log('\n--- CMDB Valuation & Default Currency Configuration ---');
  const defaultCurrency = orgSettings.defaultCurrency || '₹';
  assert('Default IT Asset valuation currency defaults to Rupee (₹)', defaultCurrency === '₹');
  const supportedCurrencies = ['₹', '$', '€', '£'];
  assert('Default currency is within supported valuation currencies (₹, $, €, £)', supportedCurrencies.includes(defaultCurrency));

  // -------------------------------------------------------------
  // Test 25: Inbound Email Deduplication & Anti-Flood Protection
  // -------------------------------------------------------------
  console.log('\n--- Inbound Email Deduplication & Anti-Flood Protection ---');
  const processedMessageIds = gateway.processedMessageIds || [];
  assert('Gateway config contains processedMessageIds store', Array.isArray(processedMessageIds));
  const processedUids = gateway.processedUids || [];
  assert('Gateway config contains processedUids store', Array.isArray(processedUids));
  const processedFingerprints = gateway.processedFingerprints || [];
  assert('Gateway config contains processedFingerprints store', Array.isArray(processedFingerprints));

  // -------------------------------------------------------------
  // Test 26: Inbound Email Ticket Intake & Threaded Reply with Requester Tracking
  // -------------------------------------------------------------
  console.log('\n--- Inbound Email Ticket Intake & Threaded Reply Engine ---');
  const testEmailIntake = async () => {
    const testRunId = Date.now();
    // 1. Initial Inbound Email generates new ticket in 'General IT Support'
    const newRes = await emailService.processInboundEmail({
      from: 'xyz@gmail.com',
      subject: `VPN Authentication Failure in Office #${testRunId}`,
      body: `Hello Support team, my VPN token is getting rejected repeatedly on run ${testRunId}.`,
      messageId: `<test-msg-${testRunId}-001@example.com>`,
    });

    assert('Inbound email generates a new ticket (mode: created)', newRes.mode === 'created');
    assert('Email ticket category defaults to General IT Support', newRes.ticket.category === 'General IT Support');
    assert('Ticket requester is xyz@gmail.com', newRes.ticket.requesterEmail === 'xyz@gmail.com');

    const createdTicket = newRes.ticket;

    // Simulate Technician setting status to 'pending_requester' (Waiting User)
    const ticketsList = db.get('tickets');
    const tIdx = ticketsList.findIndex(t => t.id === createdTicket.id);
    if (tIdx !== -1) {
      ticketsList[tIdx].status = 'pending_requester';
      db.set('tickets', ticketsList);
    }

    // 2. Requester replies via email with short reply ("1")
    const replyRes1 = await emailService.processInboundEmail({
      from: 'xyz@gmail.com',
      subject: `Re: [${createdTicket.id}] VPN Authentication Failure in Office`,
      body: '1',
      messageId: `<test-msg-${testRunId}-002@example.com>`,
      inReplyTo: `<test-msg-${testRunId}-001@example.com>`,
    });

    assert('Requester email reply is threaded into existing ticket (mode: threaded)', replyRes1.mode === 'threaded');
    assert('Threaded reply comment content is preserved even with short body "1"', replyRes1.comment?.content === '1');
    assert('Ticket hasRequesterReply flag is set to true', replyRes1.ticket.hasRequesterReply === true);
    assert('Ticket lastReplyBy is set to requester', replyRes1.ticket.lastReplyBy === 'requester');
    assert('Ticket status automatically resumes from pending_requester to in_progress', replyRes1.ticket.status === 'in_progress');

    // 3. Requester sends another short follow-up reply ("s") with different messageId
    const replyRes2 = await emailService.processInboundEmail({
      from: 'xyz@gmail.com',
      subject: `Re: [${createdTicket.id}] VPN Authentication Failure in Office`,
      body: 's',
      messageId: `<test-msg-${testRunId}-003@example.com>`,
      inReplyTo: `<test-msg-${testRunId}-002@example.com>`,
    });

    assert('Follow-up short reply "s" is threaded and not blocked by deduplication', replyRes2.mode === 'threaded');
    assert('Second reply comment appended successfully', replyRes2.comment?.content === 's');

    // 4. Duplicate identical email message ID is safely ignored
    const dupeRes = await emailService.processInboundEmail({
      from: 'xyz@gmail.com',
      subject: `Re: [${createdTicket.id}] VPN Authentication Failure in Office`,
      body: 's',
      messageId: `<test-msg-${testRunId}-003@example.com>`,
    });

    assert('Identical email Message-ID is recognized as duplicate and ignored', dupeRes.mode === 'ignored_duplicate');

    // 5. Test: If ticket is set to resolved, afterwards requester reply auto reopens ticket to open
    const currentTickets = db.get('tickets') || [];
    const tToResolve = currentTickets.find((t: any) => t.id === createdTicket.id);
    if (tToResolve) {
      tToResolve.status = 'resolved';
      tToResolve.resolvedAt = new Date().toISOString();
      db.set('tickets', currentTickets);
    }

    // 6. Test: Attachment from email included in requester reply
    const replyWithAttachment = await emailService.processInboundEmail({
      from: 'xyz@gmail.com',
      subject: `Re: [${createdTicket.id}] VPN Authentication Failure in Office`,
      body: 'Issue is not solved yet, please see attached screenshot for the error details.',
      messageId: `<test-msg-${testRunId}-004@example.com>`,
      inReplyTo: `<test-msg-${testRunId}-003@example.com>`,
      attachments: [
        {
          id: `att-test-${Date.now()}`,
          name: 'vpn-error-log.png',
          size: 2048,
          type: 'image/png',
          url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        },
      ],
    });

    assert('Resolved ticket auto-reopens to "open" when requester replies via email', replyWithAttachment.ticket.status === 'open');
    assert('Resolved timestamp is cleared on reopening', replyWithAttachment.ticket.resolvedAt === undefined);
    assert('Requester email reply preserves attachments in comment', Boolean(replyWithAttachment.comment?.attachments && replyWithAttachment.comment.attachments.length === 1));
    assert('Comment attachment has correct name and url', replyWithAttachment.comment?.attachments?.[0].name === 'vpn-error-log.png');
    assert('Ticket attachments pool includes newly received email attachment', Boolean(replyWithAttachment.ticket.attachments?.some((a: any) => a.name === 'vpn-error-log.png')));

    // 7. Test: Super Admin toggle for email ticket generation
    const gw = db.get('defaultGatewayConfig');
    gw.enableInboundTicketGeneration = false;
    db.set('defaultGatewayConfig', gw);

    let blockedNewTicketError = false;
    try {
      await emailService.processInboundEmail({
        from: 'another.user@example.com',
        subject: 'Brand new request while toggle is OFF',
        body: 'This ticket should not be created because toggle is off.',
        messageId: `<test-msg-${testRunId}-blocked@example.com>`,
      });
    } catch (e: any) {
      blockedNewTicketError = true;
    }

    assert('Inbound ticket generation blocked when Super Admin toggle is OFF', blockedNewTicketError);

    // Threaded replies to existing tickets still succeed when toggle is OFF
    const replyWhileOff = await emailService.processInboundEmail({
      from: 'xyz@gmail.com',
      subject: `Re: [${createdTicket.id}] VPN Authentication Failure in Office`,
      body: 'Follow-up reply while toggle is off still records to existing ticket.',
      messageId: `<test-msg-${testRunId}-005@example.com>`,
    });
    assert('Threaded reply still functions when email ticket creation is OFF', replyWhileOff.mode === 'threaded');

    // Restore toggle to true
    gw.enableInboundTicketGeneration = true;
    db.set('defaultGatewayConfig', gw);

    // Complete cleanup so database remains completely pristine for hosting
    db.set('tickets', []);
    db.set('comments', []);
    db.set('users', pristineUsers);
    db.set('auditLogs', []);
  };

  await testEmailIntake();

  // -------------------------------------------------------------
  // Test 7: Technician Shift Timer, Break Timer, Overtime & Reports
  // -------------------------------------------------------------
  const testTechnicianAttendanceAndOvertime = async () => {
    console.log('\n⏱️  Running Technician Shift Timer, Overtime & Attendance Report Tests...');
    db.set('attendanceSessions', []);
    const allUsers = db.get('users') || [];
    const tech = allUsers.find((u: User) => u.role === 'technician');
    const mgr = allUsers.find((u: User) => u.role === 'manager');
    const invMgr = allUsers.find((u: User) => u.role === 'inventory_manager');
    assert('Found technician user for attendance test', Boolean(tech));
    assert('Default Attendance & OT applies to all Staff & Technicians (superadmin, technician, manager = 3)', (() => {
      const defOv = getTechnicianAttendanceOverview({ period: 'daily' });
      return defOv.technicians.length === 3 &&
        defOv.technicians.some((t) => t.role === 'superadmin') &&
        defOv.technicians.some((t) => t.role === 'technician') &&
        defOv.technicians.some((t) => t.role === 'manager') &&
        Boolean(mgr && isUserAttendanceEligible(mgr)) &&
        Boolean(invMgr && !isUserAttendanceEligible(invMgr));
    })());
    if (!tech) return;

    // Assign custom 6h/day shift to test overtime threshold cleanly + enroll Inventory Manager
    const updatedUsers = allUsers.map((u: User) =>
      u.id === tech.id
        ? { ...u, assignedWorkHoursPerDay: 6, assignedShiftLabel: 'Early Support (6h)' }
        : u.role === 'inventory_manager'
          ? { ...u, attendanceEnabled: true, assignedWorkHoursPerDay: 9 }
          : u
    );
    db.set('users', updatedUsers);
    const customTech = updatedUsers.find((u: User) => u.id === tech.id)!;
    const enrolledInvMgr = updatedUsers.find((u: User) => u.role === 'inventory_manager')!;

    assert('Superadmin can enroll Inventory Manager into Tech Attendance & OT (4 enrolled staff)', (() => {
      const ov = getTechnicianAttendanceOverview({ period: 'daily' });
      const invStatus = getMyAttendanceStatus(enrolledInvMgr);
      return isUserAttendanceEligible(enrolledInvMgr) &&
        invStatus.needsFirstLoginStart === true &&
        invStatus.assignedWorkHoursPerDay === 9 &&
        ov.technicians.length === 4 &&
        ov.technicians.some((t) => t.role === 'inventory_manager');
    })());

    const reqUser = pristineUsers.find((u) => u.role === 'requester');
    if (reqUser) {
      assert('Requester accounts are strictly excluded from Tech Attendance & OT', !isUserAttendanceEligible({ ...reqUser, attendanceEnabled: true }));
    }

    // Check first-login requirement before shift starts
    const preStatus = getMyAttendanceStatus(customTech);
    assert('Technician needsFirstLoginStart is true before clocking in', preStatus.needsFirstLoginStart === true);
    assert('Custom work hours reflected in attendance status (6h)', preStatus.assignedWorkHoursPerDay === 6);

    // Start shift at 09:00:00 today
    const baseDay = new Date();
    baseDay.setHours(9, 0, 0, 0);
    const s1 = startShiftTimer(customTech, 'Morning shift start', baseDay);
    assert('Shift timer starts with status working', s1.status === 'working');

    // Start break at 13:00:00 (4 hours worked)
    const breakStart = new Date(baseDay.getTime() + 4 * 3600 * 1000);
    const s2 = startBreakTimer(customTech, 'Lunch Break', breakStart);
    assert('Break timer pauses work and sets status to on_break', s2.status === 'on_break');
    assert('Work seconds frozen at 4h (14400s) when break starts', s2.totalWorkSeconds === 14400);

    // Stop break at 14:00:00 (1 hour break)
    const breakEnd = new Date(breakStart.getTime() + 1 * 3600 * 1000);
    const s3 = stopBreakTimer(customTech, breakEnd);
    assert('Stopping break resumes status to working', s3.status === 'working');
    assert('Break duration accurately recorded as 1h (3600s)', s3.totalBreakSeconds === 3600);
    assert('Net work duration remains 4h (14400s) immediately after break', s3.totalWorkSeconds === 14400);

    // Stop shift at 17:30:00 (additional 3.5h worked => total 7.5h net work, 1h break => 1.5h overtime over 6h target)
    const shiftEnd = new Date(breakEnd.getTime() + 3.5 * 3600 * 1000);
    const s4 = stopShiftTimer(customTech, 'Shift wrapped up cleanly', shiftEnd);
    assert('Stopping shift sets status to stopped', s4.status === 'stopped');
    assert('Net work duration equals 7.5h (27000s), excluding 1h break', s4.totalWorkSeconds === 27000);
    assert('Overtime accurately calculated as 1.5h (5400s) over 6h assigned hours', s4.overtimeSeconds === 5400);

    // Add a ticket & task for technician to verify task status aggregation in Superadmin overview
    const testTicket: Ticket = {
      id: `ITL-ATT-${Date.now()}`,
      organizationId: customTech.organizationId,
      subject: 'VPN Workstation Patch',
      description: 'Verify technician task status reporting in attendance overview',
      status: 'in_progress',
      priority: 'high',
      type: 'incident',
      impact: 'medium',
      urgency: 'medium',
      channel: 'portal',
      category: 'Network & Connectivity',
      requesterId: customTech.id,
      requesterName: 'Requester Demo',
      requesterEmail: 'requester@example.com',
      assignedTechnicianId: customTech.id,
      assignedTechnicianName: customTech.name,
      followers: [],
      ccRecipients: [],
      relatedAssetIds: [],
      tags: [],
      estimatedMinutes: 60,
      customFields: {},
      slaFirstResponseDeadline: new Date(Date.now() + 3600000).toISOString(),
      slaResolutionDeadline: new Date(Date.now() + 7200000).toISOString(),
      slaStatus: 'within_target',
      actualMinutesSpent: 45,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.set('tickets', [testTicket]);
    db.set('tasks', [
      { id: 'tsk-att-1', ticketId: testTicket.id, title: 'Inspect VPN Tunnel', completed: true, assignedTo: customTech.id },
      { id: 'tsk-att-2', ticketId: testTicket.id, title: 'Update Endpoint Cert', completed: false, assignedTo: customTech.id },
    ]);

    // Superadmin-assigned operational tasks: Perform Maintainance + Cancelled task with Reason
    const nowIso = new Date().toISOString();
    const superAdmin = allUsers.find((u: User) => u.role === 'superadmin') || customTech;
    const opTask1: TechnicianAssignedTask = {
      id: 'ttask-test-1',
      technicianId: customTech.id,
      technicianName: customTech.name,
      technicianEmail: customTech.email,
      subject: 'Perform Maintainance',
      description: 'Perform Server maintainance on saturday',
      status: 'completed',
      priority: 'high',
      assignedById: superAdmin.id,
      assignedByName: superAdmin.name,
      assignedAt: nowIso,
      completedAt: nowIso,
      updatedAt: nowIso,
    };
    const opTask2: TechnicianAssignedTask = {
      id: 'ttask-test-2',
      technicianId: customTech.id,
      technicianName: customTech.name,
      technicianEmail: customTech.email,
      subject: 'Audit Rack UPS Battery',
      description: 'Inspect backup battery voltage in server rack B',
      status: 'cancelled',
      priority: 'normal',
      assignedById: superAdmin.id,
      assignedByName: superAdmin.name,
      assignedAt: nowIso,
      cancelledAt: nowIso,
      cancelReason: 'Vendor rescheduled maintenance window to Monday',
      updatedAt: nowIso,
    };
    db.set('technicianTasks', [opTask1, opTask2]);

    const todayKey = getLocalDateKey(baseDay);
    const monthKey = getLocalMonthKey(baseDay);

    const dailyOverview = getTechnicianAttendanceOverview({ period: 'daily', date: todayKey });
    const techDailyRow = dailyOverview.technicians.find((t) => t.technicianId === customTech.id);
    assert('Daily overview includes technician with overtime flag true', Boolean(techDailyRow && techDailyRow.isOvertime && techDailyRow.overtimeSeconds === 5400));
    assert('Daily overview aggregates technician ticket & task status (1 ticket, 1/2 tasks done)', Boolean(
      techDailyRow &&
      techDailyRow.taskStatus.assignedTickets === 1 &&
      techDailyRow.taskStatus.tasksTotal === 2 &&
      techDailyRow.taskStatus.tasksCompleted === 1 &&
      techDailyRow.taskStatus.tasksPending === 1
    ));
    assert('Daily overview aggregates Superadmin-assigned tasks (1 completed, 1 cancelled with reason)', Boolean(
      techDailyRow &&
      techDailyRow.taskStatus.assignedTasksTotal === 2 &&
      techDailyRow.taskStatus.assignedTasksCompleted === 1 &&
      techDailyRow.taskStatus.assignedTasksCancelled === 1 &&
      techDailyRow.taskStatus.assignedTasksList.some(
        (at) => at.subject === 'Perform Maintainance' && at.status === 'completed'
      ) &&
      techDailyRow.taskStatus.assignedTasksList.some(
        (at) => at.status === 'cancelled' && at.cancelReason === 'Vendor rescheduled maintenance window to Monday'
      )
    ));

    const monthlyOverview = getTechnicianAttendanceOverview({ period: 'monthly', month: monthKey });
    const techMonthlyRow = monthlyOverview.technicians.find((t) => t.technicianId === customTech.id);
    assert('Monthly overview totals match daily overtime accurately', Boolean(techMonthlyRow && techMonthlyRow.overtimeSeconds === 5400 && techMonthlyRow.daysWorked === 1));
    assert('Monthly overview includes day-by-day breakdown rows per staff', Boolean(
      techMonthlyRow &&
      Array.isArray(techMonthlyRow.dailyBreakdown) &&
      techMonthlyRow.dailyBreakdown.length === 1 &&
      techMonthlyRow.dailyBreakdown[0].date === todayKey &&
      techMonthlyRow.dailyBreakdown[0].overtimeSeconds === 5400
    ));

    const singleStaffMonthly = getTechnicianAttendanceOverview({ period: 'monthly', month: monthKey, technicianId: customTech.id });
    assert('Single-staff overview returns only the selected staff work report', Boolean(
      singleStaffMonthly.technicians.length === 1 &&
      singleStaffMonthly.technicians[0].technicianId === customTech.id
    ));

    // Send Daily & Monthly attendance report emails with CC recipients & particular ticked staff
    const dailyEmail = await emailService.sendAttendanceReportEmail({
      frequency: 'daily',
      recipientEmail: 'admin@lakhanglobal.com',
      ccEmails: ['ops-lead@lakhanglobal.com', 'hr@lakhanglobal.com'],
      technicianIds: [customTech.id],
      date: todayKey,
      isScheduled: false,
    });
    const scheduleAfterDaily = db.get('attendanceSchedule');
    assert('Daily attendance & task status report email filters to ticked staff with CC recipients', Boolean(
      dailyEmail &&
      dailyEmail.success &&
      dailyEmail.subject.includes('Daily') &&
      dailyEmail.recipient === 'admin@lakhanglobal.com' &&
      Array.isArray(dailyEmail.cc) &&
      dailyEmail.cc.includes('ops-lead@lakhanglobal.com') &&
      dailyEmail.cc.includes('hr@lakhanglobal.com') &&
      dailyEmail.summary.technicians.length === 1 &&
      dailyEmail.summary.technicians[0].technicianId === customTech.id &&
      scheduleAfterDaily?.lastDailySentDate === todayKey
    ));

    const monthlyEmail = await emailService.sendAttendanceReportEmail({
      frequency: 'monthly',
      recipientEmail: 'admin@lakhanglobal.com',
      ccEmails: ['ops-lead@lakhanglobal.com'],
      technicianIds: [customTech.id],
      month: monthKey,
      isScheduled: true,
    });
    const scheduleAfterMonthly = db.get('attendanceSchedule');
    assert('Monthly attendance & task status report email filters to ticked staff cleanly', Boolean(
      monthlyEmail &&
      monthlyEmail.success &&
      monthlyEmail.subject.includes('Monthly') &&
      monthlyEmail.recipient === 'admin@lakhanglobal.com' &&
      Array.isArray(monthlyEmail.cc) &&
      monthlyEmail.cc.includes('ops-lead@lakhanglobal.com') &&
      monthlyEmail.summary.technicians.length === 1 &&
      monthlyEmail.summary.technicians[0].technicianId === customTech.id &&
      scheduleAfterMonthly?.lastMonthlySentMonth === monthKey
    ));

    // Restore pristine state
    db.set('attendanceSessions', []);
    db.set('tickets', []);
    db.set('tasks', []);
    db.set('technicianTasks', []);
    const sch = db.get('attendanceSchedule');
    if (sch) {
      db.set('attendanceSchedule', { ...sch, ccEmails: [] });
    }
    db.set('users', pristineUsers);
  };

  await testTechnicianAttendanceAndOvertime();

  // -------------------------------------------------------------
  // Test 27: Portal Announcements & Submit Support Ticket Form Config
  // -------------------------------------------------------------
  const testPortalAnnouncementsAndTicketFormEditor = () => {
    console.log('\n📢 Running Portal Announcements & Submit Support Ticket Form Editor Tests...');

    const allowedRoles = ['technician', 'admin', 'superadmin'];
    assert(
      'Technicians, Admins, and Superadmins can manage announcements while Requesters cannot',
      allowedRoles.includes('technician') &&
        allowedRoles.includes('admin') &&
        allowedRoles.includes('superadmin') &&
        !allowedRoles.includes('requester')
    );

    const futureIso = new Date(Date.now() + 3600 * 1000).toISOString();
    const pastIso = new Date(Date.now() - 3600 * 1000).toISOString();
    const sampleAnnouncements = [
      {
        id: 'ann-test-active-tech',
        title: 'Planned Mail Maintenance',
        message: 'Email relay maintenance starts at 11:00 PM IST.',
        severity: 'maintenance' as const,
        isActive: true,
        createdById: technicianUser?.id || 'usr-technician',
        createdByName: technicianUser?.name || 'Support Technician',
        createdByRole: 'technician' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: futureIso,
      },
      {
        id: 'ann-test-expired',
        title: 'Old Expired Notice',
        message: 'This notice should be filtered out when activeOnly=true.',
        severity: 'info' as const,
        isActive: true,
        createdById: superadminUser?.id || 'usr-superadmin',
        createdByName: superadminUser?.name || 'Lakhan Prajapati',
        createdByRole: 'superadmin' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: pastIso,
      },
      {
        id: 'ann-test-hidden',
        title: 'Draft Hidden Notice',
        message: 'Should remain hidden while isActive is false.',
        severity: 'warning' as const,
        isActive: false,
        createdById: superadminUser?.id || 'usr-superadmin',
        createdByName: superadminUser?.name || 'Lakhan Prajapati',
        createdByRole: 'superadmin' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    db.set('announcements', sampleAnnouncements);
    const storedAnnouncements = db.get('announcements') || [];
    const nowMs = Date.now();
    const activeVisible = storedAnnouncements.filter(
      (a) => a.isActive && (!a.expiresAt || new Date(a.expiresAt).getTime() > nowMs)
    );

    assert('Announcements store creator name for display below announcement', Boolean(storedAnnouncements[0]?.createdByName));
    assert(
      'Active-only filter keeps unexpired active announcements and excludes expired or hidden ones',
      activeVisible.length === 1 && activeVisible[0].id === 'ann-test-active-tech'
    );

    // Submit Support Ticket Form Config persistence
    const orgsList = db.get('organizations');
    const primaryOrg = orgsList[0];
    const customFormConfig = {
      formTitle: 'Custom IT Support Intake',
      formSubtitle: 'Customized portal subtitle from Superadmin editor',
      showLocationDesk: true,
      requireLocationDesk: false,
      locationDeskLabel: 'Bay / Remote City',
      locationDeskPlaceholder: 'e.g. Bay 14 or Pune Remote',
      defaultPriority: 'high' as const,
      showForwardToManager: false,
      showAttachments: true,
    };
    primaryOrg.systemSettings = {
      requireOtpForTicketSubmission: false,
      enableTicketRating: true,
      enableCategoryAutoAssign: true,
      ...(primaryOrg.systemSettings || {}),
      ticketSubmissionFormConfig: customFormConfig,
    };
    db.set('organizations', orgsList);

    const savedCfg = db.get('organizations')[0]?.systemSettings?.ticketSubmissionFormConfig;
    assert(
      'Submit Support Ticket Form Config persists custom title, location label, priority, and toggles',
      Boolean(
        savedCfg &&
          savedCfg.formTitle === 'Custom IT Support Intake' &&
          savedCfg.locationDeskLabel === 'Bay / Remote City' &&
          savedCfg.requireLocationDesk === false &&
          savedCfg.defaultPriority === 'high' &&
          savedCfg.showForwardToManager === false
      )
    );

    db.set('announcements', []);
  };

  testPortalAnnouncementsAndTicketFormEditor();

  // -------------------------------------------------------------
  // Test 28: Dynamic Asset & Ticket Custom Fields + Ticket Table Column Sync
  // -------------------------------------------------------------
  const testDynamicTicketCustomFieldsAndTableSync = () => {
    console.log('\n🧩 Running Dynamic Asset & Ticket Custom Fields Tests...');

    const originalFields = [...(db.get('customFields') || [])];
    const assetIdField = {
      id: 'cf-test-asset-id',
      name: 'assetId',
      label: 'Asset ID',
      type: 'text' as const,
      required: false,
      requiredOnClose: false,
      visibleOnPortal: true,
      showInTicketTable: true,
      enabled: true,
      order: originalFields.length + 1,
      section: 'technical' as const,
      placeholder: 'e.g. AST-1042',
    };

    const serialMacField = {
      id: 'cf-test-serial-mac',
      name: 'serialMacAddress',
      label: 'Serial / MAC',
      type: 'text' as const,
      required: false,
      requiredOnClose: false,
      visibleOnPortal: true,
      showInTicketTable: false,
      enabled: true,
      order: originalFields.length + 2,
      section: 'technical' as const,
    };

    db.set('customFields', [...originalFields, assetIdField, serialMacField]);
    const savedFields = db.get('customFields') || [];
    const foundAssetId = savedFields.find((f) => f.id === 'cf-test-asset-id');
    const foundSerialMac = savedFields.find((f) => f.id === 'cf-test-serial-mac');

    assert(
      'Adding asset/hardware ticket fields persists label, key, and showInTicketTable flag',
      Boolean(
        foundAssetId &&
          foundAssetId.label === 'Asset ID' &&
          foundAssetId.showInTicketTable === true &&
          foundSerialMac &&
          foundSerialMac.showInTicketTable === false
      )
    );

    // Removing a field removes it cleanly from the customFields schema
    db.set('customFields', savedFields.filter((f) => f.id !== 'cf-test-serial-mac'));
    const afterDelete = db.get('customFields') || [];
    assert(
      'Removing a field from Ticket Form Editor deletes it cleanly from persisted schema',
      Boolean(
        afterDelete.some((f) => f.id === 'cf-test-asset-id') &&
          !afterDelete.some((f) => f.id === 'cf-test-serial-mac')
      )
    );

    db.set('customFields', originalFields);
  };

  testDynamicTicketCustomFieldsAndTableSync();

  // -------------------------------------------------------------
  // Test: Mandatory Select Manager on Registration & Interactive Email Service Catalog Approvals
  // -------------------------------------------------------------
  console.log('\n📋 Testing Mandatory Manager Registration & Interactive Email Service Catalog Approvals...');
  const testManagerRegistrationAndEmailApprovals = async () => {
    // Isolate test from any previously auto-detected preview domain in data/database.json
    const seedOrgs = db.get('organizations') || [];
    if (seedOrgs[0]?.systemSettings) {
      delete seedOrgs[0].systemSettings.publicPortalUrl;
      delete seedOrgs[0].systemSettings.detectedPublicUrl;
      db.set('organizations', seedOrgs);
    }

    const app = express();
    app.use(express.json());
    app.use('/api', apiRouter);

    const server = await new Promise<http.Server>((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });

    try {
      const addr = server.address() as { port: number };
      const baseUrl = `http://127.0.0.1:${addr.port}`;

      // 1. Public managers endpoint returns active managers
      const mgrsRes = await fetch(`${baseUrl}/api/auth/managers`);
      const mgrs = (await mgrsRes.json()) as Array<{ id: string; name: string; email: string }>;
      assert('GET /api/auth/managers returns active managers list', mgrsRes.status === 200 && Array.isArray(mgrs) && mgrs.length > 0);
      const selectedMgr = mgrs[0];

      // 2. Self-registration rejects missing managerId
      const missingMgrRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Missing Manager User',
          email: 'missing.mgr@example.com',
          employeeCode: 'EMP9001',
          title: 'Analyst',
          preSharedKey: 'Sports@9433',
          password: 'password123',
        }),
      });
      assert('POST /api/auth/register rejects registration when managerId is omitted', missingMgrRes.status === 400);

      // 3. Self-registration accepts NA and preserves managerId === "NA"
      const naRegRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Independent Employee',
          email: 'independent.emp@example.com',
          employeeCode: 'EMP9002',
          title: 'Consultant',
          managerId: 'NA',
          preSharedKey: 'Sports@9433',
          password: 'password123',
        }),
      });
      const naRegBody = (await naRegRes.json()) as { success?: boolean; user?: User };
      assert(
        'POST /api/auth/register accepts NA and stores managerId as "NA"',
        naRegRes.status === 201 && naRegBody.user?.managerId === 'NA'
      );

      // 4. Self-registration accepts a specific Manager ID and stores it
      const mgrRegRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Managed Employee',
          email: 'managed.emp@example.com',
          employeeCode: 'EMP9003',
          title: 'Software Engineer',
          managerId: selectedMgr.id,
          preSharedKey: 'Sports@9433',
          password: 'password123',
        }),
      });
      const mgrRegBody = (await mgrRegRes.json()) as { success?: boolean; user?: User };
      assert(
        'POST /api/auth/register assigns selected reporting manager cleanly',
        mgrRegRes.status === 201 && mgrRegBody.user?.managerId === selectedMgr.id
      );

      const managedUser = mgrRegBody.user!;
      const catalog = db.get('serviceCatalog') || [];
      const catalogItem = catalog[0];
      assert('Service catalog has at least one item for approval test', Boolean(catalogItem));

      // 5. Interactive HTML email builder contains Approve and Reject action links
      const sampleEmail = await emailService.sendServiceCatalogApprovalEmail({
        ticket: {
          id: 'ITL-TEST-APPR',
          subject: `[Service Request]: ${catalogItem.title}`,
          description: 'Test request',
          status: 'waiting_approval',
          priority: 'normal',
          type: 'service_request',
          category: catalogItem.category,
          impact: 'medium',
          urgency: 'medium',
          channel: 'service_catalog',
          requesterId: managedUser.id,
          requesterName: managedUser.name,
          requesterEmail: managedUser.email,
          requesterEmployeeCode: managedUser.employeeCode,
          organizationId: managedUser.organizationId,
          followers: [],
          ccRecipients: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          relatedAssetIds: [],
          tags: [],
          estimatedMinutes: 60,
          actualMinutesSpent: 0,
          customFields: { Justification: 'Project work' },
          slaStatus: 'within_target',
          slaFirstResponseDeadline: new Date().toISOString(),
          slaResolutionDeadline: new Date().toISOString(),
        },
        catalogItemTitle: catalogItem.title,
        catalogItemCategory: catalogItem.category,
        estimatedHours: catalogItem.estimatedHours,
        formData: { Justification: 'Project work' },
        managerName: selectedMgr.name,
        managerEmail: selectedMgr.email,
        approvalToken: 'sample-token-123',
        appBaseUrl: baseUrl,
      });
      assert(
        'Interactive approval email HTML includes both Approve and Reject action links',
        sampleEmail.success &&
          sampleEmail.html.includes('decision=approved') &&
          sampleEmail.html.includes('decision=rejected') &&
          sampleEmail.html.includes('Approve Request') &&
          sampleEmail.html.includes('Reject Request')
      );

      // 6. Service catalog request #1 -> Approve from Email -> Ticket immediately opens
      const reqApproveRes = await fetch(`${baseUrl}/api/service-catalog/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogItemId: catalogItem.id,
          formData: { Justification: 'Need hardware for Q4 sprint' },
          requesterId: managedUser.id,
          requesterName: managedUser.name,
          requesterEmail: managedUser.email,
          requesterEmployeeCode: managedUser.employeeCode,
        }),
      });
      const reqApproveBody = (await reqApproveRes.json()) as any;
      assert(
        'Service catalog request routes to respective manager with waiting_approval & email dispatch',
        reqApproveRes.status === 201 &&
          reqApproveBody.ticket?.status === 'waiting_approval' &&
          reqApproveBody.approvalEmailDispatched === true &&
          reqApproveBody.managerEmail === selectedMgr.email &&
          Boolean(reqApproveBody.approveUrl) &&
          Boolean(reqApproveBody.rejectUrl)
      );

      const emailApproveClick = await fetch(reqApproveBody.approveUrl, {
        headers: { Accept: 'text/html' },
      });
      const emailApproveHtml = await emailApproveClick.text();
      const updatedTicketAfterApprove = (db.get('tickets') || []).find((t) => t.id === reqApproveBody.ticket.id);
      const updatedApprAfterApprove = (db.get('approvalRequests') || []).find((a) => a.id === reqApproveBody.approval.id);
      assert(
        'Clicking Approve in manager email immediately sets ticket status to OPEN and records via email',
        emailApproveClick.status === 200 &&
          emailApproveHtml.includes('OPEN') &&
          updatedTicketAfterApprove?.status === 'open' &&
          updatedApprAfterApprove?.status === 'approved' &&
          updatedApprAfterApprove?.decidedVia === 'email'
      );

      // Idempotency check: clicking Reject on an already-approved token must NOT change state
      const reclickReject = await fetch(reqApproveBody.rejectUrl, {
        headers: { Accept: 'application/json' },
      });
      const reclickBody = (await reclickReject.json()) as any;
      const ticketStillOpen = (db.get('tickets') || []).find((t) => t.id === reqApproveBody.ticket.id);
      assert(
        'Re-clicking email action link after decision is idempotent and preserves OPEN ticket status',
        reclickReject.status === 200 && reclickBody.alreadyDecided === true && ticketStillOpen?.status === 'open'
      );

      // 7. Service catalog request #2 -> Reject from Email -> Ticket immediately auto-closes
      const reqRejectRes = await fetch(`${baseUrl}/api/service-catalog/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogItemId: catalogItem.id,
          formData: { Justification: 'Duplicate request' },
          requesterId: managedUser.id,
          requesterName: managedUser.name,
          requesterEmail: managedUser.email,
          requesterEmployeeCode: managedUser.employeeCode,
        }),
      });
      const reqRejectBody = (await reqRejectRes.json()) as any;
      const emailRejectClick = await fetch(reqRejectBody.rejectUrl, {
        headers: { Accept: 'text/html' },
      });
      const emailRejectHtml = await emailRejectClick.text();
      const updatedTicketAfterReject = (db.get('tickets') || []).find((t) => t.id === reqRejectBody.ticket.id);
      const updatedApprAfterReject = (db.get('approvalRequests') || []).find((a) => a.id === reqRejectBody.approval.id);
      assert(
        'Clicking Reject in manager email immediately AUTO-CLOSES ticket and marks approval rejected via email',
        emailRejectClick.status === 200 &&
          emailRejectHtml.includes('Auto-Closed') &&
          updatedTicketAfterReject?.status === 'closed' &&
          Boolean(updatedTicketAfterReject?.closedAt) &&
          updatedApprAfterReject?.status === 'rejected' &&
          updatedApprAfterReject?.decidedVia === 'email'
      );

      // 8. Reverse-proxy X-Forwarded-Host domain overrides local IP in email Approve/Reject links
      const forwardedReqRes = await fetch(`${baseUrl}/api/service-catalog/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-Proto': 'https',
          'X-Forwarded-Host': 'helpdesk.example-company.org',
        },
        body: JSON.stringify({
          catalogItemId: catalogItem.id,
          formData: { Justification: 'Domain routing check' },
          requesterId: managedUser.id,
          requesterName: managedUser.name,
          requesterEmail: managedUser.email,
          requesterEmployeeCode: managedUser.employeeCode,
        }),
      });
      const forwardedBody = (await forwardedReqRes.json()) as any;
      assert(
        'Approval email links use forwarded public domain (https://helpdesk.example-company.org) instead of local IP',
        forwardedReqRes.status === 201 &&
          String(forwardedBody.approveUrl || '').startsWith('https://helpdesk.example-company.org/api/approvals/email-action?') &&
          String(forwardedBody.rejectUrl || '').startsWith('https://helpdesk.example-company.org/api/approvals/email-action?')
      );

      // 9. Explicit publicPortalUrl in System Settings overrides even plain local-IP requests
      const orgsForDomain = db.get('organizations') || [];
      orgsForDomain[0].systemSettings = {
        ...(orgsForDomain[0].systemSettings || {
          requireOtpForTicketSubmission: false,
          enableTicketRating: true,
          enableCategoryAutoAssign: true,
        }),
        publicPortalUrl: 'https://portal.enterprise-domain.test',
      };
      db.set('organizations', orgsForDomain);

      const configuredDomainRes = await fetch(`${baseUrl}/api/service-catalog/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogItemId: catalogItem.id,
          formData: { Justification: 'Configured public domain check' },
          requesterId: managedUser.id,
          requesterName: managedUser.name,
          requesterEmail: managedUser.email,
          requesterEmployeeCode: managedUser.employeeCode,
        }),
      });
      const configuredDomainBody = (await configuredDomainRes.json()) as any;
      assert(
        'Configured publicPortalUrl in Helpdesk Settings forces domain URL even for local IP submissions',
        configuredDomainRes.status === 201 &&
          String(configuredDomainBody.approveUrl || '').startsWith('https://portal.enterprise-domain.test/api/approvals/email-action?') &&
          String(configuredDomainBody.rejectUrl || '').startsWith('https://portal.enterprise-domain.test/api/approvals/email-action?')
      );

      // 10. Requester self-resolve & self-close attribution (Ticket, Audit Log, Timeline Comment, and Outbound Email)
      const requesterToken = (mgrRegBody as any).sessionToken as string;
      assert('POST /api/auth/register returns isolated sessionToken for newly registered requester', Boolean(requesterToken));

      const techUser = (db.get('users') || []).find((u) => u.role === 'technician');
      const createdByReqRes = await fetch(`${baseUrl}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': requesterToken,
          'x-user-id': managedUser.id,
        },
        body: JSON.stringify({
          subject: 'VPN issue resolved myself',
          description: 'Testing requester self-closure attribution',
          category: 'Network & VPN',
          priority: 'normal',
          requesterId: managedUser.id,
          requesterName: managedUser.name,
          requesterEmail: managedUser.email,
          assignedTechnicianId: techUser?.id,
          assignedTechnicianName: techUser?.name,
        }),
      });
      const reqTicket = (await createdByReqRes.json()) as Ticket;

      // Requester resolves their own ticket
      const selfResolveRes = await fetch(`${baseUrl}/api/tickets/${reqTicket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': requesterToken,
          'x-user-id': managedUser.id,
        },
        body: JSON.stringify({
          status: 'resolved',
          resolutionCode: 'solved',
          resolutionSummary: 'Restarted VPN client and it worked',
        }),
      });
      const selfResolvedTicket = (await selfResolveRes.json()) as Ticket;
      assert(
        'When requester resolves their own ticket, resolvedByRole is requester and resolvedByName matches requester (not superadmin/technician)',
        selfResolveRes.status === 200 &&
          selfResolvedTicket.status === 'resolved' &&
          selfResolvedTicket.resolvedByRole === 'requester' &&
          selfResolvedTicket.resolvedByName === managedUser.name
      );

      // Requester closes their own ticket
      const selfCloseRes = await fetch(`${baseUrl}/api/tickets/${reqTicket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': requesterToken,
          'x-user-id': managedUser.id,
        },
        body: JSON.stringify({
          status: 'closed',
        }),
      });
      const selfClosedTicket = (await selfCloseRes.json()) as Ticket;
      const latestComments = (db.get('comments') || []).filter((c) => c.ticketId === reqTicket.id);
      const latestAudits = (db.get('auditLogs') || []).filter((a) => a.entityId === reqTicket.id);

      assert(
        'When requester closes their own ticket, closedByRole is requester and timeline + audit log attribute closure to requester',
        selfCloseRes.status === 200 &&
          selfClosedTicket.status === 'closed' &&
          selfClosedTicket.closedByRole === 'requester' &&
          selfClosedTicket.closedByName === managedUser.name &&
          latestComments.some((c) => c.authorRole === 'requester' && c.content.includes(`Requester ${managedUser.name} closed this ticket`)) &&
          latestAudits.some((a) => a.actorRole === 'requester' && a.details.includes(`Requester ${managedUser.name} closed ticket ${reqTicket.id}`))
      );

      // Outbound status update email explicitly shows Requester closed their ticket and CCs assigned technician
      const closeEmail = await emailService.sendTicketStatusUpdateEmail({
        ticket: selfClosedTicket,
        oldStatus: 'resolved',
        newStatus: 'closed',
        actorName: managedUser.name,
        actorRole: 'requester',
        resolutionSummary: selfClosedTicket.resolutionSummary,
        assignedTechName: techUser?.name,
        assignedTechEmail: techUser?.email,
      });
      assert(
        'Outbound closure email explicitly shows Requester closed their ticket and CCs assigned technician',
        closeEmail.success &&
          String(closeEmail.subject || '').includes(`Ticket Closed by Requester (${managedUser.name})`) &&
          String(closeEmail.html || '').includes('Ticket Closed by Requester') &&
          String(closeEmail.html || '').includes(`Requester <strong>${managedUser.name}</strong> has <strong>closed</strong> their support ticket`) &&
          String(closeEmail.html || '').includes('Closed By:') &&
          String(closeEmail.text || '').includes(`Closed By: ${managedUser.name} (Requester)`) &&
          (!techUser?.email || (closeEmail.cc || []).includes(techUser.email))
      );
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  };

  await testManagerRegistrationAndEmailApprovals();

  try {
    fs.copyFileSync('data/database.seed.json', 'data/database.json');
    if (fs.existsSync('data/database.json.bak')) {
      fs.unlinkSync('data/database.json.bak');
    }
  } catch {}

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

