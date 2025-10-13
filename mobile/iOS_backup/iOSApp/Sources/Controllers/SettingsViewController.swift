import UIKit

class SettingsViewController: UIViewController {
    
    // MARK: - UI Components
    
    private let tableView = UITableView(frame: .zero, style: .insetGrouped)
    
    // MARK: - Data
    
    private let sections = ["Account", "Audio", "Location", "Notifications", "Privacy", "About"]
    private var settings: [[Setting]] = []
    
    // MARK: - Lifecycle Methods
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupUI()
        configureSettings()
    }
    
    // MARK: - UI Setup
    
    private func setupUI() {
        view.backgroundColor = .systemBackground
        title = "Settings"
        
        // Table View
        tableView.delegate = self
        tableView.dataSource = self
        tableView.register(SettingCell.self, forCellReuseIdentifier: "SettingCell")
        tableView.register(SwitchSettingCell.self, forCellReuseIdentifier: "SwitchSettingCell")
        
        // Add subviews and set constraints
        tableView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(tableView)
        
        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }
    
    // MARK: - Settings Configuration
    
    private func configureSettings() {
        // Account Settings
        let accountSettings: [Setting] = [
            Setting(title: "Profile", type: .navigation, action: { [weak self] in
                self?.navigateToProfile()
            }),
            Setting(title: "Subscription", type: .navigation, action: { [weak self] in
                self?.navigateToSubscription()
            }),
            Setting(title: "Sign Out", type: .destructive, action: { [weak self] in
                self?.signOut()
            })
        ]
        
        // Audio Settings
        let audioSettings: [Setting] = [
            Setting(title: "Audio Quality", type: .navigation, subtitle: "High", action: { [weak self] in
                self?.showAudioQualityOptions()
            }),
            Setting(title: "Background Audio", type: .toggle, isOn: true, action: { isOn in
                UserDefaults.standard.set(isOn, forKey: "backgroundAudio")
            }),
            Setting(title: "Noise Cancellation", type: .toggle, isOn: true, action: { isOn in
                UserDefaults.standard.set(isOn, forKey: "noiseCancellation")
            }),
            Setting(title: "Auto-Mute on Join", type: .toggle, isOn: false, action: { isOn in
                UserDefaults.standard.set(isOn, forKey: "autoMuteOnJoin")
            })
        ]
        
        // Location Settings
        let locationSettings: [Setting] = [
            Setting(title: "Location Accuracy", type: .navigation, subtitle: "Best", action: { [weak self] in
                self?.showLocationAccuracyOptions()
            }),
            Setting(title: "Background Location", type: .toggle, isOn: true, action: { isOn in
                UserDefaults.standard.set(isOn, forKey: "backgroundLocation")
            }),
            Setting(title: "Location History", type: .toggle, isOn: false, action: { isOn in
                UserDefaults.standard.set(isOn, forKey: "locationHistory")
            })
        ]
        
        // Notification Settings
        let notificationSettings: [Setting] = [
            Setting(title: "Proximity Alerts", type: .toggle, isOn: true, action: { isOn in
                UserDefaults.standard.set(isOn, forKey: "proximityAlerts")
            }),
            Setting(title: "Group Invitations", type: .toggle, isOn: true, action: { isOn in
                UserDefaults.standard.set(isOn, forKey: "groupInvitations")
            }),
            Setting(title: "New Member Joins", type: .toggle, isOn: true, action: { isOn in
                UserDefaults.standard.set(isOn, forKey: "newMemberJoins")
            })
        ]
        
        // Privacy Settings
        let privacySettings: [Setting] = [
            Setting(title: "Data Encryption", type: .toggle, isOn: true, action: { isOn in
                UserDefaults.standard.set(isOn, forKey: "dataEncryption")
            }),
            Setting(title: "Privacy Policy", type: .navigation, action: { [weak self] in
                self?.showPrivacyPolicy()
            }),
            Setting(title: "Delete Account", type: .destructive, action: { [weak self] in
                self?.confirmDeleteAccount()
            })
        ]
        
        // About Settings
        let aboutSettings: [Setting] = [
            Setting(title: "Version", type: .info, subtitle: "1.0.0"),
            Setting(title: "Terms of Service", type: .navigation, action: { [weak self] in
                self?.showTermsOfService()
            }),
            Setting(title: "Help & Support", type: .navigation, action: { [weak self] in
                self?.showHelpAndSupport()
            })
        ]
        
        settings = [accountSettings, audioSettings, locationSettings, notificationSettings, privacySettings, aboutSettings]
    }
    
    // MARK: - Actions
    
    private func navigateToProfile() {
        // Navigate to profile screen
        let profileVC = UIViewController()
        profileVC.title = "Profile"
        profileVC.view.backgroundColor = .systemBackground
        navigationController?.pushViewController(profileVC, animated: true)
    }
    
    private func navigateToSubscription() {
        // Navigate to subscription screen
        let subscriptionVC = UIViewController()
        subscriptionVC.title = "Subscription"
        subscriptionVC.view.backgroundColor = .systemBackground
        navigationController?.pushViewController(subscriptionVC, animated: true)
    }
    
    private func signOut() {
        let alertController = UIAlertController(
            title: "Sign Out",
            message: "Are you sure you want to sign out?",
            preferredStyle: .alert
        )
        
        let signOutAction = UIAlertAction(title: "Sign Out", style: .destructive) { _ in
            // Perform sign out
            print("User signed out")
            // Navigate to login screen
        }
        
        let cancelAction = UIAlertAction(title: "Cancel", style: .cancel)
        
        alertController.addAction(signOutAction)
        alertController.addAction(cancelAction)
        
        present(alertController, animated: true)
    }
    
    private func showAudioQualityOptions() {
        let alertController = UIAlertController(
            title: "Audio Quality",
            message: "Select audio quality level",
            preferredStyle: .actionSheet
        )
        
        let qualities = ["Low", "Medium", "High", "Maximum"]
        
        for quality in qualities {
            let action = UIAlertAction(title: quality, style: .default) { _ in
                // Save selected quality
                UserDefaults.standard.set(quality, forKey: "audioQuality")
                self.tableView.reloadData()
            }
            alertController.addAction(action)
        }
        
        let cancelAction = UIAlertAction(title: "Cancel", style: .cancel)
        alertController.addAction(cancelAction)
        
        present(alertController, animated: true)
    }
    
    private func showLocationAccuracyOptions() {
        let alertController = UIAlertController(
            title: "Location Accuracy",
            message: "Select location accuracy level",
            preferredStyle: .actionSheet
        )
        
        let accuracies = ["Low", "Medium", "High", "Best"]
        
        for accuracy in accuracies {
            let action = UIAlertAction(title: accuracy, style: .default) { _ in
                // Save selected accuracy
                UserDefaults.standard.set(accuracy, forKey: "locationAccuracy")
                self.tableView.reloadData()
            }
            alertController.addAction(action)
        }
        
        let cancelAction = UIAlertAction(title: "Cancel", style: .cancel)
        alertController.addAction(cancelAction)
        
        present(alertController, animated: true)
    }
    
    private func showPrivacyPolicy() {
        let privacyVC = UIViewController()
        privacyVC.title = "Privacy Policy"
        privacyVC.view.backgroundColor = .systemBackground
        navigationController?.pushViewController(privacyVC, animated: true)
    }
    
    private func confirmDeleteAccount() {
        let alertController = UIAlertController(
            title: "Delete Account",
            message: "Are you sure you want to delete your account? This action cannot be undone.",
            preferredStyle: .alert
        )
        
        let deleteAction = UIAlertAction(title: "Delete", style: .destructive) { _ in
            // Perform account deletion
            print("Account deleted")
            // Navigate to login screen
        }
        
        let cancelAction = UIAlertAction(title: "Cancel", style: .cancel)
        
        alertController.addAction(deleteAction)
        alertController.addAction(cancelAction)
        
        present(alertController, animated: true)
    }
    
    private func showTermsOfService() {
        let termsVC = UIViewController()
        termsVC.title = "Terms of Service"
        termsVC.view.backgroundColor = .systemBackground
        navigationController?.pushViewController(termsVC, animated: true)
    }
    
    private func showHelpAndSupport() {
        let helpVC = UIViewController()
        helpVC.title = "Help & Support"
        helpVC.view.backgroundColor = .systemBackground
        navigationController?.pushViewController(helpVC, animated: true)
    }
}

