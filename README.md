# Bipolar
_Imitate everyone individually._

A totally-original Markov-chain-based Discord bot that keeps a separate Markov chain for any number of users.

## Known issues
- Uses all the same data and users for every server

## Environment variables
| Name | Description |
| --- | --- |
| `DISCORD_BOT_TOKEN` | The token you get when you make a Discord bot. discord.js uses this to log in. |
| `S3_BUCKET_NAME` | The name of the S3 bucket Screambot will look for files in. |
| `AWS_ACCESS_KEY_ID` | The credentials for a user that can access the specified S3 bucket. |
| `AWS_SECRET_ACCESS_KEY` | Like part 2 for above?? idk completely how this works tbh but you need them both. |
| `CONFIG_PATH` | The name of the file on the designated S3 bucket. |
| `LOCAL` | <ul><li>When true or 1, Bipolar will look for `CONFIG_PATH` on the machine it's running on. `S3_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` won't be used and don't need to be specified.</li><li>When false or 0, Bipolar will look for `CONFIG_PATH` inside of the S3 bucket you specify in `S3_BUCKET_NAME`.</li></ul> |

## TODO
- Let different data and users and stuff be used per each server that Bipolar is in
