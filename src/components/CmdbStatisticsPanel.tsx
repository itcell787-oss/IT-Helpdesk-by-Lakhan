import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Filter,
  DollarSign,
  Layers,
  Tag,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Boxes,
  CheckCircle2,
  Archive,
  Wrench,
  TrendingUp,
  Cpu,
  Building,
  UserCheck,
  Download,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Asset } from '../types';

interface CmdbStatisticsPanelProps {
  assets: Asset[];
  defaultCurrency?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export const CmdbStatisticsPanel: React.FC<CmdbStatisticsPanelProps> = ({
  assets,
  defaultCurrency = '₹',
  onClose,
  isModal = false,
}) => {
  // Filter Settings State
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterManufacturer, setFilterManufacturer] = useState<string>('all');
  const [filterAssignment, setFilterAssignment] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [filterWarranty, setFilterWarranty] = useState<'all' | 'valid' | 'expiring_soon' | 'expired'>('all');
  const [filterCostRange, setFilterCostRange] = useState<'all' | 'under_50k' | '50k_to_150k' | 'above_150k'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      setIsFullscreen(false);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  React.useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const now = useMemo(() => new Date(), []);
  const ninetyDaysFromNow = useMemo(() => new Date(Date.now() + 90 * 24 * 3600 * 1000), []);

  // Format currency helper
  const fmtMoney = (val: number, cur: string = defaultCurrency) => {
    return `${cur}${val.toLocaleString('en-IN')}`;
  };

