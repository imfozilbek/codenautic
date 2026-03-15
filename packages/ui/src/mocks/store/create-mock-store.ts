import { MockStore } from "./mock-store"
import {
    seedAuth,
    seedCodeCity,
    seedContractValidation,
    seedDashboard,
    seedProviders,
    seedRepositories,
    seedReviews,
    seedRules,
    seedSettings,
} from "./seed"

/**
 * Singleton-экземпляр MockStore.
 */
let instance: MockStore | undefined

/**
 * Создаёт новый MockStore и заполняет его seed-данными.
 *
 * Каждый вызов создаёт свежий экземпляр (не singleton).
 * Для singleton-доступа используй getMockStore().
 *
 * @returns Новый заполненный MockStore.
 */
export function createMockStore(): MockStore {
    const store = new MockStore()
    seedAuth(store.auth)
    seedContractValidation(store.contractValidation)
    seedDashboard(store.dashboard)
    seedSettings(store.settings)
    seedRules(store.rules)
    seedProviders(store.providers)
    seedReviews(store.reviews)
    seedRepositories(store.repositories)
    seedCodeCity(store.codeCity)
    return store
}

/**
 * Возвращает singleton-экземпляр MockStore.
 *
 * При первом вызове создаёт и заполняет store seed-данными.
 * Последующие вызовы возвращают тот же экземпляр.
 *
 * @returns Singleton MockStore.
 */
export function getMockStore(): MockStore {
    if (instance === undefined) {
        instance = createMockStore()
    }
    return instance
}

/**
 * Сбрасывает singleton MockStore в начальное состояние с seed-данными.
 *
 * Полезно для изоляции тестов: вызывается в beforeEach/afterEach.
 * Если singleton ещё не создан, ничего не делает.
 */
export function resetMockStore(): void {
    if (instance !== undefined) {
        instance.reset()
        seedAuth(instance.auth)
        seedContractValidation(instance.contractValidation)
        seedDashboard(instance.dashboard)
        seedSettings(instance.settings)
        seedRules(instance.rules)
        seedProviders(instance.providers)
        seedReviews(instance.reviews)
        seedRepositories(instance.repositories)
        seedCodeCity(instance.codeCity)
    }
}
