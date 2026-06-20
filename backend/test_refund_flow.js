const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

const BASE_URL = "http://localhost:5000/api";

async function runTests() {
  console.log("🚀 Starting ASAP Parking Ticket Dispute & Refund Flow E2E Verification Test...\n");

  try {
    const timestamp = Date.now();
    const hostEmail = `host_refund_${timestamp}@asap.io`;
    const hostPhone = `+91 ${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    // 1. Sign up Host
    console.log(`🔄 [Auth] Registering host: ${hostEmail}...`);
    const hostRegisterRes = await axios.post(`${BASE_URL}/auth/firebase-session`, {
      idToken: `MOCK_GOOGLE_ID_TOKEN:${hostEmail}:mock_uid_host_${timestamp}:Host Refund ${timestamp}`,
      name: `Host Refund ${timestamp}`,
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
        title: `Refund Spot ${timestamp}`,
        address: "Powai, Mumbai, Maharashtra 400076",
        latitude: 19.1176,
        longitude: 72.9060,
        pricePerHour: 150,
        vehicleType: "car",
        slots: 2,
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

    console.log("📅 [Booking] Creating booking...");
    const startTime = new Date(Date.now() + 1000 * 60 * 5); 
    const endTime = new Date(Date.now() + 1000 * 60 * 65);  
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

    // 5. Pay for Booking
    console.log("💳 [Payment] Verifying Payment...");
    const orderRes = await axios.post(`${BASE_URL}/payment/create-order`, { bookingId }, { headers: driverHeaders });
    const orderId = orderRes.data.id;
    
    const payId = `pay_refund_${timestamp}`;
    let signature = "mock_refund_sig";
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

    // 6. Driver Reports Issue
    console.log("👤 [Driver] Reporting dispute issue: 'Parking Full'...");
    const ticketRes = await axios.post(
      `${BASE_URL}/users/tickets`,
      {
        bookingId,
        category: "Parking Full",
        description: "The spot is completely blocked by garbage construction trucks. Unable to park."
      },
      { headers: driverHeaders }
    );
    
    const ticketId = ticketRes.data._id;
    console.log(`✅ [Driver] Issue ticket created: ${ticketId}. Category: ${ticketRes.data.category}`);
    if (ticketRes.data.status !== "open") {
      throw new Error("Ticket status should be 'open' initially");
    }

    // Verify Booking is now refund_pending
    console.log("🔍 [Verification] Checking booking state after dispute reporting...");
    const driverBookingsRes = await axios.get(`${BASE_URL}/bookings/user/${driverLoginRes.data.user._id}`, { headers: driverHeaders });
    const updatedBooking = driverBookingsRes.data.find(b => b._id === bookingId);
    console.log(`   Booking Status: ${updatedBooking.status}`);
    console.log(`   Refund Reason: ${updatedBooking.refundReason}`);
    if (updatedBooking.status !== "refund_pending") {
      throw new Error("Booking status should transition to 'refund_pending'");
    }

    // 7. Admin Resolves Dispute
    console.log("👑 [Admin] Checking pending disputes queue...");
    const adminDisputesRes = await axios.get(`${BASE_URL}/admin/disputes`, { headers: adminHeaders });
    const refundPayment = adminDisputesRes.data.refundRequests.find(r => r.bookingId?._id === bookingId);
    if (!refundPayment) {
      throw new Error("Disputed booking payment not found in admin disputes list");
    }
    console.log(`✅ [Admin] Found disputed payment record: ${refundPayment._id}. Amount: ₹${refundPayment.amount}`);

    console.log("👑 [Admin] Approving refund request...");
    const resolveRes = await axios.patch(
      `${BASE_URL}/admin/payments/${refundPayment._id}/refund`,
      { action: "approve", adminNotes: "Verified construction block via coordinates check. Approved." },
      { headers: adminHeaders }
    );
    console.log(`✅ [Admin] Refund resolved successfully: ${resolveRes.data.message}`);

    // 8. Final verification
    console.log("🔍 [Verification] Inspecting final booking and ticket states...");
    const finalBookingsRes = await axios.get(`${BASE_URL}/bookings/user/${driverLoginRes.data.user._id}`, { headers: driverHeaders });
    const finalBooking = finalBookingsRes.data.find(b => b._id === bookingId);
    console.log(`   Final Booking Status: ${finalBooking.status}`);
    console.log(`   Admin notes: ${finalBooking.refundAdminNotes}`);
    if (finalBooking.status !== "refunded") {
      throw new Error("Booking status should be 'refunded' after admin approval");
    }

    // Verify ticket is closed
    const adminTicketsRes = await axios.get(`${BASE_URL}/admin/tickets`, { headers: adminHeaders });
    const resolvedTicket = adminTicketsRes.data.find(t => t._id === ticketId);
    console.log(`   Final Ticket Status: ${resolvedTicket.status}`);
    console.log(`   Ticket Admin Notes: ${resolvedTicket.adminNotes}`);
    if (resolvedTicket.status !== "resolved") {
      throw new Error("Associated issue ticket should be set to 'resolved'");
    }

    console.log("\n🎉 Dispute Ticket & Refund Flow E2E verification test PASSED successfully! 🚀");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ E2E Refund Flow Test failed:");
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
