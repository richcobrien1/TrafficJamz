// jamz-client-vite/src/components/ClerkBackendSync.jsx
// Automatically syncs Clerk authentication with backend JWT system

import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { syncClerkWithBackend, clearBackendTokens } from '../utils/clerkBackendSync';
import pLog from '../utils/persistentLogger';

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
      pLog.log('🔄 ClerkBackendSync: Waiting for Clerk to load...');
      return; // Wait for Clerk to load
    }

    // User signed in - sync with backend
    if (isSignedIn && user) {
      // Check if we already have tokens (skip sync if so)
      const hasToken = !!localStorage.getItem('token');
      if (hasToken) {
        pLog.log('✅ ClerkBackendSync: Backend tokens already exist, skipping sync');
        return;
      }
      
      pLog.log('🔄 ClerkBackendSync: User signed in', { userId: user.id, email: user.primaryEmailAddress?.emailAddress });
      
      // Only sync if we haven't synced this user yet or user changed
      if (!syncAttempted.current || currentUserId.current !== user.id) {
        pLog.log('🔄 ClerkBackendSync: Starting sync with backend...');
        currentUserId.current = user.id;
        syncAttempted.current = true;
        
        syncClerkWithBackend(user).then(success => {
          if (success) {
            pLog.log('✅ ClerkBackendSync: Sync completed successfully');
          } else {
            pLog.log('❌ ClerkBackendSync: Sync failed, API calls may not work');
          }
        }).catch(error => {
          pLog.log('❌ ClerkBackendSync: Sync error: ' + error.message);
          syncAttempted.current = false; // Allow retry
        });
      } else {
        pLog.log('✅ ClerkBackendSync: Already synced for user ' + user.id);
      }
    } else if (!isSignedIn) {
      pLog.log('🔄 ClerkBackendSync: User not signed in');
      // User signed out - clear backend tokens
      if (syncAttempted.current) {
        pLog.log('🔄 ClerkBackendSync: Clearing backend tokens...');
        clearBackendTokens();
        syncAttempted.current = false;
        currentUserId.current = null;
      }
    }
  }, [isLoaded, isSignedIn, user]);

  return null; // This component doesn't render anything
}
