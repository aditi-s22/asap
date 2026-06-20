import React from "react";
import ParkingCard from "./ParkingCard";

const dummyData = [
  {
    id: 1,
    name: "Downtown Secure Plaza",
    distance: "0.2 km",
    price: 150,
    availableSpots: 12,
    type: "Public",
    image: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?q=80&w=2067&auto=format&fit=crop",
  },
  {
    id: 2,
    name: "Residential Quiet Spot",
    distance: "0.6 km",
    price: 80,
    availableSpots: 2,
    type: "Private",
    image: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=2070&auto=format&fit=crop",
  },
  {
    id: 3,
    name: "City Center Mall Parking",
    distance: "1.1 km",
    price: 200,
    availableSpots: 45,
    type: "Public",
    image: "https://images.unsplash.com/photo-1470224114660-3f6686c76262?q=80&w=2070&auto=format&fit=crop",
  },
  {
    id: 4,
    name: "Airport Long Term Setup",
    distance: "4.5 km",
    price: 50,
    availableSpots: 100,
    type: "Public",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop",
  }
];

export default function ParkingList() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Top Rated Nearby</h2>
        <span className="text-sm font-medium text-accent-600 bg-accent-400/10 px-3 py-1.5 rounded-lg border border-accent-400/20">{dummyData.length} locations found</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {dummyData.map((item) => (
          <ParkingCard key={item.id} data={item} />
        ))}
      </div>
    </div>
  );
}