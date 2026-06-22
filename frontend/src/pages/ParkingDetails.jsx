import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Button from "../components/ui/Button";
import BookingModal from "../components/BookingModal";
import LocationModal from "../components/LocationModal";
import { AuthContext } from "../context/AuthContext";
import {
  fetchParkingById,
  getParkingReviews,
  submitParkingReview,
  reportParkingListing,
  fetchUserBookings
} from "../services/api";
import { normalizeImageUrl } from "../utils/imageHelper";

export default function ParkingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [parking, setParking] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review form state
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reported, setReported] = useState(false);

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const getImageUrl = () => {
    if (!parking) return null;
    if (parking.image) return parking.image;
    if (parking.images && parking.images.length > 0) {
      const first = parking.images[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object" && first.url) return first.url;
    }
    return null;
  };

  const [coverImage, setCoverImage] = useState("");
  const [detailImage, setDetailImage] = useState("");
  const [angleImage, setAngleImage] = useState("");

  useEffect(() => {
    if (parking) {
      setCoverImage(normalizeImageUrl(getImageUrl()));
      setDetailImage(normalizeImageUrl(parking.images?.[1]));
      setAngleImage(normalizeImageUrl(parking.images?.[2]));
    }
  }, [parking]);

  const handleCoverError = () => setCoverImage(normalizeImageUrl(null));
  const handleDetailError = () => setDetailImage(normalizeImageUrl(null));
  const handleAngleError = () => setAngleImage(normalizeImageUrl(null));

  const handleNavigate = () => {
    const coords = parking.location?.coordinates;
    if (!coords || coords.length < 2) return;
    const destLat = coords[1];
    const destLng = coords[0];

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const originLat = position.coords.latitude;
          const originLng = position.coords.longitude;
          const url = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
          window.open(url, "_blank");
        },
        () => {
          const url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
          window.open(url, "_blank");
        }
      );
    } else {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
      window.open(url, "_blank");
    }
  };

  // A review needs a real, completed, not-yet-reviewed booking at this exact spot —
  // the backend rejects review submissions without one. Without this, the review form
  // would always 400 ("Booking ID is required to rate your experience.").
  const [reviewableBooking, setReviewableBooking] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [parkingRes, reviewsRes] = await Promise.all([
        fetchParkingById(id),
        getParkingReviews(id).catch(() => ({ data: [] }))
      ]);
      setParking(parkingRes.data);
      setReviews(reviewsRes.data);
    } catch (err) {
      console.error("Error loading location details:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadReviewableBooking = async () => {
    if (!user) {
      setReviewableBooking(null);
      return;
    }
    try {
      const res = await fetchUserBookings(user._id);
      const eligible = res.data.find((b) =>
        (b.parkingId?._id === id) &&
        !b.reviewed &&
        b.status !== "cancelled" &&
        (b.status === "completed" || new Date(b.endTime) < new Date())
      );
      setReviewableBooking(eligible || null);
    } catch (err) {
      console.error("Error checking reviewable bookings:", err);
    }
  };

  useEffect(() => {
    loadData();
    loadReviewableBooking();
  }, [id, user]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewText.trim() || !reviewableBooking) return;

    try {
      setSubmittingReview(true);
      await submitParkingReview(id, {
        rating,
        feedback: reviewText,
        bookingId: reviewableBooking._id
      });
      setReviewText("");
      setRating(5);

      // Reload reviews & average rating, and clear the now-used reviewable booking.
      await loadData();
      await loadReviewableBooking();
    } catch (err) {
      console.error("Error submitting review:", err);
      alert(err.response?.data?.message || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReport = async () => {
    if (reported) return;
    try {
      await reportParkingListing(id);
      setReported(true);
      alert("This listing has been reported. Our moderators will review it shortly. Thank you for keeping ASAP safe!");
    } catch (err) {
      console.error("Error reporting spot:", err);
      alert("Failed to report listing.");
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-parking-200 border-t-parking-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 text-sm font-medium">Loading listing...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!parking) {
    return (
      <div className="min-h-screen bg-white flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <span className="material-symbols-outlined text-red-500 text-5xl mb-4">error</span>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Parking Spot Not Found</h2>
          <p className="text-slate-500 max-w-sm mb-6">The listing you are trying to view does not exist or has been removed.</p>
          <Button variant="primary" onClick={() => navigate("/")}>Return to Search</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pb-20 mt-4">
        <div className="max-w-6xl mx-auto px-6">
          <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Search
          </button>

          {/* Header Description Title */}
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 leading-tight tracking-tight mb-4">{parking.title}</h1>

            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-accent-400/10 text-accent-600 border border-accent-400/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                {parking.vehicleType || "Four Wheeler"}
              </span>
              <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-medium text-slate-600 flex items-center border border-slate-200">
                 <span className="material-symbols-outlined text-[16px] mr-1 text-slate-400">location_on</span>
                 {parking.address}
              </span>

              {/* Verification & Trust Badges */}
              {parking.isApproved ? (
                <span className="bg-parking-50 text-parking-700 border border-parking-100 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">verified_user</span> Verified Host Spot
                </span>
              ) : (
                <span className="bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">gavel</span> Awaiting Verification
                </span>
              )}

              {parking.rating >= 4.5 && (
                <span className="bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">workspace_premium</span> Highly Rated
                </span>
              )}
            </div>
          </div>

          {/* Airbnb-style Image Gallery */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 rounded-xl overflow-hidden border border-slate-200 p-2">
            <div className="md:col-span-2 h-[260px] md:h-[360px] rounded-lg overflow-hidden relative group">
              <img src={coverImage} onError={handleCoverError} alt={parking.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-full text-xs font-medium text-slate-700 border border-slate-200 uppercase tracking-wider">
                Cover Photo
              </div>
            </div>
            <div className="hidden md:flex flex-col gap-4 h-[360px]">
              <div className="h-1/2 rounded-lg overflow-hidden relative group">
                <img
                  src={detailImage}
                  onError={handleDetailError}
                  alt="Parking Detail"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="h-1/2 rounded-lg overflow-hidden relative group">
                <img
                  src={angleImage}
                  onError={handleAngleError}
                  alt="Parking Angle"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-10">
            {/* Left Content Column */}
            <div className="flex-1 space-y-10">
               <section>
                 <div className="flex justify-between items-start mb-4">
                   <h2 className="text-xl font-semibold text-slate-900">About this location</h2>
                   <button
                     onClick={handleReport}
                     className={`flex items-center gap-1 text-xs font-medium transition-all px-3 py-1.5 rounded-lg border ${
                       reported
                         ? "bg-red-50 text-red-500 border-red-200 cursor-not-allowed"
                         : "bg-white text-slate-500 hover:text-red-500 border-slate-200 hover:border-red-200"
                     }`}
                     disabled={reported}
                   >
                     <span className="material-symbols-outlined text-[14px]">flag</span>
                     {reported ? "Reported" : "Report Listing"}
                   </button>
                 </div>
                 <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                   {parking.description || `Welcome to our secure parking facility located at ${parking.address}. Ideal for ${parking.vehicleType || "car"} storage. High safety standards guaranteed.`}
                 </p>
                 <div className="mt-6 flex items-center gap-3 text-sm text-slate-500 border-t border-slate-200 pt-4">
                    <div className="w-8 h-8 rounded-full bg-parking-100 flex items-center justify-center font-semibold text-xs text-parking-700">
                      {(parking.hostId?.name || "H").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Listed by</p>
                      <p className="text-slate-900 font-medium text-sm">
                        {parking.hostId?.name || "ASAP Independent Host"}
                        {parking.hostId?.verifiedHost === "verified" && (
                          <span className="ml-2 text-[10px] bg-parking-50 text-parking-700 px-1.5 py-0.5 rounded font-semibold uppercase">Verified Host</span>
                        )}
                        {parking.rating >= 4.5 && (
                          <span className="ml-2 text-[10px] bg-accent-400/10 text-accent-600 px-1.5 py-0.5 rounded font-semibold uppercase">Superhost</span>
                        )}
                      </p>
                    </div>
                 </div>
               </section>

               <section>
                 <h2 className="text-lg font-semibold text-slate-900 mb-4">Operating Hours & Timeline</h2>
                 <div className="grid grid-cols-2 gap-4 max-w-md">
                   <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                     <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Available From</span>
                     <span className="text-slate-900 font-semibold text-lg">{parking.startTime || "00:00"}</span>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                     <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Available Until</span>
                     <span className="text-slate-900 font-semibold text-lg">{parking.endTime || "23:59"}</span>
                   </div>
                 </div>
               </section>

               {/* What this space offers */}
               <section className="border-t border-slate-200 pt-8">
                 <h2 className="text-lg font-semibold text-slate-900 mb-4">What this space offers</h2>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="flex items-center gap-3 text-slate-600">
                     <span className="material-symbols-outlined text-parking-600">security</span>
                     <span className="text-sm">CCTV Monitoring</span>
                   </div>
                   <div className="flex items-center gap-3 text-slate-600">
                     <span className="material-symbols-outlined text-parking-600">wb_sunny</span>
                     <span className="text-sm">Well Lit Area</span>
                   </div>
                   <div className="flex items-center gap-3 text-slate-600">
                     <span className="material-symbols-outlined text-parking-600">ev_station</span>
                     <span className="text-sm">EV Charging Available</span>
                   </div>
                   <div className="flex items-center gap-3 text-slate-600">
                     <span className="material-symbols-outlined text-parking-600">hdr_strong</span>
                     <span className="text-sm">Paved Concrete Ground</span>
                   </div>
                   <div className="flex items-center gap-3 text-slate-600">
                     <span className="material-symbols-outlined text-parking-600">accessible</span>
                     <span className="text-sm">Easy Entry / Exit</span>
                   </div>
                   <div className="flex items-center gap-3 text-slate-600">
                     <span className="material-symbols-outlined text-parking-600">support_agent</span>
                     <span className="text-sm">24/7 Gate Guard</span>
                   </div>
                 </div>
               </section>

               {/* Parking Rules */}
               <section className="border-t border-slate-200 pt-8">
                 <h2 className="text-lg font-semibold text-slate-900 mb-4">Parking Rules</h2>
                 <ul className="space-y-3 text-slate-600 text-sm">
                   <li className="flex items-start gap-2">
                     <span className="material-symbols-outlined text-parking-600 text-sm mt-0.5">check_circle</span>
                     <span>Must present digital QR ticket upon entry and checkout.</span>
                   </li>
                   <li className="flex items-start gap-2">
                     <span className="material-symbols-outlined text-parking-600 text-sm mt-0.5">check_circle</span>
                     <span>Please park only within your designated vehicle type slot.</span>
                   </li>
                   <li className="flex items-start gap-2">
                     <span className="material-symbols-outlined text-parking-600 text-sm mt-0.5">check_circle</span>
                     <span>Drive slowly (under 10 km/h) inside the parking premises.</span>
                   </li>
                   <li className="flex items-start gap-2">
                     <span className="material-symbols-outlined text-parking-600 text-sm mt-0.5">check_circle</span>
                     <span>Make sure to lock your vehicle; ASAP is not liable for loose items.</span>
                   </li>
                 </ul>
               </section>

               {/* REVIEWS SECTION */}
               <section className="border-t border-slate-200 pt-10">
                 <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                   <span>User Reviews & Ratings</span>
                   <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-semibold">
                     ⭐ {parking.rating || "N/A"} ({parking.reviewCount || 0} review{parking.reviewCount === 1 ? "" : "s"})
                   </span>
                 </h2>

                 {/* Write a Review Block — only shown once there's a real completed booking to attach it to */}
                 {reviewableBooking ? (
                   <form onSubmit={handleReviewSubmit} className="bg-white border border-slate-200 shadow-sm p-6 rounded-xl mb-8 space-y-4">
                     <h3 className="font-semibold text-slate-900 text-sm">Share your experience</h3>

                     {/* Stars Picker */}
                     <div className="flex items-center gap-2">
                       <span className="text-xs text-slate-500 font-medium mr-2">Your Rating:</span>
                       {[1, 2, 3, 4, 5].map((star) => (
                         <button
                           type="button"
                           key={star}
                           onClick={() => setRating(star)}
                           className="text-amber-500 focus:outline-none transition-transform active:scale-95"
                         >
                           <span className="material-symbols-outlined text-[24px]">
                             {star <= rating ? "star" : "star_rate"}
                           </span>
                         </button>
                       ))}
                     </div>

                     {/* Review Text */}
                     <textarea
                       rows="3"
                       value={reviewText}
                       onChange={(e) => setReviewText(e.target.value)}
                       placeholder="Tell other drivers about safety, lighting, hosts, or accessibility..."
                       className="w-full p-4 rounded-lg input-field text-sm"
                       required
                     />

                     <div className="flex justify-end">
                       <Button
                         type="submit"
                         variant="primary"
                         size="sm"
                         className="px-6"
                         disabled={submittingReview}
                       >
                         {submittingReview ? "Submitting..." : "Submit Review"}
                       </Button>
                     </div>
                   </form>
                 ) : !user ? (
                   <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center mb-8">
                     <p className="text-xs text-slate-500">
                       Please <Link to="/login" className="text-accent-600 font-semibold hover:underline">Log In</Link> to write a review.
                     </p>
                   </div>
                 ) : (
                   <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center mb-8">
                     <p className="text-xs text-slate-500">
                       You can review this spot after completing a booking here.
                     </p>
                   </div>
                 )}

                 {/* Reviews List */}
                 <div className="space-y-4">
                   {reviews.length === 0 ? (
                     <div className="text-center py-10 text-slate-400 text-sm">
                       No reviews yet. Be the first to share your experience!
                     </div>
                   ) : (
                     reviews.map((rev) => (
                       <div key={rev._id} className="bg-white border border-slate-200 shadow-sm p-5 rounded-xl">
                         <div className="flex items-center justify-between mb-3">
                           <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-semibold text-[10px] text-slate-600 uppercase">
                               {(rev.userId?.name || "U").charAt(0)}
                             </div>
                             <span className="font-semibold text-slate-900 text-sm">{rev.userId?.name || "Driver"}</span>
                           </div>
                           <div className="flex text-amber-500 text-sm">
                             {[...Array(5)].map((_, i) => (
                               <span key={i} className="material-symbols-outlined text-[14px]">
                                 {i < rev.rating ? "star" : "star_rate"}
                               </span>
                             ))}
                           </div>
                         </div>
                         <p className="text-slate-600 text-sm">{rev.feedback}</p>
                         <p className="text-[10px] text-slate-400 mt-2">
                           {new Date(rev.createdAt).toLocaleDateString(undefined, { dateStyle: "long" })}
                         </p>
                       </div>
                     ))
                   )}
                 </div>
               </section>
            </div>

            {/* Right Sticky Reservation Sidebar */}
             <aside className="w-full lg:w-96 flex-shrink-0">
                <div className="bg-white border border-slate-200 shadow-sm p-8 rounded-xl sticky top-24 space-y-6">
                   <div className="flex justify-between items-end pb-4 border-b border-slate-200">
                      <div>
                        <span className="text-slate-500 text-xs font-medium uppercase tracking-wider block mb-1">Rate</span>
                        <div className="flex items-baseline">
                          <h2 className="text-3xl font-semibold text-slate-900 tabular-nums">₹{parking.pricePerHour}</h2>
                          <span className="text-slate-500 text-sm ml-2">/ hour</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="bg-parking-50 text-parking-700 font-semibold px-3 py-1 rounded-full border border-parking-100 text-xs block">
                          {parking.slots} Slots Left
                        </span>
                      </div>
                   </div>

                   {/* Price Breakdown */}
                   <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-500">
                     <h4 className="font-semibold text-slate-900 text-sm mb-2">Price Breakdown (Estimated 1 Hr)</h4>
                     <div className="flex justify-between">
                       <span>1 Hour Reserve</span>
                       <span className="text-slate-900 font-medium tabular-nums">₹{parking.pricePerHour}</span>
                     </div>
                     <div className="flex justify-between">
                       <span>Platform Convenience Fee</span>
                       <span className="text-slate-900 font-medium tabular-nums">₹15</span>
                     </div>
                     <div className="flex justify-between">
                       <span>Service Tax / GST (18%)</span>
                       <span className="text-slate-900 font-medium tabular-nums">₹{Math.round(parking.pricePerHour * 0.18)}</span>
                     </div>
                     <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900 text-sm">
                       <span>Total</span>
                       <span className="text-parking-700 tabular-nums">₹{parking.pricePerHour + 15 + Math.round(parking.pricePerHour * 0.18)}</span>
                     </div>
                   </div>

                   <div className="space-y-3 pt-2">
                      <Button variant="primary" className="w-full h-12 text-base" onClick={() => setIsBookingOpen(true)}>
                        Reserve Space Now
                      </Button>
                      <Button variant="outline" className="w-full h-11 flex items-center justify-center gap-2 text-xs" onClick={() => setIsMapOpen(true)}>
                        <span className="material-symbols-outlined text-[18px]">map</span>
                        View on Map
                      </Button>
                      <Button variant="secondary" className="w-full h-11 flex items-center justify-center gap-2 text-xs" onClick={handleNavigate}>
                        <span className="material-symbols-outlined text-[18px] text-parking-600">navigation</span>
                        Navigate with Google Maps
                      </Button>
                   </div>

                   <p className="text-center text-[10px] text-slate-400 leading-tight">No charges are committed yet. You will complete payment via secure Razorpay checkout gateway in the next step.</p>
                </div>
             </aside>
          </div>
        </div>
      </main>

      <Footer />

      <BookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} parkingData={parking} />
      <LocationModal isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} parkingData={parking} />
    </div>
  );
}
