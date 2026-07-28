/* ============================================================================
 * AUTH SERVICE (Database-per-Service com PostgreSQL)
 * ---------------------------------------------------------------------------
 * Sintaxe principal usada neste serviço:
 * 1) `new Pool(...)` do driver `pg` cria um pool de conexões reutilizáveis.
 * 2) Queries parametrizadas com `$1`, `$2` evitam SQL Injection.
 * 3) `await pool.query(sql, [params])` retorna `{ rows, rowCount }`.
 * 4) bcrypt hash/compare para senha e JWT para emissão de token.
 * ============================================================================ */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = Number(process.env.PORT || 3003);
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'troque_esta_chave_em_producao';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function inicializarBanco() {
  const sql = `
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nome VARCHAR(255),
      provider VARCHAR(50) NOT NULL DEFAULT 'local',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;
  await pool.query(sql);
}

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ servico: 'auth', status: 'ok', banco: 'postgres' });
  } catch (erro) {
    res.status(500).json({ servico: 'auth', status: 'erro', detalhe: erro.message });
  }
});

/*
 * CREATE: cria usuário local
 * SQL com `$1`, `$2`, `$3`: placeholders posicionais do PostgreSQL.
 */
app.post('/usuarios', async (req, res) => {
  const { email, password, nome } = req.body;

  if (!email || !password) {
    return res.status(400).json({ erro: 'email e password são obrigatórios.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const sql = `
      INSERT INTO usuarios (email, password_hash, nome, provider)
      VALUES ($1, $2, $3, 'local')
      RETURNING id, email, nome, provider, created_at;
    `;
    const resultado = await pool.query(sql, [email, passwordHash, nome || null]);
    return res.status(201).json(resultado.rows[0]);
  } catch (erro) {
    if (erro.code === '23505') {
      return res.status(409).json({ erro: 'Email já cadastrado.' });
    }
    return res.status(500).json({ erro: 'Falha ao criar usuário.', detalhe: erro.message });
  }
});

/* READ ALL */
app.get('/usuarios', async (_req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT id, email, nome, provider, created_at FROM usuarios ORDER BY id ASC;'
    );
    return res.json(resultado.rows);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao listar usuários.', detalhe: erro.message });
  }
});

/* READ BY ID */
app.get('/usuarios/:id', async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT id, email, nome, provider, created_at FROM usuarios WHERE id = $1;',
      [Number(req.params.id)]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    return res.json(resultado.rows[0]);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao buscar usuário.', detalhe: erro.message });
  }
});

/* UPDATE simples (nome e provider) */
app.put('/usuarios/:id', async (req, res) => {
  const { nome, provider } = req.body;
  try {
    const sql = `
      UPDATE usuarios
      SET nome = COALESCE($1, nome),
          provider = COALESCE($2, provider)
      WHERE id = $3
      RETURNING id, email, nome, provider, created_at;
    `;
    const resultado = await pool.query(sql, [nome || null, provider || null, Number(req.params.id)]);

    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    return res.json(resultado.rows[0]);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao atualizar usuário.', detalhe: erro.message });
  }
});

/* DELETE */
app.delete('/usuarios/:id', async (req, res) => {
  try {
    const resultado = await pool.query('DELETE FROM usuarios WHERE id = $1;', [Number(req.params.id)]);
    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }
    return res.status(204).send();
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao remover usuário.', detalhe: erro.message });
  }
});

/*
 * LOGIN: consulta usuário pelo email e compara hash da senha.
 */
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ erro: 'email e password são obrigatórios.' });
  }

  try {
    const resultado = await pool.query(
      'SELECT id, email, password_hash, provider FROM usuarios WHERE email = $1;',
      [email]
    );

    if (resultado.rowCount === 0) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const usuario = resultado.rows[0];
    const senhaValida = await bcrypt.compare(password, usuario.password_hash);

    if (!senhaValida) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, provider: usuario.provider },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({ mensagem: 'Login realizado com sucesso!', token });
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha no login.', detalhe: erro.message });
  }
});

async function iniciarServidor() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada para o serviço auth.');
  }

  await inicializarBanco();
  app.listen(PORT, HOST, () => {
    console.log(`Auth service rodando em http://${HOST}:${PORT}`);
  });
}

if (require.main === module) {
  iniciarServidor().catch((erro) => {
    console.error('Falha ao iniciar auth service:', erro.message);
    process.exit(1);
  });
}

module.exports = {
  app,
  pool,
  inicializarBanco,
  iniciarServidor
};