import React from 'react';

export default function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const baseStyle = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-parking-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    primary: "bg-parking-600 text-white hover:bg-parking-700 shadow-sm",
    secondary: "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50",
    outline: "border border-slate-300 bg-transparent hover:bg-slate-50 text-slate-700",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-600",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
    dark: "bg-charcoal-800 text-white border border-charcoal-700 hover:bg-charcoal-700",
  };

  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 py-2 px-4 text-sm",
    lg: "h-12 px-8 text-base"
  };

  const selectedVariant = variants[variant] || variants.primary;
  const selectedSize = sizes[size] || sizes.md;

  return (
    <button className={`${baseStyle} ${selectedVariant} ${selectedSize} ${className}`} {...props}>
      {children}
    </button>
  );
}
