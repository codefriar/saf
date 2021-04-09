const { App, LogLevel } = require("@slack/bolt");

const CHATTER_PREFIX = "[Cross-posted from Chatter";
class SlackService {
    constructor(salesforce, database) {
        this.salesforce = salesforce;
        this.database = database;
    }

    /**
     * Used to create Slack Connection using a Receiver
     */
    async connect(receiver) {
        const app = new App({
            logLevel: LogLevel.DEBUG,
            receiver,
        });
        return app;
    }

    /**
     * Handles the /addGroupMappingCommand slash command
    
    async addGroupMappingCommand(command, ack, say) {
        await ack();
        try {
            const params = command.text.split(" ");
            if (params.length != 2) {
                await say(
                    "Need to specify 2 parameters: chatterGroupId and slackChannelId."
                );
                return;
            }
            await this.database.saveGroupChannelMapping(params[0], params[1]);
            await say("Mapping added to database.");
        } catch (databaseError) {
            await say("Error adding mapping.");
        }
    }
    */
}

module.exports = SlackService;
