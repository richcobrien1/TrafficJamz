package com.example.realtimeaudiolocationapp.models;

import android.location.Location;

import com.example.realtimeaudiolocationapp.services.LocationService.ProximityLevel;

/**
 * Model class representing a group member with location information
 */
public class GroupMember {
    private String id;
    private String name;
    private Location location;
    private float distance;
    private ProximityLevel proximityLevel;
    
    public GroupMember(String id, String name) {
        this.id = id;
        this.name = name;
        this.proximityLevel = ProximityLevel.OUT_OF_RANGE;
    }
    
    public String getId() {
        return id;
    }
    
    public String getName() {
        return name;
    }
    
    public Location getLocation() {
        return location;
    }
    
    public void setLocation(Location location) {
        this.location = location;
    }
    
    public float getDistance() {
        return distance;
    }
    
    public void setDistance(float distance) {
        this.distance = distance;
    }
    
    public ProximityLevel getProximityLevel() {
        return proximityLevel;
    }
    
    public void setProximityLevel(ProximityLevel proximityLevel) {
        this.proximityLevel = proximityLevel;
    }
}
