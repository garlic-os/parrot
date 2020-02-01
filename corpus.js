"use strict"

const fs = require("fs").promises
    , s3 = require("./s3")

var autosaveInterval;

/**
 * A set of user IDs whose corpi have been created/modified since last S3 save.
 * Is cleared when their corpus is saved.
 * @const {Set<string>}
 */
const unsaved = new Set()

/**
 * A set of all user IDs in the S3 bucket.
 * Is NOT cleared when their corpus is saved.
 * @const {Set<string>}
 */
const onS3 = new Set()
s3.listUserIDs().then(userIDs => {
	for (const userID of userIDs) {
		onS3.add(userID)
	}
})


// Create directory ./cache/ if it doesn't exist
fs.mkdir("cache").catch(err => {
	if (err.code !== "EEXIST") throw err
})


/**
 * Try to load the corpus corresponding to [userID] from cache.
 * If the corpus isn't in cache, try to download it from S3.
 * If it isn't there either, give up.
 * 
 * @param {string} userID - user ID whose corpus to load
 * @return {Promise<string>} [userID]'s corpus
 */
async function load(userID) {
	try {
		return await _readCache(userID) // Maybe the user's corpus is in cache
	} catch (err) {
		if (err.code !== "ENOENT") // Only proceed if the reason _readCache() failed was
			throw err              //   because it couldn't find the file

		// Maybe the user's corpus is in the S3 bucket
		// If not, the user is nowhere to be found (or something went wrong)
		if (!onS3.has(userID)) throw `[corpus.load(userID)] User not found: ${userID}`
		const corpus = await s3.read(userID)
		_writeCache(userID, corpus)
		return corpus
	}
}


/**
 * Add data to a user's corpus.
 * 
 * @param {string} userID - ID of the user whose corpus to add data to
 * @param {string} data - data to add
 * @return {Promise<void>} nothing
 */
async function append(userID, data) {
	const cache = await fs.readdir(`./cache`)
	if (cache.includes(`${userID}.txt`)) { // Corpus is in cache
		fs.appendFile(`./cache/${userID}.txt`, data) // Append the new data to it

	} else if (onS3.has(userID)) { // Corpus is in the S3 bucket
		const corpus = await s3.read(userID) // Download the corpus from S3
		_writeCache(userID, corpus + data) // Cache the corpus with the new data added

	} else {
		// User doesn't exist; make them a new corpus from just the new data
		_writeCache(userID, data)
	}
	unsaved.add(userID)
}


/**
 * Upload all unsaved cache to S3
 *   and empty the list of unsaved files.
 * 
 * @return {Promise<number>} number of files saved
 */
async function saveAll() {
	let savedCount = 0
	const promises = []
	for (const userID in unsaved.values()) {
		const corpus = await load(userID)
		promises.push(
			s3.write(userID, corpus).then( () => {
				savedCount++
				onS3.add(userID)
			})
		)
	}
	unsaved.clear()

	await Promise.all(promises)
	return savedCount
}


/**
 * Automatically save all corpi on an interval.
 * 
 * @param {number} [intervalMS] - time between autosaves (in milliseconds)
 */
function startAutosave(intervalMS=3600000) {
	autosaveInterval = setInterval( async () => {
		const savedCount = await saveAll()
		console.log(`[CORPUS AUTOSAVE] Saved ${savedCount} ${(savedCount === 1) ? "corpus" : "corpi"}.`)
	}, intervalMS)
}


function stopAutosave() {
	clearInterval(autosaveInterval)
}


/**
 * Write a file to cache.
 * 
 * @param {string} filename - name of file to write to (minus extension)
 * @param {string} data - data to write
 * @return {Promise<void>} nothing
 */
async function _writeCache(filename, data) {
	fs.writeFile(`./cache/${filename}.txt`, data)
}


/**
 * Read a file from cache.
 * 
 * @param {string} filename - name of file to read (minus extension)
 * @return {Promise<string>} file's contents
 */
async function _readCache(filename) {
	const data = await fs.readFile(`./cache/${filename}.txt`, "UTF-8")
	if (data === "") throw { code: "ENOENT" }
	return data
}



module.exports = {
	unsaved: unsaved,
	onS3: onS3,
	load: load,
	append: append,
	saveAll: saveAll,
	startAutosave: startAutosave,
	stopAutosave: stopAutosave
}
