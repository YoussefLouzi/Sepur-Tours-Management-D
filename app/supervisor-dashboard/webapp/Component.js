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

            const raw = localStorage.getItem("sepur.user") || sessionStorage.getItem("sepur.user");

            if (!raw) {
                window.location.href = "/login/webapp/index.html";
                return;
            }

            let user;

            try {
                user = JSON.parse(raw);
            } catch (error) {
                localStorage.removeItem("sepur.user");
                sessionStorage.removeItem("sepur.user");
                window.location.href = "/login/webapp/index.html";
                return;
            }

            const role = String(user.role || "").trim().toUpperCase();

            if (role !== "SUPERVISEUR" && role !== "SUPERVISOR" && role !== "ADMIN") {
                window.location.href = "/login/webapp/index.html";
                return;
            }

            user.role = role;

            this.setModel(new JSONModel({
                busy: false,

                user: user,
                userInitials: this._getInitials(user.fullName),

                tourStats: {
                    totalTours: 0,
                    pendingTours: 0,
                    acceptedTours: 0,
                    rejectedTours: 0,
                    assignedTours: 0,
                    completedTours: 0,
                    cancelledTours: 0,
                    overdueTours: 0
                },

                roadmapStats: {
                    totalRoadmaps: 0,
                    createdRoadmaps: 0,
                    validatedRoadmaps: 0,
                    rejectedRoadmaps: 0,
                    completedRoadmaps: 0,
                    cancelledRoadmaps: 0,
                    overdueRoadmaps: 0,
                    integratedRoadmaps: 0
                },

                salesOrderStats: {
                    totalSalesOrders: 0
                },

                historyStats: {
                    totalDecisions: 0,
                    acceptedDecisions: 0,
                    rejectedDecisions: 0
                },

                tourDonutData: [],
                roadmapBarData: [],

                notifications: {
                    count: 0,
                    items: [],
                    lastSync: "-"
                }
            }), "view");

            const oDataModel = this.getModel();
            if (oDataModel && typeof oDataModel.changeHttpHeaders === "function") {
                oDataModel.changeHttpHeaders({ "X-Sepur-User-Id": user.ID });
            }
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
