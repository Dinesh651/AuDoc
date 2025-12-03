
import { db } from '../firebase';
import { ref, set, update, onValue, push, get, child } from 'firebase/database';
import { Client, TeamMember } from '../types';
import { User } from 'firebase/auth';

// Helper to sanitize email for use as a Firebase key (replace . with ,)
const sanitizeEmail = (email: string) => email.replace(/\./g, ',');

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

  // 2. Update Email Mapping (Allows looking up UID by Email)
  if (user.email) {
    updates[`email_mapping/${sanitizeEmail(user.email)}`] = user.uid;
  }

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

// --- Team Management ---

export const addTeamMemberByEmail = async (
  engagementId: string, 
  client: Client, 
  email: string, 
  name: string, 
  role: string, 
  permission: 'editor' | 'viewer'
): Promise<TeamMember> => {
  const sanitized = sanitizeEmail(email);
  const mappingRef = ref(db, `email_mapping/${sanitized}`);
  const snapshot = await get(mappingRef);

  if (!snapshot.exists()) {
    throw new Error("User with this email has not signed up for AuDoc yet.");
  }

  const targetUserId = snapshot.val();
  const teamMemberId = push(child(ref(db), `engagements/${engagementId}/basics/teamMembers`)).key;

  if (!teamMemberId) throw new Error("Failed to generate ID");

  const newMember: TeamMember = {
    id: teamMemberId,
    name,
    email,
    role,
    permission
  };

  const updates: any = {};

  // 1. Add to Engagement Team List
  updates[`engagements/${engagementId}/basics/teamMembers/${teamMemberId}`] = newMember;

  // 2. Fan-out: Add Engagement to Target User's Dashboard
  updates[`users/${targetUserId}/engagements/${engagementId}`] = {
    id: engagementId,
    client,
    status: 'In Progress', // Default status
    createdAt: new Date().toISOString(),
    role: `${role} (${permission})`
  };

  await update(ref(db), updates);
  return newMember;
};

export const removeTeamMember = async (engagementId: string, memberId: string, memberEmail: string) => {
    // We need to find the user ID to remove it from their dashboard
    const sanitized = sanitizeEmail(memberEmail);
    const mappingRef = ref(db, `email_mapping/${sanitized}`);
    const snapshot = await get(mappingRef);

    const updates: any = {};
    updates[`engagements/${engagementId}/basics/teamMembers/${memberId}`] = null;

    if (snapshot.exists()) {
        const targetUserId = snapshot.val();
        updates[`users/${targetUserId}/engagements/${engagementId}`] = null;
    }

    await update(ref(db), updates);
};


export const checkEngagementPermissions = async (engagementId: string, userId: string): Promise<{ isReadOnly: boolean, isOwner: boolean }> => {
    const engagementRef = ref(db, `engagements/${engagementId}`);
    const snapshot = await get(engagementRef);
    
    if (!snapshot.exists()) return { isReadOnly: true, isOwner: false };
    
    const data = snapshot.val();
    
    // 1. Owner always has full access
    if (data.ownerId === userId) {
        return { isReadOnly: false, isOwner: true };
    }

    // 2. Check Team List
    const teamMembers = data.basics?.teamMembers || {};
    const membersArray = Object.values(teamMembers) as TeamMember[];
    
    // In a real app, we would match by UID, but here we matched by Email in the add process. 
    // However, to be secure, we need to find the *current* user's email to compare.
    // For simplicity in this implementation, we will fetch the current user's profile to get their email.
    
    const userProfileRef = ref(db, `users/${userId}/profile`);
    const profileSnap = await get(userProfileRef);
    if (!profileSnap.exists()) return { isReadOnly: true, isOwner: false };
    
    const userEmail = profileSnap.val().email;

    const memberRecord = membersArray.find(m => m.email === userEmail);

    if (memberRecord) {
        return { 
            isReadOnly: memberRecord.permission === 'viewer', 
            isOwner: false 
        };
    }

    // Default to read-only if not found (or handle as unauthorized)
    return { isReadOnly: true, isOwner: false };
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
