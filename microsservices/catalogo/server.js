/* ============================================================================
 * CATALOGO SERVICE (Database-per-Service com MongoDB)
 * ---------------------------------------------------------------------------
 * Sintaxe principal usada neste serviço:
 * 1) `mongoose.Schema(...)` define o contrato dos documentos.
 * 2) `mongoose.model(...)` cria o Model com operações CRUD prontas.
 * 3) Métodos como `find`, `findById`, `findByIdAndUpdate` viram queries Mongo.
 * ============================================================================ */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = Number(process.env.PORT || 3001);

const produtoSchema = new mongoose.Schema(
    {
        nome: { type: String, required: true, trim: true },
        preco: { type: Number, required: true, min: 0 },
        categoria: { type: String, default: 'geral', trim: true },
        estoque: { type: Number, default: 0, min: 0 }
    },
    {
        versionKey: false,
        timestamps: true
    }
);

const Produto = mongoose.model('Produto', produtoSchema);

app.get('/health', (_req, res) => {
    res.json({ servico: 'catalogo', status: 'ok', banco: 'mongodb' });
});

/* CREATE */
app.post('/produtos', async (req, res) => {
    try {
        const produto = await Produto.create(req.body);
        res.status(201).json(produto);
    } catch (erro) {
        res.status(400).json({ erro: 'Falha ao criar produto.', detalhe: erro.message });
    }
});

/* READ ALL */
app.get('/produtos', async (_req, res) => {
    try {
        const produtos = await Produto.find().sort({ createdAt: -1 });
        res.json(produtos);
    } catch (erro) {
        res.status(500).json({ erro: 'Falha ao listar produtos.', detalhe: erro.message });
    }
});

/* READ BY ID */
app.get('/produtos/:id', async (req, res) => {
    try {
        const produto = await Produto.findById(req.params.id);
        if (!produto) {
            return res.status(404).json({ erro: 'Produto não encontrado.' });
        }
        return res.json(produto);
    } catch (erro) {
        return res.status(400).json({ erro: 'ID inválido.', detalhe: erro.message });
    }
});

/* UPDATE */
app.put('/produtos/:id', async (req, res) => {
    try {
        const produto = await Produto.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!produto) {
            return res.status(404).json({ erro: 'Produto não encontrado.' });
        }

        return res.json(produto);
    } catch (erro) {
        return res.status(400).json({ erro: 'Falha ao atualizar produto.', detalhe: erro.message });
    }
});

/* DELETE */
app.delete('/produtos/:id', async (req, res) => {
    try {
        const produto = await Produto.findByIdAndDelete(req.params.id);
        if (!produto) {
            return res.status(404).json({ erro: 'Produto não encontrado.' });
        }
        return res.status(204).send();
    } catch (erro) {
        return res.status(400).json({ erro: 'Falha ao remover produto.', detalhe: erro.message });
    }
});

async function iniciarServidor() {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI não configurada para o serviço catalogo.');
    }

    await mongoose.connect(process.env.MONGO_URI, {
        dbName: process.env.MONGO_DB_NAME || 'catalogo_db'
    });

    app.listen(PORT, () => {
        console.log(`Catalogo service rodando em http://0.0.0.0:${PORT}`);
    });
}

iniciarServidor().catch((erro) => {
    console.error('Falha ao iniciar catalogo service:', erro.message);
    process.exit(1);
});