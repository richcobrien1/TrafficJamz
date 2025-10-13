package com.example.realtimeaudiolocationapp.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.media.AudioTrack;
import android.media.MediaRecorder;
import android.os.Binder;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.example.realtimeaudiolocationapp.R;
import com.example.realtimeaudiolocationapp.activities.MainActivity;

import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;

import java.net.URI;
import java.net.URISyntaxException;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class AudioService extends Service {
    private static final String TAG = "AudioService";
    private static final String CHANNEL_ID = "AudioServiceChannel";
    private static final int NOTIFICATION_ID = 1;
    
    // Audio configuration
    private static final int SAMPLE_RATE = 44100;
    private static final int CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO;
    private static final int AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT;
    private static final int BUFFER_SIZE = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT);
    
    // Service state
    private boolean isRunning = false;
    private boolean isConnected = false;
    private boolean isMicrophoneMuted = false;
    private boolean isSpeakerMuted = false;
    private float currentVolume = 0.5f;
    
    // Audio components
    private AudioRecord audioRecord;
    private AudioTrack audioTrack;
    private ExecutorService audioExecutor;
    private WebSocketClient webSocketClient;
    
    // Binder for client communication
    private final IBinder binder = new AudioServiceBinder();
    
    // Listeners
    private final List<AudioServiceListener> listeners = new ArrayList<>();
    
    // Handler for main thread callbacks
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    
    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        audioExecutor = Executors.newFixedThreadPool(2);
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
        disconnect();
        if (audioExecutor != null) {
            audioExecutor.shutdown();
        }
        super.onDestroy();
    }
    
    /**
     * Connect to the audio server and start streaming
     * @param serverUrl WebSocket server URL
     */
    public void connect(String serverUrl) {
        if (isConnected) {
            return;
        }
        
        try {
            // Initialize WebSocket connection
            URI uri = new URI(serverUrl);
            webSocketClient = new WebSocketClient(uri) {
                @Override
                public void onOpen(ServerHandshake handshakedata) {
                    Log.d(TAG, "WebSocket connection opened");
                    isConnected = true;
                    notifyConnectionStateChanged();
                    startAudioStreaming();
                }
                
                @Override
                public void onMessage(String message) {
                    Log.d(TAG, "Received text message: " + message);
                }
                
                @Override
                public void onMessage(ByteBuffer bytes) {
                    if (!isSpeakerMuted) {
                        playAudio(bytes);
                    }
                }
                
                @Override
                public void onClose(int code, String reason, boolean remote) {
                    Log.d(TAG, "WebSocket connection closed: " + reason);
                    isConnected = false;
                    notifyConnectionStateChanged();
                }
                
                @Override
                public void onError(Exception ex) {
                    Log.e(TAG, "WebSocket error: " + ex.getMessage());
                    isConnected = false;
                    notifyConnectionStateChanged();
                }
            };
            
            webSocketClient.connect();
            updateNotification();
            
        } catch (URISyntaxException e) {
            Log.e(TAG, "Invalid server URL: " + e.getMessage());
        }
    }
    
    /**
     * Disconnect from the audio server and stop streaming
     */
    public void disconnect() {
        if (!isConnected) {
            return;
        }
        
        stopAudioStreaming();
        
        if (webSocketClient != null) {
            webSocketClient.close();
            webSocketClient = null;
        }
        
        isConnected = false;
        notifyConnectionStateChanged();
        updateNotification();
    }
    
    /**
     * Start recording and playing audio
     */
    private void startAudioStreaming() {
        if (isRunning) {
            return;
        }
        
        isRunning = true;
        
        // Initialize audio recorder
        audioRecord = new AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                BUFFER_SIZE
        );
        
        // Initialize audio player
        audioTrack = new AudioTrack.Builder()
                .setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build())
                .setAudioFormat(new AudioFormat.Builder()
                        .setSampleRate(SAMPLE_RATE)
                        .setEncoding(AUDIO_FORMAT)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build())
                .setBufferSizeInBytes(BUFFER_SIZE)
                .build();
        
        audioTrack.setVolume(currentVolume);
        audioTrack.play();
        
        // Start recording thread
        audioExecutor.execute(this::recordAudio);
    }
    
    /**
     * Stop recording and playing audio
     */
    private void stopAudioStreaming() {
        isRunning = false;
        
        if (audioRecord != null) {
            if (audioRecord.getState() == AudioRecord.STATE_INITIALIZED) {
                audioRecord.stop();
            }
            audioRecord.release();
            audioRecord = null;
        }
        
        if (audioTrack != null) {
            audioTrack.stop();
            audioTrack.release();
            audioTrack = null;
        }
    }
    
    /**
     * Record audio from microphone and send to server
     */
    private void recordAudio() {
        if (audioRecord == null || audioRecord.getState() != AudioRecord.STATE_INITIALIZED) {
            Log.e(TAG, "AudioRecord not initialized");
            return;
        }
        
        audioRecord.startRecording();
        byte[] buffer = new byte[BUFFER_SIZE];
        
        while (isRunning && isConnected) {
            int bytesRead = audioRecord.read(buffer, 0, buffer.length);
            
            if (bytesRead > 0 && !isMicrophoneMuted && webSocketClient != null && webSocketClient.isOpen()) {
                // Encrypt audio data before sending
                byte[] encryptedData = SecurityManager.getInstance().encryptAudioData(buffer, bytesRead);
                if (encryptedData != null) {
                    webSocketClient.send(ByteBuffer.wrap(encryptedData));
                }
            }
        }
    }
    
    /**
     * Play received audio data
     * @param bytes Audio data buffer
     */
    private void playAudio(ByteBuffer bytes) {
        if (audioTrack == null || !isRunning) {
            return;
        }
        
        // Decrypt audio data before playing
        byte[] encryptedData = new byte[bytes.remaining()];
        bytes.get(encryptedData);
        byte[] decryptedData = SecurityManager.getInstance().decryptAudioData(encryptedData);
        
        if (decryptedData != null) {
            audioTrack.write(decryptedData, 0, decryptedData.length);
        }
    }
    
    /**
     * Mute or unmute the microphone
     * @param mute True to mute, false to unmute
     */
    public void muteMicrophone(boolean mute) {
        isMicrophoneMuted = mute;
        notifyAudioStateChanged();
        updateNotification();
    }
    
    /**
     * Mute or unmute the speaker
     * @param mute True to mute, false to unmute
     */
    public void muteSpeaker(boolean mute) {
        isSpeakerMuted = mute;
        notifyAudioStateChanged();
        updateNotification();
    }
    
    /**
     * Set the speaker volume
     * @param volume Volume level (0.0 to 1.0)
     */
    public void setVolume(float volume) {
        currentVolume = Math.max(0.0f, Math.min(1.0f, volume));
        if (audioTrack != null) {
            audioTrack.setVolume(currentVolume);
        }
        notifyAudioStateChanged();
    }
    
    /**
     * Share music from a local file
     * @param filePath Path to the music file
     */
    public void shareMusic(String filePath) {
        // Implementation for music sharing would go here
        // This would involve reading the music file and sending it through the WebSocket
    }
    
    /**
     * Create the notification channel for Android O and above
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Audio Service Channel",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Channel for Audio Communication Service");
            
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
                "Connected" + (isMicrophoneMuted ? " (Mic Off)" : " (Mic On)") :
                "Disconnected";
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Audio Communication")
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
            for (AudioServiceListener listener : listeners) {
                listener.onConnectionStateChanged(isConnected);
            }
        });
    }
    
    /**
     * Notify listeners of audio state changes
     */
    private void notifyAudioStateChanged() {
        mainHandler.post(() -> {
            for (AudioServiceListener listener : listeners) {
                listener.onAudioStateChanged(isMicrophoneMuted, isSpeakerMuted, currentVolume);
            }
        });
    }
    
    /**
     * Add a listener for service events
     */
    public void addListener(AudioServiceListener listener) {
        if (!listeners.contains(listener)) {
            listeners.add(listener);
        }
    }
    
    /**
     * Remove a listener
     */
    public void removeListener(AudioServiceListener listener) {
        listeners.remove(listener);
    }
    
    /**
     * Get the current connection state
     */
    public boolean isConnected() {
        return isConnected;
    }
    
    /**
     * Get the microphone mute state
     */
    public boolean isMicrophoneMuted() {
        return isMicrophoneMuted;
    }
    
    /**
     * Get the speaker mute state
     */
    public boolean isSpeakerMuted() {
        return isSpeakerMuted;
    }
    
    /**
     * Get the current volume level
     */
    public float getCurrentVolume() {
        return currentVolume;
    }
    
    /**
     * Binder class for client communication
     */
    public class AudioServiceBinder extends Binder {
        public AudioService getService() {
            return AudioService.this;
        }
    }
    
    /**
     * Listener interface for service events
     */
    public interface AudioServiceListener {
        void onConnectionStateChanged(boolean connected);
        void onAudioStateChanged(boolean micMuted, boolean speakerMuted, float volume);
    }
}
