import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Building2, Loader2 } from 'lucide-react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { LISTING_CATEGORIES, type ListingCategory } from '../types/partnerListing';

interface PartnerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

type Mode = 'login' | 'signup';

const inputClass = 'w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition-colors';
const labelClass = 'block text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-2';

export const PartnerAuthModal: React.FC<PartnerAuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [categories, setCategories] = useState<ListingCategory[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleCategory = (cat: ListingCategory) => {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const resetAndClose = () => {
    setBusinessName('');
    setEmail('');
    setPassword('');
    setPhone('');
    setCategories([]);
    setError('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup' && categories.length === 0) {
      setError('Select at least one category you want to list.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(doc(db, 'partners', cred.user.uid), {
          uid: cred.user.uid,
          email: email.trim(),
          businessName: businessName.trim(),
          phone: phone.trim(),
          categories,
          createdAt: serverTimestamp()
        });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      onAuthSuccess();
      resetAndClose();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') setError('An account with this email already exists — try logging in instead.');
      else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') setError('Incorrect email or password.');
      else if (code === 'auth/weak-password') setError('Password should be at least 6 characters.');
      else if (code === 'auth/invalid-email') setError('Please enter a valid email address.');
      else setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={resetAndClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-[#0A0A0A] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl z-10 max-h-[92vh] overflow-y-auto"
        >
          <button
            onClick={resetAndClose}
            className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors cursor-pointer z-20"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 text-[10px] uppercase tracking-[0.35em] font-bold">Partner With Us</span>
            </div>
            <p className="text-white/40 text-[11px] mb-6">List your hotel, shortlet, or car with Elite Booking.</p>

            <div className="flex gap-1.5 mb-6 bg-white/5 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${mode === 'login' ? 'bg-blue-600 text-white' : 'text-white/50 hover:text-white'}`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(''); }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${mode === 'signup' ? 'bg-blue-600 text-white' : 'text-white/50 hover:text-white'}`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className={labelClass}>Business / Owner Name</label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Sunrise Shortlets"
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className={inputClass}
                />
              </div>

              {mode === 'signup' && (
                <>
                  <div>
                    <label className={labelClass}>Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 08012345678"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>What do you want to list?</label>
                    <div className="flex flex-wrap gap-2">
                      {LISTING_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCategory(cat)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            categories.includes(cat) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:border-white/30'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs uppercase tracking-[0.2em] rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'signup' ? 'Create Partner Account' : 'Log In'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
