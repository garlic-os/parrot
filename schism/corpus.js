const fs = require("fs").promises
    , s3 = require("./s3")

var autosaveInterval

/**
 * A set of user IDs whose corpi have been created/modified since last S3 save.
 * Is cleared when their corpus is saved.
 * @type {Set<string>}
 */
const unsaved = new Set()

/**
 * A set of all user IDs in the S3 bucket.
 * Corpi are NOT removed from this set when saved.
 * @type {Set<string>}
 */
const inBucket = new Set()

/**
 * A set of all user IDs in cache.
 * Corpi are NOT removed from this set when saved.
 * @type {Set<string>}
 */
const inCache = new Set()


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
		if (err.code !== "EEXIST") throw err
	}

	const filenames = await fs.readdir("./cache")
	for (const filename of filenames) {
		const userID = filename.slice(0, -4) // Remove last four characters (file extension)
		inCache.add(userID)
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
	// If in cache, serve from cache
	try {
		return await _readFromCache(userID)
	} catch (err) {
		if (err.code !== "ENOENT") { // Only proceed if the reason _readFromCache() failed was
			throw err                //   because it couldn't find the file
		}
	}

	await inBucketReady

	// Else, if in the S3 bucket, serve from the S3 bucket
	if (inBucket.has(userID)) {
		const corpus = await s3.read(userID)
		_addToCache(userID, corpus) // Not in cache, so cache this corpus
		return corpus
	}
	throw `[corpus.load()] User not found: ${userID}`
}


/**
 * Add data to a user's corpus.
 * 
 * @param {string} userID - ID of the user whose corpus to add data to
 * @param {string} data - data to add
 * @return {Promise<void>} nothing
 */
async function append(userID, data) {
	await inCacheReady
	await inBucketReady

	/**
	* If the corpus is in the S3 bucket but not cached,
	*   download the corpus from S3 to have a complete
	*   copy in cache.
	* If not, either the corpus is already cached or the
	*   corpus does not exist at all;
	*   in either case, Schism does not need to download
	*   the corpus from S3 and can add just the new data.
	*/
	if (inBucket.has(userID) && !inCache.has(userID)) {
		const corpus = await s3.read(userID)
		data = corpus + data
	}

	_addToCache(userID, data)
}


/**
 * Upload all unsaved cache to S3
 *   and empty the list of unsaved files.
 * 
 * @param {Boolean} [force] - if true, save all corpi regardless of whether they have apparently been changed
 * @return {Promise<number>} number of files saved
 */
async function saveAll(force) {
	let setToSave

	if (force) {
		await inCacheReady
		setToSave = inCache
	} else {
		setToSave = unsaved
	}

	if (setToSave.size === 0) throw `Nothing to save.`

	await inBucketReady

	var savedCount = 0
	for (const userID of setToSave) {
		const corpus = await _readFromCache(userID)
		await s3.write(userID, corpus)
		++savedCount
		inBucket.add(userID)
	}

	unsaved.clear()
	return savedCount
}


/**
 * Automatically save all corpi on an interval.
 * 
 * @param {number} [intervalMS=3600000] - time between autosaves in milliseconds (default: 1 hour)
 */
function startAutosave(intervalMS=3600000) {
	autosaveInterval = setInterval( async () => {
		const savedCount = await saveAll()
		console.log(`[CORPUS AUTOSAVE] Saved ${savedCount} ${(savedCount === 1) ? "corpus" : "corpi"}.`)
	}, intervalMS)
}


/**
 * Stop autosaving.
 */
function stopAutosave() {
	clearInterval(autosaveInterval)
}


/**
 * Combine Sets inCache and inBucket for one Set of
 *   the IDs of all the users Schism can imitate.
 * 
 * Made by jameslk: https://stackoverflow.com/a/32001750
 * 
 * @return {Set<string>} all user IDs
 */
async function allUserIDs() {
	await inCacheReady
	await inBucketReady

	return new Set(
		function*() {
			yield* inCache
			yield* inBucket
		}()
	)
}


/**
 * Add data to a file to cache.
 * 
 * @param {string} userID - name of file to append to (minus extension)
 * @param {string} data - data to append
 * @return {Promise<void>} nothing
 */
async function _addToCache(userID, data) {
	await inCacheReady

	await fs.appendFile(`./cache/${userID}.txt`, data)
	inCache.add(userID)
	unsaved.add(userID)
}


/**
 * Read a file from cache.
 * 
 * @param {string} userID - name of file to read (minus extension)
 * @return {Promise<string>} file's contents
 */
async function _readFromCache(userID) {
	const data = await fs.readFile(`./cache/${userID}.txt`, "UTF-8")
	if (data === "") throw { code: "ENOENT" }
	return data
}


module.exports = {
	load,
	append,
	saveAll,
	startAutosave,
	stopAutosave,
	allUserIDs
}
