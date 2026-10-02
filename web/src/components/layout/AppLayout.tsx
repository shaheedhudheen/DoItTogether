import { Outlet, NavLink } from 'react-router-dom';
import { Home, Calendar, User, Heart } from 'lucide-react';
import BottomTabs from './BottomTabs';
import { useSocket } from '../../hooks/useSocket';
import { cn } from '../../utils/helpers';

export default function AppLayout() {
  // Initialize socket connection
  useSocket();

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/calendar', icon: Calendar, label: 'Calendar' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 md:flex-row">
      {/* Desktop Sidebar (md: and up) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-6 shrink-0">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
            <Heart className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h1 className="font-black text-xl text-slate-800 tracking-tight">DIT</h1>
            <p className="text-xs text-slate-400">Do It Together</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-8 w-full max-w-3xl mx-auto">
        <Outlet />
      </main>

      {/* Mobile-first Bottom Tabs (fixed at bottom on mobile) */}
      <BottomTabs />
    </div>
  );
}
