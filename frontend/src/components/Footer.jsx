import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 text-slate-600 py-12 md:py-16">
      <div className="max-w-screen-2xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">

        {/* Brand & Mission */}
        <div className="md:col-span-1">
          <Link to="/" className="mb-4 inline-block">
            <Logo size={30} wordmarkClassName="text-xl font-bold text-slate-900 tracking-tight" />
          </Link>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Anytime Safe & Affordable Parking. Secure your spot before you drive — no circling the block, no surprises at the gate.
          </p>
          <div className="flex gap-4 text-slate-400">
            <span className="material-symbols-outlined hover:text-slate-700 cursor-pointer transition-colors">language</span>
            <span className="material-symbols-outlined hover:text-slate-700 cursor-pointer transition-colors">facebook</span>
            <span className="material-symbols-outlined hover:text-slate-700 cursor-pointer transition-colors">camera_alt</span>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-slate-900 font-semibold mb-4 text-sm">Company</h4>
          <ul className="flex flex-col gap-3 text-sm">
            <li><Link to="/" className="hover:text-parking-600 transition-colors">About Us</Link></li>
            <li><Link to="/" className="hover:text-parking-600 transition-colors">Careers</Link></li>
            <li><Link to="/" className="hover:text-parking-600 transition-colors">Press</Link></li>
            <li><Link to="/" className="hover:text-parking-600 transition-colors">Blog</Link></li>
          </ul>
        </div>

        {/* Discover */}
        <div>
          <h4 className="text-slate-900 font-semibold mb-4 text-sm">Discover</h4>
          <ul className="flex flex-col gap-3 text-sm">
            <li><Link to="/host" className="hover:text-parking-600 transition-colors">Become a Host</Link></li>
            <li><Link to="/" className="hover:text-parking-600 transition-colors">Find Parking Near Me</Link></li>
            <li><Link to="/" className="hover:text-parking-600 transition-colors">Trust & Safety</Link></li>
            <li><Link to="/" className="hover:text-parking-600 transition-colors">Accessibility</Link></li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="text-slate-900 font-semibold mb-4 text-sm">Support</h4>
          <ul className="flex flex-col gap-3 text-sm">
            <li><Link to="/help" className="hover:text-parking-600 transition-colors">Help Center</Link></li>
            <li><Link to="/" className="hover:text-parking-600 transition-colors">Cancellation Options</Link></li>
            <li><Link to="/" className="hover:text-parking-600 transition-colors">Terms of Service</Link></li>
            <li><Link to="/" className="hover:text-parking-600 transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>

      </div>

      <div className="max-w-screen-2xl mx-auto px-6 mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <p>&copy; {new Date().getFullYear()} ASAP Inc. All rights reserved.</p>
        <p>Built for real drivers, real hosts, real parking.</p>
      </div>
    </footer>
  );
}
