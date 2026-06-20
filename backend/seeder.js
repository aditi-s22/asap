const mongoose = require("mongoose");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const User = require("./models/User");
const Parking = require("./models/Parking");
const Testimonial = require("./models/Testimonial");
const Booking = require("./models/Booking");
const Review = require("./models/Review");

dotenv.config();
connectDB();

const SEED_PASSWORD = "123456";

// Every URL below was visually inspected (not just HTTP-checked) to confirm it
// actually shows parking infrastructure — garages, lots, driveways, EV charging.
const UNSPLASH_IMAGES = [
    "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1758448721161-7b3df5ec04b3?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1709890115362-45140c092145?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1573599852326-2d4da0bbe613?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1543465077-db45d34b88a5?auto=format&fit=crop&w=600&q=80"
];

const getOrCreateFirebaseUser = async (email, password, displayName) => {
    const { auth: firebaseAuth, hasFirebaseConfig } = require("./config/firebaseAdmin");
    if (!hasFirebaseConfig) {
        console.warn(`[Seeder] Firebase not configured — skipping Firebase user creation for ${email}.`);
        return null;
    }
    try {
        const existing = await firebaseAuth.getUserByEmail(email);
        return existing.uid;
    } catch (err) {
        if (err.code !== "auth/user-not-found") throw err;
    }
    try {
        const created = await firebaseAuth.createUser({ email, password, displayName, emailVerified: true });
        return created.uid;
    } catch (createErr) {
        console.error(`[Seeder] Failed to create Firebase user: ${createErr.message}`);
        return null;
    }
};

const getOrCreateUser = async (email, name, role, phone, firebaseUid) => {
    let user = await User.findOne({ email });
    if (user) {
        console.log(`[Seeder] User with email ${email} already exists.`);
        if (firebaseUid && !user.firebaseUid) {
            user.firebaseUid = firebaseUid;
            await user.save();
        }
        return user;
    }
    user = await User.create({
        name,
        email,
        firebaseUid: firebaseUid || undefined,
        role,
        phone,
        verifiedHost: role === "host" ? "verified" : "none",
        phoneVerified: true,
        emailVerified: true
    });
    console.log(`[Seeder] Created user: ${email}`);
    return user;
};

// Hub coordinates [longitude, latitude]
const HUBS = {
    RCITY: { name: "R City Mall, Ghatkopar", coords: [72.9264, 19.0863] },
    GHATKOPAR_STN: { name: "Ghatkopar Station", coords: [72.9081, 19.0864] },
    PHOENIX_KURLA: { name: "Phoenix Marketcity Kurla", coords: [72.8890, 19.0886] },
    POWAI: { name: "Powai Hiranandani", coords: [72.9060, 19.1176] },
    IIT_BOMBAY: { name: "IIT Bombay", coords: [72.9135, 19.1334] },
    BKC: { name: "Bandra Kurla Complex", coords: [72.8634, 19.0607] },
    BANDRA_WEST: { name: "Bandra West", coords: [72.8295, 19.0596] },
    ANDHERI_EAST: { name: "Andheri East", coords: [72.8697, 19.1136] },
    ANDHERI_WEST: { name: "Andheri West", coords: [72.8360, 19.1363] },
    AIRPORT_T1: { name: "Airport T1", coords: [72.8517, 19.0988] },
    AIRPORT_T2: { name: "Airport T2", coords: [72.8656, 19.0896] },
    SAKINAKA: { name: "Saki Naka", coords: [72.8885, 19.0962] },
    KURLA: { name: "Kurla", coords: [72.8826, 19.0704] },
    THANE: { name: "Viviana Mall Thane", coords: [72.9781, 19.2183] },
    WAGLE_ESTATE: { name: "Wagle Estate Thane", coords: [72.9575, 19.1966] }
};

