import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginInput, loginSchema } from '@dit/shared';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginInput) => {
    login.mutate(data, {
      onSuccess: (resData) => {
        if (!resData.user.partnershipId) {
          navigate('/onboarding');
        } else {
          navigate('/');
        }
      }
    });
  };

  return (
    <Card className="p-6 md:p-8 w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Welcome Back</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input 
          label="Email" 
          type="email" 
          placeholder="you@example.com"
          {...register('email')}
          error={errors.email?.message}
        />
        <Input 
          label="Password" 
          type="password" 
          placeholder="••••••••"
          {...register('password')}
          error={errors.password?.message}
        />
        
        <Button 
          type="submit" 
          className="w-full mt-2" 
          isLoading={login.isPending}
        >
          Sign In
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
        Don't have an account?{' '}
        <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
          Sign up
        </Link>
      </div>
    </Card>
  );
}
