import React, { useContext, useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Button from "./ui/Button";
import Logo from "./Logo";
import { AuthContext } from "../context/AuthContext";
import { socketService } from "../services/socket";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "../services/api";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const accountRef = useRef(null);

  // Connect sockets and fetch notifications when user is available
  useEffect(() => {
    if (user) {
      socketService.connect(user._id);

      const loadNotifications = async () => {
        try {
          const res = await getNotifications();
          setNotifications(res.data);
        } catch (err) {
          console.error("Failed to load notifications", err);
        }
      };
      loadNotifications();

      const handleRealtimeNotification = (newNotif) => {
        setNotifications((prev) => [newNotif, ...prev]);
      };

      socketService.subscribe("notification", handleRealtimeNotification);

      return () => {
        socketService.unsubscribe("notification", handleRealtimeNotification);
      };
    } else {
      socketService.disconnect();
      setNotifications([]);
    }
  }, [user]);

  // Close account dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
        if (accountRef.current && !accountRef.current.contains(event.target)) {
            setAccountDropdownOpen(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountRef]);

  // Close dropdowns on route change
  useEffect(() => {
     setNotificationsOpen(false);
     setAccountDropdownOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error("Error marking notification read", err);
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Error marking all notifications read", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const isActive = (path) => location.pathname === path;

  return (
    <header className="w-full sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="flex justify-between items-center px-6 md:px-10 max-w-screen-2xl mx-auto h-16">
        <div className="flex items-center gap-10">
          <Link to="/">
            <Logo size={30} wordmarkClassName="text-xl font-bold tracking-tight text-slate-900 leading-none" />
          </Link>

          <nav className="hidden md:flex gap-7 text-sm font-medium">
            <Link to="/" className={`${isActive('/') ? 'text-slate-900 border-b-2 border-parking-600' : 'text-slate-500 hover:text-slate-900'} transition-colors pb-1`}>
              Find Parking
            </Link>
            <Link to="/host" className={`${isActive('/host') ? 'text-slate-900 border-b-2 border-parking-600' : 'text-slate-500 hover:text-slate-900'} transition-colors pb-1`}>
              Become a Host
            </Link>
            <Link to="/about" className={`${isActive('/about') ? 'text-slate-900 border-b-2 border-parking-600' : 'text-slate-500 hover:text-slate-900'} transition-colors pb-1`}>
              About
            </Link>
            <Link to="/help" className={`${isActive('/help') ? 'text-slate-900 border-b-2 border-parking-600' : 'text-slate-500 hover:text-slate-900'} transition-colors pb-1`}>
              Help
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4 relative">
          <button
            className="text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center relative w-9 h-9 rounded-full hover:bg-slate-100"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
          >
             <span className="material-symbols-outlined text-[22px]">notifications</span>
             {unreadCount > 0 && (
               <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                 {unreadCount}
               </span>
             )}
          </button>

          <AnimatePresence>
             {notificationsOpen && (
               <motion.div
                 initial={{ opacity: 0, y: 6 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: 6 }}
                 transition={{ duration: 0.15 }}
                 className="absolute top-12 right-0 md:right-28 w-80 bg-white rounded-xl overflow-hidden shadow-xl z-50 border border-slate-200"
               >
                 <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                   <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
                   {unreadCount > 0 && (
                     <button
                       onClick={handleMarkAllRead}
                       className="text-xs font-semibold text-parking-600 hover:underline focus:outline-none"
                     >
                       Mark all read
                     </button>
                   )}
                 </div>
                 <div className="flex flex-col max-h-80 overflow-y-auto">
                   {notifications.length === 0 ? (
                     <div className="p-8 text-center text-slate-400 text-sm">
                       No notifications yet
                     </div>
                   ) : (
                     notifications.map((notif) => {
                       let badgeColor = 'bg-accent-500/10 text-accent-600';
                       let iconName = 'notifications';

                       if (
                         ["booking_confirmed", "payment_success", "host_approved", "listing_approved", "refund_approved"].includes(notif.type)
                       ) {
                         badgeColor = 'bg-parking-50 text-parking-600';
                         iconName = 'check_circle';
                       } else if (
                         ["cancellation", "refund_rejected", "host_alert"].includes(notif.type)
                       ) {
                         badgeColor = 'bg-red-50 text-red-600';
                         iconName = 'cancel';
                       } else if (notif.type === 'review_reminder') {
                         badgeColor = 'bg-amber-50 text-amber-600';
                         iconName = 'rate_review';
                       } else if (notif.type === 'check_in_reminder') {
                         badgeColor = 'bg-slate-100 text-slate-600';
                         iconName = 'directions_car';
                       } else if (notif.type === 'upcoming_booking_reminder') {
                         badgeColor = 'bg-accent-500/10 text-accent-600';
                         iconName = 'schedule';
                       }

                       return (
                         <div
                           key={notif._id}
                           onClick={() => handleMarkRead(notif._id)}
                           className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 flex gap-3 ${!notif.isRead ? 'bg-slate-50/60' : ''}`}
                         >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${badgeColor}`}>
                              <span className="material-symbols-outlined text-[16px]">{iconName}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <p className="text-slate-800 text-sm font-medium truncate">{notif.title}</p>
                                {!notif.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-parking-600 flex-shrink-0 mt-1.5 ml-2"></span>
                                )}
                              </div>
                              <p className="text-slate-500 text-xs mt-0.5 break-words">{notif.message}</p>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                         </div>
                       );
                     })
                   )}
                 </div>
               </motion.div>
             )}
          </AnimatePresence>

          {user ? (
            <div className="relative border-l border-slate-200 pl-4 ml-1" ref={accountRef}>
               <button
                 onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                 className="flex items-center gap-2 group focus:outline-none"
               >
                 <span className="hidden sm:inline-block text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors mr-1">
                   Hi, {user.name.split(' ')[0]} 👋
                 </span>
                 <div className="w-8 h-8 rounded-full bg-parking-600 flex items-center justify-center font-semibold text-white flex-shrink-0 text-sm">
                   {user.name.charAt(0).toUpperCase()}
                 </div>
                 <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-700 transition-colors">arrow_drop_down</span>
               </button>

               <AnimatePresence>
                 {accountDropdownOpen && (
                   <motion.div
                     initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.15 }}
                     className="absolute top-12 right-0 w-64 bg-white rounded-xl overflow-hidden shadow-xl z-50 border border-slate-200 py-2"
                   >
                     <div className="px-4 py-3 border-b border-slate-100 mb-1">
                       <p className="text-slate-900 font-semibold leading-tight">{user.name}</p>
                       <p className="text-xs text-slate-500 truncate">{user.email}</p>
                     </div>

                     <Link to="/dashboard?tab=profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                       <span className="material-symbols-outlined text-[18px]">person</span> Profile
                     </Link>
                     <Link to="/dashboard?tab=bookings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                       <span className="material-symbols-outlined text-[18px]">book_online</span> My Bookings
                     </Link>
                     {user.role === "admin" ? (
                       <Link to="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                         <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span> Admin Console
                       </Link>
                     ) : (
                       <Link to="/host/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                         <span className="material-symbols-outlined text-[18px]">real_estate_agent</span> Host Dashboard
                       </Link>
                     )}

                     <div className="border-t border-slate-100 mt-1 pt-1">
                       <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
                         <span className="material-symbols-outlined text-[18px]">logout</span> Log Out
                       </button>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>
          ) : (
            <div className="ml-1 pl-4 border-l border-slate-200 flex items-center gap-3">
              <Link to="/login" className="hidden md:inline-flex">
                 <Button variant="ghost">Log In</Button>
              </Link>
              <Link to="/signup">
                 <Button variant="primary">Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
