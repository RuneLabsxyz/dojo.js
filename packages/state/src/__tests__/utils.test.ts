import { describe, it, expect } from "vitest";
import { convertValues } from "../utils";
import { Type as RecsType } from "@dojoengine/recs";

describe("convertValues", () => {
    // ... existing tests ...

    describe("huge numbers", () => {
        it("should correctly convert huge BigInt values", () => {
            const schema = { hugeNumber: RecsType.BigInt };
            const values = {
                hugeNumber: {
                    value: 123456789101231231231231232132132132132132132131231231231223132,
                },
            };
            const result = convertValues(schema, values);
            expect(result.hugeNumber).toBe(
                BigInt(
                    123456789101231231231231232132132132132132132131231231231223132
                )
            );
        });

        it("should correctly convert huge Number values", () => {
            const schema = { hugeNumber: RecsType.Number };
            const values = { hugeNumber: { value: "1e+308" } }; // Max safe double
            const result = convertValues(schema, values);
            expect(result.hugeNumber).toBe(1e308);
        });

        it("should handle overflow for Number type", () => {
            const schema = { overflowNumber: RecsType.Number };
            const values = { overflowNumber: { value: "1e+309" } }; // Beyond max safe double
            const result = convertValues(schema, values);
            expect(result.overflowNumber).toBe(Infinity);
        });

        it("should correctly convert huge numbers in StringArray", () => {
            const schema = { hugeArray: RecsType.StringArray };
            const values = {
                hugeArray: {
                    value: [
                        { value: "12345678901234567890" },
                        { value: "98765432109876543210" },
                    ],
                },
            };
            const result = convertValues(schema, values);
            expect(result.hugeArray).toEqual([
                12345678901234567890n,
                98765432109876543210n,
            ]);
        });
    });

    describe("additional test cases", () => {
        it("should correctly convert boolean values", () => {
            const schema = { isActive: RecsType.Boolean };
            const values = { isActive: { value: true } };
            const result = convertValues(schema, values);
            expect(result.isActive).toBe(true);
        });

        it("should correctly convert string values", () => {
            const schema = { name: RecsType.String };
            const values = { name: { value: "Test Name" } };
            const result = convertValues(schema, values);
            expect(result.name).toBe("Test Name");
        });

        it("should handle null values", () => {
            const schema = { nullableField: RecsType.String };
            const values = { nullableField: { value: null } };
            const result = convertValues(schema, values);
            expect(result.nullableField).toBeNull();
        });

        it("should handle undefined values", () => {
            const schema = { undefinedField: RecsType.String };
            const values = { undefinedField: { value: undefined } };
            const result = convertValues(schema, values);
            expect(result.undefinedField).toBeUndefined();
        });

        it("should correctly convert nested schema values", () => {
            const schema = { nested: { innerField: RecsType.Number } };
            const values = {
                nested: { value: { innerField: { value: "42" } } },
            };
            const result = convertValues(schema, values);
            expect(result.nested.innerField).toBe(42);
        });
    });
});
