# Use an official Node.js runtime as a parent image
FROM ubuntu:20.04

# Set the working directory
WORKDIR /app

# Copy backend code into the container
COPY . /app

# Install dependencies
RUN npm install

RUN apt-get update && apt-get install -y python3 python3-pip

# Install dependencies
RUN python3 -m pip install invoke
RUN npm install && npm rebuild mediasoup

# Expose port 5000
EXPOSE 5000

# Start the backend server
CMD ["node", "src/index.js"]
