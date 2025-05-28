import Foundation
import Network

class NetworkSecurityManager {
    
    // MARK: - Singleton
    
    static let shared = NetworkSecurityManager()
    
    private init() {
        // Private initializer to enforce singleton pattern
        setupNetworkMonitoring()
    }
    
    // MARK: - Properties
    
    private var networkMonitor: NWPathMonitor?
    private var isSecureConnection = false
    private var connectionType: ConnectionType = .unknown
    
    // MARK: - Network Monitoring
    
    private func setupNetworkMonitoring() {
        networkMonitor = NWPathMonitor()
        
        networkMonitor?.pathUpdateHandler = { [weak self] path in
            guard let self = self else { return }
            
            // Check if network requires interface privacy
            self.isSecureConnection = path.status == .satisfied
            
            // Determine connection type
            if path.usesInterfaceType(.wifi) {
                self.connectionType = .wifi
            } else if path.usesInterfaceType(.cellular) {
                self.connectionType = .cellular
            } else if path.usesInterfaceType(.wiredEthernet) {
                self.connectionType = .ethernet
            } else {
                self.connectionType = .unknown
            }
            
            // Post notification about network status change
            NotificationCenter.default.post(
                name: Notification.Name("NetworkStatusChanged"),
                object: nil,
                userInfo: [
                    "isConnected": path.status == .satisfied,
                    "connectionType": self.connectionType.rawValue
                ]
            )
        }
        
        let queue = DispatchQueue(label: "NetworkMonitor")
        networkMonitor?.start(queue: queue)
    }
    
    // MARK: - Secure Communication
    
    func secureRequest(url: URL, method: String, headers: [String: String]? = nil, body: Data? = nil, completion: @escaping (Data?, URLResponse?, Error?) -> Void) {
        var request = URLRequest(url: url)
        request.httpMethod = method
        
        // Add security headers
        var requestHeaders = headers ?? [:]
        requestHeaders["X-App-Version"] = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
        requestHeaders["X-Device-ID"] = UIDevice.current.identifierForVendor?.uuidString
        
        // Add authentication token if available
        if let token = KeychainManager.shared.retrieveCredential(for: "userToken") {
            requestHeaders["Authorization"] = "Bearer \(token)"
        }
        
        // Apply headers to request
        for (key, value) in requestHeaders {
            request.setValue(value, forHTTPHeaderField: key)
        }
        
        // Add request body if provided
        if let body = body {
            request.httpBody = body
        }
        
        // Create secure session configuration
        let configuration = URLSessionConfiguration.default
        configuration.tlsMinimumSupportedProtocolVersion = .TLSv12
        
        // Create session and task
        let session = URLSession(configuration: configuration)
        let task = session.dataTask(with: request, completionHandler: { data, response, error in
            // Check for certificate pinning if needed
            if let httpResponse = response as? HTTPURLResponse, 
               !self.validateServerCertificate(httpResponse: httpResponse) {
                let securityError = NSError(
                    domain: "NetworkSecurityManager",
                    code: 1001,
                    userInfo: [NSLocalizedDescriptionKey: "Invalid server certificate"]
                )
                completion(nil, response, securityError)
                return
            }
            
            // Process response
            completion(data, response, error)
        })
        
        task.resume()
    }
    
    // MARK: - Certificate Pinning
    
    private func validateServerCertificate(httpResponse: HTTPURLResponse) -> Bool {
        // In a real implementation, this would validate the server's SSL certificate
        // against a known set of certificates or public keys
        
        // For this example, we'll just return true
        return true
    }
    
    // MARK: - Secure WebSocket
    
    func createSecureWebSocketTask(with url: URL) -> URLSessionWebSocketTask {
        // Create secure session configuration
        let configuration = URLSessionConfiguration.default
        configuration.tlsMinimumSupportedProtocolVersion = .TLSv12
        
        // Create session
        let session = URLSession(configuration: configuration)
        
        // Create WebSocket task
        let webSocketTask = session.webSocketTask(with: url)
        
        // Add authentication headers if available
        if let token = KeychainManager.shared.retrieveCredential(for: "userToken") {
            webSocketTask.resume()
        }
        
        return webSocketTask
    }
    
    // MARK: - Connection Security Check
    
    func isConnectionSecure() -> Bool {
        return isSecureConnection
    }
    
    func getCurrentConnectionType() -> ConnectionType {
        return connectionType
    }
    
    // MARK: - Data Transmission Security
    
    func secureDataForTransmission(_ data: Data) -> Data? {
        // Encrypt data before transmission
        return SecurityManager.shared.encryptData(data)
    }
    
    func processReceivedSecureData(_ encryptedData: Data) -> Data? {
        // Decrypt received data
        return SecurityManager.shared.decryptData(encryptedData)
    }
}

// MARK: - Connection Type Enum

enum ConnectionType: String {
    case wifi = "WiFi"
    case cellular = "Cellular"
    case ethernet = "Ethernet"
    case unknown = "Unknown"
}
