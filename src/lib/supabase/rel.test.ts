import { describe, expect, it } from "vitest";
import { rel } from "./rel";

describe("embedded relations", () => {
  it("reads an object, an array or nothing as a list", () => {
    expect(rel<{ status: string }>({ status: "complete" })).toEqual([{ status: "complete" }]);
    expect(rel<{ status: string }>([{ status: "complete" }, { status: "received" }])).toHaveLength(2);
    expect(rel(null)).toEqual([]);
    expect(rel(undefined)).toEqual([]);
  });
});
