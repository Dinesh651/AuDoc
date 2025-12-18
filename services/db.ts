import { db } from '../firebase';
import { ref, set, update, onValue, push, get, child, remove } from 'firebase/database';
import { Client, TeamMember } from '../types';
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
  const newEngagementKey = push(child(ref(db), 'engagements')).key;
  if (!newEngagementKey) throw new Error("Failed to generate engagement key");
  
  const timestamp = new Date().toISOString();

  const engagementData = {
    client: { ...client, ownerUserId: userId },
    userId,
    status: 'In Progress',
    createdAt: timestamp
  };

  const userEngagementSummary = {
    id: newEngagementKey,
    client: { ...client, ownerUserId: userId },
    status: 'In Progress',
    createdAt: timestamp,
    role: 'owner'
  };

  const updates: any = {};
  updates[`/engagements/${newEngagementKey}`] = engagementData;
  updates[`/users/${userId}/engagements/${newEngagementKey}`] = userEngagementSummary;

  await update(ref(db), updates);
  
  return newEngagementKey;
};

export const getUserEngagements = async (userId: string): Promise<{ id: string; client: Client; status: string; createdAt: string }[]> => {
  const userEngagementsRef = ref(db, `users/${userId}/engagements`);
  
  const snapshot = await get(userEngagementsRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    const engagements = Object.values(data) as { id: string; client: Client; status: string; createdAt: string }[];
    return engagements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return [];
};

// --- Team Member & Invitation Management ---

export const inviteTeamMember = async (
  engagementId: string,
  email: string,
  role: string,
  inviterName: string
): Promise<void> => {
  const emailKey = email.toLowerCase().replace(/[.@]/g, '_');
  const timestamp = new Date().toISOString();

  // Check if user already exists
  const usersRef = ref(db, 'users');
  const usersSnapshot = await get(usersRef);
  let existingUserId: string | null = null;

  if (usersSnapshot.exists()) {
    const users = usersSnapshot.val();
    for (const uid in users) {
      if (users[uid].profile?.email?.toLowerCase() === email.toLowerCase()) {
        existingUserId = uid;
        break;
      }
    }
  }

  const updates: any = {};

  // Create invitation record
  updates[`/invitations/${emailKey}/${engagementId}`] = {
    engagementId,
    email,
    role,
    inviterName,
    invitedAt: timestamp,
    status: 'pending',
    existingUserId
  };

  // If user exists, also add to their pending invitations
  if (existingUserId) {
    updates[`/users/${existingUserId}/pendingInvitations/${engagementId}`] = {
      engagementId,
      role,
      inviterName,
      invitedAt: timestamp
    };
  }

  await update(ref(db), updates);
};

export const checkAndAcceptInvitations = async (user: User) => {
  const userEmail = user.email?.toLowerCase();
  if (!userEmail) return;

  const emailKey = userEmail.replace(/[.@]/g, '_');
  const invitationsRef = ref(db, `invitations/${emailKey}`);
  const snapshot = await get(invitationsRef);

  if (!snapshot.exists()) return;

  const invitations = snapshot.val();
  const updates: any = {};

  for (const engagementId in invitations) {
    const invitation = invitations[engagementId];
    
    // Get engagement data
    const engagementRef = ref(db, `engagements/${engagementId}`);
    const engagementSnap = await get(engagementRef);
    
    if (engagementSnap.exists()) {
      const engagementData = engagementSnap.val();
      
      // Add engagement to user's list
      updates[`/users/${user.uid}/engagements/${engagementId}`] = {
        id: engagementId,
        client: engagementData.client,
        status: engagementData.status,
        createdAt: engagementData.createdAt,
        role: invitation.role
      };

      // Update team member status in basics section if exists
      const basicsRef = ref(db, `engagements/${engagementId}/basics/teamMembers`);
      const teamMembersSnapshot = await get(basicsRef);
      
      if (teamMembersSnapshot.exists()) {
        const teamMembers = teamMembersSnapshot.val();
        if (Array.isArray(teamMembers)) {
          teamMembers.forEach((member: any, index: number) => {
            if (member.email?.toLowerCase() === userEmail && member.status === 'invited') {
              updates[`/engagements/${engagementId}/basics/teamMembers/${index}/status`] = 'active';
              updates[`/engagements/${engagementId}/basics/teamMembers/${index}/userId`] = user.uid;
            }
          });
        }
      }
    }
  }

  // Remove processed invitations
  updates[`/invitations/${emailKey}`] = null;
  updates[`/users/${user.uid}/pendingInvitations`] = null;

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }
};

export const getTeamMembers = async (engagementId: string): Promise<TeamMember[]> => {
  const teamMembersRef = ref(db, `engagements/${engagementId}/basics/teamMembers`);
  const snapshot = await get(teamMembersRef);
  
  if (snapshot.exists()) {
    const data = snapshot.val();
    if (Array.isArray(data)) {
      return data.map((member, index) => ({
        ...member,
        id: member.id || `member-${index}`
      }));
    }
  }
  return [];
};

export const getPendingInvitations = async (engagementId: string): Promise<any[]> => {
  const invitationsRef = ref(db, 'invitations');
  const snapshot = await get(invitationsRef);
  
  if (!snapshot.exists()) return [];
  
  const pending: any[] = [];
  const invitations = snapshot.val();
  
  for (const emailKey in invitations) {
    const userInvitations = invitations[emailKey];
    if (userInvitations[engagementId]) {
      const invitation = userInvitations[engagementId];
      if (invitation.status === 'pending') {
        pending.push({
          id: `${emailKey}-${engagementId}`,
          emailKey,
          ...invitation
        });
      }
    }
  }
  
  return pending;
};

export const saveTeamMembers = async (engagementId: string, teamMembers: TeamMember[]): Promise<void> => {
  const teamMembersRef = ref(db, `engagements/${engagementId}/basics/teamMembers`);
  await set(teamMembersRef, teamMembers);
};

export const removeTeamMember = async (engagementId: string, memberIndex: number): Promise<void> => {
  const teamMembersRef = ref(db, `engagements/${engagementId}/basics/teamMembers`);
  const snapshot = await get(teamMembersRef);
  
  if (snapshot.exists()) {
    const teamMembers = snapshot.val();
    if (Array.isArray(teamMembers)) {
      teamMembers.splice(memberIndex, 1);
      await set(teamMembersRef, teamMembers);
    }
  }
};

export const cancelInvitation = async (emailKey: string, engagementId: string): Promise<void> => {
  const invitationRef = ref(db, `invitations/${emailKey}/${engagementId}`);
  await remove(invitationRef);
};

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
        memberName: member.name,
        email: member.email,
        status: 'pending'
      };
    }
  }
  
  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }
};

// --- Section Data Management (SA 500, etc.) ---

export const updateSectionData = async (engagementId: string, section: string, data: any) => {
  const sectionRef = ref(db, `engagements/${engagementId}/${section}`);
  try {
    await update(sectionRef, data);
  } catch (error) {
    console.error(`Error updating ${section}:`, error);
    throw error;
  }
};

export const setSectionData = async (engagementId: string, section: string, data: any) => {
    const sectionRef = ref(db, `engagements/${engagementId}/${section}`);
    try {
        await set(sectionRef, data);
    } catch (error) {
        console.error(`Error saving to ${section}:`, error);
        throw error;
    }
};

export const subscribeToSection = (engagementId: string, section: string, callback: (data: any) => void) => {
  const sectionRef = ref(db, `engagements/${engagementId}/${section}`);
  const unsubscribe = onValue(sectionRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
  return unsubscribe;
};
