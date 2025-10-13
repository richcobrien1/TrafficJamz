package com.example.realtimeaudiolocationapp.services;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.media.AudioAttributes;
import android.media.SoundPool;
import android.os.Binder;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

import com.example.realtimeaudiolocationapp.R;
import com.example.realtimeaudiolocationapp.activities.MainActivity;
import com.example.realtimeaudiolocationapp.models.GroupMember;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;

public class LocationService extends Service {
    private static final String TAG = "LocationService";
    private static final String CHANNEL_ID = "LocationServiceChannel";
    private static final int NOTIFICATION_ID = 2;
    
    // Location update intervals
    private static final long UPDATE_INTERVAL_MS = 10000; // 10 seconds
    private static final long FASTEST_UPDATE_INTERVAL_MS = 5000; // 5 seconds
    
    // Proximity thresholds (in meters)
    private static final int PROXIMITY_NEAR = 100;
    private static final int PROXIMITY_MEDIUM = 300;
    private static final int PROXIMITY_FAR = 1000;
    
    // Service state
    private boolean isRunning = false;
    private boolean isConnected = false;
    private boolean isTrackingEnabled = true;
    private int proximityThreshold = PROXIMITY_MEDIUM;
    private boolean notificationsEnabled = true;
    
    // Location components
    private FusedLocationProviderClient fusedLocationClient;
    private LocationRequest locationRequest;
    private LocationCallback locationCallback;
    private Location currentLocation;
    
    // WebSocket for location data
    private OkHttpClient client;
    private WebSocket webSocket;
    
    // Group members and their locations
    private final Map<String, GroupMember> groupMembers = new HashMap<>();
    
    // Sound effects for proximity alerts
    private SoundPool soundPool;
    private int soundNear;
    private int soundMedium;
    private int soundFar;
    
    // Binder for client communication
    private final IBinder binder = new LocationServiceBinder();
    
    // Listeners
    private final List<LocationServiceListener> listeners = new ArrayList<>();
    
