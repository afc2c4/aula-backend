const request = require('supertest');

const mockQuery = jest.fn();
const mockPool = { query: mockQuery };
const mockHash = jest.fn();
const mockCompare = jest.fn();
const mockSign = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool)
}));

jest.mock('bcryptjs', () => ({
  hash: (...args) => mockHash(...args),
  compare: (...args) => mockCompare(...args)
}));

jest.mock('jsonwebtoken', () => ({
  sign: (...args) => mockSign(...args)
}));

const { app } = require('../server');

describe('Auth service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /health retorna 200 quando o banco responde', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const resposta = await request(app).get('/health');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ servico: 'auth', status: 'ok', banco: 'postgres' });
    expect(mockQuery).toHaveBeenCalledWith('SELECT 1');
  });

  test('GET /health retorna 500 quando o banco falha', async () => {
    mockQuery.mockRejectedValueOnce(new Error('db offline'));

    const resposta = await request(app).get('/health');

    expect(resposta.status).toBe(500);
    expect(resposta.body.servico).toBe('auth');
    expect(resposta.body.status).toBe('erro');
  });

  test('POST /usuarios retorna 400 para payload sem email/senha', async () => {
    const resposta = await request(app).post('/usuarios').send({ email: 'user@exemplo.com' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatch(/obrigat/i);
  });

  test('POST /usuarios cria usuario com sucesso', async () => {
    mockHash.mockResolvedValueOnce('hash-seguro');
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'user@exemplo.com', nome: 'User', provider: 'local', created_at: 'agora' }]
    });

    const resposta = await request(app)
      .post('/usuarios')
      .send({ email: 'user@exemplo.com', password: '123456', nome: 'User' });

    expect(resposta.status).toBe(201);
    expect(resposta.body.email).toBe('user@exemplo.com');
    expect(mockHash).toHaveBeenCalledWith('123456', 10);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test('POST /usuarios retorna 409 para email duplicado', async () => {
    mockHash.mockResolvedValueOnce('hash-seguro');
    mockQuery.mockRejectedValueOnce({ code: '23505', message: 'duplicate key' });

    const resposta = await request(app)
      .post('/usuarios')
      .send({ email: 'duplicado@exemplo.com', password: '123456' });

    expect(resposta.status).toBe(409);
    expect(resposta.body.erro).toMatch(/Email já cadastrado/i);
  });

  test('GET /usuarios/:id retorna 404 quando usuario nao existe', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const resposta = await request(app).get('/usuarios/999');

    expect(resposta.status).toBe(404);
    expect(resposta.body.erro).toMatch(/não encontrado/i);
  });

  test('POST /login retorna 400 sem credenciais obrigatorias', async () => {
    const resposta = await request(app).post('/login').send({ email: 'user@exemplo.com' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatch(/obrigat/i);
  });

  test('POST /login retorna 401 quando usuario nao existe', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const resposta = await request(app)
      .post('/login')
      .send({ email: 'invalido@exemplo.com', password: '123456' });

    expect(resposta.status).toBe(401);
    expect(resposta.body.erro).toMatch(/inválidas/i);
  });

  test('POST /login retorna 401 quando senha nao confere', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, email: 'user@exemplo.com', password_hash: 'hash', provider: 'local' }]
    });
    mockCompare.mockResolvedValueOnce(false);

    const resposta = await request(app)
      .post('/login')
      .send({ email: 'user@exemplo.com', password: 'errada' });

    expect(resposta.status).toBe(401);
    expect(resposta.body.erro).toMatch(/inválidas/i);
  });

  test('POST /login retorna token quando credenciais sao validas', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, email: 'user@exemplo.com', password_hash: 'hash', provider: 'local' }]
    });
    mockCompare.mockResolvedValueOnce(true);
    mockSign.mockReturnValueOnce('jwt-teste');

    const resposta = await request(app)
      .post('/login')
      .send({ email: 'user@exemplo.com', password: '123456' });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ mensagem: 'Login realizado com sucesso!', token: 'jwt-teste' });
    expect(mockSign).toHaveBeenCalled();
  });
});
