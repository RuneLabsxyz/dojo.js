<script lang="ts">
    import { init, type SDK } from "@dojoengine/svelte-sdk";
    import { type Schema, schema } from "../lib/bindings";
    import { dojoConfig } from "../lib/dojoConfig";
    import { onMount } from "svelte";
    import { writable, type Writable } from "svelte/store";
    import {
        BurnerManager,
        setupBurnerManager,
    } from "@dojoengine/create-burner";
    import Session from "../lib/spawn/session.svelte";
    import { DojoProvider } from "@dojoengine/core";
    import { type IClient, client as getClient } from "$lib/contracts.gen";
    import { setupClient } from "$lib/contexts/client";
    import { setupBurner } from "$lib/contexts/account";
    import { setupStore } from "$lib/contexts/store";

    setupStore();
    const setup = Promise.all([
        setupClient(dojoConfig),
        setupBurner(dojoConfig),
    ]).then((e) => console.log("Finished!"));
</script>

{#await setup}
    <p>Loading...</p>
{:then _}
    <Session />
{/await}
