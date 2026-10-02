import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterInput, registerSchema } from '@dit/shared';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function RegisterPage() {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterInput) => {
    registerAuth.mutate(data, {
      onSuccess: () => {
        navigate('/onboarding');
      }
    });
  };

  return (
    <Card className="p-6 md:p-8 w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Create Account</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input 
          label="Name" 
          placeholder="Your name"
          {...register('displayName')}
          error={errors.displayName?.message}
        />
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
          placeholder="At least 6 characters"
          {...register('password')}
          error={errors.password?.message}
        />
        
        <Button 
          type="submit" 
          className="w-full mt-2" 
          isLoading={registerAuth.isPending}
        >
          Sign Up
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
          Sign in
        </Link>
      </div>
    </Card>
  );
}
