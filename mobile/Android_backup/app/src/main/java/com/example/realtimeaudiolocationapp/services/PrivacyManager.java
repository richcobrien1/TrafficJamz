package com.example.realtimeaudiolocationapp.services;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

import java.io.IOException;
import java.security.GeneralSecurityException;

/**
 * Manager class for handling privacy settings and policies
 */
public class PrivacyManager {
    private static final String TAG = "PrivacyManager";
    private static final String ENCRYPTED_PREFS_FILE = "encrypted_privacy_prefs";
    
    // Privacy settings keys
    private static final String KEY_LOCATION_SHARING_ENABLED = "location_sharing_enabled";
    private static final String KEY_AUDIO_SHARING_ENABLED = "audio_sharing_enabled";
    private static final String KEY_BACKGROUND_TRACKING_ENABLED = "background_tracking_enabled";
    private static final String KEY_DATA_COLLECTION_CONSENT = "data_collection_consent";
    private static final String KEY_ANALYTICS_ENABLED = "analytics_enabled";
    
    private static PrivacyManager instance;
    private SharedPreferences encryptedPrefs;
    
    private PrivacyManager(Context context) {
        try {
            // Create or retrieve the master key for encryption/decryption
            MasterKey masterKey = new MasterKey.Builder(context)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build();
            
            // Initialize encrypted SharedPreferences
            encryptedPrefs = EncryptedSharedPreferences.create(
                    context,
                    ENCRYPTED_PREFS_FILE,
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
            
            // Initialize default values if not set
            initializeDefaultValues();
            
        } catch (GeneralSecurityException | IOException e) {
            Log.e(TAG, "Error initializing PrivacyManager: " + e.getMessage());
            // Fallback to regular SharedPreferences if encryption fails
            encryptedPrefs = context.getSharedPreferences(ENCRYPTED_PREFS_FILE, Context.MODE_PRIVATE);
            initializeDefaultValues();
        }
    }
    
    public static synchronized PrivacyManager getInstance(Context context) {
        if (instance == null) {
            instance = new PrivacyManager(context.getApplicationContext());
        }
        return instance;
    }
    
    /**
     * Initialize default privacy settings if not already set
     */
    private void initializeDefaultValues() {
        SharedPreferences.Editor editor = encryptedPrefs.edit();
        
        if (!encryptedPrefs.contains(KEY_LOCATION_SHARING_ENABLED)) {
            editor.putBoolean(KEY_LOCATION_SHARING_ENABLED, true);
        }
        
        if (!encryptedPrefs.contains(KEY_AUDIO_SHARING_ENABLED)) {
            editor.putBoolean(KEY_AUDIO_SHARING_ENABLED, true);
        }
        
        if (!encryptedPrefs.contains(KEY_BACKGROUND_TRACKING_ENABLED)) {
            editor.putBoolean(KEY_BACKGROUND_TRACKING_ENABLED, true);
        }
        
        if (!encryptedPrefs.contains(KEY_DATA_COLLECTION_CONSENT)) {
            editor.putBoolean(KEY_DATA_COLLECTION_CONSENT, false);
        }
        
        if (!encryptedPrefs.contains(KEY_ANALYTICS_ENABLED)) {
            editor.putBoolean(KEY_ANALYTICS_ENABLED, false);
        }
        
        editor.apply();
    }
    
    /**
     * Check if location sharing is enabled
     * @return True if enabled
     */
    public boolean isLocationSharingEnabled() {
        return encryptedPrefs.getBoolean(KEY_LOCATION_SHARING_ENABLED, true);
    }
    
    /**
     * Set location sharing enabled/disabled
     * @param enabled True to enable
     */
    public void setLocationSharingEnabled(boolean enabled) {
        encryptedPrefs.edit().putBoolean(KEY_LOCATION_SHARING_ENABLED, enabled).apply();
    }
    
    /**
     * Check if audio sharing is enabled
     * @return True if enabled
     */
    public boolean isAudioSharingEnabled() {
        return encryptedPrefs.getBoolean(KEY_AUDIO_SHARING_ENABLED, true);
    }
    
    /**
     * Set audio sharing enabled/disabled
     * @param enabled True to enable
     */
    public void setAudioSharingEnabled(boolean enabled) {
        encryptedPrefs.edit().putBoolean(KEY_AUDIO_SHARING_ENABLED, enabled).apply();
    }
    
    /**
     * Check if background tracking is enabled
     * @return True if enabled
     */
    public boolean isBackgroundTrackingEnabled() {
        return encryptedPrefs.getBoolean(KEY_BACKGROUND_TRACKING_ENABLED, true);
    }
    
    /**
     * Set background tracking enabled/disabled
     * @param enabled True to enable
     */
    public void setBackgroundTrackingEnabled(boolean enabled) {
        encryptedPrefs.edit().putBoolean(KEY_BACKGROUND_TRACKING_ENABLED, enabled).apply();
    }
    
    /**
     * Check if user has given consent for data collection
     * @return True if consent given
     */
    public boolean hasDataCollectionConsent() {
        return encryptedPrefs.getBoolean(KEY_DATA_COLLECTION_CONSENT, false);
    }
    
    /**
     * Set data collection consent
     * @param consent True if consent given
     */
    public void setDataCollectionConsent(boolean consent) {
        encryptedPrefs.edit().putBoolean(KEY_DATA_COLLECTION_CONSENT, consent).apply();
    }
    
    /**
     * Check if analytics are enabled
     * @return True if enabled
     */
    public boolean isAnalyticsEnabled() {
        return encryptedPrefs.getBoolean(KEY_ANALYTICS_ENABLED, false);
    }
    
    /**
     * Set analytics enabled/disabled
     * @param enabled True to enable
     */
    public void setAnalyticsEnabled(boolean enabled) {
        encryptedPrefs.edit().putBoolean(KEY_ANALYTICS_ENABLED, enabled).apply();
    }
    
    /**
     * Clear all privacy settings (for account deletion)
     */
    public void clearAllSettings() {
        encryptedPrefs.edit().clear().apply();
        initializeDefaultValues();
    }
}
