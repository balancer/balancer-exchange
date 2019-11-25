import { excludes } from "./tokens";

describe("excludes", () => {
  it("should return all tokens except the one being excluded", () => {
    expect(excludes("mkr")).toEqual(["eth", "dai"]);
  });

  it("should return all tokens except the one being excluded using capital letters", () => {
    expect(excludes("MKR")).toEqual(["eth", "dai"]);
  });

  it("should return all tokens if no token is specified", () => {
    expect(excludes()).toEqual(["eth", "dai", "mkr"]);
  });

  it("should return all tokens if the one provided is not part of the tokens list", () => {
    expect(excludes("TEST")).toEqual(["eth", "dai", "mkr"]);
  });

  it("should return all tokens if wrong type for the token is provided", () => {
    expect(excludes(1)).toEqual(["eth", "dai", "mkr"]);
  })
});