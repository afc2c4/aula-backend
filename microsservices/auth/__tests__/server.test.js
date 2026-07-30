const request = require('supertest');

const mockHash = jest.fn();
const mockCompare = jest.fn();
const mockSign = jest.fn();

jest.mock('bcryptjs', () => ({
  hash: (...args) => mockHash(...args),
  compare: (...args) => mockCompare(...args)
}));

jest.mock('jsonwebtoken', () => ({
  sign: (...args) => mockSign(...args)
}));

const app = require('../server');

describe('Auth service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('GET /health retorna 200 com status UP', async () => {
    const resposta = await request(app).get('/health');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ status: 'UP' });
  });

  test('POST /register retorna 400 para payload sem email/senha', async () => {
    const resposta = await request(app).post('/register').send({ email: 'user@exemplo.com' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.error).toMatch(/obrigat/i);
  });

  test('POST /register cria usuario com sucesso', async () => {
    mockHash.mockResolvedValueOnce('hash-seguro');

    const resposta = await request(app)
      .post('/register')
      .send({ email: 'user@exemplo.com', password: '123456', name: 'User' });

    expect(resposta.status).toBe(201);
    expect(resposta.body.message).toMatch(/criado com sucesso/i);
    expect(resposta.body.userId).toBeDefined();
    expect(mockHash).toHaveBeenCalledWith('123456', 10);
  });

  test('POST /register retorna 400 para usuario duplicado', async () => {
    mockHash.mockResolvedValueOnce('hash-seguro');

    await request(app)
      .post('/register')
      .send({ email: 'duplicado@exemplo.com', password: '123456', name: 'A' });

    const resposta = await request(app)
      .post('/register')
      .send({ email: 'duplicado@exemplo.com', password: '123456' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.error).toMatch(/já cadastrado/i);
  });

  test('POST /login retorna 401 quando usuario nao existe', async () => {
    const resposta = await request(app)
      .post('/login')
      .send({ email: 'invalido@exemplo.com', password: '123456' });

    expect(resposta.status).toBe(401);
    expect(resposta.body.error).toMatch(/inválidas/i);
    expect(mockCompare).not.toHaveBeenCalled();
  });

  test('POST /login retorna 401 quando senha nao confere', async () => {
    mockHash.mockResolvedValueOnce('hash-salva');
    await request(app)
      .post('/register')
      .send({ email: 'user@exemplo.com', password: '123456', name: 'User' });

    mockCompare.mockResolvedValueOnce(false);

    const resposta = await request(app)
      .post('/login')
      .send({ email: 'user@exemplo.com', password: 'errada' });

    expect(resposta.status).toBe(401);
    expect(resposta.body.error).toMatch(/inválidas/i);
  });

  test('POST /login retorna token quando credenciais sao validas', async () => {
    mockHash.mockResolvedValueOnce('hash-salva');
    await request(app)
      .post('/register')
      .send({ email: 'ok@exemplo.com', password: '123456', name: 'Ok' });

    mockCompare.mockResolvedValueOnce(true);
    mockSign.mockReturnValueOnce('jwt-teste');

    const resposta = await request(app)
      .post('/login')
      .send({ email: 'ok@exemplo.com', password: '123456' });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ token: 'jwt-teste' });
    expect(mockSign).toHaveBeenCalledTimes(1);
  });

  test('POST /oauth/social retorna 400 quando provider/token ausentes', async () => {
    const resposta = await request(app).post('/oauth/social').send({ provider: 'google' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.error).toMatch(/obrigat/i);
  });

  test('POST /oauth/social retorna 400 para provedor nao suportado', async () => {
    const resposta = await request(app)
      .post('/oauth/social')
      .send({ provider: 'twitter', providerToken: 'token' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.error).toMatch(/não suportado/i);
  });

  test('POST /oauth/social retorna token para provider suportado', async () => {
    mockSign.mockReturnValueOnce('jwt-social');

    const resposta = await request(app)
      .post('/oauth/social')
      .send({ provider: 'google', providerToken: 'token-google' });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ token: 'jwt-social' });
    expect(mockSign).toHaveBeenCalledTimes(1);
  });
});
