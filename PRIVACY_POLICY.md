# Privacy Policy

This document outlines what data the bot collects and how you can request your data be deleted.

## What We Store

### Short-Term

The names of any servers the bot is in, as well as the full or partial content of some messages, are
kept in logs for debugging purposes. These logs are kept for no longer than one week, so there is no
way to request their immediate deletion. The bot does not otherwise use server names.

The names and numeric "snowflake" IDs of channels may be stored as well. In addition to the log
files, they may also be stored for no more than a few minutes while certain commands (such as 
`x/config reset` and `x/purge`) are awaiting confirmation.

### Long-Term

The bot stores several numeric IDs, so that it may operate normally. To be specific:

- If a user sends a message and the bot replies to that message, the bot may store the snowflake of
  the message's author, the message itself, or both.
- The bot stores the snowflake of any server which has a custom configuration.

## How to Request Deletion

### Server IDs

The ID of a server is only kept if that server has a custom configuration. As such, you may delete
a server ID from the records by resetting its configuration, using the command `x/config reset`.
A server's ID is also automatically deleted when it is kicked from the server or the server is
deleted.

### User and Message IDs

When the bot has permission to do so, it will react to some of its own messages with the wastebasket
emoji (🗑️). To delete the ID of the single message the bot responded to, the author of the original
message may add a wastebasket reaction of their own to the message(s) the bot sent in response. The
bot does not store the message ID of every message it responds to, however; if the bot does not
react to its own message with the wastebasket emoji even though it has permission to do so, the
message ID was never stored in the first place.

If the bot does not add the wastebasket reaction to its own message (e.g. due to insufficient
permissions) but it did store the ID of the message it responded to, the author of the original
message may still react with the wastebasket emoji to delete the record.

NB: Deleting a single message ID using the wastebasket emoji will also cause the bot to delete its
response to that message.

To delete a user ID as well as the message IDs of all messages that user has sent, one may use the
`x/purge` command. After this command has run, the bot will no longer edit or delete its own
messages that were in response to the user that ran the command. This effect is only retroactive,
and not proactive: it does not prevent more records from being created for the same user.
