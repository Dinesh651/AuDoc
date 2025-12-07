
import { db } from '../firebase';
import { ref, set, update, onValue, push, get, child } from 'firebase/database';
import { Client } from '../types';
import { User } from 'firebase/auth';

// --- User Management ---

export const saveUserProfile = async (user: User) => {
  const userRef = ref(db, `users/${user.uid}/profile`);
  await update(userRef, {
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    lastLogin: new Date().toISOString()
  });
};

// --- Engagement Management ---

export const createEngagement = async (client: Client, userId: string): Promise<string> => {
  // 1. Get a key for the new engagement
  const newEngagementKey = push(child(ref(db), 'engagements')).key;
  if (!newEngagementKey) throw new Error("Failed to generate engagement key");
  
  const timestamp = new Date().toISOString();

  // 2. Prepare the engagement data (The heavy lifting data)
  const engagementData = {
    client,
    userId,
    status: 'In Progress',
    createdAt: timestamp
  };

  // 3. Prepare the user-specific summary (The User Tree Node)
  // This allows us to list projects without searching the whole database
  const userEngagementSummary = {
    id: newEngagementKey,
    client,
    status: 'In Progress',
    createdAt: timestamp
  };

  // 4. Atomic Update: Fan-out data to both locations simultaneously
  const updates: any = {};
  
  // Path A: Global Engagement Data (where sections like SA 500 live)
  updates[`/engagements/${newEngagementKey}`] = engagementData;
  
  // Path B: User's Personal Engagement Tree (for the dashboard list)
  updates[`/users/${userId}/engagements/${newEngagementKey}`] = userEngagementSummary;

  await update(ref(db), updates);
  
  return newEngagementKey;
};

export const getUserEngagements = async (userId: string): Promise<{ id: string; client: Client; status: string; createdAt: string }[]> => {
  // Fetch directly from the user's tree. No indexing required. Fast and Secure.
  const userEngagementsRef = ref(db, `users/${userId}/engagements`);
  
  const snapshot = await get(userEngagementsRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    // Convert object to array and sort by date
    const engagements = Object.values(data) as { id: string; client: Client; status: string; createdAt: string }[];
    return engagements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return [];
};
// Add after getUserEngagements function
export const processTeamMemberInvitations = async (
  engagementId: string,
  teamMembers: TeamMember[],
  ownerUserId: string
) => {
  const updates: any = {};
  
  for (const member of teamMembers) {
    if (member.email && member.status === 'invited') {
      const emailKey = member.email.toLowerCase().replace(/[.@]/g, '_');
      
      updates[`/invitations/${emailKey}/${engagementId}`] = {
        engagementId,
        invitedBy: ownerUserId,
        invitedAt: member.invitedAt || new Date().toISOString(),
        role: member.role,
        memberName: member.name
      };
    }
  }
  
  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }
};

export const checkAndAcceptInvitations = async (user: User) => {
  const userEmail = user.email?.toLowerCase();
  if (!userEmail) return;

  const emailKey = userEmail.replace(/[.@]/g, '_');
  const invitationsRef = ref(db, `invitations/${emailKey}`);
  const snapshot = await get(invitationsRef);

  if (snapshot.exists()) {
    const invitations = snapshot.val();
    const updates: any = {};

    for (const engagementId in invitations) {
      const invitation = invitations[engagementId];
      
      const engagementRef = ref(db, `engagements/${engagementId}`);
      const engagementSnap = await get(engagementRef);
      
      if (engagementSnap.exists()) {
        const engagementData = engagementSnap.val();
        
        updates[`/users/${user.uid}/engagements/${engagementId}`] = {
          id: engagementId,
          client: engagementData.client,
          status: engagementData.status,
          createdAt: engagementData.createdAt,
          role: invitation.role
        };

        const basicsRef = ref(db, `engagements/${engagementId}/basics/teamMembers`);
        const teamMembersSnapshot = await get(basicsRef);
        if (teamMembersSnapshot.exists()) {
          const teamMembers = teamMembersSnapshot.val();
          if (Array.isArray(teamMembers)) {
            teamMembers.forEach((member: TeamMember, index: number) => {
              if (member.email?.toLowerCase() === userEmail) {
                updates[`/engagements/${engagementId}/basics/teamMembers/${index}/status`] = 'active';
              }
            });
          }
        }
      }
    }

    updates[`/invitations/${emailKey}`] = null;

    if (Object.keys(updates).length > 0) {
      await update(ref(db), updates);
    }
  }
};
// --- Section Data Management (SA 500, etc.) ---

// These remain pointing to the global engagement ID, allowing for potential future collaboration features
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
