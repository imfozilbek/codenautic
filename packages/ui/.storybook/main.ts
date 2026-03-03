import path from "path"

import type {StorybookConfig} from "@storybook/react-vite"

const config: StorybookConfig = {
    stories: ["../src/**/*.stories.@(js|jsx|ts|tsx)", "../src/**/*.story.@(js|jsx|ts|tsx)"],
    addons: ["@storybook/addon-essentials", "@storybook/addon-a11y", "@storybook/addon-themes"],
    framework: {
        name: "@storybook/react-vite",
        options: {},
    },
    docs: {
        autodocs: "tag",
    },
    staticDirs: ["../public"],
    async viteFinal(config) {
        return {
            ...config,
            resolve: {
                ...(config.resolve ?? {}),
                alias: {
                    ...(config.resolve?.alias ?? {}),
                    "@": path.resolve(__dirname, "../src"),
                },
            },
        }
    },
}

export default config
