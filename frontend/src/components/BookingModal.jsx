import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import { normalizeImageUrl } from '../utils/imageHelper';

export default function BookingModal({ isOpen, onClose, parkingData }) {
  const [hours, setHours] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const navigate = useNavigate();

  const [imageSrc, setImageSrc] = useState(() => normalizeImageUrl(parkingData));

  useEffect(() => {
    setImageSrc(normalizeImageUrl(parkingData));
  }, [parkingData]);

  const handleImageError = () => {
    setImageSrc(normalizeImageUrl(null));
  };

  if (!parkingData) return null;

  const totalCost = (parkingData.price || parkingData.pricePerHour || 0) * hours;

  const handleProceedToCheckout = () => {
    // Collect Booking configuration to pass via history state
    const orderDetails = {
       parking: parkingData,
       duration: hours,
       date,
       time,
       totalCost
    };
    onClose();
    navigate('/checkout', { state: orderDetails });
  };

  const calculateHours = (h) => {
    if(h < 1) return 1;
    if(h > 24) return 24;
    return h;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configure Booking">
        <div className="flex flex-col gap-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex gap-4 items-center">
                <img src={imageSrc} onError={handleImageError} alt={parkingData.name || parkingData.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0"/>
                <div>
                   <h4 className="font-semibold text-slate-900 leading-tight">{parkingData.name || parkingData.title}</h4>
                   <p className="text-xs text-parking-700 mt-1 bg-parking-50 inline-block px-2 py-0.5 rounded">₹{parkingData.price || parkingData.pricePerHour}/hr</p>
                </div>
            </div>

            <div className="flex gap-4">
              <Input type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1" />
              <Input type="time" label="Arrival Time" value={time} onChange={(e) => setTime(e.target.value)} className="flex-1" />
            </div>

            <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Duration (Hours)</label>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-2 px-4">
                    <Button variant="outline" onClick={() => setHours(calculateHours(hours - 1))} className="w-10 h-10 rounded-full text-xl px-0">-</Button>
                    <span className="font-semibold text-2xl text-slate-900 w-12 text-center tabular-nums">{hours}</span>
                    <Button variant="outline" onClick={() => setHours(calculateHours(hours + 1))} className="w-10 h-10 rounded-full text-xl px-0">+</Button>
                </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-200 mt-2">
                <span className="text-slate-500 font-medium">Total Cost</span>
                <span className="text-3xl font-semibold text-slate-900 tabular-nums">₹{totalCost}</span>
            </div>

            <Button
               variant="primary"
               className="w-full text-base py-4 h-auto"
               onClick={handleProceedToCheckout}
            >
               Proceed to Checkout
            </Button>
        </div>
    </Modal>
  );
}
