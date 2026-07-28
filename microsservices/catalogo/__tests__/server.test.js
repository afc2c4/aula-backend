const request = require('supertest');

const mockProduto = {
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn()
};

jest.mock('mongoose', () => ({
  Schema: jest.fn().mockImplementation((definicao, opcoes) => ({ definicao, opcoes })),
  model: jest.fn(() => mockProduto),
  connect: jest.fn()
}));

const { app } = require('../server');

describe('Catalogo service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /health retorna status do servico', async () => {
    const resposta = await request(app).get('/health');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ servico: 'catalogo', status: 'ok', banco: 'mongodb' });
  });

  test('POST /produtos cria produto com sucesso', async () => {
    mockProduto.create.mockResolvedValueOnce({ _id: '1', nome: 'Teclado', preco: 100 });

    const resposta = await request(app).post('/produtos').send({ nome: 'Teclado', preco: 100 });

    expect(resposta.status).toBe(201);
    expect(resposta.body.nome).toBe('Teclado');
    expect(mockProduto.create).toHaveBeenCalledWith({ nome: 'Teclado', preco: 100 });
  });

  test('POST /produtos retorna 400 quando validacao falha', async () => {
    mockProduto.create.mockRejectedValueOnce(new Error('preco é obrigatório'));

    const resposta = await request(app).post('/produtos').send({ nome: 'SemPreco' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatch(/Falha ao criar produto/i);
  });

  test('GET /produtos lista produtos ordenados', async () => {
    const produtos = [{ _id: '1', nome: 'Mouse', preco: 50 }];
    const sortMock = jest.fn().mockResolvedValueOnce(produtos);
    mockProduto.find.mockReturnValueOnce({ sort: sortMock });

    const resposta = await request(app).get('/produtos');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual(produtos);
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
  });

  test('GET /produtos/:id retorna 404 quando nao encontra produto', async () => {
    mockProduto.findById.mockResolvedValueOnce(null);

    const resposta = await request(app).get('/produtos/id-inexistente');

    expect(resposta.status).toBe(404);
    expect(resposta.body.erro).toMatch(/não encontrado/i);
  });

  test('GET /produtos/:id retorna 400 para id invalido', async () => {
    mockProduto.findById.mockRejectedValueOnce(new Error('Cast to ObjectId failed'));

    const resposta = await request(app).get('/produtos/id-invalido');

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatch(/ID inválido/i);
  });

  test('PUT /produtos/:id atualiza produto existente', async () => {
    mockProduto.findByIdAndUpdate.mockResolvedValueOnce({ _id: '1', nome: 'Mouse Gamer', preco: 80 });

    const resposta = await request(app).put('/produtos/1').send({ nome: 'Mouse Gamer' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.nome).toBe('Mouse Gamer');
    expect(mockProduto.findByIdAndUpdate).toHaveBeenCalledWith(
      '1',
      { nome: 'Mouse Gamer' },
      { new: true, runValidators: true }
    );
  });

  test('PUT /produtos/:id retorna 404 quando produto nao existe', async () => {
    mockProduto.findByIdAndUpdate.mockResolvedValueOnce(null);

    const resposta = await request(app).put('/produtos/999').send({ nome: 'X' });

    expect(resposta.status).toBe(404);
    expect(resposta.body.erro).toMatch(/não encontrado/i);
  });

  test('DELETE /produtos/:id retorna 204 ao remover produto', async () => {
    mockProduto.findByIdAndDelete.mockResolvedValueOnce({ _id: '1' });

    const resposta = await request(app).delete('/produtos/1');

    expect(resposta.status).toBe(204);
  });
});
