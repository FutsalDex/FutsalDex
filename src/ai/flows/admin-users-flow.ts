
'use server';
/**
 * @fileOverview A flow for fetching user data for the admin panel.
 * This flow is intended to be called by an admin user. It fetches all
 * user documents from the 'usuarios' collection.
 * - getAllUsers - Fetches a list of all users from Firestore.
 * - updateUserSubscription - Updates a user's subscription status.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

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
  return getAllUsersFlow();
}

const getAllUsersFlow = ai.defineFlow(
  {
    name: 'getAllUsersFlow',
    inputSchema: z.void(),
    outputSchema: GetAllUsersOutputSchema,
  },
  async () => {
    // This server-side flow fetches all user documents.
    // It assumes the execution environment has the necessary permissions.
    const usersCollection = collection(db, "usuarios");
    const q = query(usersCollection, orderBy('email', 'asc'));
    const querySnapshot = await getDocs(q);

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
);


// --- Update User Subscription Flow ---

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
  return updateUserSubscriptionFlow(input);
}

const updateUserSubscriptionFlow = ai.defineFlow(
  {
    name: 'updateUserSubscriptionFlow',
    inputSchema: UpdateSubscriptionInputSchema,
    outputSchema: UpdateSubscriptionOutputSchema,
  },
  async ({ userId, newStatus }) => {
    const userDocRef = doc(db, "usuarios", userId);
    await updateDoc(userDocRef, {
      subscriptionStatus: newStatus,
      updatedAt: serverTimestamp(),
    });
    
    return {
      message: `User subscription status updated to ${newStatus}.`
    };
  }
);
