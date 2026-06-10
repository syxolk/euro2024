/**
 * This was adapted from the original connect-flash package, which is licensed under the MIT License.
 *
 * See: https://www.npmjs.com/package/connect-flash
 */

import { format } from "util";
import type { Request, Response, NextFunction } from "express";

type FlashMessages = Record<string, string[]>;

declare module "express-serve-static-core" {
    interface Request {
        flash(type: string, message: string): void;
        flash(type: string): string[];
        flash(): FlashMessages;
    }
}

declare module "express-session" {
    interface SessionData {
        flash?: FlashMessages;
    }
}

function _flash(
    this: Request & { session: { flash?: FlashMessages } },
    type?: string,
    msg?: string | string[],
    ...rest: string[]
): string[] | FlashMessages | number | void {
    if (this.session === undefined)
        throw new Error("req.flash() requires sessions");
    const msgs: FlashMessages = (this.session.flash = this.session.flash || {});

    if (type && msg !== undefined) {
        if (rest.length > 0) {
            // format-string style: flash('type', 'hello %s', name)
            const formatted = format(msg as string, ...rest);
            (msgs[type] = msgs[type] || []).push(formatted);
            return msgs[type].length;
        } else if (Array.isArray(msg)) {
            msg.forEach((val) => {
                (msgs[type] = msgs[type] || []).push(val);
            });
            return msgs[type].length;
        }
        return (msgs[type] = msgs[type] || []).push(msg as string);
    } else if (type) {
        const arr = msgs[type];
        delete msgs[type];
        return arr || [];
    } else {
        this.session.flash = {};
        return msgs;
    }
}

export default function connectFlash() {
    return function (req: Request, _res: Response, next: NextFunction): void {
        if (!req.flash) {
            const flash = _flash.bind(req) as Request["flash"];
            req.flash = flash;
        }
        next();
    };
}
