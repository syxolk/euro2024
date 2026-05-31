import { Router } from "express";
import { Request, Response } from "express";

import { knex } from "../db";
import { getUser } from "../request_helper";

const router = Router();

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function buildTreeHtml(
    nodeId: number,
    childrenMap: Record<number, { id: number; name: string }[]>
): string {
    const children = childrenMap[nodeId];
    if (!children || children.length === 0) {
        return "";
    }
    const items = children
        .map((child) => {
            const escapedName = escapeHtml(child.name);

            return `<li>${escapedName}${buildTreeHtml(
                child.id,
                childrenMap
            )}</li>`;
        })
        .join("");
    return `<ul>${items}</ul>`;
}

router.get("/admin/invitations", async (req: Request, res: Response) => {
    const user = getUser(req);
    if (!user || user.admin !== true) {
        res.status(404).render("404");
        return;
    }

    const invitations = await knex("invitation")
        .join("user_account as inviter", "inviter.id", "invitation.inviter_id")
        .join("user_account as invitee", "invitee.id", "invitation.invitee_id")
        .select<
            {
                inviter_id: number;
                inviter_name: string;
                invitee_id: number;
                invitee_name: string;
                created_at: Date;
            }[]
        >(
            "inviter.id as inviter_id",
            "inviter.name as inviter_name",
            "invitee.id as invitee_id",
            "invitee.name as invitee_name",
            "invitation.created_at"
        )
        .orderBy("invitation.created_at", "asc");

    // Build an invitation tree: map inviter_id -> list of invitees
    const roots: { id: number; name: string }[] = [];
    const childrenMap: Record<number, { id: number; name: string }[]> = {};
    const inviteeIds = new Set(invitations.map((i) => i.invitee_id));

    for (const inv of invitations) {
        if (!childrenMap[inv.inviter_id]) {
            childrenMap[inv.inviter_id] = [];
        }
        childrenMap[inv.inviter_id].push({
            id: inv.invitee_id,
            name: inv.invitee_name,
        });
        if (!inviteeIds.has(inv.inviter_id)) {
            const alreadyRoot = roots.some((r) => r.id === inv.inviter_id);
            if (!alreadyRoot) {
                roots.push({ id: inv.inviter_id, name: inv.inviter_name });
            }
        }
    }

    let treeHtml = "";
    if (roots.length > 0) {
        const items = roots
            .map((root) => {
                const escapedName = root.name
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");
                return `<li>${escapedName}${buildTreeHtml(
                    root.id,
                    childrenMap
                )}</li>`;
            })
            .join("");
        treeHtml = `<ul>${items}</ul>`;
    }

    res.render("admin_invitations", {
        invitations,
        treeHtml,
    });
});

export default router;
