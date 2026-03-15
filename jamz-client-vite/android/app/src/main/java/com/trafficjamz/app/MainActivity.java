package com.trafficjamz.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Configure WebView for Clerk UI compatibility
        configureWebView();
    }
    
    @Override
    public void onStart() {
        super.onStart();
        configureWebView();
    }
    
    private void configureWebView() {
        Bridge bridge = this.getBridge();
        if (bridge != null) {
            WebView webView = bridge.getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                
                // Enable features required for Clerk UI
                settings.setJavaScriptEnabled(true);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                
                // Allow third-party cookies (required for Clerk authentication)
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
                android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
                
                // Enable other features for better compatibility
                settings.setAllowFileAccess(true);
                settings.setAllowContentAccess(true);
                settings.setAllowFileAccessFromFileURLs(false);
                settings.setAllowUniversalAccessFromFileURLs(false);
                
                // Cache settings
                settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                
                // Media and content settings
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setGeolocationEnabled(true);
                
                // User agent (ensure modern browser detection)
                String userAgent = settings.getUserAgentString();
                settings.setUserAgentString(userAgent + " TrafficJamz/1.0");
                
                android.util.Log.d("TrafficJamz", "WebView configured for Clerk UI support");
            }
        }
    }
}
