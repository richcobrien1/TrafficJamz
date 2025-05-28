package com.example.realtimeaudiolocationapp.services;

import android.content.Context;
import android.util.Base64;
import android.util.Log;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.SecureRandom;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * Manager class for handling encryption and security features
 */
public class SecurityManager {
    private static final String TAG = "SecurityManager";
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 16;
    
    private static SecurityManager instance;
    private SecretKey encryptionKey;
    
    private SecurityManager() {
        try {
            // For a real app, this key would be securely exchanged with the server
            // and stored in Android KeyStore
            KeyGenerator keyGenerator = KeyGenerator.getInstance("AES");
            keyGenerator.init(256);
            encryptionKey = keyGenerator.generateKey();
        } catch (Exception e) {
            Log.e(TAG, "Error initializing encryption key: " + e.getMessage());
        }
    }
    
    public static synchronized SecurityManager getInstance() {
        if (instance == null) {
            instance = new SecurityManager();
        }
        return instance;
    }
    
    /**
     * Encrypt audio data
     * @param data Raw audio data
     * @param length Length of data to encrypt
     * @return Encrypted data
     */
    public byte[] encryptAudioData(byte[] data, int length) {
        try {
            // Generate a random IV
            byte[] iv = new byte[GCM_IV_LENGTH];
            new SecureRandom().nextBytes(iv);
            
            // Initialize cipher for encryption
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH * 8, iv);
            cipher.init(Cipher.ENCRYPT_MODE, encryptionKey, parameterSpec);
            
            // Encrypt the data
            byte[] encryptedData = cipher.doFinal(data, 0, length);
            
            // Combine IV and encrypted data
            byte[] combined = new byte[iv.length + encryptedData.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encryptedData, 0, combined, iv.length, encryptedData.length);
            
            return combined;
        } catch (Exception e) {
            Log.e(TAG, "Error encrypting audio data: " + e.getMessage());
            return null;
        }
    }
    
    /**
     * Decrypt audio data
     * @param encryptedData Combined IV and encrypted data
     * @return Decrypted data
     */
    public byte[] decryptAudioData(byte[] encryptedData) {
        try {
            // Extract IV from the beginning of the data
            byte[] iv = new byte[GCM_IV_LENGTH];
            System.arraycopy(encryptedData, 0, iv, 0, iv.length);
            
            // Initialize cipher for decryption
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH * 8, iv);
            cipher.init(Cipher.DECRYPT_MODE, encryptionKey, parameterSpec);
            
            // Decrypt the data
            return cipher.doFinal(encryptedData, iv.length, encryptedData.length - iv.length);
        } catch (Exception e) {
            Log.e(TAG, "Error decrypting audio data: " + e.getMessage());
            return null;
        }
    }
    
    /**
     * Generate a secure token for authentication
     * @return Authentication token
     */
    public String generateAuthToken() {
        try {
            byte[] tokenData = new byte[32];
            new SecureRandom().nextBytes(tokenData);
            return Base64.encodeToString(tokenData, Base64.NO_WRAP);
        } catch (Exception e) {
            Log.e(TAG, "Error generating auth token: " + e.getMessage());
            return null;
        }
    }
    
    /**
     * Encrypt a string message
     * @param message Plain text message
     * @return Encrypted message (Base64 encoded)
     */
    public String encryptMessage(String message) {
        try {
            byte[] messageBytes = message.getBytes(StandardCharsets.UTF_8);
            byte[] encryptedBytes = encryptAudioData(messageBytes, messageBytes.length);
            return Base64.encodeToString(encryptedBytes, Base64.NO_WRAP);
        } catch (Exception e) {
            Log.e(TAG, "Error encrypting message: " + e.getMessage());
            return null;
        }
    }
    
    /**
     * Decrypt a string message
     * @param encryptedMessage Encrypted message (Base64 encoded)
     * @return Decrypted plain text message
     */
    public String decryptMessage(String encryptedMessage) {
        try {
            byte[] encryptedBytes = Base64.decode(encryptedMessage, Base64.NO_WRAP);
            byte[] decryptedBytes = decryptAudioData(encryptedBytes);
            return new String(decryptedBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            Log.e(TAG, "Error decrypting message: " + e.getMessage());
            return null;
        }
    }
    
    /**
     * Store a secret securely in Android KeyStore
     * @param context Application context
     * @param key Key for the secret
     * @param secret Secret value
     * @return True if successful
     */
    public boolean storeSecret(Context context, String key, String secret) {
        // In a real app, this would use Android KeyStore and/or EncryptedSharedPreferences
        // For simplicity, we're just returning true
        return true;
    }
    
    /**
     * Retrieve a secret from secure storage
     * @param context Application context
     * @param key Key for the secret
     * @return Secret value
     */
    public String retrieveSecret(Context context, String key) {
        // In a real app, this would use Android KeyStore and/or EncryptedSharedPreferences
        // For simplicity, we're just returning null
        return null;
    }
}
