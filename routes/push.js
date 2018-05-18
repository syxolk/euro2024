const instance = require('../models').instance;
const News = instance.model('News');

module.exports = function(headline) {
    return News.create({headline});
};
