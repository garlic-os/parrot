// Permissions code: 67584
// Send messages, read message history

const config = require("./parrot/config");


// Log errors when in production; crash when not in production
if (config.NODE_ENV === "production") {
	process.on("unhandledRejection", logError);
} else {
	process.on("unhandledRejection", up => { throw up });
}

// Overwrite console methods with empty ones and don't require
//   console-stamp if logging is disabled
if (config.DISABLE_LOGS) {
	for (const method in console) {
		console[method] = () => {};
	}
} else {
	require("console-stamp")(console, {
		datePrefix: "",
		dateSuffix: "",
		pattern: " ",
	});
}


// Only allow console.debug() when DEBUG env var is set
if (!config.DEBUG) {
	console.debug = () => {};
}


/**
 * Do all these things before logging in
 * @type {Promise[]} array of Promises
 */
const init = [];

// Set BAD_WORDS if BAD_WORDS_URL is defined
if (config.BAD_WORDS_URL) {
	init.push(
		(async () => {
			const { data } = await require("axios").get(config.BAD_WORDS_URL);
			config.BAD_WORDS = data.split("\n");
		})()
	);
}


// The bigger this gets, the more ashamed I become of it
const log = {
	say:     message => console.log(`${location(message)} Said: ${message.embeds[0].description}`),
	imitate: {
		text: ([ message, name, sentence ]) => console.log(`${location(message)} Imitated ${name}, saying: ${sentence}`),
		hook: hookRes => console.log(`${location(hookRes)} Imitated ${hookRes.author.username.substring(9)} (ID: ${hookRes.author.id}), saying: ${hookRes.content}`)
	},
	forget:  ([message, user]) => console.log(`${location(message)} Forgot user ${user.tag} (ID: ${user.id}).`),
	consent: user => console.log(`Sent the "need consent" message to user ${user.tag} (ID: ${user.id}).`),
	error:   message => console.log(`${location(message)} Sent the error message: ${message.embeds[0].description}`),
	xok:     message => console.log(`${location(message)} Sent the XOK message.`),
	help:    message => console.log(`${location(message)} Sent the Help message.`),
	save:    ({ corpora, consenting })  => `Saved ${consenting ? "the user agreement record and " : ""} ${corpora} ${(corpora === 1) ? "corpus" : "corpora"}.`,
	pinged:  message => console.log(`${location(message)} Pinged by ${message.author.tag} (ID: ${message.author.id}).`),
	command: message => console.log(`${location(message)} Received a command from ${message.author.tag} (ID: ${message.author.id}): ${message.content}`),
	terms:   message => console.log(`${location(message)} Sent the Terms of Service.`),
	agree:   message => console.log(`${location(message)} Sent the agreement confirmation.`),
	disagree: message => console.log(`${location(message)} Sent the disagreement confirmation.`),
};


// Lots of consts
const Discord     = require("discord.js");
const corpusUtils = require("./parrot/corpus");
const embeds      = require("./parrot/embeds");
const help        = require("./parrot/help");
const regex       = require("./parrot/regex");

const hookSendQueue = [];
const hooks = parseHooksDict(config.HOOKS);

const client   = new Discord.Client({disableEveryone: true});
const learning = require("./parrot/learning")(client, corpusUtils);
const markov   = require("./parrot/markov")(corpusUtils);

const ExpirableSet = require("./parrot/expirable-set");
const confirmations = new ExpirableSet();


// (Hopefully) save before shutting down
process.on("SIGTERM", async () => {
	console.info("Saving changes...");
	const savedCount = await corpusUtils.save();
	console.info(log.save(savedCount));
});


// --- LISTENERS ---------------------------------------------

client.on("ready", () => {
	console.info(`Logged in as ${client.user.tag} (ID: ${client.user.id}).\n`);
	updateNicknames(config.NICKNAMES);

	// Limit the rate at which Webhook messages can be sent
	setInterval( () => {
		const pair = hookSendQueue.pop();
		if (!pair) {
			return;
		}

		const [ hook, sentence ] = pair;
		hook.send(sentence)
			.then(log.imitate.hook);
	}, 2000);

	// "Listening to everyone"
	client.user.setActivity(`everyone (${config.PREFIX}help)`, { type: "LISTENING" })
		.then( ({ game }) => console.info(`Activity set: ${status(game.type)} ${game.name}`));

	channelTable(config.SPEAKING_CHANNELS).then(table => {
		console.info("Speaking in:");
		console.table(table);
	})
	.catch(console.warn);

	channelTable(config.LEARNING_CHANNELS).then(table => {
		console.info("Learning in:");
		console.table(table);
	})
	.catch(console.warn);

	nicknameTable(config.NICKNAMES).then(table => {
		console.info("Nicknames:");
		console.table(table);
	})
	.catch(console.info);
});


