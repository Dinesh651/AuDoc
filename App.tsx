
import React, { useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth, googleProvider } from './firebase';
import { Client } from './types';
import ClientOnboardingForm from './components/ClientOnboardingForm';
import AuditDashboard from './components/AuditDashboard';
import LandingPage from './components/LandingPage';
import UserDashboard from './components/UserDashboard';
import { createEngagement, getUserEngagements } from './services/db';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Application State
  const [view, setView] = useState<'landing' | 'dashboard' | 'new_engagement' | 'audit'>('landing');
  const [client, setClient] = useState<Client | null>(null);
  const [engagementId, setEngagementId] = useState<string | null>(null);
  const [engagementsList, setEngagementsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Handle Auth Change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchEngagements(currentUser.uid);
        setView('dashboard');
      } else {
        setView('landing');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchEngagements = async (userId: string) => {
    const list = await getUserEngagements(userId);
    setEngagementsList(list);
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
      alert("Login failed. Please try again.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setClient(null);
    setEngagementId(null);
  };

  const handleOnboardClient = async (onboardedClient: Client) => {
    if (!user) return;
    setLoading(true);
    try {
      const id = await createEngagement(onboardedClient, user.uid);
      // Update local list immediately
      await fetchEngagements(user.uid);
      setEngagementId(id);
      setClient(onboardedClient);
      setView('audit');
    } catch (error) {
      console.error("Error creating engagement:", error);
      alert("Failed to create audit engagement. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEngagement = (id: string, clientData: Client) => {
    setEngagementId(id);
    setClient(clientData);
    setView('audit');
  };

  if (authLoading) {
     return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
     );
  }

  return (
    <div className="bg-slate-100 min-h-screen text-slate-800 font-sans">
      {/* Route: Landing Page */}
      {!user && <LandingPage onLogin={handleLogin} />}

      {/* Route: Authenticated User */}
      {user && (
          <>
            {view === 'dashboard' && (
                <UserDashboard 
                    user={user}
                    engagements={engagementsList}
                    onNewEngagement={() => setView('new_engagement')}
                    onSelectEngagement={handleSelectEngagement}
                    onLogout={handleLogout}
                />
            )}

            {view === 'new_engagement' && (
                <div className="min-h-screen flex flex-col items-center justify-center p-4">
                    <button 
                        onClick={() => setView('dashboard')} 
                        className="absolute top-6 left-6 text-slate-500 hover:text-slate-800 flex items-center gap-2"
                    >
                        &larr; Back to Dashboard
                    </button>
                    {loading ? (
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                            <p className="text-slate-600">Setting up your secure audit workspace...</p>
                        </div>
                    ) : (
                        <ClientOnboardingForm onOnboard={handleOnboardClient} />
                    )}
                </div>
            )}

            {view === 'audit' && client && engagementId && (
                <AuditDashboard 
                    client={client} 
                    engagementId={engagementId} 
                    onBack={() => setView('dashboard')}
                />
            )}
          </>
      )}
    </div>
  );
};

export default App;
