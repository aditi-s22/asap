import React from 'react';

export default function Input({ label, type = "text", error, icon, className = "", ...props }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <div className="relative group">
        {icon && (
           <span className="material-symbols-outlined absolute left-3 top-3.5 text-slate-400 group-focus-within:text-parking-600 transition-colors text-[20px] pointer-events-none">
             {icon}
           </span>
        )}
        <input
          type={type}
          className={`w-full ${icon ? 'pl-10' : 'px-4'} pr-4 py-3 rounded-lg input-field text-sm ${error ? 'border-red-400 focus:border-red-500 focus:shadow-[0_0_0_1px_rgba(239,68,68,1)]' : ''}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-red-600 mt-1">{error}</span>}
    </div>
  );
}
