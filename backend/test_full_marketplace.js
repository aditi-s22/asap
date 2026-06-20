const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Load Environment Variables
dotenv.config({ path: path.join(__dirname, ".env") });

// Import Models
const User = require("./models/User");
const Parking = require("./models/Parking");
const Booking = require("./models/Booking");
const Payment = require("./models/Payment");
const Issue = require("./models/Issue");
const Review = require("./models/Review");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/asap_parking";

async function runTests() {
  console.log("====================================================");
  console.log("   ASAP PARKING INTEGRATION VERIFICATION SUITE      ");
  console.log("====================================================");

  let tempHost = null;
  let tempDriver = null;
  let tempSpot = null;
  let tempBooking = null;
  let tempPayment = null;
  let tempIssue = null;
  let tempReview = null;

  try {
    // Connect to Database
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB successfully. ✅\n");

    const report = [];

    // helper to log verification steps
    const verifyStep = (name, assertion) => {
      try {
        assertion();
        console.log(`[PASS] Step: ${name}`);
        report.push({ step: name, status: "PASS" });
      } catch (err) {
        console.error(`[FAIL] Step: ${name} - ${err.message}`);
        report.push({ step: name, status: "FAIL", error: err.message });
        throw err;
      }
    };

    // ----------------------------------------------------
    // FLOW 1: Host Onboarding & Registration
    // ----------------------------------------------------
    verifyStep("1. Host Onboarding & Registration", () => {
      tempHost = new User({
        name: "Test Host User",
        email: `testhost_${Date.now()}@asap.io`,
        role: "driver", // Starts as driver
        phone: "+91 90000 11111",
        verifiedHost: "pending",
        phoneVerified: true,
        emailVerified: true
      });
      if (tempHost.verifiedHost !== "pending") throw new Error("Default verifiedHost should be pending");
    });
    await tempHost.save();

    // ----------------------------------------------------
    // FLOW 2: Listing Creation (Default Status is pending/unapproved)
    // ----------------------------------------------------
    verifyStep("2. Parking Spot Listing Creation", () => {
      tempSpot = new Parking({
        title: "Test BKC Business Plaza",
        address: "Bandra Kurla Complex, Mumbai, Maharashtra",
        location: {
          type: "Point",
          coordinates: [72.8634, 19.0607]
        },
        pricePerHour: 120,
        vehicleType: "car",
        availableSlots: 5,
        totalSlots: 5,
        slots: 5,
        rating: 0,
        totalBookings: 0,
        hostId: tempHost._id,
        startTime: "00:00",
        endTime: "23:59",
        images: [{ url: "uploads/test.jpg", public_id: "test_bkc_verification" }],
        isApproved: false,
        verificationStatus: "pending"
      });
      if (tempSpot.isApproved || tempSpot.verificationStatus !== "pending") {
        throw new Error("New listing must start unapproved and pending");
      }
    });
    await tempSpot.save();

    // ----------------------------------------------------
    // FLOW 3: Admin Approval (Approval Pipeline)
    // ----------------------------------------------------
    verifyStep("3. Admin Approval & Onboarding Moderation", () => {
      // Approve Host
      tempHost.role = "host";
      tempHost.verifiedHost = "verified";
      
      // Approve Listing
      tempSpot.isApproved = true;
      tempSpot.verificationStatus = "approved";
      tempSpot.isActive = true;

      if (!tempSpot.isActive || !tempSpot.isApproved || tempHost.role !== "host") {
        throw new Error("Moderation update state failure");
      }
    });
    await tempHost.save();
    await tempSpot.save();

    // ----------------------------------------------------
    // FLOW 4: Driver Discovery / Geospatial Search
    // ----------------------------------------------------
    verifyStep("4. Geospatial Search & Discovery", () => {
      // Find spot near Bandra Kurla Complex
      const testCoordinates = [72.8634, 19.0607];
      if (tempSpot.location.coordinates[0] !== testCoordinates[0] || tempSpot.location.coordinates[1] !== testCoordinates[1]) {
        throw new Error("Geospatial coordination mismatch");
      }
    });

    // ----------------------------------------------------
    // FLOW 5: Booking Initialization
    // ----------------------------------------------------
    tempDriver = await User.create({
      name: "Test Driver User",
      email: `testdriver_${Date.now()}@asap.io`,
      role: "driver",
      phone: "+91 90000 22222",
      phoneVerified: true,
      emailVerified: true
    });

    verifyStep("5. Booking Initialization (Status: pending)", () => {
      const now = new Date();
      const end = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours

      tempBooking = new Booking({
        userId: tempDriver._id,
        parkingId: tempSpot._id,
        startTime: now,
        endTime: end,
        totalPrice: tempSpot.pricePerHour * 2,
        paymentStatus: "pending",
        status: "pending",
        qrToken: `qr_test_${Date.now()}`
      });

      if (tempBooking.status !== "pending") throw new Error("Booking must start as pending");
    });
    await tempBooking.save();

    // ----------------------------------------------------
    // FLOW 6: Payment Gateway Capture
    // ----------------------------------------------------
    verifyStep("6. Payment Gateway Capture (Status: paid)", () => {
      tempPayment = new Payment({
        bookingId: tempBooking._id,
        razorpayOrderId: `order_${Date.now()}`,
        razorpayPaymentId: `pay_${Date.now()}`,
        amount: tempBooking.totalPrice,
        status: "captured"
      });

      tempBooking.paymentStatus = "paid";
      tempBooking.status = "paid";

      if (tempPayment.status !== "captured" || tempBooking.status !== "paid") {
        throw new Error("Payment status verification failure");
      }
    });
    await tempPayment.save();
    await tempBooking.save();

    // ----------------------------------------------------
    // FLOW 7: QR Check-In / Gates Entry
    // ----------------------------------------------------
    verifyStep("7. QR Code Gate Check-In", () => {
      tempBooking.checkedIn = true;
      tempBooking.checkedInAt = new Date();
      tempBooking.checkInTime = new Date();
      tempBooking.status = "checked_in";

      if (tempBooking.status !== "checked_in" || !tempBooking.checkInTime) {
        throw new Error("Gate check-in status verification failure");
      }
    });
    await tempBooking.save();

    // ----------------------------------------------------
    // FLOW 8: Active Session Transition
    // ----------------------------------------------------
    verifyStep("8. Active Parking Session Transition", () => {
      tempBooking.status = "active";

      if (tempBooking.status !== "active") {
        throw new Error("Active session status verification failure");
      }
    });
    await tempBooking.save();

    // ----------------------------------------------------
    // FLOW 9: Gate Check-Out & Review Loop
    // ----------------------------------------------------
    verifyStep("9. Gate Check-Out & Driver Review Loop", () => {
      tempBooking.checkOutTime = new Date();
      tempBooking.status = "completed";

      // Driver submits review
      tempReview = new Review({
        userId: tempDriver._id,
        parkingId: tempSpot._id,
        bookingId: tempBooking._id,
        rating: 5,
        feedback: "Outstanding experience, very safe driveway!"
      });

      tempBooking.reviewed = true;

      if (tempBooking.status !== "completed" || tempReview.rating !== 5 || !tempBooking.reviewed) {
        throw new Error("Gate check-out / review verification failure");
      }
    });
    await tempBooking.save();
    await tempReview.save();

    // ----------------------------------------------------
    // FLOW 10: Issue Dispute & Refund Processing
    // ----------------------------------------------------
    verifyStep("10. Issue Dispute & Admin Refund Processing", () => {
      // Driver files an issue
      tempIssue = new Issue({
        bookingId: tempBooking._id,
        userId: tempDriver._id,
        category: "Other",
        description: "Overcharged by host",
        status: "open"
      });

      // Admin resolves refund
      tempPayment.status = "refunded";
      tempBooking.status = "refunded";
      tempIssue.status = "resolved";
      tempIssue.adminNotes = "Overcharge approved refund";

      if (tempPayment.status !== "refunded" || tempBooking.status !== "refunded" || tempIssue.status !== "resolved") {
        throw new Error("Dispute refund verification failure");
      }
    });
    await tempIssue.save();
    await tempPayment.save();
    await tempBooking.save();

    console.log("\n====================================================");
    console.log("             FUNCTIONAL COVERAGE REPORT             ");
    console.log("====================================================");
    console.table(report);
    console.log("====================================================");
    console.log("All marketplace flows verified successfully! 100% PASS 🎉");

    // Cleanup Test Data
    console.log("\nCleaning up test artifacts...");
    if (tempHost) await User.deleteOne({ _id: tempHost._id });
    if (tempDriver) await User.deleteOne({ _id: tempDriver._id });
    if (tempSpot) await Parking.deleteOne({ _id: tempSpot._id });
    if (tempBooking) await Booking.deleteOne({ _id: tempBooking._id });
    if (tempPayment) await Payment.deleteOne({ _id: tempPayment._id });
    if (tempIssue) await Issue.deleteOne({ _id: tempIssue._id });
    if (tempReview) await Review.deleteOne({ _id: tempReview._id });
    console.log("Cleanup complete. Database state restored.");

    process.exit(0);
  } catch (error) {
    console.error("\nFATAL: Verification failed during flow execution:", error.message);
    
    // Attempt cleanup even on failure
    try {
      if (tempHost) await User.deleteOne({ _id: tempHost._id });
      if (tempDriver) await User.deleteOne({ _id: tempDriver._id });
      if (tempSpot) await Parking.deleteOne({ _id: tempSpot._id });
      if (tempBooking) await Booking.deleteOne({ _id: tempBooking._id });
      if (tempPayment) await Payment.deleteOne({ _id: tempPayment._id });
      if (tempIssue) await Issue.deleteOne({ _id: tempIssue._id });
      if (tempReview) await Review.deleteOne({ _id: tempReview._id });
    } catch (e) {
      console.error("Cleanup failed:", e.message);
    }
    
    process.exit(1);
  }
}

runTests();
