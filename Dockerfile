FROM node:20-slim

RUN apt-get update && \
    apt-get install -y ffmpeg git python3 make g++ curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps --no-optional --no-audit

COPY . .

# ADD THIS LINE RIGHT HERE TO FIX BINARY ISSUES:
RUN npm rebuild --update-binary || true

EXPOSE 8080

CMD ["npm", "run", "docker-start"]
