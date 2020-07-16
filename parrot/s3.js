const AWS  = require("aws-sdk")
const path = require("path")

// Configure AWS-SDK to access an S3 bucket
AWS.config.update({
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	region: process.env.AWS_REGION
})

const s3 = new AWS.S3()


/**
 * Remove an element from any array by value.
 * 
 * @param {any[]} array - array to modify
 * @param {any} element - element to find and remove
 * @return {any[]} the modified array
 */
function removeFrom(array, element) {
	const index = array.indexOf(element)
	if (index > -1) {
		array.splice(index, 1)
	}
	return array
}


/**
 * Download a corpus from S3_BUCKET_NAME by userID.
 * 
 * @param {string} userID - ID of a corpus to download from the S3 bucket
 * @return {Promise<string>} data from bucket
 */
async function read(userID) {
	if (!userID) {
		throw `s3.read() received invalid ID: ${userID}`
	}

	const params = {
		Bucket: process.env.S3_BUCKET_NAME, 
		Key: `${process.env.CORPUS_DIR}/${userID}.txt`
	}

	try {
		const { Body } = await s3.getObject(params).promise()

		if (!Body) {
			throw `Empty response at path: ${path}`
		}

		return Body.toString() // Convert Buffer to string
	} catch (err) {
		throw `[s3.read(${userID})] ${err}`
	}
}


/**
 * Download a file by path to file.
 * 
 * @param {string} path - path to the file
 */
async function readFile(path) {
	const params = {
		Bucket: process.env.S3_BUCKET_NAME, 
		Key: `${process.env.CORPUS_DIR}/${path}`
	}

	try {
		const { Body } = await s3.getObject(params).promise()

		if (!Body) {
			throw `Empty response at path: ${path}`
		}

		return Body.toString() // Convert Buffer to string
	} catch (err) {
		err.message = `Error fetching "${path}" from database: ` + err.message
		throw err
	}
}


/**
 * Upload (and overwrite) a corpus in S3_BUCKET_NAME.
 * 
 * @param {string} userID - user ID's corpus to upload/overwrite
 * @param {string} data - data to write to user's corpus 
 * @return {Promise<Object>} success response
 */
async function write(userID, data) {
	if (!userID) {
		throw `Failed to write file: invalid user ID: ${userID}`
	}

	const params = {
		Bucket: process.env.S3_BUCKET_NAME,
		Key: `${process.env.CORPUS_DIR}/${userID}.txt`,
		Body: Buffer.from(data, "UTF-8")
	}
	return await s3.upload(params).promise()
}


/**
 * Upload (and overwrite) a file in S3_BUCKET_NAME.
 * 
 * @param {string} path - path to file to upload/overwrite
 * @param {string} data - data to write 
 * @return {Promise<Object>} success response
 */
async function writeFile(path, data) {
	if (!path) {
		throw `Failed to write file: invalid path: ${path}`
	}

	const params = {
		Bucket: process.env.S3_BUCKET_NAME,
		Key: `${process.env.CORPUS_DIR}/${path}`,
		Body: Buffer.from(data, "UTF-8")
	}
	return await s3.upload(params).promise()
}


/**
 * Delete a corpus from S3_BUCKET_NAME.
 *
 * @param {string} userID - user ID's corpus to delete
 * @return {Promise} s3.deleteObject() response
 */
async function remove(userID) {
	if (!userID) {
		throw `s3.remove() received invalid ID: ${userID}`
	}

	const params = {
		Bucket: process.env.S3_BUCKET_NAME, 
		Key: `${process.env.CORPUS_DIR}/${userID}.txt`
	}

	return await s3.deleteObject(params).promise()
}


/**
 * Compile a list of all the IDs inside CORPUS_DIR.
 * 
 * @return {Promise<string[]>} array of user IDs
 */
async function listUserIDs() {
	const params = {
		Bucket: process.env.S3_BUCKET_NAME,
		Prefix: process.env.CORPUS_DIR + "/",
	}
	
	const { Contents } = await s3.listObjectsV2(params).promise()

	// Remove an unwanted entry named "corpus"
	removeFrom(Contents, "corpus")

	return Contents.map( ({ Key }) => {
		// Remove file extension and preceding path
		return path.basename(Key.replace(/\.[^/.]+$/, ""))
	})
}



module.exports = {
	read,
	write,
	remove,
	readFile,
	writeFile,
	listUserIDs
}
