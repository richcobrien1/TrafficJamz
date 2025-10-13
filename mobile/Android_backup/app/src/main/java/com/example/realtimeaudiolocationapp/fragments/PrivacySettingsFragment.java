package com.example.realtimeaudiolocationapp.fragments;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.CompoundButton;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.widget.SwitchCompat;
import androidx.fragment.app.Fragment;

import com.example.realtimeaudiolocationapp.R;
import com.example.realtimeaudiolocationapp.services.PrivacyManager;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

/**
 * Fragment for privacy settings
 */
public class PrivacySettingsFragment extends Fragment {

    private SwitchCompat switchLocationSharing;
    private SwitchCompat switchAudioSharing;
    private SwitchCompat switchBackgroundTracking;
    private SwitchCompat switchDataCollection;
    private SwitchCompat switchAnalytics;
    private Button buttonPrivacyPolicy;
    private Button buttonDeleteData;
    private TextView textPrivacyInfo;

    private PrivacyManager privacyManager;

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        privacyManager = PrivacyManager.getInstance(requireContext());
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_privacy_settings, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        // Initialize UI components
        switchLocationSharing = view.findViewById(R.id.switch_location_sharing);
        switchAudioSharing = view.findViewById(R.id.switch_audio_sharing);
        switchBackgroundTracking = view.findViewById(R.id.switch_background_tracking);
        switchDataCollection = view.findViewById(R.id.switch_data_collection);
        switchAnalytics = view.findViewById(R.id.switch_analytics);
        buttonPrivacyPolicy = view.findViewById(R.id.button_privacy_policy);
        buttonDeleteData = view.findViewById(R.id.button_delete_data);
        textPrivacyInfo = view.findViewById(R.id.text_privacy_info);

        // Set initial switch states
        switchLocationSharing.setChecked(privacyManager.isLocationSharingEnabled());
        switchAudioSharing.setChecked(privacyManager.isAudioSharingEnabled());
        switchBackgroundTracking.setChecked(privacyManager.isBackgroundTrackingEnabled());
        switchDataCollection.setChecked(privacyManager.hasDataCollectionConsent());
        switchAnalytics.setChecked(privacyManager.isAnalyticsEnabled());

