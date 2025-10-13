import XCTest
@testable import RealTimeAudioLocationApp

class AuthenticationManagerTests: XCTestCase {
    
    override func setUp() {
        super.setUp()
        // Clear any existing credentials before each test
        KeychainManager.shared.deleteCredential(for: "userToken")
    }
    
    override func tearDown() {
        // Clean up after each test
        KeychainManager.shared.deleteCredential(for: "userToken")
        super.tearDown()
    }
    
    func testInitialState() {
        XCTAssertFalse(AuthenticationManager.shared.isAuthenticated, "User should not be authenticated initially")
        XCTAssertNil(AuthenticationManager.shared.currentUser, "Current user should be nil initially")
    }
    
    func testLoginSuccess() {
        // Create expectation for async testing
        let loginExpectation = expectation(description: "Login successful")
        
        // Test valid login
        AuthenticationManager.shared.login(email: "test@example.com", password: "password123") { result in
            switch result {
            case .success(let user):
                XCTAssertEqual(user.email, "test@example.com", "User email should match login email")
                XCTAssertTrue(AuthenticationManager.shared.isAuthenticated, "User should be authenticated after successful login")
                XCTAssertNotNil(AuthenticationManager.shared.currentUser, "Current user should be set after successful login")
                XCTAssertNotNil(KeychainManager.shared.retrieveCredential(for: "userToken"), "Token should be stored in keychain")
                loginExpectation.fulfill()
                
            case .failure:
                XCTFail("Login should succeed with valid credentials")
            }
        }
        
        waitForExpectations(timeout: 2.0)
    }
    
    func testLoginFailureInvalidEmail() {
        // Create expectation for async testing
        let loginExpectation = expectation(description: "Login fails with invalid email")
        
        // Test invalid email format
        AuthenticationManager.shared.login(email: "invalid-email", password: "password123") { result in
            switch result {
            case .success:
                XCTFail("Login should fail with invalid email format")
                
            case .failure(let error):
                XCTAssertFalse(AuthenticationManager.shared.isAuthenticated, "User should not be authenticated after failed login")
                XCTAssertNil(AuthenticationManager.shared.currentUser, "Current user should be nil after failed login")
                XCTAssertNil(KeychainManager.shared.retrieveCredential(for: "userToken"), "No token should be stored after failed login")
                XCTAssertEqual((error as NSError).code, 1001, "Error code should indicate invalid email")
                loginExpectation.fulfill()
            }
        }
        
        waitForExpectations(timeout: 2.0)
    }
    
    func testLoginFailureShortPassword() {
        // Create expectation for async testing
        let loginExpectation = expectation(description: "Login fails with short password")
        
        // Test password that's too short
        AuthenticationManager.shared.login(email: "test@example.com", password: "short") { result in
            switch result {
            case .success:
                XCTFail("Login should fail with short password")
                
            case .failure(let error):
                XCTAssertFalse(AuthenticationManager.shared.isAuthenticated, "User should not be authenticated after failed login")
                XCTAssertNil(AuthenticationManager.shared.currentUser, "Current user should be nil after failed login")
                XCTAssertNil(KeychainManager.shared.retrieveCredential(for: "userToken"), "No token should be stored after failed login")
                XCTAssertEqual((error as NSError).code, 1002, "Error code should indicate invalid password")
                loginExpectation.fulfill()
            }
        }
        
        waitForExpectations(timeout: 2.0)
    }
    
