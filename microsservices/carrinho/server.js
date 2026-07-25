const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const port = 3002;
const CATALOGO_URL = process.env.CATALOGO_URL || 'http://localhost:3001';

const carrinhos = [];

app.post('/carrinho/:usuarioId', async (req, res) => {
  const usuarioId = req.params.usuarioId;
  const {produtoId, quantidade} = req.body;

  try{
    const resposta = await axios.get(`${CATALOGO_URL}/produtos`);
    const produtos = resposta.data;
    const produtoExiste = produtos.some(p => p.id === produtoId);
    if(!produtoExiste) {
      return res.status(404).json({message: 'Produto não encontrado'});
    } 
  } catch (error) {
      return res.status(503).json({erro: 'Servico de Catalogo indisponivel'});
  }

  if(!carrinhos[usuarioId]) {
    carrinhos[usuarioId] = [];
  }

  carrinhos[usuarioId].push({produtoId, quantidade});
  res.status(201).json({message: 'Produto adicionado ao carrinho'});
});

app.get('/carrinho/:usuarioId', (req, res) => {
  const usuarioId = req.params.usuarioId;
  res.json(carrinhos[usuarioId] || []);
});

app.listen(port, () => {
  console.log(`Servidor do carrinho rodando na porta ${port}`);
});