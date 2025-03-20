import UIKit
import MapKit
import CoreLocation

class LocationTrackingViewController: UIViewController {
    
    // MARK: - UI Components
    
    private let mapView = MKMapView()
    private let locationStatusLabel = UILabel()
    private let proximityNotificationsSwitch = UISwitch()
    private let proximityDistanceSlider = UISlider()
    private let proximityValueLabel = UILabel()
    private let pauseLocationSharingButton = UIButton()
    
    // MARK: - Location Service
    
    private var locationService: LocationService?
    private var isLocationSharingPaused = false
    private var proximityThreshold: Double = 100 // meters
    
    // MARK: - Lifecycle Methods
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupUI()
        configureLocationService()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        
        // Refresh location data
        updateLocationStatus()
        refreshMapAnnotations()
    }
    
    // MARK: - UI Setup
    
    private func setupUI() {
        view.backgroundColor = .systemBackground
        title = "Location Tracking"
        
        // Map View
        mapView.showsUserLocation = true
        mapView.delegate = self
        
        // Location Status Label
        locationStatusLabel.text = "Initializing location services..."
        locationStatusLabel.textAlignment = .center
        locationStatusLabel.font = UIFont.systemFont(ofSize: 14)
        
        // Proximity Notifications Switch
        let proximityLabel = UILabel()
        proximityLabel.text = "Proximity Notifications"
        proximityLabel.font = UIFont.systemFont(ofSize: 16)
        
        proximityNotificationsSwitch.isOn = true
        proximityNotificationsSwitch.addTarget(self, action: #selector(toggleProximityNotifications), for: .valueChanged)
        
        // Proximity Distance Slider
        proximityDistanceSlider.minimumValue = 10 // 10 meters
        proximityDistanceSlider.maximumValue = 1000 // 1000 meters
        proximityDistanceSlider.value = Float(proximityThreshold)
        proximityDistanceSlider.addTarget(self, action: #selector(proximityDistanceChanged), for: .valueChanged)
        
        // Proximity Value Label
        updateProximityValueLabel()
        
        // Pause Location Sharing Button
        pauseLocationSharingButton.setTitle("Pause Location Sharing", for: .normal)
        pauseLocationSharingButton.setTitle("Resume Location Sharing", for: .selected)
        pauseLocationSharingButton.backgroundColor = .systemBlue
        pauseLocationSharingButton.layer.cornerRadius = 10
        pauseLocationSharingButton.addTarget(self, action: #selector(toggleLocationSharing), for: .touchUpInside)
        
        // Add subviews and set constraints
        [mapView, locationStatusLabel, proximityLabel, proximityNotificationsSwitch, 
         proximityDistanceSlider, proximityValueLabel, pauseLocationSharingButton].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview($0)
        }
        
        // Layout would be set up here with NSLayoutConstraint
        // For brevity, constraints are omitted in this example
    }
    
    // MARK: - Location Configuration
    
    private func configureLocationService() {
        locationService = LocationService()
        locationService?.delegate = self
        locationService?.startUpdatingLocation()
    }
    
    private func updateLocationStatus() {
        // Update UI based on location service status
        if let authStatus = locationService?.authorizationStatus {
            switch authStatus {
            case .authorizedAlways, .authorizedWhenInUse:
                locationStatusLabel.text = "Location services active"
                locationStatusLabel.textColor = .systemGreen
            case .denied, .restricted:
                locationStatusLabel.text = "Location access denied"
                locationStatusLabel.textColor = .systemRed
            case .notDetermined:
                locationStatusLabel.text = "Location permission not determined"
                locationStatusLabel.textColor = .systemOrange
            @unknown default:
                locationStatusLabel.text = "Unknown location status"
                locationStatusLabel.textColor = .systemGray
            }
        }
    }
    
    private func refreshMapAnnotations() {
        // Clear existing annotations except user location
        let annotations = mapView.annotations.filter { !($0 is MKUserLocation) }
        mapView.removeAnnotations(annotations)
        
        // Add group member annotations
        if let groupMembers = locationService?.groupMembers {
            mapView.addAnnotations(groupMembers.map { GroupMemberAnnotation(member: $0) })
            
            // Zoom to show all members
            if !groupMembers.isEmpty {
                let allLocations = groupMembers.map { $0.location }
                let region = MKCoordinateRegion(coordinates: allLocations)
                mapView.setRegion(region, animated: true)
            }
        }
    }
    
    private func updateProximityValueLabel() {
        let distance = Int(proximityDistanceSlider.value)
        proximityValueLabel.text = "\(distance) meters"
    }
    
    // MARK: - Actions
    
    @objc private func toggleProximityNotifications(_ sender: UISwitch) {
        locationService?.setProximityNotificationsEnabled(sender.isOn)
    }
    
    @objc private func proximityDistanceChanged(_ sender: UISlider) {
        proximityThreshold = Double(sender.value)
        updateProximityValueLabel()
        locationService?.setProximityThreshold(proximityThreshold)
    }
    
    @objc private func toggleLocationSharing() {
        isLocationSharingPaused.toggle()
        pauseLocationSharingButton.isSelected = isLocationSharingPaused
        
        if isLocationSharingPaused {
            locationService?.pauseLocationSharing()
        } else {
            locationService?.resumeLocationSharing()
        }
    }
}

// MARK: - MKMapViewDelegate

extension LocationTrackingViewController: MKMapViewDelegate {
    func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
        guard let annotation = annotation as? GroupMemberAnnotation else { return nil }
        
        let identifier = "GroupMemberAnnotation"
        var view: MKMarkerAnnotationView
        
        if let dequeuedView = mapView.dequeueReusableAnnotationView(withIdentifier: identifier) as? MKMarkerAnnotationView {
            dequeuedView.annotation = annotation
            view = dequeuedView
        } else {
            view = MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: identifier)
            view.canShowCallout = true
            view.calloutOffset = CGPoint(x: 0, y: 5)
            view.rightCalloutAccessoryView = UIButton(type: .detailDisclosure)
        }
        
        view.markerTintColor = annotation.member.isInProximity ? .systemGreen : .systemBlue
        return view
    }
    
    func mapView(_ mapView: MKMapView, annotationView view: MKAnnotationView, calloutAccessoryControlTapped control: UIControl) {
        guard let annotation = view.annotation as? GroupMemberAnnotation else { return }
        
        // Show member details or actions
        let alertController = UIAlertController(title: annotation.title, message: nil, preferredStyle: .actionSheet)
        
        alertController.addAction(UIAlertAction(title: "Call", style: .default) { _ in
            // Initiate direct call to this member
        })
        
        alertController.addAction(UIAlertAction(title: "Navigate To", style: .default) { _ in
            // Open navigation to this member
        })
        
        alertController.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        
        present(alertController, animated: true)
    }
}

