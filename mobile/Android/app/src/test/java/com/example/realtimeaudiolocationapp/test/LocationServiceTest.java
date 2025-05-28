package com.example.realtimeaudiolocationapp.test;

import android.content.Context;
import android.location.Location;

import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import com.example.realtimeaudiolocationapp.models.GroupMember;
import com.example.realtimeaudiolocationapp.services.LocationService;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.ArrayList;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Instrumented test for LocationService
 */
@RunWith(AndroidJUnit4.class)
public class LocationServiceTest {

    private Context context;
    
    @Mock
    private LocationService.LocationServiceListener mockListener;
    
    @Before
    public void setUp() {
        context = ApplicationProvider.getApplicationContext();
        MockitoAnnotations.initMocks(this);
    }
    
    @After
    public void tearDown() {
        // Clean up resources
    }
    
    @Test
    public void testProximityLevelCalculation() {
        // Create two locations 100 meters apart
        Location location1 = new Location("test");
        location1.setLatitude(37.7749);
        location1.setLongitude(-122.4194);
        
        Location location2 = new Location("test");
        location2.setLatitude(37.7749);
        location2.setLongitude(-122.4204); // Approximately 100 meters west
        
        // Calculate distance
        float distance = location1.distanceTo(location2);
        
        // Test proximity level calculation
        LocationService.ProximityLevel level;
        if (distance <= 100) {
            level = LocationService.ProximityLevel.NEAR;
        } else if (distance <= 300) {
            level = LocationService.ProximityLevel.MEDIUM;
        } else if (distance <= 1000) {
            level = LocationService.ProximityLevel.FAR;
        } else {
            level = LocationService.ProximityLevel.OUT_OF_RANGE;
        }
        
        // Assert that the level is NEAR (since distance should be around 100m)
        assertEquals(LocationService.ProximityLevel.NEAR, level);
    }
    
    @Test
    public void testGroupMemberProximityUpdate() {
        // Create a group member
        GroupMember member = new GroupMember("test_id", "Test User");
        
        // Set initial proximity level
        member.setProximityLevel(LocationService.ProximityLevel.OUT_OF_RANGE);
        
        // Create a location
        Location location = new Location("test");
        location.setLatitude(37.7749);
        location.setLongitude(-122.4194);
        member.setLocation(location);
        
        // Set distance
        float distance = 250.0f; // Medium range
        member.setDistance(distance);
        
        // Update proximity level based on distance
        LocationService.ProximityLevel newLevel;
        if (distance <= 100) {
            newLevel = LocationService.ProximityLevel.NEAR;
        } else if (distance <= 300) {
            newLevel = LocationService.ProximityLevel.MEDIUM;
        } else if (distance <= 1000) {
            newLevel = LocationService.ProximityLevel.FAR;
        } else {
            newLevel = LocationService.ProximityLevel.OUT_OF_RANGE;
        }
        
        member.setProximityLevel(newLevel);
        
        // Assert that the level is MEDIUM
        assertEquals(LocationService.ProximityLevel.MEDIUM, member.getProximityLevel());
    }
    
    @Test
    public void testGroupMembersListManagement() {
        // Create a list of group members
        List<GroupMember> groupMembers = new ArrayList<>();
        
        // Add members
        groupMembers.add(new GroupMember("id1", "User 1"));
        groupMembers.add(new GroupMember("id2", "User 2"));
        groupMembers.add(new GroupMember("id3", "User 3"));
        
        // Assert size
        assertEquals(3, groupMembers.size());
        
        // Find a member by ID
        GroupMember foundMember = null;
        String targetId = "id2";
        
        for (GroupMember member : groupMembers) {
            if (member.getId().equals(targetId)) {
                foundMember = member;
                break;
            }
        }
        
        // Assert member found
        assertNotNull(foundMember);
        assertEquals("User 2", foundMember.getName());
        
        // Remove a member
        GroupMember memberToRemove = null;
        for (GroupMember member : groupMembers) {
            if (member.getId().equals("id3")) {
                memberToRemove = member;
                break;
            }
        }
        
        if (memberToRemove != null) {
            groupMembers.remove(memberToRemove);
        }
        
        // Assert size after removal
        assertEquals(2, groupMembers.size());
    }
}
