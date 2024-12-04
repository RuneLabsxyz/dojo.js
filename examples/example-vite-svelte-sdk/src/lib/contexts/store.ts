import type { Schema } from "$lib/bindings";
import { createDojoStore } from "@dojoengine/svelte-sdk";
import { getContext, setContext } from "svelte";

const storeKey = Symbol("dojo_store");

export type Store = ReturnType<typeof setupStore>;

export function setupStore() {
    const value = createDojoStore<Schema>();
    setContext(storeKey, value);

    return value;
}

export function useStore(): Store {
    const context = getContext<Store | undefined>(storeKey);
    if (context == undefined) {
        throw "Store is not set!";
    } else {
        return context;
    }
}