client.on("message", async message => {
	const { author, channel, content } = message;

	if (content.length > 0 // Not empty
	   && !isBanned(author.id) // Not banned from using Parrot
	   && !message.webhookID // Not a Webhook
	   && author.id !== client.user.id) { // Not self

	   if (canSpeakIn(channel.id) // Channel is listed in SPEAKING_CHANNELS or is a DM channel
		  || channel.type === "dm") {

			// Ping
			if (message.isMentioned(client.user) // Mentioned
			&& !content.includes(" ")) { // Has no spaces (i.e. contains nothing but a ping))
				log.pinged(message);
				await imitate(author, channel);
			}

			// Command
			else if (content.startsWith(config.PREFIX) // Starts with the command prefix
			        && !author.bot) { // Not a bot
				handleCommand(message);
			}
		   
		   	// ayy lmao	
			else if (content.toLowerCase() === "ayy" && config.AYY_LMAO) {	
				channel.send("lmao");	
			}
		}

		if (learningIn(channel.id) // Channel is listed in LEARNING_CHANNELS (no learning from DMs)
		   && !content.startsWith(config.PREFIX)) { // Not a command
			learning.learnFrom(message);
		}
	}
});


/**
 * When Parrot is added to a server,
 *   DM the admins and log a message containing
 *   information about the server to help the
 *   admins set up Parrot there.
 */
client.on("guildCreate", guild => {
	const embed = new Discord.RichEmbed()
		.setAuthor("Added to a server.")
		.setTitle(guild.name)
		.setDescription(guild.id)
		.setThumbnail(guild.iconURL)
		.addField(`Owner: ${guild.owner.user.tag}`, `${guild.ownerID}\n\n${guild.memberCount} members`)
		.addBlankField();

	let logmsg = `-------------------------------
Added to a new server.
${guild.name} (ID: ${guild.id})
${guild.memberCount} members
Channels:`;

	/**
	 * Add an inline field to the embed and a
	 *   line to the log message
	 *   for every text channel in the guild.
	 */
	guild.channels.tap(channel => {
		if (channel.type === "text") {
			embed.addField(`#${channel.name}`, channel.id, true);
			logmsg += `\n#${channel.name} (ID: ${channel.id})`;
		}
	});

	logmsg += "\n-------------------------------";
	dmTheAdmins(embed);
	console.info(logmsg);
});


client.on("guildDelete", guild => {
	console.info(`---------------------------------
Removed from a server.
${guild.name} (ID: ${guild.id})
---------------------------------`);
});


// --- /LISTENERS --------------------------------------------

// --- LOGIN -------------------------------------------------


// When all initalization steps have finished
( async () => {
	try {
		await Promise.all(init);
	} catch (err) {
		console.error("One or more initialization steps have failed:", init);
		console.error(err.stack);
		throw "Startup failure";
	}
	console.info("Logging in...");
	client.login(process.env.DISCORD_BOT_TOKEN);

	corpusUtils.startAutosave();
})();


// --- /LOGIN ------------------------------------------------

// --- FUNCTIONS ---------------------------------------------


/**
 * Send a message imitating a user.
 * 
 * @param {DiscordUser} user - user to imitate
 * @param (Channel) channel - channel to send the message to
 * @param {Boolean} intimidateMode - when true, put message in **BOLD ALL CAPS**
 * @return {Promise}
 */
