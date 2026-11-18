import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Plus,
  Eye,
  Tag,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  FileText,
  MapPin,
} from 'lucide-react';
import { CustomFieldDefinition, Organization, TicketSubmissionFormConfig } from '../types';
import { api } from '../services/api';

interface TicketFormEditorPanelProps {
  organization?: Organization;
  organizations?: Organization[];
  customFields: CustomFieldDefinition[];
  systemSettings?: any;
  onUpdateSystemSettings?: (settings: any) => Promise<any> | void;
  onUpdateOrganization?: (id: string, payload: Partial<Organization>) => void;
  onCreateCustomField: (payload: Partial<CustomFieldDefinition>) => Promise<any> | void;
  onUpdateCustomField: (id: string, payload: Partial<CustomFieldDefinition>) => Promise<any> | void;
  onDeleteCustomField: (id: string) => Promise<any> | void;
  onReorderCustomFields: (orderedIds: string[]) => Promise<any> | void;
}

const DEFAULT_TICKET_CATEGORIES = [
  'Hardware & Workstations',
  'Software & Cloud Apps',
  'Network & Connectivity',
  'Security & Access',
  'User Accounts & Permissions',
  'AV & Conference Rooms',
];

const DEFAULT_FORM_CONFIG: Required<TicketSubmissionFormConfig> = {
  formTitle: 'Submit IT Service Request',
  formSubtitle: 'Fast-track ticket creation enabled. You can submit directly without login or OTP.',
  showLocationDesk: true,
  requireLocationDesk: true,
  locationDeskLabel: 'Location / Desk No',
  locationDeskPlaceholder: 'e.g. Building A - Floor 2 - Desk #42 / Remote Home Office',
  defaultPriority: 'normal',
  showForwardToManager: true,
  showAttachments: true,
};

