const fs = require("fs").promises
const s3 = require("./s3")
const TrackerSet = require("./tracker-set")

var autosaveInterval

/**
 * A set of user IDs whose corpora have been created/modified since last S3 save.
 * Is cleared when their corpus is saved.
 * @type {Set<string>}
 */
const unsaved = new Set()

/**
 * A set of all user IDs in the S3 bucket.
 * corpora are NOT removed from this set when saved.
 * @type {Set<string>}
 */
const inBucket = new Set()

/**
 * A set of all user IDs in cache.
 * corpora are NOT removed from this set when saved.
 * @type {Set<string>}
 */
const inCache = new Set()


/**
 * A set of the user IDs of the users who consent to Parrot's data collection.
 * After the scheduled purge of unconsenting users' information on Aug. 1, 2020,
 *   this will be removed in favor of refusal to store information without
 *   the user's prior consent.
 * @type {Set<string>}
 */
const consenting = new TrackerSet()


/**
 * Populate inBucket with the user IDs in the S3 bucket.
 */
const inBucketReady = (async () => {
	const userIDs = await s3.listUserIDs()
	for (const userID of userIDs) {
		inBucket.add(userID)
	}
})()


/**
 * Populate inCache with the user IDs in the cache folder.
 */
const inCacheReady = (async () => {
	// Create directory ./cache/ if it doesn't exist
	try {
		await fs.mkdir("cache")
	} catch (err) {
		if (err.code !== "EEXIST") {
			// If the other is something other than fs complaining that the folder already exists,
			//   then Parrot should probably throw that
			throw err
		}
	}

	const filenames = await fs.readdir("./cache")
	for (const filename of filenames) {
		const userID = filename.slice(0, -4) // Remove last four characters (file extension)
		inCache.add(userID)
	}
})()


const consentingReady = (async () => {
	let userIDs;
	
	// Read consenting.json if it exists
	try {
		userIDs = await s3.readFile("consenting.json")
		userIDs = JSON.parse(userIDs)
	} catch (err) {
		// Skip the last part and just write a new file if it doesn't exist
		if (err.code === "NoSuchKey") {
			console.warn("[corpus.js] consenting.json does not exist; creating it...")
			userIDs = []
		} else if (err.code === "SyntaxError") {
			console.warn(`[corpus.js] consenting.json is corrupt and will be overwritten.\nconsenting.json:\n${userIDs}`)
			userIDs = []
		}
	}

	// Populate the Set with the contents of consenting.json
	for (const userID of userIDs) {
		consenting.add(userID)
	}
})()



/**
 * Try to load the corpus corresponding to [userID] from cache.
 * If the corpus isn't in cache, try to download it from S3.
 * If it isn't there either, give up.
 * 
 * @param {string} userID - user ID whose corpus to load
 * @return {Promise<string>} [userID]'s corpus
 */
async function load(userID) {
	if (!consenting.has(userID)) {
		throw `NOPERMISSION`
	}

	// If in cache, serve from cache
	try {
		return await _readFromCache(userID)
	} catch (err) {
		if (err.code !== "ENOENT") { // Only proceed if the reason _readFromCache() failed was
			throw err                //   because it couldn't find the file
		}
	}

	// Else, if in the S3 bucket, serve from the S3 bucket
	if (inBucket.has(userID)) {
		const corpus = await s3.read(userID)
		_addToCache(userID, corpus) // Not in cache, so cache this corpus
		return corpus
	}
	throw `No data available on user with ID ${userID}`
}


/**
 * Add data to a user's corpus.
 * 
 * @param {string} userID - ID of the user whose corpus to add data to
 * @param {string} data - data to add
 * @return {Promise<void>} nothing
 */
async function append(userID, data) {
	if (!consenting.has(userID)) {
		throw `NOPERMISSION`
	}
	/**
	* If the corpus is in the S3 bucket but not cached,
	*   download the corpus from S3 to have a complete
	*   copy in cache.
	* If not, either the corpus is already cached or the
	*   corpus does not exist at all;
	*   in either case, Parrot does not need to download
	*   the corpus from S3 and can add just the new data.
	*/
	if (inBucket.has(userID) && !inCache.has(userID)) {
		const corpus = await s3.read(userID)
		data = corpus + data
	}

	_addToCache(userID, data)
}


async function forget(userID) {
	inBucket.delete(userID)
	inCache.delete(userID)
	unsaved.delete(userID)
	_removeFromCache(userID)
	s3.remove(userID)
}


/**
 * Upload all unsaved cache to S3
 *   and empty the list of unsaved files.
 * 
 * @param {Boolean} [force] - if true, save all corpora regardless of whether they have apparently been changed
 * @return {Promise<number>} number of files saved
 */
async function save(force) {
	let setToSave

	if (force) {
		setToSave = inCache
	} else {
		setToSave = unsaved
	}

	if (setToSave.size === 0 && !consenting.modified) {
		throw `Nothing to save.`
	}

	var savedCount = 0
	for (const userID of setToSave) {
		const corpus = await _readFromCache(userID)
		await s3.write(userID, corpus)
		++savedCount
		inBucket.add(userID)
	}

	unsaved.clear()

	if (consenting.modified) {
		s3.writeFile("consenting.json", JSON.stringify([...consenting]))
		consenting.modified = false

		return {
			corpora: savedCount,
			consenting: true
		}
	}

	return {
		corpora: savedCount,
		consenting: false
	}
}


/**
 * Automatically save all corpora on an interval.
 * 
 * @param {number} [intervalMS=3600000] - time between autosaves in milliseconds (default: 1 hour)
 */
function startAutosave(intervalMS=3600000) {
	autosaveInterval = setInterval( async () => {
		const savedCount = await save()
		console.log(`[CORPUS AUTOSAVE] Saved ${savedCount} ${(savedCount === 1) ? "corpus" : "corpora"}.`)
	}, intervalMS)
}


/**
 * Stop autosaving.
 */
function stopAutosave() {
	clearInterval(autosaveInterval)
}


/**
 * Add data to a corpus in cache.
 * 
 * @param {string} userID - ID whose corpus file to append to
 * @param {string} data - data to append
 * @return {Promise} fs.appendFile() response
 */
async function _addToCache(userID, data) {
	const fsResponse = await fs.appendFile(`./cache/${userID}.txt`, data)
	inCache.add(userID)
	unsaved.add(userID)
	return fsResponse
}


/**
 * Read a corpus from cache.
 * 
 * @param {string} userID - ID whose corpus file to read
 * @return {Promise<string>} corpus file's contents
 */
async function _readFromCache(userID) {
	const data = await fs.readFile(`./cache/${userID}.txt`, "UTF-8")
	if (data === "") throw { code: "ENOENT" }
	return data
}


/**
 * Remove a corpus from cache.
 * 
 * @param {string} userID - ID whose corpus file to delete
 * @return {Promise} fs.unlink() response
 */
async function _removeFromCache(userID) {
	return await fs.unlink(`./cache/${userID}.txt`)
}


module.exports = {
    ready: Promise.all([inCacheReady, inBucketReady, consentingReady]),
	consenting,
	forget,
	load,
	append,
	save,
	startAutosave,
	stopAutosave
}
