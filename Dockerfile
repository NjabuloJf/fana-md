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

# Copy fixed package.json first
COPY package.json ./

# Clean install with specific registry
RUN npm cache clean --force
RUN npm install --legacy-peer-deps --no-optional --registry=https://registry.npmjs.org/

# If the above fails, try this alternative
# RUN npm install --legacy-peer-deps --no-optional --force

COPY . .

EXPOSE 5000

CMD ["pm2-runtime", "start", "control.js", "--name", "fana-md"]
