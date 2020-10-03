interface RequiredEnvVars {
    CACHE_SIZE: number;
    COMMAND_PREFIX: string;
    DISCORD_BOT_TOKEN: string;
};

export const verifyEnvVars = (input: any): void => {
    const schema: Record<keyof RequiredEnvVars, string> = {
        CACHE_SIZE: "number",
        COMMAND_PREFIX: "string",
        DISCORD_BOT_TOKEN: "string",
    };

    const missingProperties = Object.keys(schema)
        .filter(key => input[key] === undefined)
        .map(key => key as keyof RequiredEnvVars)
        .map(key => new Error(`Missing required environment variable ${key}: ${schema[key]}`));

    if (missingProperties.length > 0) {
        console.error("Required environment variables are missing.");
        throw missingProperties;
    }
};