async function imitate(user, channel, intimidateMode) {
	try {
		if (channel.guild) {
			// Channel is a part of a guild and the user may have
			//   a nickname there, so use .fetchMember
			const member = await channel.guild.fetchMember(user.id);
			avatarURL = member.user.displayAvatarURL;
			name = member.displayName;
		} else {
			avatarURL = user.displayAvatarURL;
			name = user.username;
		}

		let sentence
		
		try {
			sentence = await markov(user.id);
		} catch (err) {
			if (err === "NOPERMISSION") {
				channel.send(embeds.consent(user))
					.then( () => log.consent(user));
				return;
			} else {
				throw err;
			}
		}
		
		sentence = await disablePings(sentence);

		let namePrefix = "(Parrot) ";

		if (intimidateMode) {
			sentence = "**" + discordCaps(sentence) + "**";
			name = name.toUpperCase();
			namePrefix = namePrefix.toUpperCase();
		}

		const hook = hooks[channel.id];
		if (hook) {
			// Only change appearance if the current user to imitate
			//   is different from the last user Parrot imitated
			if (hook.name !== name) {
				name = namePrefix + name;
				await hook.edit({
					name: name,
					avatar: avatarURL,
				});
			}

			hookSendQueue.push([hook, sentence]);
			return;
		} else {
			avatarURL = avatarURL.replace("?size=2048", "?size=64");
			channel.send(`${name}​ be like:\n${sentence}\n${avatarURL}`)
				.then(message => log.imitate.text([message, name, sentence]));
		}

	} catch (err) {
		const msg = `Error while trying to imitate ${user.tag}: ${err}`;
		logError(msg);
		if (err.stack) {
			console.error(err.stack);
		}
		channel.send(embeds.error(msg));
	}
}


/**
 * Turn everything caps, except emojis.
 * Contributed by Kaylynn. Thank you, Kaylynn!
 * 
 * Leaves URLs and emojis unaffected so that they
 *   will still work normally.
 * 
 * @param {string} sentence - sentence to mostly capitalize
 * @return {string} mostly capitalized string
 */
function discordCaps(sentence) {
	const pattern = regex.doNotCapitalize;

    sentence = sentence.replace(/\*/g, "").split(" ");
    const output = [];
	for (const word of sentence) {
		if (pattern.test(word)) {
			output.push(word);
		} else {
			output.push(word.toUpperCase());
		}
	}

    return output.join(" ");
}


/**
 * Parse <@6813218746128746>-type mentions into @user#1234-type mentions.
 * This way, mentions won't actually ping any users.
 * 
 * @param {string} sentence - sentence to disable pings in
 * @return {Promise<string>} sentence that won't ping anyone
 */
async function disablePings(sentence) {
	return _replaceAsync(sentence, regex.mention, async mention => {
		const userID = mention.match(regex.id)[0];
		try {
			const user = await client.fetchUser(userID);
			return "@" + user.tag;
		} catch (err) {
			console.error(`_disablePings() error. mention: ${mention}. userID: ${userID}.`, err);
			return "";
		}
	});
}


/**
 * An asynchronous version of String.prototype.replace().
 * Created by Overcl9ck on StackOverflow:
 * https://stackoverflow.com/a/48032528
 * 
 * @param {string} str - string to run the function on
 * @param {RegExp} regex - match to this regular expression
 * @param {Function} asyncFn - function to be invoked to replace the matches to [regex]
 * @return {string} string with matches to [regex] processed by [asyncFn]
 */
async function _replaceAsync(str, regex, asyncFn) {
    const promises = [];
    str.replace(regex, (match, ...args) => {
        const promise = asyncFn(match, ...args);
        promises.push(promise);
    });
    const data = await Promise.all(promises);
    return str.replace(regex, () => data.shift());
}


/**
 * Parse a message whose content is presumed to be a command
 *   and perform the corresponding action.
 * 
 * @param {Message} messageObj - Discord message to be parsed
 * @return {Promise<string>} name of command performed
 */
