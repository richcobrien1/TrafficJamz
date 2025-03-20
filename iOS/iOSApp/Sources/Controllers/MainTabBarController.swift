import UIKit

class MainTabBarController: UITabBarController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupViewControllers()
        configureTabBarAppearance()
    }
    
    private func setupViewControllers() {
        // Audio Communication Tab
        let audioVC = AudioCommunicationViewController()
        let audioNavController = UINavigationController(rootViewController: audioVC)
        audioNavController.tabBarItem = UITabBarItem(title: "Audio", image: UIImage(systemName: "mic.fill"), tag: 0)
        
        // Location Tracking Tab
        let locationVC = LocationTrackingViewController()
        let locationNavController = UINavigationController(rootViewController: locationVC)
        locationNavController.tabBarItem = UITabBarItem(title: "Location", image: UIImage(systemName: "location.fill"), tag: 1)
        
        // Group Management Tab
        let groupVC = GroupManagementViewController()
        let groupNavController = UINavigationController(rootViewController: groupVC)
        groupNavController.tabBarItem = UITabBarItem(title: "Groups", image: UIImage(systemName: "person.3.fill"), tag: 2)
        
        // Settings Tab
        let settingsVC = SettingsViewController()
        let settingsNavController = UINavigationController(rootViewController: settingsVC)
        settingsNavController.tabBarItem = UITabBarItem(title: "Settings", image: UIImage(systemName: "gear"), tag: 3)
        
        // Set view controllers
        viewControllers = [audioNavController, locationNavController, groupNavController, settingsNavController]
    }
    
    private func configureTabBarAppearance() {
        // Configure tab bar appearance
        if #available(iOS 15.0, *) {
            let appearance = UITabBarAppearance()
            appearance.configureWithOpaqueBackground()
            appearance.backgroundColor = .systemBackground
            
            tabBar.standardAppearance = appearance
            tabBar.scrollEdgeAppearance = appearance
        }
        
        tabBar.tintColor = .systemBlue
    }
}
