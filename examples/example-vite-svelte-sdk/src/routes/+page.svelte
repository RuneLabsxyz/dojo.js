<script lang="ts">
    import { init } from "@dojoengine/svelte-sdk";
    import { type Schema, schema } from "../lib/bindings";
    import { dojoConfig } from "../lib/dojoConfig";
    import { onMount } from "svelte";
    import { writable } from 'svelte/store';
    import { setupBurnerManager } from "@dojoengine/create-burner";
    import Session from "../lib/spawn/session.svelte";

    const sdk = writable();
    const burnerManager = writable();

    onMount(async () => {
        try {
            const initialized = await init(
                {
                    client: {
                        rpcUrl: dojoConfig.rpcUrl,
                        toriiUrl: dojoConfig.toriiUrl,
                        relayUrl: dojoConfig.relayUrl,
                        worldAddress: dojoConfig.manifest.world.address,
                    },
                    domain: {
                        name: "WORLD_NAME",
                        version: "1.0",
                        chainId: "KATANA",
                        revision: "1",
                    },
                },
                schema
            );
            
            sdk.set(initialized);
            burnerManager.set(await setupBurnerManager(dojoConfig));
        } catch (error) {
            console.error("Failed to initialize the application:", error);
        }
    });
</script>

{#if $sdk && $burnerManager}
    <!-- <Session {$sdk}{$burnerManager} /> -->
{:else}
    <p>Loading...</p>
{/if}