// MARK: - UITableViewDataSource & Delegate

extension SettingsViewController: UITableViewDataSource, UITableViewDelegate {
    func numberOfSections(in tableView: UITableView) -> Int {
        return sections.count
    }
    
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return settings[section].count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let setting = settings[indexPath.section][indexPath.row]
        
        if setting.type == .toggle {
            let cell = tableView.dequeueReusableCell(withIdentifier: "SwitchSettingCell", for: indexPath) as! SwitchSettingCell
            cell.configure(with: setting)
            return cell
        } else {
            let cell = tableView.dequeueReusableCell(withIdentifier: "SettingCell", for: indexPath) as! SettingCell
            cell.configure(with: setting)
            return cell
        }
    }
    
    func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        return sections[section]
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        let setting = settings[indexPath.section][indexPath.row]
        if setting.type != .toggle && setting.type != .info {
            setting.action?()
        }
    }
}

// MARK: - Setting Model

enum SettingType {
    case navigation
    case toggle
    case destructive
    case info
}

struct Setting {
    let title: String
    let type: SettingType
    var subtitle: String?
    var isOn: Bool = false
    var action: (() -> Void)?
    var toggleAction: ((Bool) -> Void)?
    
    init(title: String, type: SettingType, subtitle: String? = nil, isOn: Bool = false, action: (() -> Void)? = nil) {
        self.title = title
        self.type = type
        self.subtitle = subtitle
        self.isOn = isOn
        self.action = action
    }
    
    init(title: String, type: SettingType, isOn: Bool, action: @escaping (Bool) -> Void) {
        self.title = title
        self.type = type
        self.isOn = isOn
        self.toggleAction = action
    }
}

// MARK: - SettingCell

class SettingCell: UITableViewCell {
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: .value1, reuseIdentifier: reuseIdentifier)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    func configure(with setting: Setting) {
        textLabel?.text = setting.title
        detailTextLabel?.text = setting.subtitle
        
        switch setting.type {
        case .navigation:
            accessoryType = .disclosureIndicator
            textLabel?.textColor = .label
        case .destructive:
            accessoryType = .none
            textLabel?.textColor = .systemRed
        case .info:
            accessoryType = .none
            textLabel?.textColor = .label
            selectionStyle = .none
        default:
            accessoryType = .none
            textLabel?.textColor = .label
        }
    }
}

// MARK: - SwitchSettingCell

class SwitchSettingCell: UITableViewCell {
    private let switchControl = UISwitch()
    private var setting: Setting?
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: .default, reuseIdentifier: reuseIdentifier)
        
        selectionStyle = .none
        switchControl.addTarget(self, action: #selector(switchValueChanged), for: .valueChanged)
        accessoryView = switchControl
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    func configure(with setting: Setting) {
        self.setting = setting
        textLabel?.text = setting.title
        switchControl.isOn = setting.isOn
    }
    
    @objc private func switchValueChanged() {
        setting?.toggleAction?(switchControl.isOn)
    }
}
