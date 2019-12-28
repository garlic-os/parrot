const AWS  = require("aws-sdk"),
      path = require("path")

module.exports = config => {
	// Configure AWS-SDK to access an S3 bucket
	AWS.config.update({
		accessKeyId: config.AWS_ACCESS_KEY_ID,
		secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
		region: config.AWS_REGION
	})

	const s3 = new AWS.S3()

	return {

		/**
		 * Downloads a file from S3_BUCKET_NAME.
		 * 
		 * @param {string} userID - ID of a corpus to download from the S3 bucket
		 * @return {Promise<string|Error>} Resolve: data from bucket; Reject: error
		 */
		read: async userID => {
			const params = {
				Bucket: config.S3_BUCKET_NAME, 
				Key: `${config.CORPUS_DIR}/${userID}.txt`
			}

			const res = await s3.getObject(params).promise()

			if (res.Body === undefined || res.Body === null)
				throw `Empty response at path: ${path}`

			return res.Body.toString() // Convert Buffer to string
		},


		/**
		 * Uploads (and overwrites) a corpus in S3_BUCKET_NAME.
		 * 
		 * @param {string} userID - user ID's corpus to upload/overwrite
		 * @param {string} data - data to write to user's corpus 
		 * @return {Promise<Object|Error>} Resolve: success response; Reject: Error
		 */
		write: async (userID, data) => {
			const params = {
				Bucket: config.S3_BUCKET_NAME,
				Key: `${config.CORPUS_DIR}/${userID}.txt`,
				Body: Buffer.from(data, "UTF-8")
			}
			return await s3.upload(params).promise()
		},


		/**
		 * Compiles a list of all the IDs inside CORPUS_DIR.
		 * 
		 * @return {Promise<string[]|Error>} Resolve: Array of user IDs; Reject: error message
		 */
		listUserIDs: async () => {
			const params = {
				Bucket: config.S3_BUCKET_NAME,
				Prefix: config.CORPUS_DIR,
			}
			
			const res = await s3.listObjectsV2(params).promise()

			return res.Contents.map( ({ Key }) => {
				// Remove file extension and preceding path
				return path.basename(Key.replace(/\.[^/.]+$/, ""))
			})
		}
	}
}
