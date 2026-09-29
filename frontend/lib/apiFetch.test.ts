import { apiFetch, ApiError } from "./apiFetch";
import { clearToken, getToken } from "../app/lib/auth";

jest.mock("../app/lib/auth", () => ({
  clearToken: jest.fn(),
  getToken: jest.fn(),
}));

describe("apiFetch session expiry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getToken as jest.Mock).mockReturnValue("expired-token");
    global.fetch = jest.fn();
    window.history.replaceState({}, "", "/wallet?tab=offers");
  });

  it("clears the session, emits the toast event, and redirects with returnTo on 401", async () => {
    const expired = jest.fn();
    const redirect = jest.spyOn(window.location, "assign").mockImplementation(() => {});
    window.addEventListener("stellar-raide-stellar-raide-airflex:session-expired", expired);
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ message: "expired" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(apiFetch("/api/private")).rejects.toBeInstanceOf(ApiError);

    expect(clearToken).toHaveBeenCalledTimes(1);
    expect(expired).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith(
      "/auth/signup?returnTo=%2Fwallet%3Ftab%3Doffers",
    );
    window.removeEventListener("stellar-raide-stellar-raide-airflex:session-expired", expired);
    redirect.mockRestore();
  });
});
