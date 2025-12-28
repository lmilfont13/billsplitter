import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  icon, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed h-12 px-6";
  
  const variants = {
    primary: "bg-primary hover:bg-primary-hover text-background-dark",
    secondary: "bg-white/10 hover:bg-white/20 text-white",
    outline: "border-2 border-primary text-primary hover:bg-primary/10",
    ghost: "bg-transparent hover:bg-white/5 text-gray-300 hover:text-white"
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthStyle} ${className}`} 
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};