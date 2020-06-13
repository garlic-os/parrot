/**
 * A Set whose elements automatically self-delete a given time after being added.
 */
class ExpirableSet extends Set {
	/**
	 * Add a value to the Set with an expiration date.
	 * 
	 * @param {any} value - value to add to the Set
	 * @param {number} lifespan=30000 - time, in ms, before the value is deleted from the Set
	 * @return {ExpirableSet} self
	 */
	addWithExpiry(value, lifespan=30000) {
		this.add(value)

		setTimeout( () => {
			this.delete(value)
		}, lifespan)

		return this
	}
}

module.exports = ExpirableSet
