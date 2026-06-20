"use strict";

/**
 * Authentification simple pour la demonstration PFE.
 * Les identifiants historiques et actuels restent acceptes.
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
            return reject(req, "Identifiant et mot de passe requis.");
        }

        const demoProfile = getDemoProfile(identifier);
        const canonicalIdentifier = demoProfile ? demoProfile.email : identifier;
        let user = await findUser(Users, identifier, canonicalIdentifier, demoProfile);

        if (demoProfile && !getDemoPassword(demoProfile)) {
            return reject(
                req,
                "Le mot de passe de démonstration n'est pas configuré sur le serveur.",
                503,
                { code: "AUTH_CONFIG_MISSING" }
            );
        }

        if (!user || !isPasswordValid(password, user.password, demoProfile)) {
            return reject(req, "Identifiants incorrects.", 401);
        }

        if (!user.active) {
            return reject(req, "Utilisateur inactif.", 403);
        }

        if (demoProfile) {
            const updates = {
                email: demoProfile.email,
                username: demoProfile.username,
                fullName: demoProfile.fullName,
                role: demoProfile.role
            };

            await UPDATE(Users)
                .set(updates)
                .where({ ID: user.ID });

            user = Object.assign(user, updates);
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

async function findUser(Users, identifier, canonicalIdentifier, demoProfile) {
    let user = await SELECT.one.from(Users).where({ email: canonicalIdentifier });

    if (!user) {
        user = await SELECT.one.from(Users).where({ username: identifier });
    }

    if (!user && canonicalIdentifier !== identifier) {
        user = await SELECT.one.from(Users).where({ username: canonicalIdentifier });
    }

    if (!user && demoProfile) {
        user = await SELECT.one.from(Users).where({ role: demoProfile.role });
    }

    return user;
}

function isPasswordValid(password, storedPassword, demoProfile) {
    if (demoProfile) {
        return password === getDemoPassword(demoProfile);
    }

    return password === String(storedPassword || "");
}

function getDemoPassword(demoProfile) {
    return String(process.env[demoProfile.passwordEnv] || "");
}

function getDemoProfile(identifier) {
    const profiles = [
        {
            role: "PLANIFICATEUR",
            email: "youssef.louzi.plan@sepur.com",
            username: "planificateur",
            passwordEnv: "DEMO_PLANNER_PASSWORD",
            fullName: "Youssef Louzi - Planificateur",
            identifiers: [
                "planificateur",
                "planner",
                "youssef.louzi.plan@sepur.com",
                "oussama.benkacem.plan@sepur.com"
            ]
        },
        {
            role: "SUPERVISEUR",
            email: "youssef.louzi.sup@sepur.com",
            username: "superviseur",
            passwordEnv: "DEMO_SUPERVISOR_PASSWORD",
            fullName: "Youssef Louzi - Superviseur",
            identifiers: [
                "superviseur",
                "supervisor",
                "youssef.louzi.sup@sepur.com",
                "oussama.benkacem.sup@sepur.com"
            ]
        }
    ];

    return profiles.find(function (profile) {
        return profile.identifiers.includes(identifier);
    }) || null;
}
