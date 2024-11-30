<script lang="ts">
    import { init } from "@dojoengine/svelte-sdk";
    import { Schema, schema } from "$lib/bindings";
    import { dojoConfig } from "$lib/dojoConfig";
    import { onMount } from "svelte";
    import { writable } from 'svelte/store';

    const sdk = writable();

    onMount(async () => {
        const initialized = await init<Schema>(
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
    });

</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
