
'use server';

// This file is being deprecated in favor of client-side firebase calls from admin components
// to respect Firestore security rules while working in an environment without server credentials.
// The functions are being moved to the respective components:
// - getAllUsers -> src/app/admin/manage-subscriptions/page.tsx
// - updateUserSubscription -> src/app/admin/manage-subscriptions/page.tsx
// This file can be removed in a future cleanup.

    