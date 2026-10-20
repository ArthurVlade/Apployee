'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  role: 'ORG_OWNER' | 'MANAGER' | 'MEMBER';
}

interface OrgContextType {
  activeOrg: OrganizationSummary;
  organizations: OrganizationSummary[];
  setActiveOrg: (org: OrganizationSummary) => Promise<void>;
  userRole: 'ORG_OWNER' | 'MANAGER' | 'MEMBER';
}

const OrgContext = createContext<OrgContextType | null>(null);

interface OrgProviderProps {
  initialOrg: OrganizationSummary;
  userOrganizations: OrganizationSummary[];
  children: React.ReactNode;
}

export function OrgProvider({
  initialOrg,
  userOrganizations,
  children,
}: OrgProviderProps) {
  const [activeOrg, setActiveOrgState] = useState<OrganizationSummary>(initialOrg);
  const router = useRouter();

  // Keep state synchronized if initialOrg changes from server
  useEffect(() => {
    setActiveOrgState(initialOrg);
  }, [initialOrg.id]);

  const setActiveOrg = async (org: OrganizationSummary) => {
    try {
      // Set the active organization in a cookie for server components & middleware
      document.cookie = `apploye_active_org_id=${org.id}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax;`;
      setActiveOrgState(org);
      
      // Refresh current server component tree with new tenant context
      router.refresh();
    } catch (err) {
      console.error('Failed to switch organization:', err);
    }
  };

  return (
    <OrgContext.Provider
      value={{
        activeOrg,
        organizations: userOrganizations,
        setActiveOrg,
        userRole: activeOrg.role,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrg must be used within an <OrgProvider>');
  }
  return context;
}