    // Handler for main thread callbacks
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    
    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        
        // Initialize location client
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        
        // Create location request
        locationRequest = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, UPDATE_INTERVAL_MS)
                .setMinUpdateIntervalMillis(FASTEST_UPDATE_INTERVAL_MS)
                .build();
        
        // Initialize location callback
        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(@NonNull LocationResult locationResult) {
                if (locationResult.getLastLocation() != null) {
                    onNewLocation(locationResult.getLastLocation());
                }
            }
        };
        
        // Initialize OkHttp client for WebSocket
        client = new OkHttpClient.Builder()
                .readTimeout(0, TimeUnit.MILLISECONDS) // Disable timeouts for WebSocket
                .build();
        
        // Initialize sound pool for proximity alerts
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
        
        soundPool = new SoundPool.Builder()
                .setMaxStreams(3)
                .setAudioAttributes(audioAttributes)
                .build();
        
        // Load sound effects (would use actual resources in a real app)
        soundNear = soundPool.load(this, android.R.raw.notification_overlay, 1);
        soundMedium = soundPool.load(this, android.R.raw.notification_overlay, 1);
        soundFar = soundPool.load(this, android.R.raw.notification_overlay, 1);
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(NOTIFICATION_ID, createNotification());
        return START_STICKY;
    }
    
    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }
    
    @Override
    public void onDestroy() {
        stopLocationUpdates();
        disconnectWebSocket();
        if (soundPool != null) {
            soundPool.release();
            soundPool = null;
        }
        super.onDestroy();
    }
    
    /**
     * Start location tracking
     */
    public void startTracking() {
        if (isRunning) {
            return;
        }
        
        isRunning = true;
        isTrackingEnabled = true;
        
        // Request location updates
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper());
            updateNotification();
            notifyTrackingStateChanged();
        }
    }
    
    /**
     * Stop location tracking
     */
    public void stopTracking() {
        if (!isRunning) {
            return;
        }
        
        stopLocationUpdates();
        isTrackingEnabled = false;
        updateNotification();
        notifyTrackingStateChanged();
    }
    
    /**
     * Stop location updates
     */
    private void stopLocationUpdates() {
        isRunning = false;
        fusedLocationClient.removeLocationUpdates(locationCallback);
    }
    
    /**
     * Connect to location server
     * @param serverUrl WebSocket server URL
     */
    public void connect(String serverUrl) {
        if (isConnected) {
            return;
        }
        
        // Create WebSocket request
        Request request = new Request.Builder()
                .url(serverUrl)
                .build();
        
        // Connect WebSocket
        webSocket = client.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(@NonNull okhttp3.WebSocket webSocket, @NonNull Response response) {
                Log.d(TAG, "WebSocket connection opened");
                isConnected = true;
                notifyConnectionStateChanged();
                startTracking();
            }
            
            @Override
            public void onMessage(@NonNull okhttp3.WebSocket webSocket, @NonNull String text) {
                try {
                    // Parse location data from other group members
                    JSONObject json = new JSONObject(text);
                    String memberId = json.getString("id");
                    String memberName = json.getString("name");
                    double latitude = json.getDouble("latitude");
                    double longitude = json.getDouble("longitude");
                    
                    // Update group member location
                    updateGroupMemberLocation(memberId, memberName, latitude, longitude);
                } catch (JSONException e) {
                    Log.e(TAG, "Error parsing location data: " + e.getMessage());
                }
            }
            
            @Override
            public void onClosed(@NonNull okhttp3.WebSocket webSocket, int code, @NonNull String reason) {
                Log.d(TAG, "WebSocket connection closed: " + reason);
                isConnected = false;
                notifyConnectionStateChanged();
            }
            
            @Override
            public void onFailure(@NonNull okhttp3.WebSocket webSocket, @NonNull Throwable t, @Nullable Response response) {
                Log.e(TAG, "WebSocket error: " + t.getMessage());
                isConnected = false;
                notifyConnectionStateChanged();
            }
        });
        
        updateNotification();
    }
    
    /**
     * Disconnect from location server
     */
    public void disconnect() {
        disconnectWebSocket();
        stopTracking();
        updateNotification();
    }
    
    /**
     * Disconnect WebSocket
     */
    private void disconnectWebSocket() {
        if (webSocket != null) {
            webSocket.close(1000, "User disconnected");
            webSocket = null;
        }
        isConnected = false;
        notifyConnectionStateChanged();
    }
    
    /**
     * Handle new location update
     * @param location New location
     */
    private void onNewLocation(Location location) {
        currentLocation = location;
        
        // Send location to server if connected
        if (isConnected && webSocket != null && isTrackingEnabled) {
            try {
                // Create location JSON
                JSONObject locationJson = new JSONObject();
                locationJson.put("id", AuthenticationManager.getInstance().getUserId());
                locationJson.put("name", AuthenticationManager.getInstance().getUserName());
                locationJson.put("latitude", location.getLatitude());
                locationJson.put("longitude", location.getLongitude());
                
                // Encrypt location data
                String encryptedData = SecurityManager.getInstance().encryptMessage(locationJson.toString());
                
                // Send to server
                webSocket.send(encryptedData);
                
                // Check proximity to other group members
                checkProximity();
                
                // Notify listeners
                notifyLocationChanged(location);
            } catch (JSONException e) {
                Log.e(TAG, "Error creating location JSON: " + e.getMessage());
            }
        }
    }
    
    /**
     * Update group member location
     * @param memberId Member ID
     * @param memberName Member name
     * @param latitude Latitude
     * @param longitude Longitude
     */
    private void updateGroupMemberLocation(String memberId, String memberName, double latitude, double longitude) {
        // Skip if it's our own location
        if (memberId.equals(AuthenticationManager.getInstance().getUserId())) {
            return;
        }
        
        // Create or update group member
        GroupMember member = groupMembers.get(memberId);
        if (member == null) {
            member = new GroupMember(memberId, memberName);
            groupMembers.put(memberId, member);
        }
        
        // Update location
        Location location = new Location("server");
        location.setLatitude(latitude);
        location.setLongitude(longitude);
        member.setLocation(location);
        
        // Notify listeners
        notifyGroupMembersChanged();
    }
    
    /**
     * Check proximity to other group members
     */
    private void checkProximity() {
        if (currentLocation == null || !notificationsEnabled) {
            return;
        }
        
        for (GroupMember member : groupMembers.values()) {
            Location memberLocation = member.getLocation();
            if (memberLocation != null) {
                float distance = currentLocation.distanceTo(memberLocation);
                
                // Update distance in member object
                member.setDistance(distance);
                
                // Check if proximity threshold crossed
                ProximityLevel newLevel = getProximityLevel(distance);
                if (member.getProximityLevel() != newLevel) {
                    // Play sound based on new proximity level
                    if (newLevel == ProximityLevel.NEAR) {
                        soundPool.play(soundNear, 1.0f, 1.0f, 1, 0, 1.0f);
                    } else if (newLevel == ProximityLevel.MEDIUM) {
                        soundPool.play(soundMedium, 0.7f, 0.7f, 1, 0, 1.0f);
                    } else if (newLevel == ProximityLevel.FAR) {
                        soundPool.play(soundFar, 0.5f, 0.5f, 1, 0, 1.0f);
                    }
                    
                    // Update proximity level
                    member.setProximityLevel(newLevel);
                    
                    // Notify listeners
                    notifyProximityChanged(member, distance, newLevel);
                }
            }
        }
    }
    
    /**
     * Get proximity level based on distance
     * @param distance Distance in meters
     * @return Proximity level
     */
    private ProximityLevel getProximityLevel(float distance) {
        if (distance <= PROXIMITY_NEAR) {
            return ProximityLevel.NEAR;
        } else if (distance <= PROXIMITY_MEDIUM) {
            return ProximityLevel.MEDIUM;
        } else if (distance <= PROXIMITY_FAR) {
            return ProximityLevel.FAR;
        } else {
            return ProximityLevel.OUT_OF_RANGE;
        }
    }
    
    /**
     * Set proximity threshold
     * @param threshold Threshold in meters
     */
    public void setProximityThreshold(int threshold) {
        proximityThreshold = threshold;
        notifySettingsChanged();
    }
    
    /**
     * Enable or disable proximity notifications
     * @param enabled True to enable, false to disable
     */
    public void setNotificationsEnabled(boolean enabled) {
        notificationsEnabled = enabled;
        notifySettingsChanged();
    }
    
    /**
     * Create the notification channel for Android O and above
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Location Service Channel",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Channel for Location Tracking Service");
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
    
    /**
     * Create the foreground service notification
     */
    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                notificationIntent,
                PendingIntent.FLAG_IMMUTABLE
        );
        
        String contentText = isConnected ? 
                (isTrackingEnabled ? "Tracking active" : "Tracking paused") :
                "Disconnected";
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Location Tracking")
                .setContentText(contentText)
                .setSmallIcon(R.drawable.ic_launcher_foreground)
                .setContentIntent(pendingIntent)
                .build();
    }
    
    /**
     * Update the foreground notification
     */
    private void updateNotification() {
        NotificationManager notificationManager = 
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.notify(NOTIFICATION_ID, createNotification());
        }
    }
    
    /**
     * Notify listeners of connection state changes
     */
    private void notifyConnectionStateChanged() {
        mainHandler.post(() -> {
            for (LocationServiceListener listener : listeners) {
                listener.onConnectionStateChanged(isConnected);
            }
        });
    }
    
    /**
     * Notify listeners of tracking state changes
     */
    private void notifyTrackingStateChanged() {
        mainHandler.post(() -> {
            for (LocationServiceListener listener : listeners) {
                listener.onTrackingStateChanged(isTrackingEnabled);
            }
        });
    }
    
    /**
     * Notify listeners of location changes
     */
    private void notifyLocationChanged(Location location) {
        mainHandler.post(() -> {
            for (LocationServiceListener listener : listeners) {
                listener.onLocationChanged(location);
            }
        });
    }
    
    /**
     * Notify listeners of group members changes
     */
    private void notifyGroupMembersChanged() {
        mainHandler.post(() -> {
            for (LocationServiceListener listener : listeners) {
                listener.onGroupMembersChanged(new ArrayList<>(groupMembers.values()));
            }
        });
    }
    
    /**
     * Notify listeners of proximity changes
     */
    private void notifyProximityChanged(GroupMember member, float distance, ProximityLevel level) {
        mainHandler.post(() -> {
            for (LocationServiceListener listener : listeners) {
                listener.onProximityChanged(member, distance, level);
            }
        });
    }
    
    /**
     * Notify listeners of settings changes
     */
    private void notifySettingsChanged() {
        mainHandler.post(() -> {
            for (LocationServiceListener listener : listeners) {
                listener.onSettingsChanged(proximityThreshold, notificationsEnabled);
            }
        });
    }
    
    /**
     * Add a listener for service events
     */
    public void addListener(LocationServiceListener listener) {
        if (!listeners.contains(listener)) {
            listeners.add(listener);
        }
    }
    
    /**
     * Remove a listener
     */
    public void removeListener(LocationServiceListener listener) {
        listeners.remove(listener);
    }
    
    /**
     * Get the current location
     */
    public Location getCurrentLocation() {
        return currentLocation;
    }
    
    /**
     * Get all group members
     */
    public List<GroupMember> getGroupMembers() {
        return new ArrayList<>(groupMembers.values());
    }
    
    /**
     * Get the current connection state
     */
    public boolean isConnected() {
        return isConnected;
    }
    
    /**
     * Get the tracking state
     */
    public boolean isTrackingEnabled() {
        return isTrackingEnabled;
    }
    
    /**
     * Get the proximity threshold
     */
    public int getProximityThreshold() {
        return proximityThreshold;
    }
    
    /**
     * Get the notifications enabled state
     */
    public boolean isNotificationsEnabled() {
        return notificationsEnabled;
    }
    
    /**
     * Binder class for client communication
     */
    public class LocationServiceBinder extends Binder {
        public LocationService getService() {
            return LocationService.this;
        }
    }
    
    /**
     * Proximity level enum
     */
    public enum ProximityLevel {
        NEAR,
        MEDIUM,
        FAR,
        OUT_OF_RANGE
    }
    
    /**
     * Listener interface for service events
     */
    public interface LocationServiceListener {
        void onConnectionStateChanged(boolean connected);
        void onTrackingStateChanged(boolean enabled);
        void onLocationChanged(Location location);
        void onGroupMembersChanged(List<GroupMember> members);
        void onProximityChanged(GroupMember member, float distance, ProximityLevel level);
        void onSettingsChanged(int proximityThreshold, boolean notificationsEnabled);
    }
}