    func testRegistrationSuccess() {
        // Create expectation for async testing
        let registrationExpectation = expectation(description: "Registration successful")
        
        // Test valid registration
        AuthenticationManager.shared.register(name: "Test User", email: "test@example.com", password: "password123") { result in
            switch result {
            case .success(let user):
                XCTAssertEqual(user.name, "Test User", "User name should match registration name")
                XCTAssertEqual(user.email, "test@example.com", "User email should match registration email")
                XCTAssertTrue(AuthenticationManager.shared.isAuthenticated, "User should be authenticated after successful registration")
                XCTAssertNotNil(AuthenticationManager.shared.currentUser, "Current user should be set after successful registration")
                XCTAssertNotNil(KeychainManager.shared.retrieveCredential(for: "userToken"), "Token should be stored in keychain")
                registrationExpectation.fulfill()
                
            case .failure:
                XCTFail("Registration should succeed with valid information")
            }
        }
        
        waitForExpectations(timeout: 2.0)
    }
    
    func testLogout() {
        // First login to set up authenticated state
        let loginExpectation = expectation(description: "Login for logout test")
        
        AuthenticationManager.shared.login(email: "test@example.com", password: "password123") { result in
            switch result {
            case .success:
                loginExpectation.fulfill()
            case .failure:
                XCTFail("Login should succeed for logout test")
            }
        }
        
        waitForExpectations(timeout: 2.0)
        
        // Now test logout
        let logoutExpectation = expectation(description: "Logout successful")
        
        AuthenticationManager.shared.logout { success in
            XCTAssertTrue(success, "Logout should succeed")
            XCTAssertFalse(AuthenticationManager.shared.isAuthenticated, "User should not be authenticated after logout")
            XCTAssertNil(AuthenticationManager.shared.currentUser, "Current user should be nil after logout")
            XCTAssertNil(KeychainManager.shared.retrieveCredential(for: "userToken"), "Token should be removed from keychain after logout")
            logoutExpectation.fulfill()
        }
        
        waitForExpectations(timeout: 2.0)
    }
    
    func testCheckAuthentication() {
        // First store a token to simulate previous login
        KeychainManager.shared.storeCredential("mock-token-123", for: "userToken")
        
        // Test authentication check
        let checkExpectation = expectation(description: "Check authentication")
        
        AuthenticationManager.shared.checkAuthentication { isAuthenticated in
            XCTAssertTrue(isAuthenticated, "Should be authenticated with token in keychain")
            XCTAssertTrue(AuthenticationManager.shared.isAuthenticated, "isAuthenticated property should be true")
            XCTAssertNotNil(AuthenticationManager.shared.currentUser, "Current user should be set")
            checkExpectation.fulfill()
        }
        
        waitForExpectations(timeout: 2.0)
        
        // Now remove token and test again
        KeychainManager.shared.deleteCredential(for: "userToken")
        
        let checkAgainExpectation = expectation(description: "Check authentication without token")
        
        AuthenticationManager.shared.checkAuthentication { isAuthenticated in
            XCTAssertFalse(isAuthenticated, "Should not be authenticated without token in keychain")
            XCTAssertFalse(AuthenticationManager.shared.isAuthenticated, "isAuthenticated property should be false")
            XCTAssertNil(AuthenticationManager.shared.currentUser, "Current user should be nil")
            checkAgainExpectation.fulfill()
        }
        
        waitForExpectations(timeout: 2.0)
    }
    
    func testPasswordReset() {
        // Test password reset with valid email
        let resetExpectation = expectation(description: "Password reset")
        
        AuthenticationManager.shared.resetPassword(email: "test@example.com") { result in
            switch result {
            case .success:
                resetExpectation.fulfill()
            case .failure:
                XCTFail("Password reset should succeed with valid email")
            }
        }
        
        waitForExpectations(timeout: 2.0)
        
        // Test password reset with invalid email
        let resetFailExpectation = expectation(description: "Password reset fails with invalid email")
        
        AuthenticationManager.shared.resetPassword(email: "invalid-email") { result in
            switch result {
            case .success:
                XCTFail("Password reset should fail with invalid email")
            case .failure(let error):
                XCTAssertEqual((error as NSError).code, 1001, "Error code should indicate invalid email")
                resetFailExpectation.fulfill()
            }
        }
        
        waitForExpectations(timeout: 2.0)
    }
}
