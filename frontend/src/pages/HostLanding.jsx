import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Button from '../components/ui/Button';

export default function HostLanding() {
  const steps = [
    { icon: 'add_location', title: '1. List Your Space', desc: 'Tell us about your driveway, garage, or lot.' },
    { icon: 'settings', title: '2. Set Your Terms', desc: 'Control your price and availability schedule.' },
    { icon: 'book_online', title: '3. Get Bookings', desc: 'Verified drivers will reserve your spot.' },
    { icon: 'payments', title: '4. Earn Money', desc: 'Get paid securely directly to your bank account.' },
  ];

  const benefits = [
    { icon: 'account_balance', title: 'Passive Income', desc: 'Turn your empty space into a consistent revenue stream.' },
    { icon: 'shield', title: 'Secure Payments', desc: 'Razorpay integration ensures you get paid flawlessly.' },
    { icon: 'verified_user', title: 'Verified Drivers', desc: 'Every user is vetted to ensure your property remains safe.' },
    { icon: 'dashboard', title: 'Easy Management', desc: 'Track analytics, views, and earnings from your portal.' },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-700">
      <Navbar />

      <main className="flex-1 w-full">
        {/* HERO SECTION */}
        <section className="px-6 py-24 pb-32 border-b border-slate-200 bg-slate-50">
           <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
              <span className="bg-parking-50 border border-parking-100 px-4 py-1.5 rounded-full text-parking-700 text-sm font-semibold tracking-wide uppercase mb-6 inline-flex items-center gap-2">
                 <span className="material-symbols-outlined text-[16px]">stars</span> New Integration
              </span>
              <h1 className="text-4xl md:text-6xl font-semibold text-slate-900 leading-tight mb-6">
                Earn from Your <br className="hidden md:block"/> Empty Space
              </h1>
              <p className="text-xl text-slate-500 mb-10 max-w-2xl">
                Monetize your unused driveway, garage, or commercial lot. Join thousands of ASAP Hosts making passive income today.
              </p>

              <Link to="/host/onboarding">
                <Button variant="primary" size="lg" className="px-10 text-base">
                  Start Hosting Now
                </Button>
              </Link>
           </div>
        </section>

        {/* BENEFITS SECTION */}
        <section className="max-w-7xl mx-auto px-6 py-24 border-b border-slate-200">
           <div className="text-center mb-16">
             <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 mb-4">Why host on ASAP?</h2>
             <p className="text-slate-500 max-w-xl mx-auto text-lg">We provide the enterprise-level tools needed to manage your inventory effortlessly.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((b, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
                   <div className="w-14 h-14 bg-parking-50 rounded-lg flex items-center justify-center mb-6 text-parking-600">
                     <span className="material-symbols-outlined text-3xl">{b.icon}</span>
                   </div>
                   <h3 className="text-xl font-semibold text-slate-900 mb-3">{b.title}</h3>
                   <p className="text-slate-500 leading-relaxed">{b.desc}</p>
                </div>
              ))}
           </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-slate-50 border-b border-slate-200">
           <div className="max-w-7xl mx-auto px-6 py-24 flex flex-col lg:flex-row gap-16 items-center">
              <div className="flex-1">
                 <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 mb-6">How it operates</h2>
                 <p className="text-slate-500 text-lg mb-10 leading-relaxed">
                   Turning your space into an asset has never been easier. Our streamlined onboarding takes less than 3 minutes.
                 </p>

                 <div className="space-y-8">
                    {steps.map((s, i) => (
                      <div key={i} className="flex gap-5">
                         <div className="w-12 h-12 rounded-full bg-parking-50 text-parking-600 flex items-center justify-center flex-shrink-0 font-semibold border border-parking-100">
                           <span className="material-symbols-outlined">{s.icon}</span>
                         </div>
                         <div>
                            <h4 className="text-xl font-semibold text-slate-900 mb-1">{s.title}</h4>
                            <p className="text-slate-500">{s.desc}</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
              <div className="flex-1 w-full relative">
                 <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-md">
                    <img src="https://images.unsplash.com/photo-1542451368-ab7fbf19a32c?q=80&w=2070&auto=format&fit=crop" alt="Dashboard preview" className="rounded-lg w-full h-auto object-cover" />
                 </div>
              </div>
           </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="max-w-7xl mx-auto px-6 py-24 text-center">
           <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 mb-16">Real hosts, real income.</h2>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20 text-left">
              <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
                 <div className="text-amber-400 mb-4 tracking-widest text-sm">★★★★★</div>
                 <p className="text-slate-600 text-lg leading-relaxed mb-6 font-medium">"I earn ₹5000/month from my driveway just by routing commuters during stadium days. The analytics dashboard is flawless."</p>
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-parking-100 rounded-full"></div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">Rajiv M.</h4>
                      <p className="text-xs text-slate-500">Verified Host</p>
                    </div>
                 </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-md border-t-2 border-t-parking-500">
                 <div className="text-amber-400 mb-4 tracking-widest text-sm">★★★★★</div>
                 <p className="text-slate-600 text-lg leading-relaxed mb-6 font-medium">"ASAP gave me total control over pricing and availability. It essentially runs itself automatically."</p>
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent-400/20 rounded-full"></div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">Sarah L.</h4>
                      <p className="text-xs text-slate-500">Super Host</p>
                    </div>
                 </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
                 <div className="text-amber-400 mb-4 tracking-widest text-sm">★★★★★</div>
                 <p className="text-slate-600 text-lg leading-relaxed mb-6 font-medium">"My redundant office parking spots are now generating enough revenue to cover our structural maintenance offset."</p>
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full"></div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">TechCorp LLC</h4>
                      <p className="text-xs text-slate-500">Commercial Partner</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="flex flex-col items-center">
             <h3 className="text-2xl font-semibold text-slate-900 mb-6">Ready to maximize your assets?</h3>
             <Link to="/host/onboarding">
               <Button variant="primary" size="lg" className="px-12 text-base">
                 Start Hosting
               </Button>
             </Link>
           </div>
        </section>

      </main>
    </div>
  );
}
