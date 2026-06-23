// One-off migration: backfills a placeholder image + description onto any
// pre-existing Parking documents that predate the mandatory-photo requirement.
// Run with: node backend/scripts/backfillListingImages.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("../config/db");
const Parking = require("../models/Parking");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const PLACEHOLDER_IMAGE = {
  url: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80",
  public_id: "placeholder_backfill"
};

const PLACEHOLDER_DESCRIPTION = "Description not provided by host yet.";

const run = async () => {
  await connectDB();

  const listingsMissingImages = await Parking.find({
    $or: [{ images: { $size: 0 } }, { images: { $exists: false } }]
  });

  let updatedImages = 0;
  for (const listing of listingsMissingImages) {
    listing.images = [PLACEHOLDER_IMAGE];
    await listing.save({ validateBeforeSave: true });
    updatedImages++;
  }

  const result = await Parking.updateMany(
    { $or: [{ description: { $exists: false } }, { description: null }, { description: "" }] },
    { $set: { description: PLACEHOLDER_DESCRIPTION } }
  );

  console.log(`[Backfill] Added placeholder image to ${updatedImages} listing(s).`);
  console.log(`[Backfill] Added placeholder description to ${result.modifiedCount} listing(s).`);

  await mongoose.connection.close();
};

run().catch((err) => {
  console.error("[Backfill] Failed:", err);
  process.exit(1);
});