// MARK: - LocationServiceDelegate

extension LocationTrackingViewController: LocationServiceDelegate {
    func locationServiceDidUpdateAuthorization() {
        updateLocationStatus()
    }
    
    func locationServiceDidUpdateLocations() {
        refreshMapAnnotations()
    }
    
    func locationServiceDidDetectProximity(member: GroupMember, distance: Double) {
        // Handle proximity notification
        let alertController = UIAlertController(
            title: "Proximity Alert",
            message: "\(member.name) is within \(Int(distance)) meters of your location",
            preferredStyle: .alert
        )
        
        alertController.addAction(UIAlertAction(title: "OK", style: .default))
        
        present(alertController, animated: true)
    }
}

// MARK: - GroupMemberAnnotation

class GroupMemberAnnotation: NSObject, MKAnnotation {
    let member: GroupMember
    
    var coordinate: CLLocationCoordinate2D {
        return member.location.coordinate
    }
    
    var title: String? {
        return member.name
    }
    
    var subtitle: String? {
        return "Last updated: \(member.lastUpdateTimeString)"
    }
    
    init(member: GroupMember) {
        self.member = member
        super.init()
    }
}

// MARK: - MKCoordinateRegion Extension

extension MKCoordinateRegion {
    init(coordinates: [CLLocation], regionRadius: CLLocationDistance = 1000) {
        guard !coordinates.isEmpty else {
            self = MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: 0, longitude: 0), span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1))
            return
        }
        
        let latitudes = coordinates.map { $0.coordinate.latitude }
        let longitudes = coordinates.map { $0.coordinate.longitude }
        
        let minLat = latitudes.min()!
        let maxLat = latitudes.max()!
        let minLon = longitudes.min()!
        let maxLon = longitudes.max()!
        
        let center = CLLocationCoordinate2D(
            latitude: (minLat + maxLat) / 2,
            longitude: (minLon + maxLon) / 2
        )
        
        let span = MKCoordinateSpan(
            latitudeDelta: max(0.01, (maxLat - minLat) * 1.5),
            longitudeDelta: max(0.01, (maxLon - minLon) * 1.5)
        )
        
        self = MKCoordinateRegion(center: center, span: span)
    }
}