        // Set up listeners
        switchLocationSharing.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                privacyManager.setLocationSharingEnabled(isChecked);
                updatePrivacyInfoText();
            }
        });

        switchAudioSharing.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                privacyManager.setAudioSharingEnabled(isChecked);
                updatePrivacyInfoText();
            }
        });

        switchBackgroundTracking.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                privacyManager.setBackgroundTrackingEnabled(isChecked);
                updatePrivacyInfoText();
            }
        });

        switchDataCollection.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                if (isChecked) {
                    showDataCollectionConsentDialog();
                } else {
                    privacyManager.setDataCollectionConsent(false);
                    updatePrivacyInfoText();
                }
            }
        });

        switchAnalytics.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                privacyManager.setAnalyticsEnabled(isChecked);
                updatePrivacyInfoText();
            }
        });

        buttonPrivacyPolicy.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showPrivacyPolicyDialog();
            }
        });

        buttonDeleteData.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showDeleteDataConfirmationDialog();
            }
        });

        // Update privacy info text
        updatePrivacyInfoText();
    }

    /**
     * Update the privacy info text based on current settings
     */
    private void updatePrivacyInfoText() {
        StringBuilder infoBuilder = new StringBuilder();
        infoBuilder.append("Your current privacy settings:\n\n");

        if (privacyManager.isLocationSharingEnabled()) {
            infoBuilder.append("• Location sharing is enabled. Your location will be shared with group members.\n");
        } else {
            infoBuilder.append("• Location sharing is disabled. Your location will not be shared.\n");
        }

        if (privacyManager.isAudioSharingEnabled()) {
            infoBuilder.append("• Audio sharing is enabled. Your audio will be shared with group members.\n");
        } else {
            infoBuilder.append("• Audio sharing is disabled. Your audio will not be shared.\n");
        }

        if (privacyManager.isBackgroundTrackingEnabled()) {
            infoBuilder.append("• Background tracking is enabled. Your location will be tracked when the app is in the background.\n");
        } else {
            infoBuilder.append("• Background tracking is disabled. Your location will only be tracked when the app is open.\n");
        }

        if (privacyManager.hasDataCollectionConsent()) {
            infoBuilder.append("• You have consented to data collection for service improvement.\n");
        } else {
            infoBuilder.append("• You have not consented to data collection.\n");
        }

        if (privacyManager.isAnalyticsEnabled()) {
            infoBuilder.append("• Analytics are enabled. Anonymous usage data will be collected.\n");
        } else {
            infoBuilder.append("• Analytics are disabled. No usage data will be collected.\n");
        }

        textPrivacyInfo.setText(infoBuilder.toString());
    }

    /**
     * Show data collection consent dialog
     */
    private void showDataCollectionConsentDialog() {
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle("Data Collection Consent")
                .setMessage("By enabling data collection, you agree to allow us to collect anonymous data about how you use the app. This helps us improve our services. No personal information will be shared with third parties.")
                .setPositiveButton("I Consent", (dialog, which) -> {
                    privacyManager.setDataCollectionConsent(true);
                    updatePrivacyInfoText();
                })
                .setNegativeButton("Decline", (dialog, which) -> {
                    switchDataCollection.setChecked(false);
                    privacyManager.setDataCollectionConsent(false);
                    updatePrivacyInfoText();
                })
                .setCancelable(false)
                .show();
    }

    /**
     * Show privacy policy dialog
     */
    private void showPrivacyPolicyDialog() {
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle("Privacy Policy")
                .setMessage("Our Privacy Policy\n\n" +
                        "1. Information We Collect\n" +
                        "We collect location data and audio data only when you enable these features. This data is only shared with group members you connect with.\n\n" +
                        "2. How We Use Your Information\n" +
                        "Your location and audio data are used solely to provide the core functionality of the app - real-time audio communication and location tracking between group members.\n\n" +
                        "3. Data Security\n" +
                        "All data is encrypted end-to-end and is only accessible to you and your group members. We implement industry-standard security measures to protect your data.\n\n" +
                        "4. Data Retention\n" +
                        "Location data is only stored temporarily and is deleted when you disconnect from a group. Audio data is not stored at all - it is transmitted in real-time.\n\n" +
                        "5. Your Rights\n" +
                        "You can disable location sharing, audio sharing, or delete your account at any time through the app settings.")
                .setPositiveButton("Close", null)
                .show();
    }

    /**
     * Show delete data confirmation dialog
     */
    private void showDeleteDataConfirmationDialog() {
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle("Delete All Data")
                .setMessage("Are you sure you want to delete all your data? This will reset all privacy settings and remove all your data from our servers. This action cannot be undone.")
                .setPositiveButton("Delete", (dialog, which) -> {
                    // Reset all privacy settings
                    privacyManager.clearAllSettings();
                    
                    // Update UI
                    switchLocationSharing.setChecked(privacyManager.isLocationSharingEnabled());
                    switchAudioSharing.setChecked(privacyManager.isAudioSharingEnabled());
                    switchBackgroundTracking.setChecked(privacyManager.isBackgroundTrackingEnabled());
                    switchDataCollection.setChecked(privacyManager.hasDataCollectionConsent());
                    switchAnalytics.setChecked(privacyManager.isAnalyticsEnabled());
                    
                    updatePrivacyInfoText();
                    
                    // Show confirmation
                    new MaterialAlertDialogBuilder(requireContext())
                            .setTitle("Data Deleted")
                            .setMessage("All your data has been deleted and privacy settings have been reset.")
                            .setPositiveButton("OK", null)
                            .show();
                })
                .setNegativeButton("Cancel", null)
                .show();
    }
}
