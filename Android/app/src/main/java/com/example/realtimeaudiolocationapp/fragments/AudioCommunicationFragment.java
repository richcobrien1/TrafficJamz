package com.example.realtimeaudiolocationapp.fragments;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.IBinder;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.SeekBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.realtimeaudiolocationapp.R;
import com.example.realtimeaudiolocationapp.adapters.ParticipantAdapter;
import com.example.realtimeaudiolocationapp.models.Participant;
import com.example.realtimeaudiolocationapp.services.AudioService;
import com.example.realtimeaudiolocationapp.services.GroupService;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.floatingactionbutton.FloatingActionButton;

import java.util.ArrayList;
import java.util.List;

public class AudioCommunicationFragment extends Fragment implements AudioService.AudioServiceListener {

    private static final String TAG = "AudioCommunicationFragment";
    private static final String SERVER_URL = "wss://example.com/audio"; // Replace with actual server URL

    // UI Components
    private RecyclerView recyclerParticipants;
    private TextView textNoParticipants;
    private TextView textConnectionStatus;
    private ProgressBar progressConnecting;
    private MaterialButton buttonMic;
    private MaterialButton buttonSpeaker;
    private SeekBar seekbarVolume;
    private MaterialButton buttonShareMusic;
    private TextView textCurrentMusic;
    private FloatingActionButton fabConnect;

    // Services
    private AudioService audioService;
    private boolean serviceBound = false;

    // Adapters
    private ParticipantAdapter participantAdapter;
    private List<Participant> participants = new ArrayList<>();

    // Service connection
    private final ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            AudioService.AudioServiceBinder binder = (AudioService.AudioServiceBinder) service;
            audioService = binder.getService();
            audioService.addListener(AudioCommunicationFragment.this);
            serviceBound = true;
            
