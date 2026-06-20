import React, { useState, useEffect } from "react";
import { GoogleMap, useLoadScript, MarkerF, InfoWindowF, DirectionsRenderer } from "@react-google-maps/api";
import BookingModal from "./BookingModal";

const MAP_CENTER = { lat: 12.9716, lng: 77.6412 }; // Default Indiranagar, Bangalore

const LIGHT_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#1f7ae0" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#475569" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#d1fae5" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#e2e8f0" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#64748b" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#e2e8f0" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#cbd5e1" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#bfdbfe" }],
  },
];

export default function MapSection({ parkings = [], selectedSpot = null, onSelectSpot = () => {}, searchedLocation = null }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const isGoogleEnabled = apiKey && apiKey !== "YOUR_GOOGLE_MAPS_API_KEY" && apiKey.trim() !== "";

  // Always invoke hook to maintain consistent hook execution order
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: isGoogleEnabled ? apiKey : "dummy_key",
    libraries: ["places"],
  });

  const [activeMarker, setActiveMarker] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingSpot, setBookingSpot] = useState(null);

  // Debug log when pins appear on map
  useEffect(() => {
    if (parkings.length > 0) {
      parkings.forEach((spot) => {
        const coords = spot.location?.coordinates;
        if (coords && coords.length >= 2) {
          console.log(`[Appears On Map] Spot "${spot.title}" rendered at [Lng: ${coords[0]}, Lat: ${coords[1]}]`);
        }
      });
    }
  }, [parkings]);

  // Sync active marker if selectedSpot changes externally
  useEffect(() => {
    if (selectedSpot) {
      setActiveMarker(selectedSpot);
    }
  }, [selectedSpot]);

  // Grab user position for routing
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          // Fallback user location near Indiranagar
          setCurrentLocation({ lat: 12.9698, lng: 77.6398 });
        }
      );
    } else {
      setCurrentLocation({ lat: 12.9698, lng: 77.6398 });
    }
  }, []);

  // Update route directions when spot is selected (Google Maps version)
  useEffect(() => {
    if (isGoogleEnabled && isLoaded && selectedSpot && currentLocation && window.google) {
      const origin = currentLocation;
      const coords = selectedSpot.location?.coordinates;
      if (!coords || coords.length < 2) return;
      const destination = { lat: coords[1], lng: coords[0] };

      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin,
          destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
            const route = result.routes[0]?.legs[0];
            if (route) {
              setRouteInfo({
                distance: route.distance?.text,
                duration: route.duration?.text,
              });
            }
          } else {
            console.error("Directions search failed:", status);
          }
        }
      );
    } else {
      setDirections(null);
      if (!isGoogleEnabled && selectedSpot && currentLocation) {
        // Calculate mock distance/duration in simulated mode
        const coords = selectedSpot.location?.coordinates;
        if (coords && coords.length >= 2) {
          const lat1 = currentLocation.lat;
          const lon1 = currentLocation.lng;
          const lat2 = coords[1];
          const lon2 = coords[0];
          // Simple straight line distance approximation
          const d = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2)) * 111.32;
          const durationMins = Math.round(d * 4 + 2);
          setRouteInfo({
            distance: `${d.toFixed(1)} km`,
            duration: `${durationMins} mins`,
          });
        }
      } else {
        setRouteInfo(null);
      }
    }
  }, [selectedSpot, currentLocation, isLoaded, isGoogleEnabled]);

  const handleOpenBooking = (spot) => {
    setBookingSpot(spot);
    setIsBookingOpen(true);
  };

  const getPinColor = (spot) => {
    const slots = spot.availableSlots !== undefined ? spot.availableSlots : (spot.slots || 0);
    if (slots > 3) return "#10b981"; // Green: Available
    if (slots >= 1) return "#f59e0b"; // Yellow: Few left
    return "#ef4444"; // Red: Full
  };

  // RENDER SIMULATED SVG INTERACTIVE MAP
  const renderSimulatedMap = () => {
    const center = currentLocation || MAP_CENTER;
    
    // Project coordinates to 500x350 box
    const project = (lat, lng) => {
      const width = 500;
      const height = 350;
      
      let minLat = center.lat - 0.03;
      let maxLat = center.lat + 0.03;
      let minLng = center.lng - 0.03;
      let maxLng = center.lng + 0.03;

      if (parkings.length > 0) {
        const lats = parkings.map(s => s.location?.coordinates?.[1]).filter(Boolean);
        const lngs = parkings.map(s => s.location?.coordinates?.[0]).filter(Boolean);
        lats.push(center.lat);
        lngs.push(center.lng);
        minLat = Math.min(...lats) - 0.005;
        maxLat = Math.max(...lats) + 0.005;
        minLng = Math.min(...lngs) - 0.005;
        maxLng = Math.max(...lngs) + 0.005;
      }

      const latRange = maxLat - minLat || 0.01;
      const lngRange = maxLng - minLng || 0.01;

      const x = ((lng - minLng) / lngRange) * (width - 100) + 50;
      const y = height - (((lat - minLat) / latRange) * (height - 100) + 50);

      return { x, y };
    };

    const userProj = project(center.lat, center.lng);
    const selectedProj = selectedSpot?.location?.coordinates
      ? project(selectedSpot.location.coordinates[1], selectedSpot.location.coordinates[0])
      : null;

    return (
      <div className="relative w-full h-full bg-slate-50 flex flex-col items-center justify-center select-none text-slate-700">
        {/* Style block for simulated map route animation */}
        <style>{`
          @keyframes dash {
            to {
              stroke-dashoffset: -20;
            }
          }
          .simulated-route-line {
            stroke-dasharray: 6, 4;
            animation: dash 1.5s linear infinite;
          }
        `}</style>

        {/* Dynamic Map Title Info */}
        <div className="absolute top-4 left-4 bg-white border border-slate-200 px-4 py-2 rounded-lg text-xs font-medium shadow-sm z-15 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-parking-500 animate-pulse"></span>
          <span>Map view (simulated)</span>
        </div>

        {/* SVG Drawing Canvas */}
        <svg viewBox="0 0 500 350" className="w-full h-full">
          {/* Subtle grid lines */}
          {[...Array(10)].map((_, i) => (
            <line key={`v-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="350" stroke="rgba(15,23,42,0.04)" strokeWidth="1" />
          ))}
          {[...Array(7)].map((_, i) => (
            <line key={`h-${i}`} x1="0" y1={i * 50} x2="500" y2={i * 50} stroke="rgba(15,23,42,0.04)" strokeWidth="1" />
          ))}

          {/* Simulated Streets/Roads */}
          <path d="M 0,110 L 500,110" stroke="rgba(15,23,42,0.08)" strokeWidth="12" fill="none" />
          <path d="M 0,240 L 500,240" stroke="rgba(15,23,42,0.08)" strokeWidth="12" fill="none" />
          <path d="M 120,0 L 120,350" stroke="rgba(15,23,42,0.08)" strokeWidth="12" fill="none" />
          <path d="M 380,0 L 380,350" stroke="rgba(15,23,42,0.08)" strokeWidth="12" fill="none" />
          <path d="M 0,0 L 500,350" stroke="rgba(15,23,42,0.04)" strokeWidth="8" fill="none" />

          {/* Draw active animated routing path */}
          {selectedProj && (
            <path
              d={`M ${userProj.x},${userProj.y} Q ${(userProj.x + selectedProj.x) / 2},${(userProj.y + selectedProj.y) / 2 - 30} ${selectedProj.x},${selectedProj.y}`}
              stroke="#a78bfa"
              strokeWidth="4.5"
              fill="none"
              className="simulated-route-line"
            />
          )}

          {/* User Current Location Dot */}
          <circle cx={userProj.x} cy={userProj.y} r="12" fill="rgba(31, 122, 224, 0.2)" className="animate-pulse" />
          <circle cx={userProj.x} cy={userProj.y} r="6" fill="#1f7ae0" stroke="#ffffff" strokeWidth="2" />
          <text x={userProj.x + 10} y={userProj.y - 10} fill="#1f7ae0" fontSize="10" fontWeight="bold">You</text>

          {/* Searched Location Target (Simulated) */}
          {searchedLocation && (() => {
            const searchProj = project(searchedLocation.lat, searchedLocation.lng);
            return (
              <g>
                <circle cx={searchProj.x} cy={searchProj.y} r="16" fill="rgba(239, 68, 68, 0.25)" className="animate-pulse" />
                <circle cx={searchProj.x} cy={searchProj.y} r="6" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                <text x={searchProj.x + 10} y={searchProj.y - 10} fill="#ef4444" fontSize="10" fontWeight="bold">Search Target</text>
              </g>
            );
          })()}

          {/* Render Parking Spots Pins */}
          {parkings.map((spot) => {
            const coords = spot.location?.coordinates;
            if (!coords || coords.length < 2) return null;
            const spotProj = project(coords[1], coords[0]);
            const isSelected = selectedSpot?._id === spot._id;
            const color = getPinColor(spot);

            return (
              <g
                key={spot._id}
                className="cursor-pointer"
                onClick={() => {
                  setActiveMarker(spot);
                  onSelectSpot(spot);
                }}
              >
                {/* Ping animation if selected */}
                {isSelected && (
                  <circle cx={spotProj.x} cy={spotProj.y - 12} r="18" fill={`${color}22`} className="animate-ping" />
                )}
                
                {/* Pin path */}
                <path
                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                  fill={color}
                  stroke={isSelected ? "#ffffff" : "rgba(0,0,0,0.3)"}
                  strokeWidth={isSelected ? 2 : 1}
                  transform={`translate(${spotProj.x - 12}, ${spotProj.y - 24}) scale(1.1)`}
                />

                {/* Micro info panel details on map */}
                <rect x={spotProj.x - 25} y={spotProj.y + 6} width="50" height="15" rx="3" fill="rgba(255, 255, 255, 0.95)" stroke="rgba(15, 23, 42, 0.1)" strokeWidth="0.5" />
                <text x={spotProj.x} y={spotProj.y + 17} textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="bold">
                  ₹{spot.pricePerHour || spot.price}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Custom Info Window (Simulated Mode) */}
        {activeMarker && (
          <div className="absolute bottom-6 left-6 right-6 md:left-6 md:right-auto bg-white border border-slate-200 p-4 rounded-xl shadow-md flex flex-col gap-3 z-30 max-w-sm">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-sm text-slate-900 leading-tight">{activeMarker.title || activeMarker.name}</h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[220px] truncate">{activeMarker.address}</p>
              </div>
              <button onClick={() => setActiveMarker(null)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="text-slate-700 tabular-nums">₹{activeMarker.pricePerHour || activeMarker.price}/hr</span>
              <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded flex items-center gap-0.5">
                ⭐ {activeMarker.rating || "5.0"}
              </span>
              <span className="text-slate-500">
                Slots: {activeMarker.availableSlots !== undefined ? activeMarker.availableSlots : (activeMarker.slots || 1)} left
              </span>
            </div>
            {activeMarker.distance !== undefined && (
              <p className="text-xs text-slate-500 font-medium">
                {activeMarker.distance} km away
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => handleOpenBooking(activeMarker)}
                className="flex-1 py-2 rounded-lg bg-parking-600 hover:bg-parking-700 text-white text-xs font-medium transition-colors"
              >
                Book Now
              </button>

              {currentLocation && activeMarker.location?.coordinates && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${activeMarker.location.coordinates[1]},${activeMarker.location.coordinates[0]}&travelmode=driving`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 text-xs flex items-center justify-center"
                  title="Open in Google Maps"
                >
                  <span className="material-symbols-outlined text-[16px]">navigation</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // IF GOOGLE MAPS API CRASHES OR NOT LOADED
  if (!isGoogleEnabled) {
    return (
      <div className="relative w-full h-full overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        {renderSimulatedMap()}
        <BookingModal
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          parkingData={bookingSpot}
        />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="relative w-full h-full overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        {renderSimulatedMap()}
        <BookingModal
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          parkingData={bookingSpot}
        />
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-slate-50 flex items-center justify-center border border-slate-200 rounded-xl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-parking-200 border-t-parking-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-medium">Loading map...</p>
        </div>
      </div>
    );
  }

  const mapCenter = selectedSpot?.location?.coordinates
    ? { lat: selectedSpot.location.coordinates[1], lng: selectedSpot.location.coordinates[0] }
    : currentLocation || MAP_CENTER;

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      <GoogleMap
        zoom={selectedSpot ? 15 : 13}
        center={mapCenter}
        mapContainerClassName="w-full h-full"
        options={{
          styles: LIGHT_MAP_STYLE,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      >
        {/* Render Current Location Marker */}
        {currentLocation && (
          <MarkerF
            position={currentLocation}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: "#38bdf8",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: 7,
            }}
            title="Your Location"
          />
        )}

        {/* Render Searched Location Target Marker */}
        {searchedLocation && (
          <MarkerF
            position={searchedLocation}
            icon={{
              path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              fillColor: "#ef4444",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: 6,
            }}
            title="Search Target"
          />
        )}

        {/* Render Parking Spots Markers */}
        {parkings.map((spot) => {
          const coords = spot.location?.coordinates;
          if (!coords || coords.length < 2) return null;
          const pos = { lat: coords[1], lng: coords[0] };
          const isSelected = selectedSpot?._id === spot._id;
          const color = getPinColor(spot);

          return (
            <MarkerF
              key={spot._id}
              position={pos}
              onClick={() => {
                setActiveMarker(spot);
                onSelectSpot(spot);
              }}
              icon={{
                path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                fillColor: color,
                fillOpacity: 1,
                strokeColor: isSelected ? "#ffffff" : "rgba(0,0,0,0.3)",
                strokeWeight: isSelected ? 2 : 1,
                scale: 1.5,
                anchor: new window.google.maps.Point(12, 22),
              }}
            />
          );
        })}

        {/* InfoWindow Card */}
        {activeMarker && (
          <InfoWindowF
            position={{
              lat: activeMarker.location.coordinates[1],
              lng: activeMarker.location.coordinates[0],
            }}
            onCloseClick={() => setActiveMarker(null)}
          >
            <div className="p-3 min-w-[220px] text-slate-900 bg-white rounded-xl flex flex-col gap-2 font-sans">
              <h4 className="font-bold text-sm text-slate-900 leading-tight">{activeMarker.title || activeMarker.name}</h4>
              <p className="text-xs text-slate-500 line-clamp-1">{activeMarker.address}</p>
              
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-800">₹{activeMarker.pricePerHour || activeMarker.price}/hr</span>
                <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">⭐ {activeMarker.rating || "5.0"}</span>
                <span className="text-slate-600">
                  {activeMarker.availableSlots !== undefined ? activeMarker.availableSlots : (activeMarker.slots || 1)} slots left
                </span>
              </div>

              {activeMarker.distance !== undefined && (
                <div className="text-[11px] text-slate-500 font-bold border-t border-slate-100 pt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">distance</span>
                  <span>{activeMarker.distance} km away</span>
                </div>
              )}
              
              <div className="flex gap-1.5 mt-1">
                <button
                  onClick={() => handleOpenBooking(activeMarker)}
                  className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors"
                >
                  Book Now
                </button>
                {currentLocation && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${activeMarker.location.coordinates[1]},${activeMarker.location.coordinates[0]}&travelmode=driving`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-350 rounded flex items-center justify-center transition-colors"
                    title="Open in Google Maps"
                  >
                    <span className="material-symbols-outlined text-[15px]">navigation</span>
                  </a>
                )}
              </div>
            </div>
          </InfoWindowF>
        )}

        {/* Directions Path */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              polylineOptions: {
                strokeColor: "#a78bfa",
                strokeOpacity: 0.8,
                strokeWeight: 5,
              },
              markerOptions: { visible: false },
            }}
          />
        )}
      </GoogleMap>

      {/* Floating Route Info panel */}
      {routeInfo && selectedSpot && (
        <div className="absolute bottom-6 left-6 right-6 md:left-6 md:right-auto bg-white border border-slate-200 p-4 rounded-xl shadow-md flex items-center gap-4 z-20">
          <div className="p-3 bg-parking-50 text-parking-600 rounded-lg">
            <span className="material-symbols-outlined">directions_car</span>
          </div>
          <div>
            <h5 className="text-xs text-slate-500 font-medium">Fastest Route</h5>
            <p className="text-slate-900 font-semibold text-sm">
              {routeInfo.distance} • <span className="text-parking-600">{routeInfo.duration}</span>
            </p>
          </div>
        </div>
      )}

      {/* Booking Config Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        parkingData={bookingSpot}
      />
    </div>
  );
}
