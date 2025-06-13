# Use Ubuntu 20.04 as the base image
FROM ubuntu:20.04

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container
COPY . /app

# Set non-interactive mode to prevent manual timezone selection
ENV DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC

# Install Node.js and npm
RUN apt-get update && apt-get install -y nodejs npm tzdata && \
    ln -fs /usr/share/zoneinfo/$TZ /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata

# Install Node.js and npm
RUN apt-get update && apt-get install -y nodejs npm

# Build the frontend
RUN npm install && npm run build

# Expose port 3000
EXPOSE 3000

# Start the frontend
CMD ["npm", "start"]
