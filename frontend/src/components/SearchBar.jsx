import React, { useState, useEffect, useRef } from "react";
import Button from "./ui/Button";
import { searchParkings } from "../services/api";
import { geocodeAddress } from "../utils/geocode";

const POPULAR_INDIAN_LOCATIONS = [
  { title: "Connaught Place, New Delhi", lat: 28.6300, lng: 77.2185 },
  { title: "Indiranagar, Bengaluru", lat: 12.9716, lng: 77.6412 },
  { title: "Colaba, Mumbai", lat: 18.9215, lng: 72.8310 },
  { title: "DLF Cyber City, Gurugram", lat: 28.4949, lng: 77.0878 },
  { title: "HSR Layout, Bengaluru", lat: 12.9116, lng: 77.6378 }
];

export default function SearchBar({ onSearch, initialQuery = "" }) {
  const [query, setQuery] = useState(initialQuery);
  const [googleSuggestions, setGoogleSuggestions] = useState([]);
  const [dbSuggestions, setDbSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [locating, setLocating] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Load recent searches from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem("asap_recent_searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        setRecentSearches([]);
      }
    }
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions (Google Places + DB Search)
  useEffect(() => {
    if (query.trim().length < 2) {
      setGoogleSuggestions([]);
      setDbSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      // 1. Fetch DB parking matches
      try {
        const res = await searchParkings(query);
        setDbSuggestions(res.data || []);
      } catch (err) {
        console.error("Error fetching DB suggestions:", err);
      }

      // 2. Fetch Google Places predictions if Google API is loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        try {
          const autocompleteService = new window.google.maps.places.AutocompleteService();
          autocompleteService.getPlacePredictions(
            {
              input: query,
              componentRestrictions: { country: "in" } // Restrict suggestions to India
            },
            (predictions, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                setGoogleSuggestions(predictions);
              } else {
                setGoogleSuggestions([]);
              }
            }
          );
        } catch (e) {
          console.error("Google Places prediction error:", e);
        }
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const saveRecentSearch = (searchText) => {
    if (!searchText || searchText.trim() === "") return;
    const updated = [searchText, ...recentSearches.filter((s) => s !== searchText)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("asap_recent_searches", JSON.stringify(updated));
  };

  const getCoordinatesForPlace = async (locationName, placeId = null) => {
    // 1 & 2. Shared util: real Google Geocoder first, shared keyword dictionary fallback.
    const geo = await geocodeAddress(locationName, { placeId });
    if (geo.source === "google" || placeId) {
      return {
        lat: geo.lat,
        lng: geo.lng,
        placeId: geo.placeId || "google_resolved",
        formattedAddress: geo.formattedAddress,
        name: locationName
      };
    }

    // The shared util's fallback always resolves to *some* point (Mumbai center by
    // default), which is fine for parking listings but too aggressive for a driver's
    // free-text search — so for search we still prefer a more targeted match first.
    const norm = locationName.toLowerCase();
    const popularLoc = POPULAR_INDIAN_LOCATIONS.find(loc =>
      loc.title.toLowerCase().includes(norm) || norm.includes(loc.title.toLowerCase())
    );
    if (popularLoc) {
      const res = {
        lat: popularLoc.lat,
        lng: popularLoc.lng,
        placeId: "popular_fallback_id",
        formattedAddress: popularLoc.title,
        name: popularLoc.title
      };
      console.log(`[Location Search] Resolved coordinates from popular locations for "${locationName}":`, res);
      return res;
    }

    console.log(`[Location Search] Resolved coordinates from shared fallback dictionary for "${locationName}":`, geo);
    return {
      lat: geo.lat,
      lng: geo.lng,
      placeId: "fallback_id",
      formattedAddress: geo.formattedAddress,
      name: locationName
    };
  };

  const handleSelectLocation = async (locationName, placeId = null) => {
    setQuery(locationName);
    setShowDropdown(false);
    saveRecentSearch(locationName);
    const coords = await getCoordinatesForPlace(locationName, placeId);
    onSearch(locationName, date, time, coords);
  };

  const handleSearchSubmit = async () => {
    saveRecentSearch(query);
    const coords = await getCoordinatesForPlace(query);
    onSearch(query, date, time, coords);
  };

  // Browser Geolocation with reverse geocoding area name extraction
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setLocating(true);
    setShowDropdown(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocating(false);

        // Try to reverse geocode if Google Maps is loaded
        if (window.google && window.google.maps && window.google.maps.Geocoder) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
            if (status === "OK" && results?.[0]) {
              const components = results[0].address_components || [];
              let sublocality = "";
              let locality = "";
              for (const comp of components) {
                if (comp.types.includes("sublocality_level_1") || comp.types.includes("sublocality")) {
                  sublocality = comp.long_name;
                }
                if (comp.types.includes("locality")) {
                  locality = comp.long_name;
                }
              }
              const areaName = sublocality && locality 
                ? `${sublocality}, ${locality}` 
                : sublocality || locality || results[0].formatted_address.split(',')[0];

              console.log(`[Location Search] Reverse geocoded location to area name: "${areaName}"`);
              setQuery(areaName);
              saveRecentSearch(areaName);
              
              const coords = {
                lat: latitude,
                lng: longitude,
                placeId: results[0].place_id || "current_loc",
                formattedAddress: results[0].formatted_address,
                name: areaName
              };
              onSearch(areaName, date, time, coords);
            } else {
              const fallbackName = `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
              setQuery(fallbackName);
              onSearch(fallbackName, date, time, { lat: latitude, lng: longitude, name: fallbackName });
            }
          });
        } else {
          // Fallback if no geocoder
          const locStr = `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
          setQuery(locStr);
          onSearch(locStr, date, time, { lat: latitude, lng: longitude, name: locStr });
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        setLocating(false);
        alert("Failed to access your location. Please type manually.");
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const clearRecentSearches = (e) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem("asap_recent_searches");
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <section className="w-full bg-white border border-slate-200 shadow-sm rounded-xl flex flex-col md:flex-row gap-3 p-3 items-center">
        {/* Location Input */}
        <div className="relative w-full md:flex-1 group">
          <span className="material-symbols-outlined absolute left-4 top-3.5 text-slate-400 group-focus-within:text-parking-600 transition-colors text-[22px] pointer-events-none">
            {locating ? "sync" : "my_location"}
          </span>
          <input
            className={`w-full pl-12 pr-10 py-3.5 rounded-lg input-field text-base ${
              locating ? "animate-pulse" : ""
            }`}
            placeholder={locating ? "Determining position..." : "Where do you want to park? (e.g. Connaught Place)"}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-700"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>

        {/* Date Input */}
        <div className="relative w-full md:w-44 group">
          <span className="material-symbols-outlined absolute left-3 top-3.5 text-slate-400 group-focus-within:text-parking-600 transition-colors text-[20px] pointer-events-none">
            calendar_month
          </span>
          <input
            type="date"
            className="w-full pl-10 pr-3 py-3.5 rounded-lg input-field text-[15px]"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Time Input */}
        <div className="relative w-full md:w-36 group">
          <span className="material-symbols-outlined absolute left-3 top-3.5 text-slate-400 group-focus-within:text-parking-600 transition-colors text-[20px] pointer-events-none">
            schedule
          </span>
          <input
            type="time"
            className="w-full pl-10 pr-3 py-3.5 rounded-lg input-field text-[15px]"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>

        <Button
          variant="primary"
          className="w-full md:w-auto px-10 h-[52px] text-base flex-shrink-0 flex items-center gap-2"
          onClick={handleSearchSubmit}
        >
          <span>Search</span>
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Button>
      </section>

      {/* Autocomplete Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl overflow-hidden shadow-md z-50 border border-slate-200 max-h-[400px] overflow-y-auto">
          {/* Action options */}
          <div
            onClick={handleUseCurrentLocation}
            className="p-4 hover:bg-slate-50 border-b border-slate-100 flex items-center gap-3 cursor-pointer transition-colors text-parking-600 font-semibold"
          >
            <div className="w-8 h-8 rounded-full bg-parking-50 text-parking-600 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[18px]">gps_fixed</span>
            </div>
            <div className="text-left">
              <p className="text-sm">Use Current Location</p>
              <p className="text-xs text-slate-500">Search for parking spots around you</p>
            </div>
          </div>

          {/* Empty Query: Show recent & popular searches */}
          {query.trim().length < 2 ? (
            <>
              {recentSearches.length > 0 && (
                <div className="border-b border-slate-100 pb-2">
                  <div className="px-4 pt-3 pb-1 flex justify-between items-center">
                    <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Recent Searches</span>
                    <button
                      onClick={clearRecentSearches}
                      className="text-xs text-accent-600 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  {recentSearches.map((item, index) => (
                    <div
                      key={`recent-${index}`}
                      onClick={() => handleSelectLocation(item)}
                      className="px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-slate-400 text-[18px]">history</span>
                      <span className="text-slate-700 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <div className="px-4 pt-3 pb-1">
                  <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Popular Locations (India)</span>
                </div>
                {POPULAR_INDIAN_LOCATIONS.map((loc, index) => (
                  <div
                    key={`popular-${index}`}
                    onClick={() => handleSelectLocation(loc.title)}
                    className="px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-accent-500 text-[18px]">trending_up</span>
                    <span className="text-slate-700 text-sm font-medium">{loc.title}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Database Results */}
              {dbSuggestions.length > 0 && (
                <div className="border-b border-slate-100 pb-2">
                  <div className="px-4 pt-3 pb-1">
                    <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Matching Parking Spots</span>
                  </div>
                  {dbSuggestions.map((suggestion) => (
                    <div
                      key={`db-${suggestion._id}`}
                      onClick={() => handleSelectLocation(suggestion.title)}
                      className="p-4 hover:bg-slate-50 flex items-center gap-3 cursor-pointer transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-parking-50 text-parking-600 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[18px]">local_parking</span>
                      </div>
                      <div className="text-left">
                        <p className="text-slate-900 text-sm font-semibold truncate max-w-md">
                          {suggestion.title}
                        </p>
                        <p className="text-slate-500 text-xs truncate max-w-md mt-0.5">
                          {suggestion.address}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Google Places Results */}
              {googleSuggestions.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1">
                    <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Google Places Predictions</span>
                  </div>
                  {googleSuggestions.map((place) => (
                    <div
                      key={`google-${place.place_id}`}
                      onClick={() => handleSelectLocation(place.description, place.place_id)}
                      className="p-4 hover:bg-slate-50 flex items-center gap-3 cursor-pointer transition-colors border-b border-slate-100"
                    >
                      <div className="w-8 h-8 rounded-full bg-accent-400/10 text-accent-600 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[18px]">place</span>
                      </div>
                      <div className="text-left">
                        <p className="text-slate-900 text-sm font-semibold truncate max-w-md">
                          {place.structured_formatting?.main_text || place.description}
                        </p>
                        <p className="text-slate-500 text-xs truncate max-w-md mt-0.5">
                          {place.structured_formatting?.secondary_text || ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {dbSuggestions.length === 0 && googleSuggestions.length === 0 && (
                <div className="p-4 text-center text-slate-400 text-sm">
                  No matches found. Press Search to query anyway.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}