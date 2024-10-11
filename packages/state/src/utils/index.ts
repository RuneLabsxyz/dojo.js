import { Type as RecsType, Schema } from "@dojoengine/recs";

export function convertValues(schema: Schema, values: any) {
    return Object.keys(schema).reduce<any>((acc, key) => {
        if (!acc) {
            acc = {};
        }
        const schemaType = schema[key];
        const value = values[key];

        if (value === null || value === undefined) {
            acc[key] = value;
            return acc;
        }

        if (value.type === "enum") {
            acc[key] = value.value.option;
            return acc;
        }

        switch (schemaType) {
            case RecsType.StringArray:
                if (value.type === "array" && value.value.length === 0) {
                    acc[key] = [];
                } else if (
                    value.type === "array" &&
                    value.value[0].type === "enum"
                ) {
                    acc[key] = value.value.map(
                        (item: any) => item.value.option
                    );
                } else {
                    acc[key] = value.value.map((a: any) => {
                        try {
                            return BigInt(a.value);
                        } catch (error) {
                            console.warn(
                                `Failed to convert ${a.value} to BigInt. Using string value instead.`
                            );
                            return a.value;
                        }
                    });
                }
                break;

            case RecsType.String:
                acc[key] = value.value;
                break;

            case RecsType.BigInt:
                try {
                    acc[key] = BigInt(value.value);
                } catch (error) {
                    console.warn(
                        `Failed to convert ${value.value} to BigInt. Using string value instead.`
                    );

                    acc[key] = BigInt(`0x${value.value}`);
                }
                break;

            case RecsType.Boolean:
                acc[key] = value.value;
                break;

            case RecsType.Number:
                acc[key] = Number(value.value);
                break;

            default:
                if (typeof schemaType === "object" && value.type === "struct") {
                    if (value.value instanceof Map) {
                        const structValues = Object.fromEntries(value.value);
                        acc[key] = convertValues(schemaType, structValues);
                    } else {
                        acc[key] = convertValues(schemaType, value.value);
                    }
                } else if (
                    Array.isArray(schemaType) &&
                    value.type === "array"
                ) {
                    acc[key] = value.value.map((item: any) =>
                        convertValues(schemaType[0], item)
                    );
                } else {
                    acc[key] = value.value;
                }
                break;
        }

        return acc;
    }, {});
}
