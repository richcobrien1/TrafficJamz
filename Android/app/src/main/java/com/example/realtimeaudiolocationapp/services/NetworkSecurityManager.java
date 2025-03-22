package com.example.realtimeaudiolocationapp.services;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.util.Log;

import androidx.annotation.NonNull;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Proxy;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.concurrent.TimeUnit;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSession;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

import okhttp3.CertificatePinner;
import okhttp3.ConnectionSpec;
import okhttp3.Interceptor;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

/**
 * Manager class for handling network security features
 */
public class NetworkSecurityManager {
    private static final String TAG = "NetworkSecurityManager";
    
    // Certificate pinning (example values - would be replaced with actual certificate hashes)
    private static final String HOSTNAME = "api.example.com";
    private static final String[] CERTIFICATE_PINS = {
            "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB="
    };
    
    private static NetworkSecurityManager instance;
    private final Context context;
    private OkHttpClient secureClient;
    private ConnectivityManager connectivityManager;
    private boolean isNetworkAvailable = false;
    
    private NetworkSecurityManager(Context context) {
        this.context = context.getApplicationContext();
        this.connectivityManager = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        setupNetworkCallback();
        buildSecureClient();
    }
    
    public static synchronized NetworkSecurityManager getInstance(Context context) {
        if (instance == null) {
            instance = new NetworkSecurityManager(context);
        }
        return instance;
    }
    
    /**
     * Set up network callback to monitor connectivity changes
     */
    private void setupNetworkCallback() {
        NetworkRequest networkRequest = new NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build();
        
        connectivityManager.registerNetworkCallback(networkRequest, new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(@NonNull Network network) {
                isNetworkAvailable = true;
                Log.d(TAG, "Network available");
            }
            
            @Override
            public void onLost(@NonNull Network network) {
                isNetworkAvailable = false;
                Log.d(TAG, "Network lost");
            }
        });
        
        // Check current network state
        Network activeNetwork = connectivityManager.getActiveNetwork();
        if (activeNetwork != null) {
            NetworkCapabilities capabilities = connectivityManager.getNetworkCapabilities(activeNetwork);
            isNetworkAvailable = capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
        } else {
            isNetworkAvailable = false;
        }
    }
    
    /**
     * Build secure OkHttpClient with certificate pinning and other security features
     */
    private void buildSecureClient() {
        try {
            // Create certificate pinner
            CertificatePinner certificatePinner = new CertificatePinner.Builder()
                    .add(HOSTNAME, CERTIFICATE_PINS)
                    .build();
            
            // Create auth interceptor
            Interceptor authInterceptor = new Interceptor() {
                @Override
                public Response intercept(Chain chain) throws IOException {
                    Request originalRequest = chain.request();
                    
                    // Add auth token if available
                    if (AuthenticationManager.getInstance().isLoggedIn()) {
                        Request.Builder builder = originalRequest.newBuilder()
                                .header("Authorization", "Bearer " + AuthenticationManager.getInstance().getAuthToken());
                        
                        Request newRequest = builder.build();
                        return chain.proceed(newRequest);
                    }
                    
                    return chain.proceed(originalRequest);
                }
            };
            
            // Build secure client
            secureClient = new OkHttpClient.Builder()
                    .certificatePinner(certificatePinner)
                    .connectionSpecs(ConnectionSpec.MODERN_TLS)
                    .followRedirects(false)
                    .followSslRedirects(false)
                    .addInterceptor(authInterceptor)
                    .connectTimeout(30, TimeUnit.SECONDS)
                    .readTimeout(30, TimeUnit.SECONDS)
                    .writeTimeout(30, TimeUnit.SECONDS)
                    .build();
            
        } catch (Exception e) {
            Log.e(TAG, "Error building secure client: " + e.getMessage());
            // Fallback to basic client
            secureClient = new OkHttpClient.Builder()
                    .connectTimeout(30, TimeUnit.SECONDS)
                    .readTimeout(30, TimeUnit.SECONDS)
                    .writeTimeout(30, TimeUnit.SECONDS)
                    .build();
        }
    }
    
    /**
     * Get secure OkHttpClient
     * @return Secure OkHttpClient
     */
    public OkHttpClient getSecureClient() {
        return secureClient;
    }
    
    /**
     * Check if network is available
     * @return True if network is available
     */
    public boolean isNetworkAvailable() {
        return isNetworkAvailable;
    }
    
    /**
     * Create a client with a proxy for secure connections
     * @param proxyHost Proxy host
     * @param proxyPort Proxy port
     * @return OkHttpClient with proxy
     */
    public OkHttpClient createProxyClient(String proxyHost, int proxyPort) {
        Proxy proxy = new Proxy(Proxy.Type.HTTP, new InetSocketAddress(proxyHost, proxyPort));
        
        return secureClient.newBuilder()
                .proxy(proxy)
                .build();
    }
    
    /**
     * Create a client that bypasses SSL verification (for development only)
     * WARNING: This should never be used in production!
     * @return OkHttpClient that bypasses SSL verification
     */
    public OkHttpClient createUnsafeDevClient() {
        try {
            // Create a trust manager that does not validate certificate chains
            final TrustManager[] trustAllCerts = new TrustManager[] {
                    new X509TrustManager() {
                        @Override
                        public void checkClientTrusted(X509Certificate[] chain, String authType) throws CertificateException {
                        }
                        
                        @Override
                        public void checkServerTrusted(X509Certificate[] chain, String authType) throws CertificateException {
                        }
                        
                        @Override
                        public X509Certificate[] getAcceptedIssuers() {
                            return new X509Certificate[]{};
                        }
                    }
            };
            
            // Install the all-trusting trust manager
            final SSLContext sslContext = SSLContext.getInstance("SSL");
            sslContext.init(null, trustAllCerts, new java.security.SecureRandom());
            
            // Create an ssl socket factory with our all-trusting manager
            final SSLSocketFactory sslSocketFactory = sslContext.getSocketFactory();
            
            OkHttpClient.Builder builder = new OkHttpClient.Builder();
            builder.sslSocketFactory(sslSocketFactory, (X509TrustManager)trustAllCerts[0]);
            builder.hostnameVerifier(new HostnameVerifier() {
                @Override
                public boolean verify(String hostname, SSLSession session) {
                    return true;
                }
            });
            
            return builder.build();
        } catch (KeyManagementException | NoSuchAlgorithmException e) {
            Log.e(TAG, "Error creating unsafe client: " + e.getMessage());
            return secureClient;
        }
    }
}
