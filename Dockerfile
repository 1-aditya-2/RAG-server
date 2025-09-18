# Use Node LTS
FROM node:18

# Set working directory
WORKDIR /app

# Copy package.json and install deps
COPY package*.json ./
RUN npm install --omit=dev

# Copy source code
COPY . .

# Expose backend port
EXPOSE 10000

# Start the app
CMD ["npm", "start"]
