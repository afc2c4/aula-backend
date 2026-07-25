const fs = require('fs');
const path = require('path');

const caminhoEntrada = path.join(__dirname, 'vendas_gigante.csv');
const caminhoSaida = path.join(__dirname, 'relatorio_filtrado.txt');

const streamLeitura = fs.createReadStream(caminhoEntrada, {
  encoding: 'utf-8',
  highWaterMark: 10 * 1024
});

const streamEscrita = fs.createWriteStream(caminhoSaida);

const DEBUG_STREAM = true;
const estadoStream = {
  inicio: Date.now(),
  chunks: 0,
  bytesLidos: 0,
  bytesEscritos: 0
};

function logDebug(mensagem){
  if(DEBUG_STREAM){
    console.log(`DEBUG STREAM ${mensagem}`);
  }
}

console.log('Iniciando o processamento assincrono e serializado do relatorio de vendas...')

streamLeitura.on('open', (fd)=> {
 logDebug(`Readable aberta (fd=${fd}).`); 
});

streamEscrita.on('open', (fd)=> {
 logDebug(`Writable aberta (fd=${fd}).`); 
});




streamLeitura.on('pause', (fd)=> {
 logDebug(`Leitura Pausada por backpressure`); 
});


streamLeitura.on('resume', (fd)=> {
 logDebug(`Leitura Retomada`); 
});

streamLeitura.on('error', (fd)=> {
  console.error(`error`, (erro)=>{
    console.error(`Erro Stream Leitura ${erro.message}`)
  })
});

streamEscrita.on('error', (fd)=> {
  console.error(`error`, (erro)=>{
    console.error(`Erro Stream Escrita ${erro.message}`)
  })
});


streamLeitura.on('data', (chunk) => {
  const bytesChunk = Buffer.byteLength(chunk, 'utf-8');
  estadoStream.chunks +=1;
  estadoStream.bytesLidos += bytesChunk;

  logDebug(`Chunk #${estadoStream.chunks} recebido | tamanho=${bytesChunk} bytes | total lido = ${estadoStream.bytesLidos}.`);

  const preview = chunk.slice(0,80).replace(/\n/g, '\\n');
  logDebug(`Prévia chunk #${estadoStream.chunks}: "${preview}"`);

  const dadosProcessados = chunk.toUpperCase();

  estadoStream.bytesEscritos += Buffer.byteLength(dadosProcessados, 'utf-8');

  const temEspaco = streamEscrita.write(dadosProcessados);

  if (!temEspaco) {
    logDebug('Buffer da Escrita saturou (write = false); Aplicando pause() na leitura');
    streamLeitura.pause();
  } else {
    logDebug(`Chunk #${estadoStream.chunks} enviado para escrita com sucesso.`);
  }
});

streamEscrita.on('drain', ()=> {
  logDebug('Evento Drain Recebido. Bufffer de escrita esvaziou.');
  streamLeitura.resume();
});

streamLeitura.on('end', ()=> {
  const tempoTotalMS = Date.now() - estadoStream.inicio;

  logDebug(`Leitura concluída. Chunks =${estadoStream.chunks} |` + `bytes lidos = ${estadoStream.chunks} |`+ `bytes escritos=${estadoStream.bytesEscritos} |`+ `tempo = ${tempoTotalMS}`);

  streamEscrita.end()

  console.log('Pipeline finalizada com sucesso. Relatorio gerado com consumo previsivel de infraestrutura.')
});

streamEscrita.on('finish', ()=> {
  logDebug('Evento finish: todos os dados foram persistidos na Writable');
});

streamLeitura.on('close', ()=>{
  logDebug('Readable fechada (close).')
});

streamEscrita.on('close', ()=>{
  logDebug('Writable fechada (close).')
});