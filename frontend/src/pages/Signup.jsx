import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { exchangeFirebaseToken } from '../services/api';
import { signUpWithEmail, signInWithGoogle } from '../services/firebase';
import { AuthContext } from '../context/AuthContext';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Fields cannot be empty");
      return;
    }
    setError('');
    setInfoMessage('');
    setIsLoading(true);

    try {
      const { idToken, emailVerified } = await signUpWithEmail(email, password);
      const res = await exchangeFirebaseToken(idToken, { name, phone });
      login(res.data.token, res.data.user);
      if (!emailVerified) {
        setInfoMessage("We've sent a verification link to your email — you're signed in now, but check your inbox to verify your address.");
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      const { idToken } = await signInWithGoogle();
      const res = await exchangeFirebaseToken(idToken);
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Google sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <div className="flex-1 grid md:grid-cols-2">
        {/* Form panel */}
        <div className="flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
            <p className="text-slate-500 mt-1.5 text-sm">Join ASAP to find and book parking near you.</p>

            {error && (
              <div className="mt-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            {infoMessage && (
              <div className="mt-6 p-3 bg-parking-50 border border-parking-100 text-parking-700 rounded-lg text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">mark_email_unread</span>
                {infoMessage}
              </div>
            )}

            <div className="flex flex-col gap-4 mt-6">
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="flex items-center justify-center gap-3 w-full h-11 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="px-3 text-xs text-slate-400 font-medium uppercase">Or with email</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              <form onSubmit={handleSignup} className="flex flex-col gap-4">
                <Input
                  label="Full Name"
                  type="text"
                  placeholder="John Doe"
                  icon="person"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                />

                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  icon="mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />

                <Input
                  label="Phone Number"
                  type="text"
                  placeholder="+91 99999 99999"
                  icon="call"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  icon="lock"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />

                <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating account…' : 'Sign Up'}
                </Button>
              </form>
            </div>

            <p className="text-center text-sm text-slate-500 mt-8">
              Already have an account? <Link to="/login" className="text-parking-600 hover:underline font-medium">Log In</Link>
            </p>
          </div>
        </div>

        {/* Map / brand panel */}
        <div className="hidden md:flex relative bg-slate-100 items-center justify-center overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=60"
            alt="Parking spot"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-900/30" />
          <div className="relative z-10 text-white text-center px-10">
            <span className="material-symbols-outlined text-5xl">directions_car</span>
            <p className="mt-4 text-lg font-medium max-w-xs mx-auto">List your driveway or garage and start earning in minutes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
