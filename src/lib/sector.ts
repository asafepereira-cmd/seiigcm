export function cpfValido(value: string) {
  const cpf = value.replace(/\D/g, '');
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let size = 9; size <= 10; size++) {
    const total = [...cpf.slice(0, size)].reduce((sum, n, i) => sum + Number(n) * (size + 1 - i), 0);
    const digit = (total * 10) % 11 % 10;
    if (digit !== Number(cpf[size])) return false;
  }
  return true;
}

export function podeExportar(tipoPainel: string, status: string) {
  void tipoPainel; void status;
  return true;
}