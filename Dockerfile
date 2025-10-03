# ---- build runtime image ----
FROM node:20-alpine

# Create app dir
WORKDIR /app

# Install only production deps
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# App listens on 3000
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
