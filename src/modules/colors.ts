interface NumberDict {
    [key: string]: number;
}

export const colors: NumberDict = {
    purple: 0xA755B5, // Pale purple
    red: 0xB71C1C, // Deep, muted red
    orange: 0xF4511E, // Deep orange. Reserved for BIG trouble.
    green: 0x43A047, // Darkish muted green
    gray: 0x9E9E9E, // Dead gray
    get grey() { return this.gray; }, // Completely necessary alias for the other spelling
};
