const request = require('supertest');

const executeMock = jest.fn();
const queryMock = jest.fn();
const mockPool = {
  execute: executeMock,
  query: queryMock
};

jest.mock('mysql2/promise', () => ({
  createPool: jest.fn(() => mockPool)
}));

const { app } = require('../server');

describe('Pedidos service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /health retorna 200 quando banco responde', async () => {
    queryMock.mockResolvedValueOnce([[]]);

    const resposta = await request(app).get('/health');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ servico: 'pedidos', status: 'ok', banco: 'mysql' });
  });

  test('GET /health retorna 500 quando banco falha', async () => {
    queryMock.mockRejectedValueOnce(new Error('db down'));

    const resposta = await request(app).get('/health');

    expect(resposta.status).toBe(500);
    expect(resposta.body.status).toBe('erro');
  });

  test('POST /pedidos retorna 400 sem campos obrigatorios', async () => {
    const resposta = await request(app).post('/pedidos').send({ clienteNome: 'Alice' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatch(/obrigatórios/i);
  });

  test('POST /pedidos cria pedido com sucesso', async () => {
    executeMock
      .mockResolvedValueOnce([{ insertId: 42 }])
      .mockResolvedValueOnce([[{ id: 42, cliente_nome: 'Alice', valor_total: 99.9, status: 'aberto' }]]);

    const resposta = await request(app)
      .post('/pedidos')
      .send({ clienteNome: 'Alice', valorTotal: 99.9 });

    expect(resposta.status).toBe(201);
    expect(resposta.body.id).toBe(42);
    expect(executeMock).toHaveBeenCalledTimes(2);
  });

  test('GET /pedidos retorna lista de pedidos', async () => {
    executeMock.mockResolvedValueOnce([[{ id: 1 }, { id: 2 }]]);

    const resposta = await request(app).get('/pedidos');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual([{ id: 1 }, { id: 2 }]);
  });

  test('GET /pedidos/:id retorna 404 quando nao encontra', async () => {
    executeMock.mockResolvedValueOnce([[]]);

    const resposta = await request(app).get('/pedidos/999');

    expect(resposta.status).toBe(404);
    expect(resposta.body.erro).toMatch(/não encontrado/i);
  });

  test('PUT /pedidos/:id retorna 400 sem status', async () => {
    const resposta = await request(app).put('/pedidos/1').send({});

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatch(/obrigatório/i);
  });

  test('PUT /pedidos/:id retorna 404 quando nenhum pedido e atualizado', async () => {
    executeMock.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const resposta = await request(app).put('/pedidos/77').send({ status: 'pago' });

    expect(resposta.status).toBe(404);
    expect(resposta.body.erro).toMatch(/não encontrado/i);
  });

  test('DELETE /pedidos/:id retorna 204 quando remove com sucesso', async () => {
    executeMock.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const resposta = await request(app).delete('/pedidos/1');

    expect(resposta.status).toBe(204);
  });
});
