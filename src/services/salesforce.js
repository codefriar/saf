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
        });
    }

    async executeAction(command, ack, say) {
        await ack();
        return new Promise((resolve, reject) => {
            if (this.connection.userInfo) {
                const options = {
                    headers: {
                        Authorization: "Bearer " + this.connection.accessToken,
                    },
                };
                console.log("Options: ", options);
                console.log("connection ", this.connection);
                const url =
                    process.env.SALESFORCE_INSTANCE_URL +
                    "/services/apexrest/v1/SAF/";
                this.connection.requestPost(url, command, options).then(
                    function (result) {
                        console.log(result);
                    },
                    function (err) {
                        console.log(err);
                    }
                );
            } else {
                const salesforce_url = `https://login.salesforce.com/services/oauth2/authorize?client_id=${process.env.SALESFORCE_CLIENT_ID}&redirect_uri=${process.env.SALESFORCE_REDIRECT_URL}&response_type=code`;
                await say(renderAuthorizeButton(salesforce_url));
            }
        });
    }

    renderAuthorizeButton(salesforce_url) {
        return {
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "To login into Salesforce click the button below",
                    },
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "Authorize Salesforce",
                            },
                            style: "primary",
                            value: "authsf",
                            url: salesforce_url,
                            action_id: "authorize_sf",
                        },
                    ],
                },
            ],
        };
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
