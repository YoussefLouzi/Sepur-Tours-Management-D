sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("sepur.planner.controller.Dashboard", {
        onInit: function () {
            const sUser = localStorage.getItem("sepur.user");

            if (!sUser) {
                window.location.href = "/login/webapp/index.html";
                return;
            }

            const oUser = JSON.parse(sUser);

            if (oUser.role !== "PLANIFICATEUR") {
                MessageBox.error("Accès refusé. Ce dashboard est réservé au Planificateur.");
                window.location.href = "/login/webapp/index.html";
                return;
            }

            this.getView().setModel(new JSONModel({
                user: oUser,
                userInitials: this.getInitials(oUser.fullName),
                stats: {
                    totalTours: 0,
                    draftTours: 0,
                    pendingTours: 0,
                    acceptedTours: 0,
                    rejectedTours: 0,
                    totalRoadmaps: 0
                },
                chart: {
                    draftPercent: 0,
                    pendingPercent: 0,
                    acceptedPercent: 0,
                    rejectedPercent: 0
                },
                tours: []
            }));

            this.loadDashboardData();
        },

        getInitials: function (sName) {
            if (!sName) {
                return "DU";
            }

            return sName
                .split(" ")
                .map(function (sPart) {
                    return sPart.charAt(0);
                })
                .join("")
                .substring(0, 2)
                .toUpperCase();
        },

        loadDashboardData: async function () {
            await Promise.all([
                this.loadStats(),
                this.loadTours()
            ]);
        },

        loadStats: async function () {
            const oModel = this.getView().getModel();
            const oUser = oModel.getProperty("/user");

            try {
                const oODataModel = this.getOwnerComponent().getModel();
                const oContext = oODataModel.bindContext("/getPlannerStats(...)");

                oContext.setParameter("userID", oUser.ID || null);

                await oContext.execute();

                const oResult = oContext.getBoundContext().getObject();

                const oStats = {
                    totalTours: oResult.totalTours || 0,
                    draftTours: oResult.draftTours || 0,
                    pendingTours: oResult.pendingTours || 0,
                    acceptedTours: oResult.acceptedTours || 0,
                    rejectedTours: oResult.rejectedTours || 0,
                    totalRoadmaps: oResult.totalRoadmaps || 0
                };

                oModel.setProperty("/stats", oStats);
                this.updateChart(oStats);

            } catch (e) {
                console.error(e);
                MessageToast.show("Impossible de charger les statistiques.");
            }
        },

        updateChart: function (oStats) {
            const oModel = this.getView().getModel();
            const total = oStats.totalTours || 1;

            oModel.setProperty("/chart", {
                draftPercent: Math.round((oStats.draftTours / total) * 100),
                pendingPercent: Math.round((oStats.pendingTours / total) * 100),
                acceptedPercent: Math.round((oStats.acceptedTours / total) * 100),
                rejectedPercent: Math.round((oStats.rejectedTours / total) * 100)
            });
        },

        loadTours: async function () {
            const oModel = this.getView().getModel();

            try {
                const response = await fetch("/odata/v4/route-management/Tours?$top=6&$orderby=createdAt desc");

                if (!response.ok) {
                    throw new Error("Erreur chargement tournées");
                }

                const data = await response.json();
                oModel.setProperty("/tours", data.value || []);

            } catch (e) {
                console.error(e);
                MessageToast.show("Impossible de charger les tournées.");
            }
        },

        onRefresh: function () {
            this.loadDashboardData();
            MessageToast.show("Données actualisées.");
        },

        onCreateTour: function () {
            window.location.href = "/tour-workspace/webapp/index.html";
        },

        onOpenTours: function () {
            window.location.href = "/tour-workspace/webapp/index.html";
        },

        onOpenRoadmaps: function () {
            window.location.href = "/roadmaps/webapp/index.html";
        },

        onLogout: function () {
            localStorage.removeItem("sepur.user");
            window.location.href = "/login/webapp/index.html";
        },

        formatStatusState: function (sStatus) {
            switch (sStatus) {
                case "ACCEPTED":
                    return "Success";
                case "PENDING":
                    return "Warning";
                case "REJECTED":
                    return "Error";
                case "DRAFT":
                    return "Information";
                default:
                    return "None";
            }
        }
    });
});