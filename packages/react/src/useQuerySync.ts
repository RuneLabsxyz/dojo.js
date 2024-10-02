import { useCallback, useEffect } from "react";
import { Component, Metadata, Schema } from "@dojoengine/recs";
import { getSyncEntities } from "@dojoengine/state";
import {
    Clause,
    EntityKeysClause,
    Subscription,
    ToriiClient,
} from "@dojoengine/torii-client";

/**
 * Synchronizes entities with their components.
 * @param toriiClient - The client instance for API communication.
 * @param components - An array of component definitions.
 * @param models - An array of models to synchronize.
 * @param keys - An array of keys to synchronize.
 * @param patternMatching - The pattern matching strategy to use (default: "VariableLen").
 *
 * @example
 *
 * useQuerySync(toriiClient, contractComponents, [
 *     {
 *         Keys: {
 *             keys: [BigInt(account?.account.address).toString()],
 *             models: ["Position", "Moves", "DirectionsAvailable"],
 *             pattern_matching: "FixedLen",
 *         },
 *     },
 * ]);
 */
export function useQuerySync<S extends Schema>(
    toriiClient: ToriiClient,
    components: Component<S, Metadata, undefined>[],
    entityKeyClause: EntityKeysClause[],
    clause?: Clause | undefined
) {
    const setupSync = useCallback(async () => {
        try {
            return await getSyncEntities(
                toriiClient,
                components,
                clause,
                entityKeyClause
            );
        } catch (error) {
            throw error;
        }
    }, [toriiClient, components]);

    useEffect(() => {
        let unsubscribe: Subscription | undefined;

        setupSync()
            .then((sync) => {
                unsubscribe = sync;
            })
            .catch((error) => {
                console.error("Error setting up entity sync:", error);
            });

        return () => {
            if (unsubscribe) {
                unsubscribe.cancel();
                console.log("Sync unsubscribed");
            }
        };
    }, [setupSync]);
}
