import { AuthCollection } from "./collections/auth-collection"
import { ProvidersCollection } from "./collections/providers-collection"
import { ReviewsCollection } from "./collections/reviews-collection"
import { RulesCollection } from "./collections/rules-collection"
import { SettingsCollection } from "./collections/settings-collection"

/**
 * Централизованное in-memory хранилище для mock API слоя MSW.
 *
 * Агрегирует все коллекции данных (auth, settings, rules, providers, reviews).
 * Предоставляет единую точку сброса состояния через метод reset().
 */
export class MockStore {
    /**
     * Коллекция авторизации: пользователи и сессии.
     */
    public readonly auth: AuthCollection

    /**
     * Коллекция настроек: пользовательские настройки, предпочтения, конфигурации репозиториев.
     */
    public readonly settings: SettingsCollection

    /**
     * Коллекция custom-правил пайплайна.
     */
    public readonly rules: RulesCollection

    /**
     * Коллекция Git providers и context sources.
     */
    public readonly providers: ProvidersCollection

    /**
     * Коллекция reviews: CCR, диффы, треды, результаты code review.
     */
    public readonly reviews: ReviewsCollection

    /**
     * Создаёт новый экземпляр MockStore с пустыми коллекциями.
     */
    public constructor() {
        this.auth = new AuthCollection()
        this.settings = new SettingsCollection()
        this.rules = new RulesCollection()
        this.providers = new ProvidersCollection()
        this.reviews = new ReviewsCollection()
    }

    /**
     * Сбрасывает все коллекции в начальное пустое состояние.
     */
    public reset(): void {
        this.auth.clear()
        this.settings.clear()
        this.rules.clear()
        this.providers.clear()
        this.reviews.clear()
    }
}
