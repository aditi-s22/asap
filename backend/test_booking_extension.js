const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

const BASE_URL = "http://localhost:5000/api";

async function runTests() {
  console.log("🚀 Starting ASAP Parking Booking Extension Flow E2E Verification Test...\n");

  try {
    const timestamp = Date.now();
    const hostEmail = `host_extend_${timestamp}@asap.io`;
    const hostPhone = `+91 ${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    // 1. Sign up Host
    console.log(`🔄 [Auth] Registering host: ${hostEmail}...`);
    const hostRegisterRes = await axios.post(`${BASE_URL}/auth/firebase-session`, {
      idToken: `MOCK_GOOGLE_ID_TOKEN:${hostEmail}:mock_uid_host_${timestamp}:Host Extend ${timestamp}`,
      name: `Host Extend ${timestamp}`,
      phone: hostPhone
    });
    
    const hostToken = hostRegisterRes.data.token;
    const hostId = hostRegisterRes.data.user._id;
    const hostHeaders = { Authorization: `Bearer ${hostToken}` };

    // 2. Admin Approve Host
    console.log("👑 [Admin] Logging in as Admin...");
    const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, { email: "admin@asap.io", password: "123456" });
    const adminToken = adminLoginRes.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    
    await axios.patch(`${BASE_URL}/admin/hosts/${hostId}/verify`, { status: "verified" }, { headers: adminHeaders });

    // 3. Create Parking Space
    console.log("🔄 [Listing] Host creating a parking space...");
    const parkingRes = await axios.post(
      `${BASE_URL}/parking`,
      {
        title: `Extend Spot ${timestamp}`,
        address: "Borivali West, Mumbai, Maharashtra 400092",
        latitude: 19.2290,
        longitude: 72.8574,
        pricePerHour: 100,
        vehicleType: "car",
        slots: 1, // Only 1 slot to test overlapping slot validation
        startTime: "00:00",
        endTime: "23:59",
        images: [{ url: "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98", public_id: "mock_image" }]
      },
      { headers: hostHeaders }
    );
    const parkingId = parkingRes.data._id;

    // 4. Driver Login & Create Booking
    console.log("👤 [Driver] Logging in...");
    const driverLoginRes = await axios.post(`${BASE_URL}/auth/login`, { email: "driver@asap.io", password: "123456" });
    const driverToken = driverLoginRes.data.token;
    const driverHeaders = { Authorization: `Bearer ${driverToken}` };

    console.log("📅 [Booking] Creating booking for 1 hour...");
    const startTime = new Date(Date.now() + 1000 * 60 * 5); 
    const endTime = new Date(startTime.getTime() + 1000 * 60 * 60);  // +1 hour
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
    const originalPrice = bookingRes.data.totalPrice;
    console.log(`✅ [Booking] Created booking. Duration: 1 hour | Price: ₹${originalPrice}`);

    // 5. Pay for Booking
    console.log("💳 [Payment] Verifying Payment...");
    const orderRes = await axios.post(`${BASE_URL}/payment/create-order`, { bookingId }, { headers: driverHeaders });
    const orderId = orderRes.data.id;
    
    const payId = `pay_extend_${timestamp}`;
    let signature = "mock_extend_sig";
    if (process.env.RAZORPAY_KEY_SECRET) {
      signature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(orderId + "|" + payId)
        .digest("hex");
    }

    await axios.post(
      `${BASE_URL}/payment/verify`,
      {
        razorpay_order_id: orderId,
        razorpay_payment_id: payId,
        razorpay_signature: signature,
        bookingId
      },
      { headers: driverHeaders }
    );

    // 6. Extend Booking
    console.log("📅 [Booking] Extending booking by +1 hour...");
    const extendRes = await axios.post(
      `${BASE_URL}/bookings/${bookingId}/extend`,
      { hours: 1 },
      { headers: driverHeaders }
    );

    console.log(`✅ [Booking] Extension completed successfully!`);
    console.log(`   New End Time: ${extendRes.data.booking.endTime}`);
    console.log(`   New Total Price: ₹${extendRes.data.booking.totalPrice}`);
    console.log(`   Extra Charged: ₹${extendRes.data.extraPrice}`);

    const newEndExpected = new Date(endTime.getTime() + 1000 * 60 * 60);
    const newEndActual = new Date(extendRes.data.booking.endTime);
    
    if (Math.abs(newEndActual - newEndExpected) > 1000) {
      throw new Error(`Extension end time mismatch. Expected: ${newEndExpected.toISOString()}, Actual: ${newEndActual.toISOString()}`);
    }

    if (extendRes.data.booking.totalPrice !== originalPrice + 100) {
      throw new Error(`Incorrect price calculation. Expected: ₹${originalPrice + 100}, Actual: ₹${extendRes.data.booking.totalPrice}`);
    }

    // 7. Overlapping verification (since slots = 1 and driver extended, it should be full during extension period)
    console.log("🔍 [Verification] Testing slot double-booking block during extension period...");
    
    // Attempt another booking during extended time window
    const overlapStart = new Date(endTime.getTime() + 1000 * 60 * 10); // inside extension
    const overlapEnd = new Date(overlapStart.getTime() + 1000 * 60 * 30);
    
    // Register another driver
    const driver2Email = `driver2_${timestamp}@asap.io`;
    const driver2Res = await axios.post(`${BASE_URL}/auth/firebase-session`, {
      idToken: `MOCK_GOOGLE_ID_TOKEN:${driver2Email}:mock_uid_driver2_${timestamp}:Driver 2`,
      name: "Driver 2",
      phone: `+91 ${Math.floor(1000000000 + Math.random() * 9000000000)}`
    });
    const driver2Token = driver2Res.data.token;
    const driver2Headers = { Authorization: `Bearer ${driver2Token}` };

    try {
      console.log("📅 [Booking] Attempting to book the single-slot spot during extended window...");
      await axios.post(
        `${BASE_URL}/bookings`,
        {
          parkingId,
          startTime: overlapStart.toISOString(),
          endTime: overlapEnd.toISOString()
        },
        { headers: driver2Headers }
      );
      throw new Error("Security Alert: Slot double-booking occurred during extension period!");
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log(`✅ [Booking] Success! Overlapping booking blocked ("${err.response.data.message}")`);
      } else {
        throw err;
      }
    }

    console.log("\n🎉 Booking Extension & Slot Validation E2E verification test PASSED successfully! 🚀");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ E2E Booking Extension Test failed:");
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
