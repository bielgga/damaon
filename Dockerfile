FROM node:18-alpine

WORKDIR /app

# Instala as dependências primeiro para aproveitar o cache do Docker
COPY package*.json ./
RUN npm install

# Copia o resto dos arquivos
COPY . .

# Build do projeto
RUN npm run build

# Expõe a porta que o servidor usa
EXPOSE 3001

# Comando para iniciar o servidor
CMD ["node", "dist/server/server/index.js"] 