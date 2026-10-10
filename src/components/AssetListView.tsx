import React, { useState } from 'react';
import {
  Server,
  Laptop,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  Calendar,
  User,
  HardDrive,
  Cpu,
  Layers,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Archive,
  Boxes,
  BarChart3,
  TrendingUp,
  X,
  DollarSign,
  PieChart,
  Activity,
} from 'lucide-react';
import { Asset, User as UserType, UserRole } from '../types';

interface AssetListViewProps {
  assets: Asset[];
  users: UserType[];
  onCreateAsset: (data: Partial<Asset>) => void;
  onDeleteAsset?: (assetId: string) => void;
  currentUserRole?: UserRole;
}

export const AssetListView: React.FC<AssetListViewProps> = ({
  assets,
  users,
  onCreateAsset,
  onDeleteAsset,
  currentUserRole = 'admin',
}) => {
  const [activeStatusTab, setActiveStatusTab] = useState<'all' | 'active' | 'stock' | 'not_working' | 'scrap'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

  const canManage = currentUserRole === 'superadmin' || currentUserRole === 'admin';

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<Asset['type']>('laptop');
  const [manufacturer, setManufacturer] = useState('Apple');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [lifecycleStatus, setLifecycleStatus] = useState<Asset['lifecycleStatus']>('in_service');
  const [purchaseCost, setPurchaseCost] = useState(2500);

  // Counts for tabs
  const activeCount = assets.filter((a) => a.lifecycleStatus === 'in_service').length;
  const stockCount = assets.filter((a) => a.lifecycleStatus === 'in_stock').length;
  const notWorkingCount = assets.filter((a) => a.lifecycleStatus === 'in_repair').length;
  const scrapCount = assets.filter((a) => a.lifecycleStatus === 'retired').length;

  const filteredAssets = assets.filter((a) => {
    // Tab filter
    if (activeStatusTab === 'active' && a.lifecycleStatus !== 'in_service') return false;
    if (activeStatusTab === 'stock' && a.lifecycleStatus !== 'in_stock') return false;
    if (activeStatusTab === 'not_working' && a.lifecycleStatus !== 'in_repair') return false;
    if (activeStatusTab === 'scrap' && a.lifecycleStatus !== 'retired') return false;

    if (selectedType !== 'all' && a.type !== selectedType) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        a.id.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        a.serialNumber.toLowerCase().includes(q) ||
        (a.assignedUserName && a.assignedUserName.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedUser = users.find((u) => u.id === assignedUserId);
    onCreateAsset({
      name,
      type,
      manufacturer,
      model,
      serialNumber,
      lifecycleStatus,
      assignedUserId: assignedUser?.id,
      assignedUserName: assignedUser?.name,
      ipAddress: ipAddress || undefined,
      purchaseCost: Number(purchaseCost),
      purchaseDate: new Date().toISOString().split('T')[0],
      warrantyExpiry: new Date(Date.now() + 3 * 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
    });
    setShowCreateModal(false);
    setName('');
    setModel('');
    setSerialNumber('');
    setAssignedUserId('');
  };

  const executeDeleteAsset = () => {
    if (!assetToDelete || !onDeleteAsset) return;
    onDeleteAsset(assetToDelete.id);
    setAssetToDelete(null);
  };

  const statusLabel = (status: Asset['lifecycleStatus']) => {
    switch (status) {
      case 'in_service':
        return { label: 'Active (In Service)', color: 'text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800/60' };
      case 'in_stock':
        return { label: 'Stock (Available)', color: 'text-cyan-800 dark:text-cyan-300 font-bold bg-cyan-100 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-800/60' };
      case 'in_repair':
        return { label: 'Not Working (Repair)', color: 'text-amber-800 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800/60' };
      case 'retired':
        return { label: 'Scrap (Retired)', color: 'text-slate-800 dark:text-slate-300 font-bold bg-slate-200 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700/60' };
      default:
        return { label: status, color: 'text-slate-700 dark:text-slate-300 font-semibold' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Delete Confirmation Modal */}
      {assetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-modal max-w-md w-full p-6 rounded-2xl border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Remove Asset Confirmation</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Permanently delete hardware record from CMDB</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300">
              Are you sure you want to permanently remove asset <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">[{assetToDelete.id}]</span> &ldquo;{assetToDelete.name}&rdquo; ({assetToDelete.manufacturer} {assetToDelete.model})?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAssetToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteAsset}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white bg-rose-600 hover:bg-rose-500 shadow-sm transition-all cursor-pointer"
              >
                Yes, Remove Asset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asset Statistics Modal for Admins */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="neu-modal max-w-3xl w-full p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    IT Hardware Inventory Valuation &amp; Lifecycle Analytics
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Comprehensive asset breakdown, capital equipment valuation, warranty status &amp; utilization ratio.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStatsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Asset KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="neu-card p-3 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Total Asset Units</div>
                <div className="text-2xl font-bold font-mono text-cyan-700 dark:text-cyan-400 mt-1">{assets.length}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Tracked equipment</div>
              </div>

              <div className="neu-card p-3 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Total Valuation</div>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  ${assets.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Capital investment</div>
              </div>

              <div className="neu-card p-3 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Deployed In Service</div>
                <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                  {activeCount}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {assets.length ? Math.round((activeCount / assets.length) * 100) : 0}% active utilization
                </div>
              </div>

              <div className="neu-card p-3 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Stock &amp; Defective</div>
                <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
                  {stockCount + notWorkingCount}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {stockCount} pool / {notWorkingCount} repair
                </div>
              </div>
            </div>

            {/* Hardware Type Distribution */}
            <div className="neu-card p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Equipment Type Allocation
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { label: 'Laptops', type: 'laptop', icon: Laptop },
                  { label: 'Desktops', type: 'desktop', icon: Cpu },
                  { label: 'Servers', type: 'server', icon: Server },
                  { label: 'Network/Switches', type: 'switch', icon: HardDrive },
                  { label: 'Peripherals', type: 'peripheral', icon: Boxes },
                  { label: 'Software Licenses', type: 'license', icon: ShieldCheck },
                ].map((item) => {
                  const count = assets.filter((a) => a.type === item.type).length;
                  const Icon = item.icon;
                  return (
                    <div key={item.type} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">{item.label}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lifecycle Status & Warranty Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="neu-card p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Lifecycle Health Status
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-medium">
                    <span>Active In Service</span>
                    <span className="font-mono font-bold">{activeCount}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 font-medium">
                    <span>In Stock Pool (Ready for Deployment)</span>
                    <span className="font-mono font-bold">{stockCount}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-medium">
                    <span>In Repair / RMA / Defective</span>
                    <span className="font-mono font-bold">{notWorkingCount}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-slate-100 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 font-medium">
                    <span>Retired / Scrap / Decommissioned</span>
                    <span className="font-mono font-bold">{scrapCount}</span>
                  </div>
                </div>
              </div>

              <div className="neu-card p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Warranty &amp; Vendor Coverage
                </h4>
                <div className="space-y-2 text-xs">
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                    Track warranty expiration dates on workstations and network switches to prevent out-of-support hardware incidents.
                  </p>
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/5 space-y-1 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Total Assigned Users:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {assets.filter((a) => a.assignedUserId).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Unassigned Units:</span>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">
                        {assets.filter((a) => !a.assignedUserId).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowStatsModal(false)}
                className="neu-btn px-4 py-1.5 text-xs font-semibold rounded-lg text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                Close Asset Statistics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            IT Asset &amp; Inventory Lifecycle
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Hardware workstations, stock pool, defective/repair units, and scrap decommissioned assets.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canManage && (
            <button
              onClick={() => setShowStatsModal(true)}
              className="neu-btn flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 rounded-lg cursor-pointer transition-all hover:scale-[1.02]"
              title="Open Asset Analytics & Capital Valuation"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Statistics</span>
            </button>
          )}
          {canManage && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="neu-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer whitespace-nowrap transition-transform hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" /> Register New Asset
            </button>
          )}
        </div>
      </div>

      {/* Segmented Status Tabs: Active, Stock, Not Working, Scrap Asset */}
      <div className="neu-flat p-1.5 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
        {[
          { id: 'all', label: 'All Assets', count: assets.length, icon: Boxes },
          { id: 'active', label: 'Active Assets', count: activeCount, icon: CheckCircle2 },
          { id: 'stock', label: 'Stock Assets', count: stockCount, icon: Boxes },
          { id: 'not_working', label: 'Not Working Assets', count: notWorkingCount, icon: AlertTriangle },
          { id: 'scrap', label: 'Scrap Assets', count: scrapCount, icon: Archive },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeStatusTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveStatusTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'neu-btn-primary shadow-xs'
                  : 'neu-btn text-slate-800 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-cyan-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-slate-200'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 neu-flat p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-cyan-600 dark:text-cyan-400" />
          <input
            type="text"
            placeholder="Search by Asset ID, serial number, device name, model, employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 text-xs neu-input rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 font-semibold focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="neu-btn px-3 py-2 text-xs font-bold rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
          >
            <option value="all">All Asset Types</option>
            <option value="laptop">Laptops</option>
            <option value="desktop">Desktops</option>
            <option value="server">Servers</option>
            <option value="switch">Switches &amp; Routers</option>
            <option value="peripheral">Peripherals / AV</option>
            <option value="license">Software Licenses</option>
          </select>
        </div>
      </div>

      {/* Assets Grid Table */}
      <div className="neu-card rounded-2xl border border-slate-200/90 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs min-w-[950px]">
            <thead className="bg-slate-200/80 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 border-b border-slate-300/90 dark:border-white/10 uppercase tracking-wider font-extrabold text-[11px]">
              <tr>
                <th className="py-3 px-3">Asset ID</th>
                <th className="py-3 px-3">Device / Hardware Name</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Manufacturer &amp; Model</th>
                <th className="py-3 px-3">Serial / MAC</th>
                <th className="py-3 px-3">Assigned User</th>
                <th className="py-3 px-3">Lifecycle Status</th>
                <th className="py-3 px-3 text-right">Warranty</th>
                {canManage && <th className="py-3 px-2 text-center w-12">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 9 : 8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    No hardware or software assets match your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((a) => {
                  const stat = statusLabel(a.lifecycleStatus);

                  return (
                    <tr key={a.id} className="hover:bg-slate-100/70 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">
                        {a.id}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{a.name}</div>
                        {a.hostname && <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{a.hostname}</div>}
                      </td>
                      <td className="py-3 px-3">
                        <span className="capitalize text-slate-700 dark:text-slate-300 font-mono text-[11px]">{a.type}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-800 dark:text-slate-200">
                        {a.manufacturer} {a.model}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {a.serialNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-800 dark:text-slate-200">
                        {a.assignedUserName || <span className="text-slate-400 dark:text-slate-500 italic">Unassigned (In Pool)</span>}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`capitalize font-semibold text-[11px] px-2 py-0.5 rounded-full border ${stat.color}`}>
                          {stat.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {a.warrantyExpiry}
                      </td>
                      {canManage && (
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => setAssetToDelete(a)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title={`Remove asset ${a.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register Asset */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg glass-modal p-6 rounded-2xl border border-slate-200 dark:border-white/15 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              Register Asset in CMDB Inventory
            </h3>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Asset Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MacBook Pro 16 M3 Max, Dell Precision 5680"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200"
                  >
                    <option value="laptop">Laptop</option>
                    <option value="desktop">Desktop</option>
                    <option value="server">Server</option>
                    <option value="switch">Switch / Router</option>
                    <option value="peripheral">Peripheral / AV</option>
                    <option value="license">Software License</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Manufacturer *</label>
                  <input
                    type="text"
                    required
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Model Specification</label>
                  <input
                    type="text"
                    placeholder="e.g. 64GB RAM / 1TB SSD"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Serial Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. C02FX919MD6T"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Assigned Employee</label>
                  <select
                    value={assignedUserId}
                    onChange={(e) => setAssignedUserId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200"
                  >
                    <option value="">Unassigned (In Pool)</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Lifecycle Status</label>
                  <select
                    value={lifecycleStatus}
                    onChange={(e) => setLifecycleStatus(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200"
                  >
                    <option value="in_service">Active (In Service)</option>
                    <option value="in_stock">Stock (Available / Inventory)</option>
                    <option value="in_repair">Not Working (In Repair / Defective)</option>
                    <option value="retired">Scrap Asset (Retired / Decommissioned)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm cursor-pointer"
                >
                  Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
