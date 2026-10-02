import { NavLink } from 'react-router-dom';
import { Home, Calendar, User } from 'lucide-react';
import { cn } from '../../utils/helpers';

export default function BottomTabs() {
  const tabs = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/calendar', icon: Calendar, label: 'Calendar' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 px-6 py-2 pb-safe flex justify-between items-center z-40 md:hidden h-[68px]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center w-16 h-full space-y-1 transition-colors',
                isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "p-1.5 rounded-xl transition-colors",
                  isActive && "bg-indigo-50"
                )}>
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
