FROM node:lts-bookworm

RUN apt-get update && \
  apt-get install -y \
  ffmpeg \
  imagemagick \
  webp \
  git \
  python3 \
  make \
  g++ && \
  apt-get upgrade -y && \
  rm -rf /var/lib/apt/lists/*

RUN npm install -g pm2

RUN git clone https://github.com/NjabuloJf/fana-md /root/fana-md
WORKDIR /root/fana-md

# Fix for baileys compatibility - overwrite package.json with fixed version
COPY package.json ./

# Clean install
RUN npm cache clean --force
RUN npm install --legacy-peer-deps --no-optional

# Copy the rest of the application
COPY . .

EXPOSE 5000

# Run with PM2
CMD ["pm2-runtime", "start", "control.js", "--name", "fana-md"]
