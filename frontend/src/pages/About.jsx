import React from 'react';
import Navbar from '../components/Navbar';

export default function About() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-700">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-16 pb-32">
        <div className="text-center mb-16">
           <h1 className="text-4xl font-semibold text-slate-900 mb-4">Redefining urban parking</h1>
           <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Finding parking is frustrating. ASAP helps drivers discover, reserve, and access verified parking spaces in seconds — and helps hosts turn unused space into income.
           </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
           <div className="rounded-xl overflow-hidden border border-slate-200">
              <img src="https://images.unsplash.com/photo-1543465077-db45d34b88a5?q=80&w=2070&auto=format&fit=crop" alt="Crowded parking lot" className="w-full h-72 object-cover" />
           </div>
           <div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-3 flex items-center gap-3">
                 <span className="material-symbols-outlined text-amber-500 text-3xl">warning</span>
                 The Problem
              </h2>
              <p className="text-slate-500 leading-relaxed">
                 Every day, drivers circle city blocks searching for a spot near malls, offices, and stations. This wastes time, fuels frustration, and adds to urban congestion — while countless private driveways and lots sit empty nearby.
              </p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center flex-col-reverse md:flex-row-reverse mb-20">
           <div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-3 flex items-center gap-3">
                 <span className="material-symbols-outlined text-parking-600 text-3xl">lightbulb</span>
                 The Solution
              </h2>
              <p className="text-slate-500 leading-relaxed">
                 ASAP matches drivers needing a spot with verified hosts who have unused space. Real-time availability, transparent pricing, and secure payments make booking ahead simple on both sides.
              </p>
           </div>
           <div className="rounded-xl overflow-hidden border border-slate-200">
              <img src="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=2070&auto=format&fit=crop" alt="Available parking spots in a garage" className="w-full h-72 object-cover" />
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
           <div className="rounded-xl overflow-hidden border border-slate-200">
              <img src="https://images.unsplash.com/photo-1758448721161-7b3df5ec04b3?q=80&w=2070&auto=format&fit=crop" alt="Modern parking garage with smart access" className="w-full h-72 object-cover" />
           </div>
           <div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-3 flex items-center gap-3">
                 <span className="material-symbols-outlined text-accent-500 text-3xl">qr_code_2</span>
                 Smart Access
              </h2>
              <p className="text-slate-500 leading-relaxed">
                 Every booking comes with a digital QR ticket — no calls, no waiting at the gate. Scan in, park, and scan out. Hosts get instant check-in confirmation and secure payment the moment you arrive.
              </p>
           </div>
        </div>
      </main>
    </div>
  );
}
