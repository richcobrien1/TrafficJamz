// jamz-client-vite/src/components/ClerkBackendSync.jsx
// Automatically syncs Clerk authentication with backend JWT system

import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { syncClerkWithBackend, clearBackendTokens } from '../utils/clerkBackendSync';

/**
 * Background component that syncs Clerk authentication with backend
 * Place this inside ClerkProvider in App.jsx
 */
export default function ClerkBackendSync() {
  const { user, isLoaded, isSignedIn } = useUser();
  const syncAttempted = useRef(false);
  const currentUserId = useRef(null);

  useEffect(() => {
    if (!isLoaded) {
      return; // Wait for Clerk to load
    }

    // User signed in - sync with backend
    if (isSignedIn && user) {
      // Only sync if we haven't synced this user yet or user changed
      if (!syncAttempted.current || currentUserId.current !== user.id) {
        console.log('🔄 Clerk user detected, syncing with backend...');
        currentUserId.current = user.id;
        syncAttempted.current = true;
        
        syncClerkWithBackend(user).then(success => {
          if (success) {
            console.log('✅ Clerk-Backend sync completed successfully');
          } else {
            console.warn('⚠️ Clerk-Backend sync failed, API calls may not work');
          }
        });
      }
    } else if (!isSignedIn) {
      // User signed out - clear backend tokens
      if (syncAttempted.current) {
        console.log('🔄 Clerk user signed out, clearing backend tokens');
        clearBackendTokens();
        syncAttempted.current = false;
        currentUserId.current = null;
      }
    }
  }, [isLoaded, isSignedIn, user]);

  return null; // This component doesn't render anything
}
