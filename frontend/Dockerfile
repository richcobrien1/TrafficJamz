# Use Ubuntu 20.04 as the base image
FROM ubuntu:20.04

# Set the working directory in the container
WORKDIR /app

# Install Node.js and npm
RUN apt-get update && apt-get install -y nodejs npm

# Copy the current directory contents into the container
COPY . /app

# Install dependencies
RUN npm install

# Build the frontend
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start the frontend
CMD ["npm", "start"]
