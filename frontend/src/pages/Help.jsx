import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function Help() {
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    { q: "How do I book a parking space?", a: "Search your destination, browse available spots, and click 'Reserve Space Now'. Choose your arrival time and duration, then proceed to secure checkout." },
    { q: "Can I cancel a booking?", a: "Yes. Active bookings can be cancelled any time before the reservation starts for a full refund minus baseline processing fees. Past bookings cannot be refunded." },
    { q: "What if there is an issue with my payment?", a: "Payments are processed via Razorpay's banking-grade security. If a charge fails, try a different card or contact support below." },
    { q: "How do I become a verified host?", a: "Head to the 'Become a Host' portal, follow the onboarding form, and wait up to 24 hours for our team to review and approve your location." }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-700">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-16 pb-32">
         <div className="text-center mb-16">
           <h1 className="text-4xl font-semibold text-slate-900 mb-3">How can we help?</h1>
           <p className="text-slate-500">Browse common questions or reach out to ASAP Support.</p>
         </div>

         <div className="flex flex-col lg:flex-row gap-12">
            <div className="flex-1">
               <h2 className="text-xl font-semibold text-slate-900 mb-5">Frequently Asked Questions</h2>
               <div className="space-y-3">
                  {faqs.map((faq, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                       <button
                         onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                         className="w-full text-left px-5 py-4 font-medium text-slate-900 flex justify-between items-center hover:bg-slate-50 transition-colors"
                       >
                         {faq.q}
                         <span className="material-symbols-outlined text-slate-400">{openFaq === idx ? 'remove' : 'add'}</span>
                       </button>
                       {openFaq === idx && (
                         <div className="px-5 pb-4 text-slate-500 text-sm leading-relaxed">
                           {faq.a}
                         </div>
                       )}
                    </div>
                  ))}
               </div>
            </div>

            <div className="w-full lg:w-[380px]">
               <div className="card p-6 sticky top-24">
                 <h3 className="text-lg font-semibold text-slate-900 mb-1">Contact Support</h3>
                 <p className="text-sm text-slate-500 mb-5">Our team typically replies within 2 hours.</p>

                 <form className="space-y-4" onSubmit={e => e.preventDefault()}>
                    <Input label="Your Email" type="email" icon="mail" required />
                    <div className="flex flex-col gap-1.5">
                       <label className="text-sm font-medium text-slate-700">Message</label>
                       <textarea
                         rows="4"
                         className="w-full input-field rounded-lg px-4 py-3 text-sm outline-none resize-none"
                         required
                       ></textarea>
                    </div>
                    <Button variant="primary" className="w-full mt-1">Send Message</Button>
                 </form>
               </div>
            </div>
         </div>
      </main>
    </div>
  );
}