const generateMumbaiParkings = (hostId) => {
    const list = [];
    const keys = Object.keys(HUBS);

    // Generate spots around each of the hubs
    keys.forEach((key, hubIdx) => {
        const hub = HUBS[key];
        const baseLng = hub.coords[0];
        const baseLat = hub.coords[1];

        const spotNames = [
            `Premium ${hub.name} Spot A`,
            `Secure ${hub.name} Garage B`,
            `Driveway near ${hub.name} C`,
            `ASAP Parking Hub at ${hub.name} D`
        ];

        const addresses = [
            `LBS Marg, near ${hub.name}, Mumbai, Maharashtra`,
            `Off Link Road, next to ${hub.name}, Mumbai, Maharashtra`,
            `Main Gate Street, opposite ${hub.name}, Mumbai, Maharashtra`,
            `Utility Lane, adjacent to ${hub.name}, Mumbai, Maharashtra`
        ];

        const priceBase = 40 + (hubIdx * 10) % 80; // pricing from 40 to 120 Rs/hr

        for (let i = 0; i < 4; i++) {
            // Offset coordinates slightly so they are distinct but within 500 meters of the hub
            const lngOffset = (i === 0 ? 0.0015 : i === 1 ? -0.0018 : i === 2 ? 0.0022 : -0.0025);
            const latOffset = (i === 0 ? -0.0012 : i === 1 ? 0.0016 : i === 2 ? -0.0020 : 0.0024);

            const lng = parseFloat((baseLng + lngOffset).toFixed(6));
            const lat = parseFloat((baseLat + latOffset).toFixed(6));

            const imgUrl = UNSPLASH_IMAGES[(hubIdx * 4 + i) % UNSPLASH_IMAGES.length];

            list.push({
                title: spotNames[i],
                address: addresses[i],
                location: {
                    type: "Point",
                    coordinates: [lng, lat]
                },
                pricePerHour: priceBase + (i * 15),
                vehicleType: i % 3 === 0 ? "bike" : "car",
                availableSlots: i === 3 ? 0 : 3 + i, // create one full spot (0 slots left)
                totalSlots: 5 + i,
                slots: 5 + i,
                rating: parseFloat((4.0 + (i * 0.3)).toFixed(1)),
                totalBookings: 10 + (i * 24),
                discountPercentage: i % 2 === 0 ? 10 : 0,
                hostId,
                startTime: "00:00",
                endTime: "23:59",
                images: [
                    {
                        url: imgUrl,
                        public_id: `seed_mumbai_${key.toLowerCase()}_${i}`
                    }
                ],
                isApproved: true,
                verificationStatus: "approved",
                isActive: true
            });
        }
    });

    return list;
};

