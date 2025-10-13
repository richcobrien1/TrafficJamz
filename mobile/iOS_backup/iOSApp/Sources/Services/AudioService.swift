import Foundation
import AVFoundation

protocol AudioServiceDelegate: AnyObject {
    func audioServiceDidConnect()
    func audioServiceDidDisconnect()
    func audioServiceDidUpdateParticipants()
}

class AudioService {
    
    // MARK: - Properties
    
    weak var delegate: AudioServiceDelegate?
    
    private var audioEngine: AVAudioEngine?
    private var audioPlayerNode: AVAudioPlayerNode?
    private var audioMixerNode: AVAudioMixerNode?
    private var audioInputNode: AVAudioInputNode?
    
    private var webSocketConnection: URLSessionWebSocketTask?
    private var isConnecting = false
    private var reconnectTimer: Timer?
    
    private(set) var isConnected = false
    private(set) var isMicrophoneMuted = false
    private(set) var isSpeakerMuted = false
    private(set) var currentVolume: Float = 0.5
    
    // MARK: - Initialization
    
    init() {
        setupAudioEngine()
    }
    
    deinit {
        disconnect()
    }
    
    // MARK: - Audio Engine Setup
    
    private func setupAudioEngine() {
        audioEngine = AVAudioEngine()
        
        guard let audioEngine = audioEngine else { return }
        
        // Get the audio engine's input and mixer nodes
        audioInputNode = audioEngine.inputNode
        audioMixerNode = audioEngine.mainMixerNode
        
        // Create a player node for playback
        audioPlayerNode = AVAudioPlayerNode()
        
        if let playerNode = audioPlayerNode {
            audioEngine.attach(playerNode)
            audioEngine.connect(playerNode, to: audioMixerNode!, format: audioInputNode?.outputFormat(forBus: 0))
        }
        
        // Set up audio processing chain
        if let inputNode = audioInputNode {
            let inputFormat = inputNode.outputFormat(forBus: 0)
            audioEngine.connect(inputNode, to: audioMixerNode!, format: inputFormat)
        }
        
        // Prepare the audio engine
        do {
            try audioEngine.start()
            print("Audio engine started successfully")
        } catch {
            print("Failed to start audio engine: \(error.localizedDescription)")
        }
    }
    
    // MARK: - Connection Management
    
    func connect() {
        guard !isConnected && !isConnecting else { return }
        
        isConnecting = true
        
        // Simulate connection to backend service
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            guard let self = self else { return }
            
            self.isConnected = true
            self.isConnecting = false
            self.delegate?.audioServiceDidConnect()
            
            // Start receiving audio data
            self.startReceivingAudioData()
        }
    }
    
    func disconnect() {
        guard isConnected || isConnecting else { return }
        
        isConnected = false
        isConnecting = false
        
        // Stop receiving audio data
        stopReceivingAudioData()
        
        // Notify delegate
        delegate?.audioServiceDidDisconnect()
        
        // Cancel reconnect timer if active
        reconnectTimer?.invalidate()
        reconnectTimer = nil
    }
    
    private func reconnect() {
        disconnect()
        
        // Attempt to reconnect after a delay
        reconnectTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: false) { [weak self] _ in
            self?.connect()
        }
    }
    
    // MARK: - Audio Data Handling
    
    private func startReceivingAudioData() {
        // In a real implementation, this would establish WebSocket connection
        // and start processing incoming audio packets
        
        // For simulation, we'll just update participants after a delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.delegate?.audioServiceDidUpdateParticipants()
        }
    }
    
    private func stopReceivingAudioData() {
        // In a real implementation, this would close WebSocket connection
        // and stop processing incoming audio packets
    }
    
    // MARK: - Audio Control
    
    func muteMicrophone(_ mute: Bool) {
        isMicrophoneMuted = mute
        
        if let inputNode = audioInputNode {
            // In a real implementation, this would either disconnect the input node
            // or set its volume to zero
            
            if mute {
                // Mute by setting volume to 0
                inputNode.volume = 0
            } else {
                // Unmute by setting volume back to normal
                inputNode.volume = 1
            }
        }
    }
    
    func muteSpeaker(_ mute: Bool) {
        isSpeakerMuted = mute
        
        if let playerNode = audioPlayerNode {
            // In a real implementation, this would either pause the player node
            // or set its volume to zero
            
            if mute {
                playerNode.volume = 0
            } else {
                playerNode.volume = currentVolume
            }
        }
    }
    
    func setVolume(_ volume: Float) {
        currentVolume = volume
        
        if let playerNode = audioPlayerNode, !isSpeakerMuted {
            playerNode.volume = volume
        }
    }
    
    // MARK: - Music Sharing
    
    func shareMusic(fileURL: URL) {
        guard isConnected else { return }
        
        // In a real implementation, this would:
        // 1. Read the audio file
        // 2. Potentially transcode it to a suitable format
        // 3. Send it over the WebSocket connection
        
        print("Sharing music from: \(fileURL.lastPathComponent)")
        
        // For simulation, we'll just log the action
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            print("Music shared successfully")
        }
    }
}
