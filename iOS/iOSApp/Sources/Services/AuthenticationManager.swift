import Foundation
import UIKit

class AuthenticationManager {
    
    // MARK: - Singleton
    
    static let shared = AuthenticationManager()
    
    private init() {
        // Private initializer to enforce singleton pattern
    }
    
    // MARK: - Properties
    
    private(set) var isAuthenticated = false
    private(set) var currentUser: User?
    
    // MARK: - Authentication
    
    func login(email: String, password: String, completion: @escaping (Result<User, Error>) -> Void) {
        // In a real implementation, this would make an API call to authenticate the user
        
        // For simulation, we'll validate locally and return a mock user
        guard isValidEmail(email) else {
            let error = NSError(domain: "AuthenticationManager", code: 1001, userInfo: [NSLocalizedDescriptionKey: "Invalid email format"])
            completion(.failure(error))
            return
        }
        
        guard isValidPassword(password) else {
            let error = NSError(domain: "AuthenticationManager", code: 1002, userInfo: [NSLocalizedDescriptionKey: "Password must be at least 8 characters"])
            completion(.failure(error))
            return
        }
        
        // Simulate network request
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            // Create mock user
            let user = User(id: "user123", name: "Test User", email: email)
            
            // Store authentication token in keychain
            let token = self.generateMockToken()
            KeychainManager.shared.storeCredential(token, for: "userToken")
            
            // Update state
            self.isAuthenticated = true
            self.currentUser = user
            
            // Return success
            completion(.success(user))
        }
    }
    
    func register(name: String, email: String, password: String, completion: @escaping (Result<User, Error>) -> Void) {
        // In a real implementation, this would make an API call to register the user
        
        // For simulation, we'll validate locally and return a mock user
        guard !name.isEmpty else {
            let error = NSError(domain: "AuthenticationManager", code: 1000, userInfo: [NSLocalizedDescriptionKey: "Name cannot be empty"])
            completion(.failure(error))
            return
        }
        
        guard isValidEmail(email) else {
            let error = NSError(domain: "AuthenticationManager", code: 1001, userInfo: [NSLocalizedDescriptionKey: "Invalid email format"])
            completion(.failure(error))
            return
        }
        
        guard isValidPassword(password) else {
            let error = NSError(domain: "AuthenticationManager", code: 1002, userInfo: [NSLocalizedDescriptionKey: "Password must be at least 8 characters"])
            completion(.failure(error))
            return
        }
        
        // Simulate network request
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            // Create mock user
            let user = User(id: "user123", name: name, email: email)
            
            // Store authentication token in keychain
            let token = self.generateMockToken()
            KeychainManager.shared.storeCredential(token, for: "userToken")
            
            // Update state
            self.isAuthenticated = true
            self.currentUser = user
            
            // Return success
            completion(.success(user))
        }
    }
    
    func logout(completion: @escaping (Bool) -> Void) {
        // In a real implementation, this would make an API call to invalidate the token
        
        // Clear authentication token from keychain
        KeychainManager.shared.deleteCredential(for: "userToken")
        
        // Update state
        isAuthenticated = false
        currentUser = nil
        
        // Return success
        completion(true)
    }
    
    func checkAuthentication(completion: @escaping (Bool) -> Void) {
        // Check if we have a stored token
        if let token = KeychainManager.shared.retrieveCredential(for: "userToken") {
            // In a real implementation, this would validate the token with the server
            
            // For simulation, we'll just check if the token exists and create a mock user
            isAuthenticated = true
            currentUser = User(id: "user123", name: "Test User", email: "test@example.com")
            completion(true)
        } else {
            isAuthenticated = false
            currentUser = nil
            completion(false)
        }
    }
    
    // MARK: - Password Reset
    
    func resetPassword(email: String, completion: @escaping (Result<Void, Error>) -> Void) {
        // In a real implementation, this would make an API call to initiate password reset
        
        guard isValidEmail(email) else {
            let error = NSError(domain: "AuthenticationManager", code: 1001, userInfo: [NSLocalizedDescriptionKey: "Invalid email format"])
            completion(.failure(error))
            return
        }
        
        // Simulate network request
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            // Return success
            completion(.success(()))
        }
    }
    
    // MARK: - Biometric Authentication
    
    func canUseBiometricAuthentication() -> Bool {
        // In a real implementation, this would check if the device supports biometric authentication
        return true
    }
    
    func authenticateWithBiometrics(completion: @escaping (Result<Void, Error>) -> Void) {
        // In a real implementation, this would use LocalAuthentication framework to authenticate
        
        // For simulation, we'll just return success
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            completion(.success(()))
        }
    }
    
    // MARK: - Helper Methods
    
    private func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
    
    private func isValidPassword(_ password: String) -> Bool {
        return password.count >= 8
    }
    
    private func generateMockToken() -> String {
        let letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        return String((0..<64).map { _ in letters.randomElement()! })
    }
}