async function handleCommand(message) {
	log.command(message);

	const args = message.content.slice(config.PREFIX.length).split(/ +/);
	const command = args.shift().toLowerCase();

	const caller = message.author;

	let intimidateMode = false;

	const commands = {
		/**
		 * Compile an embed out of the commands in help.js.
		 * If the user is not an admin, the embed will not contain
		 *   admin commands.
		 */
		help: () => {
			const embed = new Discord.RichEmbed()
				.setColor(config.EMBED_COLORS.normal)
				.setTitle("Help");
			
			// Individual command
			if (help.hasOwnProperty(args[0])) {
				if (help[args[0]].admin && !isAdmin(caller.id)) { // Command is admin only and user is not an admin
					caller.send(embeds.error("Don't ask questions you aren't prepared to handle the asnwers to."))
						.then(log.error);
					return;
				} else {
					embed.addField(args[0], help[args[0]].desc + "\n" + help[args[0]].syntax);
				}
			// All commands
			} else {
				for (const [command, properties] of Object.entries(help)) {
					if (!(properties.admin && !isAdmin(caller.id))) { // If the user is not an admin, do not show admin-only commands
						embed.addField(command, properties.desc + "\n" + properties.syntax);
					}
				}
			}
			caller.send(embed) // DM the user the help embed instead of putting it in chat since it's kinda big
				.then(log.help);

			if (message.channel.type !== "dm") {
				message.reply("you have been sent help.");
			}
		},


		scrape: async () => {
			if (!isAdmin(caller.id)) {
				message.channel.send(embeds.error("You aren't allowed to use this command."))
					.then(log.error);
				return;
			}
			const channel = (args[0].toLowerCase() === "here")
				? message.channel
				: client.channels.get(args[0]);

			if (!channel) {
				message.channel.send(embeds.error(`Channel not accessible: ${args[0]}`))
					.then(log.error);
				return;
			}

			const howManyMessages = (args[1].toLowerCase() === "all")
				? "Infinity" // lol
				: parseInt(args[1]);
		
			if (isNaN(howManyMessages)) {
				message.channel.send(embeds.error(`Not a number: ${args[1]}`))
					.then(log.error);
				return;
			}

			// Resolve a starting message and a promise for an ending message
			message.channel.send(embeds.standard(`Scraping up to ${howManyMessages} messages from [${channel.guild.name} - #${channel.name}]...`))
				.then(log.say);


			try {
				const messagesAdded = await scrape(channel, howManyMessages);
				message.channel.send(embeds.standard(`Added ${messagesAdded} messages.`))
					.then(log.say);
			}
			catch (err) {
				logError(err);
				message.channel.send(embeds.error(`Error while scraping: ${err}`))
					.then(log.error);
			}
		},


		terms: async () => {
			const sentMessage = await caller.send(embeds.terms);
			log.terms(sentMessage);
			if (message.channel.type !== "dm") {
				message.reply("Parrot's Terms of Service has been DM'd to you.");
			}
		},
		// Command aliases using getters: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get
		get tos()              { return this.terms; },
		get termsofservice()   { return this.terms; },
		get terms_of_service() { return this.terms; },
		get eula()             { return this.terms; },


		imitate: async () => {
			await imitate(caller, message.channel, intimidateMode);
		},
		get imitateme()     { return this.imitate; },
		get imitate_me()    { return this.imitate; },
		get intimidate()    { return this.imitate; },
		get intimidateme()  { return this.imitate; },
		get intimidate_me() { return this.imitate; },


		forget: async () => {
			let forgeteeID = mentionToUserID(args[0]);

			// Specified a user to forget and that user isn't themself
			if (forgeteeID && forgeteeID !== caller.id) {
				if (!isAdmin(caller.id)) {
					message.channel.send(embeds.error("Only admins can force-forget other users."))
						.then(log.error);
					return;
				}
			} else { // No user specified
				forgeteeID = caller.id;
			}
			
			try {
				const forgetee = await client.fetchUser(forgeteeID);

				message.channel.send(embeds.confirmForget(caller, forgetee))
					.then(log.confirmForget);

				// Open a 30 second window to confirm this forget command for this caller-forgettee pair
				const pair = JSON.stringify([caller.id, forgetee.id]);
				confirmations.addWithExpiry(pair, 30000);

			} catch (err) {
				logError(err);
				err = err.message || err;
				const msg = `Error while preparing to forget ${forgetee.tag} (ID: ${forgetee.id}): ${err}`;
				message.channel.send(embeds.error(msg))
					.then(log.error);
				dmTheAdmins(msg);
			}
		},

		get forgetme()  { return this.forget; },
		get forget_me() { return this.forget; },


		confirmforget: async () => {
			let forgeteeID = mentionToUserID(args[0]);

			if (forgeteeID && forgeteeID !== caller.id) {
				// Admin check is probably not necessary at this state, but
				//   this is pretty significant, so better safe than sorry
				if (!isAdmin(caller.id)) {
					message.channel.send(embeds.error("Only admins can force-forget other users."))
						.then(log.error);
					return;
				}
			} else { // No user specified
				forgeteeID = caller.id;
			}

			try {
				const forgetee = await client.fetchUser(forgeteeID);

				// Stringifying as a workaround for finicky object comparisons:
				// https://stackoverflow.com/questions/29760644/storing-arrays-in-es6-set-and-accessing-them-by-value
				const pair = JSON.stringify([caller.id, forgetee.id]);

				if (!confirmations.has(pair)) {
					// Confirmation either never existed or has expired
					message.channel.send(embeds.confirmationExpired(caller, forgetee))
						.then(log.confirmationExpired);
					return;
				}

				corpusUtils.forget(forgetee.id);

				message.channel.send(embeds.forgot(caller, forgetee))
					.then(() => log.forget([message, forgetee]));
				dmTheAdmins(`Forgot user ${forgetee.tag} (ID: ${forgetee.id}).`);

			} catch (err) {
				logError(err);
				err = err.message || err;
				const msg = `Error while forgetting ${forgetee.tag} (ID: ${forgetee.id}): ${err}`;
				message.channel.send(embeds.error(msg))
					.then(log.error);
				dmTheAdmins(msg);
			}
		},


		agree: () => {
			corpusUtils.consenting.add(caller.id);
			message.channel.send(embeds.agree(caller))
				.then(log.agree);
		},

		disagree: () => {
			corpusUtils.consenting.delete(caller.id);
			message.channel.send(embeds.disagree(caller))
				.then(log.disagree);
		},


		embed: () => {
			if (!isAdmin(caller.id) || !args[0]) {
				return;
			}
			message.channel.send(embeds.standard(args.join(" ")))
				.then(log.say);
		},


		error: () => {
			if (!isAdmin(caller.id) || !args[0]) {
				return;
			}
			message.channel.send(embeds.error(args.join(" ")))
				.then(log.error);
		},


		xok: () => {
			if (!isAdmin(caller.id)) {
				return;
			}
			message.channel.send(embeds.xok)
				.then(log.xok);
		},


		code: () => {
			message.channel.send(embeds.code)
				.then(log.say);
		},

		get github() { return this.code; },
		get source() { return this.code; },


		save: async () => {
			if (!isAdmin(caller.id)) {
				return;
			}
			const force = args[0] === "all";

			message.channel.send(embeds.standard((force) ? "Saving everything..." : "Saving..."));
			try {
				const saveReport = await corpusUtils.save(force);
				message.channel.send(embeds.standard(log.save(saveReport)))
					.then(log.say);
			} catch (err) {
				message.channel.send(embeds.error(`Error while saving: ${err}`))
					.then(log.error);
			}
		},


		servers: () => {
			if (!isAdmin(caller.id)) {
				return;
			}

			const embed = new Discord.RichEmbed()
				.setTitle("Member of these servers:");

			client.guilds.tap(server => {
				embed.addField(server.name, server.id, true);
			});

			caller.send(embed)
				.then(console.log(`${location(message)} Listed servers to ${caller.tag}.`));
		},


		channels: () => {
			if (!isAdmin(caller.id)) {
				return;
			}

			if (!args[0]) {
				caller.send(embeds.error(`Missing server ID\nSyntax: ${config.PREFIX}channels [server ID]`))
					.then(log.error);
				return;
			}

			const guild = client.guilds.get(args[0]);
			if (!guild) {
				caller.send(embeds.error("Invalid server ID"))
					.then(log.error);
			}

			const embed = new Discord.RichEmbed()
				.setTitle(`${guild.name} (ID: ${guild.id})`)
				.setDescription("Visible text channels:");

			guild.channels.tap(channel => {
				if (channel.type === "text") {
					embed.addField(`#${channel.name}`, channel.id, true);
				}
			});

			caller.send(embed)
				.then(console.log(`${location(message)} Listed visible text channels in ${guild.name} (ID: ${guild.id}) to ${caller.tag}.`));
		},


		speaking: () => {
			if (!isAdmin(caller.id)) {
				return;
			}

			if (!args[0]) {
				caller.send(embeds.error(`Missing server ID\nSyntax: ${config.PREFIX}speaking [server ID]`))
					.then(log.error);
				return;
			}

			const guild = client.guilds.get(args[0]);
			if (!guild) {
				caller.send(embeds.error("Invalid server ID"))
					.then(log.error);
			}
			const embed = new Discord.RichEmbed()
				.setTitle(`${guild.name} (ID: ${guild.id})`)
				.setDescription("Can speak in these channels:");

			guild.channels.tap(channel => {
				if (canSpeakIn(channel.id)) {
					embed.addField(`#${channel.name}`, channel.id, true);
				}
			});

			caller.send(embed)
				.then(console.log(`${location(message)} Listed speaking channels for ${guild.name} (ID: ${guild.id}) to ${caller.tag}.`));
		},


		learning: () => {
			if (!isAdmin(caller.id)) {
				return;
			}

			if (!args[0]) {
				caller.send(embeds.error(`Missing server ID\nSyntax: ${config.PREFIX}learning [server ID]`))
					.then(log.error);
				return;
			}

			const guild = client.guilds.get(args[0]);
			if (!guild) {
				caller.send(embeds.error("Invalid server ID"))
					.then(log.error);
			}
			const embed = new Discord.RichEmbed()
				.setTitle(`${guild.name} (ID: ${guild.id})`)
				.setDescription("Learning in these channels:");

			guild.channels.tap(channel => {
				if (learningIn(channel.id)) {
					embed.addField(`#${channel.name}`, channel.id, true);
				}
			});

			caller.send(embed)
				.then(console.log(`${location(message)} Listed learning channels for ${guild.name} (ID: ${guild.id}) to ${caller.tag}.`));
		},
	};

	// Special case modifier for |imitate
	if (["intimidate", "intimidateme", "intimidate_me"].includes(command)) {
		intimidateMode = true;
	}

	// Execute the corresponding command from the commands dictionary
	if (Object.keys(commands).includes(command)) {
		commands[command]();
	}

	return command;
}


