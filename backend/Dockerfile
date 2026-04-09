# Use Node 20 slim image
FROM node:20-slim

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy all source files
COPY . .

# Create necessary directories
RUN mkdir -p uploads assets

# Expose port
EXPOSE 5000

# Start the server
CMD ["node", "index.js"]
