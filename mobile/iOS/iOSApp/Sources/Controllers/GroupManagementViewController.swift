import UIKit

class GroupManagementViewController: UIViewController {
    
    // MARK: - UI Components
    
    private let tableView = UITableView(frame: .zero, style: .insetGrouped)
    private let createGroupButton = UIButton(type: .system)
    private let emptyStateLabel = UILabel()
    
    // MARK: - Data
    
    private var groups: [Group] = []
    private var groupService: GroupService?
    
    // MARK: - Lifecycle Methods
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupUI()
        configureGroupService()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        
        // Refresh groups data
        fetchGroups()
    }
    
    // MARK: - UI Setup
    
    private func setupUI() {
        view.backgroundColor = .systemBackground
        title = "My Groups"
        
        // Add create group button to navigation bar
        let addButton = UIBarButtonItem(barButtonSystemItem: .add, target: self, action: #selector(createGroupTapped))
        navigationItem.rightBarButtonItem = addButton
        
        // Table View
        tableView.delegate = self
        tableView.dataSource = self
        tableView.register(GroupCell.self, forCellReuseIdentifier: "GroupCell")
        tableView.backgroundColor = .systemGroupedBackground
        
        // Empty State Label
        emptyStateLabel.text = "You don't have any groups yet.\nCreate a group to get started."
        emptyStateLabel.textAlignment = .center
        emptyStateLabel.numberOfLines = 0
        emptyStateLabel.textColor = .systemGray
        emptyStateLabel.font = UIFont.systemFont(ofSize: 16)
        emptyStateLabel.isHidden = true
        
        // Create Group Button (for empty state)
        createGroupButton.setTitle("Create New Group", for: .normal)
        createGroupButton.backgroundColor = .systemBlue
        createGroupButton.setTitleColor(.white, for: .normal)
        createGroupButton.layer.cornerRadius = 10
        createGroupButton.addTarget(self, action: #selector(createGroupTapped), for: .touchUpInside)
        createGroupButton.isHidden = true
        
        // Add subviews and set constraints
        [tableView, emptyStateLabel, createGroupButton].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview($0)
        }
        
        // Layout would be set up here with NSLayoutConstraint
        // For brevity, constraints are omitted in this example
    }
    
    // MARK: - Group Service
    
    private func configureGroupService() {
        groupService = GroupService()
        groupService?.delegate = self
    }
    
    private func fetchGroups() {
        groupService?.fetchGroups { [weak self] result in
            guard let self = self else { return }
            
            switch result {
            case .success(let groups):
                self.groups = groups
                self.tableView.reloadData()
                self.updateEmptyState()
                
            case .failure(let error):
                self.showAlert(title: "Error", message: "Failed to fetch groups: \(error.localizedDescription)")
            }
        }
    }
    
    private func updateEmptyState() {
        let isEmpty = groups.isEmpty
        emptyStateLabel.isHidden = !isEmpty
        createGroupButton.isHidden = !isEmpty
        tableView.isHidden = isEmpty
    }
    
    // MARK: - Actions
    
    @objc private func createGroupTapped() {
        let alertController = UIAlertController(title: "Create New Group", message: nil, preferredStyle: .alert)
        
        alertController.addTextField { textField in
            textField.placeholder = "Group Name"
        }
        
        let createAction = UIAlertAction(title: "Create", style: .default) { [weak self] _ in
            guard let self = self,
                  let textField = alertController.textFields?.first,
                  let groupName = textField.text, !groupName.isEmpty else {
                return
            }
            
            self.createGroup(name: groupName)
        }
        
        let cancelAction = UIAlertAction(title: "Cancel", style: .cancel)
        
        alertController.addAction(createAction)
        alertController.addAction(cancelAction)
        
        present(alertController, animated: true)
    }
    
    private func createGroup(name: String) {
        groupService?.createGroup(name: name) { [weak self] result in
            guard let self = self else { return }
            
            switch result {
            case .success:
                self.fetchGroups()
                
            case .failure(let error):
                self.showAlert(title: "Error", message: "Failed to create group: \(error.localizedDescription)")
            }
        }
    }
    
    private func showAlert(title: String, message: String) {
        let alertController = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alertController.addAction(UIAlertAction(title: "OK", style: .default))
        present(alertController, animated: true)
    }
}

