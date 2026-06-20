const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

const BASE_URL = "http://localhost:5000/api";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log("🚀 Starting ASAP Parking Check-In & Check-Out E2E Verification Test...\n");

  try {
    const timestamp = Date.now();
    const hostEmail = `host_checkin_${timestamp}@asap.io`;
    const hostPhone = `+91 ${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    // 1. Sign up Host
    console.log(`🔄 [Auth] Registering host: ${hostEmail}...`);
    const hostRegisterRes = await axios.post(`${BASE_URL}/auth/firebase-session`, {
      idToken: `MOCK_GOOGLE_ID_TOKEN:${hostEmail}:mock_uid_host_${timestamp}:Host Checkin ${timestamp}`,
      name: `Host Checkin ${timestamp}`,
      phone: hostPhone
    });
    
    const hostToken = hostRegisterRes.data.token;
    const hostId = hostRegisterRes.data.user._id;
    const hostHeaders = { Authorization: `Bearer ${hostToken}` };
    console.log(`✅ [Auth] Host registered: ${hostId}`);

    // 2. Admin Approve Host
    console.log("👑 [Admin] Logging in as Admin...");
    const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, { email: "admin@asap.io", password: "123456" });
    const adminToken = adminLoginRes.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    
    console.log(`👑 [Admin] Approving Host ID: ${hostId}...`);
    await axios.patch(`${BASE_URL}/admin/hosts/${hostId}/verify`, { status: "verified" }, { headers: adminHeaders });
    console.log("✅ [Admin] Host verified!");

    // 3. Create Parking Space
    console.log("🔄 [Listing] Host creating a parking space...");
    const parkingRes = await axios.post(
      `${BASE_URL}/parking`,
      {
        title: `Gate Spot ${timestamp}`,
        address: "Andheri West, Mumbai, Maharashtra 400053",
        latitude: 19.1136,
        longitude: 72.8697,
        pricePerHour: 120,
        vehicleType: "car",
        slots: 2,
        startTime: "00:00",
        endTime: "23:59",
        images: [{ url: "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98", public_id: "mock_image" }]
      },
      { headers: hostHeaders }
    );
    
    const parkingId = parkingRes.data._id;
    console.log(`✅ [Listing] Parking created: ${parkingId}`);

    // 4. Driver Login & Create Booking
    console.log("👤 [Driver] Logging in...");
    const driverLoginRes = await axios.post(`${BASE_URL}/auth/login`, { email: "driver@asap.io", password: "123456" });
    const driverToken = driverLoginRes.data.token;
    const driverHeaders = { Authorization: `Bearer ${driverToken}` };

    console.log("📅 [Booking] Creating a booking...");
    const startTime = new Date(Date.now() + 1000 * 60 * 5); // 5 min from now
    const endTime = new Date(Date.now() + 1000 * 60 * 65);  // 1 hour 5 min from now
    const bookingRes = await axios.post(
      `${BASE_URL}/bookings`,
      {
        parkingId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      },
      { headers: driverHeaders }
    );
    const bookingId = bookingRes.data._id;
    console.log(`✅ [Booking] Created Booking: ${bookingId}. Status: ${bookingRes.data.status}`);

    // 5. Pay for Booking
    console.log("💳 [Payment] Simulating payment verification...");
    const orderRes = await axios.post(`${BASE_URL}/payment/create-order`, { bookingId }, { headers: driverHeaders });
    const orderId = orderRes.data.id;
    
    const payId = `pay_checkin_${timestamp}`;
    let signature = "mock_checkin_sig";
    if (process.env.RAZORPAY_KEY_SECRET) {
      signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(orderId + "|" + payId)
        .digest("hex");
    }

    const paymentVerifyRes = await axios.post(
      `${BASE_URL}/payment/verify`,
      {
        razorpay_order_id: orderId,
        razorpay_payment_id: payId,
        razorpay_signature: signature,
        bookingId
      },
      { headers: driverHeaders }
    );
    
    let qrToken = paymentVerifyRes.data.booking.qrToken;
    console.log(`✅ [Payment] Paid! Booking Status: ${paymentVerifyRes.data.booking.status}. QR Token: ${qrToken}`);
    if (paymentVerifyRes.data.booking.status !== "paid") {
      throw new Error("Booking status should be 'paid' after payment");
    }

    // 6. QR check-in
    console.log(`🔄 [Check-In] Host scanning QR code manually...`);
    const checkInRes = await axios.post(
      `${BASE_URL}/bookings/check-in`,
      { qrToken },
      { headers: hostHeaders }
    );
    console.log(`✅ [Check-In] Scan verified! Valid: ${checkInRes.data.valid}. Booking Status: ${checkInRes.data.booking.status}`);
    if (checkInRes.data.booking.status !== "checked_in") {
      throw new Error("Booking status should be 'checked_in' after QR check-in");
    }

    // Attempt duplicate check-in
    console.log(`🔄 [Check-In] Testing duplicate scan protection...`);
    const dupCheckInRes = await axios.post(
      `${BASE_URL}/bookings/check-in`,
      { qrToken },
      { headers: hostHeaders }
    );
    console.log(`✅ [Check-In] Duplicate check-in handled correctly. Already Checked In: ${dupCheckInRes.data.alreadyCheckedIn}`);

    // 7. Start Session
    console.log(`🔄 [Session] Host starting active parking session...`);
    const startSessionRes = await axios.patch(
      `${BASE_URL}/bookings/${bookingId}/start`,
      {},
      { headers: hostHeaders }
    );
    console.log(`✅ [Session] Session started! Booking Status: ${startSessionRes.data.booking.status}`);
    if (startSessionRes.data.booking.status !== "active") {
      throw new Error("Booking status should be 'active' after starting session");
    }

    // 8. Check-Out
    console.log("⏳ [Session] Sleeping 2 seconds to simulate active duration...");
    await sleep(2000);

    console.log(`🔄 [Session] Host checking out driver...`);
    const checkOutRes = await axios.patch(
      `${BASE_URL}/bookings/${bookingId}/check-out`,
      {},
      { headers: hostHeaders }
    );
    console.log(`✅ [Session] Checked out! Booking Status: ${checkOutRes.data.booking.status}`);
    console.log(`   Duration calculated: ${checkOutRes.data.durationHours} hr(s)`);
    console.log(`   Check-Out Time: ${checkOutRes.data.booking.checkOutTime}`);
    if (checkOutRes.data.booking.status !== "completed") {
      throw new Error("Booking status should be 'completed' after checkout");
    }

    console.log("\n🎉 Check-In & Check-Out E2E verification test PASSED successfully! 🚀");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ E2E Check-In/Check-Out Test failed:");
    if (error.response) {
      console.error(`   Endpoint: ${error.config?.url}`);
      console.error(`   Status: ${error.response.status}`);
      console.error("   Response Data:", error.response.data);
    } else {
      console.error("   Error Message:", error.message);
    }
    process.exit(1);
  }
}

runTests();
