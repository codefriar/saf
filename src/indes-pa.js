const Configuration = require("./utils/configuration.js");
const { ExpressReceiver } = require("@slack/bolt");
const express = require("express");
const SlackService = require("./services/slack.js");
const SalesforceService = require("./services/salesforce.js");
const DatabaseService = require("./services/database.js");

// Load and check config
require("dotenv").config();
try {
    Configuration.checkConfig();
} catch (error) {
    console.error(`Cannot start app: ${error}`);
    process.exit(-1);
}

// Create DB connection
const database = new DatabaseService();

// Create a receiver to route slack / salesforce requests
const slackInstallSuccessCallback = async (
    installation,
    installOptions,
    req,
    res
) => {
    await database.saveToken(installation.bot);
    console.log("Successfully installed Slack app");
    res.send("successful!");
};

const installationStore = {
    storeInstallation: async (installation) => {
        if (installation.isEnterpriseInstall) {
            // support for org wide app installation
            return await database.saveInstallation(
                installation.enterprise.id,
                installation
            );
        } else {
            // single team app installation
            return await database.saveInstallation(
                installation.team.id,
                installation
            );
        }
    },
    fetchInstallation: async (installQuery) => {
        if (
            installQuery.isEnterpriseInstall &&
            installQuery.enterpriseId !== undefined
        ) {
            // org wide app installation lookup
            return await database.getInstallation(installQuery.enterpriseId);
        }
        if (installQuery.teamId !== undefined) {
            // single team app installation lookup
            return await database.getInstallation(installQuery.teamId);
        }
    },
};

const slackConfig = Configuration.getSlackConfig(
    slackInstallSuccessCallback,
    installationStore
);

const receiver = new ExpressReceiver(slackConfig);
receiver.router.use(express.json());

(async () => {
    try {
        console.log("try 1");
        // Salesforce connection
        const salesforce = new SalesforceService(database);
        await salesforce.connect();
        console.log("try 2");

        // Slack connection
        const slack = new SlackService(salesforce, database);
        const app = await slack.connect(receiver);
        console.log("try 3");

        // Slack routes
        app.command("/saf", ({ command, ack, say }) => {
            salesforce.executeAction(command, ack, say);
        });

        app.command("/connectsf", async ({ command, ack, say }) => {
            // Acknowledge command request
            await ack();
            const salesforce_url = `https://login.salesforce.com/services/oauth2/authorize?client_id=${process.env.SALESFORCE_CLIENT_ID}&redirect_uri=${process.env.SALESFORCE_REDIRECT_URL}&response_type=code`;
            await say(renderAuthorizeButton(salesforce_url));
        });

        app.action("authorize_sf", async ({ command, ack, say }) => {
            await ack();
        });
        console.log("try 4");

        // Start the app
        const PORT = process.env.PORT || 3000;
        await app.start(PORT);
        console.log(`⚡️ Bolt app is running on port ${PORT}!`);
    } catch (error) {
        console.log("Try/Catch failed.");
        console.error(error);
    }
})();
