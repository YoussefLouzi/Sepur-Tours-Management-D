"use strict";

/**
 * Authentification applicative de demonstration pour le PFE.
 * Les identifiants et mots de passe proviennent exclusivement de Users.
 */
module.exports = function registerLoginHandler(srv, entities, helpers) {
    const { Users } = entities;
    const { reject } = helpers;

    srv.on("login", async (req) => {
        const identifier = String(req.data.email || req.data.username || "")
            .trim()
            .toLowerCase();
        const password = String(req.data.password || "");

        if (!identifier || !password) {
            return reject(req, "Identifiant et mot de passe requis.", 400);
        }

        let user = await SELECT.one.from(Users).where({ email: identifier });

        if (!user) {
            user = await SELECT.one.from(Users).where({ username: identifier });
        }

        if (!user || password !== String(user.password || "")) {
            return reject(req, "Identifiants incorrects.", 401);
        }

        if (!user.active) {
            return reject(req, "Ce compte utilisateur est inactif.", 403, { code: "USER_INACTIVE" });
        }

        return {
            ID: user.ID,
            email: user.email,
            username: user.username,
            fullName: user.fullName,
            role: String(user.role || "").trim().toUpperCase(),
            active: true
        };
    });
};
