import React from 'react';
import { cn } from '../../utils/helpers';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export default function Card({ className, children, ...props }: CardProps) {
  return (
    <div 
      className={cn("bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden", className)} 
      {...props}
    >
      {children}
    </div>
  );
}
