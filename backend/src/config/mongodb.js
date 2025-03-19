const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// MongoDB connection URI
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/audiogroupapp';

// Connect to MongoDB
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('MongoDB connection has been established successfully.');
  })
  .catch((error) => {
    console.error('Unable to connect to MongoDB:', error);
  });

module.exports = mongoose;
