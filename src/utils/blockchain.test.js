import { isEmptyProxy } from "./blockchain";

test("isEmptyProxy works correctly", () => {
  expect(isEmptyProxy("0xc257274276a4e539741ca11b590b9447b26a8051")).toBe(false);
  
  expect(isEmptyProxy("0x0000000000000000000000000000000000000000")).toBe(true);
  expect(isEmptyProxy("0x")).toBe(true);
  expect(isEmptyProxy(undefined)).toBe(true);
  expect(isEmptyProxy("0x0")).toBe(true);
});