// MARK: - User Model

struct User {
    let id: String
    let name: String
    let email: String
    var profileImageURL: URL?
    var phoneNumber: String?
    var isSubscribed: Bool = true
    var subscriptionExpiryDate: Date?
    
    init(id: String, name: String, email: String) {
        self.id = id
        self.name = name
        self.email = email
        
        // Set mock subscription expiry date (1 year from now)
        let calendar = Calendar.current
        self.subscriptionExpiryDate = calendar.date(byAdding: .year, value: 1, to: Date())
    }
}

// MARK: - Login View Controller

class LoginViewController: UIViewController {
    
    // MARK: - UI Components
    
    private let logoImageView = UIImageView()
    private let emailTextField = UITextField()
    private let passwordTextField = UITextField()
    private let loginButton = UIButton(type: .system)
    private let registerButton = UIButton(type: .system)
    private let forgotPasswordButton = UIButton(type: .system)
    private let biometricButton = UIButton(type: .system)
    private let activityIndicator = UIActivityIndicatorView(style: .large)
    
    // MARK: - Lifecycle Methods
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupUI()
    }
    
    // MARK: - UI Setup
    
    private func setupUI() {
        view.backgroundColor = .systemBackground
        title = "Login"
        
        // Logo Image View
        logoImageView.image = UIImage(systemName: "person.3.fill")
        logoImageView.tintColor = .systemBlue
        logoImageView.contentMode = .scaleAspectFit
        
        // Email Text Field
        emailTextField.placeholder = "Email"
        emailTextField.keyboardType = .emailAddress
        emailTextField.autocapitalizationType = .none
        emailTextField.borderStyle = .roundedRect
        emailTextField.autocorrectionType = .no
        
        // Password Text Field
        passwordTextField.placeholder = "Password"
        passwordTextField.isSecureTextEntry = true
        passwordTextField.borderStyle = .roundedRect
        
        // Login Button
        loginButton.setTitle("Login", for: .normal)
        loginButton.backgroundColor = .systemBlue
        loginButton.setTitleColor(.white, for: .normal)
        loginButton.layer.cornerRadius = 10
        loginButton.addTarget(self, action: #selector(loginTapped), for: .touchUpInside)
        
        // Register Button
        registerButton.setTitle("Don't have an account? Register", for: .normal)
        registerButton.addTarget(self, action: #selector(registerTapped), for: .touchUpInside)
        
        // Forgot Password Button
        forgotPasswordButton.setTitle("Forgot Password?", for: .normal)
        forgotPasswordButton.addTarget(self, action: #selector(forgotPasswordTapped), for: .touchUpInside)
        
        // Biometric Button
        if AuthenticationManager.shared.canUseBiometricAuthentication() {
            biometricButton.setImage(UIImage(systemName: "faceid"), for: .normal)
            biometricButton.addTarget(self, action: #selector(biometricTapped), for: .touchUpInside)
        } else {
            biometricButton.isHidden = true
        }
        
        // Activity Indicator
        activityIndicator.hidesWhenStopped = true
        
        // Add subviews and set constraints
        [logoImageView, emailTextField, passwordTextField, loginButton, 
         registerButton, forgotPasswordButton, biometricButton, activityIndicator].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview($0)
        }
        
        // Layout would be set up here with NSLayoutConstraint
        // For brevity, constraints are omitted in this example
    }
    
    // MARK: - Actions
    
    @objc private func loginTapped() {
        guard let email = emailTextField.text, !email.isEmpty,
              let password = passwordTextField.text, !password.isEmpty else {
            showAlert(title: "Error", message: "Please enter both email and password")
            return
        }
        
        // Show activity indicator
        activityIndicator.startAnimating()
        loginButton.isEnabled = false
        
        // Attempt login
        AuthenticationManager.shared.login(email: email, password: password) { [weak self] result in
            guard let self = self else { return }
            
            // Hide activity indicator
            DispatchQueue.main.async {
                self.activityIndicator.stopAnimating()
                self.loginButton.isEnabled = true
                
                switch result {
                case .success(let user):
                    print("Login successful for user: \(user.name)")
                    self.navigateToMainApp()
                    
                case .failure(let error):
                    self.showAlert(title: "Login Failed", message: error.localizedDescription)
                }
            }
        }
    }
    
    @objc private func registerTapped() {
        let registerVC = RegisterViewController()
        navigationController?.pushViewController(registerVC, animated: true)
    }
    
    @objc private func forgotPasswordTapped() {
        let alertController = UIAlertController(
            title: "Reset Password",
            message: "Please enter your email address",
            preferredStyle: .alert
        )
        
        alertController.addTextField { textField in
            textField.placeholder = "Email"
            textField.keyboardType = .emailAddress
            textField.autocapitalizationType = .none
        }
        
        let resetAction = UIAlertAction(title: "Reset", style: .default) { [weak self] _ in
            guard let email = alertController.textFields?.first?.text, !email.isEmpty else {
                self?.showAlert(title: "Error", message: "Please enter your email")
                return
            }
            
            self?.resetPassword(email: email)
        }
        
        let cancelAction = UIAlertAction(title: "Cancel", style: .cancel)
        
        alertController.addAction(resetAction)
        alertController.addAction(cancelAction)
        
        present(alertController, animated: true)
    }
    
    @objc private func biometricTapped() {
        AuthenticationManager.shared.authenticateWithBiometrics { [weak self] result in
            guard let self = self else { return }
            
            DispatchQueue.main.async {
                switch result {
                case .success:
                    self.navigateToMainApp()
                    
                case .failure(let error):
                    self.showAlert(title: "Authentication Failed", message: error.localizedDescription)
                }
            }
        }
    }
    
    private func resetPassword(email: String) {
        // Show activity indicator
        activityIndicator.startAnimating()
        
        AuthenticationManager.shared.resetPassword(email: email) { [weak self] result in
            guard let self = self else { return }
            
            // Hide activity indicator
            DispatchQueue.main.async {
                self.activityIndicator.stopAnimating()
                
                switch result {
                case .success:
                    self.showAlert(
                        title: "Password Reset",
                        message: "If an account exists with that email, you will receive password reset instructions."
                    )
                    
                case .failure(let error):
                    self.showAlert(title: "Error", message: error.localizedDescription)
                }
            }
        }
    }
    
    private func navigateToMainApp() {
        // In a real app, this would navigate to the main app interface
        let mainTabBarController = MainTabBarController()
        UIApplication.shared.windows.first?.rootViewController = mainTabBarController
        UIApplication.shared.windows.first?.makeKeyAndVisible()
    }
    
    private func showAlert(title: String, message: String) {
        let alertController = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alertController.addAction(UIAlertAction(title: "OK", style: .default))
        present(alertController, animated: true)
    }
}

// MARK: - Register View Controller

class RegisterViewController: UIViewController {
    
    // MARK: - UI Components
    
    private let nameTextField = UITextField()
    private let emailTextField = UITextField()
    private let passwordTextField = UITextField()
    private let confirmPasswordTextField = UITextField()
    private let registerButton = UIButton(type: .system)
    private let activityIndicator = UIActivityIndicatorView(style: .large)
    
    // MARK: - Lifecycle Methods
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupUI()
    }
    
    // MARK: - UI Setup
    
    private func setupUI() {
        view.backgroundColor = .systemBackground
        title = "Register"
        
        // Name Text Field
        nameTextField.placeholder = "Full Name"
        nameTextField.borderStyle = .roundedRect
        
        // Email Text Field
        emailTextField.placeholder = "Email"
        emailTextField.keyboardType = .emailAddress
        emailTextField.autocapitalizationType = .none
        emailTextField.borderStyle = .roundedRect
        emailTextField.autocorrectionType = .no
        
        // Password Text Field
        passwordTextField.placeholder = "Password"
        passwordTextField.isSecureTextEntry = true
        passwordTextField.borderStyle = .roundedRect
        
        // Confirm Password Text Field
        confirmPasswordTextField.placeholder = "Confirm Password"
        confirmPasswordTextField.isSecureTextEntry = true
        confirmPasswordTextField.borderStyle = .roundedRect
        
        // Register Button
        registerButton.setTitle("Register", for: .normal)
        registerButton.backgroundColor = .systemBlue
        registerButton.setTitleColor(.white, for: .normal)
        registerButton.layer.cornerRadius = 10
        registerButton.addTarget(self, action: #selector(registerTapped), for: .touchUpInside)
        
        // Activity Indicator
        activityIndicator.hidesWhenStopped = true
        
        // Add subviews and set constraints
        [nameTextField, emailTextField, passwordTextField, 
         confirmPasswordTextField, registerButton, activityIndicator].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview($0)
        }
        
        // Layout would be set up here with NSLayoutConstraint
        // For brevity, constraints are omitted in this example
    }
    
    // MARK: - Actions
    
    @objc private func registerTapped() {
        guard let name = nameTextField.text, !name.isEmpty,
              let email = emailTextField.text, !email.isEmpty,
              let password = passwordTextField.text, !password.isEmpty,
              let confirmPassword = confirmPasswordTextField.text, !confirmPassword.isEmpty else {
            showAlert(title: "Error", message: "Please fill in all fields")
            return
        }
        
        guard password == confirmPassword else {
            showAlert(title: "Error", message: "Passwords do not match")
            return
        }
        
        // Show activity indicator
        activityIndicator.startAnimating()
        registerButton.isEnabled = false
        
        // Attempt registration
        AuthenticationManager.shared.register(name: name, email: email, password: password) { [weak self] result in
            guard let self = self else { return }
            
            // Hide activity indicator
            DispatchQueue.main.async {
                self.activityIndicator.stopAnimating()
                self.registerButton.isEnabled = true
                
                switch result {
                case .success(let user):
                    print("Registration successful for user: \(user.name)")
                    self.navigateToMainApp()
                    
                case .failure(let error):
                    self.showAlert(title: "Registration Failed", message: error.localizedDescription)
                }
            }
        }
    }
    
    private func navigateToMainApp() {
        // In a real app, this would navigate to the main app interface
        let mainTabBarController = MainTabBarController()
        UIApplication.shared.windows.first?.rootViewController = mainTabBarController
        UIApplication.shared.windows.first?.makeKeyAndVisible()
    }
    
    private func showAlert(title: String, message: String) {
        let alertController = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alertController.addAction(UIAlertAction(title: "OK", style: .default))
        present(alertController, animated: true)
    }
}
