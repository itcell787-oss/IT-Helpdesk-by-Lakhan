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
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          Management Approvals Queue
        </h1>
        <p className="text-xs text-slate-400">
          Review and authorize pending service catalog requests, hardware deployments, and access grants.
        </p>
      </div>

      {/* Approvals Table */}
      <div className="glass-panel rounded-xl border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-white/10 uppercase tracking-wider font-semibold text-[10px]">
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
            <tbody className="divide-y divide-white/5">
              {approvals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No approval requests found in queue.
                  </td>
                </tr>
              ) : (
                approvals.map((appr) => {
                  const isPending = appr.status === 'pending';
                  const statusColors: Record<string, string> = {
                    pending: 'text-amber-400 font-semibold',
                    approved: 'text-emerald-400 font-semibold',
                    rejected: 'text-rose-400 font-semibold',
                  };

                  return (
                    <tr key={appr.id} className="hover:bg-white/5 transition-colors">
                      <td
                        className="py-3 px-3 font-mono font-bold text-cyan-400 cursor-pointer"
                        onClick={() => onSelectTicket(appr.ticketId)}
                      >
                        {appr.ticketId}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-200">
                        {appr.catalogItemTitle}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {appr.requesterName}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-indigo-300 uppercase">
                        {appr.approverRole}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                        {new Date(appr.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`capitalize text-[11px] ${statusColors[appr.status]}`}>
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
                              className="px-2.5 py-1 text-xs bg-emerald-600/80 hover:bg-emerald-600 text-white rounded font-medium transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedApproval(appr);
                                setActionType('rejected');
                              }}
                              className="px-2.5 py-1 text-xs bg-rose-600/80 hover:bg-rose-600 text-white rounded font-medium transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-mono">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md glass-modal p-6 rounded-2xl border border-white/15 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {actionType === 'approved' ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400" />
              )}
              Confirm {actionType.toUpperCase()}: {selectedApproval.catalogItemTitle}
            </h3>
            <p className="text-xs text-slate-400">
              Requester: <span className="text-slate-200 font-medium">{selectedApproval.requesterName}</span> · Ticket ID: <span className="font-mono text-cyan-400">{selectedApproval.ticketId}</span>
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Approval Decision Notes / Justification
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Budget verified for Q3, license assigned from pool..."
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-950 border border-white/10 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedApproval(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecision}
                className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg shadow-sm ${
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
