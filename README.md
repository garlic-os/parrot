# Bipolar
_Imitate everyone individually._

A totally-original Markov-chain-based Discord bot that keeps a separate Markov chain for any number of users.

## Environment variables
| Name | Description | Example |
| --- | --- | --- |
| `DISCORD_BOT_TOKEN` | The token you get when you make a Discord bot. discord.js uses this to log in. | `GEJG8tOVnw2Hyh4Olu.sBxf2FyEaQJ.cMq.lfsLzrSIzMFNf9d3qTqxRrnq` |
| `S3_BUCKET_NAME` | The name of the S3 bucket Bipolar will look for files in. | `my-s3-bucket` |
| `AWS_ACCESS_KEY_ID` | The token you get when you make an AWS user. This user needs R/W access to the S3 bucket you will use. | `R4AE78IHSJNVUFFRUPQN` |
| `AWS_SECRET_ACCESS_KEY` | Like part 2 for above?? idk completely how this works tbh but you need them both. | `S35s9WTHRgsoz5Ehh7cacGjjToLie7jcdS4vwpFs` |
| `PREFIX` | Command prefix. | `\|` (e.g. `\|imitate me`) |
| `NAME` | The name Bipolar will refer itself to in the logs and in certain chat functions. | `Bipolar` |
| `CORPUS_DIR` | The S3 directory that Bipolar will store corpi in. | `bipolar/corpus` |
| `EMBED_COLORS` | A JSON-encoded dictionary of colors for `normal` and `error`. | `{"normal":"#A755B5", "error":"#FF3636"}` |
| `SPEAKING_CHANNELS` | A JSON-encoded dictionary of the channels Bipolar is allowed to speak in. | `{"random server name or whatever you want - #general":"<CHANNEL ID HERE>"}` |
| `LEARNING_CHANNELS` | A JSON-encoded dictionary of the channels Bipolar is allowed to learn from. | `{"random server name or whatever you want - #general":"<CHANNEL ID HERE>"}` |
| `NICKNAMES` | A JSON-encoded dictionary of any server-specific nicknames Bipolar has. | `"a server": ["<SERVER ID HERE>", "Bipolarn't"]` |
| `ADMINS` | A JSON-encoded dictionary of the users that are allowed to use Bipolar's admin commands. | `{"You, probably":"<USER ID HERE>"}` |
| `BANNED` | A JSON-encoded dictionary of the users that aren't allowed to use Bipolar's commands. Bipolar will also stop learning from this user. | `{"Naughty boy":"<USER ID HERE>"}` |
| `AUTOSAVE_INTERVAL_MS` | Number of milliseconds Bipolar will wait before saving all unsaved cache. | `600000` (10 minutes) |


## TODO
- Keep data per server separate
- Environment variable default values
- "Forget" command to delete the data on that user (legally required by the GDPR? <sup>/s</sup>)
- Message rate limiting to mitigate spam
- Moar logging
- Fix scraping; I broke it somehow
- Make Bipolar stop DM'ing me "Specified key is not defined" every five hours
