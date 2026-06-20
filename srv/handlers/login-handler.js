"use strict";

const crypto = require("crypto");

/**
 * Handler d'authentification.
 * Ce fichier contient uniquement la logique du login.
 */

module.exports = function registerLoginHandler(srv, entities, helpers) {
    const { Users } = entities;
    const { reject } = helpers;

    srv.on("login", async (req) => {
        const identifier = String(req.data.email || req.data.username || "").trim().toLowerCase();
        const password = String(req.data.password || "");

        if (!identifier || !password) {
            return reject(req, "Identifiant et mot de passe requis.");
        }

        const canonicalIdentifier = resolveDemoAlias(identifier);

        let user = await SELECT.one
            .from(Users)
            .where({ email: canonicalIdentifier });

        if (!user) {
            user = await SELECT.one
                .from(Users)
                .where({ username: identifier });
        }

        // Compatibilite avec les bases existantes ou l'e-mail etait stocke
        // dans la colonne username.
        if (!user && canonicalIdentifier !== identifier) {
            user = await SELECT.one
                .from(Users)
                .where({ username: canonicalIdentifier });
        }

        if (!user || !verifyPassword(password, user.password)) {
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

function resolveDemoAlias(identifier) {
    const aliases = {
        planificateur: "youssef.louzi.plan@sepur.com",
        planner: "youssef.louzi.plan@sepur.com",
        superviseur: "youssef.louzi.sup@sepur.com",
        supervisor: "youssef.louzi.sup@sepur.com"
    };

    return aliases[identifier] || identifier;
}

function verifyPassword(password, storedPassword) {
    const parts = String(storedPassword || "").split("$");

    if (parts.length !== 3 || parts[0] !== "scrypt") {
        return false;
    }

    try {
        const expected = Buffer.from(parts[2], "hex");
        const actual = crypto.scryptSync(password, parts[1], expected.length);

        return expected.length > 0 && crypto.timingSafeEqual(actual, expected);
    } catch (error) {
        return false;
    }
}
