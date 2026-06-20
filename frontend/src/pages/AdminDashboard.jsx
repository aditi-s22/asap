import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "../components/Logo";
import Button from "../components/ui/Button";
import { AuthContext } from "../context/AuthContext";
import {
  getAdminMetrics,
  getAdminUsers,
  toggleUserStatus,
  getAdminListings,
  approveParking,
  rejectParking,
  suspendParking,
  unsuspendParking,
  deleteParking,
  getAdminPayments,
  getPendingHosts,
  verifyHost,
  getAdminDisputes,
  resolveRefund,
  getAdminActivities,
  getTickets,
  updateTicket,
  getSystemHealth,
  seedDemoData
} from "../services/api";
import { normalizeImageUrl } from "../utils/imageHelper";

// Small solid-pill badge — shared visual language with the rest of the light theme.
const StatusPill = ({ tone, children }) => {
  const tones = {
    green: "bg-parking-50 text-parking-700 border-parking-100",
    red: "bg-red-50 text-red-600 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    blue: "bg-accent-400/10 text-accent-600 border-accent-400/20",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border whitespace-nowrap ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
};

const Card = ({ children, className = "" }) => (
  <div className={`bg-white border border-slate-200 rounded-xl shadow-sm ${className}`}>{children}</div>
);

export default function AdminDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState({ pending: [], reported: [] });
  const [payments, setPayments] = useState([]);
  const [pendingHosts, setPendingHosts] = useState([]);
  const [disputes, setDisputes] = useState({ refundRequests: [], reportedListings: [] });
  const [activities, setActivities] = useState([]);

  // Tickets & disputes state
  const [tickets, setTickets] = useState([]);
  const [resolvingLoading, setResolvingLoading] = useState(false);

  // System Health state
  const [health, setHealth] = useState(null);
  const [seedingLoading, setSeedingLoading] = useState(false);

  // Disputes page sub-section (refunds / reported / tickets)
  const [disputeSection, setDisputeSection] = useState("refunds");

  // Admin header search — filters the active page's list client-side, no new API calls.
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const loadAdminData = async () => {
    try {
      setLoading(true);

      const [metRes, usersRes, listRes, payRes, hostsRes, dispRes, actRes, ticketsRes, healthRes] = await Promise.all([
        getAdminMetrics().catch(() => ({ data: null })),
        getAdminUsers().catch(() => ({ data: [] })),
        getAdminListings().catch(() => ({ data: { pending: [], reported: [] } })),
        getAdminPayments().catch(() => ({ data: [] })),
        getPendingHosts().catch(() => ({ data: [] })),
        getAdminDisputes().catch(() => ({ data: { refundRequests: [], reportedListings: [] } })),
        getAdminActivities().catch(() => ({ data: [] })),
        getTickets().catch(() => ({ data: [] })),
        getSystemHealth().catch(() => ({ data: null }))
      ]);

      setMetrics(metRes.data);
      setUsers(usersRes.data);
      setListings(listRes.data);
      setPayments(payRes.data);
      setPendingHosts(hostsRes.data);
      setDisputes(dispRes.data);
      setActivities(actRes.data);
      setTickets(ticketsRes.data);
      setHealth(healthRes.data);
    } catch (err) {
      console.error("Failed to load admin dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "admin") {
      loadAdminData();
    }
  }, [user]);

  useEffect(() => {
    setSearchQuery("");
  }, [activeTab]);

  // Toggle User Ban
  const handleToggleUser = async (userId) => {
    try {
      const res = await toggleUserStatus(userId);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isActive: res.data.user.isActive } : u));
      loadAdminData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to toggle user status.");
    }
  };

  // Approve Listing
  const handleApproveSpot = async (spotId) => {
    try {
      await approveParking(spotId);
      loadAdminData();
    } catch (err) {
      alert("Failed to approve listing.");
    }
  };

  // Reject Listing
  const handleRejectSpot = async (spotId) => {
    try {
      await rejectParking(spotId);
      loadAdminData();
    } catch (err) {
      alert("Failed to reject listing.");
    }
  };

  // Suspend Listing
  const handleSuspendSpot = async (spotId) => {
    try {
      await suspendParking(spotId);
      loadAdminData();
    } catch (err) {
      alert("Failed to suspend listing.");
    }
  };

  // Unsuspend Listing
  const handleUnsuspendSpot = async (spotId) => {
    try {
      await unsuspendParking(spotId);
      loadAdminData();
    } catch (err) {
      alert("Failed to lift suspension.");
    }
  };

  // Delete Spot
  const handleDeleteSpot = async (spotId) => {
    if (window.confirm("Are you sure you want to permanently delete this parking spot?")) {
      try {
        await deleteParking(spotId);
        loadAdminData();
      } catch (err) {
        alert("Failed to delete listing.");
      }
    }
  };

  // Verify Host (Approve/Reject)
  const handleVerifyHost = async (hostId, status) => {
    try {
      await verifyHost(hostId, status);
      loadAdminData();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${status} host.`);
    }
  };

  // Resolve Refund (Approve/Reject)
  const handleResolveRefund = async (paymentId, action) => {
    const adminNotes = prompt("Enter resolution notes (optional):") || "";
    try {
      await resolveRefund(paymentId, action, adminNotes);
      loadAdminData();
    } catch (err) {
      alert(`Failed to ${action} refund.`);
    }
  };

  // Resolve Ticket manually (update notes/status)
  const handleUpdateTicket = async (ticketId, ticketStatus, notes = "") => {
    try {
      setResolvingLoading(true);
      await updateTicket(ticketId, { status: ticketStatus, adminNotes: notes });
      alert(`Ticket status updated to ${ticketStatus}`);
      loadAdminData();
    } catch (err) {
      alert("Failed to update ticket: " + (err.response?.data?.message || err.message));
    } finally {
      setResolvingLoading(false);
    }
  };

  // One-click seed demo dataset
  const handleSeedDemo = async () => {
    try {
      setSeedingLoading(true);
      const res = await seedDemoData();
      alert(res.data.message || "Demo data seeded successfully.");
      await loadAdminData();
    } catch (err) {
      alert("Failed to seed demo data: " + (err.response?.data?.message || err.message));
    } finally {
      setSeedingLoading(false);
    }
  };

  const totalPending = pendingHosts.length + listings.pending.length + disputes.refundRequests.length + tickets.filter(t => t.status === "open").length;

  const NAV_ITEMS = [
    { id: "overview", label: "Overview", icon: "dashboard" },
    { id: "hosts", label: "Pending Hosts", icon: "verified_user", count: pendingHosts.length },
    { id: "listings", label: "Pending Listings", icon: "local_parking", count: listings.pending.length },
    { id: "users", label: "Users", icon: "people" },
    { id: "bookings", label: "Bookings", icon: "event_available" },
    { id: "payments", label: "Payments", icon: "account_balance" },
    { id: "disputes", label: "Disputes", icon: "gavel", count: disputes.refundRequests.length + tickets.filter(t => t.status === "open").length },
    { id: "analytics", label: "Analytics", icon: "monitoring" },
    { id: "system_health", label: "System Health", icon: "health_and_safety" },
  ];

  const PAGE_TITLES = {
    overview: "Overview",
    hosts: "Pending Hosts",
    listings: "Pending Listings",
    users: "Users",
    bookings: "Bookings",
    payments: "Payments",
    disputes: "Disputes",
    analytics: "Analytics",
    system_health: "System Health",
  };

  const matchesSearch = (text) => !searchQuery.trim() || (text || "").toLowerCase().includes(searchQuery.trim().toLowerCase());

  // Bookings are derived entirely from already-fetched payment records (each Payment
  // populates its parent Booking) — no new backend endpoint, same data already on screen.
  const bookingRows = payments
    .filter(p => p.bookingId)
    .map(p => ({ payment: p, booking: p.bookingId }));

  const revenueToday = payments
    .filter(p => p.status === "captured" && new Date(p.createdAt).toDateString() === new Date().toDateString())
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-[3px] border-slate-200 border-t-parking-600 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Loading Admin Console…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-700">
      {/* SIDEBAR */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 flex-col bg-white border-r border-slate-200 sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-slate-100">
          <Logo size={28} wordmarkClassName="text-lg font-bold text-slate-900 tracking-tight" />
          <p className="text-[10px] font-semibold text-parking-600 uppercase tracking-wider mt-1">Admin Console</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? "bg-parking-50 text-parking-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.count > 0 && (
                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{item.count}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <span className="material-symbols-outlined text-[19px]">logout</span>
            Log Out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* TOP HEADER */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="flex items-center gap-4 px-6 py-3.5">
            <div className="lg:hidden">
              <Logo size={26} showWordmark={false} />
            </div>
            <h1 className="text-base font-semibold text-slate-900 hidden md:block">{PAGE_TITLES[activeTab]}</h1>

            <div className="flex-1 max-w-md ml-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-[18px]">search</span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search this view…"
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-parking-500 focus:ring-1 focus:ring-parking-500 bg-slate-50"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 ml-auto relative">
              <button
                onClick={() => setNotifOpen(o => !o)}
                className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 relative"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {totalPending > 0 && (
                  <span className="absolute top-1 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.15 }}
                    className="absolute top-12 right-24 w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50"
                  >
                    <p className="text-xs font-semibold text-slate-900 px-3 py-2">Needs your attention</p>
                    {[
                      { label: "Pending Hosts", count: pendingHosts.length, tab: "hosts" },
                      { label: "Pending Listings", count: listings.pending.length, tab: "listings" },
                      { label: "Open Refund Requests", count: disputes.refundRequests.length, tab: "disputes" },
                      { label: "Open Driver Tickets", count: tickets.filter(t => t.status === "open").length, tab: "disputes" },
                    ].filter(i => i.count > 0).map(i => (
                      <button key={i.label} onClick={() => { setActiveTab(i.tab); setNotifOpen(false); }} className="w-full flex justify-between items-center px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded-lg">
                        <span>{i.label}</span>
                        <span className="bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">{i.count}</span>
                      </button>
                    ))}
                    {totalPending === 0 && <p className="text-xs text-slate-400 px-3 py-2">All clear — nothing pending.</p>}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative">
                <button onClick={() => setProfileOpen(o => !o)} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-parking-600 text-white flex items-center justify-center text-sm font-semibold">
                    {user?.name?.charAt(0).toUpperCase() || "A"}
                  </div>
                  <span className="material-symbols-outlined text-slate-400 text-[18px] hidden sm:block">arrow_drop_down</span>
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.15 }}
                      className="absolute top-12 right-0 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50"
                    >
                      <div className="px-4 py-2 border-b border-slate-100 mb-1">
                        <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                      </div>
                      <button onClick={() => { logout(); navigate("/login"); }} className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                        <span className="material-symbols-outlined text-[16px]">logout</span> Log Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Mobile nav (sidebar collapses below lg) */}
          <nav className="lg:hidden flex gap-1 px-4 pb-3 overflow-x-auto scrollbar-none">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  activeTab === item.id ? "bg-parking-50 text-parking-700" : "text-slate-500"
                }`}
              >
                {item.label}{item.count > 0 ? ` (${item.count})` : ""}
              </button>
            ))}
          </nav>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-6 max-w-screen-2xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {/* OVERVIEW */}
              {activeTab === "overview" && metrics && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                      { label: "Total Users", value: metrics.totalUsers, icon: "people" },
                      { label: "Active Hosts", value: metrics.activeHosts, icon: "verified_user" },
                      { label: "Active Listings", value: metrics.activeSpots, icon: "local_parking" },
                      { label: "Bookings Today", value: health?.bookingsToday ?? "—", icon: "event_available" },
                      { label: "Revenue Today", value: `₹${revenueToday.toLocaleString()}`, icon: "payments" },
                      { label: "Pending Approvals", value: metrics.pendingHostApprovals + metrics.pendingListingApprovals, icon: "pending_actions" },
                    ].map(kpi => (
                      <Card key={kpi.label} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{kpi.label}</span>
                          <span className="material-symbols-outlined text-parking-500 text-[18px]">{kpi.icon}</span>
                        </div>
                        <p className="text-2xl font-semibold text-slate-900 tabular-nums">{kpi.value}</p>
                      </Card>
                    ))}
                  </div>

                  <Card className="p-5">
                    <h2 className="text-sm font-semibold text-slate-900 mb-4">Recent Platform Activity</h2>
                    <div className="divide-y divide-slate-100">
                      {activities.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-sm">No activity logged.</div>
                      ) : (
                        activities.slice(0, 10).map((act, index) => (
                          <div key={index} className="flex items-center gap-3 text-sm py-2.5 text-slate-600">
                            <span className="text-slate-400 tabular-nums w-16 flex-shrink-0 text-xs">{new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-parking-500 flex-shrink-0"></span>
                            <span className="truncate">{act.message}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {/* PENDING HOSTS */}
              {activeTab === "hosts" && (
                <Card className="p-5">
                  <h2 className="text-sm font-semibold text-slate-900 mb-4">Host Verification Queue</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 text-xs font-semibold">
                          <th className="pb-3 pr-4">Host Profile</th>
                          <th className="pb-3 pr-4">Identity Documents</th>
                          <th className="pb-3 pr-4">Phone</th>
                          <th className="pb-3 pr-4">Status</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingHosts.filter(h => matchesSearch(h.name) || matchesSearch(h.email)).length === 0 ? (
                          <tr><td colSpan="5" className="py-10 text-center text-slate-400 text-sm">No pending host onboarding requests.</td></tr>
                        ) : (
                          pendingHosts.filter(h => matchesSearch(h.name) || matchesSearch(h.email)).map((host, i) => (
                            <tr key={host._id} className={`border-b border-slate-100 text-sm ${i % 2 === 1 ? "bg-slate-50/50" : ""}`}>
                              <td className="py-4 pr-4">
                                <div className="font-semibold text-slate-900">{host.name}</div>
                                <div className="text-slate-500 text-xs mt-0.5">{host.email}</div>
                              </td>
                              <td className="py-4 pr-4">
                                <div className="flex gap-4 text-xs">
                                  {host.govIdImage ? (
                                    <a href={host.govIdImage} target="_blank" rel="noreferrer" className="text-accent-600 font-semibold hover:underline flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[15px]">badge</span> Gov ID
                                    </a>
                                  ) : <span className="text-slate-400 italic">No ID</span>}
                                  {host.addressProofImage ? (
                                    <a href={host.addressProofImage} target="_blank" rel="noreferrer" className="text-accent-600 font-semibold hover:underline flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[15px]">home</span> Proof
                                    </a>
                                  ) : <span className="text-slate-400 italic">No Address Proof</span>}
                                </div>
                              </td>
                              <td className="py-4 pr-4 text-slate-600 tabular-nums text-xs">{host.phone || "N/A"}</td>
                              <td className="py-4 pr-4"><StatusPill tone="amber">Pending Review</StatusPill></td>
                              <td className="py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => handleVerifyHost(host._id, "verified")} className="px-3 py-1.5 bg-parking-50 text-parking-700 rounded-lg hover:bg-parking-600 hover:text-white text-xs font-semibold transition-colors">Approve</button>
                                  <button onClick={() => handleVerifyHost(host._id, "rejected")} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white text-xs font-semibold transition-colors">Reject</button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* PENDING LISTINGS — large review cards per spec */}
              {activeTab === "listings" && (
                <div className="space-y-4">
                  <h2 className="text-sm font-semibold text-slate-900">Listing Verification Queue</h2>
                  {listings.pending.filter(s => matchesSearch(s.title) || matchesSearch(s.address)).length === 0 ? (
                    <Card className="p-10 text-center text-slate-400 text-sm">No parking listings awaiting approval.</Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {listings.pending.filter(s => matchesSearch(s.title) || matchesSearch(s.address)).map(spot => (
                        <Card key={spot._id} className="overflow-hidden flex flex-col">
                          {spot.images?.[0]?.url ? (
                            <img src={normalizeImageUrl(spot.images[0])} alt={spot.title} className="w-full h-48 object-cover" />
                          ) : (
                            <div className="w-full h-48 bg-slate-100 flex items-center justify-center text-slate-400">
                              <span className="material-symbols-outlined text-3xl">image_not_supported</span>
                            </div>
                          )}
                          <div className="p-5 flex-1 flex flex-col gap-3">
                            <div className="flex justify-between items-start gap-2">
                              <h3 className="font-semibold text-slate-900">{spot.title}</h3>
                              <span className="font-semibold text-slate-900 tabular-nums whitespace-nowrap">₹{spot.pricePerHour}/hr</span>
                            </div>
                            <div className="text-sm text-slate-500 flex items-start gap-1.5">
                              <span className="material-symbols-outlined text-[16px] mt-0.5 flex-shrink-0">location_on</span>
                              {spot.address}
                            </div>
                            <div className="text-xs text-slate-400 tabular-nums">
                              Coordinates: {spot.location?.coordinates?.[1]?.toFixed(4)}, {spot.location?.coordinates?.[0]?.toFixed(4)}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                              <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-semibold text-slate-600">
                                {spot.host?.name?.charAt(0) || "?"}
                              </span>
                              <span className="font-medium text-slate-700">{spot.host?.name || "Unknown host"}</span>
                              <span className="text-slate-400">{spot.host?.email}</span>
                            </div>
                            <div className="flex gap-2 mt-auto pt-2">
                              <button onClick={() => handleApproveSpot(spot._id)} className="flex-1 px-3 py-2 bg-parking-600 text-white rounded-lg hover:bg-parking-700 text-sm font-semibold transition-colors">Approve</button>
                              <button onClick={() => handleRejectSpot(spot._id)} className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white text-sm font-semibold transition-colors">Reject</button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* USERS */}
              {activeTab === "users" && (
                <Card className="p-5">
                  <h2 className="text-sm font-semibold text-slate-900 mb-4">User Accounts</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 text-xs font-semibold">
                          <th className="pb-3 pr-4">User</th>
                          <th className="pb-3 pr-4">Role</th>
                          <th className="pb-3 pr-4">Joined</th>
                          <th className="pb-3 pr-4">Status</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.filter(u => matchesSearch(u.name) || matchesSearch(u.email)).map((u, i) => (
                          <tr key={u._id} className={`border-b border-slate-100 text-sm ${i % 2 === 1 ? "bg-slate-50/50" : ""}`}>
                            <td className="py-4 pr-4">
                              <div className="font-semibold text-slate-900">{u.name}</div>
                              <div className="text-slate-500 text-xs mt-0.5">{u.email}</div>
                            </td>
                            <td className="py-4 pr-4 capitalize">
                              <StatusPill tone={u.role === "admin" ? "blue" : u.role === "host" ? "green" : "slate"}>{u.role}</StatusPill>
                            </td>
                            <td className="py-4 pr-4 text-slate-500 tabular-nums text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                            <td className="py-4 pr-4"><StatusPill tone={u.isActive ? "green" : "red"}>{u.isActive ? "Active" : "Banned"}</StatusPill></td>
                            <td className="py-4 text-right">
                              {u._id !== user._id ? (
                                <button
                                  onClick={() => handleToggleUser(u._id)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                    u.isActive ? "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white" : "bg-parking-50 text-parking-700 hover:bg-parking-600 hover:text-white"
                                  }`}
                                >
                                  {u.isActive ? "Ban Account" : "Lift Ban"}
                                </button>
                              ) : (
                                <span className="text-slate-400 text-xs italic">Self</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* BOOKINGS — derived from existing payment+booking data, no new endpoint */}
              {activeTab === "bookings" && (
                <Card className="p-5">
                  <h2 className="text-sm font-semibold text-slate-900 mb-4">Bookings</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 text-xs font-semibold">
                          <th className="pb-3 pr-4">Driver</th>
                          <th className="pb-3 pr-4">Parking Spot</th>
                          <th className="pb-3 pr-4">Schedule</th>
                          <th className="pb-3 pr-4">Amount</th>
                          <th className="pb-3 pr-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookingRows.filter(({ booking }) => matchesSearch(booking.userId?.name) || matchesSearch(booking.parkingId?.title)).length === 0 ? (
                          <tr><td colSpan="5" className="py-10 text-center text-slate-400 text-sm">No bookings recorded yet.</td></tr>
                        ) : (
                          bookingRows.filter(({ booking }) => matchesSearch(booking.userId?.name) || matchesSearch(booking.parkingId?.title)).map(({ payment, booking }, i) => (
                            <tr key={payment._id} className={`border-b border-slate-100 text-sm ${i % 2 === 1 ? "bg-slate-50/50" : ""}`}>
                              <td className="py-4 pr-4">
                                <div className="font-semibold text-slate-900">{booking.userId?.name || "Unknown"}</div>
                                <div className="text-slate-500 text-xs mt-0.5">{booking.userId?.email}</div>
                              </td>
                              <td className="py-4 pr-4">
                                <div className="font-medium text-slate-700">{booking.parkingId?.title || "Deleted spot"}</div>
                                <div className="text-slate-400 text-xs mt-0.5 truncate max-w-xs">{booking.parkingId?.address}</div>
                              </td>
                              <td className="py-4 pr-4 text-xs text-slate-500 tabular-nums">
                                {booking.startTime ? new Date(booking.startTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—"}
                              </td>
                              <td className="py-4 pr-4 font-semibold text-slate-900 tabular-nums">₹{payment.amount}</td>
                              <td className="py-4 pr-4">
                                <StatusPill tone={booking.status === "completed" ? "green" : booking.status === "cancelled" ? "red" : "amber"}>
                                  {booking.status}
                                </StatusPill>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* PAYMENTS — ledger style */}
              {activeTab === "payments" && (
                <Card className="p-5">
                  <h2 className="text-sm font-semibold text-slate-900 mb-4">Payments Ledger</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 text-xs font-semibold">
                          <th className="pb-3 pr-4">Payment ID</th>
                          <th className="pb-3 pr-4">Driver</th>
                          <th className="pb-3 pr-4">Date</th>
                          <th className="pb-3 pr-4">Amount</th>
                          <th className="pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.filter(p => matchesSearch(p.razorpayPaymentId) || matchesSearch(p.bookingId?.userId?.name)).length === 0 ? (
                          <tr><td colSpan="5" className="py-10 text-center text-slate-400 text-sm">No payment records found.</td></tr>
                        ) : (
                          payments.filter(p => matchesSearch(p.razorpayPaymentId) || matchesSearch(p.bookingId?.userId?.name)).map((pay, i) => (
                            <tr key={pay._id} className={`border-b border-slate-100 text-sm ${i % 2 === 1 ? "bg-slate-50/50" : ""}`}>
                              <td className="py-4 pr-4 font-mono text-xs text-slate-700 tabular-nums">{pay.razorpayPaymentId}</td>
                              <td className="py-4 pr-4">
                                <div className="font-medium text-slate-800">{pay.bookingId?.userId?.name}</div>
                                <div className="text-slate-400 text-xs mt-0.5">{pay.bookingId?.userId?.email}</div>
                              </td>
                              <td className="py-4 pr-4 text-xs text-slate-500 tabular-nums">{new Date(pay.createdAt).toLocaleDateString()}</td>
                              <td className="py-4 pr-4 font-semibold text-slate-900 tabular-nums">₹{pay.amount}</td>
                              <td className="py-4">
                                <StatusPill tone={pay.status === "captured" ? "green" : pay.status === "refund_pending" ? "amber" : "red"}>{pay.status}</StatusPill>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* DISPUTES — refunds, reported listings, driver tickets */}
              {activeTab === "disputes" && (
                <div className="space-y-4">
                  <div className="flex gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
                    {[
                      { id: "refunds", label: "Refund Requests", count: disputes.refundRequests.length },
                      { id: "reported", label: "Reported Listings", count: disputes.reportedListings.length },
                      { id: "tickets", label: "Driver Tickets", count: tickets.filter(t => t.status === "open").length },
                    ].map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => setDisputeSection(sub.id)}
                        className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                          disputeSection === sub.id ? "bg-parking-50 text-parking-700" : "text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        {sub.label}
                        {sub.count > 0 && <span className="ml-2 bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{sub.count}</span>}
                      </button>
                    ))}
                  </div>

                  {disputeSection === "refunds" && (
                    <Card className="p-5">
                      <h3 className="text-sm font-semibold text-slate-900 mb-4">Refund Requests</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-400 text-xs font-semibold">
                              <th className="pb-3 pr-4">Order</th>
                              <th className="pb-3 pr-4">Driver</th>
                              <th className="pb-3 pr-4">Amount</th>
                              <th className="pb-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {disputes.refundRequests.length === 0 ? (
                              <tr><td colSpan="4" className="py-10 text-center text-slate-400 text-sm">No pending refund requests.</td></tr>
                            ) : (
                              disputes.refundRequests.map((req, i) => (
                                <tr key={req._id} className={`border-b border-slate-100 text-sm ${i % 2 === 1 ? "bg-slate-50/50" : ""}`}>
                                  <td className="py-4 pr-4">
                                    <div className="font-mono text-xs text-slate-700 tabular-nums">{req.razorpayOrderId}</div>
                                    <div className="text-slate-400 text-[11px] mt-0.5 font-mono tabular-nums">Payment: {req.razorpayPaymentId}</div>
                                  </td>
                                  <td className="py-4 pr-4">
                                    <div className="font-medium text-slate-800">{req.bookingId?.userId?.name || "Driver"}</div>
                                    <div className="text-slate-400 text-xs">{req.bookingId?.userId?.email}</div>
                                  </td>
                                  <td className="py-4 pr-4 font-semibold text-slate-900 tabular-nums">₹{req.amount}</td>
                                  <td className="py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                      <button onClick={() => handleResolveRefund(req._id, "approve")} className="px-3 py-1.5 bg-parking-50 text-parking-700 rounded-lg hover:bg-parking-600 hover:text-white text-xs font-semibold transition-colors">Approve</button>
                                      <button onClick={() => handleResolveRefund(req._id, "reject")} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white text-xs font-semibold transition-colors">Reject</button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}

                  {disputeSection === "reported" && (
                    <Card className="p-5">
                      <h3 className="text-sm font-semibold text-slate-900 mb-4">Reported Listings</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-400 text-xs font-semibold">
                              <th className="pb-3 pr-4">Listing</th>
                              <th className="pb-3 pr-4">Reports</th>
                              <th className="pb-3 pr-4">Status</th>
                              <th className="pb-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {disputes.reportedListings.length === 0 ? (
                              <tr><td colSpan="4" className="py-10 text-center text-slate-400 text-sm">No reported spots logged.</td></tr>
                            ) : (
                              disputes.reportedListings.map((spot, i) => (
                                <tr key={spot._id} className={`border-b border-slate-100 text-sm ${i % 2 === 1 ? "bg-slate-50/50" : ""}`}>
                                  <td className="py-4 pr-4">
                                    <div className="font-semibold text-slate-900">{spot.title}</div>
                                    <div className="text-slate-400 text-xs mt-0.5 truncate max-w-xs">{spot.address}</div>
                                  </td>
                                  <td className="py-4 pr-4"><StatusPill tone="red">{spot.reports} reports</StatusPill></td>
                                  <td className="py-4 pr-4"><StatusPill tone={spot.isActive ? "green" : "red"}>{spot.isActive ? "Online" : "Suspended"}</StatusPill></td>
                                  <td className="py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                      {spot.isActive ? (
                                        <button onClick={() => handleSuspendSpot(spot._id)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white text-xs font-semibold transition-colors">Suspend</button>
                                      ) : (
                                        <button onClick={() => handleUnsuspendSpot(spot._id)} className="px-3 py-1.5 bg-parking-50 text-parking-700 rounded-lg hover:bg-parking-600 hover:text-white text-xs font-semibold transition-colors">Unsuspend</button>
                                      )}
                                      <button onClick={() => handleDeleteSpot(spot._id)} className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-red-600 hover:text-white text-xs font-semibold transition-colors">Delete</button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}

                  {disputeSection === "tickets" && (
                    <Card className="p-5">
                      <h3 className="text-sm font-semibold text-slate-900 mb-4">Driver Issue Tickets</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-400 text-xs font-semibold">
                              <th className="pb-3 pr-4">Ticket</th>
                              <th className="pb-3 pr-4">Driver</th>
                              <th className="pb-3 pr-4">Spot</th>
                              <th className="pb-3 pr-4">Category</th>
                              <th className="pb-3 pr-4">Status</th>
                              <th className="pb-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tickets.length === 0 ? (
                              <tr><td colSpan="6" className="py-10 text-center text-slate-400 text-sm">No issue tickets logged.</td></tr>
                            ) : (
                              tickets.map((t, i) => {
                                const assocPayment = payments.find(p => p.bookingId?._id === t.bookingId?._id);
                                return (
                                  <tr key={t._id} className={`border-b border-slate-100 text-sm ${i % 2 === 1 ? "bg-slate-50/50" : ""}`}>
                                    <td className="py-4 pr-4">
                                      <div className="font-medium text-slate-800">{t.description}</div>
                                      <div className="text-slate-400 text-[11px] mt-0.5 font-mono tabular-nums">ID: {t._id}</div>
                                      {t.adminNotes && (
                                        <div className="text-amber-700 mt-1 bg-amber-50 p-2 rounded text-xs">
                                          <strong>Notes:</strong> {t.adminNotes}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-4 pr-4">
                                      <div className="font-medium text-slate-800">{t.userId?.name}</div>
                                      <div className="text-slate-400 text-xs">{t.userId?.email}</div>
                                    </td>
                                    <td className="py-4 pr-4">
                                      <div className="font-medium text-slate-700">{t.bookingId?.parkingId?.title || "Deleted spot"}</div>
                                      <div className="text-slate-400 text-xs">{t.bookingId?.parkingId?.address}</div>
                                    </td>
                                    <td className="py-4 pr-4"><StatusPill tone="red">{t.category}</StatusPill></td>
                                    <td className="py-4 pr-4"><StatusPill tone={t.status === "resolved" ? "green" : "amber"}>{t.status}</StatusPill></td>
                                    <td className="py-4 text-right">
                                      <div className="flex justify-end gap-2">
                                        {t.status === "open" && assocPayment && (
                                          <>
                                            <button
                                              onClick={() => {
                                                const notes = prompt("Enter resolution notes (optional):") || "";
                                                handleResolveRefund(assocPayment._id, "approve");
                                                handleUpdateTicket(t._id, "resolved", notes);
                                              }}
                                              className="px-3 py-1.5 bg-parking-50 text-parking-700 rounded-lg hover:bg-parking-600 hover:text-white text-xs font-semibold transition-colors"
                                            >
                                              Approve Refund
                                            </button>
                                            <button
                                              onClick={() => {
                                                const notes = prompt("Enter resolution notes (optional):") || "";
                                                handleResolveRefund(assocPayment._id, "reject");
                                                handleUpdateTicket(t._id, "resolved", notes);
                                              }}
                                              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white text-xs font-semibold transition-colors"
                                            >
                                              Reject Refund
                                            </button>
                                          </>
                                        )}
                                        {t.status === "open" && !assocPayment && (
                                          <button
                                            onClick={() => {
                                              const notes = prompt("Enter resolution notes:") || "";
                                              handleUpdateTicket(t._id, "resolved", notes);
                                            }}
                                            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-xs font-semibold transition-colors"
                                          >
                                            Mark Resolved
                                          </button>
                                        )}
                                        {t.status === "resolved" && <span className="text-slate-400 italic text-xs">Resolved</span>}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* ANALYTICS — system scale + activity, derived from existing metrics/activities */}
              {activeTab === "analytics" && metrics && (
                <div className="space-y-6">
                  <Card className="p-5">
                    <h2 className="text-sm font-semibold text-slate-900 mb-4">System Scale</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-x divide-slate-100">
                      {[
                        { label: "Total Revenue", value: `₹${metrics.totalEarnings?.toLocaleString()}` },
                        { label: "Active Users", value: metrics.activeUsers },
                        { label: "Active Hosts", value: metrics.activeHosts },
                        { label: "Total Bookings", value: metrics.totalBookings },
                      ].map((stat, i) => (
                        <div key={stat.label} className={i === 0 ? "pl-0" : "pl-6"}>
                          <span className="text-[11px] uppercase font-semibold text-slate-400 block mb-1">{stat.label}</span>
                          <span className="text-xl font-semibold text-slate-900 tabular-nums">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-5">
                    <h2 className="text-sm font-semibold text-slate-900 mb-4">Moderation Snapshot</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-x divide-slate-100">
                      {[
                        { label: "Pending Hosts", value: metrics.pendingHostApprovals },
                        { label: "Pending Listings", value: metrics.pendingListingApprovals },
                        { label: "Open Refunds", value: metrics.openRefundRequests },
                        { label: "Reported Listings", value: metrics.reportedListings, danger: true },
                      ].map((stat, i) => (
                        <div key={stat.label} className={i === 0 ? "pl-0" : "pl-6"}>
                          <span className="text-[11px] uppercase font-semibold text-slate-400 block mb-1">{stat.label}</span>
                          <span className={`text-xl font-semibold tabular-nums ${stat.danger ? "text-red-600" : "text-slate-900"}`}>{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-5">
                    <h2 className="text-sm font-semibold text-slate-900 mb-4">Full Activity Log</h2>
                    <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                      {activities.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-sm">No activity logged.</div>
                      ) : (
                        activities.map((act, index) => (
                          <div key={index} className="flex items-center gap-3 text-sm py-2.5 text-slate-600">
                            <span className="text-slate-400 tabular-nums w-16 flex-shrink-0 text-xs">{new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-parking-500 flex-shrink-0"></span>
                            <span className="truncate">{act.message}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {/* SYSTEM HEALTH */}
              {activeTab === "system_health" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">System Diagnostics</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Live service health and integration status</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadAdminData} className="flex items-center gap-1.5 text-xs">
                      <span className="material-symbols-outlined text-[16px]">sync</span>
                      Refresh
                    </Button>
                  </div>

                  {health ? (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: "Active Users", value: health.activeUsers, hint: "Total active drivers/hosts" },
                          { label: "Active Hosts", value: health.activeHosts, hint: "Verified listing hosts" },
                          { label: "Bookings Today", value: health.bookingsToday, hint: "Created since midnight", green: true },
                          { label: "API Uptime", value: `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m`, hint: "Server process duration" },
                        ].map(stat => (
                          <Card key={stat.label} className="p-4">
                            <span className="text-[11px] uppercase font-semibold text-slate-400 block mb-1">{stat.label}</span>
                            <span className={`text-xl font-semibold tabular-nums ${stat.green ? "text-parking-600" : "text-slate-900"}`}>{stat.value}</span>
                            <span className="text-[11px] text-slate-400 block mt-1">{stat.hint}</span>
                          </Card>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Card className="p-5 space-y-3">
                          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-parking-600 text-[18px]">database</span>
                            Database
                          </h3>
                          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                            <span className="text-xs text-slate-500">MongoDB Connection</span>
                            <StatusPill tone={health.dbConnected ? "green" : "red"}>{health.dbConnected ? "Connected" : "Disconnected"}</StatusPill>
                          </div>
                          <p className="text-[11px] text-slate-400">Geospatial indexing: enabled (2dsphere)</p>
                        </Card>

                        <Card className="p-5 space-y-3">
                          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-parking-600 text-[18px]">integration_instructions</span>
                            Integrations
                          </h3>
                          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs">
                            {[
                              { label: "Firebase Auth", ok: health.configChecks?.firebase },
                              { label: "Cloudinary", ok: health.configChecks?.cloudinary },
                              { label: "Razorpay", ok: health.configChecks?.razorpay },
                              { label: "Google Maps", ok: health.configChecks?.googleMaps },
                            ].map(item => (
                              <div key={item.label} className="flex items-center justify-between">
                                <span className="text-slate-500">{item.label}</span>
                                <span className={`w-2.5 h-2.5 rounded-full ${item.ok ? "bg-parking-500" : "bg-red-500"}`}></span>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </div>

                      <Card className="p-5 space-y-4">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">Demo Data Seeder</h3>
                          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                            Seed sample parking spots, reviews, and bookings. Never overwrites or deletes existing accounts or reservations.
                          </p>
                        </div>
                        <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                          <span className="text-xs text-slate-400">Admin-only action</span>
                          <Button variant="primary" size="sm" onClick={handleSeedDemo} disabled={seedingLoading} className="text-xs px-5">
                            {seedingLoading ? "Seeding…" : "Seed Demo Dataset"}
                          </Button>
                        </div>
                      </Card>
                    </>
                  ) : (
                    <Card className="p-10 text-center text-slate-400 text-sm">Failed to load health metrics.</Card>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
