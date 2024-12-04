import { createDojoStore } from "@dojoengine/svelte-sdk";
import { getEntityIdFromKeys } from "@dojoengine/utils";
import type { Schema } from "./bindings";
import { v4 as uuidv4 } from "uuid";
import { useClient } from "./contexts/client";
import { useBurner } from "./contexts/account";
import { useDojo } from "./contexts/dojo";

/**
 * Custom hook to handle system calls and state management in the Dojo application.
 * Provides functionality for spawning entities and managing optimistic updates.
 *
 * @returns An object containing system call functions:
 *   - spawn: Function to spawn a new entity with initial moves
 */
export const useSystemCalls = () => {
    const {
        store: state,
        account: { account },
        client: { client },
    } = useDojo();

    /**
     * Generates a unique entity ID based on the current account address.
     * @returns {string} The generated entity ID
     */
    const generateEntityId = (): string => {
        return getEntityIdFromKeys([BigInt(account?.address ?? 0)]);
    };

    /**
     * Spawns a new entity with initial moves and handles optimistic updates.
     * @returns {Promise<void>}
     * @throws {Error} If the spawn action fails
     */
    const spawn = async (): Promise<void> => {
        if (account == null) {
            return;
        }
        // Generate a unique entity ID
        const entityId = generateEntityId();

        // Generate a unique transaction ID
        const transactionId = uuidv4();

        // The value to update the Moves model with
        const remainingMoves = 100;

        // Apply an optimistic update to the state
        // this uses immer drafts to update the state
        state.applyOptimisticUpdate(transactionId, (draft) => {
            if (draft.entities[entityId]?.models?.dojo_starter?.Moves) {
                draft.entities[entityId].models.dojo_starter.Moves.remaining =
                    remainingMoves;
            }
        });

        try {
            // Execute the spawn action from the client
            await client.actions.spawn({ account });

            // Wait for the entity to be updated with the new state
            await state.waitForEntityChange(entityId, (entity) => {
                return (
                    entity?.models?.dojo_starter?.Moves?.remaining ===
                    remainingMoves
                );
            });
        } catch (error) {
            // Revert the optimistic update if an error occurs
            state.revertOptimisticUpdate(transactionId);
            console.error("Error executing spawn:", error);
            throw error;
        } finally {
            // Confirm the transaction if successful
            state.confirmTransaction(transactionId);
        }
    };

    return {
        spawn,
    };
};
