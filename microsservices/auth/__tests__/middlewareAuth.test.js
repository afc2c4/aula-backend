const mockVerify = jest.fn();

jest.mock('jsonwebtoken', () => ({
  verify: (...args) => mockVerify(...args)
}));

const authenticateToken = require('../middlewareAuth');

describe('middlewareAuth authenticateToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function criarRes() {
    return {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      }
    };
  }

  test('retorna 401 quando cabecalho Authorization nao existe', () => {
    const req = { headers: {} };
    const res = criarRes();
    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/Token não fornecido/i);
    expect(next).not.toHaveBeenCalled();
  });

  test('retorna 403 quando token eh invalido', () => {
    const req = { headers: { authorization: 'Bearer token-invalido' } };
    const res = criarRes();
    const next = jest.fn();

    mockVerify.mockImplementationOnce((_token, _secret, callback) => {
      callback(new Error('jwt malformed'));
    });

    authenticateToken(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/inválido/i);
    expect(next).not.toHaveBeenCalled();
  });

  test('anexa usuario no req e chama next quando token eh valido', () => {
    const req = { headers: { authorization: 'Bearer token-valido' } };
    const res = criarRes();
    const next = jest.fn();

    mockVerify.mockImplementationOnce((_token, _secret, callback) => {
      callback(null, { id: 1, email: 'user@exemplo.com' });
    });

    authenticateToken(req, res, next);

    expect(req.user).toEqual({ id: 1, email: 'user@exemplo.com' });
    expect(next).toHaveBeenCalledTimes(1);
  });
});