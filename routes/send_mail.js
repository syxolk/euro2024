const nodemailer = require('nodemailer');
const config = require('../config');

module.exports.sendRawMail = (mail) => {
    if(config.mail === "smtp") {
        const transporter = nodemailer.createTransport(config.mailParams);
        return new Promise((resolve, reject) => {
            transporter.sendMail(mail, (error, info) => {
                if(error) {
                    return reject(error);
                }
                resolve(info);
            });
        });
    } else if(config.mail === "mailgun") {
        const mailgun = require('mailgun-js')(config.mailParams);
        return new Promise((resolve, reject) => {
            mailgun.messages().send(mail, (err, body) => {
                if(err) {
                    return reject(err);
                }
                resolve(body);
            });
        });
    }
};
