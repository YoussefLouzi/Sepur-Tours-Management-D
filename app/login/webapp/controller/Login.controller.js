sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, MessageBox, JSONModel) {
    "use strict";

    return Controller.extend("sepur.login.controller.Login", {
        onInit: function () {
            this.getView().setModel(new JSONModel({
                username: "",
                password: ""
            }));
        },

        _normalizeRole: function (sRole) {
            return String(sRole || "").trim().toUpperCase();
        },

        _getDefaultUrlForRole: function (sRole) {
            const sNormalizedRole = this._normalizeRole(sRole);

            if (sNormalizedRole === "PLANIFICATEUR" || sNormalizedRole === "PLANNER") {
                return "/planner-dashboard/webapp/index.html";
            }

            if (sNormalizedRole === "SUPERVISEUR" || sNormalizedRole === "SUPERVISOR") {
                return "/supervisor-dashboard/webapp/index.html";
            }

            if (sNormalizedRole === "ADMIN") {
                return "/home/webapp/index.html";
            }

            return "";
        },

        _getAllowedPathsForRole: function (sRole) {
            const sNormalizedRole = this._normalizeRole(sRole);
            const aCommonPaths = [
                "/home/webapp/index.html"
            ];
            const aPlannerPaths = [
                "/planner-dashboard/webapp/index.html",
                "/tours/webapp/index.html",
                "/roadmaps/webapp/index.html"
            ];
            const aSupervisorPaths = [
                "/supervisor-dashboard/webapp/index.html",
                "/supervisor-tours/webapp/index.html",
                "/supervisor-roadmaps/webapp/index.html"
            ];

            if (sNormalizedRole === "PLANIFICATEUR" || sNormalizedRole === "PLANNER") {
                return aCommonPaths.concat(aPlannerPaths);
            }

            if (sNormalizedRole === "SUPERVISEUR" || sNormalizedRole === "SUPERVISOR") {
                return aCommonPaths.concat(aSupervisorPaths);
            }

            if (sNormalizedRole === "ADMIN") {
                return aCommonPaths.concat(aPlannerPaths, aSupervisorPaths);
            }

            return [];
        },

        _getRedirectUrl: function (sRole) {
            const oParams = new URLSearchParams(window.location.search || "");
            const sRedirect = oParams.get("redirect");

            if (sRedirect && sRedirect.charAt(0) === "/" && sRedirect.charAt(1) !== "/") {
                const sPath = sRedirect.split(/[?#]/, 1)[0];
                const aAllowedPaths = this._getAllowedPathsForRole(sRole);

                if (aAllowedPaths.indexOf(sPath) !== -1) {
                    return sRedirect;
                }
            }

            return this._getDefaultUrlForRole(sRole);
        },

        _saveSession: function (oUser) {
            const bRemember = !!(this.byId("chkRemember") && this.byId("chkRemember").getSelected());
            const sValue = JSON.stringify(oUser);
            const oStorage = bRemember ? localStorage : sessionStorage;

            ["sepur.user", "currentUser", "sepurUser"].forEach(function (sKey) {
                localStorage.removeItem(sKey);
                sessionStorage.removeItem(sKey);
                oStorage.setItem(sKey, sValue);
            });
        },

        _getErrorMessage: function (oError) {
            const sFallback = "Échec de la connexion. Vérifiez vos identifiants.";
            const sTechnicalPattern = /(?:stack|sql|sqlite|hana|no handler|no such|internal|\.js:\d+|[a-z]:\\|\/home\/|\/srv\/|at\s+\w+)/i;
            let sMessage = "";

            if (!oError) {
                return sFallback;
            }

            if (oError.error && oError.error.message) {
                sMessage = oError.error.message.value || oError.error.message;
            } else if (oError.cause && oError.cause.message) {
                sMessage = oError.cause.message;
            } else {
                sMessage = oError.message || "";
            }

            return sMessage && !sTechnicalPattern.test(String(sMessage))
                ? String(sMessage)
                : sFallback;
        },

        onLogin: async function () {
            const oData = this.getView().getModel().getData();
            const sUser = (oData.username || "").trim().toLowerCase();
            const sPass = oData.password || "";
            const oStrip = this.byId("msgError");

            oStrip.setVisible(false);

            if (!sUser || !sPass) {
                oStrip.setText("Veuillez saisir l'adresse e-mail et le mot de passe.");
                oStrip.setVisible(true);
                return;
            }

            try {
                const oModel = this.getOwnerComponent().getModel();
                const oContext = oModel.bindContext("/login(...)");

                oContext.setParameter("username", sUser);
                oContext.setParameter("password", sPass);

                await oContext.execute();

                const oResult = oContext.getBoundContext().getObject();

                if (!oResult || !oResult.active) {
                    throw new Error("Utilisateur inactif ou introuvable.");
                }

                oResult.role = this._normalizeRole(oResult.role);
                this._saveSession(oResult);

                MessageToast.show("Bienvenue " + (oResult.fullName || oResult.username || ""));

                const sTargetUrl = this._getRedirectUrl(oResult.role);

                if (!sTargetUrl) {
                    throw new Error("Rôle utilisateur non reconnu.");
                }

                window.location.href = sTargetUrl;

            } catch (e) {
                this.getView().getModel().setProperty("/password", "");
                oStrip.setText(this._getErrorMessage(e));
                oStrip.setVisible(true);
                this.byId("inpPassword").focus();
            }
        },

        onForgotPassword: function () {
            MessageBox.information(
                "Cette option sera disponible après l'intégration de SAP BTP XSUAA.",
                {
                    title: "Mot de passe oublié"
                }
            );
        },

        onBackHome: function () {
            window.location.href = "/home/webapp/index.html";
        },

        onTogglePasswordVisibility: function () {
            const oInput = this.byId("inpPassword");
            const sType = oInput.getType();

            if (sType === "Password") {
                oInput.setType("Text");
                oInput.setValueHelpIconSrc("sap-icon://hide");
            } else {
                oInput.setType("Password");
                oInput.setValueHelpIconSrc("sap-icon://show");
            }
        }
    });
});
