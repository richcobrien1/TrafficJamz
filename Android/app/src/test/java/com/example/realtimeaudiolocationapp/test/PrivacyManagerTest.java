package com.example.realtimeaudiolocationapp.test;

import android.content.Context;

import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import com.example.realtimeaudiolocationapp.services.PrivacyManager;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

/**
 * Instrumented test for PrivacyManager
 */
@RunWith(AndroidJUnit4.class)
public class PrivacyManagerTest {

    private Context context;
    private PrivacyManager privacyManager;

    @Before
    public void setUp() {
        context = ApplicationProvider.getApplicationContext();
        privacyManager = PrivacyManager.getInstance(context);
        
        // Reset all settings to ensure consistent test state
        privacyManager.clearAllSettings();
    }

    @Test
    public void testLocationSharingSettings() {
        // Default should be enabled
        assertTrue("Location sharing should be enabled by default", 
                privacyManager.isLocationSharingEnabled());
        
        // Disable location sharing
        privacyManager.setLocationSharingEnabled(false);
        
        // Verify setting was changed
        assertFalse("Location sharing should be disabled after setting", 
                privacyManager.isLocationSharingEnabled());
        
        // Re-enable location sharing
        privacyManager.setLocationSharingEnabled(true);
        
        // Verify setting was changed back
        assertTrue("Location sharing should be enabled after setting", 
                privacyManager.isLocationSharingEnabled());
    }

    @Test
    public void testAudioSharingSettings() {
        // Default should be enabled
        assertTrue("Audio sharing should be enabled by default", 
                privacyManager.isAudioSharingEnabled());
        
        // Disable audio sharing
        privacyManager.setAudioSharingEnabled(false);
        
        // Verify setting was changed
        assertFalse("Audio sharing should be disabled after setting", 
                privacyManager.isAudioSharingEnabled());
        
        // Re-enable audio sharing
        privacyManager.setAudioSharingEnabled(true);
        
        // Verify setting was changed back
        assertTrue("Audio sharing should be enabled after setting", 
                privacyManager.isAudioSharingEnabled());
    }

    @Test
    public void testBackgroundTrackingSettings() {
        // Default should be enabled
        assertTrue("Background tracking should be enabled by default", 
                privacyManager.isBackgroundTrackingEnabled());
        
        // Disable background tracking
        privacyManager.setBackgroundTrackingEnabled(false);
        
        // Verify setting was changed
        assertFalse("Background tracking should be disabled after setting", 
                privacyManager.isBackgroundTrackingEnabled());
        
        // Re-enable background tracking
        privacyManager.setBackgroundTrackingEnabled(true);
        
        // Verify setting was changed back
        assertTrue("Background tracking should be enabled after setting", 
                privacyManager.isBackgroundTrackingEnabled());
    }

    @Test
    public void testDataCollectionConsentSettings() {
        // Default should be disabled
        assertFalse("Data collection consent should be disabled by default", 
                privacyManager.hasDataCollectionConsent());
        
        // Enable data collection consent
        privacyManager.setDataCollectionConsent(true);
        
        // Verify setting was changed
        assertTrue("Data collection consent should be enabled after setting", 
                privacyManager.hasDataCollectionConsent());
        
        // Disable data collection consent
        privacyManager.setDataCollectionConsent(false);
        
        // Verify setting was changed back
        assertFalse("Data collection consent should be disabled after setting", 
                privacyManager.hasDataCollectionConsent());
    }

    @Test
    public void testAnalyticsSettings() {
        // Default should be disabled
        assertFalse("Analytics should be disabled by default", 
                privacyManager.isAnalyticsEnabled());
        
        // Enable analytics
        privacyManager.setAnalyticsEnabled(true);
        
        // Verify setting was changed
        assertTrue("Analytics should be enabled after setting", 
                privacyManager.isAnalyticsEnabled());
        
        // Disable analytics
        privacyManager.setAnalyticsEnabled(false);
        
        // Verify setting was changed back
        assertFalse("Analytics should be disabled after setting", 
                privacyManager.isAnalyticsEnabled());
    }

    @Test
    public void testClearAllSettings() {
        // Change all settings from defaults
        privacyManager.setLocationSharingEnabled(false);
        privacyManager.setAudioSharingEnabled(false);
        privacyManager.setBackgroundTrackingEnabled(false);
        privacyManager.setDataCollectionConsent(true);
        privacyManager.setAnalyticsEnabled(true);
        
        // Verify settings were changed
        assertFalse(privacyManager.isLocationSharingEnabled());
        assertFalse(privacyManager.isAudioSharingEnabled());
        assertFalse(privacyManager.isBackgroundTrackingEnabled());
        assertTrue(privacyManager.hasDataCollectionConsent());
        assertTrue(privacyManager.isAnalyticsEnabled());
        
        // Clear all settings
        privacyManager.clearAllSettings();
        
        // Verify settings were reset to defaults
        assertTrue("Location sharing should be reset to enabled", 
                privacyManager.isLocationSharingEnabled());
        assertTrue("Audio sharing should be reset to enabled", 
                privacyManager.isAudioSharingEnabled());
        assertTrue("Background tracking should be reset to enabled", 
                privacyManager.isBackgroundTrackingEnabled());
        assertFalse("Data collection consent should be reset to disabled", 
                privacyManager.hasDataCollectionConsent());
        assertFalse("Analytics should be reset to disabled", 
                privacyManager.isAnalyticsEnabled());
    }
}
