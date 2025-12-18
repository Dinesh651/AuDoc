
import React, { useState, useEffect } from 'react';
import { createEngagement, getUserEngagements, saveUserProfile, checkAndAcceptInvitations } from './services/db';
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth, googleProvider } from './firebase';
import { Client } from './types';
import ClientOnboardingForm from './components/ClientOnboardingForm';
import AuditDashboard from './components/AuditDashboard';
import LandingPage from './components/LandingPage';
import UserDashboard from './components/UserDashboard';
import { createEngagement, getUserEngagements, saveUserProfile } from './services/db';

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
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);
    if (currentUser) {
      await saveUserProfile(currentUser);
      
      // ADD THIS LINE:
      await checkAndAcceptInvitations(currentUser);
      
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
    try {
      const list = await getUserEngagements(userId);
      setEngagementsList(list);
    } catch (error) {
      console.error("Error fetching engagements:", error);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/unauthorized-domain') {
        const hostname = window.location.hostname;
        alert(`Domain Authentication Error:\n\nThe domain "${hostname}" is not authorized for Google Sign-In.\n\n1. Go to the Firebase Console (https://console.firebase.google.com)\n2. Select your project\n3. Go to Authentication > Settings > Authorized Domains\n4. Add "${hostname}" to the list.`);
      } else if (error.code === 'auth/popup-closed-by-user') {
        // User just closed the popup, ignore
      } else {
        alert(`Login failed: ${error.message}`);
      }
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
    } catch (error: any) {
      console.error("Error creating engagement:", error);
      // Provide more detailed error for debugging
      const errorMessage = error.code === 'PERMISSION_DENIED' 
        ? "Permission denied. Please check Firebase Database Rules." 
        : error.message || "Check your connection.";
      alert(`Failed to create audit engagement: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEngagement = (id: string, clientData: Client) => {
    setEngagementId(id);
    setClient(clientData);
    setView('audit');
  };

  const handleBackToDashboard = () => {
    setView('dashboard');
    // Refresh list to ensure status updates (if any) are reflected
    if (user) fetchEngagements(user.uid);
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
                <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
                    <button 
                        onClick={() => setView('dashboard')} 
                        className="absolute top-6 left-6 text-slate-500 hover:text-slate-800 flex items-center gap-2 font-medium transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                        Back to Dashboard
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
                    onBack={handleBackToDashboard}
                />
            )}
          </>
      )}
    </div>
  );
};

export default App;
