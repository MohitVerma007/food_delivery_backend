import { describe, it, expect } from "vitest";
import { calculateOrderTotal } from "./order-totals.js";

describe("calculateOrderTotal", () => {
  it("calculates the correct order total", () => {
    const total = calculateOrderTotal({
      subtotalPaise: 20000,
      taxPaise: 1000,
      deliveryFeePaise: 3000,
      discountPaise: 2000,
    });

    expect(total).toBe(22000);
  });

  it("does not return a negative total", () => {
    const total = calculateOrderTotal({
      subtotalPaise: 1000,
      taxPaise: 0,
      deliveryFeePaise: 0,
      discountPaise: 2000,
    });

    expect(total).toBe(0);
  });

  it("rejects invalid monetary amounts", () => {
    expect(() =>
      calculateOrderTotal({
        subtotalPaise: -100,
        taxPaise: 0,
        deliveryFeePaise: 0,
        discountPaise: 0,
      })
    ).toThrow("Invalid monetary amount");
  });
});