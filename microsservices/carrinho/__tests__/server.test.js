const request = require('supertest');

const mockDb = {
  run: jest.fn(),
  all: jest.fn(),
  get: jest.fn(),
  serialize: jest.fn((callback) => callback())
};

jest.mock('sqlite3', () => ({
  verbose: () => ({
    Database: jest.fn(() => mockDb)
  })
}));

const { app } = require('../server');

describe('Carrinho service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockRunSuccess({ lastID = 1, changes = 1 } = {}) {
    mockDb.run.mockImplementation((sql, params, callback) => {
      const cb = typeof params === 'function' ? params : callback;
      cb.call({ lastID, changes }, null);
    });
  }

  function mockGetSuccess(item) {
    mockDb.get.mockImplementation((sql, params, callback) => {
      callback(null, item);
    });
  }

  function mockAllSuccess(itens) {
    mockDb.all.mockImplementation((sql, params, callback) => {
      callback(null, itens);
    });
  }

  test('GET /health retorna dados do servico', async () => {
    const resposta = await request(app).get('/health');

    expect(resposta.status).toBe(200);
    expect(resposta.body.servico).toBe('carrinho');
    expect(resposta.body.banco).toBe('sqlite');
  });

  test('POST /itens retorna 400 quando payload obrigatorio nao vem completo', async () => {
    const resposta = await request(app).post('/itens').send({ usuarioId: 'u1' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatch(/obrigatórios/i);
  });

  test('POST /itens cria item com sucesso', async () => {
    mockRunSuccess({ lastID: 10, changes: 1 });
    mockGetSuccess({ id: 10, usuario_id: 'u1', produto_id: 'p1', quantidade: 2 });

    const resposta = await request(app)
      .post('/itens')
      .send({ usuarioId: 'u1', produtoId: 'p1', quantidade: 2 });

    expect(resposta.status).toBe(201);
    expect(resposta.body.id).toBe(10);
    expect(mockDb.run).toHaveBeenCalled();
    expect(mockDb.get).toHaveBeenCalled();
  });

  test('GET /itens lista itens filtrando por usuarioId', async () => {
    const itens = [{ id: 2, usuario_id: 'u1', produto_id: 'p2', quantidade: 1 }];
    mockAllSuccess(itens);

    const resposta = await request(app).get('/itens').query({ usuarioId: 'u1' });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual(itens);
  });

  test('GET /itens/:id retorna 404 quando item nao existe', async () => {
    mockGetSuccess(undefined);

    const resposta = await request(app).get('/itens/999');

    expect(resposta.status).toBe(404);
    expect(resposta.body.erro).toMatch(/não encontrado/i);
  });

  test('PUT /itens/:id retorna 400 quando quantidade nao e enviada', async () => {
    const resposta = await request(app).put('/itens/1').send({});

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatch(/obrigatória/i);
  });

  test('PUT /itens/:id retorna 404 quando update nao afeta registros', async () => {
    mockRunSuccess({ changes: 0 });

    const resposta = await request(app).put('/itens/55').send({ quantidade: 3 });

    expect(resposta.status).toBe(404);
    expect(resposta.body.erro).toMatch(/não encontrado/i);
  });

  test('DELETE /itens/:id retorna 404 quando item nao existe', async () => {
    mockRunSuccess({ changes: 0 });

    const resposta = await request(app).delete('/itens/123');

    expect(resposta.status).toBe(404);
    expect(resposta.body.erro).toMatch(/não encontrado/i);
  });
});
