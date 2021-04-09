const REQUIRED_ENV_VARIABLES = [
    "DATABASE_URL",
    "SALESFORCE_INSTANCE_URL",
    "SALESFORCE_USERNAME",
    "SALESFORCE_CLIENT_ID",
    "SALESFORCE_PRIVATE_KEY",
    "SLACK_SIGNING_SECRET",
    "SLACK_CLIENT_ID",
    "SLACK_CLIENT_SECRET",
    "STATE_SECRET",
];

module.exports = class Configuration {
    static checkConfig() {
        REQUIRED_ENV_VARIABLES.forEach((varName) => {
            if (process.env[varName] === undefined) {
                throw new Error(`Missing mandatory env variable: ${varName}`);
            }
        });
    }

    static getDatabaseConfig() {
        // Get DB configuration
        const dbConfig = {
            connectionString: process.env.DATABASE_URL,
        };
        // Optionnaly require SSL for DB connection
        if (
            process.env.DATABASE_REQUIRES_SSL === undefined ||
            process.env.DATABASE_REQUIRES_SSL.toLocaleLowerCase() === "true"
        ) {
            dbConfig.ssl = {
                rejectUnauthorized: false, // Allow self-signed SSL cert from Heroku
            };
        }
        return dbConfig;
    }

    static getSlackConfig(installSuccessCallback, installationStore) {
        return {
            signingSecret: process.env.SLACK_SIGNING_SECRET,
            clientId: process.env.SLACK_CLIENT_ID,
            clientSecret: process.env.SLACK_CLIENT_SECRET,
            stateSecret: process.env.STATE_SECRET,
            scopes: [
                "channels:history",
                "channels:read",
                "chat:write",
                "chat:write.public",
                "commands",
            ],
            endpoints: {
                events: "/slack/events",
                commands: "/slack/commands",
            },
            installerOptions: {
                authVersion: "v2",
                installPath: "/slack/install",
                callbackOptions: {
                    success: installSuccessCallback,
                },
            },
            logLevel: "debug",
            installationStore,
        };
    }

    static getSalesforceConfig() {
        return {
            iss: process.env.SALESFORCE_CLIENT_ID,
            sub: process.env.SALESFORCE_USERNAME,
            aud: process.env.SALESFORCE_INSTANCE_URL,
            privateKey: process.env.SALESFORCE_PRIVATE_KEY,
        };
    }
};
