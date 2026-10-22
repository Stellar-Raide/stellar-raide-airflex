import { FraudDetectionService } from "./fraudDetection";

describe("fraud detection rule configuration", () => {
  const saved = { threshold: process.env.FAILED_TRADE_THRESHOLD, window: process.env.FAILED_TRADE_WINDOW_SECONDS };
  afterEach(() => {
    process.env.FAILED_TRADE_THRESHOLD = saved.threshold;
    process.env.FAILED_TRADE_WINDOW_SECONDS = saved.window;
  });

  it("uses safe defaults for failed-trade velocity checks", () => {
    delete process.env.FAILED_TRADE_THRESHOLD;
    delete process.env.FAILED_TRADE_WINDOW_SECONDS;
    expect(FraudDetectionService.getFailedTradeRule()).toEqual({ threshold: 5, windowSeconds: 3600 });
  });

  it("honours configured thresholds and windows", () => {
    process.env.FAILED_TRADE_THRESHOLD = "3";
    process.env.FAILED_TRADE_WINDOW_SECONDS = "120";
    expect(FraudDetectionService.getFailedTradeRule()).toEqual({ threshold: 3, windowSeconds: 120 });
  });
});
