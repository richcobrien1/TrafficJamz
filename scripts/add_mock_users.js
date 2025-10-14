#!/usr/bin/env node
/**
 * scripts/add_mock_users.js
 *
 * Script to add 5 mock users to the current group for testing
 */

const fetch = global.fetch || require('node-fetch');
const API_BASE = process.env.API_BASE || 'http://localhost:5000';

async function doFetch(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch (e) { body = text; }
  return { ok: res.ok, status: res.status, body };
}

async function registerUser(username, email, password, firstName, lastName, phoneNumber) {
  const payload = { username, email, password, first_name: firstName, last_name: lastName, phone_number: phoneNumber };
  const url = `${API_BASE}/api/auth/register`;
  const r = await doFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log(`register ${username} ->`, r.status, r.body);
  return r;
}

async function loginUser(email, password) {
  const payload = { email, password };
  const url = `${API_BASE}/api/auth/login`;
  const r = await doFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log(`login ${email} ->`, r.status, r.body);
  return r;
}

async function addMemberToGroup(token, groupId, userId) {
  console.log(`add member ${userId} to group ${groupId} -> Skipping API, using database directly`);
  
  // Skip API call and go straight to database addition
  await addMemberDirectly(groupId, userId);
  return { ok: true, status: 200, body: { success: true, message: 'Added directly to database' } };
}

async function addMemberDirectly(groupId, userId) {
  // For testing purposes, add member directly to MongoDB
  const { MongoClient, ObjectId } = require('mongodb');
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/trafficjamz');
  
  try {
    await client.connect();
    const db = client.db();
    const groups = db.collection('groups');
    
    // Add member to group
    await groups.updateOne(
      { _id: new ObjectId(groupId) },
      { 
        $push: { 
          group_members: {
            user_id: userId,
            role: 'member',
            status: 'active',
            joined_at: new Date()
          }
        }
      }
    );
    
    console.log(`Added user ${userId} directly to group ${groupId}`);
  } catch (error) {
    console.error('Error adding member directly:', error);
    throw error;
  } finally {
    await client.close();
  }
}

async function main() {
  console.log('Adding mock users to group...');

  // Mock user data
  const mockUsers = [
    { username: 'breanna_obrien', email: 'breanna@example.com', password: 'TestPass123!', firstName: 'Breanna', lastName: 'OBrien', phoneNumber: '+15550101' },
    { username: 'kaitlyn_obrien', email: 'kaitlyn@example.com', password: 'TestPass123!', firstName: 'Kaitlyn', lastName: 'OBrien', phoneNumber: '+15550102' },
    { username: 'joesel_varner', email: 'joesel@example.com', password: 'TestPass123!', firstName: 'Joesel', lastName: 'Varner', phoneNumber: '+15550103' },
    { username: 'lee_williams', email: 'lee@example.com', password: 'TestPass123!', firstName: 'Lee', lastName: 'Williams', phoneNumber: '+15550104' },
    { username: 'kalani_weldon', email: 'kalani@example.com', password: 'TestPass123!', firstName: 'Kalani', lastName: 'Weldon', phoneNumber: '+15550105' }
  ];

  const groupId = '68e944da482cc178aacffb95'; // From database query

  // First, register all users
  console.log('Registering users...');
  for (const user of mockUsers) {
    await registerUser(user.username, user.email, user.password, user.firstName, user.lastName, user.phoneNumber);
  }

  // Login as first user to get a token for adding members
  console.log('Logging in as first user...');
  const loginRes = await loginUser('breanna@example.com', 'TestPass123!');
  if (!loginRes.ok) {
    console.error('Failed to login:', loginRes.body);
    return;
  }

  const token = loginRes.body.access_token || loginRes.body.token;
  if (!token) {
    console.error('No token received from login');
    return;
  }

  // Add all users to the group
  console.log('Adding users to group...');
  for (const user of mockUsers) {
    // Login each user to get their user ID
    const userLogin = await loginUser(user.email, 'TestPass123!');
    if (userLogin.ok) {
      const userId = userLogin.body.user?.id || userLogin.body.user?._id || userLogin.body.user?.user_id;
      if (userId) {
        await addMemberToGroup(token, groupId, userId);
      } else {
        console.error(`Could not get user ID for ${user.username}`);
      }
    } else {
      console.error(`Failed to login ${user.username}:`, userLogin.body);
    }
  }

  console.log('Mock users added to group successfully!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});