const nodemailer = require("nodemailer");
const axios = require("axios");
const Mailjet = require("node-mailjet");
const config = require("../config");

/*
    mail should have:
    - from
    - to
    - subject
    - text
*/
module.exports.sendRawMail = async (mail) => {
    if (config.mail === "mailjet") {
        const client = new Mailjet({
            apiKey: config.mailParams.apiKey,
            apiSecret: config.mailParams.apiSecret,
        });

        const response = await client.post("send", { version: "v3.1" }).request({
            Messages: [
                {
                    From: {
                        Email: mail.from,
                        Name: "Wetten2024",
                    },
                    To: [
                        {
                            Email: mail.to,
                        },
                    ],
                    Subject: mail.subject,
                    TextPart: mail.text,
                },
            ],
        });
    } else if (config.mail === "smtp") {
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
