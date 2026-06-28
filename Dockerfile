FROM node:18-alpine

WORKDIR /app

# Копируем package.json из корня и server
COPY package.json ./
COPY server/package.json ./server/

# Устанавливаем зависимости
RUN npm install --production
RUN cd server && npm install --production

# Копируем весь проект
COPY . .

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["node", "server/server.js"]