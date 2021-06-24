const nodemailer = require("nodemailer");
const axios = require("axios");
const config = require("../config");

module.exports.sendRawMail = async (mail) => {
    if (config.mail === "smtp") {
        const transporter = nodemailer.createTransport(config.mailParams);
        return new Promise((resolve, reject) => {
            transporter.sendMail(mail, (error, info) => {
                if (error) {
                    return reject(error);
                }
                resolve(info);
            });
        });
    } else if (config.mail === "mailgun") {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(mail)) {
            params.append(key, value);
        }

        const { data } = await axios.post(
            `https://${config.mailParams.host}/v3/${config.mailParams.domain}/messages`,
            params.toString(),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                auth: {
                    username: "api",
                    password: config.mailParams.apiKey,
                },
            }
        );

        return data;
    } else {
        console.log(mail);
    }
};
