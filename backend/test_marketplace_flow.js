const axios = require("axios");

const BASE_URL = "http://localhost:5000/api";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log("🚀 Starting ASAP Parking Marketplace End-to-End API verification tests...\n");

  try {
    const timestamp = Date.now();
    const testEmail = `host_${timestamp}@asap.io`;
    const testPhone = `+91 ${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    // ==========================================
    // 1. REGISTRATION WITH OTP & GOOGLE AUTH MOCK
    // ==========================================
    console.log(`🔄 [Auth] Requesting OTP for signup: ${testEmail}...`);
    const sendOtpRes = await axios.post(`${BASE_URL}/auth/send-otp`, {
      emailOrPhone: testEmail,
      type: "signup"
    });

    if (sendOtpRes.status === 200 && sendOtpRes.data.otp) {
      console.log(`✅ [Auth] OTP sent successfully! Mock OTP received: ${sendOtpRes.data.otp}`);
    } else {
      throw new Error("Failed to send OTP or retrieve mock code");
    }

    const signupOtp = sendOtpRes.data.otp;

    console.log(`🔄 [Auth] Verifying OTP ${signupOtp} for ${testEmail}...`);
    const verifyOtpRes = await axios.post(`${BASE_URL}/auth/verify-otp`, {
      emailOrPhone: testEmail,
      otp: signupOtp,
      type: "signup"
    });

    if (verifyOtpRes.status === 200) {
      console.log("✅ [Auth] OTP verified successfully!");
    } else {
      throw new Error("OTP verification failed");
    }

    console.log("🔄 [Auth] Registering new user as Host-to-be...");
    const registerRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: `Host User ${timestamp}`,
      email: testEmail,
      password: "password123",
      phone: testPhone,
      otp: signupOtp
    });

    let hostToken, hostId;
    if (registerRes.status === 201 && registerRes.data.token) {
      hostToken = registerRes.data.token;
      hostId = registerRes.data.user._id;
      console.log(`✅ [Auth] User registered successfully! ID: ${hostId}`);
    } else {
      throw new Error("Registration failed");
    }

    const hostHeaders = { Authorization: `Bearer ${hostToken}` };

    console.log("🔄 [Auth] Testing Google Sign-In simulated fallback...");
    const googleRes = await axios.post(`${BASE_URL}/auth/google`, {
      email: `google_${timestamp}@asap.io`,
      name: "Google Verified Commuter",
      profileImage: "https://lh3.googleusercontent.com/a/mock-pic"
    });

    if (googleRes.status === 200 && googleRes.data.token) {
      console.log(`✅ [Auth] Google Auth simulation successful! Registered User: ${googleRes.data.user.name}\n`);
    } else {
      throw new Error("Google auth simulation failed");
    }

    // ==========================================
    // 2. HOST ONBOARDING WIZARD SUBMISSION
    // ==========================================
    console.log("🔄 [Host Onboarding] Submitting ID and Address proofs to become a Host...");
    const profileUpdateRes = await axios.post(
      `${BASE_URL}/users/host-application`,
      {
        phone: testPhone,
        govIdImage: `http://localhost:5000/uploads/gov_id_${timestamp}.png`,
        addressProofImage: `http://localhost:5000/uploads/address_proof_${timestamp}.png`
      },
      { headers: hostHeaders }
    );

    if (profileUpdateRes.status === 200 && profileUpdateRes.data.verifiedHost === "pending") {
      console.log("✅ [Host Onboarding] Host verification request submitted to admin queue (status: pending)!");
    } else {
      throw new Error("Failed to submit host onboarding profile details");
    }

    console.log("🔄 [Host Onboarding] Registering a new parking space (starts inactive/unapproved)...");
    const parkingRes = await axios.post(
      `${BASE_URL}/parking`,
      {
        title: `CP Royal Space ${timestamp}`,
        address: "E-Block, Radial Road 2, Connaught Place, New Delhi - 110001",
        latitude: 28.6304,
        longitude: 77.2177,
        pricePerHour: 100,
        vehicleType: "car",
        slots: 2,
        startTime: "00:00",
        endTime: "23:59",
        images: [{ url: "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98", public_id: "mock_uploaded_spot" }]
      },
      { headers: hostHeaders }
    );

    let parkingId;
    if (parkingRes.status === 201 && parkingRes.data._id) {
      parkingId = parkingRes.data._id;
      console.log(`✅ [Host Onboarding] Parking space created! ID: ${parkingId}`);
      console.log(`   Verification Status: ${parkingRes.data.verificationStatus}`);
      console.log(`   Is Approved: ${parkingRes.data.isApproved}\n`);
    } else {
      throw new Error("Failed to create parking space");
    }

    // ==========================================
    // 3. SEARCH FILTER & ADMIN APPROVAL FLOW
    // ==========================================
    console.log("🔍 [Search] Verifying that the unapproved spot does NOT appear in customer searches...");
    const unapprovedSearch = await axios.get(`${BASE_URL}/parking/search?query=CP+Royal`);
    const foundUnapproved = unapprovedSearch.data.some(p => p._id === parkingId);
    if (!foundUnapproved) {
      console.log("✅ [Search] Correct! Unapproved spot is hidden from public discovery.");
    } else {
      throw new Error("Security Alert: Unapproved parking spot appeared in search results!");
    }

    console.log("\n👑 [Admin] Logging in as ASAP Admin...");
    const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: "admin@asap.io",
      password: "123456"
    });

    let adminToken;
    if (adminLoginRes.status === 200 && adminLoginRes.data.token) {
      adminToken = adminLoginRes.data.token;
      console.log("✅ [Admin] Admin authenticated successfully!");
    } else {
      throw new Error("Admin login failed");
    }

    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    console.log("👑 [Admin] Checking pending host queue...");
    const pendingHostsRes = await axios.get(`${BASE_URL}/admin/hosts/pending`, { headers: adminHeaders });
    const isHostInQueue = pendingHostsRes.data.some(u => u._id === hostId);
    if (isHostInQueue) {
      console.log(`✅ [Admin] Found user ${hostId} in pending hosts list! Documents details verified.`);
    } else {
      throw new Error("Registered host not found in admin pending hosts queue");
    }

    console.log(`👑 [Admin] Approving Host ID: ${hostId}...`);
    const approveHostRes = await axios.patch(
      `${BASE_URL}/admin/hosts/${hostId}/verify`,
      { status: "verified" },
      { headers: adminHeaders }
    );

    if (approveHostRes.status === 200 && approveHostRes.data.host.role === "host") {
      console.log("✅ [Admin] Host status updated to verified!");
      console.log(`   User Role elevated to: ${approveHostRes.data.host.role}`);
    } else {
      throw new Error("Admin host approval failed");
    }

    console.log("🔍 [Search] Verifying that the spot is now APPROVED and visible in customer searches...");
    const approvedSearch = await axios.get(`${BASE_URL}/parking/search?query=CP+Royal`);
    const foundApproved = approvedSearch.data.find(p => p._id === parkingId);
    if (foundApproved) {
      console.log(`✅ [Search] Success! Spot "${foundApproved.title}" is now discoverable.`);
      console.log(`   Verification Status: ${foundApproved.verificationStatus}`);
      console.log(`   Is Approved: ${foundApproved.isApproved}\n`);
    } else {
      throw new Error("Host approval did not propagate to auto-approving parking spot or spot still missing from search");
    }

    // ==========================================
    // 4. BOOKING CREATION & REAL-TIME EMISSION
    // ==========================================
    console.log("👤 [Driver] Logging in as Rahul Driver...");
    const driverLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: "driver@asap.io",
      password: "123456"
    });

    let driverToken;
    if (driverLoginRes.status === 200 && driverLoginRes.data.token) {
      driverToken = driverLoginRes.data.token;
      console.log("✅ [Driver] Driver authenticated!");
    } else {
      throw new Error("Driver login failed");
    }

    const driverHeaders = { Authorization: `Bearer ${driverToken}` };

    console.log("📅 [Booking] Creating a short-duration booking (ending in 5 seconds to test reviews)...");
    const startTime = new Date(Date.now() + 1000); // 1 second from now
    const endTime = new Date(Date.now() + 6000);   // 6 seconds from now

    const bookingRes = await axios.post(
      `${BASE_URL}/bookings`,
      {
        parkingId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      },
      { headers: driverHeaders }
    );

    let bookingId;
    if (bookingRes.status === 201 && bookingRes.data._id) {
      bookingId = bookingRes.data._id;
      console.log(`✅ [Booking] Booking created! ID: ${bookingId} | Price: ₹${bookingRes.data.totalPrice}`);
    } else {
      throw new Error("Booking creation failed");
    }

    console.log("💳 [Payment] Initializing Payment simulation order...");
    const orderRes = await axios.post(
      `${BASE_URL}/payment/create-order`,
      { bookingId },
      { headers: driverHeaders }
    );

    const orderId = orderRes.data.id;
    console.log(`✅ [Payment] Order created: ${orderId}`);

    console.log("💳 [Payment] Verifying Payment (capturing order & generating QR)...");
    const verifyPayRes = await axios.post(
      `${BASE_URL}/payment/verify`,
      {
        razorpay_order_id: orderId,
        razorpay_payment_id: `pay_mocked_${timestamp}`,
        razorpay_signature: "mocked_sig",
        bookingId
      },
      { headers: driverHeaders }
    );

    if (verifyPayRes.status === 200 && verifyPayRes.data.verified) {
      console.log("✅ [Payment] Payment verified!");
      console.log(`   QR Code DataURL: ${verifyPayRes.data.booking.qrCode ? "Generated ✅" : "Missing ❌"}`);
      console.log(`   QR Token: ${verifyPayRes.data.booking.qrToken}`);
    } else {
      throw new Error("Payment verification failed");
    }

    // ==========================================
    // 5. TRUSTED REVIEWS CONSTRAINT CHECKS
    // ==========================================
    console.log("\n⭐️ [Reviews] Attempting to review BEFORE booking completes...");
    try {
      await axios.post(
        `${BASE_URL}/parking/${parkingId}/reviews`,
        {
          rating: 5,
          feedback: "Great parking experience, very spacious!",
          bookingId
        },
        { headers: driverHeaders }
      );
      throw new Error("Security check failed: Review succeeded before booking completion!");
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log(`✅ [Reviews] Success! Blocked review before checkout/completion ("${err.response.data.message}")`);
      } else {
        throw err;
      }
    }

    console.log("⏳ [Reviews] Waiting 6 seconds for booking duration to expire...");
    await sleep(6000);
    console.log("⏳ [Reviews] Booking should now be completed based on elapsed duration.");

    console.log("⭐️ [Reviews] Submitting review again (now that booking is completed)...");
    const reviewRes = await axios.post(
      `${BASE_URL}/parking/${parkingId}/reviews`,
      {
        rating: 5,
        feedback: "Great parking experience, very spacious!",
        bookingId
      },
      { headers: driverHeaders }
    );

    if (reviewRes.status === 201 && reviewRes.data._id) {
      console.log("✅ [Reviews] Review successfully recorded!");
      console.log(`   Feedback: "${reviewRes.data.feedback}" | Rating: ${reviewRes.data.rating} Stars`);
    } else {
      throw new Error("Review submission failed after booking completion");
    }

    console.log("⭐️ [Reviews] Attempting to review same booking a second time (Double review guard)...");
    try {
      await axios.post(
        `${BASE_URL}/parking/${parkingId}/reviews`,
        {
          rating: 4,
          feedback: "Trying to submit twice",
          bookingId
        },
        { headers: driverHeaders }
      );
      throw new Error("Security check failed: Double review was permitted for the same booking!");
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log(`✅ [Reviews] Success! Double-review blocked ("${err.response.data.message}")`);
      } else {
        throw err;
      }
    }

    console.log(`🔍 [Search] Checking if parking spot average rating updated...`);
    const finalSpotRes = await axios.get(`${BASE_URL}/parking/${parkingId}`);
    console.log(`   Spot Rating: ${finalSpotRes.data.rating} (Expected: 5.0)`);
    if (finalSpotRes.data.rating === 5) {
      console.log("✅ [Search] Average rating updated successfully!");
    } else {
      throw new Error("Spot rating was not updated");
    }

    // ==========================================
    // 6. HOST METRICS VERIFICATION
    // ==========================================
    console.log("\n📈 [Host Metrics] Fetching host metrics dashboard analytics...");
    const hostMetricsRes = await axios.get(`${BASE_URL}/parking/host/${hostId}/metrics`, { headers: hostHeaders });
    
    if (hostMetricsRes.status === 200) {
      const { activeNodes, netRevenue, totalBookings, occupancyRate, mostBookedSpot } = hostMetricsRes.data;
      console.log("✅ [Host Metrics] Metrics loaded successfully!");
      console.log(`   Active Parking Nodes: ${activeNodes}`);
      console.log(`   Net Host Revenue (90%): ₹${netRevenue}`);
      console.log(`   Total Bookings: ${totalBookings}`);
      console.log(`   Occupancy Rate: ${occupancyRate}%`);
      console.log(`   Most Booked Spot: "${mostBookedSpot}"`);

      if (activeNodes === 1 && totalBookings === 1 && netRevenue === (bookingRes.data.totalPrice * 0.9)) {
        console.log("✅ [Host Metrics] Metrics verified mathematically correct! 📐");
      } else {
        throw new Error("Metrics values mismatch based on simulated booking");
      }
    } else {
      throw new Error("Failed to load host metrics");
    }

    console.log("\n🎉 All ASAP Parking Marketplace E2E automation checks PASSED successfully! 🚀");
    process.exit(0);

  } catch (error) {
    console.error("\n❌ E2E Marketplace Test failed:");
    if (error.response) {
      console.error(`   Endpoint: ${error.config?.url}`);
      console.error(`   Method: ${error.config?.method?.toUpperCase()}`);
      console.error(`   Status: ${error.response.status}`);
      console.error("   Response Data:", error.response.data);
    } else {
      console.error("   Error Message:", error.message);
    }
    process.exit(1);
  }
}

runTests();
