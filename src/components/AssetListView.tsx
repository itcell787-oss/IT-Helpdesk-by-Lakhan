import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
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
  ArrowUpDown,
  UserCheck,
  Clock,
  Tag,
  FileSpreadsheet,
  Edit,
  Download,
  CheckSquare,
  Square,
  Sparkles,
  ListPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Printer,
  MapPin,
} from 'lucide-react';
import { Asset, User as UserType, UserRole } from '../types';
import { AssetFormModal } from './AssetFormModal';
import { SearchableEmployeeSelect } from './SearchableEmployeeSelect';
import { CmdbStatisticsPanel } from './CmdbStatisticsPanel';

interface AssetListViewProps {
  assets: Asset[];
  users: UserType[];
  onCreateAsset: (data: Partial<Asset>) => void;
  onUpdateAsset?: (id: string, data: Partial<Asset>) => void;
  onDeleteAsset?: (assetId: string) => void;
  onBulkDeleteAssets?: (assetIds: string[]) => void;
  onBulkCreateAssets?: (assets: Partial<Asset>[]) => void;
  currentUserRole?: UserRole;
  defaultCurrency?: string;
  allowRequesterAssetSelfService?: boolean;
  onToggleRequesterAssetSelfService?: () => void;
}

export const AssetListView: React.FC<AssetListViewProps> = ({
  assets,
  users,
  onCreateAsset,
  onUpdateAsset,
  onDeleteAsset,
  onBulkDeleteAssets,
  onBulkCreateAssets,
  currentUserRole = 'admin',
  defaultCurrency = '₹',
  allowRequesterAssetSelfService = true,
  onToggleRequesterAssetSelfService,
}) => {
  const [activeStatusTab, setActiveStatusTab] = useState<'all' | 'active' | 'stock' | 'not_working' | 'scrap'>('all');

  // Filters: Search, Field, Category Type, Date, Assignment
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<'all' | 'name' | 'id' | 'model' | 'serial' | 'user' | 'ip'>('all');
  const [selectedType, setSelectedType] = useState('all');
  const [dateRange, setDateRange] = useState<'all' | 'this_year' | 'last_year' | 'warranty_active' | 'warranty_expiring_soon' | 'warranty_expired'>('all');
  const [dateSort, setDateSort] = useState<'purchase_desc' | 'purchase_asc' | 'warranty_asc' | 'id_asc'>('purchase_desc');
  const [assignedFilter, setAssignedFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [selectedAssignedUserId, setSelectedAssignedUserId] = useState('all');

  // Multi-Select / Marking State (Point 5)
  const [markedAssetIds, setMarkedAssetIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [showCategoryDeleteModal, setShowCategoryDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Asset['type']>('laptop');

  // Bulk Add form state
  const [bulkAddCategory, setBulkAddCategory] = useState<Asset['type']>('laptop');
  const [bulkAddCount, setBulkAddCount] = useState(5);
  const [bulkAddPrefix, setBulkAddPrefix] = useState('Lenovo ThinkPad T14');
  const [bulkAddManufacturer, setBulkAddManufacturer] = useState('Lenovo');
  const [bulkAddModel, setBulkAddModel] = useState('Gen 4 Core i7 16GB');
  const [bulkAddCost, setBulkAddCost] = useState('1200');
  const [bulkAddCostCurrency, setBulkAddCostCurrency] = useState<'$' | '₹' | string>(defaultCurrency || '₹');
  const [bulkAddWarrantyPeriod, setBulkAddWarrantyPeriod] = useState<'6Months' | '1 year' | '2 year' | '3 year'>('1 year');

  // Single Modals & Statistics Panel
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);

  // Configurable Asset Limits & Pagination: 25 (default), 50, 200, or Custom up to 500
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [customPageInput, setCustomPageInput] = useState<string>('25');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  // Auto-reset page to 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeStatusTab, selectedType, assignedFilter, selectedAssignedUserId, dateRange, searchQuery, searchField, dateSort]);

  const canManage = currentUserRole === 'superadmin' || currentUserRole === 'admin' || currentUserRole === 'manager';

  // Format currency helper
  const formatCost = (amt: number) => `${defaultCurrency}${amt.toLocaleString('en-IN')}`;

  // Counts and Total Prices for KPI deck
  const activeAssets = useMemo(() => assets.filter((a) => a.lifecycleStatus === 'in_service'), [assets]);
  const stockAssets = useMemo(() => assets.filter((a) => a.lifecycleStatus === 'in_stock'), [assets]);
  const notWorkingAssets = useMemo(() => assets.filter((a) => a.lifecycleStatus === 'in_repair'), [assets]);
  const scrapAssets = useMemo(() => assets.filter((a) => a.lifecycleStatus === 'retired'), [assets]);

  const activeCount = activeAssets.length;
  const stockCount = stockAssets.length;
  const notWorkingCount = notWorkingAssets.length;
  const scrapCount = scrapAssets.length;

  const activeCost = useMemo(() => activeAssets.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0), [activeAssets]);
  const stockCost = useMemo(() => stockAssets.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0), [stockAssets]);
  const repairCost = useMemo(() => notWorkingAssets.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0), [notWorkingAssets]);
  const scrapCost = useMemo(() => scrapAssets.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0), [scrapAssets]);

  // Total Asset Price = In Service/Active + In Stock (Pool). Repair and Scrap are excluded.
  const totalUsableAssetPrice = activeCost + stockCost;
  const totalActiveAssetUnits = activeCount + stockCount;

  const now = new Date();
  const ninetyDaysFromNow = new Date(Date.now() + 90 * 24 * 3600 * 1000);

  // Filtered Assets list
  const filteredAssets = useMemo(() => {
    return assets
      .filter((a) => {
        // Tab filter
        if (activeStatusTab === 'active' && a.lifecycleStatus !== 'in_service') return false;
        if (activeStatusTab === 'stock' && a.lifecycleStatus !== 'in_stock') return false;
        if (activeStatusTab === 'not_working' && a.lifecycleStatus !== 'in_repair') return false;
        if (activeStatusTab === 'scrap' && a.lifecycleStatus !== 'retired') return false;

        // Asset Type filter
        if (selectedType !== 'all' && a.type !== selectedType) return false;

        // Assignment filter
        if (assignedFilter === 'assigned' && !a.assignedUserId) return false;
        if (assignedFilter === 'unassigned' && a.assignedUserId) return false;
        if (selectedAssignedUserId !== 'all' && a.assignedUserId !== selectedAssignedUserId) return false;

        // Date range filter
        if (dateRange !== 'all') {
          const purchaseYear = a.purchaseDate ? new Date(a.purchaseDate).getFullYear() : null;
          const warrantyDate = a.warrantyExpiry ? new Date(a.warrantyExpiry) : null;

          if (dateRange === 'this_year' && purchaseYear !== now.getFullYear()) return false;
          if (dateRange === 'last_year' && purchaseYear !== now.getFullYear() - 1) return false;
          if (dateRange === 'warranty_active' && (!warrantyDate || warrantyDate < now)) return false;
          if (dateRange === 'warranty_expiring_soon') {
            if (!warrantyDate || warrantyDate < now || warrantyDate > ninetyDaysFromNow) return false;
          }
          if (dateRange === 'warranty_expired') {
            if (!warrantyDate || warrantyDate >= now) return false;
          }
        }

        // Search Query & Search Field Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          if (searchField === 'all') {
            const match =
              a.id.toLowerCase().includes(q) ||
              a.name.toLowerCase().includes(q) ||
              a.model.toLowerCase().includes(q) ||
              a.manufacturer.toLowerCase().includes(q) ||
              a.serialNumber.toLowerCase().includes(q) ||
              (a.ipAddress && a.ipAddress.toLowerCase().includes(q)) ||
              (a.assignedUserName && a.assignedUserName.toLowerCase().includes(q));
            if (!match) return false;
          } else if (searchField === 'name') {
            if (!a.name.toLowerCase().includes(q)) return false;
          } else if (searchField === 'id') {
            if (!a.id.toLowerCase().includes(q)) return false;
          } else if (searchField === 'model') {
            if (!a.model.toLowerCase().includes(q) && !a.manufacturer.toLowerCase().includes(q)) return false;
          } else if (searchField === 'serial') {
            if (!a.serialNumber.toLowerCase().includes(q) && !(a.macAddress && a.macAddress.toLowerCase().includes(q))) return false;
          } else if (searchField === 'user') {
            if (!a.assignedUserName || !a.assignedUserName.toLowerCase().includes(q)) return false;
          } else if (searchField === 'ip') {
            if (!a.ipAddress || !a.ipAddress.toLowerCase().includes(q)) return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (dateSort === 'purchase_desc') {
          return new Date(b.purchaseDate || 0).getTime() - new Date(a.purchaseDate || 0).getTime();
        }
        if (dateSort === 'purchase_asc') {
          return new Date(a.purchaseDate || 0).getTime() - new Date(b.purchaseDate || 0).getTime();
        }
        if (dateSort === 'warranty_asc') {
          return new Date(a.warrantyExpiry || '9999').getTime() - new Date(b.warrantyExpiry || '9999').getTime();
        }
        if (dateSort === 'id_asc') {
          return a.id.localeCompare(b.id);
        }
        return 0;
      });
  }, [assets, activeStatusTab, selectedType, assignedFilter, selectedAssignedUserId, dateRange, searchQuery, searchField, dateSort]);

  // Paginated assets calculation (configurable limits: 25, 50, 200, custom up to 500)
  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredAssets.length);
  const paginatedAssets = filteredAssets.slice(startIndex, endIndex);

  const handlePageSizeChange = (newSize: number) => {
    const clamped = Math.min(Math.max(Number(newSize) || 25, 1), 500);
    setPageSize(clamped);
    setCustomPageInput(String(clamped));
    setCurrentPage(1);
  };

  const isAnyFilterActive =
    searchQuery.trim() !== '' ||
    searchField !== 'all' ||
    selectedType !== 'all' ||
    dateRange !== 'all' ||
    dateSort !== 'purchase_desc' ||
    assignedFilter !== 'all' ||
    selectedAssignedUserId !== 'all';

  const resetAllFilters = () => {
    setSearchQuery('');
    setSearchField('all');
    setSelectedType('all');
    setDateRange('all');
    setDateSort('purchase_desc');
    setAssignedFilter('all');
    setSelectedAssignedUserId('all');
  };

  // Marking logic (Point 5)
  const isAllMarked = filteredAssets.length > 0 && filteredAssets.every((a) => markedAssetIds.includes(a.id));
  const isSomeMarked = filteredAssets.some((a) => markedAssetIds.includes(a.id)) && !isAllMarked;

  const handleToggleMarkAll = () => {
    if (isAllMarked) {
      // Unmark all in current filtered view
      const filteredIds = new Set(filteredAssets.map((a) => a.id));
      setMarkedAssetIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      // Mark all in current filtered view
      const newIds = new Set([...markedAssetIds, ...filteredAssets.map((a) => a.id)]);
      setMarkedAssetIds(Array.from(newIds));
    }
  };

  const handleToggleMark = (assetId: string) => {
    setMarkedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };

  const handleSelectAllOfCategory = (categoryType: string) => {
    const matching = assets.filter((a) => a.type === categoryType).map((a) => a.id);
    setMarkedAssetIds(Array.from(new Set([...markedAssetIds, ...matching])));
  };

  // Bulk Actions
  const handleExecuteBulkDelete = () => {
    if (markedAssetIds.length === 0) return;
    if (onBulkDeleteAssets) {
      onBulkDeleteAssets(markedAssetIds);
    } else if (onDeleteAsset) {
      markedAssetIds.forEach((id) => onDeleteAsset(id));
    }
    setMarkedAssetIds([]);
    setShowBulkDeleteModal(false);
  };

  const handleExecuteCategoryDelete = () => {
    const categoryAssetIds = assets.filter((a) => a.type === categoryToDelete).map((a) => a.id);
    if (categoryAssetIds.length === 0) {
      alert(`No assets found in category "${categoryToDelete}".`);
      setShowCategoryDeleteModal(false);
      return;
    }
    if (onBulkDeleteAssets) {
      onBulkDeleteAssets(categoryAssetIds);
    } else if (onDeleteAsset) {
      categoryAssetIds.forEach((id) => onDeleteAsset(id));
    }
    setMarkedAssetIds((prev) => prev.filter((id) => !categoryAssetIds.includes(id)));
    setShowCategoryDeleteModal(false);
  };

  const handleExecuteBulkAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const count = Math.min(Math.max(Number(bulkAddCount) || 1, 1), 50);
    const newAssets: Partial<Asset>[] = [];

    const expiryDate = new Date();
    switch (bulkAddWarrantyPeriod) {
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

    for (let i = 1; i <= count; i++) {
      newAssets.push({
        name: `${bulkAddPrefix} #${i}`,
        type: bulkAddCategory,
        manufacturer: bulkAddManufacturer,
        model: bulkAddModel,
        serialNumber: `SN-${bulkAddCategory.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        lifecycleStatus: 'in_stock',
        purchaseCost: bulkAddCost ? Number(bulkAddCost) : undefined,
        costCurrency: bulkAddCostCurrency,
        warrantyPeriod: bulkAddWarrantyPeriod,
        purchaseDate: new Date().toISOString().split('T')[0],
        warrantyExpiry: expiryDate.toISOString().split('T')[0],
      });
    }

    if (onBulkCreateAssets) {
      onBulkCreateAssets(newAssets);
    } else {
      newAssets.forEach((a) => onCreateAsset(a));
    }
    setShowBulkAddModal(false);
  };

  const handleBulkUpdateStatus = async (status: Asset['lifecycleStatus']) => {
    if (markedAssetIds.length === 0 || !onUpdateAsset) return;
    for (const id of markedAssetIds) {
      const updates: Partial<Asset> = { lifecycleStatus: status };
      if (status === 'in_stock' || status === 'retired') {
        updates.assignedUserId = undefined;
        updates.assignedUserName = undefined;
      }
      await onUpdateAsset(id, updates);
    }
    setMarkedAssetIds([]);
  };

  const handleQuickStatusChange = async (asset: Asset, newStatus: Asset['lifecycleStatus']) => {
    if (!onUpdateAsset) return;
    try {
      const updates: Partial<Asset> = { lifecycleStatus: newStatus };
      if (newStatus === 'in_stock' || newStatus === 'retired') {
        updates.assignedUserId = undefined;
        updates.assignedUserName = undefined;
      }
      await onUpdateAsset(asset.id, updates);
    } catch (err: any) {
      alert(err.message || 'Failed to update asset status');
    }
  };

  const executeDeleteAsset = () => {
    if (!assetToDelete || !onDeleteAsset) return;
    onDeleteAsset(assetToDelete.id);
    setAssetToDelete(null);
  };

  const handleExportExcel = () => {
    const headers = [
      'Asset ID',
      'Location / Desk No',
      'Asset Name',
      'Type',
      'Manufacturer',
      'Model Spec',
      'Serial Number',
      'Status',
      'Assigned User',
      'IP Address',
      'Purchase Date',
      'Warranty Expiry',
      'Warranty Period',
      'Purchase Cost',
      'Currency',
    ];

    const rows = filteredAssets.map((a) => [
      `"${a.id}"`,
      `"${(a.locationDesk || 'Unassigned Desk').replace(/"/g, '""')}"`,
      `"${(a.name || '').replace(/"/g, '""')}"`,
      `"${a.type}"`,
      `"${(a.manufacturer || '').replace(/"/g, '""')}"`,
      `"${(a.model || '').replace(/"/g, '""')}"`,
      `"${(a.serialNumber || '').replace(/"/g, '""')}"`,
      `"${a.lifecycleStatus}"`,
      `"${(a.assignedUserName || 'Unassigned (In Pool)').replace(/"/g, '""')}"`,
      `"${a.ipAddress || ''}"`,
      `"${a.purchaseDate || ''}"`,
      `"${a.warrantyExpiry || ''}"`,
      `"${a.warrantyPeriod || '1 year'}"`,
      `"${a.purchaseCost || 0}"`,
      `"${a.costCurrency && a.costCurrency !== '$' ? a.costCurrency : (defaultCurrency || '₹')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `IT_Hardware_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAssetPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      // Brand Title Header Banner
      doc.setFillColor(14, 165, 233); // Cyan
      doc.rect(0, 0, pageWidth, 22, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('IT Hardware & Assets CMDB Inventory Report', 14, 14);

      // Metadata
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated: ${new Date().toLocaleString()}   |   Status Tab: ${activeStatusTab.toUpperCase()}   |   Showing: ${filteredAssets.length} of ${assets.length} assets`,
        14,
        30
      );

      doc.setDrawColor(226, 232, 240);
      doc.line(14, 34, pageWidth - 14, 34);

      // Header row
      let startY = 40;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, startY, pageWidth - 28, 7, 'F');
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');

      doc.text('Asset ID', 17, startY + 5);
      doc.text('Location / Desk', 42, startY + 5);
      doc.text('Device Name', 80, startY + 5);
      doc.text('Category', 135, startY + 5);
      doc.text('Manufacturer & Model', 160, startY + 5);
      doc.text('Serial / Tag', 215, startY + 5);
      doc.text('Status', 245, startY + 5);
      doc.text('Assigned Employee', 265, startY + 5);

      startY += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      const items = filteredAssets.slice(0, 32);
      items.forEach((a) => {
        if (startY > 185) {
          doc.addPage();
          startY = 20;
          doc.setFillColor(241, 245, 249);
          doc.rect(14, startY, pageWidth - 28, 7, 'F');
          doc.setTextColor(51, 65, 85);
          doc.setFont('helvetica', 'bold');
          doc.text('Asset ID', 17, startY + 5);
          doc.text('Location / Desk', 42, startY + 5);
          doc.text('Device Name', 80, startY + 5);
          doc.text('Category', 135, startY + 5);
          doc.text('Manufacturer & Model', 160, startY + 5);
          doc.text('Serial / Tag', 215, startY + 5);
          doc.text('Status', 245, startY + 5);
          doc.text('Assigned Employee', 265, startY + 5);
          startY += 7;
          doc.setFont('helvetica', 'normal');
        }

        doc.setTextColor(30, 41, 59);
        doc.text(a.id, 17, startY + 4.5);
        doc.text((a.locationDesk || 'Unassigned').slice(0, 18), 42, startY + 4.5);
        doc.text(a.name.slice(0, 26), 80, startY + 4.5);
        doc.text(a.type.toUpperCase(), 135, startY + 4.5);
        doc.text(`${a.manufacturer || ''} ${a.model || ''}`.slice(0, 26), 160, startY + 4.5);
        doc.text((a.serialNumber || '—').slice(0, 15), 215, startY + 4.5);
        doc.text(a.lifecycleStatus.toUpperCase(), 245, startY + 4.5);
        doc.text((a.assignedUserName || 'Unassigned (Pool)').slice(0, 18), 265, startY + 4.5);

        doc.setDrawColor(241, 245, 249);
        doc.line(14, startY + 6, pageWidth - 14, startY + 6);
        startY += 6;
      });

      // Footer
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Lakhan Tech Helpdesk CMDB • Confidential Inventory Audit', 14, 200);
      doc.save(`it_hardware_inventory_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Failed to download asset PDF:', err);
    }
  };

  const statusLabel = (status: Asset['lifecycleStatus']) => {
    switch (status) {
      case 'in_service':
        return { label: 'In Service', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' };
      case 'in_stock':
        return { label: 'In Stock (Pool)', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-300' };
      case 'in_repair':
        return { label: 'In Repair', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300' };
      case 'retired':
        return { label: 'Retired', color: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-300' };
      default:
        return { label: status, color: 'bg-slate-100 text-slate-800' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Asset Form Modal (Add / Edit Asset - Point 4) */}
      <AssetFormModal
        isOpen={showCreateModal || !!assetToEdit}
        onClose={() => {
          setShowCreateModal(false);
          setAssetToEdit(null);
        }}
        users={users}
        initialData={assetToEdit}
        title={assetToEdit ? `Edit Hardware Asset: ${assetToEdit.name}` : 'Add New Hardware Asset'}
        onSubmit={(payload) => {
          if (assetToEdit && onUpdateAsset) {
            onUpdateAsset(assetToEdit.id, payload);
          } else {
            onCreateAsset(payload);
          }
        }}
      />

      {/* Bulk Delete Modal (Point 5) */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-modal max-w-md w-full p-6 rounded-2xl border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Selected Assets</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bulk removal from hardware inventory
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-rose-600 dark:text-rose-400 font-bold">{markedAssetIds.length}</strong> marked
              assets? This operation cannot be undone.
            </p>

            <div className="max-h-36 overflow-y-auto custom-scrollbar p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 space-y-1 font-mono text-[11px]">
              {markedAssetIds.map((id) => {
                const a = assets.find((x) => x.id === id);
                return (
                  <div key={id} className="flex items-center justify-between text-slate-800 dark:text-slate-200">
                    <span className="font-bold text-cyan-700 dark:text-cyan-400">{id}</span>
                    <span className="truncate max-w-[200px]">{a?.name || 'Asset'}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkDelete}
                className="px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-rose-600 hover:bg-rose-500 shadow-sm transition-all cursor-pointer"
              >
                Yes, Delete {markedAssetIds.length} Assets
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All in Category Modal (Point 5) */}
      {showCategoryDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-modal max-w-md w-full p-6 rounded-2xl border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Category Assets</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Purge all items of a selected category</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Select Hardware Category to Delete:
              </label>
              <select
                value={categoryToDelete}
                onChange={(e) => setCategoryToDelete(e.target.value as Asset['type'])}
                className="w-full px-3 py-2 text-xs font-bold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
              >
                <option value="laptop">Laptops ({assets.filter((a) => a.type === 'laptop').length})</option>
                <option value="desktop">Desktops ({assets.filter((a) => a.type === 'desktop').length})</option>
                <option value="server">Servers ({assets.filter((a) => a.type === 'server').length})</option>
                <option value="monitor">Monitors ({assets.filter((a) => a.type === 'monitor').length})</option>
                <option value="mobile">Mobiles / Tablets ({assets.filter((a) => a.type === 'mobile').length})</option>
                <option value="switch">Switches &amp; Routers ({assets.filter((a) => a.type === 'switch').length})</option>
                <option value="peripheral">Peripherals ({assets.filter((a) => a.type === 'peripheral').length})</option>
                <option value="license">Software Licenses ({assets.filter((a) => a.type === 'license').length})</option>
              </select>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300">
              This will permanently delete all{' '}
              <strong className="text-rose-600 dark:text-rose-400 font-bold uppercase">{categoryToDelete}</strong>{' '}
              assets ({assets.filter((a) => a.type === categoryToDelete).length} items).
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCategoryDeleteModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteCategoryDelete}
                className="px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-rose-600 hover:bg-rose-500 shadow-sm transition-all cursor-pointer"
              >
                Delete All in Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Multiple Assets to Selected Category Modal (Point 5) */}
      {showBulkAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-modal max-w-lg w-full p-6 rounded-2xl border border-cyan-500/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  <ListPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Batch Add Multiple Assets</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Generate multiple assets of selected category</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteBulkAdd} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Target Category *
                  </label>
                  <select
                    value={bulkAddCategory}
                    onChange={(e) => setBulkAddCategory(e.target.value as Asset['type'])}
                    className="w-full px-3 py-2 text-xs font-bold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="laptop">Laptop Computer</option>
                    <option value="desktop">Desktop Workstation</option>
                    <option value="server">Server Rack</option>
                    <option value="monitor">Display / Monitor</option>
                    <option value="mobile">Mobile / Tablet</option>
                    <option value="switch">Switch / Router</option>
                    <option value="peripheral">Printer / Peripheral</option>
                    <option value="license">Software License</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Quantity to Add (1 - 50) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={bulkAddCount}
                    onChange={(e) => setBulkAddCount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Asset Name Prefix *
                </label>
                <input
                  type="text"
                  required
                  value={bulkAddPrefix}
                  onChange={(e) => setBulkAddPrefix(e.target.value)}
                  placeholder="e.g. Dell Latitude 7440"
                  className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Assets will be registered as &ldquo;{bulkAddPrefix} #1&rdquo;, &ldquo;{bulkAddPrefix} #2&rdquo;, etc.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Manufacturer *
                  </label>
                  <input
                    type="text"
                    required
                    value={bulkAddManufacturer}
                    onChange={(e) => setBulkAddManufacturer(e.target.value)}
                    className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Model Specification *
                  </label>
                  <input
                    type="text"
                    required
                    value={bulkAddModel}
                    onChange={(e) => setBulkAddModel(e.target.value)}
                    className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Unit Cost (Optional)
                  </label>
                  <div className="flex items-center gap-1">
                    <select
                      value={bulkAddCostCurrency}
                      onChange={(e) => setBulkAddCostCurrency(e.target.value as '$' | '₹')}
                      className="w-14 px-2 py-2 text-xs font-bold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="$">$</option>
                      <option value="₹">₹</option>
                    </select>
                    <input
                      type="number"
                      value={bulkAddCost}
                      onChange={(e) => setBulkAddCost(e.target.value)}
                      placeholder="Cost"
                      className="w-full px-3 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Warranty Period *
                  </label>
                  <select
                    value={bulkAddWarrantyPeriod}
                    onChange={(e) =>
                      setBulkAddWarrantyPeriod(e.target.value as '6Months' | '1 year' | '2 year' | '3 year')
                    }
                    className="w-full px-3 py-2 text-xs font-bold neu-select bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="6Months">6 Months</option>
                    <option value="1 year">1 Year (Default)</option>
                    <option value="2 year">2 Years</option>
                    <option value="3 year">3 Years</option>
                  </select>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/40 text-xs text-cyan-900 dark:text-cyan-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-600" />
                <span>All {bulkAddCount} assets will be placed in the Inventory Pool (Unassigned / In Stock).</span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkAddModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="neu-btn-primary px-4 py-1.5 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Generate {bulkAddCount} Assets
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Single Asset Modal */}
      {assetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-modal max-w-md w-full p-6 rounded-2xl border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Asset</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Permanently remove from inventory</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300">
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold text-slate-900 dark:text-white">&ldquo;{assetToDelete.name}&rdquo;</span> (
              {assetToDelete.id})?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAssetToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteAsset}
                className="px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-rose-600 hover:bg-rose-500 shadow-sm transition-all cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Hardware &amp; IT Assets CMDB
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Workstations, laptops, network devices, lifecycle warranty monitoring, employee allocations, and category management.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowStatsModal(true)}
            className="neu-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer shadow-xs"
            title="CMDB Statistics & Filter Analytics (Inventory Count, Total Cost, Category & Status Breakdown)"
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>CMDB Statistics</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="neu-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
            title="Download full inventory CSV / Excel spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={handleDownloadAssetPdf}
            className="neu-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer shadow-xs"
            title="Download hardware inventory report in PDF format"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span>Print / PDF</span>
          </button>

          {canManage && (
            <>
              {/* Requester Self-Service Toggle Button (Asset Manager Control) */}
              <button
                type="button"
                onClick={onToggleRequesterAssetSelfService}
                className={`neu-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs ${
                  allowRequesterAssetSelfService
                    ? 'text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-400/40'
                    : 'text-slate-600 dark:text-slate-400 hover:text-cyan-600'
                }`}
                title="Toggle requester ability to view, register, and remove their assigned assets in the Requester Portal"
              >
                <UserCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Requester Self-Service: {allowRequesterAssetSelfService ? 'ON' : 'OFF'}</span>
              </button>

              {/* Batch Add Button (Point 5) */}
              <button
                type="button"
                onClick={() => setShowBulkAddModal(true)}
                className="neu-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-cyan-700 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 cursor-pointer"
                title="Batch add multiple assets of a selected category"
              >
                <ListPlus className="w-3.5 h-3.5" />
                Batch Add to Category
              </button>

              {/* Single Add Asset Button (Point 4) */}
              <button
                onClick={() => {
                  setAssetToEdit(null);
                  setShowCreateModal(true);
                }}
                className="neu-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Asset
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Status Deck with Asset Cost Total Price */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => setActiveStatusTab(activeStatusTab === 'active' ? 'all' : 'active')}
          className={`neu-card p-4 rounded-2xl border transition-all text-left cursor-pointer ${
            activeStatusTab === 'active'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 neu-pressed'
              : 'border-slate-200/90 dark:border-white/10 hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs font-bold">
            <span>In Service / Active</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-2">{activeCount}</div>
          <div className="mt-1 flex items-baseline justify-between text-xs font-mono">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">Total Asset Cost:</span>
            <span className="font-extrabold text-emerald-800 dark:text-emerald-300">{formatCost(activeCost)}</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Deployed with active staff</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveStatusTab(activeStatusTab === 'stock' ? 'all' : 'stock')}
          className={`neu-card p-4 rounded-2xl border transition-all text-left cursor-pointer ${
            activeStatusTab === 'stock'
              ? 'border-cyan-500 ring-2 ring-cyan-500/20 neu-pressed'
              : 'border-slate-200/90 dark:border-white/10 hover:border-cyan-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs font-bold">
            <span>In Stock (Pool)</span>
            <Boxes className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-700 dark:text-cyan-400 mt-2">{stockCount}</div>
          <div className="mt-1 flex items-baseline justify-between text-xs font-mono">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">Total Asset Cost:</span>
            <span className="font-extrabold text-cyan-800 dark:text-cyan-300">{formatCost(stockCost)}</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Unassigned pool inventory</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveStatusTab(activeStatusTab === 'not_working' ? 'all' : 'not_working')}
          className={`neu-card p-4 rounded-2xl border transition-all text-left cursor-pointer ${
            activeStatusTab === 'not_working'
              ? 'border-amber-500 ring-2 ring-amber-500/20 neu-pressed'
              : 'border-slate-200/90 dark:border-white/10 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs font-bold">
            <span>In Repair</span>
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-2">{notWorkingCount}</div>
          <div className="mt-1 flex items-baseline justify-between text-xs font-mono">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">Total Asset Cost:</span>
            <span className="font-extrabold text-amber-800 dark:text-amber-300">{formatCost(repairCost)}</span>
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400/90 mt-0.5 font-medium">Under maintenance (excluded)</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveStatusTab(activeStatusTab === 'scrap' ? 'all' : 'scrap')}
          className={`neu-card p-4 rounded-2xl border transition-all text-left cursor-pointer ${
            activeStatusTab === 'scrap'
              ? 'border-slate-500 ring-2 ring-slate-500/20 neu-pressed'
              : 'border-slate-200/90 dark:border-white/10 hover:border-slate-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs font-bold">
            <span>Retired / Scrap</span>
            <Archive className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-200 mt-2">{scrapCount}</div>
          <div className="mt-1 flex items-baseline justify-between text-xs font-mono">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">Total Asset Cost:</span>
            <span className="font-extrabold text-slate-700 dark:text-slate-300">{formatCost(scrapCost)}</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Decommissioned (excluded)</div>
        </button>
      </div>

      {/* TOTAL ASSET PRICE EXECUTIVE VALUATION SUMMARY BANNER */}
      <div className="neu-flat p-4 sm:p-5 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-indigo-500/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Total Usable Asset Price (In Service + In Stock Pool)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-300 font-extrabold border border-cyan-300 dark:border-cyan-800">
              {totalActiveAssetUnits} of {assets.length} Assets Active
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-cyan-700 dark:text-cyan-300">
            {formatCost(totalUsableAssetPrice)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Excludes Repair ({formatCost(repairCost)}) and Retired/Scrap ({formatCost(scrapCost)}) from total asset price as per IT asset management accounting standards.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
              <span className="text-slate-500 dark:text-slate-400 block text-[9px] uppercase font-sans">Active In-Service</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatCost(activeCost)}</span>
            </div>
            <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40">
              <span className="text-slate-500 dark:text-slate-400 block text-[9px] uppercase font-sans">Stock Pool</span>
              <span className="font-bold text-cyan-700 dark:text-cyan-300">{formatCost(stockCost)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowStatsModal(true)}
            className="neu-btn px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 rounded-xl flex items-center gap-1.5 hover:scale-[1.02] transition-transform cursor-pointer shadow-xs"
          >
            <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Open CMDB Statistics</span>
          </button>
        </div>
      </div>

      {/* POINT 5: MARKED ASSETS BATCH ACTION FLOATING BAR */}
      {markedAssetIds.length > 0 && (
        <div className="neu-flat p-3 rounded-2xl border border-cyan-500/40 bg-cyan-50/70 dark:bg-cyan-950/30 flex items-center justify-between gap-3 flex-wrap animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-500 animate-ping" />
            <span className="text-xs font-bold text-cyan-900 dark:text-cyan-200">
              <strong className="text-cyan-600 dark:text-cyan-300 font-extrabold text-sm">{markedAssetIds.length}</strong>{' '}
              asset{markedAssetIds.length > 1 ? 's' : ''} marked for bulk action
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bulk Update Status */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Set Status:</span>
              <button
                type="button"
                onClick={() => handleBulkUpdateStatus('in_stock')}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-cyan-100 hover:bg-cyan-200 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-200 border border-cyan-300 cursor-pointer"
              >
                In Pool
              </button>
              <button
                type="button"
                onClick={() => handleBulkUpdateStatus('in_service')}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 cursor-pointer"
              >
                In Service
              </button>
              <button
                type="button"
                onClick={() => handleBulkUpdateStatus('retired')}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 cursor-pointer"
              >
                Retired
              </button>
            </div>

            {/* Bulk Delete Selected Marked */}
            <button
              type="button"
              onClick={() => setShowBulkDeleteModal(true)}
              className="flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Marked ({markedAssetIds.length})
            </button>

            {/* Clear selection */}
            <button
              type="button"
              onClick={() => setMarkedAssetIds([])}
              className="px-2.5 py-1 text-xs font-bold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="neu-card p-4 rounded-2xl border border-slate-200/90 dark:border-white/10 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
          {/* Target Field Selector */}
          <div className="flex items-center gap-1 neu-btn px-2.5 py-1.5 rounded-xl shrink-0">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Search in:</span>
            <select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value as any)}
              className="text-xs bg-transparent text-slate-900 dark:text-slate-100 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">All Fields</option>
              <option value="name">Asset Name</option>
              <option value="id">Asset ID</option>
              <option value="model">Manufacturer &amp; Model</option>
              <option value="serial">Serial / MAC</option>
              <option value="user">Assigned Employee</option>
              <option value="ip">IP Address</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets by device name, serial tag, user, model..."
              className="w-full pl-9 pr-8 py-2 text-xs neu-input bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Asset Category Type Filter */}
          <div className="flex items-center gap-1.5 neu-btn px-3 py-1.5 rounded-xl shrink-0">
            <Filter className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs bg-transparent text-slate-900 dark:text-slate-100 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="laptop">Laptops</option>
              <option value="desktop">Desktops</option>
              <option value="server">Servers</option>
              <option value="monitor">Monitors</option>
              <option value="mobile">Mobiles &amp; Tablets</option>
              <option value="switch">Switches &amp; Routers</option>
              <option value="peripheral">Peripherals</option>
              <option value="license">Software Licenses</option>
            </select>
          </div>

          {/* Delete All in Category button (Point 5) */}
          {canManage && (
            <button
              type="button"
              onClick={() => {
                if (selectedType !== 'all') {
                  setCategoryToDelete(selectedType as Asset['type']);
                }
                setShowCategoryDeleteModal(true);
              }}
              className="neu-btn px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0 cursor-pointer"
              title="Delete all assets belonging to a selected category"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete by Category
            </button>
          )}
        </div>

        {/* Second Filter Row */}
        <div className="flex items-center gap-2.5 flex-wrap pt-2 border-t border-slate-200/60 dark:border-white/5">
          {/* Assignment Status Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 neu-btn rounded-xl">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 text-[11px] font-bold">Assigned:</span>
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value as any)}
              className="text-xs bg-transparent text-slate-900 dark:text-slate-100 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">All Assets</option>
              <option value="assigned">Assigned (In Use by Staff)</option>
              <option value="unassigned">Unassigned (In Pool / Available)</option>
            </select>
          </div>

          {/* POINT 6: Searchable Employee Dropdown Filter */}
          {assignedFilter !== 'unassigned' && (
            <div className="w-64 relative z-30">
              <SearchableEmployeeSelect
                users={users}
                selectedUserId={selectedAssignedUserId === 'all' ? undefined : selectedAssignedUserId}
                allowUnassigned={true}
                placeholder="Filter by employee (1000+ staff)..."
                onSelect={(user) => {
                  setSelectedAssignedUserId(user ? user.id : 'all');
                }}
              />
            </div>
          )}

          {/* Quick Mark of Category */}
          {selectedType !== 'all' && (
            <button
              type="button"
              onClick={() => handleSelectAllOfCategory(selectedType)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-cyan-100 hover:bg-cyan-200 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-300 border border-cyan-300 cursor-pointer"
            >
              Mark all {selectedType}s
            </button>
          )}

          {/* Reset Filters button */}
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}

          {/* Counter */}
          <span className="ml-auto text-[11px] font-mono text-slate-600 dark:text-slate-400 font-semibold">
            Showing <strong className="text-slate-900 dark:text-white font-bold">{filteredAssets.length}</strong> of{' '}
            {assets.length} assets
          </span>
        </div>
      </div>

      {/* Print Only Header for Physical Printouts */}
      <div className="hidden print:block mb-4 p-4 border-b-2 border-slate-900 text-slate-900">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">IT Asset & Hardware CMDB Inventory Report</h1>
            <p className="text-xs text-slate-600">Printed on {new Date().toLocaleString()} | Filter: {activeStatusTab.toUpperCase()} | Showing {filteredAssets.length} assets</p>
          </div>
          <div className="text-right text-xs font-mono font-bold">
            Lakhan Tech Helpdesk
          </div>
        </div>
      </div>

      {/* Assets Table with Point 5 MARK Checkbox Column */}
      <div className="neu-card rounded-2xl border border-slate-200/90 dark:border-white/10 overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs min-w-[1050px]">
            <thead className="bg-slate-200/80 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 border-b border-slate-300/90 dark:border-white/10 uppercase tracking-wider font-extrabold text-[11px]">
              <tr>
                {/* POINT 5: MASTER MARK CHECKBOX */}
                <th className="py-3 px-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleMarkAll}
                    className="p-1 rounded text-cyan-600 dark:text-cyan-400 hover:bg-slate-300/50 dark:hover:bg-white/10 cursor-pointer"
                    title={isAllMarked ? 'Deselect all' : 'Select all filtered assets'}
                  >
                    {isAllMarked ? (
                      <CheckSquare className="w-4 h-4 fill-cyan-500 text-white" />
                    ) : isSomeMarked ? (
                      <div className="w-4 h-4 border-2 border-cyan-500 rounded bg-cyan-500/30 flex items-center justify-center">
                        <div className="w-2 h-0.5 bg-cyan-600 dark:bg-cyan-300" />
                      </div>
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 w-28">Asset ID</th>
                <th className="py-3 px-3 w-36">Location / Desk No</th>
                <th className="py-3 px-3">Device / Hardware Name</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Manufacturer &amp; Model</th>
                <th className="py-3 px-3">Serial / MAC</th>
                <th className="py-3 px-3">Assigned Employee</th>
                <th className="py-3 px-3">Cost</th>
                <th className="py-3 px-3">Lifecycle Status</th>
                <th className="py-3 px-3">Warranty &amp; Period</th>
                {canManage && <th className="py-3 px-3 text-center w-20">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 12 : 11}
                    className="py-12 text-center text-slate-700 dark:text-slate-300 font-semibold text-sm"
                  >
                    No hardware or software assets match your specified filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedAssets.map((a) => {
                  const stat = statusLabel(a.lifecycleStatus);
                  const isMarked = markedAssetIds.includes(a.id);

                  // Calculate warranty indicator
                  const wDate = a.warrantyExpiry ? new Date(a.warrantyExpiry) : null;
                  const isWarrantyExpired = wDate ? wDate < now : false;
                  const isWarrantyExpiringSoon = wDate ? wDate >= now && wDate <= ninetyDaysFromNow : false;

                  return (
                    <tr
                      key={a.id}
                      onClick={() => handleToggleMark(a.id)}
                      className={`transition-colors cursor-pointer ${
                        isMarked
                          ? 'bg-cyan-50 dark:bg-cyan-950/40'
                          : 'hover:bg-cyan-50/70 dark:hover:bg-white/5'
                      }`}
                    >
                      {/* POINT 5: ROW MARK CHECKBOX */}
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleToggleMark(a.id)}
                          className="p-1 rounded text-cyan-600 dark:text-cyan-400 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
                        >
                          {isMarked ? (
                            <CheckSquare className="w-4 h-4 fill-cyan-500 text-white" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-3 font-mono font-extrabold text-cyan-700 dark:text-cyan-400 tabular-nums">
                        {a.id}
                      </td>

                      {/* Location / Assigned Desk No. beside Asset ID */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
                          <MapPin className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                          <span className="truncate max-w-[140px]" title={a.locationDesk || 'Unassigned Desk'}>
                            {a.locationDesk || 'Unassigned Desk'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-950 dark:text-slate-100">{a.name}</div>
                        {a.ipAddress && (
                          <div className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 font-semibold mt-0.5">
                            IP: {a.ipAddress}
                          </div>
                        )}
                        {a.customFields && Object.keys(a.customFields).length > 0 && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                            {Object.entries(a.customFields).slice(0, 2).map(([k, v]) => (
                              <span key={k} className="font-mono bg-slate-100 dark:bg-white/5 px-1.5 py-0.2 rounded border border-slate-200 dark:border-white/5">
                                {k}: {v}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className="capitalize text-slate-800 dark:text-slate-200 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700">
                          {a.type}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-900 dark:text-slate-200 font-semibold">
                        <div>{a.manufacturer}</div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 font-normal">{a.model}</div>
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-800 dark:text-slate-300 text-[11px]">
                        <div>{a.serialNumber}</div>
                        {a.macAddress && <div className="text-[10px] text-slate-500">MAC: {a.macAddress}</div>}
                      </td>

                      {/* POINT 6: Assigned Employee with EmpID and Email */}
                      <td className="py-3 px-3">
                        {a.assignedUserName ? (() => {
                          const assignedUser = a.assignedUserId ? users.find((u) => u.id === a.assignedUserId) : null;
                          const empCode = assignedUser?.employeeCode || (a.assignedUserName.toLowerCase().includes('lakhan') ? 'CBPL2045' : undefined);
                          return (
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-bold text-[9px] flex items-center justify-center shrink-0">
                                {a.assignedUserName.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                                  {empCode ? <span className="text-[10px] font-mono font-bold text-cyan-700 dark:text-cyan-400 mr-1">[{empCode}]</span> : null}
                                  {a.assignedUserName}
                                </span>
                                {assignedUser?.email && (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[140px]">{assignedUser.email}</span>
                                )}
                              </div>
                            </div>
                          );
                        })() : (
                          <span className="text-slate-500 dark:text-slate-400 italic text-[11px] font-medium bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full border border-slate-200 dark:border-white/5">
                            Unassigned (In Pool)
                          </span>
                        )}
                      </td>


                      {/* Cost */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {a.purchaseCost !== undefined ? (
                          <span>
                            {(a.costCurrency && a.costCurrency !== '$' ? a.costCurrency : (defaultCurrency || '₹'))}
                            {Number(a.purchaseCost).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Lifecycle Status with Inline Dropdown */}
                      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                        {canManage ? (
                          <select
                            value={a.lifecycleStatus}
                            onChange={(e) =>
                              handleQuickStatusChange(a, e.target.value as Asset['lifecycleStatus'])
                            }
                            className={`capitalize font-bold text-[11px] px-2 py-1 rounded-lg border cursor-pointer focus:outline-none ${stat.color}`}
                          >
                            <option value="in_service">In Service</option>
                            <option value="in_stock">In Stock (Pool)</option>
                            <option value="in_repair">In Repair</option>
                            <option value="retired">Retired</option>
                          </select>
                        ) : (
                          <span
                            className={`capitalize font-bold text-[11px] px-2.5 py-0.5 rounded-full border inline-block ${stat.color}`}
                          >
                            {stat.label}
                          </span>
                        )}
                      </td>

                      {/* Warranty Status & Period */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="text-slate-700 dark:text-slate-300">{a.warrantyExpiry || '—'}</span>
                          {isWarrantyExpired ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
                              Expired
                            </span>
                          ) : isWarrantyExpiringSoon ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                              Expiring Soon
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                              Active
                            </span>
                          )}
                        </div>
                        {a.warrantyPeriod && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                            Period: {a.warrantyPeriod}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      {canManage && (
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setAssetToEdit(a)}
                              className="p-1.5 text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-white rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-950/40 cursor-pointer"
                              title="Edit Asset Details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setAssetToDelete(a)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                              title="Delete Asset"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Limits Bar: 25 (default), 50, 200, Custom up to 500 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-slate-100/90 dark:bg-slate-900/80 border-t border-slate-200/90 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Showing <span className="font-bold text-cyan-700 dark:text-cyan-400 font-mono">{filteredAssets.length > 0 ? startIndex + 1 : 0}</span>–<span className="font-bold text-cyan-700 dark:text-cyan-400 font-mono">{endIndex}</span> of <span className="font-bold text-slate-900 dark:text-white font-mono">{filteredAssets.length}</span> assets
              {filteredAssets.length !== assets.length && (
                <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">
                  (filtered from {assets.length} total)
                </span>
              )}
            </span>

            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300 dark:border-white/10">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Per page:</span>
              <div className="inline-flex rounded-lg neu-flat p-0.5 border border-slate-300/80 dark:border-white/10">
                {[25, 50, 200].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setIsCustomMode(false);
                      handlePageSizeChange(size);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                      pageSize === size && !isCustomMode
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300'
                    }`}
                  >
                    {size}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsCustomMode(true)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                    isCustomMode || (pageSize !== 25 && pageSize !== 50 && pageSize !== 200)
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300'
                  }`}
                >
                  Custom
                </button>
              </div>

              {(isCustomMode || (pageSize !== 25 && pageSize !== 50 && pageSize !== 200)) && (
                <div className="flex items-center gap-1 animate-in fade-in">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={customPageInput}
                    onChange={(e) => setCustomPageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handlePageSizeChange(Number(customPageInput));
                      }
                    }}
                    placeholder="1-500"
                    className="w-16 px-2 py-1 text-xs neu-input rounded-md text-slate-900 dark:text-white font-mono text-center font-bold"
                    title="Enter custom page size up to 500"
                  />
                  <button
                    type="button"
                    onClick={() => handlePageSizeChange(Number(customPageInput))}
                    className="px-2 py-1 text-[11px] font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-md cursor-pointer"
                  >
                    Apply
                  </button>
                  <span className="text-[10px] text-slate-400">(Max 500)</span>
                </div>
              )}
            </div>
          </div>

          {/* Page navigation buttons */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage(1)}
              className="p-1.5 rounded-lg neu-btn text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:text-cyan-600 cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg neu-btn text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:text-cyan-600 cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-white font-mono">
              Page {safeCurrentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg neu-btn text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:text-cyan-600 cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="p-1.5 rounded-lg neu-btn text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:text-cyan-600 cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CMDB Statistics & Filter Analytics Modal (Point 5) */}
      {showStatsModal && (
        <CmdbStatisticsPanel
          assets={assets}
          defaultCurrency={defaultCurrency}
          onClose={() => setShowStatsModal(false)}
          isModal={true}
        />
      )}
    </div>
  );
};
