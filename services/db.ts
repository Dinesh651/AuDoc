
import { db } from '../firebase';
import { ref, set, update, onValue, push, child, query, orderByChild, equalTo, get } from 'firebase/database';
import { Client } from '../types';

export const createEngagement = async (client: Client, userId: string): Promise<string> => {
  const newEngagementKey = push(child(ref(db), 'engagements')).key;
  if (!newEngagementKey) throw new Error("Failed to generate engagement key");
  
  await set(ref(db, `engagements/${newEngagementKey}/client`), client);
  await set(ref(db, `engagements/${newEngagementKey}/userId`), userId);
  await set(ref(db, `engagements/${newEngagementKey}/status`), 'In Progress');
  await set(ref(db, `engagements/${newEngagementKey}/createdAt`), new Date().toISOString());
  
  return newEngagementKey;
};

export const getUserEngagements = async (userId: string): Promise<{ id: string; client: Client; status: string; createdAt: string }[]> => {
  const engagementsRef = ref(db, 'engagements');
  const userEngagementsQuery = query(engagementsRef, orderByChild('userId'), equalTo(userId));
  
  const snapshot = await get(userEngagementsQuery);
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.keys(data).map(key => ({
      id: key,
      client: data[key].client,
      status: data[key].status || 'In Progress',
      createdAt: data[key].createdAt
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return [];
};

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
