'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import { Package, ShoppingBag, RefreshCw, Users, LogOut, Calculator, Cloud, ClipboardList, Settings, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/products', label: 'Wondersign Products', icon: Package },
  { href: '/listings', label: 'Storefront Listings', icon: ShoppingBag },
  { href: '/categories', label: 'Categories', icon: LayoutGrid },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/sync', label: 'Sync Management', icon: RefreshCw },
  { href: '/users', label: 'User Management', icon: Users },
  { href: '/cost-calculator', label: 'Cost Calculator', icon: Calculator },
  { href: '/gigiga-calculator', label: 'Gigiga Cloud Calculator', icon: Cloud },
  { href: '/settings', label: 'Storefront Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

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

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              pathname.startsWith(href)
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
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
