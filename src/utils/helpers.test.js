import { threshold, formatNumber } from "./helpers";

// this test tries to prove that previous sorting function had bugs but it turns out that *usually* it works in chrome and thus it's hard to write proper test case
// read more: https://stackoverflow.com/questions/24080785/sorting-in-javascript-shouldnt-returning-a-boolean-be-enough-for-a-comparison
test("threshold is calculated properly", () => {
  expect(threshold("private", "eth", "dai")).toBe(2);
  expect(threshold("private", "dai", "eth")).toBe(2);
});

test("formatting number without decimals", () => {
  expect(formatNumber(123, 0 , false)).toBe("123");
});

test("formatting number without decimals and try to trim decimals", () => {
  expect(formatNumber(123, 1 , false)).toBe("123");
});

test("formatting number without decimals in wei notation", () => {
  expect(formatNumber(5000000000000000000)).toBe("5");
});

test("formatting number with decimals", () => {
  expect(formatNumber(1.123456789, 0, false)).toBe("1.123456789");
});

test("formatting number with decimals and trim decimals", () => {
  expect(formatNumber(1.123456789, 5, false)).toBe("1.12345");
});

test("formatting number in wei with decimals and trim decimals", () => {
  expect(formatNumber(5234000000000000000, 2)).toBe("5.23");
});

test("formatting longer number will result in decimals trimming up to the 20th point", () => {
  expect(formatNumber("123.123456789123456789123456789", 0, false)).toBe("123.12345678912345678912");
});

