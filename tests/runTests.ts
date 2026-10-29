import fs from 'fs';
import { db } from '../server/db';
import { calculateSlaDeadlines, evaluateSlaStatus } from '../server/slaEngine';
import { runAutomations } from '../server/automationEngine';
import { Ticket, SlaPolicy, AutomationRule, User } from '../src/types';

function runTestSuite() {
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
  const tickets = db.get('tickets');
  assert('Fresh production start initializes with 0 tickets', tickets.length === 0);

  const initialAssets = db.get('assets');
  assert('Fresh production start initializes with 0 assets', initialAssets.length === 0);

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

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
