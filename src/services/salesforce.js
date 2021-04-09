const Configuration = require("../utils/configuration.js");
const jsforce = require("jsforce");
const jwt = require("salesforce-jwt-bearer-token-flow");
const { WebClient } = require("@slack/web-api");

class SalesforceService {
    constructor(database) {
        this.connection = null;
        this.database = database;
    }

    /**
     * Used to create Salesforce Connection following JWT flow (server to server)
     */
    async connect() {
        return new Promise((resolve, reject) => {
            const salesforceConfig = Configuration.getSalesforceConfig();
            const oauth2 = new jsforce.OAuth2({
                // you can change loginUrl to connect to sandbox or scratchorg env.
                // loginUrl : 'https://test.salesforce.com',
                clientId: process.env.SALESFORCE_CLIENT_ID,
                clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
                redirectUri: process.env.SALESFORCE_REDIRECT_URL,
            });
            this.connection = new jsforce.Connection({ oauth2: oauth2 });
            resolve();
            // jwt.getToken(salesforceConfig, (jwtError, response) => {
            //     if (jwtError) {
            //         reject(jwtError);
            //     } else {
            //         try {
            //             const connection = new jsforce.Connection();
            //             connection.initialize({
            //                 instanceUrl: response.instance_url,
            //                 accessToken: response.access_token,
            //             });
            //             this.connection = connection;
            //             console.log("Successfully connected to Salesforce org");
            //             resolve();
            //         } catch (jsForceError) {
            //             reject(jwtError);
            //         }
            //     }
            // });
        });
    }

    /**
     * Called by Salesforce when Chatter messages are posted
     */
    async handleMessages(req, res) {
        if (!Array.isArray(req.body)) {
            res.statusMessage = "Invalid input, expecting message array";
            res.sendStatus(400);
            return;
        }
        // Load bot token from DB
        const botToken = await this.database.getToken();
        if (!botToken) {
            throw new Error("Could not load Slack bot token");
        }

        // Couldn't reuse Slack app built-in web client outside of event listener so creating a new one
        const slackClient = new WebClient(botToken);
        req.body.forEach(async (message) => {
            try {
                // Get Slack channel id
                const slackChannelId = await this.database.getSlackChannelId(
                    message.groupId
                );
                if (slackChannelId === null) {
                    throw new Error(
                        `Unknown Chatter group ID: ${message.groupId}`
                    );
                }
                // Get parent message mapping if this is a comment
                let slackParentId = null;
                if (message.parentId) {
                    const parentMessageMapping = await this.database.getMappingForSalesforceMessage(
                        message.parentId
                    );
                    slackParentId = parentMessageMapping.slack_message_id;
                }

                // TODO: Convert HTML message to markdown

                // Post Slack message
                const slackMessage = {
                    channel: slackChannelId,
                    text: `[Cross-posted from Chatter] *${message.authorName}*\n${message.body}`,
                };
                if (slackParentId) {
                    slackMessage.thread_ts = slackParentId;
                }
                const postResult = await slackClient.chat.postMessage(
                    slackMessage
                );
                if (!postResult.ok) {
                    throw new Error(
                        `Failed to post Slack message: ${postResult.error}`
                    );
                }
                // Save mapping infos
                const slackMessageId = postResult.ts;
                await this.database.saveMessageMapping(
                    message.groupId,
                    message.id,
                    message.parentId,
                    slackChannelId,
                    slackMessageId,
                    slackParentId
                );
            } catch (slackPostError) {
                console.error(slackPostError);
            }
        });
        res.sendStatus(200);
    }

    async executeAction(command, ack, say) {
        await ack();
        return new Promise((resolve, reject) => {
            const salesforceConfig = Configuration.getSalesforceConfig();
            this.connection
                .requestPost(salesforceConfig.aud, command, options)
                .then(
                    function (result) {
                        console.log(result);
                    },
                    function (err) {
                        console.log(err);
                    }
                );
        });
    }

    async postFeedItem(message) {
        return new Promise((resolve, reject) =>
            this.connection.chatter.resource("/feed-elements").create(
                {
                    body: {
                        messageSegments: [
                            {
                                type: "Text",
                                text: message.text,
                            },
                        ],
                    },
                    feedElementType: "FeedItem",
                    subjectId: message.groupId,
                },
                (err, result) => (err ? reject(err) : resolve(result))
            )
        );
    }

    async postFeedComment(message) {
        return new Promise((resolve, reject) =>
            this.connection.chatter
                .resource(
                    `/feed-elements/${message.parentId}/capabilities/comments/items`
                )
                .create(
                    {
                        body: {
                            messageSegments: [
                                {
                                    type: "Text",
                                    text: message.text,
                                },
                            ],
                        },
                    },
                    (err, result) => (err ? reject(err) : resolve(result))
                )
        );
    }
}

module.exports = SalesforceService;
