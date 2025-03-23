const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// MongoDB connection URI
const mongoURI = 'mongodb://localhost:27017/audiogroupapp';

// Connect to MongoDB
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
})
.then(() => {
  console.log('MongoDB connection has been established successfully.');
})
.catch((error) => {
  console.error('Unable to connect to MongoDB:', error);
});

module.exports = mongoose;
