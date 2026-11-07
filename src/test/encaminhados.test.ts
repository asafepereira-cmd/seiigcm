import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { idsEncaminhados } from "@/lib/encaminhados";

describe("idsEncaminhados", () => {
  it("junta destinatários de ciência e signatários sem repetir", () => {
    expect(idsEncaminhados([{ user_id: "a" }], [{ gestora: "user:a" }, { gestora: "user:b" }, { gestora: "pedagogica" }])).toEqual(["a", "b"]);
  });
});
