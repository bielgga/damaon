FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build:server

ENV PORT=3001
ENV FRONTEND_URL=https://damaon.netlify.app

EXPOSE 3001

CMD ["npm", "start"] 