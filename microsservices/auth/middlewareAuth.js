/* ==========================================================================
 * MIDDLEWARE DE VALIDAÇÃO DE TOKEN (JWT)
 * Sintaxe do Middleware no Express: (req, res, next)
 * - req: Objeto da requisição.
 * - res: Objeto de resposta.
 * - next: Função para passar a execução para o próximo handler/rota.
 * ========================================================================== */
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'minha_chave_secreta_super_segura_123';

function validarToken(req, res, next) {
  /* Sintaxe: Extração do cabeçalho "Authorization" (Formato: Bearer <TOKEN>) */
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Pega a segunda parte (o token em si)

  if (!token) {
    return res.status(401).json({ erro: 'Acesso negado. Token não fornecido.' });
  }

  try {
    /* Sintaxe: jwt.verify(token, segredo)
     * Valida a assinatura e expiração do token. Se inválido, dispara um erro. */
    const dadosUsuario = jwt.verify(token, JWT_SECRET);
    
    // Anexa os dados decodificados do token diretamente ao objeto da requisição (req)
    req.usuario = dadosUsuario;
    
    // Libera a requisição para prosseguir para a rota solicitada
    next();
  } catch (err) {
    return res.status(403).json({ erro: 'Token inválido ou expirado.' });
  }
}

module.exports = validarToken;