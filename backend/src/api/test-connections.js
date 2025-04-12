// api/test-connections.js
module.exports = async (req, res) => {
  try {
    // Send the response directly
    res.status(200).json({ message: 'Simple test response' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
