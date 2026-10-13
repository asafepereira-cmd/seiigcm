import { describe, expect, it, vi } from "vitest";
import { isModuleLoadError, recoverModuleLoad } from "@/lib/module-recovery";

describe("Recuperação de carregamento", () => {
  it("reconhece a falha de importação do Safari", () => {
    expect(isModuleLoadError(new TypeError("Importing a module script failed."))).toBe(true);
    expect(isModuleLoadError(new Error("Erro ao salvar"))).toBe(false);
  });
  it("recarrega uma vez sem entrar em ciclo", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const reload = vi.fn();
    const error = new Error("Importing a module script failed.");
    expect(recoverModuleLoad(error, storage, reload, 100_000)).toBe(true);
    expect(recoverModuleLoad(error, storage, reload, 100_010)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it("não recarrega para erros comuns ou armazenamento bloqueado", () => {
    const storage = { getItem: () => { throw new Error("blocked"); }, setItem: vi.fn() };
    const reload = vi.fn();
    expect(recoverModuleLoad(new Error("Importing a module script failed."), storage, reload)).toBe(false);
    expect(recoverModuleLoad(new Error("Erro ao salvar"), storage, reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});