// MARK: - UITableViewDataSource & Delegate

extension GroupManagementViewController: UITableViewDataSource, UITableViewDelegate {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return groups.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "GroupCell", for: indexPath) as! GroupCell
        let group = groups[indexPath.row]
        cell.configure(with: group)
        return cell
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        let group = groups[indexPath.row]
        let groupDetailVC = GroupDetailViewController(group: group)
        navigationController?.pushViewController(groupDetailVC, animated: true)
    }
    
    func tableView(_ tableView: UITableView, trailingSwipeActionsConfigurationForRowAt indexPath: IndexPath) -> UISwipeActionsConfiguration? {
        let deleteAction = UIContextualAction(style: .destructive, title: "Delete") { [weak self] _, _, completion in
            guard let self = self else {
                completion(false)
                return
            }
            
            let group = self.groups[indexPath.row]
            self.deleteGroup(group)
            completion(true)
        }
        
        return UISwipeActionsConfiguration(actions: [deleteAction])
    }
    
    private func deleteGroup(_ group: Group) {
        let alertController = UIAlertController(
            title: "Delete Group",
            message: "Are you sure you want to delete '\(group.name)'? This action cannot be undone.",
            preferredStyle: .alert
        )
        
        let deleteAction = UIAlertAction(title: "Delete", style: .destructive) { [weak self] _ in
            guard let self = self else { return }
            
            self.groupService?.deleteGroup(id: group.id) { result in
                switch result {
                case .success:
                    self.fetchGroups()
                    
                case .failure(let error):
                    self.showAlert(title: "Error", message: "Failed to delete group: \(error.localizedDescription)")
                }
            }
        }
        
        let cancelAction = UIAlertAction(title: "Cancel", style: .cancel)
        
        alertController.addAction(deleteAction)
        alertController.addAction(cancelAction)
        
        present(alertController, animated: true)
    }
}

// MARK: - GroupServiceDelegate

extension GroupManagementViewController: GroupServiceDelegate {
    func groupServiceDidUpdateGroups() {
        fetchGroups()
    }
}

// MARK: - GroupCell

class GroupCell: UITableViewCell {
    private let groupNameLabel = UILabel()
    private let memberCountLabel = UILabel()
    private let statusIndicator = UIView()
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupUI() {
        accessoryType = .disclosureIndicator
        
        // Group Name Label
        groupNameLabel.font = UIFont.systemFont(ofSize: 16, weight: .medium)
        
        // Member Count Label
        memberCountLabel.font = UIFont.systemFont(ofSize: 14)
        memberCountLabel.textColor = .systemGray
        
        // Status Indicator
        statusIndicator.layer.cornerRadius = 5
        statusIndicator.backgroundColor = .systemGreen
        
        // Add subviews
        [groupNameLabel, memberCountLabel, statusIndicator].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            contentView.addSubview($0)
        }
        
        // Layout would be set up here with NSLayoutConstraint
        // For brevity, constraints are omitted in this example
    }
    
    func configure(with group: Group) {
        groupNameLabel.text = group.name
        memberCountLabel.text = "\(group.memberCount) members"
        statusIndicator.backgroundColor = group.isActive ? .systemGreen : .systemGray
    }
}

// MARK: - GroupDetailViewController

class GroupDetailViewController: UIViewController {
    private let group: Group
    private let tableView = UITableView(frame: .zero, style: .insetGrouped)
    private let inviteButton = UIButton(type: .system)
    
    private var members: [GroupMember] = []
    private var groupService: GroupService?
    
    init(group: Group) {
        self.group = group
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupUI()
        configureGroupService()
        fetchMembers()
    }
    
