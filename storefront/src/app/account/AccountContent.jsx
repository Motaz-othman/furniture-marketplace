'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/lib/hooks';
import { User, MapPin, Package, SettingsIcon } from '@/components/ui/Icons';
import ProfileTab from './tabs/ProfileTab';
import AddressesTab from './tabs/AddressesTab';
import OrdersTab from './tabs/OrdersTab';
import SettingsTab from './tabs/SettingsTab';

const TABS = [
  { id: 'profile', label: 'Personal Information', Icon: User },
  { id: 'addresses', label: 'Shipping Addresses', Icon: MapPin },
  { id: 'orders', label: 'Orders', Icon: Package },
  { id: 'settings', label: 'Account Settings', Icon: SettingsIcon },
];

export default function AccountContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');

  // Read hash on mount
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (TABS.some((t) => t.id === hash)) {
      setActiveTab(hash);
    }
  }, []);

  // Update hash when tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    window.history.replaceState(null, '', `#${tabId}`);
  };

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/account');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <MainLayout>
        <div className="auth-loading">Loading...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="account-page-container">
        <div className="account-page-header">
          <h1>My Account</h1>
          <p className="account-greeting">Welcome back, {user?.firstName}</p>
        </div>

        {/* Mobile tab bar */}
        <div className="account-mobile-tabs">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`account-mobile-tab${activeTab === id ? ' active' : ''}`}
              onClick={() => handleTabChange(id)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="account-layout">
          <aside className="account-sidebar">
            <nav className="account-nav">
              {TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  className={`account-nav-item${activeTab === id ? ' active' : ''}`}
                  onClick={() => handleTabChange(id)}
                >
                  <span className="account-nav-icon"><Icon size={18} /></span>
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <div className="account-main">
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'addresses' && <AddressesTab />}
            {activeTab === 'orders' && <OrdersTab />}
            {activeTab === 'settings' && <SettingsTab />}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
