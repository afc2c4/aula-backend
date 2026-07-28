#!/usr/bin/env bash
set -euo pipefail

echo "[AUTH][POST] Criando usuario no PostgreSQL"
curl -s -X POST http://localhost:3003/usuarios \
  -H "Content-Type: application/json" \
  -d '{"email":"teste.auth@example.com","password":"123456","nome":"Teste Auth"}'
echo "\n"

echo "[AUTH][GET] Listando usuarios no PostgreSQL"
curl -s http://localhost:3003/usuarios
echo "\n"

echo "[CATALOGO][POST] Criando produto no MongoDB"
curl -s -X POST http://localhost:3001/produtos \
  -H "Content-Type: application/json" \
  -d '{"nome":"Teclado Mecanico","preco":299.90,"categoria":"perifericos","estoque":15}'
echo "\n"

echo "[CATALOGO][GET] Listando produtos no MongoDB"
curl -s http://localhost:3001/produtos
echo "\n"

echo "[CARRINHO][POST] Inserindo item no SQLite"
curl -s -X POST http://localhost:3002/itens \
  -H "Content-Type: application/json" \
  -d '{"usuarioId":"1","produtoId":"ABC-001","quantidade":2}'
echo "\n"

echo "[CARRINHO][GET] Listando itens no SQLite"
curl -s "http://localhost:3002/itens?usuarioId=1"
echo "\n"

echo "[PEDIDOS][POST] Criando pedido no MySQL"
curl -s -X POST http://localhost:3004/pedidos \
  -H "Content-Type: application/json" \
  -d '{"clienteNome":"Cliente Teste","valorTotal":189.90,"status":"aberto"}'
echo "\n"

echo "[PEDIDOS][GET] Listando pedidos no MySQL"
curl -s http://localhost:3004/pedidos
echo "\n"

echo "Testes finalizados."
