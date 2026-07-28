/* ============================================================================
 * PEDIDOS SERVICE (Database-per-Service com MySQL)
 * ---------------------------------------------------------------------------
 * Sintaxe principal usada neste serviço:
 * 1) `mysql.createPool(...)` cria pool de conexões para reuso eficiente.
 * 2) `pool.execute(sql, [params])` executa prepared statements com `?`.
 * 3) Placeholder `?` separa SQL de dados e reduz risco de SQL Injection.
 * ============================================================================ */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = Number(process.env.PORT || 3004);

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function inicializarBanco() {
  const sql = `
    CREATE TABLE IF NOT EXISTS pedidos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cliente_nome VARCHAR(255) NOT NULL,
      valor_total DECIMAL(10, 2) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'aberto',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await pool.execute(sql);
}

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ servico: 'pedidos', status: 'ok', banco: 'mysql' });
  } catch (erro) {
    res.status(500).json({ servico: 'pedidos', status: 'erro', detalhe: erro.message });
  }
});

/* CREATE */
app.post('/pedidos', async (req, res) => {
  const { clienteNome, valorTotal, status } = req.body;

  if (!clienteNome || valorTotal === undefined) {
    return res.status(400).json({ erro: 'clienteNome e valorTotal são obrigatórios.' });
  }

  try {
    const [resultado] = await pool.execute(
      'INSERT INTO pedidos (cliente_nome, valor_total, status) VALUES (?, ?, ?);',
      [String(clienteNome), Number(valorTotal), status || 'aberto']
    );

    const [linhas] = await pool.execute('SELECT * FROM pedidos WHERE id = ?;', [resultado.insertId]);
    return res.status(201).json(linhas[0]);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao criar pedido.', detalhe: erro.message });
  }
});

/* READ ALL */
app.get('/pedidos', async (_req, res) => {
  try {
    const [linhas] = await pool.execute('SELECT * FROM pedidos ORDER BY id DESC;');
    return res.json(linhas);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao listar pedidos.', detalhe: erro.message });
  }
});

/* READ BY ID */
app.get('/pedidos/:id', async (req, res) => {
  try {
    const [linhas] = await pool.execute('SELECT * FROM pedidos WHERE id = ?;', [Number(req.params.id)]);
    if (linhas.length === 0) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }
    return res.json(linhas[0]);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao buscar pedido.', detalhe: erro.message });
  }
});

/* UPDATE */
app.put('/pedidos/:id', async (req, res) => {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ erro: 'status é obrigatório.' });
  }

  try {
    const [resultado] = await pool.execute('UPDATE pedidos SET status = ? WHERE id = ?;', [
      String(status),
      Number(req.params.id)
    ]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }

    const [linhas] = await pool.execute('SELECT * FROM pedidos WHERE id = ?;', [Number(req.params.id)]);
    return res.json(linhas[0]);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao atualizar pedido.', detalhe: erro.message });
  }
});

/* DELETE */
app.delete('/pedidos/:id', async (req, res) => {
  try {
    const [resultado] = await pool.execute('DELETE FROM pedidos WHERE id = ?;', [Number(req.params.id)]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }
    return res.status(204).send();
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao remover pedido.', detalhe: erro.message });
  }
});

async function iniciarServidor() {
  if (!process.env.MYSQL_HOST || !process.env.MYSQL_USER || !process.env.MYSQL_DATABASE) {
    throw new Error('Variáveis MYSQL_HOST, MYSQL_USER e MYSQL_DATABASE são obrigatórias.');
  }

  await inicializarBanco();

  app.listen(PORT, () => {
    console.log(`Pedidos service rodando em http://0.0.0.0:${PORT}`);
  });
}

iniciarServidor().catch((erro) => {
  console.error('Falha ao iniciar pedidos service:', erro.message);
  process.exit(1);
});
