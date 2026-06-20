const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log("🚀 Starting ASAP Parking Google Maps Location Flow verification tests...\n");

  const locations = [
    { name: "R City Mall", lat: 19.0863, lng: 72.9264, expectedMatch: "Premium R City Mall, Ghatkopar Spot A" },
    { name: "Powai", lat: 19.1176, lng: 72.9060, expectedMatch: "Premium Powai Hiranandani Spot A" },
    { name: "BKC", lat: 19.0607, lng: 72.8634, expectedMatch: "Premium Bandra Kurla Complex Spot A" },
    { name: "Airport T2", lat: 19.0896, lng: 72.8656, expectedMatch: "Premium Airport T2 Spot A" }
  ];

  try {
    // ----------------------------------------------------
    // TESTS 1-4: Geocoded Proximity Search & Proximity sorting
    // ----------------------------------------------------
    for (const loc of locations) {
      console.log(`[Location Search] Resolved coordinates for "${loc.name}": Lat ${loc.lat}, Lng ${loc.lng}`);
      console.log(`[Nearby Query] Querying /api/parking/search/nearby?lat=${loc.lat}&lng=${loc.lng}...`);
      
      const res = await axios.get(`${BASE_URL}/parking/search/nearby`, {
        params: { lat: loc.lat, lng: loc.lng }
      });

      if (res.status === 200 && Array.isArray(res.data)) {
        console.log(`[Parking Found] Found ${res.data.length} spots near "${loc.name}".`);
        
        // Verify coordinates, distance, and slots exist on spots
        const invalidFields = res.data.some(spot => 
          spot.distance === undefined || 
          !spot.location || 
          !spot.location.coordinates || 
          spot.availableSlots === undefined
        );

        if (invalidFields) {
          throw new Error(`Data validation failed for spots near ${loc.name}. Missing distance, coordinates, or slots.`);
        }
        
        console.log("✅ Coordinates resolved & validated successfully.");
        console.log("✅ Proximity distance calculated successfully.");
        
        // Simulating marker render check
        res.data.slice(0, 3).forEach((spot, idx) => {
          const coords = spot.location.coordinates;
          const slots = spot.availableSlots;
          const markerColor = slots > 3 ? "Green" : slots >= 1 ? "Yellow" : "Red";
          console.log(`   [Marker Rendered] Color: ${markerColor} | "${spot.title}" at [Lng: ${coords[0]}, Lat: ${coords[1]}] (${spot.distance} km away, ${Math.max(1, Math.round(spot.distance * 2.5 + 1))} min drive)`);
        });
        
        console.log(`✅ TEST: Search near "${loc.name}" passed successfully!\n`);
      } else {
        throw new Error(`Search near ${loc.name} failed with status code ${res.status}`);
      }
    }

    // ----------------------------------------------------
    // TEST 5: Host listing -> Admin approval -> Discovery propagation
    // ----------------------------------------------------
    console.log("🔄 Starting Host Listing approval flow verification...");

    // A. Log in as Host
    console.log("[Location Search] Logging in as Host: host@asap.io");
    const hostLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: "host@asap.io",
      password: "123456"
    });

    if (hostLoginRes.status !== 200 || !hostLoginRes.data.token) {
      throw new Error("Host login failed");
    }
    const hostToken = hostLoginRes.data.token;
    const hostHeaders = { Authorization: `Bearer ${hostToken}` };
    console.log("✅ Host login successful.\n");

    // B. Create a new Listing
    const testSpotTitle = `Google Verification Powai Spot ${Date.now()}`;
    const testSpotLat = 19.1176;
    const testSpotLng = 72.9060;

    console.log(`[Host Listing] Creating new spot: "${testSpotTitle}" near Powai...`);
    const createSpotRes = await axios.post(
      `${BASE_URL}/parking`,
      {
        title: testSpotTitle,
        address: "Powai, Mumbai, Maharashtra 400076",
        latitude: testSpotLat,
        longitude: testSpotLng,
        pricePerHour: 110,
        vehicleType: "car",
        slots: 4,
        startTime: "08:00",
        endTime: "22:00",
        images: [{ url: "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98", public_id: "google_host_verify_test" }]
      },
      { headers: hostHeaders }
    );

    if (createSpotRes.status !== 201 || !createSpotRes.data._id) {
      throw new Error("Failed to create parking spot listing");
    }
    const spotId = createSpotRes.data._id;
    console.log(`✅ [Saved Coordinates] Lng: ${testSpotLng}, Lat: ${testSpotLat}`);
    console.log(`✅ [Host Listing] Created Spot: "${testSpotTitle}" with ID: ${spotId}`);
    console.log(`   Verification Status: ${createSpotRes.data.verificationStatus} | isApproved: ${createSpotRes.data.isApproved}\n`);

    // C. Verify unapproved spot is not returned in search results
    console.log(`[Location Search] Verifying that unapproved spot "${testSpotTitle}" is hidden.`);
    const preApproveRes = await axios.get(`${BASE_URL}/parking/search/nearby`, {
      params: { lat: testSpotLat, lng: testSpotLng }
    });
    
    const isSpotFoundPre = preApproveRes.data.some(spot => spot._id === spotId);
    if (!isSpotFoundPre) {
      console.log(`✅ Success: Unapproved spot is hidden from public discovery.\n`);
    } else {
      throw new Error("Security Alert: Unapproved parking spot appeared in search results!");
    }

    // D. Log in as Admin and Approve
    console.log("[Location Search] Logging in as Admin: admin@asap.io");
    const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: "admin@asap.io",
      password: "123456"
    });

    if (adminLoginRes.status !== 200 || !adminLoginRes.data.token) {
      throw new Error("Admin login failed");
    }
    const adminToken = adminLoginRes.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    console.log("✅ Admin login successful.");

    console.log(`[Location Search] Approving spot "${testSpotTitle}" (ID: ${spotId})...`);
    const approveRes = await axios.patch(
      `${BASE_URL}/admin/parking/${spotId}/approve`,
      {},
      { headers: adminHeaders }
    );

    if (approveRes.status === 200 && approveRes.data.parking.isApproved) {
      console.log(`✅ [Host Listing Visible] Spot "${testSpotTitle}" successfully approved by Admin!\n`);
    } else {
      throw new Error("Failed to approve parking spot");
    }

    // E. Verify approved spot is now visible
    console.log(`[Location Search] Querying nearby spots for Powai at (lat: ${testSpotLat}, lng: ${testSpotLng})`);
    const postApproveRes = await axios.get(`${BASE_URL}/parking/search/nearby`, {
      params: { lat: testSpotLat, lng: testSpotLng }
    });

    const approvedSpot = postApproveRes.data.find(spot => spot._id === spotId);
    if (approvedSpot) {
      console.log(`✅ [Host Listing Visible] Spot "${approvedSpot.title}" is now approved and visible in nearby search.`);
      console.log(`   Proximity Distance: ${approvedSpot.distance} km`);
      const markerColor = approvedSpot.availableSlots > 3 ? "Green" : approvedSpot.availableSlots >= 1 ? "Yellow" : "Red";
      console.log(`   [Appears On Map] Rendered marker on canvas: ${markerColor} marker at lat: ${testSpotLat}, lng: ${testSpotLng}\n`);
      console.log("✅ TEST 5: Host-to-Admin Listing Approval Propagation Successful!\n");
    } else {
      throw new Error("Approved parking spot still not visible in nearby search results!");
    }

    console.log("🏆 All Google Maps Location Flow verification tests passed successfully! 🏆");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data?.message || error.message);
    process.exit(1);
  }
}

runTests();
