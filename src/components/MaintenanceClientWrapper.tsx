'use client';

import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import MaintenancePage from '../app/maintenance/page';

export default function MaintenanceClientWrapper({
  isMaintenance: initialMaintenance,
  isAdmin,
  children,
}: {
  isMaintenance: boolean;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMaintenance, setIsMaintenance] = useState(initialMaintenance);

  useEffect(() => {
    // Don't fetch on login or admin pages to avoid extra load / redirect loops
    if (pathname === '/login' || pathname.startsWith('/admin')) {
      return;
    }

    fetch('/api/settings')
      .then((res) => {
        if (res.ok) return res.json();
      })
      .then((data) => {
        if (data) {
          setIsMaintenance(data.maintenance);
        }
      })
      .catch(() => {});
  }, [pathname]);

  // If maintenance is on and the user is not an admin,
  // we block all pages EXCEPT /login and /admin
  if (isMaintenance && !isAdmin) {
    if (pathname !== '/login' && !pathname.startsWith('/admin')) {
      return <MaintenancePage />;
    }
  }

  return <>{children}</>;
}
