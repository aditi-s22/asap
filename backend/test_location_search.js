const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log("🚀 Starting ASAP Parking Location Search and Host Verification tests...\n");

  try {
    // ----------------------------------------------------
    // TEST 1: Search near R City Mall (Ghatkopar)
    // ----------------------------------------------------
    console.log("[Location Search] Resolving coordinates for R City Mall...");
    const rcityCoords = { lat: 19.0863, lng: 72.9264 };
    console.log(`[Location Search] Target: R City Mall | Lat: ${rcityCoords.lat}, Lng: ${rcityCoords.lng}`);

    console.log(`[Nearby Query] Querying backend /api/parking/search/nearby?lat=${rcityCoords.lat}&lng=${rcityCoords.lng}`);
    const rcityRes = await axios.get(`${BASE_URL}/parking/search/nearby`, {
      params: rcityCoords
    });

    if (rcityRes.status === 200 && Array.isArray(rcityRes.data)) {
      console.log(`[Parking Found] Found ${rcityRes.data.length} spots near R City Mall.`);
      const matchesGhatkopar = rcityRes.data.filter(spot => 
        spot.title.toLowerCase().includes("ghatkopar") || spot.title.toLowerCase().includes("r city")
      );
      console.log(`   Nearby Ghatkopar spots: ${matchesGhatkopar.length}/${rcityRes.data.length}`);
      matchesGhatkopar.slice(0, 3).forEach((spot) => {
        console.log(`   - Spot: "${spot.title}" | Distance: ${spot.distance} km | Address: "${spot.address}"`);
      });
      console.log("✅ TEST 1: R City Mall Search Successful!\n");
    } else {
      throw new Error("R City Mall search failed");
    }

    // ----------------------------------------------------
    // TEST 2: Search near BKC
    // ----------------------------------------------------
    console.log("[Location Search] Resolving coordinates for BKC...");
    const bkcCoords = { lat: 19.0607, lng: 72.8634 };
    console.log(`[Location Search] Target: BKC | Lat: ${bkcCoords.lat}, Lng: ${bkcCoords.lng}`);

    console.log(`[Nearby Query] Querying backend /api/parking/search/nearby?lat=${bkcCoords.lat}&lng=${bkcCoords.lng}`);
    const bkcRes = await axios.get(`${BASE_URL}/parking/search/nearby`, {
      params: bkcCoords
    });

    if (bkcRes.status === 200 && Array.isArray(bkcRes.data)) {
      console.log(`[Parking Found] Found ${bkcRes.data.length} spots near BKC.`);
      const matchesBkc = bkcRes.data.filter(spot => 
        spot.title.toLowerCase().includes("bkc") || spot.title.toLowerCase().includes("bandra kurla")
      );
      console.log(`   Nearby BKC spots: ${matchesBkc.length}/${bkcRes.data.length}`);
      matchesBkc.slice(0, 3).forEach((spot) => {
        console.log(`   - Spot: "${spot.title}" | Distance: ${spot.distance} km | Address: "${spot.address}"`);
      });
      console.log("✅ TEST 2: BKC Search Successful!\n");
    } else {
      throw new Error("BKC search failed");
    }

    // ----------------------------------------------------
    // TEST 3: Search near Airport T2
    // ----------------------------------------------------
    console.log("[Location Search] Resolving coordinates for Airport T2...");
    const airportCoords = { lat: 19.0896, lng: 72.8656 };
    console.log(`[Location Search] Target: Airport T2 | Lat: ${airportCoords.lat}, Lng: ${airportCoords.lng}`);

    console.log(`[Nearby Query] Querying backend /api/parking/search/nearby?lat=${airportCoords.lat}&lng=${airportCoords.lng}`);
    const airportRes = await axios.get(`${BASE_URL}/parking/search/nearby`, {
      params: airportCoords
    });

    if (airportRes.status === 200 && Array.isArray(airportRes.data)) {
      console.log(`[Parking Found] Found ${airportRes.data.length} spots near Airport T2.`);
      const matchesAirport = airportRes.data.filter(spot => 
        spot.title.toLowerCase().includes("airport")
      );
      console.log(`   Nearby Airport spots: ${matchesAirport.length}/${airportRes.data.length}`);
      matchesAirport.slice(0, 3).forEach((spot) => {
        console.log(`   - Spot: "${spot.title}" | Distance: ${spot.distance} km | Address: "${spot.address}"`);
      });
      console.log("✅ TEST 3: Airport T2 Search Successful!\n");
    } else {
      throw new Error("Airport T2 search failed");
    }

    // ----------------------------------------------------
    // TEST 4: Create Host Listing & Admin Approval Workflow
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

    // B. Create a new Listing (initially unapproved)
    const testSpotTitle = `Verification Spot Near Powai ${Date.now()}`;
    const testSpotLat = 19.1170;
    const testSpotLng = 72.9060;

    console.log(`[Host Listing] Creating new spot: "${testSpotTitle}" near Powai...`);
    const createSpotRes = await axios.post(
      `${BASE_URL}/parking`,
      {
        title: testSpotTitle,
        address: "IIT Main Gate Rd, Powai, Mumbai, Maharashtra 400076",
        latitude: testSpotLat,
        longitude: testSpotLng,
        pricePerHour: 90,
        vehicleType: "car",
        slots: 5,
        startTime: "00:00",
        endTime: "23:59",
        images: [{ url: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a", public_id: "host_verify_test" }]
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

    // C. Verify the unapproved spot does NOT appear in nearby search results
    console.log(`[Location Search] Verifying that the unapproved spot "${testSpotTitle}" does NOT appear in search results.`);
    const preApproveRes = await axios.get(`${BASE_URL}/parking/search/nearby`, {
      params: { lat: testSpotLat, lng: testSpotLng }
    });
    
    const isSpotFoundPre = preApproveRes.data.some(spot => spot._id === spotId);
    if (!isSpotFoundPre) {
      console.log(`✅ Success: Unapproved spot is hidden from public discovery.\n`);
    } else {
      throw new Error("Security Alert: Unapproved parking spot appeared in search results!");
    }

    // D. Log in as Admin and Approve the Listing
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

    // E. Verify the approved spot now appears in nearby search results
    console.log(`[Location Search] Querying nearby spots for Powai at (lat: ${testSpotLat}, lng: ${testSpotLng})`);
    const postApproveRes = await axios.get(`${BASE_URL}/parking/search/nearby`, {
      params: { lat: testSpotLat, lng: testSpotLng }
    });

    const approvedSpot = postApproveRes.data.find(spot => spot._id === spotId);
    if (approvedSpot) {
      console.log(`✅ [Host Listing Visible] Spot "${approvedSpot.title}" is now approved and visible in nearby search.`);
      console.log(`   Proximity Distance: ${approvedSpot.distance} km`);
      console.log(`   [Appears On Map] Simulating map marker render: Green (Available) marker at lat: ${testSpotLat}, lng: ${testSpotLng}\n`);
      console.log("✅ TEST 4: Host Listing Creation & Approval Workflow Successful!\n");
    } else {
      throw new Error("Approved parking spot still not visible in nearby search results!");
    }

    console.log("🏆 All Location-Based Discovery tests passed successfully! 🏆");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data?.message || error.message);
    process.exit(1);
  }
}

runTests();
