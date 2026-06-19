"use strict";

/**
 * Handler d'authentification.
 * Ce fichier contient uniquement la logique du login.
 */

module.exports = function registerLoginHandler(srv, entities, helpers) {
    const { Users } = entities;
    const { reject } = helpers;

    srv.on("login", async (req) => {
        const email = String(req.data.email || req.data.username || "").trim().toLowerCase();
        const password = String(req.data.password || "");

        if (!email || !password) {
            return reject(req, "E-mail et mot de passe requis.");
        }

        let user = await SELECT.one
            .from(Users)
            .where({
                email,
                password
            });

        if (!user) {
            user = await SELECT.one
                .from(Users)
                .where({
                    username: email,
                    password
                });
        }

        if (!user) {
            return reject(req, "Identifiants incorrects.", 401);
        }

        if (!user.active) {
            return reject(req, "Utilisateur inactif.", 403);
        }

        return {
            ID: user.ID,
            email: user.email,
            username: user.username,
            fullName: user.fullName,
            role: String(user.role || "").trim().toUpperCase(),
            active: user.active
        };
    });
};
