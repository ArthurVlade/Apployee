'use client';

import React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Users, Calendar as CalendarIcon, Filter, X } from 'lucide-react';

interface EmployeeOption {
  memberId: string;
  name: string;
  role: string;
}

interface ScreenshotFiltersProps {
  employees: EmployeeOption[];
  selectedMemberId?: string;
  selectedDate?: string;
}

export function ScreenshotFilters({
  employees,
  selectedMemberId,
  selectedDate,
}: ScreenshotFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearFilters = () => {
    router.push(pathname);
  };

  const hasActiveFilters = !!selectedMemberId || (!!selectedDate && selectedDate !== new Date().toISOString().split('T')[0]);

  return (
    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
        {/* Employee Dropdown */}
        <div className="relative min-w-[200px]">
          <select
            value={selectedMemberId || ''}
            onChange={(e) => handleFilterChange('memberId', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none pl-9"
          >
            <option value="">All Team Members ({employees.length})</option>
            {employees.map((emp) => (
              <option key={emp.memberId} value={emp.memberId}>
                {emp.name} ({emp.role})
              </option>
            ))}
          </select>
          <Users className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        {/* Date Selector */}
        <div className="relative min-w-[170px]">
          <input
            type="date"
            value={selectedDate || new Date().toISOString().split('T')[0]}
            onChange={(e) => handleFilterChange('date', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none pl-9 font-mono"
          />
          <CalendarIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      <div className="text-xs text-slate-400 font-mono">
        Filter params synced to URL
      </div>
    </div>
  );
}
