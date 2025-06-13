# Use Ubuntu as the base image
FROM ubuntu:20.04

# Set the working directory
WORKDIR /app

# Set non-interactive mode to prevent manual timezone selection
ENV DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC

# Install required packages
RUN apt-get update && apt-get install -y python3 python3-pip curl && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs npm tzdata && ln -fs /usr/share/zoneinfo/$TZ /etc/localtime && dpkg-reconfigure -f noninteractive tzdata

# Copy backend code into the container
COPY . /app

# Install dependencies
RUN python3 -m pip install invoke
RUN npm install -g npm@latest && npm install uuid@latest superagent@latest eslint@latest --save && npm rebuild mediasoup

# Expose port 5000
EXPOSE 5000

# Start the backend server
CMD ["node", "src/index.js"]