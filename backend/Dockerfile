# Use Ubuntu as the base image
FROM ubuntu:20.04

# Set the working directory
WORKDIR /app

# Copy backend code into the container
COPY . /app

# Set non-interactive mode to prevent manual timezone selection
ENV DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC

# Install Node.js and npm
RUN apt-get update && apt-get install -y nodejs npm tzdata && \
    ln -fs /usr/share/zoneinfo/$TZ /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata

RUN apt-get update && apt-get install -y python3 python3-pip nodejs npm

# Install dependencies
RUN python3 -m pip install invoke
RUN npm install && npm rebuild mediasoup

# Expose port 5000
EXPOSE 5000

# Start the backend
CMD ["node", "app.js"]