const fs = require("fs")
const s3write = require("./s3").write

module.exports = {
	unsaved: [],

	/**
	 * Write a file to cache.
	 * 
	 * @param {string} filename - name of file to write to (minus extension)
	 * @param {string} data - data to write
	 * @return {Promise<void|Error>} Resolve: nothing; Reject: Error
	 */
	write: (filename, data) => {
		return new Promise( (resolve, reject) => {
			fs.writeFile(`./cache/${filename}.txt`, data, err => {
				(err) ? reject(err) : resolve()
			})
		})
	},


	/**
	 * Read a file from cache.
	 * 
	 * @param {string} filename - name of file to read (minus extension)
	 * @return {Promise<string|Error>} Resolve: file's contents; Reject: Error
	 */
	read: filename => {
		return new Promise( (resolve, reject) => {
			fs.readFile(`./cache/${filename}.txt`, "UTF-8", (err, data) => {
				if (err) return reject(err)
				if (data === "") return reject( { code: "ENOENT" } )
				resolve(data)
			})
		})
	},


	/**
	 * Make a directory if it doesn't exist.
	 *
	 * @param {string} dir - Directory of which to ensure existence
	 * @return {Promise<string|Error>} Directory if it already exists or was successfully made; error if something goes wrong
	 */
	ensureDirectory: dir => {
		return new Promise( (resolve, reject) => {
			fs.stat(dir, err => {
				if (err && err.code === "ENOENT") {
					fs.mkdir(dir, { recursive: true }, err => {
						(err) ? reject(err) : resolve(dir)
					})
				}
				else (err) ? reject(err) : resolve(dir)
			})
		})
	},


	/**
	 * Upload all unsaved cache to S3
	 *   and empty the list of unsaved files.
	 * 
	 * @return {Promise<void|Error>} Resolve: number of files saved; Reject: s3.write() error
	 */
	saveCache: async () => {
		let savedCount = 0
		const promises = []
		while (unsavedCache.length > 0) {
			const userID = unsavedCache.pop()
			const corpus = await loadCorpus(userID)
			promises.push(
				s3write(userID, corpus)
					.then(savedCount++)
			)
		}

		await Promise.all(promises)
		return savedCount
	}
}
