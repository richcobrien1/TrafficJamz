import Foundation
import UIKit

// MARK: - Info.plist Configuration

/*
 The following keys need to be added to Info.plist:
 
 - NSMicrophoneUsageDescription: "This app requires microphone access for real-time audio communication with your group members."
 - NSLocationAlwaysAndWhenInUseUsageDescription: "This app requires location access to help you find group members and provide proximity notifications."
 - NSLocationWhenInUseUsageDescription: "This app requires location access to help you find group members and provide proximity notifications."
 - UIBackgroundModes: audio, location, fetch, remote-notification
 */

// MARK: - Entitlements

/*
 The following entitlements need to be configured:
 
 - com.apple.developer.networking.HotspotHelper
 - com.apple.developer.networking.networkextension
 - com.apple.developer.networking.vpn.api
 - com.apple.developer.push-notification
 - keychain-access-groups
 */

// MARK: - App Configuration

class AppConfiguration {
    
    // MARK: - Singleton
    
    static let shared = AppConfiguration()
    
    private init() {
        // Private initializer to enforce singleton pattern
        loadConfiguration()
    }
    
    // MARK: - Properties
    
    // API Endpoints
    var apiBaseURL: URL
    var webSocketURL: URL
    
    // Feature Flags
    var enableMusicSharing: Bool
    var enableLocationHistory: Bool
    var enableProximityNotifications: Bool
    var enableBackgroundAudio: Bool
    var enableBackgroundLocation: Bool
    
    // App Settings
    var defaultAudioQuality: AudioQuality
    var defaultLocationAccuracy: LocationAccuracy
    var defaultProximityThreshold: Double
    var maxGroupSize: Int
    
    // MARK: - Initialization
    
    private func loadConfiguration() {
        // In a real app, this would load from a configuration file or remote config service
        
        // Default values
        apiBaseURL = URL(string: "https://api.example.com/v1")!
        webSocketURL = URL(string: "wss://ws.example.com/v1")!
        
        enableMusicSharing = true
        enableLocationHistory = false
        enableProximityNotifications = true
        enableBackgroundAudio = true
        enableBackgroundLocation = true
        
        defaultAudioQuality = .high
        defaultLocationAccuracy = .best
        defaultProximityThreshold = 100.0
        maxGroupSize = 20
        
        // Override with environment-specific values if needed
        #if DEBUG
        apiBaseURL = URL(string: "https://dev-api.example.com/v1")!
        webSocketURL = URL(string: "wss://dev-ws.example.com/v1")!
        #endif
    }
}

// MARK: - Enums

enum AudioQuality: String {
    case low = "Low"
    case medium = "Medium"
    case high = "High"
    case maximum = "Maximum"
    
    var bitrate: Int {
        switch self {
        case .low:
            return 32000
        case .medium:
            return 64000
        case .high:
            return 128000
        case .maximum:
            return 256000
        }
    }
}

enum LocationAccuracy: String {
    case low = "Low"
    case medium = "Medium"
    case high = "High"
    case best = "Best"
    
    var clAccuracy: CLLocationAccuracy {
        switch self {
        case .low:
            return kCLLocationAccuracyHundredMeters
        case .medium:
            return kCLLocationAccuracyNearestTenMeters
        case .high:
            return kCLLocationAccuracyBest
        case .best:
            return kCLLocationAccuracyBestForNavigation
        }
    }
}

// MARK: - App Version

extension UIApplication {
    static var appVersion: String {
        return Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
    }
    
    static var buildNumber: String {
        return Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
    }
    
    static var versionAndBuild: String {
        return "v\(appVersion) (\(buildNumber))"
    }
}
