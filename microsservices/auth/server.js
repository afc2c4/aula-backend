const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'secret_dev_key';

// Banco de dados em memória para simulação
const users = [];

// Health Check
app.get('/health', (req, res) => res.status(200).json({ status: 'UP' }));

// 1. Cadastro com E-mail e Senha
app.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    const userExists = users.find(u => u.email === email);
    if (userExists) {
      return res.status(400).json({ error: 'Usuário já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now().toString(), email, name, password: hashedPassword, provider: 'local' };
    users.push(newUser);

    return res.status(201).json({ message: 'Usuário criado com sucesso', userId: newUser.id });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao cadastrar usuário' });
  }
});

// 2. Login Tradicional (E-mail / Senha)
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.provider === 'local');

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  return res.json({ token });
});

// 3. Esqueleto para Autenticação Social (OAuth2 - Google/GitHub)
app.post('/oauth/social', async (req, res) => {
  const { provider, providerToken } = req.body;

  if (!provider || !providerToken) {
    return res.status(400).json({ error: 'Provider e providerToken são obrigatórios' });
  }

  try {
    let socialUser = null;

    // Simulação da validação do token com a API do provedor (ex: Google / GitHub)
    if (provider === 'google') {
      // Exemplo real: const ticket = await googleClient.verifyIdToken({ idToken: providerToken });
      socialUser = { id: 'google_12345', email: 'user.social@gmail.com', name: 'Usuário Google' };
    } else if (provider === 'github') {
      // Exemplo real: axios.get('https://api.github.com/user', { headers: { Authorization: `token ${providerToken}` } })
      socialUser = { id: 'github_67890', email: 'user.github@github.com', name: 'Usuário GitHub' };
    } else {
      return res.status(400).json({ error: 'Provedor social não suportado' });
    }

    // Procura ou cria o usuário na base
    let user = users.find(u => u.email === socialUser.email);
    if (!user) {
      user = { id: Date.now().toString(), email: socialUser.email, name: socialUser.name, provider };
      users.push(user);
    }

    // Emite o JWT próprio do sistema
    const internalToken = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, provider: user.provider },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.json({ token: internalToken });
  } catch (error) {
    return res.status(401).json({ error: 'Falha ao autenticar com provedor social' });
  }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Auth Service rodando na porta ${PORT}`));
}

module.exports = app;