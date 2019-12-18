# Bipolar
_Imitate everyone individually._

A totally-original Markov-chain-based Discord bot that keeps a separate Markov chain for each user. Can imitate a theoretically unlimited number of users.

## Environment variables
| Name | Description | Example |
| --- | --- | --- |
| `DISCORD_BOT_TOKEN` | The token you get when you make a Discord bot. discord.js uses this to log in. | `GEJG8tOVnw2Hyh4Olu.sBxf2FyEaQJ.cMq.lfsLzrSIzMFNf9d3qTqxRrnq` |
| `S3_BUCKET_NAME` | The name of the S3 bucket Bipolar will look for files in. | `my-s3-bucket` |
| `AWS_ACCESS_KEY_ID` | The token you get when you make an AWS user. This user needs R/W access to the S3 bucket you will use. | `R4AE78IHSJNVUFFRUPQN` |
| `AWS_SECRET_ACCESS_KEY` | Like part 2 for above?? idk completely how this works tbh but you need them both. | `S35s9WTHRgsoz5Ehh7cacGjjToLie7jcdS4vwpFs` |
| `PREFIX` | Command prefix. | `\|` (e.g. `\|imitate me`) |
| `CORPUS_DIR` | The S3 directory that Bipolar will store corpi in. | `bipolar/corpus` |
| `EMBED_COLORS` | A JSON-encoded dictionary of colors for `normal` and `error`. | `{"normal":"#A755B5", "error":"#FF3636"}` |
| `SPEAKING_CHANNELS` | A JSON-encoded dictionary of the channels Bipolar is allowed to speak in. | `{"random server name or whatever you want - #general":"<CHANNEL ID HERE>"}` |
| `LEARNING_CHANNELS` | A JSON-encoded dictionary of the channels Bipolar is allowed to learn from. | `{"random server name or whatever you want - #general":"<CHANNEL ID HERE>"}` |
| `NICKNAMES` | A JSON-encoded dictionary of any server-specific nicknames Bipolar has. | `"a server": ["<SERVER ID HERE>", "Bipolarn't"]` |
| `ADMINS` | A JSON-encoded dictionary of the users that are allowed to use Bipolar's admin commands. | `{"You, probably":"<USER ID HERE>"}` |
| `BANNED` | A JSON-encoded dictionary of the users that aren't allowed to use Bipolar's commands. Bipolar will also stop learning from this user. | `{"Naughty boy":"<USER ID HERE>"}` |
| `AUTOSAVE_INTERVAL_MS` | Number of milliseconds Bipolar will wait before saving all unsaved cache. | `600000` (10 minutes) |
| `BAD_WORDS_URL` | URL to a newline-delimited list of words that Bipolar will filter before saving messages to a corpus | `https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/raw/master/en` |
| `DISABLE_LOGGING` | Silence in the console. Keep Bipolar from outputting any logs. | (`true`/`false`) |


## TODO
- Keep data per server separate
- "Forget" command to delete the data on that user (legally required by the GDPR? <sup>/s</sup>)
- Message rate limiting to mitigate spam
- ~~Make Bipolar stop DM'ing me "Specified key is not defined" every five hours~~ Fixed in the latest update! (Probably!)
