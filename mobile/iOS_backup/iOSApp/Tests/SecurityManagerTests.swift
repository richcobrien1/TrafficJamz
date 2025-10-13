import XCTest
@testable import RealTimeAudioLocationApp

class SecurityManagerTests: XCTestCase {
    
    override func setUp() {
        super.setUp()
        // Initialize SecurityManager before each test
        SecurityManager.shared.initialize()
    }
    
    override func tearDown() {
        // Clean up after each test
        super.tearDown()
    }
    
    func testEncryptionDecryption() {
        // Test string encryption and decryption
        let originalString = "This is a test string for encryption"
        
        guard let encryptedString = SecurityManager.shared.encryptString(originalString) else {
            XCTFail("Failed to encrypt string")
            return
        }
        
        XCTAssertNotEqual(originalString, encryptedString, "Encrypted string should be different from original")
        
        guard let decryptedString = SecurityManager.shared.decryptString(encryptedString) else {
            XCTFail("Failed to decrypt string")
            return
        }
        
        XCTAssertEqual(originalString, decryptedString, "Decrypted string should match original")
    }
    
    func testDataEncryption() {
        // Test data encryption and decryption
        let originalData = "Test data for encryption".data(using: .utf8)!
        
        guard let encryptedData = SecurityManager.shared.encryptData(originalData) else {
            XCTFail("Failed to encrypt data")
            return
        }
        
        XCTAssertNotEqual(originalData, encryptedData, "Encrypted data should be different from original")
        
        guard let decryptedData = SecurityManager.shared.decryptData(encryptedData) else {
            XCTFail("Failed to decrypt data")
            return
        }
        
        XCTAssertEqual(originalData, decryptedData, "Decrypted data should match original")
    }
    
    func testAudioEncryption() {
        // Create mock audio data
        let mockAudioData = Data(repeating: 0x41, count: 1024) // 1KB of 'A' characters
        
        guard let encryptedAudio = SecurityManager.shared.encryptAudioData(mockAudioData) else {
            XCTFail("Failed to encrypt audio data")
            return
        }
        
        XCTAssertNotEqual(mockAudioData, encryptedAudio, "Encrypted audio data should be different from original")
        
        guard let decryptedAudio = SecurityManager.shared.decryptAudioData(encryptedAudio) else {
            XCTFail("Failed to decrypt audio data")
            return
        }
        
        XCTAssertEqual(mockAudioData, decryptedAudio, "Decrypted audio data should match original")
    }
    
    func testLocationEncryption() {
        // Create mock location data
        let mockLocationData = "{\"latitude\":37.7749,\"longitude\":-122.4194}".data(using: .utf8)!
        
        guard let encryptedLocation = SecurityManager.shared.encryptLocationData(mockLocationData) else {
            XCTFail("Failed to encrypt location data")
            return
        }
        
        XCTAssertNotEqual(mockLocationData, encryptedLocation, "Encrypted location data should be different from original")
        
        guard let decryptedLocation = SecurityManager.shared.decryptLocationData(encryptedLocation) else {
            XCTFail("Failed to decrypt location data")
            return
        }
        
        XCTAssertEqual(mockLocationData, decryptedLocation, "Decrypted location data should match original")
    }
    
    func testHashing() {
        let originalString = "test-password-123"
        let hashedString = SecurityManager.shared.hashString(originalString)
        
        XCTAssertNotEqual(originalString, hashedString, "Hashed string should be different from original")
        
        // Hash should be consistent
        let hashedAgain = SecurityManager.shared.hashString(originalString)
        XCTAssertEqual(hashedString, hashedAgain, "Hash function should be deterministic")
        
        // Different inputs should produce different hashes
        let differentString = "test-password-124"
        let differentHash = SecurityManager.shared.hashString(differentString)
        XCTAssertNotEqual(hashedString, differentHash, "Different inputs should produce different hashes")
    }
    
    func testPerformance() {
        // Test encryption performance with larger data
        let largeData = Data(repeating: 0x41, count: 1024 * 1024) // 1MB of data
        
        measure {
            // This will measure how long it takes to encrypt and decrypt 1MB of data
            let encrypted = SecurityManager.shared.encryptData(largeData)
            XCTAssertNotNil(encrypted, "Encryption should succeed for large data")
            
            if let encrypted = encrypted {
                let decrypted = SecurityManager.shared.decryptData(encrypted)
                XCTAssertNotNil(decrypted, "Decryption should succeed for large data")
                XCTAssertEqual(largeData, decrypted, "Decrypted data should match original")
            }
        }
    }
}
