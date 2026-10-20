'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOrg, type OrganizationSummary } from '../providers/org-provider';
import { signOut } from '@/app/(auth)/actions';
import {
  Clock,
  Activity,
  Camera,
  CalendarCheck,
  Briefcase,
  Users,
  DollarSign,
  FileText,
  CreditCard,
  Settings,
  ChevronDown,
  Check,
  Plus,
  LogOut,
  Building2,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface SidebarUserProps {
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string | null;
  };
}

export function DashboardSidebar({ user }: SidebarUserProps) {
  const pathname = usePathname();
  const { activeOrg, organizations, setActiveOrg, userRole } = useOrg();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);

  const navigationItems = [
    {
      name: 'Live Feed',
      href: '/dashboard/admin/live-feed',
      icon: Activity,
      badge: 'Live',
    },
    {
      name: 'Screenshots',
      href: '/dashboard/admin/screenshots',
      icon: Camera,
    },
    {
      name: 'Timesheets & Approvals',
      href: '/dashboard/admin/timesheets',
      icon: CalendarCheck,
    },
    {
      name: 'Projects & Tasks',
      href: '/dashboard/admin/projects-tasks',
      icon: Briefcase,
    },
    {
      name: 'Team & Shifts',
      href: '/dashboard/admin/team',
      icon: Users,
    },
    {
      name: 'Client Invoices',
      href: '/dashboard/admin/invoices',
      icon: FileText,
    },
    {
      name: 'Payroll Engine',
      href: '/dashboard/admin/payroll',
      icon: DollarSign,
    },
    {
      name: 'Stripe Billing & Seats',
      href: '/dashboard/admin/billing',
      icon: CreditCard,
    },
    {
      name: 'Settings & Policies',
      href: '/dashboard/admin/settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 select-none z-30">
      {/* 1. Header & App Branding */}
      <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <span className="font-bold text-base text-white tracking-tight">Apploye</span>
            <span className="block text-[10px] text-indigo-400 font-mono font-semibold uppercase tracking-wider">
              {userRole === 'ORG_OWNER' ? 'Owner Console' : userRole === 'MANAGER' ? 'Manager Console' : 'Member Portal'}
            </span>
          </div>
        </Link>
      </div>

      {/* 2. Organization Switcher Dropdown */}
      <div className="p-3 border-b border-slate-800 relative">
        <button
          onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
          className="w-full p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-left flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{activeOrg.name}</p>
              <p className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <span>{activeOrg.role}</span>
              </p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </button>

        {/* Dropdown Menu */}
        {orgDropdownOpen && (
          <div className="absolute top-16 left-3 right-3 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 animate-scaleUp">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              Your Organizations
            </div>
            
            <div className="max-h-48 overflow-y-auto py-1">
              {organizations.map((org) => {
                const isSelected = org.id === activeOrg.id;
                return (
                  <button
                    key={org.id}
                    onClick={() => {
                      setActiveOrg(org);
                      setOrgDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-800/60 transition-colors ${
                      isSelected ? 'text-indigo-400 font-semibold bg-indigo-500/10' : 'text-slate-300'
                    }`}
                  >
                    <div className="truncate">
                      <p className="truncate">{org.name}</p>
                      <span className="text-[10px] text-slate-500 font-mono">({org.role})</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-800 pt-1">
              <Link
                href="/onboarding"
                onClick={() => setOrgDropdownOpen(false)}
                className="w-full px-3 py-2 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-slate-800/60 flex items-center gap-2 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Organization</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 3. Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Workspace Management
        </div>

        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 4. User Profile & Logout */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="p-2 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="w-8 h-8 rounded-full object-cover border border-slate-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.fullName}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
