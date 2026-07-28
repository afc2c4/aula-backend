/* ==========================================================================
 * SINTAXE E MÓDULOS IMPORTADOS:
 * - express: Framework HTTP para o servidor do carrinho.
 * - jwt (jsonwebtoken): Utilizado aqui apenas para VERIFICAR a assinatura do token.
 * - cors: Permite que o front-end envie requisições com o cabeçalho "Authorization".
 * ========================================================================== */
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());

/* A chave secreta DEVE ser idêntica à configurada no microsserviço de Auth */
const JWT_SECRET = 'minha_chave_secreta_super_segura_123';

/* ==========================================================================
 * MIDDLEWARE LOCAL DE AUTENTICAÇÃO
 * Sintaxe: intercepta a requisição antes de chegar na rota protegida.
 * ========================================================================== */
function autenticarToken(req, res, next) {
  /* Sintaxe: req.headers['authorization'] recupera o cabeçalho 'Authorization: Bearer <TOKEN>' */
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extrai a string após "Bearer"

  if (!token) {
    return res.status(401).json({ erro: 'Acesso negado. Token JWT não fornecido no Carrinho.' });
  }

  try {
    /* Sintaxe: jwt.verify decodifica o payload e chega a validade do token */
    const usuarioDecodificado = jwt.verify(token, JWT_SECRET);
    
    // Anexa o usuário autenticado no objeto da requisição
    req.usuario = usuarioDecodificado;
    
    next(); // Permite que a requisição siga para o handler da rota
  } catch (err) {
    return res.status(403).json({ erro: 'Token inválido ou expirado.' });
  }
}

/* Base de dados simulada do carrinho por usuário */
const carrinhosDB = {
  // Exemplo: '172100000': [{ produto: 'Camisa', quantidade: 2 }]
};

/* ==========================================================================
 * ROTA PROTEGIDA: CONSULTAR CARRINHO
 * Sintaxe: O middleware `autenticarToken` é passado como segundo argumento.
 * ========================================================================== */
app.get('/carrinho', autenticarToken, (req, res) => {
  // Pega o ID do usuário extraído do Token JWT
  const usuarioId = req.usuario.id;
  const itens = carrinhosDB[usuarioId] || [];

  return res.json({
    servico: 'Microsserviço de Carrinho',
    usuarioAutenticado: req.usuario.email,
    itens
  });
});

/* ==========================================================================
 * ROTA PROTEGIDA: ADICIONAR ITEM AO CARRINHO
 * ========================================================================== */
app.post('/carrinho/adicionar', autenticarToken, (req, res) => {
  const usuarioId = req.usuario.id;
  const { produtoId, quantidade } = req.body;

  if (!carrinhosDB[usuarioId]) {
    carrinhosDB[usuarioId] = [];
  }

  carrinhosDB[usuarioId].push({ produtoId, quantidade });

  return res.status(201).json({
    mensagem: 'Item adicionado ao carrinho com sucesso!',
    carrinhoAtualizado: carrinhosDB[usuarioId]
  });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Microsserviço de Carrinho rodando na porta ${PORT}`);
});