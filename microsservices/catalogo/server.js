const express = require('express');
const app = express();
const port = 3001;

const produtos = [
    {id: 1, nome: 'Camiseta', preco: 49.90},
     {id: 2, nome: 'Tenis', preco: 109.90},
     {id: 3, nome: 'Mochila', preco: 89.90}];

app.get('/produtos', (req, res) => {
    res.json(produtos);
});

app.listen(port, () => {
    console.log(`Servidor do catálogo rodando na porta ${port}`);
});