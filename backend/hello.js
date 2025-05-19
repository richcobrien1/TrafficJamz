module.exports = (req, res) => {
    res.status(200).json({
      message: '=========================================   Hello from TrafficJam API!   ===============================',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  };
