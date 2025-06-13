# Use Node.js as the base image
FROM node:16

# Set the working directory
WORKDIR /app

# Copy backend code into the container
COPY . /app

# Install dependencies
RUN npm install

# Expose port 5000
EXPOSE 5000

# Start the backend server
CMD ["node", "src/index.js"]