export const TicketFormEditorPanel: React.FC<TicketFormEditorPanelProps> = ({
  organization,
  organizations,
  customFields,
  systemSettings,
  onUpdateSystemSettings,
  onUpdateOrganization,
  onCreateCustomField,
  onUpdateCustomField,
  onDeleteCustomField,
  onReorderCustomFields,
}) => {
  const primaryOrg = organization || (organizations && organizations[0]);

  const savedFormCfg: TicketSubmissionFormConfig =
    systemSettings?.ticketSubmissionFormConfig ||
    primaryOrg?.systemSettings?.ticketSubmissionFormConfig ||
    {};

  // Built-in Submit Support Ticket Form Config State
  const [formTitle, setFormTitle] = useState(savedFormCfg.formTitle || DEFAULT_FORM_CONFIG.formTitle);
  const [formSubtitle, setFormSubtitle] = useState(savedFormCfg.formSubtitle || DEFAULT_FORM_CONFIG.formSubtitle);
  const [showLocationDesk, setShowLocationDesk] = useState(savedFormCfg.showLocationDesk !== false);
  const [requireLocationDesk, setRequireLocationDesk] = useState(savedFormCfg.requireLocationDesk !== false);
  const [locationDeskLabel, setLocationDeskLabel] = useState(savedFormCfg.locationDeskLabel || DEFAULT_FORM_CONFIG.locationDeskLabel);
  const [locationDeskPlaceholder, setLocationDeskPlaceholder] = useState(
    savedFormCfg.locationDeskPlaceholder || DEFAULT_FORM_CONFIG.locationDeskPlaceholder
  );
  const [defaultPriority, setDefaultPriority] = useState<'low' | 'normal' | 'high' | 'critical'>(
    savedFormCfg.defaultPriority || 'normal'
  );
  const [showForwardToManager, setShowForwardToManager] = useState(savedFormCfg.showForwardToManager !== false);
  const [showAttachments, setShowAttachments] = useState(savedFormCfg.showAttachments !== false);
  const [savingFormCfg, setSavingFormCfg] = useState(false);
  const [formCfgSaveMsg, setFormCfgSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    const cfg: TicketSubmissionFormConfig =
      systemSettings?.ticketSubmissionFormConfig ||
      primaryOrg?.systemSettings?.ticketSubmissionFormConfig ||
      {};
    setFormTitle(cfg.formTitle || DEFAULT_FORM_CONFIG.formTitle);
    setFormSubtitle(cfg.formSubtitle || DEFAULT_FORM_CONFIG.formSubtitle);
    setShowLocationDesk(cfg.showLocationDesk !== false);
    setRequireLocationDesk(cfg.requireLocationDesk !== false);
    setLocationDeskLabel(cfg.locationDeskLabel || DEFAULT_FORM_CONFIG.locationDeskLabel);
    setLocationDeskPlaceholder(cfg.locationDeskPlaceholder || DEFAULT_FORM_CONFIG.locationDeskPlaceholder);
    setDefaultPriority(cfg.defaultPriority || 'normal');
    setShowForwardToManager(cfg.showForwardToManager !== false);
    setShowAttachments(cfg.showAttachments !== false);
  }, [systemSettings?.ticketSubmissionFormConfig, primaryOrg?.systemSettings?.ticketSubmissionFormConfig]);

  // Categories State
  const initialCategories =
    (systemSettings?.ticketCategories && systemSettings.ticketCategories.length > 0
      ? systemSettings.ticketCategories
      : primaryOrg?.systemSettings?.ticketCategories && primaryOrg.systemSettings.ticketCategories.length > 0
      ? primaryOrg.systemSettings.ticketCategories
      : DEFAULT_TICKET_CATEGORIES) as string[];

  const [ticketCategories, setTicketCategories] = useState<string[]>(initialCategories);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [editingCategoryIdx, setEditingCategoryIdx] = useState<number | null>(null);
  const [editingCategoryText, setEditingCategoryText] = useState('');
  const [ticketCategoriesSaveMsg, setTicketCategoriesSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    const nextCats =
      systemSettings?.ticketCategories && systemSettings.ticketCategories.length > 0
        ? systemSettings.ticketCategories
        : primaryOrg?.systemSettings?.ticketCategories;
    if (nextCats && Array.isArray(nextCats) && nextCats.length > 0) {
      setTicketCategories(nextCats);
    }
  }, [systemSettings?.ticketCategories, primaryOrg?.systemSettings?.ticketCategories]);

  // Custom Field Modal & Preview State
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'off' | 'portal' | 'technician'>('off');

  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldDefinition['type']>('text');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldRequiredOnClose, setFieldRequiredOnClose] = useState(false);
  const [fieldPortalVisible, setFieldPortalVisible] = useState(true);
  const [fieldEnabled, setFieldEnabled] = useState(true);
  const [fieldOptions, setFieldOptions] = useState('');
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldDescription, setFieldDescription] = useState('');
  const [fieldSection, setFieldSection] = useState<'general' | 'technical' | 'environment' | 'closure'>('general');
  const [hasConditionalRule, setHasConditionalRule] = useState(false);
  const [condField, setCondField] = useState('category');
  const [condOperator, setCondOperator] = useState<'equals' | 'not_equals'>('equals');
  const [condValue, setCondValue] = useState(ticketCategories[0] || 'Hardware & Workstations');

  const [previewFormValues, setPreviewFormValues] = useState<Record<string, any>>({
    category: ticketCategories[0] || 'Hardware & Workstations',
    priority: defaultPriority,
  });

  const handleSaveFormConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFormCfg(true);
    setFormCfgSaveMsg(null);
    const nextCfg: TicketSubmissionFormConfig = {
      formTitle: formTitle.trim() || DEFAULT_FORM_CONFIG.formTitle,
      formSubtitle: formSubtitle.trim() || DEFAULT_FORM_CONFIG.formSubtitle,
      showLocationDesk,
      requireLocationDesk: showLocationDesk ? requireLocationDesk : false,
      locationDeskLabel: locationDeskLabel.trim() || DEFAULT_FORM_CONFIG.locationDeskLabel,
      locationDeskPlaceholder: locationDeskPlaceholder.trim() || DEFAULT_FORM_CONFIG.locationDeskPlaceholder,
      defaultPriority,
      showForwardToManager,
      showAttachments,
    };

    try {
      if (onUpdateSystemSettings) {
        await onUpdateSystemSettings({ ticketSubmissionFormConfig: nextCfg });
      } else {
        await api.updateSystemSettings({ ticketSubmissionFormConfig: nextCfg });
      }
      setFormCfgSaveMsg('Submit Support Ticket form settings saved and synced to the End-User Portal.');
      setTimeout(() => setFormCfgSaveMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save form configuration');
    } finally {
      setSavingFormCfg(false);
    }
  };

  const handleSaveTicketCategories = async (updated: string[]) => {
    try {
      setTicketCategoriesSaveMsg('Saving...');
      if (onUpdateSystemSettings) {
        await onUpdateSystemSettings({ ticketCategories: updated });
      } else {
        await api.updateSystemSettings({ ticketCategories: updated });
      }
      if (onUpdateOrganization && primaryOrg) {
        onUpdateOrganization(primaryOrg.id, {
          systemSettings: {
            ...primaryOrg.systemSettings,
            ticketCategories: updated,
          } as any,
        });
      }
      setTicketCategories(updated);
      setTicketCategoriesSaveMsg('Ticket categories saved and synced to Portal.');
      setTimeout(() => setTicketCategoriesSaveMsg(null), 3000);
    } catch {
      setTicketCategoriesSaveMsg('Failed to save categories');
    }
  };

  const handleAddTicketCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (ticketCategories.includes(trimmed)) {
      alert('This ticket category already exists.');
      return;
    }
    handleSaveTicketCategories([...ticketCategories, trimmed]);
    setNewCategoryInput('');
  };

  const handleRemoveTicketCategory = (cat: string) => {
    if (ticketCategories.length <= 1) {
      alert('You must retain at least one ticket category.');
      return;
    }
    handleSaveTicketCategories(ticketCategories.filter((c) => c !== cat));
  };

  const handleStartEditCategory = (idx: number, currentVal: string) => {
    setEditingCategoryIdx(idx);
    setEditingCategoryText(currentVal);
  };

  const handleSaveEditCategory = (idx: number) => {
    const trimmed = editingCategoryText.trim();
    if (!trimmed) return;
    const updated = [...ticketCategories];
    updated[idx] = trimmed;
    handleSaveTicketCategories(updated);
    setEditingCategoryIdx(null);
    setEditingCategoryText('');
  };

  const handleOpenNewField = () => {
    setEditingFieldId(null);
    setFieldLabel('');
    setFieldKey('');
    setFieldType('text');
    setFieldRequired(false);
    setFieldRequiredOnClose(false);
    setFieldPortalVisible(true);
    setFieldEnabled(true);
    setFieldOptions('');
    setFieldPlaceholder('');
    setFieldDescription('');
    setFieldSection('general');
    setHasConditionalRule(false);
    setCondField('category');
    setCondOperator('equals');
    setCondValue(ticketCategories[0] || 'Hardware & Workstations');
    setShowFieldModal(true);
  };

  const handleEditField = (f: CustomFieldDefinition) => {
    setEditingFieldId(f.id);
    setFieldLabel(f.label);
    setFieldKey(f.name);
    setFieldType(f.type);
    setFieldRequired(f.required);
    setFieldRequiredOnClose(f.requiredOnClose);
    setFieldPortalVisible(f.visibleOnPortal);
    setFieldEnabled(f.enabled !== false);
    setFieldOptions((f.options || []).join(', '));
    setFieldPlaceholder(f.placeholder || '');
    setFieldDescription(f.description || '');
    setFieldSection(f.section || 'general');
    if (f.conditionalRule) {
      setHasConditionalRule(true);
      setCondField(f.conditionalRule.dependsOnField);
      setCondOperator(f.conditionalRule.operator);
      setCondValue(f.conditionalRule.value);
    } else {
      setHasConditionalRule(false);
    }
    setShowFieldModal(true);
  };

  const handleSaveFieldForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldLabel.trim()) return;

    const payload: Partial<CustomFieldDefinition> = {
      label: fieldLabel.trim(),
      name: fieldKey.trim() || fieldLabel.toLowerCase().replace(/[^a-z0-9]+/g, ''),
      type: fieldType,
      required: fieldRequired,
      requiredOnClose: fieldRequiredOnClose,
      visibleOnPortal: fieldPortalVisible,
      enabled: fieldEnabled,
      description: fieldDescription,
      placeholder: fieldPlaceholder,
      section: fieldSection,
      options:
        fieldType === 'select' || fieldType === 'multiselect'
          ? fieldOptions
              .split(',')
              .map((o) => o.trim())
              .filter(Boolean)
          : undefined,
      conditionalRule: hasConditionalRule
        ? {
            dependsOnField: condField,
            operator: condOperator,
            value: condValue,
          }
        : undefined,
    };

    if (editingFieldId) {
      onUpdateCustomField(editingFieldId, payload);
    } else {
      onCreateCustomField(payload);
    }
    setShowFieldModal(false);
  };

  const handleMoveField = (idx: number, direction: 'up' | 'down') => {
    const newArr = [...customFields];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newArr.length) return;
    [newArr[idx], newArr[targetIdx]] = [newArr[targetIdx], newArr[idx]];
    onReorderCustomFields(newArr.map((f) => f.id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Submit Support Ticket Custom Form Editor
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Customize the End-User Portal ticket submission layout, categories, built-in field requirements, and custom form fields.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setPreviewMode(previewMode === 'off' ? 'portal' : 'off')}
            className={`neu-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap shrink-0 ${
              previewMode !== 'off'
                ? 'neu-pressed text-indigo-700 dark:text-indigo-300 border border-indigo-500/40'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            {previewMode === 'off' ? 'Preview Live Form' : 'Hide Form Preview'}
          </button>
          <button
            type="button"
            onClick={handleOpenNewField}
            className="neu-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Add Custom Field
          </button>
        </div>
      </div>

      {/* Live Preview Panel */}
      {previewMode !== 'off' && (
        <div className="neu-flat p-5 rounded-2xl border border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-200 dark:border-indigo-500/30">
            <div className="flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-300 font-bold">
              <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Live Dynamic Form Preview
            </div>
            <div className="flex items-center gap-1 neu-inset p-1 rounded-lg border border-slate-200 dark:border-white/10 text-[11px]">
              <button
                type="button"
                onClick={() => setPreviewMode('portal')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                  previewMode === 'portal'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Requester (Portal View)
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('technician')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                  previewMode === 'technician'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Technician (Console View)
              </button>
            </div>
          </div>

          {previewMode === 'portal' && (
            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 space-y-1">
              <div className="text-sm font-bold text-slate-900 dark:text-white">{formTitle}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">{formSubtitle}</div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Category *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('ticket-categories-manager');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-2.5 h-2.5" /> Edit Categories
                </button>
              </div>
              <select
                value={previewFormValues['category'] || ticketCategories[0] || ''}
                onChange={(e) =>
                  setPreviewFormValues({ ...previewFormValues, category: e.target.value })
                }
                className="w-full px-3 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {ticketCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Urgency / Priority
              </label>
              <select
                value={previewFormValues['priority'] || defaultPriority}
                onChange={(e) =>
                  setPreviewFormValues({ ...previewFormValues, priority: e.target.value })
                }
                className="w-full px-3 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {previewMode === 'portal' && showLocationDesk && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>
                    {locationDeskLabel} {requireLocationDesk ? '*' : '(Optional)'}
                  </span>
                </label>
                <input
                  type="text"
                  disabled
                  placeholder={locationDeskPlaceholder}
                  className="w-full px-3 py-1.5 text-xs neu-input bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-400"
                />
              </div>
            )}

            {customFields
              .filter((f) => f.enabled !== false && (previewMode === 'portal' ? f.visibleOnPortal : true))
              .map((field) => {
                if (field.conditionalRule) {
                  const currentVal = previewFormValues[field.conditionalRule.dependsOnField];
                  const targetVal = field.conditionalRule.value;
                  const matches =
                    field.conditionalRule.operator === 'equals'
                      ? currentVal === targetVal
                      : currentVal !== targetVal;
                  if (!matches) return null;
                }

                return (
                  <div
                    key={field.id}
                    className="p-3 rounded-xl neu-card bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                        {field.label} {field.required && <span className="text-rose-500 font-bold">*</span>}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleEditField(field)}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-2.5 h-2.5" /> Edit
                      </button>
                    </div>
                    {field.description && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{field.description}</div>
                    )}
                    {field.type === 'select' ? (
                      <select
                        value={previewFormValues[field.name] || ''}
                        onChange={(e) =>
                          setPreviewFormValues({ ...previewFormValues, [field.name]: e.target.value })
                        }
                        className="w-full px-2.5 py-1 text-xs neu-select bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                      >
                        <option value="">Select option...</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        rows={2}
                        placeholder={field.placeholder || ''}
                        value={previewFormValues[field.name] || ''}
                        onChange={(e) =>
                          setPreviewFormValues({ ...previewFormValues, [field.name]: e.target.value })
                        }
                        className="w-full p-2 text-xs neu-input bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                      />
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                        placeholder={field.placeholder || ''}
                        value={previewFormValues[field.name] || ''}
                        onChange={(e) =>
                          setPreviewFormValues({ ...previewFormValues, [field.name]: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 text-xs neu-input bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                      />
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Section 1: Submit Support Ticket Form Layout & Standard Fields Config */}
      <form
        onSubmit={handleSaveFormConfig}
        className="neu-flat p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Portal Submit Support Ticket Form Layout
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              Configure the heading, helper message, location field, attachments, and manager forwarding options shown to end users.
            </p>
          </div>
          {formCfgSaveMsg && (
            <div className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{formCfgSaveMsg}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Submit Form Heading
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Submit IT Service Request"
              className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Default Priority
            </label>
            <select
              value={defaultPriority}
              onChange={(e) => setDefaultPriority(e.target.value as any)}
              className="w-full px-3 py-2 text-xs neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
            Form Helper Subtitle
          </label>
          <input
            type="text"
            value={formSubtitle}
            onChange={(e) => setFormSubtitle(e.target.value)}
            placeholder="Fast-track ticket creation enabled. You can submit directly without login or OTP."
            className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Location / Desk Field Label
            </label>
            <input
              type="text"
              value={locationDeskLabel}
              onChange={(e) => setLocationDeskLabel(e.target.value)}
              disabled={!showLocationDesk}
              className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-medium disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Location / Desk Placeholder
            </label>
            <input
              type="text"
              value={locationDeskPlaceholder}
              onChange={(e) => setLocationDeskPlaceholder(e.target.value)}
              disabled={!showLocationDesk}
              className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-medium disabled:opacity-50"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={showLocationDesk}
              onChange={(e) => setShowLocationDesk(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-600 cursor-pointer"
            />
            <span>Show Location / Desk</span>
          </label>

          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={requireLocationDesk && showLocationDesk}
              disabled={!showLocationDesk}
              onChange={(e) => setRequireLocationDesk(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-600 cursor-pointer disabled:opacity-40"
            />
            <span>Require Location / Desk</span>
          </label>

          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={showAttachments}
              onChange={(e) => setShowAttachments(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-600 cursor-pointer"
            />
            <span>Allow File / Snip Paste</span>
          </label>

          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={showForwardToManager}
              onChange={(e) => setShowForwardToManager(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-600 cursor-pointer"
            />
            <span>Show Manager CC &amp; Forward</span>
          </label>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-white/10">
          <button
            type="submit"
            disabled={savingFormCfg}
            className="neu-btn-primary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {savingFormCfg ? 'Saving Layout...' : 'Save Submit Form Layout'}
          </button>
        </div>
      </form>

      {/* Section 2: Ticket Categories & Taxonomy Manager */}
      <div
        id="ticket-categories-manager"
        className="neu-flat p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Ticket Categories &amp; Taxonomy
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              Categories displayed in the Submit Support Ticket form dropdown and conditional field rules.
            </p>
          </div>

          {ticketCategoriesSaveMsg && (
            <div className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300">
              {ticketCategoriesSaveMsg}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {ticketCategories.map((cat, idx) => (
            <div
              key={cat}
              className="flex items-center justify-between p-2.5 rounded-xl neu-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs"
            >
              {editingCategoryIdx === idx ? (
                <div className="flex items-center gap-1.5 w-full">
                  <input
                    type="text"
                    value={editingCategoryText}
                    onChange={(e) => setEditingCategoryText(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs neu-input bg-slate-50 dark:bg-slate-950 border border-cyan-500 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEditCategory(idx);
                      if (e.key === 'Escape') setEditingCategoryIdx(null);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveEditCategory(idx)}
                    className="px-2 py-1 text-[11px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCategoryIdx(null)}
                    className="px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
                    <span className="truncate">{cat}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEditCategory(idx, cat)}
                      className="p-1 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 cursor-pointer"
                      title="Edit Category Name"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveTicketCategory(cat)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleAddTicketCategory} className="flex items-center gap-2 pt-2">
          <input
            type="text"
            placeholder="Add new ticket category (e.g. Facilities & Infrastructure, Mobile Devices)..."
            value={newCategoryInput}
            onChange={(e) => setNewCategoryInput(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
          />
          <button
            type="submit"
            className="neu-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" /> Add Category
          </button>
        </form>
      </div>

      {/* Section 3: Custom Fields Table */}
      <div className="neu-flat rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Custom Ticket Form Fields ({customFields.length})
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Fields marked Portal Visible appear automatically on the End-User Submit Support Ticket form.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenNewField}
            className="neu-btn px-3 py-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-300 rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> New Field
          </button>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="bg-slate-100/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-white/10 uppercase tracking-wider font-bold text-[10px]">
              <tr>
                <th className="py-3 px-3 w-16 text-center">Order</th>
                <th className="py-3 px-3">Field Label</th>
                <th className="py-3 px-3">Variable Key</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Section</th>
                <th className="py-3 px-3">Mandatory on Create</th>
                <th className="py-3 px-3">Closure Gate</th>
                <th className="py-3 px-3">Portal Visible</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {customFields.map((f, index) => (
                <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-slate-500 dark:text-slate-400">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveField(index, 'up')}
                        className="p-1 hover:text-cyan-600 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === customFields.length - 1}
                        onClick={() => handleMoveField(index, 'down')}
                        className="p-1 hover:text-cyan-600 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                    {f.label}
                    {f.conditionalRule && (
                      <span className="block text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-medium">
                        ↳ if {f.conditionalRule.dependsOnField} == &ldquo;{f.conditionalRule.value}&rdquo;
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] font-bold text-cyan-700 dark:text-cyan-400">
                    {f.name}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] uppercase font-bold text-slate-700 dark:text-slate-300">
                    {f.type}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400 capitalize font-medium">
                    {f.section || 'General'}
                  </td>
                  <td className="py-3 px-3">
                    {f.required ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">Yes</span>
                    ) : (
                      <span className="text-slate-500 font-medium">Optional</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {f.requiredOnClose ? (
                      <span className="text-amber-700 dark:text-amber-400 font-bold">Yes (Gate)</span>
                    ) : (
                      <span className="text-slate-500 font-medium">No</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => onUpdateCustomField(f.id, { visibleOnPortal: !f.visibleOnPortal })}
                      className={`text-xs font-bold cursor-pointer hover:underline ${
                        f.visibleOnPortal
                          ? 'text-cyan-700 dark:text-cyan-400'
                          : 'text-slate-500 font-medium'
                      }`}
                    >
                      {f.visibleOnPortal ? 'Visible' : 'Staff Only'}
                    </button>
                  </td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => onUpdateCustomField(f.id, { enabled: f.enabled === false })}
                      className={`text-xs font-bold cursor-pointer hover:underline ${
                        f.enabled !== false
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-500 font-medium'
                      }`}
                    >
                      {f.enabled !== false ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditField(f)}
                        className="p-1 text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-300 transition-colors cursor-pointer"
                        title="Edit Field"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete custom field "${f.label}"?`)) {
                            onDeleteCustomField(f.id);
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Field"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Custom Field Modal */}
      {showFieldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg neu-modal p-6 rounded-2xl border border-slate-200 dark:border-white/15 max-h-[90vh] overflow-y-auto custom-scrollbar space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-white/10">
              <Sliders className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              {editingFieldId ? 'Edit Custom Field' : 'Create Dynamic Custom Field'}
            </h3>

            <form onSubmit={handleSaveFieldForm} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Display Label *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Device Asset Tag"
                    value={fieldLabel}
                    onChange={(e) => {
                      setFieldLabel(e.target.value);
                      if (!editingFieldId) {
                        setFieldKey(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, ''));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Field Key (JSON)
                  </label>
                  <input
                    type="text"
                    required
                    value={fieldKey}
                    onChange={(e) => setFieldKey(e.target.value)}
                    className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Data Type
                  </label>
                  <select
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="text">Single-line Text</option>
                    <option value="textarea">Multi-line Text</option>
                    <option value="select">Dropdown Select</option>
                    <option value="multiselect">Multi-select Checkboxes</option>
                    <option value="number">Integer / Number</option>
                    <option value="date">Date</option>
                    <option value="checkbox">Yes / No Checkbox</option>
                    <option value="user">User Selector</option>
                    <option value="asset">Asset Selector</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Display Section
                  </label>
                  <select
                    value={fieldSection}
                    onChange={(e) => setFieldSection(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="general">General Information</option>
                    <option value="technical">Technical Specifications</option>
                    <option value="environment">Environment &amp; Infrastructure</option>
                    <option value="closure">Closure &amp; Post-Mortem</option>
                  </select>
                </div>
              </div>

              {(fieldType === 'select' || fieldType === 'multiselect') && (
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Allowed Options (comma separated) *
                  </label>
                  <input
                    type="text"
                    placeholder="Option 1, Option 2, Option 3"
                    value={fieldOptions}
                    onChange={(e) => setFieldOptions(e.target.value)}
                    className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Placeholder Text
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Enter AST-1042..."
                    value={fieldPlaceholder}
                    onChange={(e) => setFieldPlaceholder(e.target.value)}
                    className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Help Description
                  </label>
                  <input
                    type="text"
                    placeholder="Guidance shown below field"
                    value={fieldDescription}
                    onChange={(e) => setFieldDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="tfEditorEnabled"
                    checked={fieldEnabled}
                    onChange={(e) => setFieldEnabled(e.target.checked)}
                    className="rounded border-slate-300 text-cyan-600"
                  />
                  <label htmlFor="tfEditorEnabled" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Field Enabled
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="tfEditorReq"
                    checked={fieldRequired}
                    onChange={(e) => setFieldRequired(e.target.checked)}
                    className="rounded border-slate-300 text-cyan-600"
                  />
                  <label htmlFor="tfEditorReq" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Mandatory when creating ticket
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="tfEditorClose"
                    checked={fieldRequiredOnClose}
                    onChange={(e) => setFieldRequiredOnClose(e.target.checked)}
                    className="rounded border-slate-300 text-cyan-600"
                  />
                  <label htmlFor="tfEditorClose" className="text-xs font-bold text-amber-700 dark:text-amber-300 cursor-pointer">
                    Mandatory on Closure Gate (Enforce before resolving/closing)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="tfEditorPortal"
                    checked={fieldPortalVisible}
                    onChange={(e) => setFieldPortalVisible(e.target.checked)}
                    className="rounded border-slate-300 text-cyan-600"
                  />
                  <label htmlFor="tfEditorPortal" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Visible to normal users on Self-Service Portal
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="tfEditorCond"
                    checked={hasConditionalRule}
                    onChange={(e) => setHasConditionalRule(e.target.checked)}
                    className="rounded border-slate-300 text-cyan-600"
                  />
                  <label htmlFor="tfEditorCond" className="text-xs font-bold text-indigo-700 dark:text-indigo-300 cursor-pointer">
                    Enable Conditional Display Rule (Show only when condition met)
                  </label>
                </div>

                {hasConditionalRule && (
                  <div className="p-3 rounded-xl neu-card bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 block text-[10px] font-bold mb-0.5">
                        When Field
                      </span>
                      <select
                        value={condField}
                        onChange={(e) => setCondField(e.target.value)}
                        className="w-full px-2 py-1 text-xs neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-200 font-semibold"
                      >
                        <option value="category">Category</option>
                        <option value="priority">Priority</option>
                        <option value="type">Type</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-slate-600 dark:text-slate-400 block text-[10px] font-bold mb-0.5">
                        Operator
                      </span>
                      <select
                        value={condOperator}
                        onChange={(e) => setCondOperator(e.target.value as any)}
                        className="w-full px-2 py-1 text-xs neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-200 font-semibold"
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Does Not Equal</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-slate-600 dark:text-slate-400 block text-[10px] font-bold mb-0.5">
                        Target Value
                      </span>
                      <input
                        type="text"
                        value={condValue}
                        onChange={(e) => setCondValue(e.target.value)}
                        className="w-full px-2 py-1 text-xs neu-input bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowFieldModal(false)}
                  className="neu-btn px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="neu-btn-primary px-5 py-2 text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap"
                >
                  {editingFieldId ? 'Update Field' : 'Create Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
