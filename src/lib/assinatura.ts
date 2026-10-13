export async function lerAssinaturaPng(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const pngHeader = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!pngHeader.every((byte, index) => bytes[index] === byte)) {
    throw new Error("Selecione uma imagem PNG da assinatura.");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a assinatura."));
    reader.onload = () => {
      if (typeof reader.result !== "string") return reject(new Error("Imagem inválida."));
      const dataUrl = reader.result;
      const image = new Image();
      image.onerror = () => reject(new Error("Não foi possível abrir a imagem PNG."));
      image.onload = () => resolve(dataUrl);
      image.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}