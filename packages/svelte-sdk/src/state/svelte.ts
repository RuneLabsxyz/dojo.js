import { writable, get, derived } from "svelte/store";
import {
    produce,
    produceWithPatches,
    Draft,
    Patch,
    applyPatches,
    WritableDraft,
} from "immer";
import { ParsedEntity, SchemaType } from "../types";

/**
 * Interface for a pending transaction, containing the transaction ID,
 * patches to apply, and inverse patches for reverting.
 */
interface PendingTransaction {
    transactionId: string;
    patches: Patch[];
    inversePatches: Patch[];
}

/**
 * Interface representing the game state, including entities, pending transactions,
 * and methods for manipulating the state.
 */
interface GameState<T extends SchemaType> {
    entities: Record<string, ParsedEntity<T>>;
    pendingTransactions: Record<string, PendingTransaction>;
}

/**
 * Factory function to create a Svelte store based on a given SchemaType.
 *
 * @template T - The schema type.
 * @returns An object containing the Svelte store and methods to manipulate it.
 */
export function createDojoStore<T extends SchemaType>() {
    // Define the initial state of the store.
    const initialState: GameState<T> = {
        entities: {},
        pendingTransactions: {},
    };

    // Create a Svelte writable store with the initial state.
    const store = writable<GameState<T>>(initialState);

    // Destructure the subscribe, set, and update methods from the store.
    const { subscribe, set, update } = store;

    /**
     * Sets multiple entities in the store.
     *
     * @param entities - An array of entities to set.
     */
    const setEntities = (entities: ParsedEntity<T>[]) => {
        update((state) =>
            produce(state, (draft: Draft<GameState<T>>) => {
                entities.forEach((entity) => {
                    draft.entities[entity.entityId] = entity as WritableDraft<
                        ParsedEntity<T>
                    >;
                });
            })
        );
    };

    /**
     * Updates a specific entity in the store.
     *
     * @param entity - The partial entity data to update.
     */
    const updateEntity = (entity: Partial<ParsedEntity<T>>) => {
        update((state) =>
            produce(state, (draft: Draft<GameState<T>>) => {
                if (
                    entity.entityId &&
                    draft.entities[entity.entityId] &&
                    entity.models
                ) {
                    const existingEntity = draft.entities[entity.entityId];

                    // Merge existing models with the new models.
                    const mergedModels = Object.assign(
                        {},
                        existingEntity.models
                    );

                    Object.entries(entity.models).forEach(
                        ([namespace, namespaceModels]) => {
                            const typedNamespace =
                                namespace as keyof typeof mergedModels;
                            if (!(typedNamespace in mergedModels)) {
                                mergedModels[typedNamespace] = {} as any;
                            }

                            mergedModels[typedNamespace] = Object.assign(
                                {},
                                mergedModels[typedNamespace],
                                namespaceModels
                            );
                        }
                    );

                    // Update the entity in the draft state.
                    draft.entities[entity.entityId] = {
                        ...existingEntity,
                        ...entity,
                        models: mergedModels,
                    } as WritableDraft<ParsedEntity<T>>;
                }
            })
        );
    };

    /**
     * Applies an optimistic update to the store state.
     *
     * @param transactionId - The ID of the transaction.
     * @param updateFn - A function that applies updates to the draft state.
     */
    const applyOptimisticUpdate = (
        transactionId: string,
        updateFn: (draft: Draft<GameState<T>>) => void
    ) => {
        const currentState = get(store);
        const [nextState, patches, inversePatches] = produceWithPatches(
            currentState,
            (draft: Draft<GameState<T>>) => {
                updateFn(draft);
            }
        );

        set(nextState);

        update((state) =>
            produce(state, (draft: Draft<GameState<T>>) => {
                draft.pendingTransactions[transactionId] = {
                    transactionId,
                    patches,
                    inversePatches,
                };
            })
        );
    };

    /**
     * Reverts an optimistic update based on the transaction ID.
     *
     * @param transactionId - The ID of the transaction to revert.
     */
    const revertOptimisticUpdate = (transactionId: string) => {
        const currentState = get(store);
        const transaction = currentState.pendingTransactions[transactionId];
        if (transaction) {
            const newState = applyPatches(
                currentState,
                transaction.inversePatches
            );
            set(newState);

            update((state) =>
                produce(state, (draft: Draft<GameState<T>>) => {
                    delete draft.pendingTransactions[transactionId];
                })
            );
        }
    };

    /**
     * Confirms a transaction by removing it from pending transactions.
     *
     * @param transactionId - The ID of the transaction to confirm.
     */
    const confirmTransaction = (transactionId: string) => {
        update((state) =>
            produce(state, (draft: Draft<GameState<T>>) => {
                delete draft.pendingTransactions[transactionId];
            })
        );
    };

    /**
     * Retrieves a specific entity from the store.
     *
     * @param entityId - The ID of the entity to retrieve.
     * @returns The requested entity or undefined if not found.
     */
    const getEntity = (entityId: string): ParsedEntity<T> | undefined => {
        const state = get(store);
        return state.entities[entityId];
    };

    /**
     * Retrieves all entities, optionally filtered by a predicate function.
     *
     * @param filter - An optional predicate function to filter entities.
     * @returns An array of entities.
     */
    const getEntities = (
        filter?: (entity: ParsedEntity<T>) => boolean
    ): ParsedEntity<T>[] => {
        const state = get(store);
        const allEntities = Object.values(state.entities);
        return filter ? allEntities.filter(filter) : allEntities;
    };

    /**
     * Retrieves entities based on a specific model.
     *
     * @param namespace - The namespace of the model.
     * @param model - The model key.
     * @returns An array of entities matching the model.
     */
    const getEntitiesByModel = (
        namespace: keyof T,
        model: keyof T[keyof T]
    ): ParsedEntity<T>[] => {
        return getEntities((entity) => {
            return !!entity.models[namespace]?.[model];
        });
    };

    /**
     * Subscribes to changes of a specific entity.
     *
     * @param entityId - The ID of the entity to subscribe to.
     * @param listener - A callback function that receives the entity.
     * @returns A function to unsubscribe from the entity updates.
     */
    const subscribeToEntity = (
        entityId: string,
        listener: (entity: ParsedEntity<T> | undefined) => void
    ): (() => void) => {
        // Create a derived store for the specific entity.
        const entityStore = derived(
            store,
            ($store) => $store.entities[entityId]
        );
        return entityStore.subscribe(listener);
    };

    /**
     * Waits for an entity to change based on a predicate function.
     *
     * @param entityId - The ID of the entity to monitor.
     * @param predicate - A function that returns true when the desired condition is met.
     * @param timeout - An optional timeout in milliseconds.
     * @returns A promise that resolves with the entity or rejects on timeout.
     */
    const waitForEntityChange = (
        entityId: string,
        predicate: (entity: ParsedEntity<T> | undefined) => boolean,
        timeout = 6000
    ): Promise<ParsedEntity<T> | undefined> => {
        return new Promise<ParsedEntity<T> | undefined>((resolve, reject) => {
            const unsubscribe = subscribe((state) => {
                const entity = state.entities[entityId];
                if (predicate(entity)) {
                    clearTimeout(timer);
                    unsubscribe();
                    resolve(entity);
                }
            });

            const timer = setTimeout(() => {
                unsubscribe();
                reject(
                    new Error(
                        `waitForEntityChange: Timeout of ${timeout}ms exceeded`
                    )
                );
            }, timeout);
        });
    };

    // Return the store and methods for use in Svelte components.
    return {
        subscribe,
        setEntities,
        updateEntity,
        applyOptimisticUpdate,
        revertOptimisticUpdate,
        confirmTransaction,
        subscribeToEntity,
        waitForEntityChange,
        getEntity,
        getEntities,
        getEntitiesByModel,
    };
}
