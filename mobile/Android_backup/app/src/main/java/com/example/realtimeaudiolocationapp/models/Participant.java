package com.example.realtimeaudiolocationapp.models;

/**
 * Model class representing a participant in the audio communication
 */
public class Participant {
    private String id;
    private String name;
    private boolean microphoneActive;
    private boolean speakerMuted;
    
    public Participant(String id, String name, boolean microphoneActive, boolean speakerMuted) {
        this.id = id;
        this.name = name;
        this.microphoneActive = microphoneActive;
        this.speakerMuted = speakerMuted;
    }
    
    public String getId() {
        return id;
    }
    
    public String getName() {
        return name;
    }
    
    public boolean isMicrophoneActive() {
        return microphoneActive;
    }
    
    public void setMicrophoneActive(boolean microphoneActive) {
        this.microphoneActive = microphoneActive;
    }
    
    public boolean isSpeakerMuted() {
        return speakerMuted;
    }
    
    public void setSpeakerMuted(boolean speakerMuted) {
        this.speakerMuted = speakerMuted;
    }
}