            // Update UI with current service state
            updateConnectionUI(audioService.isConnected());
            updateAudioControlsUI(
                    audioService.isMicrophoneMuted(),
                    audioService.isSpeakerMuted(),
                    audioService.getCurrentVolume()
            );
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            audioService = null;
            serviceBound = false;
        }
    };

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_audio_communication, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        
        // Initialize UI components
        recyclerParticipants = view.findViewById(R.id.recycler_participants);
        textNoParticipants = view.findViewById(R.id.text_no_participants);
        textConnectionStatus = view.findViewById(R.id.text_connection_status);
        progressConnecting = view.findViewById(R.id.progress_connecting);
        buttonMic = view.findViewById(R.id.button_mic);
        buttonSpeaker = view.findViewById(R.id.button_speaker);
        seekbarVolume = view.findViewById(R.id.seekbar_volume);
        buttonShareMusic = view.findViewById(R.id.button_share_music);
        textCurrentMusic = view.findViewById(R.id.text_current_music);
        fabConnect = view.findViewById(R.id.fab_connect);
        
        // Set up RecyclerView
        recyclerParticipants.setLayoutManager(new LinearLayoutManager(getContext()));
        participantAdapter = new ParticipantAdapter(participants);
        recyclerParticipants.setAdapter(participantAdapter);
        
        // Set up click listeners
        buttonMic.setOnClickListener(v -> toggleMicrophone());
        buttonSpeaker.setOnClickListener(v -> toggleSpeaker());
        buttonShareMusic.setOnClickListener(v -> shareMusic());
        fabConnect.setOnClickListener(v -> toggleConnection());
        
        // Set up seekbar
        seekbarVolume.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
                if (fromUser && serviceBound) {
                    float volume = progress / 100f;
                    audioService.setVolume(volume);
                }
            }

            @Override
            public void onStartTrackingTouch(SeekBar seekBar) {
                // Not needed
            }

            @Override
            public void onStopTrackingTouch(SeekBar seekBar) {
                // Not needed
            }
        });
        
        // Initial UI state
        updateConnectionUI(false);
        updateParticipantsUI();
    }

    @Override
    public void onStart() {
        super.onStart();
        // Bind to AudioService
        Intent intent = new Intent(getActivity(), AudioService.class);
        getActivity().bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE);
    }

    @Override
    public void onStop() {
        super.onStop();
        // Unbind from AudioService
        if (serviceBound) {
            if (audioService != null) {
                audioService.removeListener(this);
            }
            getActivity().unbindService(serviceConnection);
            serviceBound = false;
        }
    }

    /**
     * Toggle microphone mute state
     */
    private void toggleMicrophone() {
        if (serviceBound) {
            boolean newState = !audioService.isMicrophoneMuted();
            audioService.muteMicrophone(newState);
        }
    }

    /**
     * Toggle speaker mute state
     */
    private void toggleSpeaker() {
        if (serviceBound) {
            boolean newState = !audioService.isSpeakerMuted();
            audioService.muteSpeaker(newState);
        }
    }

    /**
     * Share music with group
     */
    private void shareMusic() {
        // Implementation for music selection and sharing
        // This would typically open a file picker and then call audioService.shareMusic()
    }

    /**
     * Toggle connection to audio server
     */
    private void toggleConnection() {
        if (!serviceBound) {
            return;
        }
        
        if (audioService.isConnected()) {
            audioService.disconnect();
        } else {
            // Show connecting state
            textConnectionStatus.setText(R.string.connecting);
            progressConnecting.setVisibility(View.VISIBLE);
            
            // Start service and connect
            Intent intent = new Intent(getActivity(), AudioService.class);
            getActivity().startService(intent);
            audioService.connect(SERVER_URL);
        }
    }

    /**
     * Update UI based on connection state
     */
    private void updateConnectionUI(boolean connected) {
        if (connected) {
            textConnectionStatus.setText(R.string.connected);
            progressConnecting.setVisibility(View.GONE);
            fabConnect.setImageResource(android.R.drawable.ic_menu_close_clear_cancel);
            buttonMic.setEnabled(true);
            buttonSpeaker.setEnabled(true);
            seekbarVolume.setEnabled(true);
            buttonShareMusic.setEnabled(true);
        } else {
            textConnectionStatus.setText(R.string.disconnected);
            progressConnecting.setVisibility(View.GONE);
            fabConnect.setImageResource(android.R.drawable.ic_menu_call);
            buttonMic.setEnabled(false);
            buttonSpeaker.setEnabled(false);
            seekbarVolume.setEnabled(false);
            buttonShareMusic.setEnabled(false);
        }
    }

    /**
     * Update audio control UI based on current state
     */
    private void updateAudioControlsUI(boolean micMuted, boolean speakerMuted, float volume) {
        // Update microphone button
        if (micMuted) {
            buttonMic.setText(R.string.mic_off);
            buttonMic.setIconTintResource(R.color.mic_muted);
        } else {
            buttonMic.setText(R.string.mic_on);
            buttonMic.setIconTintResource(R.color.mic_active);
        }
        
        // Update speaker button
        if (speakerMuted) {
            buttonSpeaker.setText(R.string.speaker_off);
            buttonSpeaker.setIconTintResource(R.color.speaker_muted);
        } else {
            buttonSpeaker.setText(R.string.speaker_on);
            buttonSpeaker.setIconTintResource(R.color.speaker_active);
        }
        
        // Update volume slider
        seekbarVolume.setProgress((int) (volume * 100));
    }

    /**
     * Update participants list UI
     */
    private void updateParticipantsUI() {
        if (participants.isEmpty()) {
            recyclerParticipants.setVisibility(View.GONE);
            textNoParticipants.setVisibility(View.VISIBLE);
        } else {
            recyclerParticipants.setVisibility(View.VISIBLE);
            textNoParticipants.setVisibility(View.GONE);
            participantAdapter.notifyDataSetChanged();
        }
    }

    /**
     * Load participants from group service
     */
    private void loadParticipants() {
        // This would typically come from the GroupService
        // For now, we'll just use placeholder data
        participants.clear();
        
        // Add some dummy participants for UI testing
        if (serviceBound && audioService.isConnected()) {
            participants.add(new Participant("1", "John Doe", true, false));
            participants.add(new Participant("2", "Jane Smith", true, true));
            participants.add(new Participant("3", "Bob Johnson", false, false));
        }
        
        updateParticipantsUI();
    }

    // AudioService.AudioServiceListener implementation
    
    @Override
    public void onConnectionStateChanged(boolean connected) {
        updateConnectionUI(connected);
        loadParticipants();
    }

    @Override
    public void onAudioStateChanged(boolean micMuted, boolean speakerMuted, float volume) {
        updateAudioControlsUI(micMuted, speakerMuted, volume);
    }
}
