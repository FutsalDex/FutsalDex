
'use server';
/**
 * @fileOverview Server actions for fetching and managing user data for the admin panel.
 * These actions use the Firebase Admin SDK to operate with elevated privileges.
 */

import { z } from 'zod';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: z.string(),
  subscriptionStatus: z.string(),
  updatedAt: z
    .custom<Timestamp>()
    .optional()
    .transform((val) => val?.toMillis()), // Serialize timestamp to number
});

const GetAllUsersOutputSchema = z.array(UserSchema);
export type GetAllUsersOutput = z.infer<typeof GetAllUsersOutputSchema>;

export async function getAllUsers(): Promise<GetAllUsersOutput> {
  const adminDb = getAdminDb();
  const usersCollection = adminDb.collection("usuarios");
  const q = usersCollection.orderBy('email', 'asc');
  const querySnapshot = await q.get();

  const usersList = querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      email: data.email || '',
      role: data.role || 'user',
      subscriptionStatus: data.subscriptionStatus || 'inactive',
      updatedAt: data.updatedAt as Timestamp | undefined,
    };
  });

  return usersList;
}


// --- Update User Subscription ---

const UpdateSubscriptionInputSchema = z.object({
  userId: z.string(),
  newStatus: z.enum(['active', 'inactive']),
});
export type UpdateSubscriptionInput = z.infer<typeof UpdateSubscriptionInputSchema>;

const UpdateSubscriptionOutputSchema = z.object({
  message: z.string(),
});
export type UpdateSubscriptionOutput = z.infer<typeof UpdateSubscriptionOutputSchema>;


export async function updateUserSubscription(input: UpdateSubscriptionInput): Promise<UpdateSubscriptionOutput> {
  const adminDb = getAdminDb();
  const { userId, newStatus } = input;
  const userDocRef = adminDb.collection("usuarios").doc(userId);
  
  await userDocRef.update({
    subscriptionStatus: newStatus,
    updatedAt: FieldValue.serverTimestamp(),
  });
  
  return {
    message: `User subscription status updated to ${newStatus}.`
  };
}
