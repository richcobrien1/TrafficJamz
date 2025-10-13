import Foundation
import UIKit

class PrivacyManager {
    
    // MARK: - Singleton
    
    static let shared = PrivacyManager()
    
    private init() {
        // Private initializer to enforce singleton pattern
        loadPrivacySettings()
    }
    
    // MARK: - Privacy Settings
    
    private(set) var locationSharingEnabled = true
    private(set) var audioSharingEnabled = true
    private(set) var locationHistoryEnabled = false
    private(set) var proximityAlertsEnabled = true
    private(set) var dataRetentionPeriod: Int = 30 // days
    
    // MARK: - User Preferences
    
    func loadPrivacySettings() {
        let defaults = UserDefaults.standard
        
        locationSharingEnabled = defaults.bool(forKey: "privacyLocationSharing")
        audioSharingEnabled = defaults.bool(forKey: "privacyAudioSharing")
        locationHistoryEnabled = defaults.bool(forKey: "privacyLocationHistory")
        proximityAlertsEnabled = defaults.bool(forKey: "privacyProximityAlerts")
        dataRetentionPeriod = defaults.integer(forKey: "privacyDataRetention")
        
        // Set defaults if not previously set
        if !defaults.bool(forKey: "privacySettingsInitialized") {
            setDefaultPrivacySettings()
        }
    }
    
    private func setDefaultPrivacySettings() {
        let defaults = UserDefaults.standard
        
        defaults.set(true, forKey: "privacyLocationSharing")
        defaults.set(true, forKey: "privacyAudioSharing")
        defaults.set(false, forKey: "privacyLocationHistory")
        defaults.set(true, forKey: "privacyProximityAlerts")
        defaults.set(30, forKey: "privacyDataRetention")
        defaults.set(true, forKey: "privacySettingsInitialized")
        
        // Reload settings
        loadPrivacySettings()
    }
    
    // MARK: - Privacy Controls
    
    func setLocationSharingEnabled(_ enabled: Bool) {
        locationSharingEnabled = enabled
        UserDefaults.standard.set(enabled, forKey: "privacyLocationSharing")
    }
    
    func setAudioSharingEnabled(_ enabled: Bool) {
        audioSharingEnabled = enabled
        UserDefaults.standard.set(enabled, forKey: "privacyAudioSharing")
    }
    
    func setLocationHistoryEnabled(_ enabled: Bool) {
        locationHistoryEnabled = enabled
        UserDefaults.standard.set(enabled, forKey: "privacyLocationHistory")
    }
    
    func setProximityAlertsEnabled(_ enabled: Bool) {
        proximityAlertsEnabled = enabled
        UserDefaults.standard.set(enabled, forKey: "privacyProximityAlerts")
    }
    
    func setDataRetentionPeriod(_ days: Int) {
        dataRetentionPeriod = days
        UserDefaults.standard.set(days, forKey: "privacyDataRetention")
    }
    
    // MARK: - Privacy Policy
    
    func showPrivacyPolicy(in viewController: UIViewController) {
        let privacyVC = PrivacyPolicyViewController()
        let navController = UINavigationController(rootViewController: privacyVC)
        viewController.present(navController, animated: true)
    }
    
    // MARK: - Data Management
    
    func clearAllUserData(completion: @escaping (Bool) -> Void) {
        // Clear local data
        clearLocalData()
        
        // Request server to clear user data
        requestServerDataDeletion { success in
            completion(success)
        }
    }
    
    private func clearLocalData() {
        // Clear UserDefaults
        if let bundleID = Bundle.main.bundleIdentifier {
            UserDefaults.standard.removePersistentDomain(forName: bundleID)
        }
        
        // Clear Keychain
        let securityManager = SecurityManager.shared
        securityManager.clearAllKeys()
        
        // Clear any cached files
        clearCachedFiles()
    }
    