/**
 * Set the custom nicknames from config.
 * 
 * @return {Promise<void>} nothing
 * @rejects {Error[]} array of errors
 */
async function updateNicknames(nicknameDict) {
	const errors = [];

	for (const serverName in nicknameDict) {
		const [ serverID, nickname ] = nicknameDict[serverName];
		const server = client.guilds.get(serverID);
		if (!server) {
			console.warn(`Nickname configured for a server that Parrot is not in. Nickname could not be set in ${serverName} (${serverID}).`);
			continue;
		}
		server.me.setNickname(nickname)
			.catch(errors.push);
	}

	if (errors.length > 0) {
		throw errors;
	} else {
		return;
	}
}


/**
 * Get status name from a status code.
 * 
 * @param {number} code - status code
 * @return {string} status name
 */
function status(code) {
	return ["Playing", "Streaming", "Listening to", "Watching"][code];
}


/**
 * Check if a string is a mention.
 * 
 * @param {string} str
 * @return {Boolean}
 */
function isMention(str) {
	return regex.mention.test(str);
}


/**
 * Get a user ID from a mention string (e.g. <@120957139230597299>).
 * 
 * @param {string} mention - string with a user ID
 * @return {?string} userID
 */
function mentionToUserID(mention) {
	return (isMention(mention))
		? mention.match(regex.id)[0]
		: null;
}


