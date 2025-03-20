import Foundation
import CommonCrypto

class SecurityManager {
    
    // MARK: - Singleton
    
    static let shared = SecurityManager()
    
    private init() {
        // Private initializer to enforce singleton pattern
    }
    
    // MARK: - Encryption Keys
    
    private var encryptionKey: Data?
    private var encryptionIV: Data?
    
    // MARK: - Setup
    
    func initialize() {
        // Generate or retrieve encryption keys
        if let savedKey = KeychainManager.shared.retrieveKey(for: "encryptionKey") {
            encryptionKey = savedKey
        } else {
            encryptionKey = generateRandomKey(length: 32) // 256 bits
            KeychainManager.shared.storeKey(encryptionKey!, for: "encryptionKey")
        }
        
        if let savedIV = KeychainManager.shared.retrieveKey(for: "encryptionIV") {
            encryptionIV = savedIV
        } else {
            encryptionIV = generateRandomKey(length: 16) // 128 bits
            KeychainManager.shared.storeKey(encryptionIV!, for: "encryptionIV")
        }
    }
    
    // MARK: - Key Generation
    
    private func generateRandomKey(length: Int) -> Data {
        var keyData = Data(count: length)
        let result = keyData.withUnsafeMutableBytes {
            SecRandomCopyBytes(kSecRandomDefault, length, $0.baseAddress!)
        }
        
        if result == errSecSuccess {
            return keyData
        } else {
            fatalError("Failed to generate random key")
        }
    }
    
    // MARK: - Encryption
    
    func encryptData(_ data: Data) -> Data? {
        guard let key = encryptionKey, let iv = encryptionIV else {
            print("Encryption keys not initialized")
            return nil
        }
        
        let bufferSize = data.count + kCCBlockSizeAES128
        var encryptedData = Data(count: bufferSize)
        
        var numBytesEncrypted = 0
        
        let cryptStatus = key.withUnsafeBytes { keyBytes in
            iv.withUnsafeBytes { ivBytes in
                data.withUnsafeBytes { dataBytes in
                    encryptedData.withUnsafeMutableBytes { encryptedBytes in
                        CCCrypt(
                            CCOperation(kCCEncrypt),
                            CCAlgorithm(kCCAlgorithmAES),
                            CCOptions(kCCOptionPKCS7Padding),
                            keyBytes.baseAddress,
                            key.count,
                            ivBytes.baseAddress,
                            dataBytes.baseAddress,
                            data.count,
                            encryptedBytes.baseAddress,
                            bufferSize,
                            &numBytesEncrypted
                        )
                    }
                }
            }
        }
        
        if cryptStatus == kCCSuccess {
            encryptedData.count = numBytesEncrypted
            return encryptedData
        } else {
            print("Error encrypting data: \(cryptStatus)")
            return nil
        }
    }
    
    func decryptData(_ data: Data) -> Data? {
        guard let key = encryptionKey, let iv = encryptionIV else {
            print("Encryption keys not initialized")
            return nil
        }
        
        let bufferSize = data.count + kCCBlockSizeAES128
        var decryptedData = Data(count: bufferSize)
        
        var numBytesDecrypted = 0
        
        let cryptStatus = key.withUnsafeBytes { keyBytes in
            iv.withUnsafeBytes { ivBytes in
                data.withUnsafeBytes { dataBytes in
                    decryptedData.withUnsafeMutableBytes { decryptedBytes in
                        CCCrypt(
                            CCOperation(kCCDecrypt),
                            CCAlgorithm(kCCAlgorithmAES),
                            CCOptions(kCCOptionPKCS7Padding),
                            keyBytes.baseAddress,
                            key.count,
                            ivBytes.baseAddress,
                            dataBytes.baseAddress,
                            data.count,
                            decryptedBytes.baseAddress,
                            bufferSize,
                            &numBytesDecrypted
                        )
                    }
                }
            }
        }
        
        if cryptStatus == kCCSuccess {
            decryptedData.count = numBytesDecrypted
            return decryptedData
        } else {
            print("Error decrypting data: \(cryptStatus)")
            return nil
        }
    }
    
    // MARK: - String Encryption Helpers
    
    func encryptString(_ string: String) -> String? {
        guard let data = string.data(using: .utf8) else { return nil }
        guard let encryptedData = encryptData(data) else { return nil }
        return encryptedData.base64EncodedString()
    }
    
    func decryptString(_ encryptedString: String) -> String? {
        guard let data = Data(base64Encoded: encryptedString) else { return nil }
        guard let decryptedData = decryptData(data) else { return nil }
        return String(data: decryptedData, encoding: .utf8)
    }
    
    // MARK: - Secure Audio Data
    
    func encryptAudioData(_ audioData: Data) -> Data? {
        return encryptData(audioData)
    }
    
    func decryptAudioData(_ encryptedAudioData: Data) -> Data? {
        return decryptData(encryptedAudioData)
    }
    
    // MARK: - Secure Location Data
    
    func encryptLocationData(_ locationData: Data) -> Data? {
        return encryptData(locationData)
    }
    
    func decryptLocationData(_ encryptedLocationData: Data) -> Data? {
        return decryptData(encryptedLocationData)
    }
    
    // MARK: - Hashing
    
    func hashString(_ string: String) -> String {
        guard let data = string.data(using: .utf8) else { return "" }
        
        var digest = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        
        data.withUnsafeBytes { bytes in
            _ = CC_SHA256(bytes.baseAddress, CC_LONG(data.count), &digest)
        }
        
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}

// MARK: - KeychainManager

class KeychainManager {
    
    // MARK: - Singleton
    
    static let shared = KeychainManager()
    
    private init() {
        // Private initializer to enforce singleton pattern
    }
    
    // MARK: - Keychain Operations
    
    func storeKey(_ key: Data, for identifier: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: identifier.data(using: .utf8)!,
            kSecValueData as String: key
        ]
        
        // Delete any existing key before saving
        SecItemDelete(query as CFDictionary)
        
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }
    
    func retrieveKey(for identifier: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: identifier.data(using: .utf8)!,
            kSecReturnData as String: true
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        if status == errSecSuccess {
            return result as? Data
        } else {
            return nil
        }
    }
    
    func deleteKey(for identifier: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: identifier.data(using: .utf8)!
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess
    }
    
    // MARK: - Secure Storage
    
    func storeCredential(_ credential: String, for account: String) -> Bool {
        guard let data = credential.data(using: .utf8) else { return false }
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: account,
            kSecValueData as String: data
        ]
        
        // Delete any existing credential before saving
        SecItemDelete(query as CFDictionary)
        
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }
    
    func retrieveCredential(for account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        if status == errSecSuccess, let data = result as? Data {
            return String(data: data, encoding: .utf8)
        } else {
            return nil
        }
    }
    
    func deleteCredential(for account: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: account
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess
    }
}
