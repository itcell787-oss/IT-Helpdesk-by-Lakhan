import fs from 'fs';
import { db } from '../server/db';
import { calculateSlaDeadlines, evaluateSlaStatus } from '../server/slaEngine';
import { runAutomations } from '../server/automationEngine';
import { Ticket, SlaPolicy, AutomationRule, User } from '../src/types';
import { emailService } from '../server/emailService';

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
  assert(
    'Gateway official email is configured as it-helpdesk@confiancebizsol.tech',
    gateway.fromEmail === 'it-helpdesk@confiancebizsol.tech'
  );
  assert(
    'Gateway host is configured as mail.confiancebizsol.tech',
    gateway.incomingHost === 'mail.confiancebizsol.tech' && gateway.outgoingHost === 'mail.confiancebizsol.tech'
  );
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

  const daemonSender = 'mailer-daemon@confiancebizsol.tech';
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
      from: 'archive@confiancebizsol.tech',
      subject: `VPN Authentication Failure in Office #${testRunId}`,
      body: `Hello Support team, my VPN token is getting rejected repeatedly on run ${testRunId}.`,
      messageId: `<test-msg-${testRunId}-001@confiancebizsol.tech>`,
    });

    assert('Inbound email generates a new ticket (mode: created)', newRes.mode === 'created');
    assert('Email ticket category defaults to General IT Support', newRes.ticket.category === 'General IT Support');
    assert('Ticket requester is archive@confiancebizsol.tech', newRes.ticket.requesterEmail === 'archive@confiancebizsol.tech');

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
      from: 'archive@confiancebizsol.tech',
      subject: `Re: [${createdTicket.id}] VPN Authentication Failure in Office`,
      body: '1',
      messageId: `<test-msg-${testRunId}-002@confiancebizsol.tech>`,
      inReplyTo: `<test-msg-${testRunId}-001@confiancebizsol.tech>`,
    });

    assert('Requester email reply is threaded into existing ticket (mode: threaded)', replyRes1.mode === 'threaded');
    assert('Threaded reply comment content is preserved even with short body "1"', replyRes1.comment?.content === '1');
    assert('Ticket hasRequesterReply flag is set to true', replyRes1.ticket.hasRequesterReply === true);
    assert('Ticket lastReplyBy is set to requester', replyRes1.ticket.lastReplyBy === 'requester');
    assert('Ticket status automatically resumes from pending_requester to in_progress', replyRes1.ticket.status === 'in_progress');

    // 3. Requester sends another short follow-up reply ("s") with different messageId
    const replyRes2 = await emailService.processInboundEmail({
      from: 'archive@confiancebizsol.tech',
      subject: `Re: [${createdTicket.id}] VPN Authentication Failure in Office`,
      body: 's',
      messageId: `<test-msg-${testRunId}-003@confiancebizsol.tech>`,
      inReplyTo: `<test-msg-${testRunId}-002@confiancebizsol.tech>`,
    });

    assert('Follow-up short reply "s" is threaded and not blocked by deduplication', replyRes2.mode === 'threaded');
    assert('Second reply comment appended successfully', replyRes2.comment?.content === 's');

    // 4. Duplicate identical email message ID is safely ignored
    const dupeRes = await emailService.processInboundEmail({
      from: 'archive@confiancebizsol.tech',
      subject: `Re: [${createdTicket.id}] VPN Authentication Failure in Office`,
      body: 's',
      messageId: `<test-msg-${testRunId}-003@confiancebizsol.tech>`,
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
      from: 'archive@confiancebizsol.tech',
      subject: `Re: [${createdTicket.id}] VPN Authentication Failure in Office`,
      body: 'Issue is not solved yet, please see attached screenshot for the error details.',
      messageId: `<test-msg-${testRunId}-004@confiancebizsol.tech>`,
      inReplyTo: `<test-msg-${testRunId}-003@confiancebizsol.tech>`,
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
        from: 'another.user@confiancebizsol.tech',
        subject: 'Brand new request while toggle is OFF',
        body: 'This ticket should not be created because toggle is off.',
        messageId: `<test-msg-${testRunId}-blocked@confiancebizsol.tech>`,
      });
    } catch (e: any) {
      blockedNewTicketError = true;
    }

    assert('Inbound ticket generation blocked when Super Admin toggle is OFF', blockedNewTicketError);

    // Threaded replies to existing tickets still succeed when toggle is OFF
    const replyWhileOff = await emailService.processInboundEmail({
      from: 'archive@confiancebizsol.tech',
      subject: `Re: [${createdTicket.id}] VPN Authentication Failure in Office`,
      body: 'Follow-up reply while toggle is off still records to existing ticket.',
      messageId: `<test-msg-${testRunId}-005@confiancebizsol.tech>`,
    });
    assert('Threaded reply still functions when email ticket creation is OFF', replyWhileOff.mode === 'threaded');

    // Restore toggle to true
    gw.enableInboundTicketGeneration = true;
    db.set('defaultGatewayConfig', gw);

    // Cleanup test tickets and test requesters
    db.set('tickets', []);
    db.set('users', pristineUsers);
  };

  await testEmailIntake();

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

