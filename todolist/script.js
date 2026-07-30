const form = document.getElementById("form-calculo");

const totalBrutoEl = document.getElementById("totalBruto");
const totalImpostosEl = document.getElementById("totalImpostos");
const totalLiquidoEl = document.getElementById("totalLiquido");

const { calcularRendimento } = window.CalculoFinanceiro;

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const { totalBruto, totalImpostos, totalLiquido } = calcularRendimento({
    salario: form.salario.value,
    horasExtras: form.horasExtras.value,
    valorHoraExtra: form.valorHoraExtra.value,
    impostosPercentual: form.impostos.value,
  });

  totalBrutoEl.textContent = formatoMoeda.format(totalBruto);
  totalImpostosEl.textContent = formatoMoeda.format(totalImpostos);
  totalLiquidoEl.textContent = formatoMoeda.format(totalLiquido);
});
