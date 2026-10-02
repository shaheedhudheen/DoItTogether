import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePartnership } from '../hooks/usePartnership';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Copy, HeartHandshake, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { updateProfile } = useAuth();
  const { partnership, invite, join } = usePartnership();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [prayerEnabled, setPrayerEnabled] = useState(false);

  useEffect(() => {
    if (partnership?.inviteCode && !inviteCode) {
      setInviteCode(partnership.inviteCode);
    }
  }, [partnership, inviteCode]);

  // If already active with partner and on step 1, redirect to home
  if (partnership?.status === 'active' && step === 1) {
    return <Navigate to="/" replace />;
  }

  const handleGenerateCode = async () => {
    try {
      const data = await invite.mutateAsync();
      setInviteCode(data.code);
    } catch {
      // Error handled by hook
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    try {
      await join.mutateAsync({ inviteCode: joinCode.trim().toUpperCase() });
      setStep(2);
    } catch {
      // Error handled by hook
    }
  };

  const handleCopy = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      toast.success('Code copied to clipboard');
    }
  };

  const handleFinish = async () => {
    try {
      await updateProfile.mutateAsync({ prayerEnabled });
    } catch {
      // Proceed even if non-critical error
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-50 p-6 md:p-12">
      <div className="w-full max-w-md mx-auto">
        
        {/* Progress Bar */}
        <div className="flex justify-center mb-8 space-x-2">
          {[1, 2, 3].map(s => (
            <div 
              key={s} 
              className={`h-2 w-12 rounded-full transition-colors ${s <= step ? 'bg-indigo-600' : 'bg-slate-200'}`}
            />
          ))}
        </div>

        <Card className="p-6 md:p-8">
          
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                  <HeartHandshake className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Connect with Partner</h2>
                <p className="text-slate-500 mt-2 text-sm">
                  Do It Together is built for two. Invite your partner or enter their code to link your accounts.
                </p>
              </div>

              <div className="space-y-4 pt-4">
                {inviteCode ? (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                    <p className="text-sm font-medium text-slate-600 mb-2">Share this code with your partner</p>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-3xl font-black tracking-widest text-indigo-600">{inviteCode}</span>
                      <button onClick={handleCopy} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500">
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-3">Waiting for partner to join...</p>
                    
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={() => setStep(2)}
                    >
                      Continue
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="secondary" 
                    className="w-full" 
                    onClick={handleGenerateCode}
                    isLoading={invite.isPending}
                  >
                    Generate Invite Code
                  </Button>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-slate-400">or</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Input 
                    placeholder="Enter partner's 6-letter code" 
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="text-center font-bold tracking-widest uppercase"
                  />
                  <Button 
                    className="w-full" 
                    onClick={handleJoin} 
                    disabled={joinCode.length !== 6 || join.isPending}
                    isLoading={join.isPending}
                  >
                    Join Partner
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Daily Prayers</h2>
                <p className="text-slate-500 text-sm">
                  Would you like to track your 5 daily prayers with your partner? You can change this later in settings.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">Enable Prayer Tracking</p>
                  <p className="text-xs text-slate-500">Fajr, Dhuhr, Asr, Maghrib, Isha</p>
                </div>
                
                {/* Custom Toggle Switch */}
                <button
                  onClick={() => setPrayerEnabled(!prayerEnabled)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${prayerEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${prayerEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <Button className="w-full" onClick={() => setStep(3)}>
                Continue
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-bold text-slate-800">You're all set!</h2>
              <p className="text-slate-500 text-sm">
                Your partnership is linked and your account is ready to go. Let's start doing it together!
              </p>

              <Button className="w-full mt-6" onClick={handleFinish} isLoading={updateProfile.isPending}>
                Go to Dashboard
              </Button>
            </div>
          )}

        </Card>
      </div>
    </div>
  );
}
