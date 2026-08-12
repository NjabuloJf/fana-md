# Use the stable LTS version of Node (currently Node 20/22)
FROM node:lts-bookworm

# Install system dependencies
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    imagemagick \
    webp \
    git \
    python3 \
    make \
    g++ \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

# Install PM2 globally
RUN npm install -g pm2

# Set the working directory
WORKDIR /root/fana-md

# Step 1: Copy ONLY package.json first
COPY package.json ./

# Step 2: Manually install the GitHub Baileys fork first (so it doesn't get confused)
RUN npm install github:xhclintohn/Baileys --save --legacy-peer-deps || \
    npm install https://github.com/xhclintohn/Baileys.git --save --legacy-peer-deps

# Step 3: Install the rest of the dependencies
RUN npm install --legacy-peer-deps --no-optional

# Step 4: Now copy the rest of your application code OVER the installed files
COPY . .

# Expose the port
EXPOSE 5000

# Step 5: Use your perfectly defined "docker-start" script from package.json
CMD ["npm", "run", "docker-start"]
