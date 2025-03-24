// scripts/init-mongodb.js
const { MongoClient } = require('mongodb');

async function initializeDatabase() {
  const uri = 'mongodb://localhost:27017/audiogroupapp';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('audiogroupapp');
    
    // Create groups collection
    console.log('Creating groups collection...');
    await db.createCollection('groups');
    console.log('Groups collection created or already exists');
    
    // Create indexes for better performance
    console.log('Creating indexes...');
    await db.collection('groups').createIndex({ 'group_name': 1 });
    await db.collection('groups').createIndex({ 'owner_id': 1 });
    await db.collection('groups').createIndex({ 'group_members.user_id': 1 });
    console.log('Indexes created successfully');
    
    // List all collections to verify
    const collections = await db.listCollections().toArray();
    console.log('Collections in database:', collections.map(c => c.name));
    
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Database initialization failed:', error);
  } finally {
    await client.close();
  }
}

initializeDatabase()
  .then(() => console.log('Done'))
  .catch(console.error);