    private func setupUI() {
        view.backgroundColor = .systemBackground
        title = group.name
        
        // Add invite button to navigation bar
        let inviteBarButton = UIBarButtonItem(title: "Invite", style: .plain, target: self, action: #selector(inviteTapped))
        navigationItem.rightBarButtonItem = inviteBarButton
        
        // Table View
        tableView.delegate = self
        tableView.dataSource = self
        tableView.register(MemberCell.self, forCellReuseIdentifier: "MemberCell")
        
        // Add subviews and set constraints
        tableView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(tableView)
        
        // Layout would be set up here with NSLayoutConstraint
        // For brevity, constraints are omitted in this example
    }
    
    private func configureGroupService() {
        groupService = GroupService()
    }
    
    private func fetchMembers() {
        groupService?.fetchGroupMembers(groupId: group.id) { [weak self] result in
            guard let self = self else { return }
            
            switch result {
            case .success(let members):
                self.members = members
                self.tableView.reloadData()
                
            case .failure(let error):
                self.showAlert(title: "Error", message: "Failed to fetch members: \(error.localizedDescription)")
            }
        }
    }
    
    @objc private func inviteTapped() {
        let alertController = UIAlertController(title: "Invite Member", message: nil, preferredStyle: .alert)
        
        alertController.addTextField { textField in
            textField.placeholder = "Email Address"
            textField.keyboardType = .emailAddress
        }
        
        let inviteAction = UIAlertAction(title: "Invite", style: .default) { [weak self] _ in
            guard let self = self,
                  let textField = alertController.textFields?.first,
                  let email = textField.text, !email.isEmpty else {
                return
            }
            
            self.inviteMember(email: email)
        }
        
        let cancelAction = UIAlertAction(title: "Cancel", style: .cancel)
        
        alertController.addAction(inviteAction)
        alertController.addAction(cancelAction)
        
        present(alertController, animated: true)
    }
    
    private func inviteMember(email: String) {
        groupService?.inviteMember(groupId: group.id, email: email) { [weak self] result in
            guard let self = self else { return }
            
            switch result {
            case .success:
                self.showAlert(title: "Success", message: "Invitation sent to \(email)")
                
            case .failure(let error):
                self.showAlert(title: "Error", message: "Failed to send invitation: \(error.localizedDescription)")
            }
        }
    }
    
    private func showAlert(title: String, message: String) {
        let alertController = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alertController.addAction(UIAlertAction(title: "OK", style: .default))
        present(alertController, animated: true)
    }
}

extension GroupDetailViewController: UITableViewDataSource, UITableViewDelegate {
    func numberOfSections(in tableView: UITableView) -> Int {
        return 1
    }
    
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return members.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "MemberCell", for: indexPath) as! MemberCell
        let member = members[indexPath.row]
        cell.configure(with: member)
        return cell
    }
    
    func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        return "Members"
    }
}

// MARK: - MemberCell

class MemberCell: UITableViewCell {
    private let nameLabel = UILabel()
    private let statusLabel = UILabel()
    private let avatarImageView = UIImageView()
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupUI() {
        // Avatar Image View
        avatarImageView.backgroundColor = .systemGray5
        avatarImageView.layer.cornerRadius = 20
        avatarImageView.clipsToBounds = true
        
        // Name Label
        nameLabel.font = UIFont.systemFont(ofSize: 16)
        
        // Status Label
        statusLabel.font = UIFont.systemFont(ofSize: 14)
        statusLabel.textColor = .systemGray
        
        // Add subviews
        [avatarImageView, nameLabel, statusLabel].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            contentView.addSubview($0)
        }
        
        // Layout would be set up here with NSLayoutConstraint
        // For brevity, constraints are omitted in this example
    }
    
    func configure(with member: GroupMember) {
        nameLabel.text = member.name
        statusLabel.text = member.isOnline ? "Online" : "Offline"
        statusLabel.textColor = member.isOnline ? .systemGreen : .systemGray
    }
}
