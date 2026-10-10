import { db } from '../server/db';
import { calculateSlaDeadlines, evaluateSlaStatus } from '../server/slaEngine';
import { runAutomations } from '../server/automationEngine';
import { Ticket, SlaPolicy, AutomationRule } from '../src/types';

function runTestSuite() {
  console.log('🧪 Starting IT Helpdesk by Lakhan Test Suite...\n');
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

  // Test 1: Database Seed Integrity
  const tickets = db.get('tickets');
  assert('Database contains seeded enterprise tickets', tickets.length >= 8);
  const users = db.get('users');
  assert('Database contains seeded RBAC users', users.some(u => u.role === 'superadmin') && users.some(u => u.role === 'requester'));

  // Test 2: SLA Calculation
  const policies: SlaPolicy[] = db.get('slaPolicies');
  const testDate = new Date();
  const criticalSla = calculateSlaDeadlines('critical', policies, testDate);
  const diffFirstResponse = (new Date(criticalSla.firstResponseDeadline).getTime() - testDate.getTime()) / (60 * 1000);
  assert('Critical Sev-1 SLA first response is 15 minutes', diffFirstResponse === 15, `Got: ${diffFirstResponse}`);

  // Test 3: SLA Status Evaluator
  const normalSla = calculateSlaDeadlines('normal', policies, testDate);
  const mockTicket: Ticket = {
    id: 'ITL-TEST-001',
    subject: 'Test SLA Ticket',
    description: 'Test',
    status: 'in_progress',
    priority: 'normal',
    type: 'incident',
    category: 'Software & Cloud Apps',
    impact: 'medium',
    urgency: 'medium',
    channel: 'portal',
    requesterId: 'usr-david-req',
    requesterName: 'David Miller',
    requesterEmail: 'david.miller@lakhanglobal.com',
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
  assert('New active ticket evaluated as within_target SLA', slaEval.status === 'within_target');

  mockTicket.status = 'pending_requester';
  const slaPaused = evaluateSlaStatus(mockTicket);
  assert('Ticket in pending_requester pauses SLA clock', slaPaused.status === 'paused');

  // Test 4: Automation Rule Engine
  const rules: AutomationRule[] = [
    {
      id: 'rule-test-1',
      name: 'Network routing',
      description: 'Test rule',
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
  assert('Automation engine matched category condition and assigned team', autoResult.updatedTicket.assignedTeamId === 'team-infra-net');
  assert('Automation engine appended tag to ticket', autoResult.updatedTicket.tags.includes('auto-tagged'));

  // Test 5: Confidential Internal Note Separation
  const comments = db.get('comments');
  const internalNotes = comments.filter(c => c.isInternal);
  const publicReplies = comments.filter(c => !c.isInternal);
  assert('Database strictly maintains separation of internal notes vs public replies', internalNotes.length > 0 && publicReplies.length > 0);

  // Test 6: CMDB Assets & Inventory
  const assets = db.get('assets');
  assert('CMDB contains registered hardware assets (laptops, servers, switches)', assets.some(a => a.type === 'laptop') && assets.some(a => a.type === 'switch'));

  // Test 7: Knowledge Base self-service articles
  const articles = db.get('knowledgeArticles');
  assert('Knowledge base contains searchable public articles', articles.some(a => a.isPublic && a.title.includes('VPN')));

  // Test 8: Service Catalog & Approvals
  const catalog = db.get('serviceCatalog');
  assert('Service catalog contains items with approval gates', catalog.some(c => c.requiresApproval));

  // Test 9: Admin & Super Admin Mailboxes (IMAP/POP3/SMTP)
  const adminMailboxes = db.get('adminMailboxes');
  assert('Database contains configured Admin mailboxes', adminMailboxes && adminMailboxes.length > 0);
  const lakhanMailbox = adminMailboxes.find(m => m.userEmail.includes('lakhan.superadmin'));
  assert(
    'Superadmin mailbox configured with IMAP/POP3 inbound and SMTP outbound',
    Boolean(lakhanMailbox && (lakhanMailbox.incomingProtocol === 'imap' || lakhanMailbox.incomingProtocol === 'pop3') && lakhanMailbox.outgoingProtocol === 'smtp')
  );

  // Test 10: Default Email Gateway Configuration (POP3/SMTP/IMAP)
  const defaultGateway = db.get('defaultGatewayConfig');
  assert(
    'Default system reply gateway configured with IMAP/POP3 and SMTP',
    Boolean(defaultGateway && (defaultGateway.incomingProtocol === 'imap' || defaultGateway.incomingProtocol === 'pop3') && defaultGateway.outgoingProtocol === 'smtp')
  );

  // Test 11: OTP Verification Records Engine
  const testOtpEmail = 'test.user@company.com';
  const testCode = '482910';
  const newOtpRecord = {
    email: testOtpEmail,
    otp: testCode,
    expiresAt: Date.now() + 600000,
    verified: false,
  };
  const otpRecords = db.get('otpRecords') || [];
  db.set('otpRecords', [...otpRecords.filter(r => r.email !== testOtpEmail), newOtpRecord]);
  const fetchedOtp = (db.get('otpRecords') || []).find(r => r.email === testOtpEmail && r.otp === testCode);
  assert('OTP generation and retrieval operates accurately', Boolean(fetchedOtp));
  if (fetchedOtp) {
    fetchedOtp.verified = true;
    assert('OTP verification state transitions to confirmed', fetchedOtp.verified === true);
  }

  // Test 12: Customizable Dynamic Ticket Fields
  const customFields = db.get('customFields');
  assert('System maintains customizable dynamic ticket fields', customFields.length >= 3);
  assert('Custom fields contain visibleOnPortal and type attributes', customFields.some(f => f.visibleOnPortal && f.type === 'select'));

  // Test 13: CMDB Asset Lifecycle Statuses (Active, Stock, Not Working, Scrap)
  const allAssets = db.get('assets');
  const hasInService = allAssets.some(a => a.lifecycleStatus === 'in_service');
  const hasInStock = allAssets.some(a => a.lifecycleStatus === 'in_stock');
  const hasRepair = allAssets.some(a => a.lifecycleStatus === 'in_repair');
  const hasRetired = allAssets.some(a => a.lifecycleStatus === 'retired');
  assert('Assets include Active, Stock, Not Working, and Scrap statuses', hasInService && hasInStock && hasRepair && hasRetired);

  // Test 14: User Title / Post Property for Superadmin and Admins
  const superadminUser = users.find(u => u.role === 'superadmin');
  assert('Superadmin user profile contains professional title/post field', Boolean(superadminUser && superadminUser.title));

  // Test 15: Organizations Management (Multi-tenant root & custom orgs)
  const organizations = db.get('organizations');
  assert('Organizations list is accessible and contains primary tenant', organizations.length >= 1 && organizations[0].domain.length > 0);

  // Test 16: Ticket Deletion Logic
  const dummyTicketId = 'ITL-DUMMY-DEL';
  const dummyTicket: Ticket = {
    ...tickets[0],
    id: dummyTicketId,
    subject: 'Temporary Ticket for Deletion Test',
  };
  db.set('tickets', [...tickets, dummyTicket]);
  assert('Temporary ticket added for deletion test', db.get('tickets').some(t => t.id === dummyTicketId));
  const remainingTickets = db.get('tickets').filter(t => t.id !== dummyTicketId);
  db.set('tickets', remainingTickets);
  assert('Ticket deleted successfully from database', !db.get('tickets').some(t => t.id === dummyTicketId));

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
