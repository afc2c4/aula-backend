/* ==========================================================================
 * SINTAXE E MÓDULOS IMPORTADOS:
 * - express: Framework HTTP para criar rotas e servidor.
 * - jwt (jsonwebtoken): Biblioteca para gerar e verificar Tokens JWT.
 * - bcrypt: Algoritmo de hash para criptografar e comparar senhas com segurança.
 * - cors: Middleware para permitir requisições de origens diferentes (Front-end).
 * ========================================================================== */
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();

/* Configura o Express para interpretar requisições com corpo em JSON */
app.use(express.json());
app.use(cors());

/* Segredo usado para assinar e validar os tokens JWT (em produção, fica em .env) */
const JWT_SECRET = process.env.JWT_SECRET || 'minha_chave_secreta_super_segura_123';

/* Banco de dados em memória simulado */
const usuariosDB = [];

/* ==========================================================================
 * ROTA 1: REGISTRO DE USUÁRIO (E-mail e Senha)
 * Sintaxe async/await: Usada para esperar a conclusão do hash assíncrono do bcrypt.
 * ========================================================================== */
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
  }

  // Verifica se o usuário já existe no banco
  const usuarioExistente = usuariosDB.find(u => u.email === email);
  if (usuarioExistente) {
    return res.status(400).json({ erro: 'Usuário já cadastrado.' });
  }

  /* Sintaxe: bcrypt.hash(senha, saltRounds)
   * Criptografa a senha gerando um hash irreversível com fator de custo 10. */
  const passwordHash = await bcrypt.hash(password, 10);

  const novoUsuario = {
    id: Date.now().toString(),
    email,
    passwordHash,
    provider: 'local' // Identifica login tradicional
  };

  usuariosDB.push(novoUsuario);

  return res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso!' });
});

/* ==========================================================================
 * ROTA 2: LOGIN TRADICIONAL (Usuário e Senha)
 * Retorna um token JWT caso as credenciais estejam válidas.
 * ========================================================================== */
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Busca o usuário local
  const usuario = usuariosDB.find(u => u.email === email && u.provider === 'local');
  if (!usuario) {
    return res.status(401).json({ erro: 'Credenciais inválidas.' });
  }

  /* Sintaxe: bcrypt.compare(senhaTextoPuro, hashSalvo)
   * Compara a senha informada com o hash salvo no banco. */
  const senhaValida = await bcrypt.compare(password, usuario.passwordHash);
  if (!senhaValida) {
    return res.status(401).json({ erro: 'Credenciais inválidas.' });
  }

  /* Sintaxe: jwt.sign(payload, secret, options)
   * Cria o Token JWT embutindo o ID e E-mail, com expiração em 1 hora. */
  const token = jwt.sign(
    { id: usuario.id, email: usuario.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  return res.json({ mensagem: 'Login realizado!', token });
});

/* ==========================================================================
 * ROTA 3: AUTENTICAÇÃO SOCIAL (OAuth2 / Google/GitHub/Facebook)
 * Em um cenário real, o front-end envia um idToken obtido no SDK do Provedor Social.
 * Aqui simulamos a recepção do perfil social e a geração do JWT da nossa aplicação.
 * ========================================================================== */
app.post('/auth/social', (req, res) => {
  const { provider, socialToken, email, nome } = req.body;

  /* LÓGICA DE NEGÓCIO:
   * Em produção, você usaria a biblioteca oficial do provedor (ex: google-auth-library)
   * para validar o `socialToken` junto à API do Google/GitHub. */
  if (!socialToken || !email) {
    return res.status(400).json({ erro: 'Token social e e-mail são obrigatórios.' });
  }

  // Procura se o usuário social já está cadastrado no nosso banco
  let usuario = usuariosDB.find(u => u.email === email);

  if (!usuario) {
    // Se não existir, cria o cadastro automático a partir da conta social
    usuario = {
      id: Date.now().toString(),
      email,
      nome,
      provider: provider || 'google', // ex: google, github
      socialId: 'social_id_' + Date.now()
    };
    usuariosDB.push(usuario);
  }

  /* Gera o Token JWT interno da aplicação para o usuário autenticado via rede social */
  const token = jwt.sign(
    { id: usuario.id, email: usuario.email, provider: usuario.provider },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  return res.json({ mensagem: `Autenticado via ${usuario.provider} com sucesso!`, token });
});

const PORT = Number(process.env.PORT || 3003);
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Microsserviço de Autenticação rodando em http://${HOST}:${PORT}`);
});