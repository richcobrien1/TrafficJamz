import Foundation
import CoreLocation

protocol LocationServiceDelegate: AnyObject {
    func locationServiceDidUpdateAuthorization()
    func locationServiceDidUpdateLocations()
    func locationServiceDidDetectProximity(member: GroupMember, distance: Double)
}

class LocationService: NSObject {
    
    // MARK: - Properties
    
    weak var delegate: LocationServiceDelegate?
    
    private let locationManager = CLLocationManager()
    private var timer: Timer?
    private var isLocationSharingPaused = false
    private var proximityNotificationsEnabled = true
    private var proximityThreshold: Double = 100 // meters
    
    private(set) var currentLocation: CLLocation?
    private(set) var authorizationStatus: CLAuthorizationStatus {
        if #available(iOS 14.0, *) {
            return locationManager.authorizationStatus
        } else {
            return CLLocationManager.authorizationStatus()
        }
    }
    
    // Simulated group members for demonstration
    var groupMembers: [GroupMember] = []
    
    // MARK: - Initialization
    
    override init() {
        super.init()
        
        setupLocationManager()
        createSimulatedGroupMembers()
        startProximityMonitoring()
    }
    
    deinit {
        stopUpdatingLocation()
    }
    
    // MARK: - Location Manager Setup
    
    private func setupLocationManager() {
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.distanceFilter = 10 // meters
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.pausesLocationUpdatesAutomatically = false
        
        // Request authorization
        locationManager.requestAlwaysAuthorization()
    }
    
    // MARK: - Location Updates
    
    func startUpdatingLocation() {
        locationManager.startUpdatingLocation()
    }
    
    func stopUpdatingLocation() {
        locationManager.stopUpdatingLocation()
        timer?.invalidate()
        timer = nil
    }
    
    func pauseLocationSharing() {
        isLocationSharingPaused = true
    }
    
    func resumeLocationSharing() {
        isLocationSharingPaused = false
        // Update location immediately
        if let location = currentLocation {
            updateServerWithLocation(location)
        }
    }
    
    // MARK: - Proximity Settings
    
    func setProximityNotificationsEnabled(_ enabled: Bool) {
        proximityNotificationsEnabled = enabled
    }
    
    func setProximityThreshold(_ threshold: Double) {
        proximityThreshold = threshold
    }
    
    // MARK: - Server Communication
    
    private func updateServerWithLocation(_ location: CLLocation) {
        guard !isLocationSharingPaused else { return }
        
        // In a real implementation, this would send the location to the server
        // via a secure API call or WebSocket connection
        
        print("Updating server with location: \(location.coordinate.latitude), \(location.coordinate.longitude)")
        
        // For simulation, we'll update our local state
        currentLocation = location
        
        // Update simulated group members' proximity status
        updateGroupMembersProximity()
        
        // Notify delegate
        delegate?.locationServiceDidUpdateLocations()
    }
    
    // MARK: - Proximity Monitoring
    
    private func startProximityMonitoring() {
        // Check proximity every 5 seconds
        timer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            self?.checkProximity()
        }
    }
    
    private func checkProximity() {
        guard proximityNotificationsEnabled, let currentLocation = currentLocation else { return }
        
        for member in groupMembers {
            let distance = currentLocation.distance(from: member.location)
            
            // Update proximity status
            let wasInProximity = member.isInProximity
            member.isInProximity = distance <= proximityThreshold
            
            // If newly entered proximity, notify
            if !wasInProximity && member.isInProximity {
                delegate?.locationServiceDidDetectProximity(member: member, distance: distance)
            }
        }
    }
    
    // MARK: - Simulation Helpers
    
    private func createSimulatedGroupMembers() {
        // Create some simulated group members with locations near the user
        let baseLocation = CLLocation(latitude: 37.7749, longitude: -122.4194) // San Francisco
        
        let member1 = GroupMember(id: "1", name: "Alice", location: offsetLocation(baseLocation, latOffset: 0.001, lonOffset: 0.001))
        let member2 = GroupMember(id: "2", name: "Bob", location: offsetLocation(baseLocation, latOffset: -0.002, lonOffset: 0.002))
        let member3 = GroupMember(id: "3", name: "Charlie", location: offsetLocation(baseLocation, latOffset: 0.003, lonOffset: -0.001))
        let member4 = GroupMember(id: "4", name: "Diana", location: offsetLocation(baseLocation, latOffset: -0.001, lonOffset: -0.003))
        
        groupMembers = [member1, member2, member3, member4]
    }
    
    private func offsetLocation(_ location: CLLocation, latOffset: Double, lonOffset: Double) -> CLLocation {
        let newLat = location.coordinate.latitude + latOffset
        let newLon = location.coordinate.longitude + lonOffset
        return CLLocation(latitude: newLat, longitude: newLon)
    }
    
    private func updateGroupMembersProximity() {
        guard let currentLocation = currentLocation else { return }
        
        // Randomly update group members' locations to simulate movement
        for member in groupMembers {
            if arc4random_uniform(3) == 0 { // 1/3 chance to move
                let latOffset = Double(arc4random_uniform(10)) / 10000.0 * (arc4random_uniform(2) == 0 ? 1 : -1)
                let lonOffset = Double(arc4random_uniform(10)) / 10000.0 * (arc4random_uniform(2) == 0 ? 1 : -1)
                
                let newLat = member.location.coordinate.latitude + latOffset
                let newLon = member.location.coordinate.longitude + lonOffset
                
                member.location = CLLocation(latitude: newLat, longitude: newLon)
                member.lastUpdateTime = Date()
            }
        }
    }
}

// MARK: - CLLocationManagerDelegate

extension LocationService: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        delegate?.locationServiceDidUpdateAuthorization()
    }
    
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        
        // Update server with new location
        updateServerWithLocation(location)
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location manager failed with error: \(error.localizedDescription)")
    }
}

// MARK: - GroupMember Model

class GroupMember {
    let id: String
    let name: String
    var location: CLLocation
    var lastUpdateTime: Date
    var isOnline: Bool = true
    var isInProximity: Bool = false
    
    var lastUpdateTimeString: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: lastUpdateTime)
    }
    
    init(id: String, name: String, location: CLLocation) {
        self.id = id
        self.name = name
        self.location = location
        self.lastUpdateTime = Date()
    }
}
