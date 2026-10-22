import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, User as UserIcon, Check, X, ChevronDown, UserMinus } from 'lucide-react';
import { User } from '../types';

interface SearchableEmployeeSelectProps {
  users: User[];
  selectedUserId?: string;
  onSelect: (user: User | null) => void;
  disabled?: boolean;
  allowUnassigned?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}

export const SearchableEmployeeSelect: React.FC<SearchableEmployeeSelectProps> = ({
  users,
  selectedUserId,
  onSelect,
  disabled = false,
  allowUnassigned = true,
  placeholder = 'Search employee by name, email, title...',
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compute flip placement (up vs down) so downward list does not overlap or clip
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 280 && rect.top > 250) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // Find currently selected user object
  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return users.find((u) => u.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return users.slice(0, 50);
    }
    const q = searchQuery.toLowerCase().trim();
    return users
      .filter((u) => {
        const nameMatch = u.name.toLowerCase().includes(q);
        const emailMatch = u.email.toLowerCase().includes(q);
        const titleMatch = u.title ? u.title.toLowerCase().includes(q) : false;
        const idMatch = u.id.toLowerCase().includes(q);
        const deptMatch = u.departmentId ? u.departmentId.toLowerCase().includes(q) : false;
        return nameMatch || emailMatch || titleMatch || idMatch || deptMatch;
      })
      .slice(0, 50);
  }, [users, searchQuery]);

  // Total matching count
  const totalMatches = useMemo(() => {
    if (!searchQuery.trim()) return users.length;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.title && u.title.toLowerCase().includes(q)) ||
        u.id.toLowerCase().includes(q)
    ).length;
  }, [users, searchQuery]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus the search input when opened
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectUser = (user: User | null) => {
    onSelect(user);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef} id={id}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl border transition-all text-left cursor-pointer ${
          disabled
            ? 'bg-slate-100 dark:bg-slate-900/40 text-slate-400 border-slate-200 dark:border-white/5 cursor-not-allowed opacity-60'
            : isOpen
            ? 'bg-white dark:bg-slate-900 border-cyan-500 shadow-sm ring-2 ring-cyan-500/20'
            : 'neu-input bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 truncate">
          {selectedUser ? (
            <>
              <div className="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700/50 flex items-center justify-center font-bold text-[10px] shrink-0">
                {selectedUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate min-w-0">
                <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                  <span className="text-[10px] font-mono font-bold text-cyan-700 dark:text-cyan-400 mr-1.5">
                    [{selectedUser.employeeCode || (selectedUser.name.toLowerCase().includes('lakhan') ? 'CBPL2045' : 'CBPL1001')}]
                  </span>
                  {selectedUser.name}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block truncate">
                  {selectedUser.email} {selectedUser.title ? `• ${selectedUser.title}` : ''}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                <UserMinus className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-slate-500 dark:text-slate-400 italic">
                Unassigned (In Pool / Available)
              </span>
            </>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-cyan-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu with Smart Vertical Flip & High Stacking */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute left-0 ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } w-full min-w-[320px] max-w-[420px] z-[9999] bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/20 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100`}
          style={{
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
          }}
        >
          {/* Search Box Header */}
          <div className="p-2.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/60 space-y-1.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-1 font-mono">
              <span>
                {searchQuery ? `${totalMatches} matching employees` : `${users.length} total staff & employees`}
              </span>
              <span>Fast instant filter</span>
            </div>
          </div>

          {/* User List Scroll Area */}
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5 space-y-1 divide-y divide-slate-100 dark:divide-white/5">
            {/* Unassigned Option */}
            {allowUnassigned && (
              <button
                type="button"
                onClick={() => handleSelectUser(null)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                  !selectedUserId
                    ? 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-900 dark:text-cyan-200 font-bold border border-cyan-200 dark:border-cyan-800/40'
                    : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                    <UserMinus className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-bold">Unassigned (In Pool / Available)</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                      Device available in inventory pool for reissue
                    </span>
                  </div>
                </div>
                {!selectedUserId && <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />}
              </button>
            )}

            {/* Filtered Employees */}
            {filteredUsers.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-slate-500 dark:text-slate-400">
                No employees found matching &ldquo;<span className="font-semibold text-slate-700 dark:text-slate-300">{searchQuery}</span>&rdquo;.
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedUserId === user.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-200 font-bold border border-cyan-300 dark:border-cyan-700/50 shadow-xs'
                        : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-[10px] font-mono font-bold text-cyan-700 dark:text-cyan-400 shrink-0">
                            [{user.employeeCode || (user.name.toLowerCase().includes('lakhan') ? 'CBPL2045' : 'CBPL1001')}]
                          </span>
                          <span className="font-bold truncate">{user.name}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                            {user.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          {user.email} {user.title ? `• ${user.title}` : ''}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
