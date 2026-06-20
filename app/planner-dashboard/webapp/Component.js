sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
    "use strict";

    return UIComponent.extend("sepur.planner.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            const sUser = localStorage.getItem("sepur.user") || sessionStorage.getItem("sepur.user");

            if (!sUser) {
                window.location.href = "/login/webapp/index.html";
                return;
            }

            try {
                const oUser = JSON.parse(sUser);

                const sRole = String(oUser.role || "").trim().toUpperCase();

                if (sRole !== "PLANIFICATEUR" && sRole !== "PLANNER" && sRole !== "ADMIN") {
                    window.location.href = "/login/webapp/index.html";
                    return;
                }

                oUser.role = sRole;

                this.setModel(new JSONModel({
                    user: oUser
                }), "session");

                const oDataModel = this.getModel();
                if (oDataModel && typeof oDataModel.changeHttpHeaders === "function") {
                    oDataModel.changeHttpHeaders({ "X-Sepur-User-Id": oUser.ID });
                }

            } catch (e) {
                window.location.href = "/login/webapp/index.html";
            }
        }
    });
});
