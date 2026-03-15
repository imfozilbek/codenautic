/**
 * FOV камеры (в градусах) для начальной инициализации Canvas.
 */
export const CANVAS_CAMERA_FOV = 45

/**
 * Начальная позиция камеры при инициализации Canvas.
 */
export const CANVAS_INITIAL_CAMERA_POSITION: readonly [number, number, number] = [30, 26, 30]

/**
 * Интенсивность ambient light в сцене.
 */
export const AMBIENT_LIGHT_INTENSITY = 0.55

/**
 * Интенсивность directional light в сцене.
 */
export const DIRECTIONAL_LIGHT_INTENSITY = 0.9

/**
 * Позиция directional light в сцене.
 */
export const DIRECTIONAL_LIGHT_POSITION: readonly [number, number, number] = [18, 30, 12]

/**
 * Размер grid-плоскости.
 */
export const GRID_HELPER_SIZE = 100

/**
 * Количество делений grid-плоскости.
 */
export const GRID_HELPER_DIVISIONS = 80

/**
 * Вертикальное смещение пола района (Y).
 */
export const DISTRICT_FLOOR_Y = -0.03

/**
 * Высота пола района.
 */
export const DISTRICT_FLOOR_HEIGHT = 0.06

/**
 * Минимальный размер шрифта label района.
 */
export const DISTRICT_LABEL_FONT_SIZE_MIN = 0.38

/**
 * Максимальный размер шрифта label района.
 */
export const DISTRICT_LABEL_FONT_SIZE_MAX = 0.95

/**
 * Делитель ширины района для вычисления размера шрифта label.
 */
export const DISTRICT_LABEL_FONT_SIZE_DIVISOR = 6

/**
 * Вертикальное смещение label района (Y).
 */
export const DISTRICT_LABEL_Y = 0.04

/**
 * Фактор фазы между district health aura анимациями.
 */
export const HEALTH_AURA_PHASE_FACTOR = 0.44

/**
 * Dash scale линии навигационного trail.
 */
export const NAVIGATION_TRAIL_DASH_SCALE = 2

/**
 * Размер dash в линии навигационного trail.
 */
export const NAVIGATION_TRAIL_DASH_SIZE = 0.3

/**
 * Размер gap в линии навигационного trail.
 */
export const NAVIGATION_TRAIL_GAP_SIZE = 0.18

/**
 * Ширина линии навигационного trail.
 */
export const NAVIGATION_TRAIL_LINE_WIDTH = 1.2

/**
 * Прозрачность линии навигационного trail.
 */
export const NAVIGATION_TRAIL_OPACITY = 0.8

/**
 * Радиус breadcrumb-сферы навигационного trail.
 */
export const BREADCRUMB_SPHERE_RADIUS = 0.16

/**
 * Количество width-сегментов breadcrumb-сферы.
 */
export const BREADCRUMB_SPHERE_SEGMENTS = 10

/**
 * Интенсивность emissive breadcrumb-сферы.
 */
export const BREADCRUMB_EMISSIVE_INTENSITY = 0.9

/**
 * Фактор фазы между causal arc анимациями.
 */
export const CAUSAL_ARC_PHASE_FACTOR = 0.31

/**
 * Фактор фазы между building impact анимациями.
 */
export const BUILDING_PHASE_FACTOR = 0.45

/**
 * Масштаб выделенного здания (множитель width/depth).
 */
export const SELECTED_BUILDING_SCALE = 1.08

/**
 * Минимальная emissive intensity выделенного здания.
 */
export const SELECTED_BUILDING_MIN_EMISSIVE_INTENSITY = 0.55

/**
 * Metalness материала impact-здания.
 */
export const IMPACT_BUILDING_METALNESS = 0.1

/**
 * Roughness материала impact-здания.
 */
export const IMPACT_BUILDING_ROUGHNESS = 0.6

/**
 * Минимальная высота фокуса камеры при focus-on-building пресете.
 */
export const FOCUS_PRESET_MIN_FOCUS_HEIGHT = 1.5

/**
 * Горизонтальное смещение камеры при focus-on-building пресете.
 */
export const FOCUS_PRESET_CAMERA_OFFSET = 8

/**
 * Минимальная высота позиции камеры при focus-on-building пресете.
 */
export const FOCUS_PRESET_MIN_CAMERA_HEIGHT = 7

/**
 * Дополнительный вертикальный отступ камеры над зданием при focus-on-building.
 */
export const FOCUS_PRESET_CAMERA_HEIGHT_PADDING = 4
