import type {ISystemSettingsRepository} from "@codenautic/core"

import type {ISystemSettingSchema} from "../schemas/system-settings.schema"
import type {
    IMongoModel,
    IMongoRepositoryFactory,
} from "./mongo-repository.types"

type SystemSettingRecord = Parameters<ISystemSettingsRepository["upsert"]>[0]

/**
 * Constructor options for Mongo system settings repository.
 */
export interface IMongoSystemSettingsRepositoryOptions {
    /**
     * Mongo model/collection abstraction.
     */
    readonly model: IMongoModel<ISystemSettingSchema>

    /**
     * Entity-document conversion factory.
     */
    readonly factory: IMongoRepositoryFactory<SystemSettingRecord, ISystemSettingSchema>
}

/**
 * MongoDB implementation of system settings repository port.
 */
export class MongoSystemSettingsRepository implements ISystemSettingsRepository {
    private readonly model: IMongoModel<ISystemSettingSchema>
    private readonly factory: IMongoRepositoryFactory<
        SystemSettingRecord,
        ISystemSettingSchema
    >

    /**
     * Creates repository instance.
     *
     * @param options Repository dependencies.
     */
    public constructor(options: IMongoSystemSettingsRepositoryOptions) {
        this.model = options.model
        this.factory = options.factory
    }

    /**
     * Finds setting record by key.
     *
     * @param key Setting key.
     * @returns Setting record or null.
     */
    public async findByKey(
        key: string,
    ): ReturnType<ISystemSettingsRepository["findByKey"]> {
        const document = await this.model.findOne({
            key,
        })
        if (document === null) {
            return null
        }

        return this.factory.toEntity(document)
    }

    /**
     * Loads all persisted system settings.
     *
     * @returns System settings list.
     */
    public async findAll(): ReturnType<ISystemSettingsRepository["findAll"]> {
        const documents = await this.model.find({})
        return documents.map((document): SystemSettingRecord => {
            return this.factory.toEntity(document)
        })
    }

    /**
     * Upserts setting record by identifier.
     *
     * @param setting Setting record.
     */
    public async upsert(
        setting: SystemSettingRecord,
    ): ReturnType<ISystemSettingsRepository["upsert"]> {
        const document = this.factory.toDocument(setting)
        await this.model.replaceOne(
            {
                _id: document._id,
            },
            document,
            {
                upsert: true,
            },
        )
    }

    /**
     * Deletes setting record by key.
     *
     * @param key Setting key.
     */
    public async deleteByKey(
        key: string,
    ): ReturnType<ISystemSettingsRepository["deleteByKey"]> {
        await this.model.deleteOne({
            key,
        })
    }
}
