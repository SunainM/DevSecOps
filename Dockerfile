FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# tiny server.js wrapper to start the exported Express app (create this file in repo)
#   const app = require('./app');
#   const port = process.env.PORT || 3000;
#   app.listen(port, () => console.log(`API on ${port}`));
#
# Or change CMD to your actual server start if you already have one.
EXPOSE 3000
CMD ["node", "server.js"]
