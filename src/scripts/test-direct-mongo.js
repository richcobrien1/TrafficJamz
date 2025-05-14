// test-direct-mongo.js
const { MongoClient } = require('mongodb');

// Connection URL - use the exact same connection string as in your application
const url = 'mongodb://localhost:27017/audiogroupapp';

async function testConnection() {
  console.log('Testing direct MongoDB connection...');
  const client = new MongoClient(url);
  
  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log('Connected successfully to MongoDB server');
    
    // Get the database
    const db = client.db();
    console.log('Database name:', db.databaseName);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // Try to insert a test document
    const testCollection = db.collection('test_connection');
    const result = await testCollection.insertOne({ test: true, timestamp: new Date() });
    console.log('Test document inserted:', result.insertedId);
    
    // Clean up - delete the test document
    await testCollection.deleteOne({ _id: result.insertedId });
    console.log('Test document deleted');
    
    return 'Connection test successful';
  } catch (err) {
    console.error('Connection test failed:', err);
    return `Connection test failed: ${err.message}`;
  } finally {
    // Close the connection
    await client.close();
    console.log('Connection closed');
  }
}

// Run the test
testConnection()
  .then(console.log)
  .catch(console.error);
