import { useContext, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import SearchParking from "./pages/SearchParking";
import ParkingDetails from "./pages/ParkingDetails";
import Checkout from "./pages/Checkout";
import Success from "./pages/Success";
import HostLanding from "./pages/HostLanding";
import HostOnboarding from "./pages/HostOnboarding";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import UserDashboard from "./pages/UserDashboard";
import HostDashboard from "./pages/HostDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import About from "./pages/About";
import Help from "./pages/Help";
import { AuthContext } from "./context/AuthContext";

// Centralizes the "must be logged in" / "must be admin" checks that were previously
// scattered as ad-hoc useEffect redirects inside each page (which let the page flash
// briefly before redirecting). These run before the page ever mounts.
function PrivateRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

function App() {
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (apiKey && apiKey !== "YOUR_GOOGLE_MAPS_API_KEY" && !window.google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      console.log("[Google Maps] Script injected globally.");
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SearchParking />} />
        <Route path="/parking/:id" element={<ParkingDetails />} />
        <Route path="/checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
        <Route path="/success" element={<PrivateRoute><Success /></PrivateRoute>} />

        <Route path="/host" element={<HostLanding />} />
        <Route path="/host/onboarding" element={<PrivateRoute><HostOnboarding /></PrivateRoute>} />

        <Route path="/about" element={<About />} />
        <Route path="/help" element={<Help />} />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<PrivateRoute><UserDashboard /></PrivateRoute>} />
        <Route path="/host/dashboard" element={<PrivateRoute><HostDashboard /></PrivateRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

        <Route path="/search" element={<SearchParking />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;