/**
 * Single shared geocoding source for the whole app. Previously HostOnboarding.jsx,
 * HostDashboard.jsx, and SearchBar.jsx each kept their own ad-hoc Mumbai keyword
 * dictionary with slightly different coordinates — HostDashboard's copy never even
 * attempted real Google geocoding, which is what caused newly-created listings to be
 * saved at a generic Mumbai-center point instead of their real address.
 *
 * Real Google Geocoding is always tried first when the Maps JS API is loaded; the
 * dictionary below is only a last-resort fallback for offline/no-API-key dev environments.
 */
const FALLBACK_LOCATIONS = {
  "r city mall": { lat: 19.0863, lng: 72.9264 },
  "ghatkopar": { lat: 19.0863, lng: 72.9264 },
  "phoenix marketcity": { lat: 19.0886, lng: 72.8890 },
  "powai": { lat: 19.1170, lng: 72.9060 },
  "hiranandani": { lat: 19.1170, lng: 72.9060 },
  "iit bombay": { lat: 19.1334, lng: 72.9135 },
  "bkc": { lat: 19.0607, lng: 72.8634 },
  "bandra": { lat: 19.0596, lng: 72.8295 },
  "andheri east": { lat: 19.1136, lng: 72.8697 },
  "andheri west": { lat: 19.1363, lng: 72.8360 },
  "airport t1": { lat: 19.0988, lng: 72.8517 },
  "airport t2": { lat: 19.0896, lng: 72.8656 },
  "saki naka": { lat: 19.0962, lng: 72.8885 },
  "kurla": { lat: 19.0704, lng: 72.8826 },
  "thane": { lat: 19.2183, lng: 72.9781 },
  "viviana mall": { lat: 19.2183, lng: 72.9781 },
  "wagle estate": { lat: 19.1966, lng: 72.9575 },
  "vikhroli": { lat: 19.1079, lng: 72.9279 },
};

/** Last-resort default when nothing else matches — Mumbai city center. */
const DEFAULT_FALLBACK = { lat: 19.0760, lng: 72.8777 };

export const getFallbackCoordinates = (address) => {
  const norm = (address || "").toLowerCase();
  for (const key in FALLBACK_LOCATIONS) {
    if (norm.includes(key)) return FALLBACK_LOCATIONS[key];
  }
  return DEFAULT_FALLBACK;
};

/**
 * Resolves an address to coordinates using the real Google Maps Geocoder when
 * available, falling back to the keyword dictionary only if geocoding fails or
 * the Maps JS API isn't loaded. Always resolves (never rejects) — callers don't
 * need their own try/catch around this.
 */
export const geocodeAddress = async (address, { placeId = null } = {}) => {
  if (window.google && window.google.maps) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const request = placeId ? { placeId } : { address };
      const result = await new Promise((resolve, reject) => {
        geocoder.geocode(request, (results, status) => {
          if (status === "OK" && results?.[0]) {
            resolve(results[0]);
          } else {
            reject(status);
          }
        });
      });
      return {
        lat: result.geometry.location.lat(),
        lng: result.geometry.location.lng(),
        formattedAddress: result.formatted_address || address,
        placeId: result.place_id || placeId || null,
        source: "google",
      };
    } catch (err) {
      console.warn(`[Geocode] Google geocoding failed for "${address}" (status: ${err}). Using fallback dictionary.`);
    }
  } else {
    console.warn("[Geocode] Google Maps JS API not loaded. Using fallback dictionary.");
  }

  const coords = getFallbackCoordinates(address);
  return {
    lat: coords.lat,
    lng: coords.lng,
    formattedAddress: address,
    placeId: null,
    source: "fallback",
  };
};
