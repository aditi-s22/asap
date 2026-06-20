const axios = require("axios");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const crypto = require("crypto");

// Load backend .env configuration
dotenv.config({ path: path.join(__dirname, ".env") });

const BASE_URL = "http://localhost:5000/api";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  console.log("🚀 Starting ASAP Parking Admin Moderation API Verification Tests...\n");

  try {
    // Connect to database
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected successfully!\n");

    const User = require("./models/User");
    const Parking = require("./models/Parking");
    const Payment = require("./models/Payment");
    const Booking = require("./models/Booking");

    // Clear previous temp users if any
    const tempEmail = "temp_host_test@asap.io";
    await User.deleteOne({ email: tempEmail });

    // Create temp user directly in DB
    console.log(`👤 Creating test user: ${tempEmail} directly in database...`);
    const tempUser = await User.create({
      name: "Temp Host Applicant",
      email: tempEmail,
      role: "user",
      phone: "+91 99999 11111",
      verifiedHost: "none",
      phoneVerified: true,
      emailVerified: true
    });
    console.log("✅ Test user created.\n");

    // 1. Authenticate Admin
    console.log("🔄 Logging in as Admin...");
    const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: "admin@asap.io",
      password: "123456"
    });
    const adminToken = adminLoginRes.data.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    console.log("✅ Admin login successful!\n");

    // 2. Authenticate Driver
    console.log("🔄 Logging in as Driver...");
    const driverLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: "driver@asap.io",
      password: "123456"
    });
    const driverToken = driverLoginRes.data.token;
    const driverHeaders = { Authorization: `Bearer ${driverToken}` };
    console.log("✅ Driver login successful!\n");

    // 3. Login as the newly created applicant to submit application
    console.log(`🔄 Logging in as Applicant: ${tempEmail}...`);
    const tempLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: tempEmail,
      password: "123456" // dev login bypasses password
    });
    const tempToken = tempLoginRes.data.token;
    const tempHeaders = { Authorization: `Bearer ${tempToken}` };
    console.log("✅ Applicant login successful!\n");

    // 4. Test Host Onboarding Moderation
    console.log("🔄 Submitting Host Application...");
    await axios.post(`${BASE_URL}/users/host-application`, {
      govIdImage: "https://example.com/id.jpg",
      addressProofImage: "https://example.com/proof.jpg",
      phone: "+91 99999 11111"
    }, { headers: tempHeaders });
    console.log("✅ Host application submitted successfully.");

    // Retrieve pending hosts as Admin
    console.log("🔍 Admin checking pending host requests...");
    const pendingHostsRes = await axios.get(`${BASE_URL}/admin/hosts/pending`, { headers: adminHeaders });
    const targetHost = pendingHostsRes.data.find(h => h.email === tempEmail);
    if (!targetHost) {
      throw new Error("Submitted host application not found in Admin queue");
    }
    console.log(`✅ Found pending host application: ${targetHost.name} (${targetHost.email})`);

    // Verify Host (Approve)
    console.log("🔄 Admin approving host application...");
    const approveHostRes = await axios.patch(`${BASE_URL}/admin/hosts/${targetHost._id}/verify`, {
      status: "verified"
    }, { headers: adminHeaders });
    
    if (approveHostRes.data.host.verifiedHost === "verified" && approveHostRes.data.host.role === "host") {
      console.log("✅ Host approved successfully and upgraded to host role!");
    } else {
      throw new Error("Host approval status update failed");
    }

    // Login as newly approved Host to list a spot
    console.log("\n🔄 Logging in as newly approved Host...");
    const hostLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: tempEmail,
      password: "123456"
    });
    const hostToken = hostLoginRes.data.token;
    const hostHeaders = { Authorization: `Bearer ${hostToken}` };
    console.log("✅ Host login successful!\n");

    // 5. Test Host Listing Moderation
    console.log("🔄 Creating a new parking listing under host account...");
    const listingRes = await axios.post(`${BASE_URL}/parking`, {
      title: "Test Moderation Garage",
      address: "Bandra Kurla Complex, Mumbai",
      latitude: 19.0607,
      longitude: 72.8634,
      pricePerHour: 75,
      vehicleType: "car",
      slots: 4,
      startTime: "09:00",
      endTime: "21:00",
      images: [{ url: "https://example.com/garage.jpg", public_id: "test_garage" }]
    }, { headers: hostHeaders });
    const testParkingId = listingRes.data._id;
    console.log(`✅ Parking listing created (ID: ${testParkingId}). Approved status: ${listingRes.data.isApproved}`);

    // Retrieve pending listings as Admin
    console.log("🔍 Admin checking pending listings...");
    const pendingListingsRes = await axios.get(`${BASE_URL}/admin/listings`, { headers: adminHeaders });
    const isPending = pendingListingsRes.data.pending.some(p => p._id === testParkingId);
    if (!isPending) {
      throw new Error("Listing not found in Admin pending listings queue");
    }
    console.log("✅ New listing correctly queued in pending listings.");

    // Approve Listing
    console.log("🔄 Admin approving parking listing...");
    const approveListingRes = await axios.patch(`${BASE_URL}/admin/parking/${testParkingId}/approve`, {}, { headers: adminHeaders });
    if (approveListingRes.data.parking.isApproved && approveListingRes.data.parking.verificationStatus === "approved") {
      console.log("✅ Parking listing approved successfully!");
    } else {
      throw new Error("Parking listing approval failed");
    }

    // Reject Listing
    console.log("🔄 Admin rejecting parking listing...");
    const rejectListingRes = await axios.patch(`${BASE_URL}/admin/parking/${testParkingId}/reject`, {}, { headers: adminHeaders });
    if (!rejectListingRes.data.parking.isApproved && rejectListingRes.data.parking.verificationStatus === "rejected") {
      console.log("✅ Parking listing rejected successfully!");
    } else {
      throw new Error("Parking listing rejection failed");
    }

    // 6. Test Listing Suspension
    console.log("\n🔄 Admin suspending listing...");
    const suspendRes = await axios.patch(`${BASE_URL}/admin/parking/${testParkingId}/suspend`, {}, { headers: adminHeaders });
    if (!suspendRes.data.parking.isActive) {
      console.log("✅ Listing suspended successfully (isActive set to false)!");
    } else {
      throw new Error("Listing suspension failed");
    }

    console.log("🔄 Admin unsuspending listing...");
    const unsuspendRes = await axios.patch(`${BASE_URL}/admin/parking/${testParkingId}/unsuspend`, {}, { headers: adminHeaders });
    if (unsuspendRes.data.parking.isActive) {
      console.log("✅ Listing suspension lifted successfully (isActive set to true)!");
    } else {
      throw new Error("Listing unsuspension failed");
    }

    // 7. Test Disputes / Refund Workflow
    console.log("\n🔄 Simulating booking and refund request workflow...");
    // Approve it again so we can book it
    await axios.patch(`${BASE_URL}/admin/parking/${testParkingId}/approve`, {}, { headers: adminHeaders });

    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 2);
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 4);

    const bookingRes = await axios.post(`${BASE_URL}/bookings`, {
      parkingId: testParkingId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    }, { headers: driverHeaders });
    const bookingId = bookingRes.data._id;
    console.log(`✅ Booking created (ID: ${bookingId})`);

    // Capture payment (simulation)
    console.log("💳 Creating order and verifying payment...");
    const orderRes = await axios.post(`${BASE_URL}/payment/create-order`, { bookingId }, { headers: driverHeaders });
    
    // Generate signature for verification
    const orderId = orderRes.data.id;
    const paymentId = `pay_sim_${bookingId}`;
    const secret = process.env.RAZORPAY_KEY_SECRET || "dev_only_insecure_refresh_secret";
    const signature = crypto
      .createHmac("sha256", secret)
      .update(orderId + "|" + paymentId)
      .digest("hex");

    await axios.post(`${BASE_URL}/payment/verify`, {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      bookingId
    }, { headers: driverHeaders });
    console.log("✅ Payment captured.");

    // Cancel booking (which triggers refund_pending payment status)
    console.log("🔄 Driver cancelling the booking...");
    await axios.patch(`${BASE_URL}/bookings/${bookingId}/cancel`, {}, { headers: driverHeaders });
    console.log("✅ Booking cancelled.");

    // Admin checks disputes queue
    console.log("🔍 Admin checking disputes queue...");
    const disputesRes = await axios.get(`${BASE_URL}/admin/disputes`, { headers: adminHeaders });
    const refundReq = disputesRes.data.refundRequests.find(r => r.bookingId && r.bookingId._id === bookingId);
    if (!refundReq) {
      throw new Error("Refund request not found in disputes queue");
    }
    console.log(`✅ Found refund request in queue. Payment ID: ${refundReq._id}. Amount: ₹${refundReq.amount}`);

    // Reject refund request first
    console.log("🔄 Admin rejecting refund request...");
    const rejectRefundRes = await axios.patch(`${BASE_URL}/admin/payments/${refundReq._id}/refund`, {
      action: "reject"
    }, { headers: adminHeaders });
    if (rejectRefundRes.data.payment.status === "captured") {
      console.log("✅ Refund rejected. Payment status set back to captured.");
    } else {
      throw new Error("Refund rejection failed");
    }

    // Set back to refund_pending to test approval
    await Payment.updateOne({ bookingId }, { status: "refund_pending" });
    
    console.log("🔄 Admin approving refund request...");
    const approveRefundRes = await axios.patch(`${BASE_URL}/admin/payments/${refundReq._id}/refund`, {
      action: "approve"
    }, { headers: adminHeaders });
    if (approveRefundRes.data.payment.status === "refunded") {
      console.log("✅ Refund approved. Payment status updated to refunded!");
    } else {
      throw new Error("Refund approval failed");
    }

    // 8. Test Platform Activities
    console.log("\n🔍 Admin checking Platform Activity Feed...");
    const activitiesRes = await axios.get(`${BASE_URL}/admin/activities`, { headers: adminHeaders });
    if (Array.isArray(activitiesRes.data) && activitiesRes.data.length > 0) {
      console.log(`✅ Feed retrieved! Latest activity: "${activitiesRes.data[0].message}" at ${activitiesRes.data[0].timestamp}`);
    } else {
      throw new Error("Failed to retrieve activity feed");
    }

    // Cleanup temp data
    console.log("\n🧹 Cleaning up test listings and users...");
    await Parking.deleteOne({ _id: testParkingId });
    await User.deleteOne({ email: tempEmail });
    await Booking.deleteOne({ _id: bookingId });
    await Payment.deleteOne({ bookingId });
    console.log("✅ Cleanup complete.");

    console.log("\n🎉 ALL ADMIN MODERATION WORKFLOW TESTS PASSED SUCCESSFULLY! ✅");
  } catch (error) {
    console.error("\n❌ TEST SUITE FAILED:", error.response?.data || error.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected.");
    process.exit(0);
  }
}

runTests();
