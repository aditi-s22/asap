/**
 * Safely resolves and normalizes image sources for parking spots.
 * Supports:
 * - Full absolute URLs (Unsplash, Cloudinary, etc.)
 * - Local upload relative paths (e.g. 'uploads/filename.jpg')
 * - Mongoose schema structures (strings or objects with .url)
 * - Returns a premium default fallback image for empty/null paths
 */
const PREMIUM_FALLBACK = "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80";

export const normalizeImageUrl = (imageInput) => {
  if (!imageInput) {
    return PREMIUM_FALLBACK;
  }

  let urlStr = "";

  if (typeof imageInput === "string") {
    urlStr = imageInput;
  } else if (typeof imageInput === "object") {
    if (imageInput.url) {
      urlStr = imageInput.url;
    } else if (imageInput.images && imageInput.images.length > 0) {
      const first = imageInput.images[0];
      urlStr = typeof first === "string" ? first : first?.url || "";
    } else if (imageInput.image) {
      urlStr = imageInput.image;
    }
  }

  urlStr = urlStr.trim();
  if (!urlStr) {
    return PREMIUM_FALLBACK;
  }

  // If it's already an absolute URL (HTTP/HTTPS), return it directly
  if (/^https?:\/\//i.test(urlStr)) {
    return urlStr;
  }

  // Resolve backend server base URL
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const backendBase = apiBase.replace(/\/api\/?$/, ""); // strip '/api' or '/api/'

  // Normalize windows backslashes to forward slashes
  let cleanPath = urlStr.replace(/\\/g, "/");

  // Ensure path starts with a single leading slash
  if (!cleanPath.startsWith("/")) {
    cleanPath = "/" + cleanPath;
  }

  return `${backendBase}${cleanPath}`;
};

/**
 * Category-based image pools for parking listing photography. Every URL below was
 * individually downloaded and visually inspected (not just HTTP-status-checked) to
 * confirm it actually shows parking infrastructure — an earlier pass here trusted
 * keyword/HTTP-200 matching alone and let through several wrong images (a private
 * jet, mountains, a houseplant, a camera, a construction worker) including one that
 * was live on the About page. Every image below is a real parking garage, lot,
 * driveway, or EV charging bay — no aircraft, skylines, or unrelated stock photos.
 */
export const IMAGE_POOLS = {
  airport: [
    "https://images.unsplash.com/photo-1641757454597-1e1bcb38e443?auto=format&fit=crop&w=800&q=70", // airport pickup curb, cars only
    "https://images.unsplash.com/photo-1543465077-db45d34b88a5?auto=format&fit=crop&w=800&q=70", // aerial lot near terminal-style building
  ],
  mall: [
    "https://images.unsplash.com/photo-1720166671019-744dcef65d05?auto=format&fit=crop&w=800&q=70", // aerial mall/plaza parking lot
    "https://images.unsplash.com/photo-1709890115362-45140c092145?auto=format&fit=crop&w=800&q=70", // indoor garage, striped pillars
    "https://images.unsplash.com/photo-1573599852326-2d4da0bbe613?auto=format&fit=crop&w=800&q=70", // underground garage, colored markers
  ],
  residential: [
    "https://images.unsplash.com/photo-1759369484704-fefd537878f1?auto=format&fit=crop&w=800&q=70", // modern house, cars under carport
    "https://images.unsplash.com/photo-1725815973392-f2be68ce3b09?auto=format&fit=crop&w=800&q=70", // car parked in driveway
  ],
  garage: [
    "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=70", // garage, aerial-style rows
    "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=800&q=70", // garage at night
    "https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=800&q=70", // indoor garage, yellow pillars
    "https://images.unsplash.com/photo-1758448721161-7b3df5ec04b3?auto=format&fit=crop&w=800&q=70", // clean modern underground garage
    "https://images.unsplash.com/photo-1558120985-abcafafcae16?auto=format&fit=crop&w=800&q=70", // dim underground garage
  ],
  corporate: [
    "https://images.unsplash.com/photo-1486796779781-c71f80facc9c?auto=format&fit=crop&w=800&q=70", // garage opening with city view
    "https://images.unsplash.com/photo-1698222472029-7ebef66ad90f?auto=format&fit=crop&w=800&q=70", // rooftop garage, office towers
    "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=70", // car in dark corporate garage
  ],
  outdoor: [
    "https://images.unsplash.com/photo-1698222476261-c84a34b90ca7?auto=format&fit=crop&w=800&q=70", // clean multi-level structure exterior
    "https://images.unsplash.com/photo-1681566820375-ed1eaa101a78?auto=format&fit=crop&w=800&q=70", // multi-story lot, black & white
  ],
  evCharging: [
    "https://images.unsplash.com/photo-1617886322168-72b886573c35?auto=format&fit=crop&w=800&q=70", // EV charging in garage
    "https://images.unsplash.com/photo-1703860271509-b50f5679f2a0?auto=format&fit=crop&w=800&q=70", // charging connector plugged into car
  ],
};

