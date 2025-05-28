package com.example.realtimeaudiolocationapp.activities;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.MenuItem;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;

import com.example.realtimeaudiolocationapp.R;
import com.example.realtimeaudiolocationapp.fragments.AudioCommunicationFragment;
import com.example.realtimeaudiolocationapp.fragments.GroupManagementFragment;
import com.example.realtimeaudiolocationapp.fragments.LocationTrackingFragment;
import com.example.realtimeaudiolocationapp.fragments.SettingsFragment;
import com.example.realtimeaudiolocationapp.services.AuthenticationManager;
import com.google.android.material.bottomnavigation.BottomNavigationView;

public class MainActivity extends AppCompatActivity {

    private static final int REQUEST_PERMISSIONS = 1001;
    private static final String[] REQUIRED_PERMISSIONS = {
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.INTERNET,
            Manifest.permission.FOREGROUND_SERVICE,
            Manifest.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK,
            Manifest.permission.FOREGROUND_SERVICE_LOCATION
    };

    private BottomNavigationView bottomNavigationView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Initialize AuthenticationManager
        AuthenticationManager.init(this);

        // Initialize UI components
        bottomNavigationView = findViewById(R.id.bottom_navigation);
        bottomNavigationView.setOnItemSelectedListener(this::onNavigationItemSelected);

        // Check permissions
        if (!hasRequiredPermissions()) {
            requestPermissions();
        } else {
            // Load default fragment
            if (savedInstanceState == null) {
                loadFragment(new AudioCommunicationFragment());
            }
        }
    }

    /**
     * Handle navigation item selection
     */
    private boolean onNavigationItemSelected(@NonNull MenuItem item) {
        Fragment fragment = null;
        int itemId = item.getItemId();

        if (itemId == R.id.nav_audio) {
            fragment = new AudioCommunicationFragment();
        } else if (itemId == R.id.nav_location) {
            fragment = new LocationTrackingFragment();
        } else if (itemId == R.id.nav_groups) {
            fragment = new GroupManagementFragment();
        } else if (itemId == R.id.nav_settings) {
            fragment = new SettingsFragment();
        }

        return loadFragment(fragment);
    }

    /**
     * Load fragment into container
     */
    private boolean loadFragment(Fragment fragment) {
        if (fragment != null) {
            getSupportFragmentManager()
                    .beginTransaction()
                    .replace(R.id.fragment_container, fragment)
                    .commit();
            return true;
        }
        return false;
    }

    /**
     * Check if app has all required permissions
     */
    private boolean hasRequiredPermissions() {
        for (String permission : REQUIRED_PERMISSIONS) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                return false;
            }
        }
        return true;
    }

    /**
     * Request required permissions
     */
    private void requestPermissions() {
        ActivityCompat.requestPermissions(this, REQUIRED_PERMISSIONS, REQUEST_PERMISSIONS);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == REQUEST_PERMISSIONS) {
            boolean allGranted = true;
            
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }
            
            if (allGranted) {
                // Load default fragment
                loadFragment(new AudioCommunicationFragment());
            } else {
                Toast.makeText(this, "This app requires all permissions to function properly", Toast.LENGTH_LONG).show();
                // You might want to show a dialog explaining why permissions are needed
                // and provide a button to request again
            }
        }
    }
}