/**
 * Is [val] in [obj]?
 * Faster than Object.values(obj).includes().
 * 
 * @param {any} val
 * @param {Object} object
 * @return {Boolean}
 */
function has(val, obj) {
	for (const key in obj) {
		if (obj[key] === val) {
			return true;
		}
	}
	return false;
}


function isAdmin(userID) {
	return has(userID, config.ADMINS);
}


function isBanned(userID) {
	return has(userID, config.BANNED);
}


function canSpeakIn(channelID) {
	return has(channelID, config.SPEAKING_CHANNELS);
}


function learningIn(channelID) {
	return has(channelID, config.LEARNING_CHANNELS);
}


/**
 * DM all the users in the ADMINS envrionment variable.
 * 
 * @param {string} string - message to send the admins
 */
function dmTheAdmins(string) {
	for (const key in config.ADMINS) {
		const userId = config.ADMINS[key];
		client.fetchUser(userId)
			.then(user => user.send(string))
			.catch(console.error);
	}
}


/**
 * DM the admins and log an error.
 * 
 * @param {string} err - error message
 */
function logError(err) {
	console.error(err);
	const sendThis = (err.message)
		? `ERROR! ${err.message}`
		: `ERROR! ${err}`;

	dmTheAdmins(sendThis);
}


/**
 * Turn this:
 *     "server - #channel": {
 *         "channelID": "876587263845753",
 *         "hookID": "1254318729468795",
 *         "token": 9397013nv87y13iuyfn.88FJSI77489n.hIDSeHGH353"
 *     },
 *     "other server - #channeln't": {
 *         . . .
 *     }
 * 
 * Into this:
 *     "876587263845753": [DiscordWebhookClient],
 *     "other channelid": [DiscordWebhookClient]
 * 
 * @param {Object} hooksDict - object to be parsed
 * @return {Object} parsed object
 */
