# Estágio de build
FROM node:18-alpine AS builder

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de configuração
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

# Instala as dependências
RUN npm ci

# Copia o código fonte
COPY . .

# Build do projeto
RUN npm run build

# Verifica se o arquivo existe
RUN ls -la dist/server/server/index.js || exit 1

# Estágio de produção
FROM node:18-alpine AS production

WORKDIR /app

# Copia apenas os arquivos necessários do estágio de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.env* ./

# Instala apenas as dependências de produção
RUN npm ci --only=production

# Expõe a porta do servidor
EXPOSE 3001

# Comando para iniciar o servidor
CMD ["npm", "start"] 