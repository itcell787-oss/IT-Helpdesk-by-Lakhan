import React, { useState } from 'react';
import {
  Grid,
  Clock,
  ShieldCheck,
  ArrowRight,
  Layers,
  Laptop,
  Shield,
  Wifi,
  CheckCircle,
  Plus,
  Edit2,
  Trash2,
  X,
  HardDrive,
  Cpu,
  Boxes,
} from 'lucide-react';
import { ServiceCatalogItem, User } from '../types';

interface ServiceCatalogViewProps {
  catalogItems: ServiceCatalogItem[];
  currentUser?: User;
  onRequestItem: (catalogItemId: string, formData: Record<string, any>) => void;
  onCreateCatalogItem?: (data: Partial<ServiceCatalogItem>) => void;
  onUpdateCatalogItem?: (id: string, data: Partial<ServiceCatalogItem>) => void;
  onDeleteCatalogItem?: (id: string) => void;
}

export const ServiceCatalogView: React.FC<ServiceCatalogViewProps> = ({
  catalogItems,
  currentUser,
  onRequestItem,
  onCreateCatalogItem,
  onUpdateCatalogItem,
  onDeleteCatalogItem,
}) => {
  const [selectedItem, setSelectedItem] = useState<ServiceCatalogItem | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);

  // Super Admin Catalog Management states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ServiceCatalogItem | null>(null);

  // Form states for Create/Edit
  const [editId, setEditId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Hardware & Workstations');
  const [icon, setIcon] = useState('Laptop');
  const [estimatedHours, setEstimatedHours] = useState(24);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [approverRole, setApproverRole] = useState<'manager' | 'it_lead' | 'finance'>('manager');
  const [defaultPriority, setDefaultPriority] = useState<any>('normal');

  const isSuperAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Laptop':
        return <Laptop className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />;
      case 'Layers':
        return <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'Shield':
        return <Shield className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
      case 'Wifi':
        return <Wifi className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'HardDrive':
        return <HardDrive className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'Cpu':
        return <Cpu className="w-5 h-5 text-violet-600 dark:text-violet-400" />;
      default:
        return <Grid className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />;
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    onRequestItem(selectedItem.id, formData);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setSelectedItem(null);
      setFormData({});
    }, 1500);
  };

  const handleOpenCreate = () => {
    setTitle('');
    setDescription('');
    setCategory('Hardware & Workstations');
    setIcon('Laptop');
    setEstimatedHours(24);
    setRequiresApproval(false);
    setApproverRole('manager');
    setDefaultPriority('normal');
    setShowCreateModal(true);
  };

  const handleOpenEdit = (item: ServiceCatalogItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setCategory(item.category);
    setIcon(item.icon);
    setEstimatedHours(item.estimatedHours);
    setRequiresApproval(item.requiresApproval);
    setApproverRole(item.approverRole || 'manager');
    setDefaultPriority(item.defaultPriority);
    setShowEditModal(true);
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !onCreateCatalogItem) return;

    onCreateCatalogItem({
      title,
      description,
      category,
      icon,
      estimatedHours: Number(estimatedHours),
      requiresApproval,
      approverRole,
      defaultPriority,
      fields: [
        { id: 'justification', label: 'Business Justification', type: 'textarea', required: true },
        { id: 'department', label: 'Billing Department / Cost Center', type: 'text', required: false },
      ],
    });

    setShowCreateModal(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId || !title.trim() || !onUpdateCatalogItem) return;

    onUpdateCatalogItem(editId, {
      title,
      description,
      category,
      icon,
      estimatedHours: Number(estimatedHours),
      requiresApproval,
      approverRole,
      defaultPriority,
    });

    setShowEditModal(false);
  };

  const executeDelete = () => {
    if (!itemToDelete || !onDeleteCatalogItem) return;
    onDeleteCatalogItem(itemToDelete.id);
    setItemToDelete(null);
  };

  return (
    <div className="space-y-4">
      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="neu-modal max-w-md w-full p-6 rounded-2xl border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Catalog Item</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Remove service offering from catalog</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300">
              Are you sure you want to permanently delete catalog item &ldquo;<strong>{itemToDelete.title}</strong>&rdquo;? Requesters will no longer be able to submit requests for this service.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="neu-btn px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-rose-600 hover:bg-rose-500 shadow-sm transition-all cursor-pointer"
              >
                Yes, Delete Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            IT Service Catalog
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Standardized IT request workflows with automated manager approval paths and fulfillment SLAs.
          </p>
        </div>

        {/* Super Admin can manage catalog fully */}
        {isSuperAdmin && (
          <button
            onClick={handleOpenCreate}
            className="neu-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer whitespace-nowrap transition-transform hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" /> Add Catalog Offering
          </button>
        )}
      </div>

      {/* Catalog Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {catalogItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className="neu-card p-5 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-cyan-500/40 cursor-pointer flex flex-col justify-between space-y-4 group transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl neu-pressed flex items-center justify-center group-hover:scale-105 transition-transform">
                  {getIcon(item.icon)}
                </div>

                {/* Super Admin Management Controls */}
                {isSuperAdmin && (
                  <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => handleOpenEdit(item, e)}
                      className="neu-btn p-1.5 text-xs text-cyan-700 dark:text-cyan-300 rounded-lg cursor-pointer hover:bg-cyan-100 dark:hover:bg-cyan-900/40"
                      title="Edit Service Catalog Offering"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemToDelete(item);
                      }}
                      className="neu-btn p-1.5 text-xs text-rose-600 dark:text-rose-400 rounded-lg cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/40"
                      title="Delete Service Catalog Offering"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-cyan-700 dark:text-cyan-400 font-bold">{item.category}</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                  {item.title}
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 font-normal">
                {item.description}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-cyan-600 dark:text-cyan-400" /> ~{item.estimatedHours}h ETA
              </span>
              <span className="flex items-center gap-1 text-cyan-700 dark:text-cyan-400 font-bold group-hover:translate-x-0.5 transition-transform">
                Request <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Request Modal for Requesters */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg neu-modal p-6 rounded-2xl border border-slate-200 dark:border-white/15 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 font-bold uppercase">{selectedItem.category}</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {getIcon(selectedItem.icon)}
                  {selectedItem.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">{selectedItem.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedItem.requiresApproval && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 font-medium">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  This item requires supervisor / {selectedItem.approverRole || 'IT Manager'} sign-off prior to provisioning.
                </span>
              </div>
            )}

            {submitted ? (
              <div className="p-8 text-center text-emerald-600 dark:text-emerald-400 font-bold text-sm space-y-2">
                <CheckCircle className="w-8 h-8 mx-auto" />
                <div>Service request successfully submitted! Ticket created.</div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-3">
                {selectedItem.fields?.map((f) => (
                  <div key={f.id}>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      {f.label} {f.required && '*'}
                    </label>
                    {f.type === 'select' ? (
                      <select
                        required={f.required}
                        value={formData[f.id] || ''}
                        onChange={(e) => setFormData({ ...formData, [f.id]: e.target.value })}
                        className="neu-input w-full px-3 py-1.5 text-xs rounded-lg focus:outline-none"
                      >
                        <option value="">Select option...</option>
                        {f.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        required={f.required}
                        rows={3}
                        value={formData[f.id] || ''}
                        onChange={(e) => setFormData({ ...formData, [f.id]: e.target.value })}
                        className="neu-input w-full p-2.5 text-xs rounded-lg focus:outline-none"
                      />
                    ) : (
                      <input
                        type="text"
                        required={f.required}
                        value={formData[f.id] || ''}
                        onChange={(e) => setFormData({ ...formData, [f.id]: e.target.value })}
                        className="neu-input w-full px-3 py-1.5 text-xs rounded-lg focus:outline-none"
                      />
                    )}
                  </div>
                ))}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="neu-btn px-4 py-1.5 text-xs rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="neu-btn-primary px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Submit Service Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Super Admin Create Modal */}
      {showCreateModal && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="neu-modal w-full max-w-xl p-6 rounded-2xl border border-slate-200 dark:border-white/15 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                Add New Service Catalog Offering
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Offering Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Developer Workstation Provisioning"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="neu-input w-full px-3 py-2 text-xs rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detailed description of hardware, licenses, or access granted..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="neu-input w-full p-2.5 text-xs rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="neu-input w-full px-3 py-1.5 text-xs rounded-lg focus:outline-none"
                  >
                    <option value="Hardware & Workstations">Hardware &amp; Workstations</option>
                    <option value="Software & Cloud Apps">Software &amp; Cloud Apps</option>
                    <option value="Security & Access">Security &amp; Access</option>
                    <option value="Network & Connectivity">Network &amp; Connectivity</option>
                    <option value="Office & Facilities">Office &amp; Facilities</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Display Icon</label>
                  <select
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="neu-input w-full px-3 py-1.5 text-xs rounded-lg focus:outline-none"
                  >
                    <option value="Laptop">Laptop Workstation</option>
                    <option value="Layers">Software Layers</option>
                    <option value="Shield">Security Shield</option>
                    <option value="Wifi">Network Wifi</option>
                    <option value="HardDrive">Hard Drive Storage</option>
                    <option value="Cpu">Server / Cloud Compute</option>
                    <option value="Grid">Standard Grid</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Fulfillment SLA (Hours)</label>
                  <input
                    type="number"
                    min={1}
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(Number(e.target.value))}
                    className="neu-input w-full px-3 py-1.5 text-xs rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl neu-card space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="create-approval"
                      checked={requiresApproval}
                      onChange={(e) => setRequiresApproval(e.target.checked)}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="create-approval" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                      Requires Approval Gate
                    </label>
                  </div>
                  {requiresApproval && (
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Approver Role</label>
                      <select
                        value={approverRole}
                        onChange={(e) => setApproverRole(e.target.value as any)}
                        className="neu-input w-full px-2 py-1 text-xs rounded-lg"
                      >
                        <option value="manager">Direct Line Manager</option>
                        <option value="it_lead">IT Team Lead</option>
                        <option value="finance">Finance / Procurement</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl neu-card space-y-2">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">Default Ticket Priority</label>
                  <select
                    value={defaultPriority}
                    onChange={(e) => setDefaultPriority(e.target.value)}
                    className="neu-input w-full px-2 py-1 text-xs rounded-lg"
                  >
                    <option value="low">Low (P4)</option>
                    <option value="normal">Normal (P3)</option>
                    <option value="high">High (P2)</option>
                    <option value="urgent">Urgent (P1)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="neu-btn px-4 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="neu-btn-primary px-4 py-1.5 font-bold rounded-lg cursor-pointer"
                >
                  Create Catalog Offering
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Edit Modal */}
      {showEditModal && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="neu-modal w-full max-w-xl p-6 rounded-2xl border border-slate-200 dark:border-white/15 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Edit Service Catalog Offering
              </h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Offering Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="neu-input w-full px-3 py-2 text-xs rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Description *</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="neu-input w-full p-2.5 text-xs rounded-lg focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="neu-input w-full px-3 py-1.5 text-xs rounded-lg focus:outline-none"
                  >
                    <option value="Hardware & Workstations">Hardware &amp; Workstations</option>
                    <option value="Software & Cloud Apps">Software &amp; Cloud Apps</option>
                    <option value="Security & Access">Security &amp; Access</option>
                    <option value="Network & Connectivity">Network &amp; Connectivity</option>
                    <option value="Office & Facilities">Office &amp; Facilities</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Display Icon</label>
                  <select
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="neu-input w-full px-3 py-1.5 text-xs rounded-lg focus:outline-none"
                  >
                    <option value="Laptop">Laptop Workstation</option>
                    <option value="Layers">Software Layers</option>
                    <option value="Shield">Security Shield</option>
                    <option value="Wifi">Network Wifi</option>
                    <option value="HardDrive">Hard Drive Storage</option>
                    <option value="Cpu">Server / Cloud Compute</option>
                    <option value="Grid">Standard Grid</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">Fulfillment SLA (Hours)</label>
                  <input
                    type="number"
                    min={1}
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(Number(e.target.value))}
                    className="neu-input w-full px-3 py-1.5 text-xs rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl neu-card space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="edit-approval"
                      checked={requiresApproval}
                      onChange={(e) => setRequiresApproval(e.target.checked)}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="edit-approval" className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                      Requires Approval Gate
                    </label>
                  </div>
                  {requiresApproval && (
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Approver Role</label>
                      <select
                        value={approverRole}
                        onChange={(e) => setApproverRole(e.target.value as any)}
                        className="neu-input w-full px-2 py-1 text-xs rounded-lg"
                      >
                        <option value="manager">Direct Line Manager</option>
                        <option value="it_lead">IT Team Lead</option>
                        <option value="finance">Finance / Procurement</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl neu-card space-y-2">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">Default Ticket Priority</label>
                  <select
                    value={defaultPriority}
                    onChange={(e) => setDefaultPriority(e.target.value)}
                    className="neu-input w-full px-2 py-1 text-xs rounded-lg"
                  >
                    <option value="low">Low (P4)</option>
                    <option value="normal">Normal (P3)</option>
                    <option value="high">High (P2)</option>
                    <option value="urgent">Urgent (P1)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="neu-btn px-4 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="neu-btn-primary px-4 py-1.5 font-bold rounded-lg cursor-pointer"
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
