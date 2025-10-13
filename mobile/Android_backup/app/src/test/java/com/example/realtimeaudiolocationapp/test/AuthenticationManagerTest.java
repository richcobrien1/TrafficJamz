package com.example.realtimeaudiolocationapp.test;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import com.example.realtimeaudiolocationapp.services.AuthenticationManager;
import com.example.realtimeaudiolocationapp.services.SecurityManager;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Instrumented test for AuthenticationManager
 */
@RunWith(AndroidJUnit4.class)
public class AuthenticationManagerTest {

    private Context context;
    
    @Mock
    private AuthenticationManager.AuthCallback mockCallback;
    
    @Before
    public void setUp() {
        context = ApplicationProvider.getApplicationContext();
        MockitoAnnotations.initMocks(this);
        
        // Initialize AuthenticationManager
        AuthenticationManager.init(context);
    }
    
    @Test
    public void testLoginLogout() {
        AuthenticationManager authManager = AuthenticationManager.getInstance();
        
        // Verify initial state
        assertFalse("User should not be logged in initially", authManager.isLoggedIn());
        assertNull("User ID should be null initially", authManager.getUserId());
        assertNull("User name should be null initially", authManager.getUserName());
        
        // Login
        authManager.login("test@example.com", "password", new AuthenticationManager.AuthCallback() {
            @Override
            public void onSuccess() {
                // Verify logged in state
                assertTrue("User should be logged in after login", authManager.isLoggedIn());
                assertNotNull("User ID should not be null after login", authManager.getUserId());
                assertNotNull("User name should not be null after login", authManager.getUserName());
                assertEquals("User name should match expected value", "Test User", authManager.getUserName());
            }
            
            @Override
            public void onError(String message) {
                // This should not be called
                assertFalse("Login should not fail", true);
            }
        });
        
        // Logout
        authManager.logout();
        
        // Verify logged out state
        assertFalse("User should not be logged in after logout", authManager.isLoggedIn());
        assertNull("User ID should be null after logout", authManager.getUserId());
        assertNull("User name should be null after logout", authManager.getUserName());
    }
    
    @Test
    public void testRegistration() {
        AuthenticationManager authManager = AuthenticationManager.getInstance();
        
        // Verify initial state
        assertFalse("User should not be logged in initially", authManager.isLoggedIn());
        
        // Register
        authManager.register("New User", "new@example.com", "password", new AuthenticationManager.AuthCallback() {
            @Override
            public void onSuccess() {
                // Verify registered state
                assertTrue("User should be logged in after registration", authManager.isLoggedIn());
                assertNotNull("User ID should not be null after registration", authManager.getUserId());
                assertNotNull("User name should not be null after registration", authManager.getUserName());
                assertEquals("User name should match registered name", "New User", authManager.getUserName());
            }
            
            @Override
            public void onError(String message) {
                // This should not be called
                assertFalse("Registration should not fail", true);
            }
        });
        
        // Cleanup
        authManager.logout();
    }
    
    @Test
    public void testAuthTokenGeneration() {
        // Login to generate token
        AuthenticationManager authManager = AuthenticationManager.getInstance();
        authManager.login("test@example.com", "password", mockCallback);
        
        // Verify token
        String token = authManager.getAuthToken();
        assertNotNull("Auth token should not be null after login", token);
        
        // Verify token is from SecurityManager
        SecurityManager securityManager = SecurityManager.getInstance();
        String generatedToken = securityManager.generateAuthToken();
        
        // We can't directly compare tokens since they're random,
        // but we can verify they have similar characteristics
        assertEquals("Auth tokens should have same length", 
                generatedToken.length(), token.length());
        
        // Cleanup
        authManager.logout();
    }
}
