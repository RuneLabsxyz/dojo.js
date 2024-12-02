<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { QueryBuilder, createDojoStore } from "@dojoengine/svelte-sdk";
    import { getEntityIdFromKeys } from "@dojoengine/utils";
    import { addAddressPadding } from "starknet";
    import type { Schema } from "../../lib/bindings";
    
    let { sdk, burnerManager } = $props();


    // Create store
    const dojoStore = createDojoStore<Schema>();
    
    let entities = $state({});
    let moves = $state(null);
    let position = $state(null);
    
    let entityId = $derived(getEntityIdFromKeys([BigInt(burnerManager?.account?.address || '0')]));

    // Subscribe to store updates using effect
    $effect(() => {
        entities = dojoStore.getState().entities;
    });

    onMount(async () => {
        // Entity subscription
        const subscription = await sdk.subscribeEntityQuery({
            query: new QueryBuilder<Schema>()
                .namespace("dojo_starter", (n) =>
                    n.entity("Moves", (e) =>
                        e.eq(
                            "player",
                            addAddressPadding(burnerManager.account.address)
                        )
                    )
                    .entity("Position", (e) =>
                        e.is(
                            "player",
                            addAddressPadding(burnerManager.account.address)
                        )
                    )
                )
                .build(),
            callback: (response) => {
                if (response.error) {
                    console.error("Error setting up entity sync:", response.error);
                } else if (response.data && response.data[0].entityId !== "0x0") {
                    console.log("subscribed", response.data[0]);
                    dojoStore.getState().updateEntity(response.data[0]);
                }
            },
        });

        // Initial entity fetch
        try {
            await sdk.getEntities({
                query: new QueryBuilder<Schema>()
                    .namespace("dojo_starter", (n) =>
                        n.entity("Moves", (e) =>
                            e.eq(
                                "player",
                                addAddressPadding(burnerManager.account.address)
                            )
                        )
                    )
                    .build(),
                callback: (resp) => {
                    if (resp.error) {
                        console.error("resp.error.message:", resp.error.message);
                        return;
                    }
                    if (resp.data) {
                        dojoStore.getState().setEntities(resp.data);
                    }
                },
            });
        } catch (error) {
            console.error("Error querying entities:", error);
        }

        return () => {
            if (subscription) subscription.cancel();
        };
    });

    async function handleSpawn() {
        // Implement spawn functionality
    }

    async function handleMove(direction) {
        await sdk.client.actions.move({
            account: burnerManager.account,
            direction: { type: direction },
        });
    }
</script>

<div class="bg-black min-h-screen w-full p-4 sm:p-8">
    <div class="max-w-7xl mx-auto">
        <button
            class="mb-4 px-4 py-2 bg-blue-600 text-white text-sm sm:text-base rounded-md hover:bg-blue-700 transition-colors duration-300"
            on:click={() => burnerManager.create()}
        >
            {burnerManager.isDeploying ? "Deploying Burner..." : "Create Burner"}
        </button>

        <div class="bg-gray-800 shadow-md rounded-lg p-4 sm:p-6 mb-6 w-full max-w-md">
            <div class="text-lg sm:text-xl font-semibold mb-4 text-white">
                Burners Deployed: {burnerManager.count}
            </div>
            <div class="mb-4">
                <label
                    for="signer-select"
                    class="block text-sm font-medium text-gray-300 mb-2"
                >
                    Select Signer:
                </label>
                <select
                    id="signer-select"
                    class="w-full px-3 py-2 text-base text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={burnerManager.account?.address || ""}
                    on:change={(e) => burnerManager.select(e.target.value)}
                >
                    {#each burnerManager.list() as account, i}
                        <option value={account.address}>
                            {account.address}
                        </option>
                    {/each}
                </select>
            </div>
            <button
                class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 text-base rounded transition duration-300 ease-in-out"
                on:click={() => burnerManager.clear()}
            >
                Clear Burners
            </button>
        </div>

        <!-- Game Controls -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div class="bg-gray-700 p-4 rounded-lg shadow-inner">
                <div class="grid grid-cols-3 gap-2 w-full h-48">
                    <div class="col-start-2">
                        <button
                            class="h-12 w-12 bg-gray-600 rounded-full shadow-md active:shadow-inner active:bg-gray-500 focus:outline-none text-2xl font-bold text-gray-200"
                            on:click={handleSpawn}
                        >
                            +
                        </button>
                    </div>
                    <div class="col-span-3 text-center text-base text-white">
                        Moves Left: {moves ? moves.remaining : "Need to Spawn"}
                    </div>
                    <div class="col-span-3 text-center text-base text-white">
                        {#if position}
                            x: {position.vec.x}, y: {position.vec.y}
                        {:else}
                            Need to Spawn
                        {/if}
                    </div>
                    <div class="col-span-3 text-center text-base text-white">
                        {moves?.last_direction || ''}
                    </div>
                </div>
            </div>

            <!-- Movement Controls -->
            <div class="bg-gray-700 p-4 rounded-lg shadow-inner">
                <div class="grid grid-cols-3 gap-2 w-full h-48">
                    {#each [
                        { direction: "Up", label: "↑", col: "col-start-2" },
                        { direction: "Left", label: "←", col: "col-start-1" },
                        { direction: "Right", label: "→", col: "col-start-3" },
                        { direction: "Down", label: "↓", col: "col-start-2" }
                    ] as { direction, label, col }}
                        <button
                            class="{col} h-12 w-12 bg-gray-600 rounded-full shadow-md active:shadow-inner active:bg-gray-500 focus:outline-none text-2xl font-bold text-gray-200"
                            on:click={() => handleMove(direction)}
                        >
                            {label}
                        </button>
                    {/each}
                </div>
            </div>
        </div>

        <!-- Entities Table -->
        <div class="mt-8 overflow-x-auto">
            <table class="w-full border-collapse border border-gray-700">
                <thead>
                    <tr class="bg-gray-800 text-white">
                        <th class="border border-gray-700 p-2">Entity ID</th>
                        <th class="border border-gray-700 p-2">Player</th>
                        <th class="border border-gray-700 p-2">Position X</th>
                        <th class="border border-gray-700 p-2">Position Y</th>
                        <th class="border border-gray-700 p-2">Can Move</th>
                        <th class="border border-gray-700 p-2">Last Direction</th>
                        <th class="border border-gray-700 p-2">Remaining Moves</th>
                    </tr>
                </thead>
                <tbody>
                    {#each Object.entries(entities) as [entityId, entity]}
                        {@const position = entity.models.dojo_starter.Position}
                        {@const moves = entity.models.dojo_starter.Moves}
                        <tr class="text-gray-300">
                            <td class="border border-gray-700 p-2">{entityId}</td>
                            <td class="border border-gray-700 p-2">{position?.player ?? 'N/A'}</td>
                            <td class="border border-gray-700 p-2">{position?.vec?.x ?? 'N/A'}</td>
                            <td class="border border-gray-700 p-2">{position?.vec?.y ?? 'N/A'}</td>
                            <td class="border border-gray-700 p-2">{moves?.can_move?.toString() ?? 'N/A'}</td>
                            <td class="border border-gray-700 p-2">{moves?.last_direction ?? 'N/A'}</td>
                            <td class="border border-gray-700 p-2">{moves?.remaining ?? 'N/A'}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </div>
</div>
