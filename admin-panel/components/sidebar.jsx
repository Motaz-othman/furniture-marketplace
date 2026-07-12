'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import { Package, ShoppingBag, RefreshCw, Users, LogOut, Cloud, ClipboardList, Settings, LayoutGrid, UploadCloud, LayoutDashboard, UserCircle, Tag, RotateCcw, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getOrders } from '@/lib/services/orders';

const navSections = [
  {
    label: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: '/orders', label: 'Orders', icon: ClipboardList },
      { href: '/returns', label: 'Returns', icon: RotateCcw },
      { href: '/coupons', label: 'Coupons', icon: Tag },
      { href: '/delivery-pricing', label: 'Delivery Pricing', icon: Truck },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/customers', label: 'Customers', icon: UserCircle },
      { href: '/users', label: 'User Management', icon: Users },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/products', label: 'Raw Products', icon: Package },
      { href: '/listings', label: 'Storefront Listings', icon: ShoppingBag },
      { href: '/categories', label: 'Categories', icon: LayoutGrid },
      { href: '/vendor-import', label: 'Vendor Import', icon: UploadCloud },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/sync', label: 'Sync Management', icon: RefreshCw },
      { href: '/gigiga-calculator', label: 'Gigiga Calculator', icon: Cloud },
      { href: '/settings', label: 'Storefront Settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const { data: pendingData } = useQuery({
    queryKey: ['pending-orders-count'],
    queryFn: () => getOrders({ status: 'PENDING', limit: 1 }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const pendingCount = pendingData?.pagination?.totalCount ?? 0;

  function handleLogout() {
    logout();
    window.location.href = '/login';
  }

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6">
        <h1 className="text-lg font-semibold">Furniture Admin</h1>
        <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
      </div>

      <Separator />

      <nav className="flex-1 p-4 overflow-y-auto space-y-4">
        {navSections.map(({ label, items }) => (
          <div key={label}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">{label}</p>
            <div className="space-y-0.5">
              {items.map(({ href, label: itemLabel, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    (href === '/' ? pathname === '/' : pathname.startsWith(href))
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{itemLabel}</span>
                  {href === '/orders' && pendingCount > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white leading-none">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <Separator />

      <div className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
