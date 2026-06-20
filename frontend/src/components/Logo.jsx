import React from "react";

// A destination-pin silhouette with a route curving through it — built to read as
// "navigation + parking + destination" rather than a generic rounded-square app icon.
const Mark = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M20 2C10.06 2 2 10.06 2 20c0 14.5 18 26 18 26s18-11.5 18-26C38 10.06 29.94 2 20 2z"
      fill="#15803d"
    />
    <path
      d="M8.5 23c3.8-6.4 8-10.6 11.5-10.6S27.7 16.6 31.5 23"
      stroke="#ffffff"
      strokeWidth="2.4"
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="20" cy="14.5" r="3.1" fill="#3b9eff" />
  </svg>
);

export default function Logo({ size = 32, showWordmark = true, wordmarkClassName = "text-xl font-bold tracking-tight text-slate-900" }) {
  return (
    <span className="flex items-center gap-2 select-none">
      <Mark size={size} />
      {showWordmark && <span className={wordmarkClassName}>ASAP</span>}
    </span>
  );
}
