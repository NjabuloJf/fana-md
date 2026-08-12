FROM node:lts-bookworm

# Set environment variables
ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=error

# Install system dependencies
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    imagemagick \
    webp \
    git \
    python3 \
    make \
    g++ \
    curl \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

# Install PM2 globally
RUN npm install -g pm2

# Set working directory
WORKDIR /app

# Clone repository
RUN git clone https://github.com/NjabuloJf/fana-md /app

# Copy package files (for better caching)
COPY package*.json ./

# ========== INSTALL BAILEYS FORK ==========
# Try multiple methods to install Baileys
RUN echo "📦 Installing Baileys from xhclintohn/Baileys..." && \
    npm install github:xhclintohn/Baileys --save --legacy-peer-deps --no-audit || \
    npm install https://github.com/xhclintohn/Baileys.git --save --legacy-peer-deps --no-audit || \
    npm install @whiskeysockets/baileys@6.7.9 --save --legacy-peer-deps --no-audit

# ========== INSTALL ALL DEPENDENCIES ==========
RUN echo "📦 Installing all dependencies..." && \
    npm install --legacy-peer-deps --no-optional --no-audit --no-fund && \
    npm cache clean --force

# ========== POSTINSTALL FIXES ==========
RUN echo "🔧 Running postinstall fixes..." && \
    npm rebuild --update-binary || echo "⚠️ Rebuild skipped"

# Copy the rest of the application
COPY . .

# Create necessary directories
RUN mkdir -p session tmp media temp

# ========== CLEANUP ==========
RUN apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Expose port
EXPOSE 5000

# ========== HEALTH CHECK ==========
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# ========== START APPLICATION ==========
CMD ["pm2-runtime", "control.js", "--name", "fana-md"]
