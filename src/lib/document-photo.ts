export async function prepararFoto(file: File) {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Escolha uma foto JPG, PNG ou WebP.');
  if(file.size>10*1024*1024)throw new Error('Escolha uma foto de até 10 MB.');
  const bitmap=await createImageBitmap(file);
  const ratio=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Não foi possível ler a foto.');
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  return {src:canvas.toDataURL('image/jpeg',0.7),legenda:'',largura:canvas.width,altura:canvas.height};
}