  // Distinct manufacturers
  const manufacturers = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((a) => {
      if (a.manufacturer?.trim()) set.add(a.manufacturer.trim());
    });
    return Array.from(set).sort();
  }, [assets]);

  // Distinct types
  const types = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((a) => {
      if (a.type) set.add(a.type);
    });
    return Array.from(set).sort();
  }, [assets]);

  // Filtered assets according to the filter settings
  const filtered = useMemo(() => {
    return assets.filter((a) => {
      // Type
      if (filterType !== 'all' && a.type !== filterType) return false;

      // Status
      if (filterStatus !== 'all' && a.lifecycleStatus !== filterStatus) return false;

      // Manufacturer
      if (filterManufacturer !== 'all' && a.manufacturer?.trim().toLowerCase() !== filterManufacturer.toLowerCase()) {
        return false;
      }

      // Assignment
      if (filterAssignment === 'assigned' && !a.assignedUserId) return false;
      if (filterAssignment === 'unassigned' && !!a.assignedUserId) return false;

      // Warranty
      if (a.warrantyExpiry) {
        const expiry = new Date(a.warrantyExpiry);
        if (filterWarranty === 'valid' && expiry <= now) return false;
        if (filterWarranty === 'expiring_soon' && (expiry <= now || expiry > ninetyDaysFromNow)) return false;
        if (filterWarranty === 'expired' && expiry > now) return false;
      } else if (filterWarranty !== 'all') {
        return false;
      }

      // Cost Range
      const cost = a.purchaseCost || 0;
      if (filterCostRange === 'under_50k' && cost >= 50000) return false;
      if (filterCostRange === '50k_to_150k' && (cost < 50000 || cost > 150000)) return false;
      if (filterCostRange === 'above_150k' && cost <= 150000) return false;

      return true;
    });
  }, [assets, filterType, filterStatus, filterManufacturer, filterAssignment, filterWarranty, filterCostRange, now, ninetyDaysFromNow]);

  // Calculate statistics metrics
  const stats = useMemo(() => {
    const totalCount = filtered.length;
    let totalCost = 0;
    let inServiceCost = 0;
    let inStockCost = 0;
    let inRepairCost = 0;
    let retiredCost = 0;

    let inServiceCount = 0;
    let inStockCount = 0;
    let inRepairCount = 0;
    let retiredCount = 0;

    let assignedCount = 0;
    let unassignedCount = 0;

    let warrantyValidCount = 0;
    let warrantyValidCost = 0;
    let warrantyExpiringSoonCount = 0;
    let warrantyExpiredCount = 0;

    // Type Breakdown map
    const byTypeMap: Record<string, { count: number; cost: number }> = {};
    // Manufacturer Breakdown map
    const byMfgMap: Record<string, { count: number; cost: number }> = {};

    filtered.forEach((a) => {
      const c = Number(a.purchaseCost) || 0;
      totalCost += c;

      if (a.lifecycleStatus === 'in_service') {
        inServiceCount++;
        inServiceCost += c;
      } else if (a.lifecycleStatus === 'in_stock') {
        inStockCount++;
        inStockCost += c;
      } else if (a.lifecycleStatus === 'in_repair') {
        inRepairCount++;
        inRepairCost += c;
      } else if (a.lifecycleStatus === 'retired') {
        retiredCount++;
        retiredCost += c;
      }

      if (a.assignedUserId) {
        assignedCount++;
      } else {
        unassignedCount++;
      }

      // Warranty checks
      if (a.warrantyExpiry) {
        const exp = new Date(a.warrantyExpiry);
        if (exp > now) {
          warrantyValidCount++;
          warrantyValidCost += c;
          if (exp <= ninetyDaysFromNow) {
            warrantyExpiringSoonCount++;
          }
        } else {
          warrantyExpiredCount++;
        }
      }

      // Group by type
      const t = a.type || 'other';
      if (!byTypeMap[t]) byTypeMap[t] = { count: 0, cost: 0 };
      byTypeMap[t].count++;
      byTypeMap[t].cost += c;

      // Group by manufacturer
      const m = a.manufacturer?.trim() || 'Unknown';
      if (!byMfgMap[m]) byMfgMap[m] = { count: 0, cost: 0 };
      byMfgMap[m].count++;
      byMfgMap[m].cost += c;
    });

    // Active Capital Asset Valuation = In Service + In Stock Pool (Repair & Scrap are EXCLUDED)
    const activeCapitalPrice = inServiceCost + inStockCost;
    const excludedMaintenanceScrapPrice = inRepairCost + retiredCost;
    const avgCost = totalCount > 0 ? Math.round(totalCost / totalCount) : 0;

    return {
      totalCount,
      totalCost,
      inServiceCount,
      inServiceCost,
      inStockCount,
      inStockCost,
      inRepairCount,
      inRepairCost,
      retiredCount,
      retiredCost,
      activeCapitalPrice,
      excludedMaintenanceScrapPrice,
      assignedCount,
      unassignedCount,
      warrantyValidCount,
      warrantyValidCost,
      warrantyExpiringSoonCount,
      warrantyExpiredCount,
      avgCost,
      byType: Object.entries(byTypeMap).sort((a, b) => b[1].cost - a[1].cost),
      byMfg: Object.entries(byMfgMap).sort((a, b) => b[1].cost - a[1].cost),
    };
  }, [filtered, now, ninetyDaysFromNow]);

  const resetFilters = () => {
    setFilterType('all');
    setFilterStatus('all');
    setFilterManufacturer('all');
    setFilterAssignment('all');
    setFilterWarranty('all');
    setFilterCostRange('all');
  };

  const hasActiveFilters =
    filterType !== 'all' ||
    filterStatus !== 'all' ||
    filterManufacturer !== 'all' ||
    filterAssignment !== 'all' ||
    filterWarranty !== 'all' ||
    filterCostRange !== 'all';

  const content = (
    <div className="space-y-5">
      {/* Header bar with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Hardware &amp; IT Assets CMDB Statistics &amp; Analytics
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 font-bold border border-violet-300">
                Filtered: {stats.totalCount} of {assets.length} Assets
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive financial valuation, inventory counts, lifecycle status breakdown, and warranty health with multi-field filter settings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="neu-btn px-3 py-1.5 text-xs font-bold rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="neu-btn px-3 py-1.5 text-xs font-bold rounded-xl text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/40 flex items-center gap-1.5 cursor-pointer shadow-xs border border-violet-400/30"
            title={isFullscreen ? 'Exit Fullscreen' : 'Open Fullscreen Dashboard'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="neu-btn px-3 py-1.5 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Close Dashboard
            </button>
          )}
        </div>
      </div>

      {/* FILTER SETTINGS CONTROLS BAR */}
      <div className="p-4 rounded-2xl neu-flat border border-slate-200 dark:border-white/10 space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Statistics Filter Settings</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Real-time re-aggregation active
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* 1. Category / Type */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
              Category / Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-bold neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              <option value="all">All Categories ({assets.length})</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t.toUpperCase()} ({assets.filter((a) => a.type === t).length})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Lifecycle Status */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
              Lifecycle Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-bold neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="in_service">In Service / Active</option>
              <option value="in_stock">In Stock (Pool)</option>
              <option value="in_repair">In Repair</option>
              <option value="retired">Retired / Scrap</option>
            </select>
          </div>

          {/* 3. Manufacturer */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
              Manufacturer
            </label>
            <select
              value={filterManufacturer}
              onChange={(e) => setFilterManufacturer(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-bold neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              <option value="all">All Manufacturers</option>
              {manufacturers.map((m) => (
                <option key={m} value={m}>
                  {m} ({assets.filter((a) => a.manufacturer?.trim().toLowerCase() === m.toLowerCase()).length})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Assignment */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
              Assignment
            </label>
            <select
              value={filterAssignment}
              onChange={(e) => setFilterAssignment(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs font-bold neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              <option value="all">All Allocations</option>
              <option value="assigned">Assigned to Staff</option>
              <option value="unassigned">Unassigned (In Pool)</option>
            </select>
          </div>

          {/* 5. Warranty Period / Expiry */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
              Warranty Status
            </label>
            <select
              value={filterWarranty}
              onChange={(e) => setFilterWarranty(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs font-bold neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              <option value="all">All Warranty States</option>
              <option value="valid">Active &amp; Covered</option>
              <option value="expiring_soon">Expiring in &le; 90 Days</option>
              <option value="expired">Expired Warranty</option>
            </select>
          </div>

          {/* 6. Cost Range */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
              Cost Tier
            </label>
            <select
              value={filterCostRange}
              onChange={(e) => setFilterCostRange(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs font-bold neu-select bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              <option value="all">All Price Ranges</option>
              <option value="under_50k">Under {defaultCurrency}50,000</option>
              <option value="50k_to_150k">{defaultCurrency}50,000 &ndash; {defaultCurrency}1,50,000</option>
              <option value="above_150k">Above {defaultCurrency}1,50,000</option>
            </select>
          </div>
        </div>
      </div>

      {/* CORE FINANCIAL VALUATION & CAPITAL ASSET SUMMARY DECK */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL CAPITAL ASSET PRICE (Active Valuation) */}
        <div className="p-4 rounded-2xl neu-card border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Total Active Asset Price
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300 tabular-nums">
            {fmtMoney(stats.activeCapitalPrice)}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
            Includes <strong className="text-emerald-600 dark:text-emerald-400">In Service ({fmtMoney(stats.inServiceCost)})</strong> +{' '}
            <strong className="text-cyan-600 dark:text-cyan-400">In Stock Pool ({fmtMoney(stats.inStockCost)})</strong>.
          </div>
          <div className="text-[10px] text-slate-500 font-medium pt-1 border-t border-emerald-500/20">
            * Repair &amp; Scrap costs strictly excluded from active capital price.
          </div>
        </div>

        {/* IN SERVICE / ACTIVE VALUATION */}
        <div className="p-4 rounded-2xl neu-card border border-emerald-300/80 dark:border-emerald-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              In Service / Active
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">
            {fmtMoney(stats.inServiceCost)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Inventory Count:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {stats.inServiceCount} Units ({stats.totalCount > 0 ? Math.round((stats.inServiceCount / stats.totalCount) * 100) : 0}%)
            </span>
          </div>
        </div>

        {/* IN STOCK (POOL) VALUATION */}
        <div className="p-4 rounded-2xl neu-card border border-cyan-300/80 dark:border-cyan-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              In Stock (Pool)
            </span>
            <Boxes className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-700 dark:text-cyan-400 tabular-nums">
            {fmtMoney(stats.inStockCost)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Inventory Count:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {stats.inStockCount} Units ({stats.totalCount > 0 ? Math.round((stats.inStockCount / stats.totalCount) * 100) : 0}%)
            </span>
          </div>
        </div>

        {/* IN REPAIR & RETIRED SCRAP (EXCLUDED) */}
        <div className="p-4 rounded-2xl neu-card border border-amber-300/80 dark:border-amber-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              In Repair &amp; Scrap (Excluded)
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400 tabular-nums">
            {fmtMoney(stats.excludedMaintenanceScrapPrice)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
            <div className="flex justify-between">
              <span>Repair: {fmtMoney(stats.inRepairCost)}</span>
              <span className="font-mono font-bold text-amber-600">{stats.inRepairCount} units</span>
            </div>
            <div className="flex justify-between">
              <span>Scrap: {fmtMoney(stats.retiredCost)}</span>
              <span className="font-mono font-bold text-slate-500">{stats.retiredCount} units</span>
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED STATISTICAL FIELD BREAKDOWNS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Breakdown by Category / Device Type */}
        <div className="p-4 rounded-2xl neu-flat border border-slate-200 dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Category &amp; Device Type Breakdown</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {stats.byType.length} Active Categories
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
            {stats.byType.map(([typeKey, data]) => {
              const pct = stats.totalCost > 0 ? Math.round((data.cost / stats.totalCost) * 100) : 0;
              return (
                <div key={typeKey} className="p-2.5 rounded-xl neu-card bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white capitalize flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-cyan-600" />
                      {typeKey}
                    </span>
                    <div className="text-right">
                      <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                        {fmtMoney(data.cost)}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1.5">({data.count} units)</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 dark:bg-indigo-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {stats.byType.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400">
                No asset categories match current filter settings.
              </div>
            )}
          </div>
        </div>

        {/* Breakdown by Manufacturer & Brand */}
        <div className="p-4 rounded-2xl neu-flat border border-slate-200 dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <Building className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Manufacturer &amp; Brand Valuation</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {stats.byMfg.length} Vendors
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
            {stats.byMfg.map(([mfgKey, data]) => {
              const pct = stats.totalCost > 0 ? Math.round((data.cost / stats.totalCost) * 100) : 0;
              return (
                <div key={mfgKey} className="p-2.5 rounded-xl neu-card bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {mfgKey}
                    </span>
                    <div className="text-right">
                      <span className="font-mono font-extrabold text-cyan-700 dark:text-cyan-400">
                        {fmtMoney(data.cost)}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1.5">({data.count} units)</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-600 dark:bg-cyan-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {stats.byMfg.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400">
                No manufacturers match current filter settings.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WARRANTY & WORKFORCE ALLOCATION METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-3.5 rounded-xl neu-card border border-slate-200 dark:border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-semibold">
            <span>Average Unit Cost</span>
            <DollarSign className="w-4 h-4 text-violet-600" />
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-white">
            {fmtMoney(stats.avgCost)}
          </div>
          <div className="text-[10px] text-slate-500">Across {stats.totalCount} filtered hardware units</div>
        </div>

        <div className="p-3.5 rounded-xl neu-card border border-slate-200 dark:border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-semibold">
            <span>Warranty Compliance</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {stats.warrantyValidCount} Valid Units
          </div>
          <div className="text-[10px] text-slate-500">
            {stats.warrantyExpiringSoonCount} expiring in 90 days · {stats.warrantyExpiredCount} expired
          </div>
        </div>

        <div className="p-3.5 rounded-xl neu-card border border-slate-200 dark:border-white/10 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-semibold">
            <span>Workforce Allocation</span>
            <UserCheck className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-lg font-bold font-mono text-cyan-600 dark:text-cyan-400">
            {stats.assignedCount} Deployed
          </div>
          <div className="text-[10px] text-slate-500">
            {stats.unassignedCount} units unassigned in pool
          </div>
        </div>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 p-4 sm:p-6 w-screen h-screen overflow-y-auto custom-scrollbar bg-slate-950/95 backdrop-blur-md text-slate-900 dark:text-slate-100 animate-in fade-in">
        <div className="max-w-7xl mx-auto space-y-5 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-violet-500/40 shadow-2xl">
          {content}
        </div>
      </div>
    );
  }

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
        <div className="glass-modal max-w-5xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-6 rounded-3xl border border-violet-500/30 shadow-2xl">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="neu-flat p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm animate-in fade-in">
      {content}
    </div>
  );
};
