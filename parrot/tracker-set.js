/**
 * A Set that keeps track of whether it has been modified.
 */
class TrackerSet extends Set {
	add(value) {
		this.modified = true;
		super.add(value);
		return this;
	}

	delete(value) {
		this.modified = true;
		super.delete(value);
		return this;
	}
}


module.exports = TrackerSet;
