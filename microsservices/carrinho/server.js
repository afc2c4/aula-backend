/* ============================================================================
 * CARRINHO SERVICE (Database-per-Service com SQLite)
 * ---------------------------------------------------------------------------
 * Sintaxe principal usada neste serviço:
 * 1) `sqlite3.Database(path)` abre/cria arquivo local de banco SQLite.
 * 2) `db.serialize(...)` força inicialização sequencial (ordem determinística).
 * 3) Prepared statements no SQLite usam `?` para bind de parâmetros.
 * ============================================================================ */
require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = Number(process.env.PORT || 3002);
const dbPath = process.env.SQLITE_PATH || path.join(__dirname, 'carrinho.db');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function callback(erro) {
      if (erro) return reject(erro);
      return resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (erro, rows) => {
      if (erro) return reject(erro);
      return resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (erro, row) => {
      if (erro) return reject(erro);
      return resolve(row);
    });
  });
}

function inicializarBanco() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        `
          CREATE TABLE IF NOT EXISTS carrinho_itens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id TEXT NOT NULL,
            produto_id TEXT NOT NULL,
            quantidade INTEGER NOT NULL CHECK (quantidade > 0),
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
        `,
        (erro) => {
          if (erro) return reject(erro);
          return resolve();
        }
      );
    });
  });
}

app.get('/health', (_req, res) => {
  res.json({ servico: 'carrinho', status: 'ok', banco: 'sqlite', arquivo: dbPath });
});

/* CREATE */
app.post('/itens', async (req, res) => {
  const { usuarioId, produtoId, quantidade } = req.body;

  if (!usuarioId || !produtoId || !quantidade) {
    return res.status(400).json({ erro: 'usuarioId, produtoId e quantidade são obrigatórios.' });
  }

  try {
    const insert = await run(
      'INSERT INTO carrinho_itens (usuario_id, produto_id, quantidade) VALUES (?, ?, ?);',
      [String(usuarioId), String(produtoId), Number(quantidade)]
    );
    const item = await get('SELECT * FROM carrinho_itens WHERE id = ?;', [insert.lastID]);
    return res.status(201).json(item);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao criar item no carrinho.', detalhe: erro.message });
  }
});

/* READ ALL (com filtro opcional por usuário) */
app.get('/itens', async (req, res) => {
  try {
    if (req.query.usuarioId) {
      const itens = await all('SELECT * FROM carrinho_itens WHERE usuario_id = ? ORDER BY id DESC;', [
        String(req.query.usuarioId)
      ]);
      return res.json(itens);
    }

    const itens = await all('SELECT * FROM carrinho_itens ORDER BY id DESC;');
    return res.json(itens);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao listar itens.', detalhe: erro.message });
  }
});

/* READ BY ID */
app.get('/itens/:id', async (req, res) => {
  try {
    const item = await get('SELECT * FROM carrinho_itens WHERE id = ?;', [Number(req.params.id)]);
    if (!item) {
      return res.status(404).json({ erro: 'Item não encontrado.' });
    }
    return res.json(item);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao buscar item.', detalhe: erro.message });
  }
});

/* UPDATE */
app.put('/itens/:id', async (req, res) => {
  const { quantidade } = req.body;

  if (!quantidade) {
    return res.status(400).json({ erro: 'quantidade é obrigatória.' });
  }

  try {
    const resultado = await run('UPDATE carrinho_itens SET quantidade = ? WHERE id = ?;', [
      Number(quantidade),
      Number(req.params.id)
    ]);

    if (resultado.changes === 0) {
      return res.status(404).json({ erro: 'Item não encontrado.' });
    }

    const itemAtualizado = await get('SELECT * FROM carrinho_itens WHERE id = ?;', [Number(req.params.id)]);
    return res.json(itemAtualizado);
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao atualizar item.', detalhe: erro.message });
  }
});

/* DELETE */
app.delete('/itens/:id', async (req, res) => {
  try {
    const resultado = await run('DELETE FROM carrinho_itens WHERE id = ?;', [Number(req.params.id)]);
    if (resultado.changes === 0) {
      return res.status(404).json({ erro: 'Item não encontrado.' });
    }
    return res.status(204).send();
  } catch (erro) {
    return res.status(500).json({ erro: 'Falha ao remover item.', detalhe: erro.message });
  }
});

if (require.main === module) {
  inicializarBanco()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Carrinho service rodando em http://0.0.0.0:${PORT}`);
      });
    })
    .catch((erro) => {
      console.error('Falha ao iniciar carrinho service:', erro.message);
      process.exit(1);
    });
}

module.exports = {
  app,
  db,
  run,
  all,
  get,
  inicializarBanco
};