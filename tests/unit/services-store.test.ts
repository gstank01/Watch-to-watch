// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseServices,
  SERVICES_KEY,
  toggleService,
  useMyServices,
  writeServices,
} from "@/lib/services/store";

describe("my services store", () => {
  beforeEach(() => window.localStorage.clear());

  it("parses only positive integer ids, de-duplicated", () => {
    expect(parseServices(null)).toEqual([]);
    expect(parseServices("not json")).toEqual([]);
    expect(parseServices('{"a":1}')).toEqual([]);
    expect(parseServices('[8, 8, -1, 2.5, "9", 337]')).toEqual([8, 337]);
  });

  it("persists to localStorage and notifies subscribers", () => {
    const { result } = renderHook(() => useMyServices());
    expect(result.current).toEqual([]);
    act(() => writeServices([8]));
    expect(result.current).toEqual([8]);
    expect(window.localStorage.getItem(SERVICES_KEY)).toBe("[8]");
    act(() => toggleService([8], 337));
    expect(result.current).toEqual([8, 337]);
    act(() => toggleService([8, 337], 8));
    expect(result.current).toEqual([337]);
  });

  it("keeps working in memory when localStorage throws", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const { result } = renderHook(() => useMyServices());
    act(() => writeServices([9]));
    expect(result.current).toEqual([9]);
    spy.mockRestore();
    get.mockRestore();
  });
});
