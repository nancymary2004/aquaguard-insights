import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BarChart2, Bell, User, MessageSquare,
  LogOut, Droplets, Menu, X, Settings, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, THEMES } from '@/contexts/ThemeContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analysis', label: 'Analysis', icon: BarChart2 },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/chat', label: 'AI Assistant', icon: MessageSquare },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: 'var(--gradient-sidebar)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 p-5 border-b border-sidebar-border/50">
        <div className="p-2 rounded-xl" style={{ background: 'hsl(var(--sidebar-primary) / 0.2)' }}>
          <Droplets className="w-6 h-6" style={{ color: 'hsl(var(--sidebar-primary))' }} />
        </div>
        <div>
          <div className="font-bold text-sm" style={{ color: 'hsl(var(--sidebar-foreground))' }}>WBDPS</div>
          <div className="text-xs opacity-60" style={{ color: 'hsl(var(--sidebar-foreground))' }}>Water Disease Predict</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Icon className="w-4.5 h-4.5 w-5 h-5 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Theme Picker */}
      <div className="p-3 border-t border-sidebar-border/50">
        <button
          onClick={() => setShowThemePicker(!showThemePicker)}
          className="nav-item w-full justify-between"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 shrink-0" />
            <span>Theme</span>
          </div>
          <ChevronRight className={`w-4 h-4 transition-transform ${showThemePicker ? 'rotate-90' : ''}`} />
        </button>
        <AnimatePresence>
          {showThemePicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-1.5 mt-2 px-1">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => { setTheme(t.value); setShowThemePicker(false); }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-all ${
                      theme === t.value
                        ? 'ring-2 ring-sidebar-primary'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      background: theme === t.value ? 'hsl(var(--sidebar-primary) / 0.2)' : 'hsl(var(--sidebar-accent))',
                      color: 'hsl(var(--sidebar-foreground))'
                    }}
                  >
                    <span className="text-lg">{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User + Logout */}
      <div className="p-3 border-t border-sidebar-border/50">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1" style={{ background: 'hsl(var(--sidebar-accent))' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'hsl(var(--sidebar-primary))', color: 'hsl(var(--sidebar-primary-foreground))' }}>
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate" style={{ color: 'hsl(var(--sidebar-foreground))' }}>{user?.email}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="nav-item w-full text-destructive hover:bg-destructive/10">
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-60 shrink-0 flex-col h-full border-r border-sidebar-border">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-64 z-50"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 p-4 border-b border-border bg-card">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-muted">
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">WBDPS</span>
          </div>
        </div>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
