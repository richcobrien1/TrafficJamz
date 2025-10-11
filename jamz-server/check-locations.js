const mongoose = require('mongoose');
const Location = require('./src/models/location.model');

async function checkLocations() {
  try {
    await mongoose.connect('mongodb://localhost:27017/trafficjamz');
    const locations = await Location.find({ shared_with_group_ids: '68e944da482cc178aacffb95' });
    console.log('Locations found:', locations.length);
    locations.forEach(loc => {
      console.log('Location:', {
        user_id: loc.user_id,
        timestamp: loc.timestamp,
        coordinates: loc.coordinates
      });
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkLocations();