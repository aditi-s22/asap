const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

const BASE_URL = "http://localhost:5000/api";

async function runTests() {
  console.log("🚀 Starting ASAP Parking Notification System E2E Verification Test...\n");

  try {
    const timestamp = Date.now();
    const hostEmail = `host_notify_${timestamp}@asap.io`;
    const hostPhone = `+91 ${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    // 1. Sign up Host
    console.log(`🔄 [Auth] Registering host: ${hostEmail}...`);
    const hostRegisterRes = await axios.post(`${BASE_URL}/auth/firebase-session`, {
      idToken: `MOCK_GOOGLE_ID_TOKEN:${hostEmail}:mock_uid_host_${timestamp}:Host Notify ${timestamp}`,
      name: `Host Notify ${timestamp}`,
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

    // Verify host notification received
    console.log("🔍 [Notification] Verifying Host received verification notification...");
    const hostNotificationsRes = await axios.get(`${BASE_URL}/users/notifications`, { headers: hostHeaders });
    const hostApprovalNotif = hostNotificationsRes.data.find(n => n.type === "host_alert");
    console.log(`   Host notification: "${hostApprovalNotif.title}" - "${hostApprovalNotif.message}"`);
    if (!hostApprovalNotif) {
      throw new Error("Host approval notification not generated");
    }

    // 3. Create Parking Space
    console.log("🔄 [Listing] Host creating a parking space...");
    const parkingRes = await axios.post(
      `${BASE_URL}/parking`,
      {
        title: `Notify Spot ${timestamp}`,
        address: "Chembur, Mumbai, Maharashtra 400071",
        latitude: 19.0622,
        longitude: 72.8974,
        pricePerHour: 80,
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
    
    const payId = `pay_notify_${timestamp}`;
    let signature = "mock_notify_sig";
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

    // Verify driver notifications
    console.log("🔍 [Notification] Verifying Driver received transaction notifications...");
    const driverNotificationsRes = await axios.get(`${BASE_URL}/users/notifications`, { headers: driverHeaders });
    
    // There should be a payment/booking confirmed notification
    console.log(`   Driver notifications count: ${driverNotificationsRes.data.length}`);
    const unreadCountBefore = driverNotificationsRes.data.filter(n => !n.isRead).length;
    console.log(`   Unread notifications: ${unreadCountBefore}`);

    if (driverNotificationsRes.data.length === 0) {
      throw new Error("No notifications found for driver");
    }

    const firstNotif = driverNotificationsRes.data[0];

    // 6. Test Mark Notification as Read
    console.log(`🔄 [Notification] Marking notification ID ${firstNotif._id} as read...`);
    const readRes = await axios.patch(`${BASE_URL}/users/notifications/${firstNotif._id}/read`, {}, { headers: driverHeaders });
    console.log(`✅ [Notification] Marked read! isRead: ${readRes.data.isRead}`);
    if (!readRes.data.isRead) {
      throw new Error("Notification isRead flag was not set to true");
    }

    // 7. Test Mark All Notifications as Read
    console.log("🔄 [Notification] Marking all notifications read...");
    const markAllRes = await axios.patch(`${BASE_URL}/users/notifications/read-all`, {}, { headers: driverHeaders });
    console.log(`✅ [Notification] Mark all read success: ${markAllRes.data.message}`);

    const driverNotificationsResAfter = await axios.get(`${BASE_URL}/users/notifications`, { headers: driverHeaders });
    const unreadCountAfter = driverNotificationsResAfter.data.filter(n => !n.isRead).length;
    console.log(`   Unread notifications after mark all read: ${unreadCountAfter}`);
    if (unreadCountAfter !== 0) {
      throw new Error("Some notifications were left unread after mark all read execution");
    }

    console.log("\n🎉 Notification Center E2E verification test PASSED successfully! 🚀");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ E2E Notification Center Test failed:");
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
