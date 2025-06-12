# Use an official Node.js runtime as a parent image
FROM node:16

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install dependencies
RUN npm install

# Build the frontend
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start the frontend
CMD ["node", "server.js"]
