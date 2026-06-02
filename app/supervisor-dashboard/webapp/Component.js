sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
    "use strict";

    return UIComponent.extend("sepur.supervisor.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            const raw = localStorage.getItem("sepur.user");

            if (!raw) {
                window.location.href = "/login/webapp/index.html";
                return;
            }

            const user = JSON.parse(raw);

            if (user.role !== "SUPERVISEUR") {
                window.location.href = "/login/webapp/index.html";
                return;
            }

            this.setModel(new JSONModel({
                user: user,
                userInitials: this._getInitials(user.fullName),
                selectedModule: "TOURS",
                // chartTitle: "Répartition des tournées par statut",
                // chartSubtitle: "Statistiques des tournées créées dans le système",
                chartData: [],
                notifications: {
                    count: 0,
                    items: []
                }
            }), "view");
        },

        _getInitials: function (name) {
            if (!name) {
                return "SU";
            }

            return name
                .split(" ")
                .map(function (part) {
                    return part.charAt(0);
                })
                .join("")
                .substring(0, 2)
                .toUpperCase();
        }
    });
});