import asyncInterval from './async-interval';

jest.useFakeTimers();

const any = "any";

describe("async interval", () => {

  let asyncFunc = null;

  beforeEach(() => {
    asyncFunc = jest.fn();
  })

  test("should call an async function using interval", async () => {
    asyncFunc.mockReturnValue(Promise.resolve(any));

    asyncInterval(asyncFunc, 1000);
    expect(asyncFunc).toHaveBeenCalledTimes(1);

    await Promise.resolve(any);
    jest.runOnlyPendingTimers();

    expect(asyncFunc).toHaveBeenCalledTimes(2)
  });

  test("should stop calling a function if the interval is halted",async () => {
    asyncFunc.mockReturnValue(Promise.resolve(any));

    const stop = asyncInterval(asyncFunc, 1000);
    expect(asyncFunc).toHaveBeenCalledTimes(1);

    stop();

    await Promise.resolve(any);
    jest.runOnlyPendingTimers();

    expect(asyncFunc).toHaveBeenCalledTimes(1);
  });

  test("should stop calling a function if error arises",async () => {
    asyncFunc.mockReturnValue(Promise.reject(new Error("Failed")));

    asyncInterval(asyncFunc, 1000);
    expect(asyncFunc).toHaveBeenCalledTimes(1);

    await Promise.resolve(any);
    jest.runOnlyPendingTimers();

    expect(asyncFunc).toHaveBeenCalledTimes(1);
  });

  test("should stop calling a function if error arises",async () => {
    asyncFunc.mockImplementation(() => {
      throw new Error();
    });

    asyncInterval(asyncFunc, 1000);
    expect(asyncFunc).toHaveBeenCalledTimes(1);

    jest.runOnlyPendingTimers();

    expect(asyncFunc).toHaveBeenCalledTimes(1);
  });
});

