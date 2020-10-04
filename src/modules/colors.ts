interface StringDict {
    [key: string]: string;
}

export const colors: StringDict = {
    purple: "#A755B5", // Pale purple
    red: "#B71C1C", // Deep, muted red
    green: "#43A047", // Darkish muted green
    blue: "#2196F3", // Classic Sonic
    gray: "#9E9E9E", // Dead gray
    get grey() { return this.gray; }, // Completely necessary alias for the other spelling
};
