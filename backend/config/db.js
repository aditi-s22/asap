const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected ✅");
  } catch (error) {
    console.error("MongoDB connection failed ❌ (Falling back to simulated data)");
    console.error("Detailed Error:", error.message);
    // process.exit(1); // REMOVED so app doesn't crash for UI development
  }
};

module.exports = connectDB;