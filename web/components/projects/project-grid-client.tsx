'use client';

import React, { useState } from 'react';
import { CreateProjectModal, type ClientOption } from './create-project-modal';
import {
  FolderPlus,
  Briefcase,
  DollarSign,
  Clock,
  Building,
  TrendingUp,
  PieChart,
  CheckCircle,
  MoreVertical
} from 'lucide-react';

export interface ProjectCardData {
  id: string;
  name: string;
  color: string;
  clientName?: string | null;
  budgetType: string;
  budgetAmount: number;
  billingRate: number;
  isBillable: boolean;
  totalHoursTracked: number;
  totalCostAccrued: number;
  isArchived: boolean;
}

interface ProjectGridClientProps {
  projects: ProjectCardData[];
  clients: ClientOption[];
}

export function ProjectGridClient({
  projects,
  clients,
}: ProjectGridClientProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Project & Client Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Track budgets, client billing rates, and monitor real-time hour accumulation per project.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto"
        >
          <FolderPlus className="w-4 h-4" />
          <span>Create New Project</span>
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No Projects Initialized</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Create your first project and link it to a client to enable accurate task tracking in the desktop app.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Create Project Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => {
            const budgetProgress =
              project.budgetAmount > 0
                ? Math.min(
                    100,
                    project.budgetType === 'TOTAL_HOURS'
                      ? (project.totalHoursTracked / project.budgetAmount) * 100
                      : (project.totalCostAccrued / project.budgetAmount) * 100
                  )
                : 0;

            const isOverBudget = budgetProgress >= 100;

            return (
              <div
                key={project.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Color pill & Client */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: project.color || '#6366F1' }}
                      />
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        <span>{project.clientName || 'Internal Project'}</span>
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        project.isBillable
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {project.isBillable ? 'Billable' : 'Non-Billable'}
                    </span>
                  </div>

                  {/* Project Title */}
                  <h3 className="text-base font-bold text-white truncate">{project.name}</h3>

                  {/* Rates and Stats */}
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Hours Tracked</span>
                      <span className="font-mono font-bold text-slate-200 text-sm">
                        {project.totalHoursTracked.toFixed(1)} hrs
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Billing Rate</span>
                      <span className="font-mono font-bold text-indigo-400 text-sm">
                        ${project.billingRate.toFixed(2)}/hr
                      </span>
                    </div>
                  </div>

                  {/* Budget Target & Progress */}
                  {project.budgetType !== 'NONE' && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1">
                          <PieChart className="w-3.5 h-3.5" />
                          <span>Budget Utilization:</span>
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            isOverBudget ? 'text-rose-400' : 'text-slate-200'
                          }`}
                        >
                          {budgetProgress.toFixed(0)}%
                        </span>
                      </div>

                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOverBudget
                              ? 'bg-rose-500'
                              : budgetProgress > 80
                              ? 'bg-amber-500'
                              : 'bg-indigo-500'
                          }`}
                          style={{ width: `${budgetProgress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                        <span>Accrued: ${project.totalCostAccrued.toFixed(2)}</span>
                        <span>
                          Target: {project.budgetType === 'TOTAL_HOURS' ? `${project.budgetAmount} hrs` : `$${project.budgetAmount}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Desktop Tracker Ready</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Active
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        clients={clients}
      />
    </div>
  );
}
