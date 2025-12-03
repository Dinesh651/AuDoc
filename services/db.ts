
import { db } from '../firebase';
import { ref, set, update, onValue, push, get, child, remove } from 'firebase/database';
import { Client, TeamMember } from '../types';
import { User } from 'firebase/auth';

// --- User Management ---

export const saveUserProfile = async (user: User) => {
  const updates: any = {};
  
  // 1. Update Profile
  updates[`users/${user.uid}/profile`] = {
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    lastLogin: new Date().toISOString()
  };

  await update(ref(db), updates);
};

// --- Engagement Management ---

export const createEngagement = async (client: Client, userId: string): Promise<string> => {
  const newEngagementKey = push(child(ref(db), 'engagements')).key;
  if (!newEngagementKey) throw new Error("Failed to generate engagement key");
  
  const timestamp = new Date().toISOString();

  // Engagement Data
  const engagementData = {
    client,
    ownerId: userId, // Store owner
    status: 'In Progress',
    createdAt: timestamp
  };

  // User Summary
  const userEngagementSummary = {
    id: newEngagementKey,
    client,
    status: 'In Progress',
    createdAt: timestamp,
    role: 'Owner'
  };

  const updates: any = {};
  updates[`/engagements/${newEngagementKey}`] = engagementData;
  updates[`/users/${userId}/engagements/${newEngagementKey}`] = userEngagementSummary;

  await update(ref(db), updates);
  
  return newEngagementKey;
};

export const getUserEngagements = async (userId: string): Promise<any[]> => {
  const userEngagementsRef = ref(db, `users/${userId}/engagements`);
  const snapshot = await get(userEngagementsRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    const engagements = Object.values(data) as any[];
    return engagements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return [];
};

// --- Section Data Management ---

export const updateSectionData = (engagementId: string, section: string, data: any) => {
  const sectionRef = ref(db, `engagements/${engagementId}/${section}`);
  return update(sectionRef, data);
};

export const setSectionData = (engagementId: string, section: string, data: any) => {
    const sectionRef = ref(db, `engagements/${engagementId}/${section}`);
    return set(sectionRef, data);
};

export const subscribeToSection = (engagementId: string, section: string, callback: (data: any) => void) => {
  const sectionRef = ref(db, `engagements/${engagementId}/${section}`);
  const unsubscribe = onValue(sectionRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
  return unsubscribe;
};
