
'use server';

// This file is being deprecated in favor of client-side firebase calls from admin components
// to respect Firestore security rules while working in an environment without server credentials.
// The functions are being moved to the respective components:
// - addExercise -> src/app/admin/add-exercise/page.tsx
// - addManyExercises -> src/app/admin/batch-add-exercises/page.tsx
// - update/delete/clean -> src/app/admin/manage-exercises/page.tsx
// This file can be removed in a future cleanup.
