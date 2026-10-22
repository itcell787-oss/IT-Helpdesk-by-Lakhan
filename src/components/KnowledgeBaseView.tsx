import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Tag,
  Clock,
  User,
  Shield,
  CheckCircle,
  Eye,
  Edit2,
  Trash2,
  X,
  Lock,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { KnowledgeArticle, User as UserType } from '../types';

interface KnowledgeBaseViewProps {
  articles: KnowledgeArticle[];
  currentUser: UserType | null;
  onCreateArticle: (data: Partial<KnowledgeArticle>) => void;
  onUpdateArticle?: (id: string, data: Partial<KnowledgeArticle>) => void;
  onDeleteArticle?: (id: string) => void;
  onVoteArticle: (id: string, helpful: boolean) => void;
}

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({
  articles,
  currentUser,
  onCreateArticle,
  onUpdateArticle,
  onDeleteArticle,
  onVoteArticle,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(articles[0]?.id || null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<KnowledgeArticle | null>(null);

  // User Voting Lock State (Only logged in user, strictly 1 vote per article)
  const [userVotes, setUserVotes] = useState<Record<string, 'yes' | 'no'>>(() => {
    if (typeof window !== 'undefined' && currentUser) {
      try {
        const stored = localStorage.getItem(`kb_user_votes_${currentUser.id}`);
        return stored ? JSON.parse(stored) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  const handleVote = (articleId: string, helpful: boolean) => {
    if (!currentUser) return;
    if (userVotes[articleId]) return; // strictly 1 vote per article

    const updated = { ...userVotes, [articleId]: helpful ? ('yes' as const) : ('no' as const) };
    setUserVotes(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`kb_user_votes_${currentUser.id}`, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
    onVoteArticle(articleId, helpful);
  };

  // New article form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Software & Cloud Apps');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  // Edit article form states
  const [editId, setEditId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('Software & Cloud Apps');
  const [editContent, setEditContent] = useState('');
  const [editTagsInput, setEditTagsInput] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editStatus, setEditStatus] = useState<'published' | 'draft' | 'review'>('published');

  // Rule: Knowledge base should be modifiable ONLY by super admins & admins
  const canManageKB = !!currentUser && (currentUser.role === 'superadmin' || currentUser.role === 'admin' || currentUser.privileges?.canManageKnowledgeBase === true);

  const categories = Array.from(new Set(articles.map((a) => a.category)));

  const filteredArticles = articles.filter((a) => {
    if (selectedCategory !== 'all' && a.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const activeArticle = articles.find((a) => a.id === selectedArticleId) || filteredArticles[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    onCreateArticle({
      title,
      category,
      content,
      isPublic,
      tags: tagsInput.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      status: 'published',
    });

    setShowCreateModal(false);
    setTitle('');
    setContent('');
    setTagsInput('');
  };

  const handleOpenEdit = (article: KnowledgeArticle) => {
    setEditId(article.id);
    setEditTitle(article.title);
    setEditCategory(article.category);
    setEditContent(article.content);
    setEditTagsInput(article.tags.join(', '));
    setEditIsPublic(article.isPublic);
    setEditStatus(article.status);
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editContent.trim() || !onUpdateArticle) return;

    onUpdateArticle(editId, {
      title: editTitle,
      category: editCategory,
      content: editContent,
      isPublic: editIsPublic,
      tags: editTagsInput.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      status: editStatus,
    });

    setShowEditModal(false);
  };

  const executeDelete = () => {
    if (!articleToDelete || !onDeleteArticle) return;
    onDeleteArticle(articleToDelete.id);
    if (selectedArticleId === articleToDelete.id) {
      const remaining = articles.filter((a) => a.id !== articleToDelete.id);
      setSelectedArticleId(remaining[0]?.id || null);
    }
    setArticleToDelete(null);
  };

  return (
    <div className="space-y-4">
      {/* Delete Confirmation Modal */}
      {articleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="neu-modal max-w-md w-full p-6 rounded-2xl border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Knowledge Article</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Remove documentation from verified knowledge base</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300">
              Are you sure you want to permanently delete article &ldquo;<strong>{articleToDelete.title}</strong>&rdquo;? End users will no longer see this runbook in portal self-service.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setArticleToDelete(null)}
                className="neu-btn px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-rose-600 hover:bg-rose-500 shadow-sm transition-all cursor-pointer"
              >
                Yes, Delete Article
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            IT Knowledge Base &amp; Runbooks
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Self-service documentation, troubleshooting procedures, and standard operating runbooks.
          </p>
        </div>

        {/* Create button ONLY available to Super Admins and Admins */}
        {canManageKB && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="neu-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer whitespace-nowrap transition-transform hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" /> Publish New Article
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="neu-flat p-3 rounded-xl border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search verified articles by title, keywords (VPN, Outlook, MFA)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="neu-input w-full pl-9 pr-3 py-1.5 text-xs rounded-lg placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="neu-input px-3 py-1.5 text-xs rounded-lg cursor-pointer"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Two-Column Reader Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Article List (1 col) */}
        <div className="neu-flat rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden divide-y divide-slate-200 dark:divide-white/5 max-h-[700px] overflow-y-auto custom-scrollbar">
          {filteredArticles.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
              No articles found matching query.
            </div>
          ) : (
            filteredArticles.map((art) => {
              const isSelected = activeArticle?.id === art.id;
              return (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticleId(art.id)}
                  className={`p-3.5 hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors cursor-pointer space-y-1 ${
                    isSelected ? 'bg-cyan-100/60 dark:bg-cyan-500/15 border-l-3 border-cyan-600 dark:border-cyan-400' : ''
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="font-mono text-cyan-700 dark:text-cyan-400 font-semibold uppercase">{art.category}</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Eye className="w-3 h-3" /> {art.views}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">{art.title}</h3>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between pt-0.5">
                    <span>{art.authorName}</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-mono text-[10px] font-semibold">
                      +{art.helpfulCount} helpful
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Article Detail Reader (2 cols) */}
        <div className="md:col-span-2 neu-flat p-6 rounded-xl border border-slate-200 dark:border-white/10 space-y-4 max-h-[700px] overflow-y-auto custom-scrollbar">
          {activeArticle ? (
            <div>
              <div className="space-y-2 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono uppercase text-cyan-700 dark:text-cyan-400 font-bold">{activeArticle.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px]">
                      Updated {new Date(activeArticle.updatedAt).toLocaleDateString()}
                    </span>

                    {/* Admin Modification Buttons */}
                    {canManageKB && (
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleOpenEdit(activeArticle)}
                          className="neu-btn p-1.5 text-xs text-cyan-700 dark:text-cyan-400 rounded-lg cursor-pointer transition-colors"
                          title="Edit Article (Admins only)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setArticleToDelete(activeArticle)}
                          className="neu-btn p-1.5 text-xs text-rose-600 dark:text-rose-400 rounded-lg cursor-pointer transition-colors"
                          title="Delete Article (Admins only)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{activeArticle.title}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
                  <span>Author: <strong className="text-slate-900 dark:text-slate-200">{activeArticle.authorName}</strong></span>
                  <span>·</span>
                  <span>
                    Status:{' '}
                    <span className="capitalize text-emerald-700 dark:text-emerald-400 font-bold">{activeArticle.status}</span>
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 font-medium">
                    {activeArticle.isPublic ? (
                      <>
                        <Globe className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                        Public Portal
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        Internal Staff Only
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Content Body */}
              <div className="py-4 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed space-y-3 font-sans">
                {activeArticle.content}
              </div>

              {/* Tags */}
              {activeArticle.tags.length > 0 && (
                <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 text-xs flex-wrap">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Tags:</span>
                  {activeArticle.tags.map((tag) => (
                    <span key={tag} className="neu-card px-2 py-0.5 rounded text-[11px] text-cyan-700 dark:text-cyan-300 font-mono font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Feedback Widget - Strictly Logged in users & 1 vote per user */}
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl neu-card">
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-slate-900 dark:text-white block">Was this article helpful to you?</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {activeArticle.helpfulCount} users found this solution helpful.
                  </span>
                </div>

                {!currentUser ? (
                  /* Guest user notification */
                  <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/40 px-3 py-1.5 rounded-xl font-medium">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Please sign in to vote on this article</span>
                  </div>
                ) : userVotes[activeArticle.id] ? (
                  /* User already voted */
                  <div className="flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/40 px-3 py-1.5 rounded-xl font-bold animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      Vote recorded: You found this {userVotes[activeArticle.id] === 'yes' ? 'Helpful (Yes)' : 'Not Helpful (No)'}
                    </span>
                  </div>
                ) : (
                  /* Unvoted authenticated user */
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVote(activeArticle.id, true)}
                      className="neu-btn flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-bold rounded-xl cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                      title="Vote Yes - This article helped resolve my issue"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>Yes ({activeArticle.helpfulCount})</span>
                    </button>
                    <button
                      onClick={() => handleVote(activeArticle.id, false)}
                      className="neu-btn flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-400 font-bold rounded-xl cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Vote No - This article did not resolve my issue"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      <span>No</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
              Select an article on the left to read procedure documentation.
            </div>
          )}
        </div>
      </div>

      {/* Create Article Modal (Superadmin / Admin Only) */}
      {showCreateModal && canManageKB && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="neu-modal w-full max-w-2xl p-6 rounded-2xl border border-slate-200 dark:border-white/15 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                Publish Knowledge Base Article
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Article Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How to Connect to WireGuard VPN and Authenticate MFA"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="neu-input w-full px-3 py-2 text-xs rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="neu-input w-full px-3 py-2 text-xs rounded-lg focus:outline-none"
                  >
                    <option value="Software & Cloud Apps">Software &amp; Cloud Apps</option>
                    <option value="Hardware & Workstations">Hardware &amp; Workstations</option>
                    <option value="Network & Connectivity">Network &amp; Connectivity</option>
                    <option value="Security & Access">Security &amp; Access</option>
                    <option value="User Accounts & Access">User Accounts &amp; Access</option>
                    <option value="General IT">General IT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="vpn, mfa, remote, password"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="neu-input w-full px-3 py-2 text-xs rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Article Content (Markdown supported) *</label>
                <textarea
                  rows={8}
                  required
                  placeholder="Step 1: Open Cisco AnyConnect or WireGuard...&#10;Step 2: Enter server endpoint...&#10;Step 3: Approve mobile push..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="neu-input w-full p-3 text-xs rounded-lg focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl neu-card">
                <input
                  type="checkbox"
                  id="create-public"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded border-slate-300 text-cyan-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="create-public" className="text-xs text-slate-800 dark:text-slate-200 font-medium cursor-pointer">
                  Visible on Public Portal (Allow normal employees/requesters to search &amp; resolve issues themselves)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="neu-btn px-4 py-1.5 text-xs rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="neu-btn-primary px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Publish Knowledge Article
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Article Modal (Superadmin / Admin Only) */}
      {showEditModal && canManageKB && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="neu-modal w-full max-w-2xl p-6 rounded-2xl border border-slate-200 dark:border-white/15 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Edit Knowledge Base Article
              </h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Article Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="neu-input w-full px-3 py-2 text-xs rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Category *</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="neu-input w-full px-3 py-2 text-xs rounded-lg focus:outline-none"
                  >
                    <option value="Software & Cloud Apps">Software &amp; Cloud Apps</option>
                    <option value="Hardware & Workstations">Hardware &amp; Workstations</option>
                    <option value="Network & Connectivity">Network &amp; Connectivity</option>
                    <option value="Security & Access">Security &amp; Access</option>
                    <option value="User Accounts & Access">User Accounts &amp; Access</option>
                    <option value="General IT">General IT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="neu-input w-full px-3 py-2 text-xs rounded-lg focus:outline-none"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="review">Under Review</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Tags</label>
                  <input
                    type="text"
                    value={editTagsInput}
                    onChange={(e) => setEditTagsInput(e.target.value)}
                    className="neu-input w-full px-3 py-2 text-xs rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Article Content (Markdown) *</label>
                <textarea
                  rows={8}
                  required
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="neu-input w-full p-3 text-xs rounded-lg focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl neu-card">
                <input
                  type="checkbox"
                  id="edit-public"
                  checked={editIsPublic}
                  onChange={(e) => setEditIsPublic(e.target.checked)}
                  className="rounded border-slate-300 text-cyan-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="edit-public" className="text-xs text-slate-800 dark:text-slate-200 font-medium cursor-pointer">
                  Visible on Public Portal (Allow normal employees/requesters to view)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="neu-btn px-4 py-1.5 text-xs rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="neu-btn-primary px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Save Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
