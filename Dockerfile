FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY server/package.json ./server/

RUN npm install --production
RUN cd server && npm install --production

COPY . .

EXPOSE 80

CMD ["node", "server/server.js"]