const form = document.getElementById("form-calculo");

const totalBrutoEl = document.getElementById("totalBruto");
const totalImpostosEl = document.getElementById("totalImpostos");
const totalLiquidoEl = document.getElementById("totalLiquido");

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function paraNumero(valor) {
  return Number(valor) || 0;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const salario = paraNumero(form.salario.value);
  const horasExtras = paraNumero(form.horasExtras.value);
  const valorHoraExtra = paraNumero(form.valorHoraExtra.value);
  const impostosPercentual = paraNumero(form.impostos.value);

  const totalHorasExtras = horasExtras * valorHoraExtra;
  const totalBruto = salario + totalHorasExtras;
  const totalImpostos = totalBruto * (impostosPercentual / 100);
  const totalLiquido = totalBruto - totalImpostos;

  totalBrutoEl.textContent = formatoMoeda.format(totalBruto);
  totalImpostosEl.textContent = formatoMoeda.format(totalImpostos);
  totalLiquidoEl.textContent = formatoMoeda.format(totalLiquido);
});
