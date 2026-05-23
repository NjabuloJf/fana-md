FROM node:lts-bookworm

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

RUN npm install -g pm2

RUN git clone https://github.com/NjabuloJf/fana-md /root/fana-md
WORKDIR /root/fana-md

# Copy package.json with GitHub baileys
COPY package.json ./

# Install GitHub baileys first (needs git)
RUN npm install github:xhclintohn/Baileys --save --legacy-peer-deps || \
    npm install https://github.com/xhclintohn/Baileys.git --save --legacy-peer-deps

# Install other dependencies
RUN npm install --legacy-peer-deps --no-optional

COPY . .

EXPOSE 5000

CMD ["pm2-runtime", "start", "control.js", "--name", "fana-md"]
