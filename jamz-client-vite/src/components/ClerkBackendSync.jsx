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
    
    // ANDROID FIX: Hide loading fallback once Clerk is loaded
    // This ensures the login page is visible after logout redirect
    const fallback = document.getElementById('loading-fallback');
    if (fallback && fallback.style.display !== 'none') {
      pLog.log('🔄 ClerkBackendSync: Hiding loading fallback (Clerk loaded)');
      fallback.style.display = 'none';
    }

    // User signed in - sync with backend
    if (isSignedIn && user) {
      // Check if we already have tokens AND user data
      const hasToken = !!localStorage.getItem('token');
      const hasUserData = !!localStorage.getItem('user');
      
      // If we have both tokens and user data, verify they're not stale
      if (hasToken && hasUserData) {
        try {
          const cachedUser = JSON.parse(localStorage.getItem('user'));
          // Check if cached user matches Clerk user
          if (cachedUser && cachedUser.clerk_id === user.id) {
            pLog.log('✅ ClerkBackendSync: Valid tokens and user data exist, skipping sync');
            return;
          }
        } catch (e) {
          pLog.log('⚠️ ClerkBackendSync: Error parsing cached user, will re-sync');
        }
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
            // Trigger a storage event so other components know to refresh
            window.dispatchEvent(new Event('storage'));
          } else {
            pLog.log('❌ ClerkBackendSync: Sync failed, API calls may not work');
            syncAttempted.current = false; // Allow retry
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
