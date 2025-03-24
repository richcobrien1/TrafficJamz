module.exports = {
  devServer: {
    // Replace the deprecated onAfterSetupMiddleware with setupMiddlewares
    setupMiddlewares: (middlewares, devServer) => {
      // If you had any custom middleware in onAfterSetupMiddleware, 
      // you would add it here
      
      // Return the middlewares array to continue setup
      return middlewares;
    }
  }
};
  