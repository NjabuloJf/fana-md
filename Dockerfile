FROM node:18-slim

RUN apt-get update && \
    apt-get install -y ffmpeg git python3 make g++ curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN npm install -g pm2

WORKDIR /app

# Copy and install dependencies in one step with retry
COPY package*.json ./

# Install everything including Baileys
RUN npm install --legacy-peer-deps --no-optional --no-audit || \
    npm install --legacy-peer-deps --no-optional --no-audit --production

COPY . .

RUN mkdir -p session

EXPOSE 5000
CMD ["pm2-runtime", "control.js", "--name", "fana-md"]
