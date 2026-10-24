import { describe, expect, it } from "vitest";
import { explainContractRevert } from "../hooks/useContractTx";

describe("explainContractRevert", () => {
  it("mengubah rate limit RPC menjadi pesan yang humanis", () => {
    expect(explainContractRevert({
      message: "An internal error was received.",
      details: "Request is being rate limited.",
    })).toBe("Jaringan sedang sibuk. Tunggu beberapa detik, lalu coba lagi.");
  });

  it("mengubah pembatalan wallet menjadi pesan yang jelas", () => {
    expect(explainContractRevert(new Error("User rejected the request"))).toBe("Transaksi dibatalkan dari wallet.");
  });
});
