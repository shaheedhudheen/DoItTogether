import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-50 p-6 md:p-12">
      <div className="w-full max-w-md mx-auto">
        <div className="mb-8 flex flex-col items-center">
          <img src="/dit-logo.svg" alt="Do It Together" className="w-20 h-20 mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Do It Together</h1>
          <p className="text-slate-500 mt-1">Strengthen your bond every day</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
