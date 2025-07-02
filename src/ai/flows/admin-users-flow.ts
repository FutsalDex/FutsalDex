
'use server';
/**
 * @fileOverview A flow for fetching user data for the admin panel.
 * This flow is intended to be called by an admin user. It fetches all
 * user documents from the 'usuarios' collection.
 * - getAllUsers - Fetches a list of all users from Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';

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
