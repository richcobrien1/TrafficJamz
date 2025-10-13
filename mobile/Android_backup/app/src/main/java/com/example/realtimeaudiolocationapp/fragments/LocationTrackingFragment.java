package com.example.realtimeaudiolocationapp.fragments;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.location.Location;
import android.os.Bundle;
import android.os.IBinder;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.SeekBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.widget.SwitchCompat;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.realtimeaudiolocationapp.R;
import com.example.realtimeaudiolocationapp.adapters.GroupMemberAdapter;
import com.example.realtimeaudiolocationapp.models.GroupMember;
import com.example.realtimeaudiolocationapp.services.LocationService;
import com.google.android.gms.maps.CameraUpdateFactory;
import com.google.android.gms.maps.GoogleMap;
import com.google.android.gms.maps.OnMapReadyCallback;
import com.google.android.gms.maps.SupportMapFragment;
import com.google.android.gms.maps.model.BitmapDescriptorFactory;
import com.google.android.gms.maps.model.LatLng;
import com.google.android.gms.maps.model.Marker;
import com.google.android.gms.maps.model.MarkerOptions;
import com.google.android.material.floatingactionbutton.FloatingActionButton;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class LocationTrackingFragment extends Fragment implements OnMapReadyCallback, LocationService.LocationServiceListener {

    private static final String TAG = "LocationTrackingFragment";
    private static final String SERVER_URL = "wss://example.com/location"; // Replace with actual server URL
    private static final float DEFAULT_ZOOM = 15f;

    // UI Components
    private GoogleMap googleMap;
    private SwitchCompat switchProximityNotifications;
    private SeekBar seekbarProximityThreshold;
    private TextView textProximityThreshold;
    private RecyclerView recyclerGroupMembers;
    private TextView textNoGroupMembers;
    private FloatingActionButton fabMyLocation;
    private FloatingActionButton fabTrackingToggle;

    // Services
    private LocationService locationService;
    private boolean serviceBound = false;

    // Map markers
    private Marker myLocationMarker;
    private final Map<String, Marker> memberMarkers = new HashMap<>();

    // Adapters
    private GroupMemberAdapter groupMemberAdapter;
    private List<GroupMember> groupMembers = new ArrayList<>();

    // Service connection
    private final ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            LocationService.LocationServiceBinder binder = (LocationService.LocationServiceBinder) service;
            locationService = binder.getService();
            locationService.addListener(LocationTrackingFragment.this);
            serviceBound = true;
            
            // Update UI with current service state
            updateConnectionUI(locationService.isConnected());
            updateTrackingUI(locationService.isTrackingEnabled());
            updateSettingsUI(
                    locationService.getProximityThreshold(),
                    locationService.isNotificationsEnabled()
            );
            
            // Load group members
            onGroupMembersChanged(locationService.getGroupMembers());
        }

        @Override
        public void onServiceDisconnected(ComponentName name) {
            locationService = null;
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
        return inflater.inflate(R.layout.fragment_location_tracking, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        
        // Initialize UI components
        switchProximityNotifications = view.findViewById(R.id.switch_proximity_notifications);
        seekbarProximityThreshold = view.findViewById(R.id.seekbar_proximity_threshold);
        textProximityThreshold = view.findViewById(R.id.text_proximity_threshold);
        recyclerGroupMembers = view.findViewById(R.id.recycler_group_members);
        textNoGroupMembers = view.findViewById(R.id.text_no_group_members);
        fabMyLocation = view.findViewById(R.id.fab_my_location);
        fabTrackingToggle = view.findViewById(R.id.fab_tracking_toggle);
        
        // Set up map
        SupportMapFragment mapFragment = (SupportMapFragment) getChildFragmentManager().findFragmentById(R.id.map);
        if (mapFragment != null) {
            mapFragment.getMapAsync(this);
        }
        
        // Set up RecyclerView
        recyclerGroupMembers.setLayoutManager(new LinearLayoutManager(getContext(), LinearLayoutManager.HORIZONTAL, false));
        groupMemberAdapter = new GroupMemberAdapter(groupMembers);
        recyclerGroupMembers.setAdapter(groupMemberAdapter);
        
        // Set up click listeners
        fabMyLocation.setOnClickListener(v -> centerOnMyLocation());
        fabTrackingToggle.setOnClickListener(v -> toggleTracking());
        
        // Set up switch and seekbar
        switchProximityNotifications.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (serviceBound) {
                locationService.setNotificationsEnabled(isChecked);
            }
        });
        
        seekbarProximityThreshold.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
                if (fromUser) {
                    int threshold = progress + 50; // Minimum 50m
                    textProximityThreshold.setText(threshold + " m");
                    if (serviceBound) {
                        locationService.setProximityThreshold(threshold);
                    }
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
        updateTrackingUI(false);
        updateGroupMembersUI();
    }

    @Override
    public void onStart() {
        super.onStart();
        // Bind to LocationService
        Intent intent = new Intent(getActivity(), LocationService.class);
        getActivity().bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE);
    }

    @Override
    public void onStop() {
        super.onStop();
        // Unbind from LocationService
        if (serviceBound) {
            if (locationService != null) {
                locationService.removeListener(this);
            }
            getActivity().unbindService(serviceConnection);
            serviceBound = false;
        }
    }

    @Override
    public void onMapReady(@NonNull GoogleMap googleMap) {
        this.googleMap = googleMap;
        
        // Configure map
        googleMap.setMapType(GoogleMap.MAP_TYPE_NORMAL);
        googleMap.getUiSettings().setZoomControlsEnabled(true);
        googleMap.getUiSettings().setCompassEnabled(true);
        googleMap.getUiSettings().setMyLocationButtonEnabled(false); // We use our own button
        
        // If we already have a location, center on it
        if (serviceBound && locationService.getCurrentLocation() != null) {
            centerOnMyLocation();
        }
    }

    /**
     * Center map on user's current location
     */
    private void centerOnMyLocation() {
        if (googleMap != null && serviceBound && locationService.getCurrentLocation() != null) {
            Location location = locationService.getCurrentLocation();
            LatLng latLng = new LatLng(location.getLatitude(), location.getLongitude());
            googleMap.animateCamera(CameraUpdateFactory.newLatLngZoom(latLng, DEFAULT_ZOOM));
        }
    }

    /**
     * Toggle location tracking
     */
    private void toggleTracking() {
        if (!serviceBound) {
            return;
        }
        
        if (locationService.isTrackingEnabled()) {
            locationService.stopTracking();
        } else {
            locationService.startTracking();
        }
    }

    /**
     * Toggle connection to location server
     */
    private void toggleConnection() {
        if (!serviceBound) {
            return;
        }
        
        if (locationService.isConnected()) {
            locationService.disconnect();
        } else {
            // Start service and connect
            Intent intent = new Intent(getActivity(), LocationService.class);
            getActivity().startService(intent);
            locationService.connect(SERVER_URL);
        }
    }

    /**
     * Update UI based on connection state
     */
    private void updateConnectionUI(boolean connected) {
        if (connected) {
            // Enable controls when connected
            switchProximityNotifications.setEnabled(true);
            seekbarProximityThreshold.setEnabled(true);
            fabTrackingToggle.setEnabled(true);
        } else {
            // Disable controls when disconnected
            switchProximityNotifications.setEnabled(false);
            seekbarProximityThreshold.setEnabled(false);
            fabTrackingToggle.setEnabled(false);
            
            // Clear markers
            if (googleMap != null) {
                for (Marker marker : memberMarkers.values()) {
                    marker.remove();
                }
                memberMarkers.clear();
                
                if (myLocationMarker != null) {
                    myLocationMarker.remove();
                    myLocationMarker = null;
                }
            }
        }
    }

    /**
     * Update UI based on tracking state
     */
    private void updateTrackingUI(boolean tracking) {
        if (tracking) {
            fabTrackingToggle.setImageResource(android.R.drawable.ic_media_pause);
        } else {
            fabTrackingToggle.setImageResource(android.R.drawable.ic_media_play);
        }
    }

    /**
     * Update settings UI based on current state
     */
    private void updateSettingsUI(int proximityThreshold, boolean notificationsEnabled) {
        switchProximityNotifications.setChecked(notificationsEnabled);
        seekbarProximityThreshold.setProgress(proximityThreshold - 50); // Adjust for minimum 50m
        textProximityThreshold.setText(proximityThreshold + " m");
    }

    /**
     * Update group members list UI
     */
    private void updateGroupMembersUI() {
        if (groupMembers.isEmpty()) {
            recyclerGroupMembers.setVisibility(View.GONE);
            textNoGroupMembers.setVisibility(View.VISIBLE);
        } else {
            recyclerGroupMembers.setVisibility(View.VISIBLE);
            textNoGroupMembers.setVisibility(View.GONE);
            groupMemberAdapter.notifyDataSetChanged();
        }
    }

    /**
     * Update map with member locations
     */
    private void updateMap() {
        if (googleMap == null) {
            return;
        }
        
        // Update my location marker
        if (serviceBound && locationService.getCurrentLocation() != null) {
            Location myLocation = locationService.getCurrentLocation();
            LatLng myLatLng = new LatLng(myLocation.getLatitude(), myLocation.getLongitude());
            
            if (myLocationMarker == null) {
                // Create new marker
                myLocationMarker = googleMap.addMarker(new MarkerOptions()
                        .position(myLatLng)
                        .title("Me")
                        .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_BLUE)));
            } else {
                // Update existing marker
                myLocationMarker.setPosition(myLatLng);
            }
        }
        
        // Update group member markers
        for (GroupMember member : groupMembers) {
            if (member.getLocation() != null) {
                LatLng memberLatLng = new LatLng(
                        member.getLocation().getLatitude(),
                        member.getLocation().getLongitude()
                );
                
                Marker marker = memberMarkers.get(member.getId());
                if (marker == null) {
                    // Create new marker
                    float hue;
                    switch (member.getProximityLevel()) {
                        case NEAR:
                            hue = BitmapDescriptorFactory.HUE_RED;
                            break;
                        case MEDIUM:
                            hue = BitmapDescriptorFactory.HUE_YELLOW;
                            break;
                        case FAR:
                            hue = BitmapDescriptorFactory.HUE_GREEN;
                            break;
                        default:
                            hue = BitmapDescriptorFactory.HUE_ORANGE;
                            break;
                    }
                    
                    marker = googleMap.addMarker(new MarkerOptions()
                            .position(memberLatLng)
                            .title(member.getName())
                            .snippet(String.format("%.1f meters away", member.getDistance()))
                            .icon(BitmapDescriptorFactory.defaultMarker(hue)));
                    
                    memberMarkers.put(member.getId(), marker);
                } else {
                    // Update existing marker
                    marker.setPosition(memberLatLng);
                    marker.setSnippet(String.format("%.1f meters away", member.getDistance()));
                    
                    // Update color based on proximity
                    float hue;
                    switch (member.getProximityLevel()) {
                        case NEAR:
                            hue = BitmapDescriptorFactory.HUE_RED;
                            break;
                        case MEDIUM:
                            hue = BitmapDescriptorFactory.HUE_YELLOW;
                            break;
                        case FAR:
                            hue = BitmapDescriptorFactory.HUE_GREEN;
                            break;
                        default:
                            hue = BitmapDescriptorFactory.HUE_ORANGE;
                            break;
                    }
                    marker.setIcon(BitmapDescriptorFactory.defaultMarker(hue));
                }
            }
        }
    }

    // LocationService.LocationServiceListener implementation
    
    @Override
    public void onConnectionStateChanged(boolean connected) {
        updateConnectionUI(connected);
    }

    @Override
    public void onTrackingStateChanged(boolean enabled) {
        updateTrackingUI(enabled);
    }

    @Override
    public void onLocationChanged(Location location) {
        updateMap();
    }

    @Override
    public void onGroupMembersChanged(List<GroupMember> members) {
        groupMembers.clear();
        groupMembers.addAll(members);
        updateGroupMembersUI();
        updateMap();
    }

    @Override
    public void onProximityChanged(GroupMember member, float distance, LocationService.ProximityLevel level) {
        // Update the marker for this member
        updateMap();
        
        // Update the adapter
        groupMemberAdapter.notifyDataSetChanged();
    }

    @Override
    public void onSettingsChanged(int proximityThreshold, boolean notificationsEnabled) {
        updateSettingsUI(proximityThreshold, notificationsEnabled);
    }
}
