# 1. Use Node 20 (Critical to fix your EBADENGINE errors)
FROM node:20-slim

# 2. Install system dependencies (ffmpeg, git, etc.)
RUN apt-get update && \
    apt-get install -y ffmpeg git python3 make g++ curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# 3. Install PM2 globally
RUN npm install -g pm2

# 4. Set the working directory inside the container
WORKDIR /app

# 5. Copy package.json and package-lock.json first (for better caching)
COPY package*.json ./

# 6. Install Node dependencies (Removed the broken fallback)
RUN npm install --legacy-peer-deps --no-optional --no-audit

# 7. Copy the rest of your application code
COPY . .

# 8. Expose the port (Heroku will assign a dynamic one, but this is good practice)
EXPOSE 8080

# 9. THE MOST IMPORTANT PART: Start command
# You must ensure "npm run toshtech" works, otherwise use "npm start"
CMD ["npm", "run", "toshtech"]
