/**
 * A Map with a set maximum size. Deletes its oldest entry when at capacity.
 */
export class SizeCappedMap<K,V> extends Map<K,V> {
    private maxSize: number = 0;
    private keyArray: K[];

    constructor(maxSize: number) {
        super();
        this.setMaxSize(maxSize);
        this.keyArray = Array.from(this.keys());
    }

    set(key: K, value: V): this {
        // If this is a new entry and the Map is already at its max size,
        //   delete the oldest entry.
        if (!this.has(key) && this.size === this.maxSize) {
            this.delete(<K>this.keyArray.shift());
        }
        super.set(key, value);
        this.keyArray.push(key);
        return this;
    }

    setMaxSize(newMaxSize: number): this {
        if (newMaxSize < 0) {
            throw "Size cannot be negative";
        }
        this.maxSize = newMaxSize;
        while (this.size > this.maxSize) {
            this.delete(<K>this.keyArray.shift());
        }
        return this;
    }
}
