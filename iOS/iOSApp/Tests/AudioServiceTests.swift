import XCTest
@testable import RealTimeAudioLocationApp

class AudioServiceTests: XCTestCase {
    
    var audioService: AudioService!
    
    override func setUp() {
        super.setUp()
        audioService = AudioService()
    }
    
    override func tearDown() {
        audioService = nil
        super.tearDown()
    }
    
    func testInitialState() {
        XCTAssertFalse(audioService.isConnected, "Audio service should not be connected initially")
        XCTAssertFalse(audioService.isMicrophoneMuted, "Microphone should not be muted initially")
        XCTAssertFalse(audioService.isSpeakerMuted, "Speaker should not be muted initially")
        XCTAssertEqual(audioService.currentVolume, 0.5, "Initial volume should be 0.5")
    }
    
    func testMuteMicrophone() {
        // Test muting
        audioService.muteMicrophone(true)
        XCTAssertTrue(audioService.isMicrophoneMuted, "Microphone should be muted")
        
        // Test unmuting
        audioService.muteMicrophone(false)
        XCTAssertFalse(audioService.isMicrophoneMuted, "Microphone should be unmuted")
    }
    
    func testMuteSpeaker() {
        // Test muting
        audioService.muteSpeaker(true)
        XCTAssertTrue(audioService.isSpeakerMuted, "Speaker should be muted")
        
        // Test unmuting
        audioService.muteSpeaker(false)
        XCTAssertFalse(audioService.isSpeakerMuted, "Speaker should be unmuted")
    }
    
    func testSetVolume() {
        // Test setting volume
        audioService.setVolume(0.8)
        XCTAssertEqual(audioService.currentVolume, 0.8, "Volume should be updated to 0.8")
        
        // Test setting volume with muted speaker
        audioService.muteSpeaker(true)
        audioService.setVolume(0.3)
        XCTAssertEqual(audioService.currentVolume, 0.3, "Volume should be updated to 0.3 even when muted")
        XCTAssertTrue(audioService.isSpeakerMuted, "Speaker should remain muted after volume change")
    }
    
    func testConnectionLifecycle() {
        // Create expectation for async testing
        let connectExpectation = expectation(description: "Connect to audio service")
        
        // Mock delegate to capture events
        let mockDelegate = MockAudioServiceDelegate()
        audioService.delegate = mockDelegate
        
        // Connect
        audioService.connect()
        
        // Wait for connection (simulated delay in the service)
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            connectExpectation.fulfill()
        }
        
        waitForExpectations(timeout: 3.0) { error in
            XCTAssertNil(error, "Connection expectation failed")
            XCTAssertTrue(self.audioService.isConnected, "Audio service should be connected")
            XCTAssertTrue(mockDelegate.didConnectCalled, "Delegate should be notified of connection")
        }
        
        // Test disconnection
        audioService.disconnect()
        XCTAssertFalse(audioService.isConnected, "Audio service should be disconnected")
        XCTAssertTrue(mockDelegate.didDisconnectCalled, "Delegate should be notified of disconnection")
    }
}

// Mock delegate for testing
class MockAudioServiceDelegate: AudioServiceDelegate {
    var didConnectCalled = false
    var didDisconnectCalled = false
    var didUpdateParticipantsCalled = false
    
    func audioServiceDidConnect() {
        didConnectCalled = true
    }
    
    func audioServiceDidDisconnect() {
        didDisconnectCalled = true
    }
    
    func audioServiceDidUpdateParticipants() {
        didUpdateParticipantsCalled = true
    }
}
