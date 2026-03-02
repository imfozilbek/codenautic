import {createToken} from "@codenautic/core"

import type {IMongoConnectionManager} from "./contracts/database.contract"

/**
 * Database domain IoC tokens.
 */
export const DATABASE_TOKENS = {
    MongoConnectionManager: createToken<IMongoConnectionManager>(
        "adapters.database.mongo-connection-manager",
    ),
} as const
