export class ErroNegocio extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroNegocio";
  }
}

export function falhar(mensagem: string): never {
  throw new ErroNegocio(mensagem);
}
