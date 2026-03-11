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
      console.log('🔄 ClerkBackendSync: Waiting for Clerk to load...');
      return; // Wait for Clerk to load
    }

    // User signed in - sync with backend
    if (isSignedIn && user) {
      // Check if we already have tokens (skip sync if so)
      const hasToken = !!localStorage.getItem('token');
      if (hasToken) {
        console.log('✅ ClerkBackendSync: Backend tokens already exist, skipping sync');
        return;
      }
      
      console.log('🔄 ClerkBackendSync: User signed in', { userId: user.id, email: user.primaryEmailAddress?.emailAddress });
      
      // Only sync if we haven't synced this user yet or user changed
      if (!syncAttempted.current || currentUserId.current !== user.id) {
        console.log('🔄 Clerk user detected, syncing with backend...');
        currentUserId.current = user.id;
        syncAttempted.current = true;
        
        syncClerkWithBackend(user).then(success => {
          if (success) {
            console.log('✅ Clerk-Backend sync completed successfully');
          } else {
            console.error('❌ Clerk-Backend sync failed, API calls may not work');
          }
        }).catch(error => {
          console.error('❌ Clerk-Backend sync error:', error);
          syncAttempted.current = false; // Allow retry
        });
      } else {
        console.log('✅ ClerkBackendSync: Already synced for user', user.id);
      }
    } else if (!isSignedIn) {
      console.log('🔄 ClerkBackendSync: User not signed in');
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
