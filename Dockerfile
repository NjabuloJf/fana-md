FROM node:lts-bookworm

RUN apt-get update && \
  apt-get install -y \
  ffmpeg \
  imagemagick \
  webp && \
  apt-get upgrade -y && \
  rm -rf /var/lib/apt/lists/*

RUN npm install -g pm2

RUN git clone https://github.com/NjabuloJf/fana-md /root/fana-md
WORKDIR /root/fana-md

# Remove existing baileys and install compatible version
RUN npm remove @whiskeysockets/baileys && \
    npm install @whiskeysockets/baileys@6.6.0

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 5000

CMD ["pm2-runtime", "start", "control.js", "--name", "fana-md"]
