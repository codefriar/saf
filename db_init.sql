DROP TABLE tokens;
CREATE TABLE tokens
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    scope character varying COLLATE pg_catalog."default" NOT NULL,
    token character varying COLLATE pg_catalog."default" NOT NULL,
    userId character varying(20) COLLATE pg_catalog."default" NOT NULL,
    botId character varying(20) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT tokens_pkey PRIMARY KEY (id)
);

DROP TABLE installations;
CREATE TABLE installations
(
    id character varying(20) COLLATE pg_catalog."default" NOT NULL,
    installation text COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT installation_pkey PRIMARY KEY (id)
);

DROP TABLE group_channel_mappings;
CREATE TABLE group_channel_mappings
(
    chatter_group_id character(18) COLLATE pg_catalog."default" NOT NULL,
    slack_channel_id character varying(20) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT group_channel_mapping_pkey PRIMARY KEY (chatter_group_id, slack_channel_id)
);

DROP TABLE message_mappings;
CREATE TABLE message_mappings
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    salesforce_group_id character(18) COLLATE pg_catalog."default" NOT NULL,
	salesforce_message_id character(18) COLLATE pg_catalog."default" NOT NULL,
	salesforce_parent_id character(18) COLLATE pg_catalog."default",
    slack_channel_id character varying(20) COLLATE pg_catalog."default" NOT NULL,
    slack_message_id character varying(20) COLLATE pg_catalog."default" NOT NULL,
    slack_parent_id character varying(20) COLLATE pg_catalog."default",
    CONSTRAINT message_mappings_pkey PRIMARY KEY (id)
);
