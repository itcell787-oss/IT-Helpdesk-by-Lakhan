import React, { useState, useEffect } from 'react';
import {
  Search,
  Ticket as TicketIcon,
  Server,
  BookOpen,
  Plus,
  Mail,
  X,
  ArrowRight,
} from 'lucide-react';
import { Ticket, Asset, KnowledgeArticle, User } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: Ticket[];
  assets: Asset[];
  articles: KnowledgeArticle[];
  currentUser?: User | null;
  onSelectTicket: (id: string) => void;
  onNavigate: (view: string) => void;
  onOpenNewTicket: () => void;
  onOpenEmailSimulator: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  tickets,
  assets,
  articles,
  currentUser,
  onSelectTicket,
  onNavigate,
  onOpenNewTicket,
  onOpenEmailSimulator,
}) => {
  const [query, setQuery] = useState('');
  const isRequester = currentUser?.role === 'requester';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const matchingTickets = q
    ? tickets.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.requesterName.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const matchingAssets = q
    ? assets.filter(
        (a) =>
          a.id.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.model.toLowerCase().includes(q) ||
          a.serialNumber.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  const matchingArticles = q
    ? articles.filter(
        (art) =>
          art.title.toLowerCase().includes(q) ||
          art.tags.some((t) => t.toLowerCase().includes(q))
      ).slice(0, 3)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-xl neu-modal rounded-2xl border border-slate-200/90 dark:border-white/20 shadow-2xl overflow-hidden space-y-0">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200 dark:border-white/10 gap-3">
          <Search className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command, ticket ID, asset tag, or keyword..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-sm bg-transparent border-0 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-semibold focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results area */}
        <div className="p-3 max-h-96 overflow-y-auto space-y-4 text-xs">
          {/* Quick Actions */}
          {!q && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Quick Shortcuts
              </div>
              <div className="space-y-1 mt-1">
                <button
                  onClick={() => {
                    onOpenNewTicket();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-cyan-50/70 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-semibold transition-colors cursor-pointer text-left"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Create New Support Ticket
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 font-bold">Shortcut</span>
                </button>

                {isRequester ? (
                  <>
                    <button
                      onClick={() => {
                        onNavigate('portal-my-tickets');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-cyan-50/70 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-semibold transition-colors cursor-pointer text-left"
                    >
                      <span className="flex items-center gap-2">
                        <TicketIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> View My Support Tickets
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 font-bold">My Tickets</span>
                    </button>
                    <button
                      onClick={() => {
                        onNavigate('portal-my-assets');
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-cyan-50/70 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-semibold transition-colors cursor-pointer text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> View My Assigned Hardware &amp; Equipment
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 font-bold">My Assets</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      onOpenEmailSimulator();
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-cyan-50/70 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-semibold transition-colors cursor-pointer text-left"
                  >
                    <span className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Simulate Inbound Email
                    </span>
                    <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 font-bold">Tool</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onNavigate('portal');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-cyan-50/70 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-semibold transition-colors cursor-pointer text-left"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> {isRequester ? 'End-User Self-Service Portal Home' : 'Switch to End-User Self-Service Portal'}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 font-bold">/portal</span>
                </button>
              </div>
            </div>
          )}

          {/* Matching Tickets */}
          {matchingTickets.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isRequester ? 'My Tickets' : 'Tickets'} ({matchingTickets.length})
              </div>
              <div className="space-y-1 mt-1">
                {matchingTickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelectTicket(t.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-cyan-50/70 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <TicketIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                      <div>
                        <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400">{t.id}</span> ·{' '}
                        <span className="text-slate-900 dark:text-white font-bold">{t.subject}</span>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-600 dark:text-slate-400">{t.status}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matching Assets */}
          {matchingAssets.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isRequester ? 'My Assigned Equipment & Devices' : 'Assets & Devices'} ({matchingAssets.length})
              </div>
              <div className="space-y-1 mt-1">
                {matchingAssets.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      onNavigate(isRequester ? 'portal-my-assets' : 'assets');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-cyan-50/70 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <div>
                        <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">{a.id}</span> ·{' '}
                        <span className="text-slate-900 dark:text-white font-bold">{a.name} ({a.model})</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 font-medium">{a.serialNumber}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matching Articles */}
          {matchingArticles.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Knowledge Base Articles ({matchingArticles.length})
              </div>
              <div className="space-y-1 mt-1">
                {matchingArticles.map((art) => (
                  <button
                    key={art.id}
                    onClick={() => {
                      onNavigate('kb');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-cyan-50/70 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-slate-900 dark:text-white font-bold">{art.title}</span>
                    </div>
                    <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-bold">{art.category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {q && matchingTickets.length === 0 && matchingAssets.length === 0 && matchingArticles.length === 0 && (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">
              No matching tickets, assets, or knowledge articles for "{query}".
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-medium">
          <span>Navigate with mouse or keyboard</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
};
