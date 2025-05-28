package com.example.realtimeaudiolocationapp.services;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import androidx.annotation.NonNull;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.messaging.FirebaseMessaging;

/**
 * Manager class for handling user authentication and authorization
 */
public class AuthenticationManager {
    private static final String TAG = "AuthenticationManager";
    private static final String PREFS_NAME = "auth_prefs";
    private static final String KEY_USER_ID = "user_id";
    private static final String KEY_USER_NAME = "user_name";
    private static final String KEY_AUTH_TOKEN = "auth_token";
    private static final String KEY_FCM_TOKEN = "fcm_token";
    
    private static AuthenticationManager instance;
    private SharedPreferences prefs;
    private String userId;
    private String userName;
    private String authToken;
    private String fcmToken;
    
    private AuthenticationManager(Context context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        loadUserData();
        initializeFCM();
    }
    
    public static synchronized AuthenticationManager getInstance() {
        if (instance == null) {
            throw new IllegalStateException("AuthenticationManager must be initialized with init() before getInstance()");
        }
        return instance;
    }
    
    public static synchronized void init(Context context) {
        if (instance == null) {
            instance = new AuthenticationManager(context.getApplicationContext());
        }
    }
    
    /**
     * Load user data from SharedPreferences
     */
    private void loadUserData() {
        userId = prefs.getString(KEY_USER_ID, null);
        userName = prefs.getString(KEY_USER_NAME, null);
        authToken = prefs.getString(KEY_AUTH_TOKEN, null);
        fcmToken = prefs.getString(KEY_FCM_TOKEN, null);
    }
    
    /**
     * Initialize Firebase Cloud Messaging
     */
    private void initializeFCM() {
        FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(new OnCompleteListener<String>() {
                    @Override
                    public void onComplete(@NonNull Task<String> task) {
                        if (!task.isSuccessful()) {
                            Log.w(TAG, "Fetching FCM registration token failed", task.getException());
                            return;
                        }
                        
                        // Get new FCM registration token
                        String token = task.getResult();
                        fcmToken = token;
                        prefs.edit().putString(KEY_FCM_TOKEN, token).apply();
                        
                        // If user is logged in, update token on server
                        if (isLoggedIn()) {
                            updateFCMTokenOnServer(token);
                        }
                    }
                });
    }
    
    /**
     * Update FCM token on server
     * @param token FCM token
     */
    private void updateFCMTokenOnServer(String token) {
        // This would be implemented to send the token to your backend
        // For now, we'll just log it
        Log.d(TAG, "Would update FCM token on server: " + token);
    }
    
    /**
     * Check if user is logged in
     * @return True if logged in
     */
    public boolean isLoggedIn() {
        return userId != null && authToken != null;
    }
    
    /**
     * Get user ID
     * @return User ID
     */
    public String getUserId() {
        return userId;
    }
    
    /**
     * Get user name
     * @return User name
     */
    public String getUserName() {
        return userName;
    }
    
    /**
     * Get authentication token
     * @return Auth token
     */
    public String getAuthToken() {
        return authToken;
    }
    
    /**
     * Login user
     * @param email User email
     * @param password User password
     * @param callback Callback for login result
     */
    public void login(String email, String password, AuthCallback callback) {
        // This would be implemented to authenticate with your backend
        // For now, we'll simulate a successful login
        
        // Generate a secure token using SecurityManager
        String token = SecurityManager.getInstance().generateAuthToken();
        
        // Simulate user data
        String id = "user_123";
        String name = "Test User";
        
        // Save user data
        saveUserData(id, name, token);
        
        // Update FCM token on server
        if (fcmToken != null) {
            updateFCMTokenOnServer(fcmToken);
        }
        
        // Callback with success
        callback.onSuccess();
    }
    
    /**
     * Register new user
     * @param name User name
     * @param email User email
     * @param password User password
     * @param callback Callback for registration result
     */
    public void register(String name, String email, String password, AuthCallback callback) {
        // This would be implemented to register with your backend
        // For now, we'll simulate a successful registration
        
        // Generate a secure token using SecurityManager
        String token = SecurityManager.getInstance().generateAuthToken();
        
        // Simulate user data
        String id = "user_" + System.currentTimeMillis();
        
        // Save user data
        saveUserData(id, name, token);
        
        // Update FCM token on server
        if (fcmToken != null) {
            updateFCMTokenOnServer(fcmToken);
        }
        
        // Callback with success
        callback.onSuccess();
    }
    
    /**
     * Save user data to SharedPreferences
     * @param id User ID
     * @param name User name
     * @param token Auth token
     */
    private void saveUserData(String id, String name, String token) {
        userId = id;
        userName = name;
        authToken = token;
        
        prefs.edit()
                .putString(KEY_USER_ID, id)
                .putString(KEY_USER_NAME, name)
                .putString(KEY_AUTH_TOKEN, token)
                .apply();
    }
    
    /**
     * Logout user
     */
    public void logout() {
        userId = null;
        userName = null;
        authToken = null;
        
        prefs.edit()
                .remove(KEY_USER_ID)
                .remove(KEY_USER_NAME)
                .remove(KEY_AUTH_TOKEN)
                .apply();
    }
    
    /**
     * Callback interface for authentication operations
     */
    public interface AuthCallback {
        void onSuccess();
        void onError(String message);
    }
}
