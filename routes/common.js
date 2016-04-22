module.exports = {normalizeDisplayName};

function normalizeDisplayName(name) {
    // convert to string in any case
    name = '' + name;
    if(name.length < 3) {
        return "Anonymous";
    }
    if(name.length > 40) {
        return name.substr(0, 40);
    }
    return name;
}
