# Use Ubuntu 20.04 as the base image
FROM ubuntu:20.04

# Set the working directory
WORKDIR /app

# Set timezone and prevent interactive prompts
ENV TZ=Etc/UTC
RUN ln -fs /usr/share/zoneinfo/$TZ /etc/localtime && apt-get update && apt-get install -y tzdata

# Install required dependencies
RUN apt-get update && apt-get install -y python3 python3-pip curl 

# Install Node.js **without** npm first
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash  
RUN apt-get update && apt-get install -y nodejs 

# Manually install the latest npm version
RUN npm install -g npm@latest

# Copy backend code into the container
COPY . /app

# Install dependencies
RUN python3 -m pip install invoke
RUN npm install uuid@latest superagent@latest eslint@latest --save
RUN npm rebuild mediasoup

# Expose port 5000
EXPOSE 5000

# Start the backend server
CMD ["node", "src/index.js"]
