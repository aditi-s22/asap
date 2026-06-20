const axios = require("axios");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const crypto = require("crypto");

dotenv.config({ path: path.join(__dirname, ".env") });

const BASE_URL = "http://localhost:5000/api";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTestFlow() {
  console.log("🚀 Starting Listing Approval Pipeline End-to-End Integration Test...\n");

  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected successfully!\n");

    const User = require("./models/User");
    const Parking = require("./models/Parking");
    const Payment = require("./models/Payment");
    const Booking = require("./models/Booking");

    // Clean up any stale test listings / users
    const testEmail = "verify_pipeline_host@asap.io";
    const driverEmail = "verify_pipeline_driver@asap.io";
    await User.deleteMany({ email: { $in: [testEmail, driverEmail] } });

    console.log("👤 Creating test host user...");
    const hostUser = await User.create({
      name: "Pipeline Host",
      email: testEmail,
      role: "host",
      phone: "+91 99999 55555",
      verifiedHost: "verified",
      phoneVerified: true,
      emailVerified: true
    });
    console.log(`✅ Test host user created (ID: ${hostUser._id})\n`);

    console.log("👤 Creating test driver user...");
    const driverUser = await User.create({
      name: "Pipeline Driver",
      email: driverEmail,
      role: "driver",
      phone: "+91 99999 44444",
      phoneVerified: true,
      emailVerified: true
    });
    console.log(`✅ Test driver user created (ID: ${driverUser._id})\n`);

    // 1. Authenticate Admin, Host, and Driver
    console.log("🔄 Authenticating users...");
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: "admin@asap.io",
      password: "123456"
    });
    const adminHeaders = { Authorization: `Bearer ${adminLogin.data.token}` };

    const hostLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: testEmail,
      password: "123456"
    });
    const hostHeaders = { Authorization: `Bearer ${hostLogin.data.token}` };

    const driverLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: driverEmail,
      password: "123456"
    });
    const driverHeaders = { Authorization: `Bearer ${driverLogin.data.token}` };
    console.log("✅ Authentication complete.\n");

    // 2. STEP 1 & 2: Host Listing Creation & Verify Default Status
    console.log("🔄 Host creating a parking listing...");
    const createRes = await axios.post(`${BASE_URL}/parking`, {
      title: "Pipeline Verification Spot",
      address: "IIT Bombay, Powai, Mumbai, Maharashtra",
      latitude: 19.1334,
      longitude: 72.9135,
      pricePerHour: 100,
      vehicleType: "car",
      slots: 5,
      startTime: "00:00",
      endTime: "23:59",
      images: [{ url: "https://example.com/spot.jpg", public_id: "pipeline_spot" }]
    }, { headers: hostHeaders });

    const parkingId = createRes.data._id;
    console.log("\n====================================================");
    console.log("VERIFYING CREATED VALUES (STEP 1 & 2):");
    console.log(`- Saved Successfully: ${!!parkingId}`);
    console.log(`- hostId attached: ${createRes.data.hostId === hostUser._id.toString()}`);
    console.log(`- coordinates: ${JSON.stringify(createRes.data.location?.coordinates)}`);
    console.log(`- images: ${JSON.stringify(createRes.data.images)}`);
    console.log(`- isApproved: ${createRes.data.isApproved} (Expected: false)`);
    console.log(`- verificationStatus: "${createRes.data.verificationStatus}" (Expected: "pending")`);
    console.log(`- isActive: ${createRes.data.isActive} (Expected: false)`);
    console.log("====================================================\n");

    if (createRes.data.isApproved !== false || createRes.data.verificationStatus !== "pending" || createRes.data.isActive !== false) {
      throw new Error("Default statuses are incorrect on listing creation!");
    }
    console.log("✅ Created values verified successfully!\n");

    // 3. STEP 3: Audit Admin Queue
    console.log("🔍 Admin checking Pending Listings queue...");
    const adminQueueRes = await axios.get(`${BASE_URL}/admin/listings`, { headers: adminHeaders });
    const pendingInQueue = adminQueueRes.data.pending.find(p => p._id === parkingId);
    
    if (!pendingInQueue) {
      throw new Error("Created listing does not appear in Admin pending list!");
    }
    console.log("✅ Listing found in Admin moderation queue.");
    console.log(`- Spot: "${pendingInQueue.title}" | Status: "${pendingInQueue.verificationStatus}" | isApproved: ${pendingInQueue.isApproved}\n`);

    // Verify search endpoint does not return it while unapproved
    console.log("🔍 Verifying unapproved listing is NOT visible in search...");
    const searchUnapproved = await axios.get(`${BASE_URL}/parking/search?query=Pipeline`);
    const foundUnapproved = searchUnapproved.data.some(p => p._id === parkingId);
    if (foundUnapproved) {
      throw new Error("Unapproved listing is visible in search!");
    }
    console.log("✅ Verified: Unapproved listing is invisible to search.\n");

    // 4. STEP 4: Audit Approval Action
    console.log("🔄 Admin approving listing...");
    const approveRes = await axios.patch(`${BASE_URL}/admin/parking/${parkingId}/approve`, {}, { headers: adminHeaders });
    
    console.log("\n====================================================");
    console.log("VERIFYING APPROVED VALUES (STEP 4):");
    console.log(`- isApproved: ${approveRes.data.parking.isApproved} (Expected: true)`);
    console.log(`- verificationStatus: "${approveRes.data.parking.verificationStatus}" (Expected: "approved")`);
    console.log(`- isActive: ${approveRes.data.parking.isActive} (Expected: true)`);
    console.log("====================================================\n");

    if (approveRes.data.parking.isApproved !== true || approveRes.data.parking.verificationStatus !== "approved" || approveRes.data.parking.isActive !== true) {
      throw new Error("Approval action did not update states correctly!");
    }
    console.log("✅ Approved states verified successfully!\n");

    // 5. STEP 5: Audit Search Visibility
    console.log("🔍 Verifying approved listing is immediately visible in search...");
    const searchApproved = await axios.get(`${BASE_URL}/parking/search?query=Pipeline`);
    const foundApproved = searchApproved.data.find(p => p._id === parkingId);
    if (!foundApproved) {
      throw new Error("Newly approved listing is not visible in search!");
    }
    console.log("✅ Verified: Listing is visible in search.");
    console.log(`- Spot: "${foundApproved.title}" | isApproved: ${foundApproved.isApproved} | isActive: ${foundApproved.isActive}\n`);

    console.log("🔍 Verifying approved listing is visible in nearby map query...");
    const nearbyRes = await axios.get(`${BASE_URL}/parking/search/nearby?lat=19.1334&lng=72.9135`);
    const foundNearby = nearbyRes.data.find(p => p._id === parkingId);
    if (!foundNearby) {
      throw new Error("Newly approved listing is not visible in nearby map query!");
    }
    console.log("✅ Verified: Listing is visible on map.\n");

    // 6. Test Bookability
    console.log("🔄 Simulating driver booking the newly approved listing...");
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 1);
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 3);

    const bookingRes = await axios.post(`${BASE_URL}/bookings`, {
      parkingId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    }, { headers: driverHeaders });

    const bookingId = bookingRes.data._id;
    console.log(`✅ Booking created successfully (Booking ID: ${bookingId}). Status: "${bookingRes.data.status}"\n`);

    // Clean up
    console.log("🧹 Cleaning up database...");
    await Booking.deleteOne({ _id: bookingId });
    await Parking.deleteOne({ _id: parkingId });
    await User.deleteMany({ email: { $in: [testEmail, driverEmail] } });
    console.log("✅ Cleanup complete.\n");

    console.log("🎉 ALL STEPS PASSED SUCCESSFULLY! The Listing Approval Pipeline is fully operational. ✅");
  } catch (err) {
    console.error("\n❌ PIPELINE INTEGRATION TEST FAILED:", err.response?.data || err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected.");
  }
}

runTestFlow();
