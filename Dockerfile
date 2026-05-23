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

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 5000

CMD ["npm", "run", "control.js"]
