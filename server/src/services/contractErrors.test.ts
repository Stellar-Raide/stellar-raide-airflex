import { ContractError, TradeNotFoundError, UnauthorizedContractError, parseContractError } from "./contractErrors";

describe("contract error mapping", () => {
  it("maps Soroban numeric codes to actionable typed errors", () => {
    expect(parseContractError(new Error("Error(Contract, #3)"))).toBeInstanceOf(TradeNotFoundError);
    expect(parseContractError("ContractError(2)")).toBeInstanceOf(UnauthorizedContractError);
  });

  it("uses a safe typed fallback for unknown codes and unrelated failures", () => {
    const unknown = parseContractError("Error(Contract, #999)");
    expect(unknown).toBeInstanceOf(ContractError);
    expect(unknown?.message).toContain("Unknown contract error");
    expect(parseContractError(new Error("network unavailable"))).toBeNull();
  });
});
