# 1. Use Node 20 (Fixes all engine errors)
FROM node:20-slim

# 2. Install system dependencies (ffmpeg, git, etc.)
RUN apt-get update && \
    apt-get install -y ffmpeg git python3 make g++ curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# 3. Set the working directory
WORKDIR /app

# 4. Copy package files first (for caching)
COPY package*.json ./

# 5. Install Node dependencies
RUN npm install --legacy-peer-deps --no-optional --no-audit

# 6. Copy the rest of your application code
COPY . .

# 7. Expose the port
EXPOSE 8080

# 8. THE FIX: Use your existing "docker-start" script from package.json
CMD ["npm", "run", "docker-start"]
