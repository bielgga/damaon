# Estágio de build
FROM node:18-alpine AS builder

WORKDIR /app

# Instala ferramentas necessárias
RUN apk add --no-cache python3 make g++

# Copia arquivos de configuração
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

# Instala todas as dependências
RUN npm ci

# Copia o código fonte
COPY . .

# Limpa e faz o build
RUN npm run clean && \
    npm run build

# Verifica se os arquivos foram gerados
RUN ls -la dist/server/server/index.js || exit 1
RUN ls -la dist/index.html || exit 1

# Estágio de produção
FROM node:18-alpine

WORKDIR /app

# Copia apenas os arquivos necessários
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.env* ./

# Instala apenas dependências de produção
RUN npm ci --only=production

# Expõe a porta
EXPOSE 3001

# Comando para iniciar
CMD ["npm", "start"] 