import axios from "axios";
import Mailjet from "node-mailjet";
import nodemailer from "nodemailer";

import config from "../config";

/*
    mail should have:
    - from
    - to
    - subject
    - text
*/
interface MailPayload {
    from: string;
    to: string;
    subject: string;
    text: string;
}

export async function sendRawMail(mail: MailPayload) {
    if (config.mail === "mailjet") {
        const mailParams = config.mailParams as {
            apiKey?: string;
            apiSecret?: string;
        };
        const client = new Mailjet({
            apiKey: mailParams.apiKey,
            apiSecret: mailParams.apiSecret,
        });

        await client.post("send", { version: "v3.1" }).request({
            Messages: [
                {
                    From: {
                        Email: mail.from,
                        Name: "Wetten2026",
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
        const mailParams = config.mailParams as {
            host?: string;
            port?: number;
            auth?: {
                user?: string;
                pass?: string;
            };
        };
        const transporter = nodemailer.createTransport(mailParams);
        return new Promise((resolve, reject) => {
            transporter.sendMail(mail, (error, info) => {
                if (error) {
                    return reject(error);
                }
                resolve(info);
            });
        });
    } else if (config.mail === "mailgun") {
        const mailParams = config.mailParams as {
            host?: string;
            domain?: string;
            apiKey?: string;
        };
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(mail)) {
            params.append(key, String(value));
        }

        const { data } = await axios.post(
            `https://${mailParams.host}/v3/${mailParams.domain}/messages`,
            params.toString(),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                auth: {
                    username: "api",
                    password: mailParams.apiKey ?? "",
                },
            }
        );

        return data;
    } else {
        console.log(mail);
    }
}
