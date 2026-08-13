FROM node:lts-bullseye

RUN apt-get update && \
  apt-get install -y \
  ffmpeg \
  imagemagick \
  webp && \
  apt-get upgrade -y && \
  npm i pm2 -g && \
  rm -rf /var/lib/apt/lists/*
  
RUN git clone https://github.com/NjabuloJf/fana-md /root/NjabuloFana
WORKDIR /root/NjabuloFana

# Copy package.json first
COPY package.json .

# Install dependencies
RUN npm install pm2 -g && \
    npm install --legacy-peer-deps

# Copy the rest
COPY . .

# Rename control.js to control.mjs for ESM support
RUN mv control.js control.mjs || true

EXPOSE 5000

# Use pm2-runtime to run the app
CMD ["pm2-runtime", "control.mjs"]
