import eslint from "@eslint/js"
import tseslint from "typescript-eslint"

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ["eslint.config.mjs"],
                },
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        files: ["**/*.ts", "**/*.tsx"],
        rules: {
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/explicit-function-return-type": [
                "error",
                {
                    allowExpressions: true,
                    allowTypedFunctionExpressions: true,
                },
            ],
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/strict-boolean-expressions": "error",
            "@typescript-eslint/no-non-null-assertion": "error",
            "@typescript-eslint/no-empty-object-type": ["error", {allowInterfaces: "always"}],
            "@typescript-eslint/naming-convention": [
                "error",
                {
                    selector: "interface",
                    format: ["PascalCase"],
                    prefix: ["I"],
                    filter: {
                        /** Module augmentation: имена должны совпадать с third-party. */
                        regex: "^(Session|JWT)$",
                        match: false,
                    },
                },
            ],
            "prefer-const": "error",
            eqeqeq: ["error", "always"],
            curly: ["error", "all"],
            "no-console": "error",
            "max-params": ["error", {max: 5}],
            "max-lines-per-function": [
                "error",
                {max: 100, skipBlankLines: true, skipComments: true},
            ],
            complexity: ["error", {max: 10}],
            "max-depth": ["error", {max: 4}],
        },
    },
    {
        files: ["**/tests/**/*.ts", "**/tests/**/*.tsx"],
        rules: {
            "max-lines-per-function": "off",
        },
    },
    {
        files: ["**/*.mjs"],
        ...tseslint.configs.disableTypeChecked,
    },
    {
        ignores: ["**/dist/", "**/node_modules/", "**/coverage/"],
    },
)
