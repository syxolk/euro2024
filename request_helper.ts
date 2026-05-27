import type { Request } from "express";

export interface User {
    id: number;
    name?: string;
    email?: string | null;
    admin?: boolean;
    past_matches_last_visited_at?: Date | null;
    googleId?: string | null;
    facebookId?: string | null;
}

interface RequestWithUser extends Request {
    user?: User;
}

export function getUser(req: Request): User | null {
    return (req as RequestWithUser).user ?? null;
}
