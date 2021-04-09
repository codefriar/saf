const { App, LogLevel, ExpressReceiver } = require("@slack/bolt");
const jsforce = require("jsforce");
const { getToken } = require("sf-jwt-token");
const conn = new jsforce.Connection();
const express = require("express");
const bodyParser = require("body-parser");

fetchToken().then((jwttokenresponse) => {
    console.log(jwttokenresponse);
    conn.initialize({
        instanceUrl: jwttokenresponse.instance_url,
        accessToken: jwttokenresponse.access_token,
    });
});

async function fetchToken() {
    const jwttokenresponse = await getToken({
        iss: process.env.SALESFORCE_CLIENT_ID,
        sub: process.env.SALESFORCE_USERNAME,
        aud: process.env.SALESFORCE_INSTANCE_URL,
        privateKey: process.env.SALESFORCE_PRIVATE_KEY,
    });
    return jwttokenresponse;
}

// This is hack at this point. This needs to be stored in Database
let oAuthResponseFromSlackInstall = {};

// Create a Reciever for Installation and OAuth with Slack and Salesforce
const receiver = new ExpressReceiver({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    stateSecret: process.env.STATE_SECRET,
    scopes: [
        "channels:read",
        "groups:read",
        "channels:manage",
        "chat:write",
        "incoming-webhook",
        "commands",
    ],
    endpoints: {
        events: "/slack/events",
        commands: "/slack/commands", // explicitly enable commands
    },
    installerOptions: {
        authVersion: "v2", // default  is 'v2', 'v1' is used for classic slack apps
        installPath: "/slack/install",
        callbackOptions: {
            success: async (installation, installOptions, req, res) => {
                try {
                    oAuthResponseFromSlackInstall = installation;
                    console.log(oAuthResponseFromSlackInstall);
                    res.redirect("/slack/appinstall/success");
                } catch (error) {
                    throw error;
                }
            },
            failure: (error, installOptions, req, res) => {
                // Do custom failure logic here
                res.send("failure");
            },
        },
    },
});
receiver.router.use(express.json());
// Instantiate Slack App with Custom Reciever
const app = new App({
    logLevel: LogLevel.DEBUG,
    receiver,
});

app.event("reaction_added", async ({ event, say }) => {
    if (event.reaction === "calendar") {
    }
});

app.command("/whoami", async ({ command, ack, say }) => {
    // Acknowledge command request
    console.log("Running command");
    await ack();
    const result = await conn.query(`Select Id FROM Organization`);
    console.log(result);
    try {
        await say({
            blocks: [
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: "*Organization Id*",
                        },
                        {
                            type: "plain_text",
                            text: `${result.records[0].Id}`,
                        },
                    ],
                },
            ],
        });
    } catch (e) {
        console.log(e);
    }
});

// Custom Route for Install success Message
receiver.router.get("/slack/appinstall/success", async (req, res) => {
    await app.client.chat.postMessage({
        channel: oAuthResponseFromSlackInstall.incomingWebhook.channelId,
        text: "The app is Succcessfully Installed 🎊",
        token: oAuthResponseFromSlackInstall.bot.token,
    });
    res.send("The app is Successfully installed!!! You can close this window");
});

receiver.router.post("/slack/policytrigger", async (req, res, say) => {
    const payload = req.body;
    console.log("payload", payload);
    await buildPolicyBlock(payload).then((block) => {
        console.log("block", block);
        app.client.chat.postMessage({
            channel: oAuthResponseFromSlackInstall.incomingWebhook.channelId,
            blocks: block,
            token: oAuthResponseFromSlackInstall.bot.token,
        });
    });
    res.status(200).send("");
});

async function buildPolicyBlock(payload) {
    const actionArray = payload.actions.split(",");
    console.log(actionArray);
    const userDetails = await conn.query(
        `Select Id, Name, Email, Manager.Name, Manager.Email FROM User WHERE Id = '${payload.userId}'`
    );

    let block = [
        {
            type: "header",
            text: {
                type: "plain_text",
                text: `⚠️ ${payload.policy} Policy has been Triggered ⚠️`,
                emoji: true,
            },
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `${userDetails.records[0].Name} has ${payload.message} and may be up to something devious! Please take action accordingly.`,
            },
        },
        {
            type: "divider",
        },
    ];

    let blockActions = {
        type: "actions",
        elements: [],
    };

    actionArray.forEach((action) => {
        switch (action) {
            case "deactivate":
                blockActions.elements.push({
                    type: "button",
                    text: {
                        type: "plain_text",
                        emoji: true,
                        text: "Deactivate User",
                    },
                    style: "danger",
                    value: "click_me_123",
                });
                break;
            case "email":
                blockActions.elements.push({
                    type: "button",
                    text: {
                        type: "plain_text",
                        emoji: true,
                        text: "Email Manager",
                    },
                    style: "danger",
                    value: "click_me_123",
                });
                break;
            case "view":
                blockActions.elements.push({
                    type: "button",
                    text: {
                        type: "plain_text",
                        emoji: true,
                        text: "View History",
                    },
                    style: "danger",
                    value: "click_me_123",
                });
                break;

            default:
                break;
        }
    });
    console.log(blockActions);
    block.push(blockActions);
    return block;
}

app.action("deactivate_user", async ({ ack }) => {
    await ack();
    console.log("deactivate");
});

async function deactivateUser(userId) {
    conn.sobject("User").update(
        {
            Id: userId,
            Active: false,
        },
        function (err, ret) {
            if (err || !ret.success) {
                return console.error(err, ret);
            }
            console.log("Updated Successfully : " + ret.id);
            // ...
        }
    );
}

(async () => {
    // Start your app
    await app.start(process.env.PORT || 3000);
    console.log("⚡️ Bolt app is running!");
})();
