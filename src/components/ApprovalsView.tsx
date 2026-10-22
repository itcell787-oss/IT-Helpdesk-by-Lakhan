import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Ticket as TicketIcon,
  MessageSquare,
} from 'lucide-react';
import { ApprovalRequest } from '../types';

interface ApprovalsViewProps {
  approvals: ApprovalRequest[];
  onDecideApproval: (id: string, status: 'approved' | 'rejected', notes?: string) => void;
  onSelectTicket: (ticketId: string) => void;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  approvals,
  onDecideApproval,
  onSelectTicket,
}) => {
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [actionType, setActionType] = useState<'approved' | 'rejected'>('approved');
  const [decisionNotes, setDecisionNotes] = useState('');

  const handleConfirmDecision = () => {
    if (!selectedApproval) return;
    onDecideApproval(selectedApproval.id, actionType, decisionNotes);
    setSelectedApproval(null);
    setDecisionNotes('');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          Management Approvals Queue
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
          Review and authorize pending service catalog requests, hardware deployments, and access grants.
        </p>
      </div>

      {/* Approvals Table */}
      <div className="neu-card rounded-2xl border border-slate-200/90 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead className="bg-slate-200/80 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 border-b border-slate-300/90 dark:border-white/10 uppercase tracking-wider font-extrabold text-[11px]">
              <tr>
                <th className="py-3 px-3">Ticket ID</th>
                <th className="py-3 px-3">Requested Item / Service</th>
                <th className="py-3 px-3">Requester</th>
                <th className="py-3 px-3">Required Authority</th>
                <th className="py-3 px-3">Requested Date</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/90 dark:divide-white/5">
              {approvals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-600 dark:text-slate-400 font-medium">
                    No approval requests found in queue.
                  </td>
                </tr>
              ) : (
                approvals.map((appr) => {
                  const isPending = appr.status === 'pending';
                  const statusColors: Record<string, string> = {
                    pending: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 font-bold',
                    approved: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 font-bold',
                    rejected: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60 font-bold',
                  };

                  return (
                    <tr key={appr.id} className="hover:bg-cyan-50/70 dark:hover:bg-white/5 transition-colors">
                      <td
                        className="py-3 px-3 font-mono font-bold text-cyan-700 dark:text-cyan-400 cursor-pointer"
                        onClick={() => onSelectTicket(appr.ticketId)}
                      >
                        {appr.ticketId}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">
                        {appr.catalogItemTitle}
                      </td>
                      <td className="py-3 px-3 text-slate-800 dark:text-slate-200 font-medium">
                        {appr.requesterName}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-indigo-700 dark:text-indigo-400 uppercase font-bold">
                        {appr.approverRole}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                        {new Date(appr.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`capitalize text-[11px] px-2 py-0.5 rounded-md ${statusColors[appr.status] || ''}`}>
                          {appr.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedApproval(appr);
                                setActionType('approved');
                              }}
                              className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-xs cursor-pointer transition-transform hover:scale-105"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedApproval(appr);
                                setActionType('rejected');
                              }}
                              className="px-3 py-1 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold shadow-xs cursor-pointer transition-transform hover:scale-105"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono font-medium">
                            Decided by {appr.approverName || 'Approver'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision Modal */}
      {selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md neu-modal p-6 rounded-2xl border border-slate-200/90 dark:border-white/15 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {actionType === 'approved' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              )}
              Confirm {actionType.toUpperCase()}: {selectedApproval.catalogItemTitle}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Requester: <span className="text-slate-900 dark:text-slate-200 font-bold">{selectedApproval.requesterName}</span> · Ticket ID: <span className="font-mono text-cyan-700 dark:text-cyan-400 font-bold">{selectedApproval.ticketId}</span>
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Approval Decision Notes / Justification
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Budget verified for Q3, license assigned from pool..."
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                className="w-full p-2.5 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 font-medium focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedApproval(null)}
                className="neu-btn px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecision}
                className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg shadow-sm cursor-pointer transition-transform hover:scale-105 ${
                  actionType === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                Confirm {actionType === 'approved' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
