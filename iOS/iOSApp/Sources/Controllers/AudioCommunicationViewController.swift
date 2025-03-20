import UIKit
import AVFoundation

class AudioCommunicationViewController: UIViewController {
    
    // MARK: - UI Components
    
    private let statusLabel = UILabel()
    private let micButton = UIButton()
    private let speakerButton = UIButton()
    private let participantsCollectionView: UICollectionView = {
        let layout = UICollectionViewFlowLayout()
        layout.scrollDirection = .horizontal
        layout.itemSize = CGSize(width: 80, height: 100)
        layout.minimumLineSpacing = 10
        return UICollectionView(frame: .zero, collectionViewLayout: layout)
    }()
    private let volumeSlider = UISlider()
    private let musicSharingButton = UIButton()
    
    // MARK: - Audio Service
    
    private var audioService: AudioService?
    private var isMicMuted = false
    private var isSpeakerMuted = false
    
    // MARK: - Lifecycle Methods
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupUI()
        configureAudioService()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        
        // Refresh connection status
        updateConnectionStatus()
    }
    
    // MARK: - UI Setup
    
    private func setupUI() {
        view.backgroundColor = .systemBackground
        title = "Audio Communication"
        
        // Status Label
        statusLabel.text = "Connecting..."
        statusLabel.textAlignment = .center
        statusLabel.font = UIFont.systemFont(ofSize: 16, weight: .medium)
        
        // Microphone Button
        micButton.setImage(UIImage(systemName: "mic.fill"), for: .normal)
        micButton.setImage(UIImage(systemName: "mic.slash.fill"), for: .selected)
        micButton.backgroundColor = .systemBlue
        micButton.tintColor = .white
        micButton.layer.cornerRadius = 30
        micButton.addTarget(self, action: #selector(toggleMicrophone), for: .touchUpInside)
        
        // Speaker Button
        speakerButton.setImage(UIImage(systemName: "speaker.wave.2.fill"), for: .normal)
        speakerButton.setImage(UIImage(systemName: "speaker.slash.fill"), for: .selected)
        speakerButton.backgroundColor = .systemBlue
        speakerButton.tintColor = .white
        speakerButton.layer.cornerRadius = 30
        speakerButton.addTarget(self, action: #selector(toggleSpeaker), for: .touchUpInside)
        
        // Participants Collection View
        participantsCollectionView.backgroundColor = .systemBackground
        participantsCollectionView.register(ParticipantCell.self, forCellWithReuseIdentifier: "ParticipantCell")
        participantsCollectionView.dataSource = self
        participantsCollectionView.delegate = self
        
        // Volume Slider
        volumeSlider.minimumValue = 0
        volumeSlider.maximumValue = 1
        volumeSlider.value = 0.5
        volumeSlider.addTarget(self, action: #selector(volumeChanged), for: .valueChanged)
        
        // Music Sharing Button
        musicSharingButton.setTitle("Share Music", for: .normal)
        musicSharingButton.backgroundColor = .systemBlue
        musicSharingButton.layer.cornerRadius = 10
        musicSharingButton.addTarget(self, action: #selector(shareMusicTapped), for: .touchUpInside)
        
        // Add subviews and set constraints
        [statusLabel, participantsCollectionView, micButton, speakerButton, volumeSlider, musicSharingButton].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview($0)
        }
        
        // Layout would be set up here with NSLayoutConstraint
        // For brevity, constraints are omitted in this example
    }
    
    // MARK: - Audio Configuration
    
    private func configureAudioService() {
        audioService = AudioService()
        audioService?.delegate = self
        audioService?.connect()
    }
    
    private func updateConnectionStatus() {
        // Update UI based on connection status
        statusLabel.text = audioService?.isConnected == true ? "Connected" : "Disconnected"
        statusLabel.textColor = audioService?.isConnected == true ? .systemGreen : .systemRed
    }
    
    // MARK: - Actions
    
    @objc private func toggleMicrophone() {
        isMicMuted.toggle()
        micButton.isSelected = isMicMuted
        audioService?.muteMicrophone(isMicMuted)
    }
    
    @objc private func toggleSpeaker() {
        isSpeakerMuted.toggle()
        speakerButton.isSelected = isSpeakerMuted
        audioService?.muteSpeaker(isSpeakerMuted)
    }
    
    @objc private func volumeChanged(_ sender: UISlider) {
        audioService?.setVolume(sender.value)
    }
    
    @objc private func shareMusicTapped() {
        // Present music sharing options
        let musicPicker = UIDocumentPickerViewController(forOpeningContentTypes: [.audio])
        musicPicker.delegate = self
        musicPicker.allowsMultipleSelection = false
        present(musicPicker, animated: true)
    }
}

// MARK: - UICollectionView DataSource & Delegate

extension AudioCommunicationViewController: UICollectionViewDataSource, UICollectionViewDelegate {
    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return 5 // Example count
    }
    
    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "ParticipantCell", for: indexPath) as! ParticipantCell
        // Configure cell
        cell.configure(with: "User \(indexPath.item + 1)")
        return cell
    }
}

// MARK: - UIDocumentPickerDelegate

extension AudioCommunicationViewController: UIDocumentPickerDelegate {
    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let url = urls.first else { return }
        
        // Share selected music file
        audioService?.shareMusic(fileURL: url)
    }
}

// MARK: - AudioServiceDelegate

extension AudioCommunicationViewController: AudioServiceDelegate {
    func audioServiceDidConnect() {
        updateConnectionStatus()
    }
    
    func audioServiceDidDisconnect() {
        updateConnectionStatus()
    }
    
    func audioServiceDidUpdateParticipants() {
        participantsCollectionView.reloadData()
    }
}

// MARK: - ParticipantCell

class ParticipantCell: UICollectionViewCell {
    private let nameLabel = UILabel()
    private let avatarImageView = UIImageView()
    private let speakingIndicator = UIView()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupUI() {
        // Avatar Image View
        avatarImageView.backgroundColor = .systemGray5
        avatarImageView.layer.cornerRadius = 30
        avatarImageView.clipsToBounds = true
        
        // Name Label
        nameLabel.textAlignment = .center
        nameLabel.font = UIFont.systemFont(ofSize: 12)
        
        // Speaking Indicator
        speakingIndicator.backgroundColor = .systemGreen
        speakingIndicator.layer.cornerRadius = 5
        speakingIndicator.isHidden = true
        
        // Add subviews
        [avatarImageView, nameLabel, speakingIndicator].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            contentView.addSubview($0)
        }
        
        // Layout would be set up here with NSLayoutConstraint
        // For brevity, constraints are omitted in this example
    }
    
    func configure(with name: String) {
        nameLabel.text = name
    }
    
    func setSpeaking(_ isSpeaking: Bool) {
        speakingIndicator.isHidden = !isSpeaking
    }
}
