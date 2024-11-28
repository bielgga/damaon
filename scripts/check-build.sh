#!/bin/bash

echo "Verificando build..."

# Verifica se a pasta dist existe
if [ ! -d "dist" ]; then
  echo "Erro: Pasta dist não encontrada"
  exit 1
fi

# Verifica arquivos do servidor
if [ ! -f "dist/server/server/index.js" ]; then
  echo "Erro: Arquivo do servidor não encontrado"
  exit 1
fi

# Verifica arquivos do cliente
if [ ! -f "dist/index.html" ]; then
  echo "Erro: Arquivo index.html não encontrado"
  exit 1
fi

echo "Build verificado com sucesso!"
exit 0 