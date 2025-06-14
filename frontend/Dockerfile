# Use Ubuntu 20.04 as the base image
FROM ubuntu:20.04

# Set the working directory
WORKDIR /app

# Set timezone and prevent interactive prompts
ENV TZ=Etc/UTC
RUN ln -fs /usr/share/zoneinfo/$TZ /etc/localtime && apt-get update && apt-get install -y tzdata

# Install required dependencies
RUN apt-get update && apt-get install -y curl

# Install Node.js 20 instead of 18
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash  
RUN apt-get install -y nodejs 

# Ensure latest npm version is installed
RUN npm install --global npm@latest && npm install

# Copy the frontend source code into the container
COPY . /app

# Install dependencies
RUN npm install

# Build the frontend
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start the frontend
CMD ["npm", "start"]