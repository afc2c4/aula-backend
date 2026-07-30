const { paraNumero, calcularRendimento } = require("../calculo");

describe("calculo de rendimento", () => {
  test("deve converter valores invalidos para 0", () => {
    expect(paraNumero("abc")).toBe(0);
    expect(paraNumero("")).toBe(0);
  });

  test("deve calcular total bruto com horas extras", () => {
    const resultado = calcularRendimento({
      salario: 3000,
      horasExtras: 10,
      valorHoraExtra: 50,
      impostosPercentual: 0,
    });

    expect(resultado.totalBruto).toBe(3500);
    expect(resultado.totalImpostos).toBe(0);
    expect(resultado.totalLiquido).toBe(3500);
  });

  test("deve aplicar impostos e retornar total liquido", () => {
    const resultado = calcularRendimento({
      salario: 4000,
      horasExtras: 5,
      valorHoraExtra: 40,
      impostosPercentual: 15,
    });

    expect(resultado.totalBruto).toBe(4200);
    expect(resultado.totalImpostos).toBe(630);
    expect(resultado.totalLiquido).toBe(3570);
  });
});
