import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  ShieldCheck,
  Tag,
  Cpu,
  UserCheck,
  Building,
  CheckCircle,
  MapPin,
} from 'lucide-react';
import { Asset, User } from '../types';
import { SearchableEmployeeSelect } from './SearchableEmployeeSelect';

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (assetData: Partial<Asset>) => void;
  users: User[];
  initialData?: Asset | null;
  title?: string;
  defaultCurrency?: string;
}

export const AssetFormModal: React.FC<AssetFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  users,
  initialData,
  title,
  defaultCurrency = '₹',
}) => {
  // Form fields
  const [name, setName] = useState('');
  const [costCurrency, setCostCurrency] = useState<string>(defaultCurrency || '₹');
  const [purchaseCost, setPurchaseCost] = useState<string>('');
  const [type, setType] = useState<Asset['type']>('laptop');
  const [manufacturer, setManufacturer] = useState('Apple');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [locationDesk, setLocationDesk] = useState('');
  const [assignedUserId, setAssignedUserId] = useState<string | undefined>(undefined);
  const [isUnassignedPool, setIsUnassignedPool] = useState(true);
  const [lifecycleStatus, setLifecycleStatus] = useState<Asset['lifecycleStatus']>('in_stock');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [warrantyPeriod, setWarrantyPeriod] = useState<'6Months' | '1 year' | '2 year' | '3 year'>('1 year');
  const [warrantyExpiry, setWarrantyExpiry] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [customFields, setCustomFields] = useState<Array<{ key: string; value: string }>>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Compute warrantyExpiry automatically when purchaseDate or warrantyPeriod changes
  useEffect(() => {
    if (!purchaseDate) return;
    const baseDate = new Date(purchaseDate);
    if (isNaN(baseDate.getTime())) return;

    const expiryDate = new Date(baseDate);
    switch (warrantyPeriod) {
      case '6Months':
        expiryDate.setMonth(expiryDate.getMonth() + 6);
        break;
      case '1 year':
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        break;
      case '2 year':
        expiryDate.setFullYear(expiryDate.getFullYear() + 2);
        break;
      case '3 year':
        expiryDate.setFullYear(expiryDate.getFullYear() + 3);
        break;
    }
    setWarrantyExpiry(expiryDate.toISOString().split('T')[0]);
  }, [purchaseDate, warrantyPeriod]);

  // Sync initialData when modal opens or initialData changes
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setCostCurrency(initialData.costCurrency || defaultCurrency || '₹');
      setPurchaseCost(initialData.purchaseCost !== undefined ? String(initialData.purchaseCost) : '');
      setType(initialData.type || 'laptop');
      setManufacturer(initialData.manufacturer || 'Dell');
      setModel(initialData.model || '');
      setSerialNumber(initialData.serialNumber || '');
      setLocationDesk(initialData.locationDesk || '');
      setAssignedUserId(initialData.assignedUserId);
      setIsUnassignedPool(!initialData.assignedUserId);
      setLifecycleStatus(initialData.lifecycleStatus || 'in_service');
      setPurchaseDate(initialData.purchaseDate || new Date().toISOString().split('T')[0]);
      setWarrantyPeriod((initialData.warrantyPeriod as any) || '1 year');
      setWarrantyExpiry(initialData.warrantyExpiry || '');
      setIpAddress(initialData.ipAddress || '');

      if (initialData.customFields) {
        const entries = Object.entries(initialData.customFields).map(([k, v]) => ({ key: k, value: v }));
        setCustomFields(entries);
      } else {
        setCustomFields([]);
      }
    } else {
      // Defaults for new asset
      setName('');
      setCostCurrency((defaultCurrency as any) || '₹');
      setPurchaseCost('');
      setType('laptop');
      setManufacturer('Dell');
      setModel('');
      setSerialNumber(`SN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
      setLocationDesk('');
      setAssignedUserId(undefined);
      setIsUnassignedPool(true);
      setLifecycleStatus('in_stock');
      const today = new Date().toISOString().split('T')[0];
      setPurchaseDate(today);
      setWarrantyPeriod('1 year');
      setIpAddress('');
      setCustomFields([]);
    }
  }, [initialData, isOpen]);

  // Handle Unassigned (In Pool) toggle
  const handleToggleUnassigned = (unassigned: boolean) => {
    setIsUnassignedPool(unassigned);
    if (unassigned) {
      setAssignedUserId(undefined);
      setLifecycleStatus('in_stock');
    } else {
      if (lifecycleStatus === 'in_stock') {
        setLifecycleStatus('in_service');
      }
    }
  };

  // Add custom field entry
  const handleAddCustomField = (presetKey?: string) => {
    setCustomFields((prev) => [...prev, { key: presetKey || '', value: '' }]);
  };

  const handleUpdateCustomField = (index: number, field: 'key' | 'value', text: string) => {
    setCustomFields((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: text };
      return copy;
    });
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !serialNumber.trim()) {
      setFormError('Asset Name and Serial Number are required.');
      return;
    }

    const assignedUser = !isUnassignedPool && assignedUserId ? users.find((u) => u.id === assignedUserId) : null;

    // Convert customFields array to dictionary
    const customFieldsObj: Record<string, string> = {};
    for (const cf of customFields) {
      if (cf.key.trim()) {
        customFieldsObj[cf.key.trim()] = cf.value.trim();
      }
    }

    const payload: Partial<Asset> = {
      name: name.trim(),
      type,
      manufacturer: manufacturer.trim(),
      model: model.trim(),
      serialNumber: serialNumber.trim(),
      locationDesk: locationDesk.trim() || undefined,
      costCurrency,
      purchaseCost: purchaseCost ? Number(purchaseCost) : undefined,
      lifecycleStatus: isUnassignedPool ? 'in_stock' : lifecycleStatus,
      assignedUserId: assignedUser?.id,
      assignedUserName: assignedUser?.name,
      purchaseDate,
      warrantyPeriod,
      warrantyExpiry,
      ipAddress: ipAddress.trim() || undefined,
      customFields: Object.keys(customFieldsObj).length > 0 ? customFieldsObj : undefined,
    };

    onSubmit(payload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="glass-modal max-w-2xl w-full p-6 rounded-2xl border border-cyan-500/30 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {title || (initialData ? 'Edit Asset & Inventory Item' : 'Add New Hardware Asset')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Register or update hardware specifications, assigned staff, lifecycle state, and warranty.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              {formError}
            </div>
          )}

          {/* Row 1: Asset Name & Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Asset Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Apple MacBook Pro 16 / Dell Latitude 7440"
                className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Cost (Optional) in $, ₹
              </label>
              <div className="flex items-center gap-1">
                <select
                  value={costCurrency}
                  onChange={(e) => setCostCurrency(e.target.value as '$' | '₹')}
                  className="w-16 px-2 py-2 text-xs font-bold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
                >
                  <option value="$">$ (USD)</option>
                  <option value="₹">₹ (INR)</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchaseCost}
                  onChange={(e) => setPurchaseCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Type, Manufacturer, Model Specification */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Asset['type'])}
                className="w-full px-3 py-2 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
              >
                <option value="laptop">Laptop Computer</option>
                <option value="desktop">Desktop / Workstation</option>
                <option value="server">Server / Rack Unit</option>
                <option value="monitor">Display / Monitor</option>
                <option value="mobile">Mobile / Tablet</option>
                <option value="switch">Network Switch / Router</option>
                <option value="peripheral">Printer / Peripheral</option>
                <option value="license">Software License</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Manufacturer *
              </label>
              <input
                type="text"
                required
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Apple, Dell, Lenovo, HP, Cisco"
                className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Model Specification *
              </label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. 16-inch M3 Max 32GB"
                className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>
          </div>

          {/* Row 3: Serial Number, Location / Desk No, and IP/Network Address */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Serial Number / Service Tag *
              </label>
              <input
                type="text"
                required
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. C02G789XYZ12"
                className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Location / Assigned Desk No.
              </label>
              <input
                type="text"
                value={locationDesk}
                onChange={(e) => setLocationDesk(e.target.value)}
                placeholder="e.g. Desk #14-B, Floor 3 Desk 42"
                className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                IP Address / Network Host (Optional)
              </label>
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="e.g. 192.168.1.105"
                className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>
          </div>

          {/* Row 4: Assignment (Assigned Employee + Unassigned in Pool Toggle) */}
          <div className="p-3.5 rounded-2xl neu-flat border border-slate-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Assigned Employee / Hardware Allocation
              </label>

              {/* Unassigned (In Pool) checkbox toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={isUnassignedPool}
                  onChange={(e) => handleToggleUnassigned(e.target.checked)}
                  className="rounded text-cyan-600 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
                />
                <span>Unassigned (In Pool)</span>
              </label>
            </div>

            <div className="space-y-1 relative z-30">
              <SearchableEmployeeSelect
                users={users}
                selectedUserId={assignedUserId}
                disabled={isUnassignedPool}
                allowUnassigned={true}
                placeholder="Search by employee name, email, department (1000+ staff)..."
                onSelect={(selected) => {
                  if (selected) {
                    setAssignedUserId(selected.id);
                    setIsUnassignedPool(false);
                    if (lifecycleStatus === 'in_stock') {
                      setLifecycleStatus('in_service');
                    }
                  } else {
                    setAssignedUserId(undefined);
                    setIsUnassignedPool(true);
                    setLifecycleStatus('in_stock');
                  }
                }}
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                {isUnassignedPool
                  ? 'Device is stored in IT inventory pool and available for immediate reissue.'
                  : 'Assigned to verified staff member with direct custody and asset tracking.'}
              </span>
            </div>
          </div>

          {/* Row 5: Lifecycle Status & Purchase Date & Warranty Period */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Lifecycle Status *
              </label>
              <select
                value={lifecycleStatus}
                onChange={(e) => setLifecycleStatus(e.target.value as Asset['lifecycleStatus'])}
                className="w-full px-3 py-2 text-xs font-semibold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
              >
                <option value="in_service">In Service (Active / Deployed)</option>
                <option value="in_stock">In Stock (In Pool / Available)</option>
                <option value="in_repair">In Repair (Maintenance)</option>
                <option value="retired">Retired (Decommissioned)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Purchase Date *
              </label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Warranty Period *
              </label>
              <select
                value={warrantyPeriod}
                onChange={(e) =>
                  setWarrantyPeriod(e.target.value as '6Months' | '1 year' | '2 year' | '3 year')
                }
                className="w-full px-3 py-2 text-xs font-bold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
              >
                <option value="6Months">6 Months</option>
                <option value="1 year">1 Year (Default)</option>
                <option value="2 year">2 Years</option>
                <option value="3 year">3 Years</option>
              </select>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                Expires: <strong className="text-slate-700 dark:text-slate-300">{warrantyExpiry || 'N/A'}</strong>
              </div>
            </div>
          </div>

          {/* Row 6: Custom Field Builder ("can be added custom field") */}
          <div className="p-3.5 rounded-2xl neu-flat border border-slate-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-500" />
                  Custom Fields &amp; Hardware Specifications
                </label>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Add custom attributes like RAM, Processor, MAC, Desk Location, PO Number, etc.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleAddCustomField()}
                className="neu-btn text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-white flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Custom Field
              </button>
            </div>

            {/* Quick Suggest Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-semibold text-slate-500">Quick suggestions:</span>
              {['RAM / Memory', 'Processor / CPU', 'Storage / SSD', 'MAC Address', 'Desk / Room Location', 'Invoice #'].map(
                (preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleAddCustomField(preset)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 cursor-pointer"
                  >
                    + {preset}
                  </button>
                )
              )}
            </div>

            {/* List of Custom Fields */}
            {customFields.length > 0 && (
              <div className="space-y-2 pt-1">
                {customFields.map((cf, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Attribute Name (e.g. RAM)"
                      value={cf.key}
                      onChange={(e) => handleUpdateCustomField(idx, 'key', e.target.value)}
                      className="w-1/2 px-2.5 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg text-slate-900 dark:text-slate-100 font-semibold focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. 32GB DDR5)"
                      value={cf.value}
                      onChange={(e) => handleUpdateCustomField(idx, 'value', e.target.value)}
                      className="w-1/2 px-2.5 py-1.5 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomField(idx)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer shrink-0"
                      title="Remove field"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="neu-btn-primary flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl cursor-pointer shadow-md"
            >
              <CheckCircle className="w-4 h-4" />
              {initialData ? 'Save Asset Updates' : 'Add Hardware Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