    private func clearCachedFiles() {
        let fileManager = FileManager.default
        let cacheDirectories = [
            fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first,
            fileManager.urls(for: .documentDirectory, in: .userDomainMask).first
        ]
        
        for cacheDir in cacheDirectories {
            guard let cacheDir = cacheDir else { continue }
            
            do {
                let contents = try fileManager.contentsOfDirectory(at: cacheDir, includingPropertiesForKeys: nil)
                for fileURL in contents {
                    try fileManager.removeItem(at: fileURL)
                }
            } catch {
                print("Error clearing cache: \(error.localizedDescription)")
            }
        }
    }
    
    private func requestServerDataDeletion(completion: @escaping (Bool) -> Void) {
        // In a real implementation, this would make an API call to the server
        // to request deletion of user data
        
        // For simulation, we'll just return success after a delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            completion(true)
        }
    }
}

// MARK: - SecurityManager Extension

extension SecurityManager {
    func clearAllKeys() {
        // Clear encryption keys
        KeychainManager.shared.deleteKey(for: "encryptionKey")
        KeychainManager.shared.deleteKey(for: "encryptionIV")
        
        // Clear any stored credentials
        let accounts = ["userToken", "refreshToken", "userID"]
        for account in accounts {
            KeychainManager.shared.deleteCredential(for: account)
        }
    }
}

// MARK: - PrivacyPolicyViewController

class PrivacyPolicyViewController: UIViewController {
    
    private let textView = UITextView()
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupUI()
        loadPrivacyPolicyText()
    }
    
    private func setupUI() {
        view.backgroundColor = .systemBackground
        title = "Privacy Policy"
        
        // Add close button
        navigationItem.rightBarButtonItem = UIBarButtonItem(
            barButtonSystemItem: .close,
            target: self,
            action: #selector(closeTapped)
        )
        
        // Text View
        textView.isEditable = false
        textView.font = UIFont.systemFont(ofSize: 16)
        textView.textContainerInset = UIEdgeInsets(top: 16, left: 16, bottom: 16, right: 16)
        
        // Add subviews and set constraints
        textView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(textView)
        
        NSLayoutConstraint.activate([
            textView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            textView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            textView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            textView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }
    
    private func loadPrivacyPolicyText() {
        textView.text = """
        # Privacy Policy
        
        ## Introduction
        
        This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Real-time Audio Communication and Location Tracking application.
        
        ## Information We Collect
        
        We collect the following types of information:
        
        - **Audio Data**: When you use our audio communication features, we process audio data to enable real-time communication between group members.
        
        - **Location Data**: When you use our location tracking features, we collect your device's geographic location to enable location sharing and proximity notifications.
        
        - **User Account Information**: We collect information you provide when creating an account, such as your name, email address, and password.
        
        - **Group Information**: We collect information about the groups you create or join, including group names and member lists.
        
        ## How We Use Your Information
        
        We use the information we collect to:
        
        - Enable real-time audio communication between group members
        - Provide location tracking and proximity notifications
        - Manage your account and group memberships
        - Improve our services and develop new features
        - Ensure the security and privacy of your data
        
        ## Data Security
        
        We implement appropriate technical and organizational measures to protect your personal information:
        
        - All audio and location data is encrypted during transmission and storage
        - Data is only accessible to authorized group members
        - We use secure authentication methods to protect your account
        
        ## Data Retention
        
        We retain your data for the period necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required by law. You can adjust your data retention settings in the app.
        
        ## Your Rights
        
        You have the right to:
        
        - Access your personal information
        - Correct inaccurate or incomplete information
        - Delete your account and associated data
        - Adjust privacy settings within the app
        
        ## Changes to This Privacy Policy
        
        We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
        
        ## Contact Us
        
        If you have any questions about this Privacy Policy, please contact us at privacy@example.com.
        
        Last Updated: March 19, 2025
        """
    }
    
    @objc private func closeTapped() {
        dismiss(animated: true)
    }
}
