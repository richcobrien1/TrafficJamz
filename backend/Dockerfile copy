# Use Ubuntu 20.04 as the base image
FROM ubuntu:20.04

# Set the working directory
WORKDIR /app

# Set non-interactive mode to prevent manual prompts
ENV DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC

# Refresh repository sources and install CA certificates
RUN apt-get update --allow-releaseinfo-change && \
    apt-get install -y --no-install-recommends software-properties-common && \
    add-apt-repository universe && \
    apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl tzdata && \
    update-ca-certificates && \
    ln -fs /usr/share/zoneinfo/$TZ /etc/localtime && \
    dpkg-reconfigure -f noninteractive tzdata

# Install required dependencies
RUN apt-get install -y python3 python3-pip nodejs npm

# Install Node.js and latest npm
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash && apt-get install -y nodejs && npm install -g npm@latest

# Copy backend code into the container
COPY . /app

# Install dependencies
RUN python3 -m pip install --no-cache-dir invoke && \
    npm install --no-cache uuid@latest superagent@latest eslint@latest --save && \
    npm rebuild mediasoup

# Expose port 5000
EXPOSE 5000

# Start the backend server
CMD ["node", "src/index.js"]
