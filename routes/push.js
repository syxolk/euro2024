const bluebird = require('bluebird');
const requestPost = bluebird.promisify(require("request").post);
const config = require('../config');
const instance = require('../models').instance;
const News = instance.model('News');

module.exports = function(headline) {
    return bluebird.all([
        News.create({headline}),
        requestPost({
            url: 'https://api.telegram.org/bot' + config.telegram.token + '/sendMessage',
            form: {
                chat_id: config.telegram.channelId,
                text: headline
            }
        })
    ]);
};
