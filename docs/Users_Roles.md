# Refined TrafficJamz Role Structure

```markdown
|Role	    |Conditions	Can Create Group	                |Group Access & Powers                      |
|-----------|-----------------------------------------------|-------------------------------------------|
|Owner	    |Subscriber who has created at least one group	|✅ Full admin rights over their groups     |
|Subscriber	|Active subscription, not yet a group creator	|✅ Can create new groups → becomes Owner   |
|Member	    |Accepted into a group, no subscription needed	|❌ Basic access inside groups              |
|Invitee    |Has invite token but hasn’t joined yet	        |❌ Limited, pending status                 |
|-----------|-----------------------------------------------|--------------------------------------------|
```

### 🔄 Role Transition Logic

- When a subscriber creates their first group: > They’re elevated to owner > Assigned group.owner_id = user.id > UI and permissions shift immediately

A subscriber who hasn’t created a group remains at member-level in existing groups—but has group creation capability

### This keeps onboarding crisp:
“Subscribe to join and create groups. The moment you create one, you become its Owner.”