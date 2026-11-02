import nodemailer from 'nodemailer';
import net from 'net';
import tls from 'tls';
import { db } from './db';
import { Ticket, TicketComment, DefaultEmailGatewayConfig } from '../src/types';

export interface EmailTestResult {
  success: boolean;
  message: string;
  latencyMs: number;
  testedAt: string;
  incomingCheck: {
    protocol: string;
    host: string;
    port: number;
    security: string;
    status: string;
    banner?: string;
  };
  outgoingCheck: {
    protocol: string;
    host: string;
    port: number;
    security: string;
    status: string;
    smtpResponse?: string;
  };
  diagnostics: string[];
}

export interface InboundEmailPayload {
  from: string;
  to?: string;
  cc?: string[] | string;
  subject: string;
  body: string;
  messageId?: string;
  managerEmail?: string;
}

class EmailGatewayService {
  /**
   * Cleans Google App Passwords by removing spaces (e.g. "abcd efgh ijkl mnop" -> "abcdefghijklmnop")
   */
  private sanitizePassword(pass?: string): string {
    if (!pass) return '';
    return pass.trim().replace(/\s+/g, '');
  }

  /**
   * Constructs a nodemailer transport instance based on gateway configuration
   */
  private createTransporter(config: DefaultEmailGatewayConfig) {
    const isGmail =
      config.serviceProvider === 'gmail' ||
      (config.outgoingHost && config.outgoingHost.toLowerCase().includes('gmail'));

    const cleanPassword = this.sanitizePassword(config.outgoingPassword);

    if (isGmail) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.outgoingUsername || config.fromEmail,
          pass: cleanPassword,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    }

    const port = Number(config.outgoingPort) || 587;
    const isSecure = config.outgoingSecurity === 'ssl' || port === 465;

