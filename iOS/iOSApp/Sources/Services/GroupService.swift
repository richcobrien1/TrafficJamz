import Foundation

protocol GroupServiceDelegate: AnyObject {
    func groupServiceDidUpdateGroups()
}

class GroupService {
    
    // MARK: - Properties
    
    weak var delegate: GroupServiceDelegate?
    
    // Simulated groups for demonstration
    private var groups: [Group] = []
    
    // MARK: - Initialization
    
    init() {
        createSimulatedGroups()
    }
    
    // MARK: - Group Management
    
    func fetchGroups(completion: @escaping (Result<[Group], Error>) -> Void) {
        // In a real implementation, this would fetch groups from the server
        
        // For simulation, we'll return our local data after a short delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            completion(.success(self.groups))
        }
    }
    
    func fetchGroupMembers(groupId: String, completion: @escaping (Result<[GroupMember], Error>) -> Void) {
        // In a real implementation, this would fetch group members from the server
        
        // For simulation, find the group and return its members
        guard let group = groups.first(where: { $0.id == groupId }) else {
            let error = NSError(domain: "GroupService", code: 404, userInfo: [NSLocalizedDescriptionKey: "Group not found"])
            completion(.failure(error))
            return
        }
        
        // Create simulated members
        let members = createSimulatedMembersForGroup(groupId: groupId)
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            completion(.success(members))
        }
    }
    
    func createGroup(name: String, completion: @escaping (Result<Group, Error>) -> Void) {
        // In a real implementation, this would create a group on the server
        
        // For simulation, create a new group locally
        let newGroup = Group(id: UUID().uuidString, name: name, memberCount: 1, isActive: true)
        groups.append(newGroup)
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.delegate?.groupServiceDidUpdateGroups()
            completion(.success(newGroup))
        }
    }
    
    func deleteGroup(id: String, completion: @escaping (Result<Void, Error>) -> Void) {
        // In a real implementation, this would delete the group from the server
        
        // For simulation, remove the group from our local array
        groups.removeAll { $0.id == id }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.delegate?.groupServiceDidUpdateGroups()
            completion(.success(()))
        }
    }
    
    func inviteMember(groupId: String, email: String, completion: @escaping (Result<Void, Error>) -> Void) {
        // In a real implementation, this would send an invitation via the server
        
        // For simulation, just pretend we sent an invitation
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            completion(.success(()))
        }
    }
    
    // MARK: - Simulation Helpers
    
    private func createSimulatedGroups() {
        let group1 = Group(id: "1", name: "Family", memberCount: 4, isActive: true)
        let group2 = Group(id: "2", name: "Friends", memberCount: 7, isActive: true)
        let group3 = Group(id: "3", name: "Work Team", memberCount: 5, isActive: false)
        
        groups = [group1, group2, group3]
    }
    
    private func createSimulatedMembersForGroup(groupId: String) -> [GroupMember] {
        switch groupId {
        case "1": // Family
            return [
                GroupMember(id: "101", name: "Mom", isOnline: true),
                GroupMember(id: "102", name: "Dad", isOnline: true),
                GroupMember(id: "103", name: "Sister", isOnline: false),
                GroupMember(id: "104", name: "Brother", isOnline: true)
            ]
        case "2": // Friends
            return [
                GroupMember(id: "201", name: "Alex", isOnline: true),
                GroupMember(id: "202", name: "Taylor", isOnline: false),
                GroupMember(id: "203", name: "Jordan", isOnline: true),
                GroupMember(id: "204", name: "Casey", isOnline: true),
                GroupMember(id: "205", name: "Riley", isOnline: false),
                GroupMember(id: "206", name: "Morgan", isOnline: false),
                GroupMember(id: "207", name: "Quinn", isOnline: true)
            ]
        case "3": // Work Team
            return [
                GroupMember(id: "301", name: "Manager", isOnline: false),
                GroupMember(id: "302", name: "Developer 1", isOnline: false),
                GroupMember(id: "303", name: "Developer 2", isOnline: false),
                GroupMember(id: "304", name: "Designer", isOnline: false),
                GroupMember(id: "305", name: "QA Tester", isOnline: false)
            ]
        default:
            return []
        }
    }
}

// MARK: - Group Model

struct Group {
    let id: String
    let name: String
    let memberCount: Int
    let isActive: Bool
}

// MARK: - GroupMember Model for UI

class GroupMember {
    let id: String
    let name: String
    var isOnline: Bool
    
    init(id: String, name: String, isOnline: Bool = true) {
        self.id = id
        self.name = name
        self.isOnline = isOnline
    }
}
