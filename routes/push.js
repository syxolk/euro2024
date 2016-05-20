const request = require('request');
const config = require('../config');
const instance = require('../models').instance;
const News = instance.model('News');

module.exports = function(headline) {
    News.create({headline}).then(function() {
        sendTelegramMessage(headline);
    });
};

function sendTelegramMessage(headline, callback) {
    request.post({
        url: 'https://api.telegram.org/bot' + config.telegram.token + '/sendMessage',
        form: {
            chat_id: config.telegram.channelId,
            text: headline
        }
    }, function(err, httpResponse, body) {
        // TODO error handling
    });
}
