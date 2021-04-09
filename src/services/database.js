const Configuration = require("../utils/configuration.js");
const { Pool } = require("pg");

class DatabaseService {
    constructor() {
        this.pool = new Pool(Configuration.getDatabaseConfig());
    }

    async query(query, parameters) {
        const client = await this.pool.connect();
        try {
            return await client.query(query, parameters);
        } catch (error) {
            console.error("Failing SQL query:", query, parameters);
            throw error;
        } finally {
            client.release();
        }
    }

    async saveInstallation(id, installation) {
        const installationJson = JSON.stringify(installation);
        await this.query(
            `INSERT INTO installations (id, installation) VALUES ($1, $2)
            ON CONFLICT (id) DO UPDATE SET installation = $2`,
            [id, installationJson]
        );
    }

    async getInstallation(id) {
        const result = await this.query(
            `SELECT installation FROM installations WHERE id=$1 LIMIT 1`,
            [id]
        );
        return result.rowCount === 0
            ? null
            : JSON.parse(result.rows[0].installation);
    }

    async saveToken(tokenInfo) {
        const scopes = JSON.stringify(tokenInfo.scopes);
        await this.query(
            `INSERT INTO tokens (scope, token, userId, botId) VALUES ($1, $2, $3, $4)`,
            [scopes, tokenInfo.token, tokenInfo.userId, tokenInfo.id]
        );
    }

    async getToken() {
        const result = await this.query(`SELECT token FROM tokens LIMIT 1`);
        return result.rowCount === 0 ? null : result.rows[0].token;
    }

    async saveGroupChannelMapping(chatterGroupId, slackChannelId) {
        await this.query(
            `INSERT INTO group_channel_mappings (chatter_group_id, slack_channel_id) VALUES ($1, $2)`,
            [chatterGroupId, slackChannelId]
        );
    }

    async getChatterGroupId(slackChannelId) {
        const result = await this.query(
            `SELECT chatter_group_id FROM group_channel_mappings WHERE slack_channel_id = $1`,
            [slackChannelId]
        );
        return result.rowCount === 0 ? null : result.rows[0].chatter_group_id;
    }

    async getSlackChannelId(chatterGroupId) {
        const result = await this.query(
            `SELECT slack_channel_id FROM group_channel_mappings WHERE chatter_group_id = $1`,
            [chatterGroupId]
        );
        return result.rowCount === 0 ? null : result.rows[0].slack_channel_id;
    }

    async saveMessageMapping(
        sfGroupId,
        sfMessageId,
        sfParentId,
        slackChannelId,
        slackMessageId,
        slackParentId
    ) {
        await this.query(
            `INSERT INTO message_mappings (salesforce_group_id, salesforce_message_id, salesforce_parent_id, 
            slack_channel_id, slack_message_id, slack_parent_id)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                sfGroupId,
                sfMessageId,
                sfParentId,
                slackChannelId,
                slackMessageId,
                slackParentId,
            ]
        );
    }

    async getMappingForSalesforceMessage(sfMessageId) {
        const result = await this.query(
            `SELECT salesforce_group_id, salesforce_message_id, salesforce_parent_id, 
            slack_channel_id, slack_message_id, slack_parent_id
            FROM message_mappings WHERE salesforce_message_id = $1`,
            [sfMessageId]
        );
        return result.rowCount === 0 ? null : result.rows[0];
    }

    async getMappingForSlackMessage(slackMessageId) {
        const result = await this.query(
            `SELECT salesforce_group_id, salesforce_message_id, salesforce_parent_id, 
            slack_channel_id, slack_message_id, slack_parent_id
            FROM message_mappings WHERE slack_message_id = $1`,
            [slackMessageId]
        );
        return result.rowCount === 0 ? null : result.rows[0];
    }
}

module.exports = DatabaseService;