const CATEGORY_LABELS = {
  airport: "Airport Parking",
  mall: "Mall Parking",
  residential: "Residential Parking",
  garage: "Garage Parking",
  corporate: "Corporate Parking",
  outdoor: "Outdoor Lot",
  evCharging: "EV Charging",
};

const CATEGORY_COVERED = {
  airport: "Covered",
  mall: "Covered",
  garage: "Covered",
  corporate: "Covered",
  residential: "Open",
  outdoor: "Open",
  evCharging: "Covered",
};

const CATEGORY_KEYWORDS = [
  { category: "evCharging", words: ["ev charging", "ev point", "charging station", "electric vehicle"] },
  { category: "airport", words: ["airport", "terminal", "t1", "t2", "t3", "runway"] },
  { category: "mall", words: ["mall", "marketcity", "plaza", "city centre", "shopping"] },
  { category: "corporate", words: ["cyber", "tech park", "it park", "business park", "corporate", "bkc", "office"] },
  { category: "garage", words: ["garage", "basement", "covered garage"] },
  { category: "residential", words: ["society", "apartment", "residency", "residential", "layout", "nagar", "colony"] },
  { category: "outdoor", words: ["lot", "ground", "open lot", "outdoor", "yard"] },
];

const CATEGORY_KEYS = Object.keys(IMAGE_POOLS);

// Small deterministic string hash — same id always maps to the same pool index,
// so a given listing's photo doesn't change on every re-render/reload.
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const inferCategory = (parking) => {
  const haystack = `${parking?.title || ""} ${parking?.address || ""}`.toLowerCase();
  for (const { category, words } of CATEGORY_KEYWORDS) {
    if (words.some((w) => haystack.includes(w))) return category;
  }
  const id = parking?._id || parking?.title || "fallback";
  return CATEGORY_KEYS[hashString(String(id)) % CATEGORY_KEYS.length];
};

export const getCategoryLabel = (category) => CATEGORY_LABELS[category] || "Parking";

export const getCoveredStatus = (parking, category) => {
  if (typeof parking?.covered === "boolean") return parking.covered ? "Covered" : "Open";
  return CATEGORY_COVERED[category] || "Open";
};

// Generic Unsplash stock photos (including the seeded demo pool, which only cycles
// through a handful of images) are recognizably "not a real listing photo" — only a
// genuine host upload (Cloudinary or a local /uploads path) should bypass diversification.
const isReplaceableStockUrl = (url) => !url || /images\.unsplash\.com/i.test(url);

const hasRealImage = (parking) => {
  let url = null;
  if (parking?.image) {
    url = parking.image;
  } else if (Array.isArray(parking?.images) && parking.images.length > 0) {
    const first = parking.images[0];
    url = typeof first === "string" ? first : first?.url;
  }
  return Boolean(url) && !isReplaceableStockUrl(url);
};

/**
 * Takes a list of parking spots and returns the same list with a `_category`
 * and `_displayImage` attached to each. Listings with a real uploaded photo
 * keep it untouched; listings without one get a deterministic-but-varied pick
 * from the matching category pool, with a pass afterward to break up any
 * adjacent duplicates so a results grid never shows the same photo twice in a row.
 */
export const assignDiverseImages = (parkingList = []) => {
  const enriched = parkingList.map((parking) => {
    const category = inferCategory(parking);
    if (hasRealImage(parking)) {
      return { ...parking, _category: category, _displayImage: normalizeImageUrl(parking) };
    }
    const pool = IMAGE_POOLS[category];
    const idx = hashString(String(parking?._id || parking?.title || Math.random())) % pool.length;
    return { ...parking, _category: category, _displayImage: pool[idx] };
  });

  for (let i = 1; i < enriched.length; i++) {
    if (enriched[i]._displayImage === enriched[i - 1]._displayImage) {
      const pool = IMAGE_POOLS[enriched[i]._category];
      const altIdx = (pool.indexOf(enriched[i]._displayImage) + 1) % pool.length;
      enriched[i]._displayImage = pool[altIdx];
    }
  }

  return enriched;
};