const importData = async () => {
    try {
        console.log("🚀 Starting database seeding in SAFE non-destructive mode...");

        const hostFirebaseUid = await getOrCreateFirebaseUser("host@asap.io", SEED_PASSWORD, "Aditi Host");
        const driverFirebaseUid = await getOrCreateFirebaseUser("driver@asap.io", SEED_PASSWORD, "Rahul Driver");
        const adminFirebaseUid = await getOrCreateFirebaseUser("admin@asap.io", SEED_PASSWORD, "ASAP Admin");

        // Safe fetch or create of users
        const hostUser = await getOrCreateUser("host@asap.io", "Aditi Host", "host", "+91 99999 88888", hostFirebaseUid);
        const driverUser = await getOrCreateUser("driver@asap.io", "Rahul Driver", "driver", "+91 99999 77777", driverFirebaseUid);
        await getOrCreateUser("admin@asap.io", "ASAP Admin", "admin", "+91 99999 66666", adminFirebaseUid);

        // Fetch existing testimonials count
        const existingTestimonials = await Testimonial.countDocuments();
        if (existingTestimonials === 0) {
            await Testimonial.insertMany([
                {
                    name: "Rohan Sharma",
                    role: "Frequent Driver",
                    rating: 5,
                    comment: "ASAP Parking completely resolved the chaos of CP parking in Delhi. Finding a spot near Blumen street was extremely seamless!",
                    avatar: "https://randomuser.me/api/portraits/men/32.jpg"
                },
                {
                    name: "Priya Patel",
                    role: "Daily Commuter",
                    rating: 4,
                    comment: "I save a lot of time by pre-booking my spot near Indiranagar. Extremely easy user experience.",
                    avatar: "https://randomuser.me/api/portraits/women/44.jpg"
                },
                {
                    name: "Aditi Singh",
                    role: "Verified Host",
                    rating: 5,
                    comment: "I started hosting my driveway in Bangalore and make a tidy sum passively every month.",
                    avatar: "https://randomuser.me/api/portraits/women/68.jpg"
                }
            ]);
            console.log("[Seeder] Created default testimonials.");
        }

        // Generate and safely seed Mumbai parkings (BKC, Airport, Powai etc.)
        const mumbaiParkings = generateMumbaiParkings(hostUser._id);
        let newlyAddedCount = 0;
        let duplicateCount = 0;

        for (const spot of mumbaiParkings) {
            // Check if spot already exists by title
            const exists = await Parking.findOne({ title: spot.title });
            if (!exists) {
                await Parking.create(spot);
                newlyAddedCount++;
            } else {
                duplicateCount++;
            }
        }
        console.log(`[Seeder] Seed spots process complete. Newly added spots: ${newlyAddedCount}, Skipped duplicates: ${duplicateCount}`);

        // Seed bookings and reviews
        const bookingCount = await Booking.countDocuments();
        if (bookingCount === 0 && driverUser) {
            const seededSpots = await Parking.find({ hostId: hostUser._id }).limit(5);
            if (seededSpots.length > 0) {
                console.log("[Seeder] Seeding bookings and reviews...");
                for (let idx = 0; idx < seededSpots.length; idx++) {
                    const spot = seededSpots[idx];
                    
                    // Past booking
                    const pastStart = new Date();
                    pastStart.setDate(pastStart.getDate() - (idx + 1) * 2);
                    pastStart.setHours(9 + idx, 0, 0, 0);
                    const pastEnd = new Date(pastStart);
                    pastEnd.setHours(pastStart.getHours() + 2);

                    const pastBooking = await Booking.create({
                        userId: driverUser._id,
                        parkingId: spot._id,
                        startTime: pastStart,
                        endTime: pastEnd,
                        totalPrice: spot.pricePerHour * 2,
                        paymentStatus: "paid",
                        status: "completed",
                        checkedIn: true,
                        checkedInAt: pastStart,
                        checkInTime: pastStart,
                        checkOutTime: pastEnd,
                        reviewed: true,
                        qrToken: `qr_past_seed_token_${idx}`
                    });

                    // Review
                    const feedbacks = [
                        "Absolutely fantastic parking space. Very easy access and the host was very polite.",
                        "Excellent spot near the office hub. Highly recommended for daily parking.",
                        "Safe, guarded lot. Found it clean and spacious. Will book again!",
                        "The spot was perfect, very close to my destination. Check-in was instant.",
                        "Smooth check-in, check-out. No issues at all. Highly professional driveway."
                    ];
                    await Review.create({
                        userId: driverUser._id,
                        parkingId: spot._id,
                        bookingId: pastBooking._id,
                        rating: 5 - (idx % 2), // 5 or 4 stars
                        feedback: feedbacks[idx % feedbacks.length]
                    });

                    // Future booking
                    const futureStart = new Date();
                    futureStart.setDate(futureStart.getDate() + (idx + 1));
                    futureStart.setHours(10 + idx, 0, 0, 0);
                    const futureEnd = new Date(futureStart);
                    futureEnd.setHours(futureStart.getHours() + 2);

                    await Booking.create({
                        userId: driverUser._id,
                        parkingId: spot._id,
                        startTime: futureStart,
                        endTime: futureEnd,
                        totalPrice: spot.pricePerHour * 2,
                        paymentStatus: "paid",
                        status: "paid",
                        checkedIn: false,
                        qrToken: `qr_future_seed_token_${idx}`
                    });
                }
                console.log("[Seeder] Successfully seeded bookings and reviews.");
            }
        }

        console.log("Database seeded successfully with Mumbai localities! ✅");
        process.exit(0);
    } catch (error) {
        console.error(`[Seeder] Error seeding database: ${error}`);
        process.exit(1);
    }
};

importData();
