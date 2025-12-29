# Use Node 18 (LTS) on Debian Slim for smaller image size
FROM node:18-bullseye-slim

# Install system dependencies required for canvas, sharp, and pdf tools
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy root package files first (since we have a monorepo-like structure)
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies (from root to ensure everything is linked)
RUN npm install

# Copy application source
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Start the server
CMD ["node", "server/index.js"]
