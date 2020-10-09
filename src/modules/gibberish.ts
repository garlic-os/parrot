// Gibberish Generator (JavaScript).
// Algorithm: Letter-based Markov text generator.
// Keith Enevoldsen, thinkzone.wlonk.com

const pick_match_index = (text: string, target: string, nchars: number) => {
    // Find all sets of matching target characters.
    var nmatches = 0;
    var targetIndex = -1;
    while (true) {
        targetIndex = text.indexOf(target, targetIndex + 1);
        if (targetIndex === -1 || targetIndex >= nchars) {
            break;
        }
        ++nmatches;
    }

    // Pick a match at random.
    return ~~(nmatches * Math.random());
};


const pick_char = (text: string, target: string, level: number, nchars: number) => {
    const matchIndex = pick_match_index(text, target, nchars);

    // Find the character following the matching characters.
    var nmatches = 0;
    var targetIndex = -1;
    while (true) {
        targetIndex = text.indexOf(target, targetIndex + 1);
        if (targetIndex === -1 || targetIndex >= nchars) {
            throw {
                name: "Range Error",
                code: "RANGE",
                message: "Index out of range. I have no idea why this happens.",
            }
        } else if (matchIndex === nmatches) {
            // If this new index is out of bounds, return an empty string instead of undefined.
            return text[targetIndex + level - 1] || "";
        }
        ++nmatches;
    }
};


export const gibberish = (text: string, level=4, length=500) => {
    var charIndex = 0;
    const nchars = text.length;

    // Make the string contain two copies of the input text.
    // This allows for wrapping to the beginning when the end is reached.
    text += text;

    // Ensure the input text ends with a space in case it wraps on itself.
    if (text.slice(-1) !== " ") {
        text += " ";
    }

    // Pick a random starting character, preferably an uppercase letter.
    for (let i = 0; i < 1000; ++i) {
        charIndex = ~~(nchars * Math.random());
        if (/[A-Z]/.test(text[charIndex])) {
            break;
        }
    }

    // Write starting characters.
    var output = text.substring(charIndex, charIndex + level);

    // Set target string.
    var target = text.substring(charIndex + 1, charIndex + level);

    // Generate characters.
    for (let i = 0; i < length; ++i) {

        if (level === 1) {
            // Pick a random character.
            output += text[~~(nchars * Math.random())];
        } else {
            // Pick the next character.
            // If this returns None, use the last picked character instead.
            var char = pick_char(text, target, level, nchars);

            // Update the target.
            target = target.substring(1, level - 1) + char;

            // Add the character to the output.
            output += char;
        }
    }
    return output;
};
