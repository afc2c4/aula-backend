function paraNumero(valor) {
  return Number(valor) || 0;
}

function calcularRendimento({ salario, horasExtras, valorHoraExtra, impostosPercentual }) {
  const salarioNumero = paraNumero(salario);
  const horasExtrasNumero = paraNumero(horasExtras);
  const valorHoraExtraNumero = paraNumero(valorHoraExtra);
  const impostosNumero = paraNumero(impostosPercentual);

  const totalHorasExtras = horasExtrasNumero * valorHoraExtraNumero;
  const totalBruto = salarioNumero + totalHorasExtras;
  const totalImpostos = totalBruto * (impostosNumero / 100);
  const totalLiquido = totalBruto - totalImpostos;

  return {
    totalBruto,
    totalImpostos,
    totalLiquido,
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    paraNumero,
    calcularRendimento,
  };
}

if (typeof window !== "undefined") {
  window.CalculoFinanceiro = {
    paraNumero,
    calcularRendimento,
  };
}
