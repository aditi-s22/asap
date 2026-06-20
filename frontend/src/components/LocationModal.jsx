import React from 'react';
import Modal from './ui/Modal';
import MapSection from './MapSection';

export default function LocationModal({ isOpen, onClose, parkingData }) {
  if (!parkingData) return null;

  const titleText = parkingData.name || parkingData.title || "Parking Space";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Location: ${titleText}`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-500">
           Address: {parkingData.address}
        </p>

        <div className="w-full h-[350px] rounded-xl overflow-hidden border border-slate-200">
           <MapSection 
             parkings={[parkingData]} 
             selectedSpot={parkingData} 
           />
        </div>
      </div>
    </Modal>
  );
}
