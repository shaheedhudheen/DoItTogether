import { useAuth } from '../hooks/useAuth';
import { usePartnership } from '../hooks/usePartnership';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { LogOut, HeartCrack, User, Settings, Copy } from 'lucide-react';
import { getInitials } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { partnership, partner, leave, updateSettings } = usePartnership();
  const prayerEnabled = partnership?.prayerEnabled ?? user?.prayerEnabled ?? false;

  const handleTogglePrayer = () => {
    // Prayer tracking is shared room state; toggling updates both partners.
    updateSettings.mutate({ prayerEnabled: !prayerEnabled });
  };

  const handleDissolve = () => {
    if (window.confirm('Are you absolutely sure you want to dissolve this partnership? This action cannot be undone and will delete all shared data.')) {
      leave.mutate();
    }
  };

  return (
    <div className="w-full pb-24 pt-safe animate-in fade-in duration-500">
      <header className="px-6 py-4">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Profile</h1>
      </header>

      <div className="px-6 space-y-6">
        {/* User Info */}
        <Card className="p-6 flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xl flex items-center justify-center border-4 border-white shadow-sm">
            {getInitials(user?.displayName)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">{user?.displayName}</h2>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </Card>

        {/* Partnership Info */}
        {partnership && (
          <Card className="p-6 border-indigo-100 bg-indigo-50/30">
            <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-4 flex items-center">
              <User className="w-4 h-4 mr-2" />
              Partnership
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Status</span>
                <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  partnership.status === 'active' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {partnership.status === 'active' ? 'Active' : 'Waiting for Partner'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Partner</span>
                <span className="text-sm font-medium text-slate-800">
                  {partner?.displayName || (partnership.status === 'pending' ? 'Not connected yet' : 'Linked Account')}
                </span>
              </div>
              {partnership.status === 'pending' && (
                <div className="flex items-center justify-between pt-2 border-t border-indigo-100">
                  <span className="text-sm text-slate-600">Invite Code</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-indigo-700 tracking-wider">{partnership.inviteCode}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(partnership.inviteCode);
                        toast.success('Invite code copied');
                      }}
                      className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Settings */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center">
            <Settings className="w-3 h-3 mr-1" />
            Preferences
          </h3>
          <Card className="p-2">
            <div className="flex items-center justify-between p-4 bg-white rounded-xl">
              <div>
                <p className="font-medium text-slate-800">Daily Prayer Tracking</p>
                <p className="text-xs text-slate-500">Show prayer tracker on dashboard</p>
              </div>
              <button
                onClick={handleTogglePrayer}
                disabled={updateSettings.isPending}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${prayerEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${prayerEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </Card>
        </div>

        {/* Danger Zone & Actions */}
        <div className="pt-6 space-y-3">
          <Button 
            variant="outline" 
            className="w-full text-slate-600"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>

          {partnership && (
            <Button 
              variant="ghost" 
              className="w-full text-rose-500 hover:text-rose-600 hover:bg-rose-50"
              onClick={handleDissolve}
              isLoading={leave.isPending}
            >
              <HeartCrack className="w-4 h-4 mr-2" />
              Dissolve Partnership
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