function parseHooksDict(hooksDict) {
	if (!hooksDict) {
		return null;
	}
	const hooks = {};
	for (const key in hooksDict) {
		const { channelID, hookID, token } = hooksDict[key];
		const hook = new Discord.WebhookClient(hookID, token, {disableEveryone: true});
		hooks[channelID] = hook;
	}
	return hooks;
}

	
/**
 * Generate an object containing stats about
 *   all the channels in the given dictionary.
 * 
 * @param {Object} channelDict - Dictionary of channels
 * @return {Promise<Object>} Object intended to be console.table'd
 * 
 * @example
 *     channelTable(config.SPEAKING_CHANNELS)
 *         .then(console.table)
 */
async function channelTable(channelDict) {
	if (config.DISABLE_LOGS) {
		return {};
	}
	
	if (isEmpty(channelDict)) {
		throw "No channels are whitelisted.";
	}

	const stats = {};
	for (const key in channelDict) {
		const channelID = channelDict[key];
		const channel = client.channels.get(channelID);

		if (!channel) {
			logError(`channelTable() non-fatal error: could not find a channel with the ID ${channelID}`);
			continue;
		}

		const stat = {};
		stat["Server"] = channel.guild.name;
		stat["Name"] = "#" + channel.name;
		stats[channelID] = stat;
	}
	return stats;
}


/**
 * Generate an object containing stats about
 *   all the nicknames Parrot has.
 * 
 * @param {Object} nicknameDict - Dictionary of nicknames
 * @return {Promise<Object>} Object intended to be console.table'd
 * 
 * @example
 *     nicknameTable(config.NICKNAMES)
 *         .then(console.table)
 */
async function nicknameTable(nicknameDict) {
	if (config.DISABLE_LOGS) {
		return {};
	}
	
	if (isEmpty(nicknameDict)) {
		throw "No nicknames defined.";
	}

	const stats = {};
	for (const serverName in nicknameDict) {
		const [ serverID, nickname ] = nicknameDict[serverName];
		const server = client.guilds.get(serverID);

		if (!server) {
			logError(`nicknameTable() non-fatal error: could not find a server with the ID ${serverID}`);
			continue;
		}

		const stat = {};
		stat["Server"] = server.name;
		stat["Intended"] = nickname;
		stat["De facto"] = server.me.nickname;
		stats[serverID] = stat;
	}
	return stats;
}


/**
 * Generate a string that tells where the message came from
 *   based on a Discord Message object.
 * 
 * @param {Message} message - message object, like from channel.send() or on-message
 * @return {string} location string
 * @example
 *     console.log(location(message))
 *     // returns "[Server - #channel]"
 */
function location(message) {
	if (message.hasOwnProperty("channel")) {
		const type = message.channel.type;
		if (type === "text") {
			return `[${message.guild.name} - #${message.channel.name}]`;
		} else if (type === "dm") {
			return `[DM to ${message.channel.recipient.tag}]`;
		} else {
			return `[Unknown: ${type}]`;
		}
	} else {
		const channel = client.channels.get(message.channel_id);
		return `[${channel.guild.name} - #${channel.name}]`;
	}
}


/**
 * Is [obj] empty?
 * 
 * @param {Object} obj
 * @return {Boolean} empty or not
 */
function isEmpty(obj) {
	for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
			return false;
		}
	}
	return true;
}


// --- /FUNCTIONS -------------------------------------------
