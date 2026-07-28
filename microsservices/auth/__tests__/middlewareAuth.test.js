const mockVerify = jest.fn();

jest.mock('jsonwebtoken', () => ({
  verify: (...args) => mockVerify(...args)
}));

const validarToken = require('../middlewareAuth');

describe('middlewareAuth validarToken', () => {
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

    validarToken(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.erro).toMatch(/Token não fornecido/i);
    expect(next).not.toHaveBeenCalled();
  });

  test('retorna 403 quando token eh invalido', () => {
    const req = { headers: { authorization: 'Bearer token-invalido' } };
    const res = criarRes();
    const next = jest.fn();

    mockVerify.mockImplementationOnce(() => {
      throw new Error('jwt malformed');
    });

    validarToken(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.erro).toMatch(/inválido/i);
    expect(next).not.toHaveBeenCalled();
  });

  test('anexa usuario no req e chama next quando token eh valido', () => {
    const req = { headers: { authorization: 'Bearer token-valido' } };
    const res = criarRes();
    const next = jest.fn();

    mockVerify.mockReturnValueOnce({ id: 1, email: 'user@exemplo.com' });

    validarToken(req, res, next);

    expect(req.usuario).toEqual({ id: 1, email: 'user@exemplo.com' });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