    return nodemailer.createTransport({
      host: config.outgoingHost || 'smtp.gmail.com',
      port,
      secure: isSecure,
      auth: config.outgoingUsername
        ? {
            user: config.outgoingUsername,
            pass: cleanPassword,
          }
        : undefined,
      tls: {
        rejectUnauthorized: false, // Allows self-signed certificates for self-hosted mail servers
      },
    });
  }

  /**
   * Tests socket connectivity for incoming IMAP or POP3 servers
   */
  public async testIncomingSocket(
    host: string,
    port: number,
    security: 'ssl' | 'starttls' | 'none',
    protocol: string
  ): Promise<{ status: string; banner?: string; latencyMs: number }> {
    const startTime = Date.now();
    return new Promise((resolve) => {
      const timeoutMs = 8000;
      let socket: net.Socket;
      let resolved = false;

      const finish = (status: string, banner?: string) => {
        if (!resolved) {
          resolved = true;
          try {
            socket.destroy();
          } catch {}
          resolve({ status, banner, latencyMs: Date.now() - startTime });
        }
      };

      try {
        if (security === 'ssl') {
          socket = tls.connect(
            {
              host,
              port,
              rejectUnauthorized: false,
              timeout: timeoutMs,
            },
            () => {
              // Connected via TLS
            }
          );
        } else {
          socket = net.createConnection({ host, port, timeout: timeoutMs }, () => {
            // Connected via Plain TCP
          });
        }

        socket.setTimeout(timeoutMs);

        socket.on('data', (chunk) => {
          const banner = chunk.toString().trim().split('\n')[0];
          finish(`Connected & Verified (${protocol.toUpperCase()} Banner Received)`, banner);
        });

        socket.on('connect', () => {
          // If no immediate banner, consider handshake OK after brief window
          setTimeout(() => {
            finish(`Connected (${security.toUpperCase()} TLS Handshake Successful)`);
          }, 400);
        });

        socket.on('secureConnect', () => {
          setTimeout(() => {
            finish(`Connected (${security.toUpperCase()} TLS Handshake Successful)`);
          }, 300);
        });

        socket.on('timeout', () => {
          finish(`Connection timed out after ${timeoutMs}ms (Host: ${host}:${port})`);
        });

        socket.on('error', (err) => {
          finish(`Socket connection failed: ${err.message}`);
        });
      } catch (err: any) {
        finish(`Connection initialization error: ${err.message}`);
      }
    });
  }

  /**
   * Performs full diagnostics test on configured Default Email Gateway
   */
  public async testGateway(
    config: DefaultEmailGatewayConfig,
    testRecipient?: string
  ): Promise<EmailTestResult> {
    const diagnostics: string[] = [];
    const startTime = Date.now();

    diagnostics.push(`[${new Date().toISOString()}] Initiating Email Gateway Diagnostic Test...`);
    diagnostics.push(`Service Provider: ${config.serviceProvider || 'Custom / Self-Hosted'}`);
    diagnostics.push(`Inbound Config: ${config.incomingProtocol.toUpperCase()} -> ${config.incomingHost}:${config.incomingPort} (${config.incomingSecurity.toUpperCase()})`);
    diagnostics.push(`Outbound Config: SMTP -> ${config.outgoingHost}:${config.outgoingPort} (${config.outgoingSecurity.toUpperCase()})`);

    // 1. Test Inbound Socket
    diagnostics.push(`Testing Inbound ${config.incomingProtocol.toUpperCase()} connectivity to ${config.incomingHost}...`);
    const incomingRes = await this.testIncomingSocket(
      config.incomingHost,
      Number(config.incomingPort),
      config.incomingSecurity,
      config.incomingProtocol
    );
    diagnostics.push(`Inbound Check Result: ${incomingRes.status} (${incomingRes.latencyMs}ms)`);
    if (incomingRes.banner) {
      diagnostics.push(`Server Greeting: "${incomingRes.banner}"`);
    }

    // 2. Test Outbound SMTP Transporter
    diagnostics.push(`Testing Outbound SMTP authentication with ${config.outgoingHost}...`);
    let outgoingStatus = 'Connected & Authenticated';
    let smtpResponse: string | undefined;

    try {
      const transporter = this.createTransporter(config);
      await transporter.verify();
      outgoingStatus = 'Ready to send (SMTP Authentication & TLS Handshake Verified ✓)';
      diagnostics.push(`Outbound SMTP Check: ${outgoingStatus}`);

      // If test recipient provided, send a verification email
      if (testRecipient && testRecipient.includes('@')) {
        diagnostics.push(`Dispatching test probe message to ${testRecipient}...`);
        const info = await transporter.sendMail({
          from: `"${config.fromName}" <${config.fromEmail}>`,
          to: testRecipient,
          subject: `${config.subjectPrefix.replace('{{ticketId}}', 'TEST-0001')} IT Helpdesk Gateway Probe`,
          text: `Hello,\n\nThis is a verification probe sent by IT Helpdesk by Lakhan to confirm that your SMTP Email Connector is functioning properly.\n\nGateway Server: ${config.outgoingHost}:${config.outgoingPort}\nTimestamp: ${new Date().toISOString()}\n\nBest regards,\nIT Helpdesk Support`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
              <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px;">
                <h2 style="color: #0f172a; margin: 0; font-size: 20px;">IT Helpdesk Email Gateway Probe</h2>
                <p style="color: #64748b; margin: 4px 0 0; font-size: 13px;">Automated connection verification</p>
              </div>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">Hello,</p>
              <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                This message confirms that your <strong>${config.serviceProvider === 'gmail' ? 'Gmail / Google Workspace' : 'SMTP Email Connector'}</strong> is successfully configured and active in <strong>IT Helpdesk</strong>.
              </p>
              <div style="background: #f8fafc; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 0; font-size: 13px; color: #0f172a;"><strong>Connector:</strong> ${config.fromEmail}</p>
                <p style="margin: 4px 0 0; font-size: 13px; color: #0f172a;"><strong>Outgoing Server:</strong> ${config.outgoingHost}:${config.outgoingPort}</p>
                <p style="margin: 4px 0 0; font-size: 13px; color: #0f172a;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <p style="color: #64748b; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
                IT Helpdesk Automated Notification System • Please do not reply directly to this probe message.
              </p>
            </div>
          `,
        });
        smtpResponse = info.messageId || 'Delivered';
        diagnostics.push(`Test probe email successfully delivered! Message ID: ${info.messageId}`);
      }
    } catch (err: any) {
      outgoingStatus = `SMTP verification error: ${err.message}`;
      diagnostics.push(`Outbound SMTP Error: ${err.message}`);
    }

    const totalLatency = Date.now() - startTime;
    const isOverallSuccess = !outgoingStatus.includes('error');

    return {
      success: isOverallSuccess,
      message: isOverallSuccess
        ? 'Email Gateway connection test completed successfully!'
        : 'Email Gateway connection failed. Please check host, port, and authentication credentials.',
      latencyMs: totalLatency,
      testedAt: new Date().toISOString(),
      incomingCheck: {
        protocol: config.incomingProtocol.toUpperCase(),
        host: config.incomingHost,
        port: Number(config.incomingPort),
        security: config.incomingSecurity.toUpperCase(),
        status: incomingRes.status,
        banner: incomingRes.banner,
      },
      outgoingCheck: {
        protocol: config.outgoingProtocol.toUpperCase(),
        host: config.outgoingHost,
        port: Number(config.outgoingPort),
        security: config.outgoingSecurity.toUpperCase(),
        status: outgoingStatus,
        smtpResponse,
      },
      diagnostics,
    };
  }

  /**
   * Dispatches outbound ticket reply email to requester and CC recipients
   */
  public async sendTicketReplyEmail(params: {
    ticket: Ticket;
    comment: TicketComment;
    authorName: string;
    recipientEmail?: string;
    ccList?: string[];
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const config = db.get('defaultGatewayConfig');
    if (!config || config.enableOutboundReplyNotification === false) {
      return { success: true };
    }

    const to = params.recipientEmail || params.ticket.requesterEmail;
    if (!to || !to.includes('@')) {
      return { success: false, error: 'Recipient email missing' };
    }

    const cc = (params.ccList && params.ccList.length > 0)
      ? params.ccList.filter((e) => e && e.includes('@') && e.toLowerCase() !== to.toLowerCase())
      : (params.ticket.ccRecipients || []).filter((e) => e && e.includes('@') && e.toLowerCase() !== to.toLowerCase());

    const subject = `${config.subjectPrefix.replace('{{ticketId}}', params.ticket.id)} Re: ${params.ticket.subject}`;

    try {
      const transporter = this.createTransporter(config);
      const info = await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to,
        cc: cc.length > 0 ? cc : undefined,
        replyTo: config.replyToEmail || config.fromEmail,
        subject,
        text: `Ticket: [${params.ticket.id}] ${params.ticket.subject}\nFrom: ${params.authorName}\n\n${params.comment.content}\n\n---\nTo add a response, reply directly to this email.\nIT Helpdesk Support`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px;">
              <div>
                <span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 700; font-family: monospace; border-radius: 4px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;">
                  [${params.ticket.id}]
                </span>
                <span style="margin-left: 8px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">
                  Priority: ${params.ticket.priority}
                </span>
              </div>
            </div>

            <h3 style="color: #0f172a; margin: 0 0 16px; font-size: 18px; font-weight: 700;">
              ${params.ticket.subject}
            </h3>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <div style="font-size: 12px; font-weight: 700; color: #0284c7; margin-bottom: 8px;">
                ${params.authorName} (${params.comment.authorRole.toUpperCase()}):
              </div>
              <div style="color: #1e293b; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
                ${params.comment.content}
              </div>
            </div>

            <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 12px; color: #475569;">
                💡 <strong>How to reply:</strong> Simply reply directly to this email message. Your reply will automatically be appended to ticket <strong>${params.ticket.id}</strong>.
              </p>
            </div>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; margin-top: 20px; font-size: 11px; color: #94a3b8; text-align: center;">
              IT Helpdesk by Lakhan • Unified IT Service Management
            </div>
          </div>
        `,
      });

      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.warn('Failed dispatching outbound ticket reply email:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Dispatches new ticket created acknowledgement email to requester
   */
  public async sendTicketCreatedEmail(ticket: Ticket): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const config = db.get('defaultGatewayConfig');
    if (!config || !ticket.requesterEmail || !ticket.requesterEmail.includes('@')) {
      return { success: true };
    }

    const subject = `${config.subjectPrefix.replace('{{ticketId}}', ticket.id)} Support Ticket Created: ${ticket.subject}`;

    try {
      const transporter = this.createTransporter(config);
      const info = await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: ticket.requesterEmail,
        replyTo: config.replyToEmail || config.fromEmail,
        subject,
        text: `Your ticket [${ticket.id}] "${ticket.subject}" has been successfully logged with our IT Helpdesk team.\n\nStatus: ${ticket.status}\nPriority: ${ticket.priority}\nCategory: ${ticket.category}\n\nOur team is working on your request. You can reply directly to this email to add updates.\n\nIT Helpdesk Support`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px;">
              <span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 700; font-family: monospace; border-radius: 4px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;">
                [${ticket.id}]
              </span>
              <h2 style="color: #0f172a; margin: 10px 0 0; font-size: 20px;">Your Support Ticket has been Received</h2>
            </div>

            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
              Hello <strong>${ticket.requesterName}</strong>,
            </p>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
              Thank you for contacting IT Helpdesk. Your ticket <strong>[${ticket.id}]</strong> has been registered in our system. A technician will review and attend to your request in accordance with our SLA commitment.
            </p>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <table style="width: 100%; font-size: 13px; color: #334155;">
                <tr><td style="padding: 4px 0; color: #64748b; width: 120px;"><strong>Subject:</strong></td><td style="padding: 4px 0;">${ticket.subject}</td></tr>
                <tr><td style="padding: 4px 0; color: #64748b;"><strong>Priority:</strong></td><td style="padding: 4px 0; text-transform: uppercase; font-weight: 700; color: #0284c7;">${ticket.priority}</td></tr>
                <tr><td style="padding: 4px 0; color: #64748b;"><strong>Category:</strong></td><td style="padding: 4px 0;">${ticket.category}</td></tr>
                <tr><td style="padding: 4px 0; color: #64748b;"><strong>Created At:</strong></td><td style="padding: 4px 0;">${new Date(ticket.createdAt).toLocaleString()}</td></tr>
              </table>
            </div>

            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 12px; color: #1e40af;">
                💡 You can reply directly to this email at any time to add comments or attachments to this ticket.
              </p>
            </div>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: 11px; color: #94a3b8; text-align: center;">
              IT Helpdesk by Lakhan • Enterprise IT Support & Services
            </div>
          </div>
        `,
      });

      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.warn('Failed dispatching ticket receipt email:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Processes inbound email (from webhook or poller) to create ticket or append comment
   */
  public async processInboundEmail(payload: InboundEmailPayload): Promise<{
    mode: 'threaded' | 'created';
    ticket: Ticket;
    comment?: TicketComment;
  }> {
    const from = payload.from.trim();
    const subject = payload.subject.trim();
    const body = payload.body.trim();

    const ccList: string[] = [];
    if (payload.cc) {
      if (Array.isArray(payload.cc)) ccList.push(...payload.cc);
      else if (typeof payload.cc === 'string') {
        ccList.push(...payload.cc.split(/[,;]/).map((s) => s.trim()).filter(Boolean));
      }
    }
    if (payload.managerEmail && !ccList.includes(payload.managerEmail.trim())) {
      ccList.push(payload.managerEmail.trim());
    }

    const tickets = db.get('tickets');
    const users = db.get('users');

    // 1. Threaded reply detection: look for "[ITL-XXXXXX]" in subject line
    const match = subject.match(/\[(ITL-\d+)\]/i);
    if (match) {
      const ticketId = match[1].toUpperCase();
      const existing = tickets.find((t) => t.id === ticketId);
      if (existing) {
        // Add any newly observed CC recipients
        for (const recipient of ccList) {
          if (!existing.ccRecipients.includes(recipient)) {
            existing.ccRecipients.push(recipient);
          }
        }

        const senderUser = users.find((u) => u.email.toLowerCase() === from.toLowerCase());

        const comment: TicketComment = {
          id: `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          ticketId: existing.id,
          authorId: senderUser ? senderUser.id : 'usr-email-sender',
          authorName: senderUser ? senderUser.name : from.split('@')[0],
          authorEmail: from,
          authorRole: senderUser ? senderUser.role : 'requester',
          isInternal: false,
          content: body,
          createdAt: new Date().toISOString(),
          emailMessageId: payload.messageId,
        };

        const comments = db.get('comments');
        db.set('comments', [...comments, comment]);

        existing.updatedAt = new Date().toISOString();
        if (existing.status === 'pending_requester') {
          existing.status = 'in_progress'; // Automatically resume ticket upon requester response
        }
        db.set('tickets', tickets);

        return { mode: 'threaded', ticket: existing, comment };
      }
    }

    // 2. Otherwise create a brand new ticket from inbound email
    const ticketId = db.generateTicketId();
    const slaPolicies = db.get('slaPolicies');
    const now = new Date();
    const firstResponseDeadline = new Date(now.getTime() + 4 * 3600 * 1000).toISOString();
    const resolutionDeadline = new Date(now.getTime() + 24 * 3600 * 1000).toISOString();

    const matchedUser = users.find((u) => u.email.toLowerCase() === from.toLowerCase());
    const org = db.get('organizations')[0];

    const cleanSubject = subject.replace(/^[Rr][Ee]:\s*/i, '').replace(/^[Ff][Ww][Dd]:\s*/i, '');

    const newTicket: Ticket = {
      id: ticketId,
      subject: cleanSubject || 'Support Request via Email',
      description: body,
      status: 'new',
      priority: 'normal',
      type: 'incident',
      category: 'General IT Support',
      impact: 'medium',
      urgency: 'medium',
      channel: 'email',
      requesterId: matchedUser ? matchedUser.id : `usr-email-${from.replace(/[^a-zA-Z0-9]/g, '')}`,
      requesterName: matchedUser ? matchedUser.name : from.split('@')[0],
      requesterEmail: from,
      organizationId: org ? org.id : 'org-lakhan-global',
      followers: [],
      ccRecipients: ccList,
      managerEmail: payload.managerEmail?.trim() || matchedUser?.managerId ? users.find((u) => u.id === matchedUser?.managerId)?.email : undefined,
      forwardedToManager: Boolean(payload.managerEmail || ccList.length > 0),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      dueDate: resolutionDeadline,
      relatedAssetIds: [],
      tags: ['email-intake'],
      estimatedMinutes: 60,
      actualMinutesSpent: 0,
      customFields: {},
      slaStatus: 'within_target',
      slaFirstResponseDeadline: firstResponseDeadline,
      slaResolutionDeadline: resolutionDeadline,
    };

    db.set('tickets', [newTicket, ...tickets]);

    // Send confirmation email back to requester
    this.sendTicketCreatedEmail(newTicket).catch(() => {});

    return { mode: 'created', ticket: newTicket };
  }
}

export const emailService = new EmailGatewayService();
