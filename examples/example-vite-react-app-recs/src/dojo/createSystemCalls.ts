import {
    defineSystem,
    Entity,
    getComponentValue,
    Has,
    HasValue,
    World,
} from "@dojoengine/recs";
import { getEntityIdFromKeys } from "@dojoengine/utils";
import { uuid } from "@latticexyz/utils";
import { Account, AccountInterface } from "starknet";

import { ClientComponents } from "./createClientComponents";
import type { IWorld } from "./typescript/contracts.gen";
import { Direction } from "./typescript/models.gen";

export type SystemCalls = ReturnType<typeof createSystemCalls>;

export function createSystemCalls(
    { client }: { client: IWorld },
    { Position, Moves }: ClientComponents,
    world: World
) {
    const spawn = async (account: Account) => {
        const entityId = getEntityIdFromKeys([
            BigInt(account.address),
        ]) as Entity;

        const movesId = uuid();
        Moves.addOverride(movesId, {
            entity: entityId,
            value: {
                player: BigInt(entityId),
                remaining:
                    (getComponentValue(Moves, entityId)?.remaining || 0) + 100,
            },
        });

        const positionId = uuid();
        Position.addOverride(positionId, {
            entity: entityId,
            value: {
                player: BigInt(entityId),
                vec: {
                    x: 10 + (getComponentValue(Position, entityId)?.vec.x || 0),
                    y: 10 + (getComponentValue(Position, entityId)?.vec.y || 0),
                },
            },
        });

        try {
            await client.actions.spawn({
                account,
            });

            // Wait for the indexer to update the entity
            // By doing this we keep the optimistic UI in sync with the actual state
            await new Promise<void>((resolve) => {
                defineSystem(
                    world,
                    [
                        Has(Moves),
                        HasValue(Moves, { player: BigInt(account.address) }),
                    ],
                    () => {
                        resolve();
                    }
                );
            });
        } catch (e) {
            console.log(e);
            Position.removeOverride(positionId);
            Moves.removeOverride(movesId);
        } finally {
            Position.removeOverride(positionId);
            Moves.removeOverride(movesId);
        }
    };

    const move = async (account: Account, direction: Direction) => {
        const entityId = getEntityIdFromKeys([
            BigInt(account.address),
        ]) as Entity;

        try {
            await client.actions.move({
                account,
                direction,
            });

            // Wait for the indexer to update the entity
            // By doing this we keep the optimistic UI in sync with the actual state
            await new Promise<void>((resolve) => {
                defineSystem(
                    world,
                    [
                        Has(Moves),
                        HasValue(Moves, { player: BigInt(account.address) }),
                    ],
                    () => {
                        resolve();
                    }
                );
            });
        } catch (e) {
            console.log(e);
            // Position.removeOverride(positionId);
            // Moves.removeOverride(movesId);
        } finally {
            // Position.removeOverride(positionId);
            // Moves.removeOverride(movesId);
        }
    };

    return {
        spawn,
        move,
    };
}
