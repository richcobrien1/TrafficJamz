// test-mongodb.js
const mongoose = require('mongoose');

// Replace with your actual MongoDB URI
const mongoUri = process.env.MONGODB_URI || 'mongodb://richcobrien:1Topgun123@subscribers.xjpvrda.mongodb.net/?retryWrites=true&w=majority&appName=subscribers';

async function testMongoDBConnection() {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB connection successful!');
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    return false;
  }
}

testMongoDBConnection();
