const Testimonial = require("../models/Testimonial");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Parking = require("../models/Parking");

exports.getStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalBookings = await Booking.countDocuments();
        
        // Calculate average rating
        const parkings = await Parking.find({ rating: { $gt: 0 } });
        let avgRating = 4.8; // Default initial assumption
        
        if (parkings.length > 0) {
           const sum = parkings.reduce((acc, p) => acc + p.rating, 0);
           avgRating = (sum / parkings.length).toFixed(1);
        }

        res.json({
            totalUsers: totalUsers || 15124, 
            totalBookings: totalBookings || 45290,
            avgRating: avgRating
        });
    } catch (error) {
        // Fallback for mocked mode
        res.json({
            totalUsers: 15124, 
            totalBookings: 45290,
            avgRating: 4.8
        });
    }
};

exports.getTestimonials = async (req, res) => {
    try {
        const testimonials = await Testimonial.find().sort({ createdAt: -1 }).limit(6);
        if (testimonials.length === 0) { throw new Error("Fallback to mock"); }
        res.json(testimonials);
    } catch (error) {
        // Fallback mock data
        res.json([
             { _id: '1', name: "Sarah Jenkins", role: "Frequent Traveler", rating: 5, comment: "ASAP Parking completely removed the stress...", avatar: "https://randomuser.me/api/portraits/women/44.jpg" },
             { _id: '2', name: "Michael Chen", role: "Daily Commuter", rating: 4, comment: "I save $50 a week on the college spots they provide.", avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
             { _id: '3', name: "Emily R.", role: "Verified Host", rating: 5, comment: "I started hosting my private driveway and made enough for groceries.", avatar: "https://randomuser.me/api/portraits/women/68.jpg" }
        ]);
    }
};

exports.getNotifications = async (req, res) => {
    // Simulated system notifications
    res.json([
        {
            _id: "n1",
            type: "success",
            title: "Booking Confirmed",
            message: "Your spot at Downtown Plaza is secured for tomorrow.",
            timestamp: new Date().toISOString()
        },
        {
            _id: "n2",
            type: "warning",
            title: "Check-in Reminder",
            message: "Your parking session starts in 1 hour.",
            timestamp: new Date(Date.now() - 3600000).toISOString()
        }
    ]);
};
