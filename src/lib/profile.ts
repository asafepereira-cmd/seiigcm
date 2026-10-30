import { z } from 'zod';

export const profileNameInput = z.object({ nome: z.string().trim().min(1).max(200) });
export function contatoAdministrador(nome: string, setor: string) {
  const identidade = [nome.trim(), setor.trim()].filter(Boolean).join(' — ');
  return `https://wa.me/5595991120610?text=${encodeURIComponent(`Olá! Gostaria de falar com o desenvolvedor do SEII, sou ${identidade}.`)}`;
}