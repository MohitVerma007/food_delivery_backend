export function calculateOrderTotal(input: {
  subtotalPaise: number;
  taxPaise: number;
  deliveryFeePaise: number;
  discountPaise: number;
}) {
  const {
    subtotalPaise,
    taxPaise,
    deliveryFeePaise,
    discountPaise,
  } = input;

  const values = [
    subtotalPaise,
    taxPaise,
    deliveryFeePaise,
    discountPaise,
  ];

  if (
    values.some(
      (value) => !Number.isSafeInteger(value) || value < 0
    )
  ) {
    throw new Error("Invalid monetary amount");
  }

  const total =
    subtotalPaise +
    taxPaise +
    deliveryFeePaise -
    discountPaise;

  if (!Number.isSafeInteger(total)) {
    throw new Error("Total exceeds safe integer range");
  }

  return Math.max(0, total);
}