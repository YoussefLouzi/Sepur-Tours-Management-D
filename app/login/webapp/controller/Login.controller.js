sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, JSONModel) {
    "use strict";

  // Authentification locale — remplacer par XSUAA / App Router en production BTP
    return Controller.extend("sepur.login.controller.Login", {
        onInit: function () {
            this.getView().setModel(new JSONModel({ username: "", password: "" }));
        },

        onLogin: async function () {
            const oData = this.getView().getModel().getData();
            const sUser = (oData.username || "").trim();
            const sPass = oData.password || "";
            const oStrip = this.byId("msgError");

            if (!sUser || !sPass) {
                oStrip.setVisible(true);
                oStrip.setText("Veuillez saisir le nom d'utilisateur et le mot de passe.");
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
                    throw new Error("Utilisateur inactif.");
                }

                localStorage.setItem("sepur.user", JSON.stringify(oResult));
                MessageToast.show("Connexion réussie — " + oResult.fullName);

                if (oResult.role === "PLANIFICATEUR") {
                    window.location.href = "/planner-dashboard/webapp/index.html";
                } else if (oResult.role === "SUPERVISEUR") {
                    window.location.href = "/supervisor-dashboard/webapp/index.html";
                } else {
                    throw new Error("Rôle utilisateur non reconnu.");
                }
            } catch (e) {
                oStrip.setVisible(true);
                oStrip.setText(e.message || "Échec de la connexion. Vérifiez vos identifiants.");
            }
        }
    });
});
