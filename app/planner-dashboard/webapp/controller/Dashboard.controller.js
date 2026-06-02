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

            const oModel = new JSONModel({
                user: oUser,
                stats: {
                    totalTours: 0,
                    draftTours: 0,
                    pendingTours: 0,
                    acceptedTours: 0,
                    rejectedTours: 0,
                    totalRoadmaps: 0
                },
                tours: []
            });

            this.getView().setModel(oModel);
            this.loadDashboardData();
        },

        loadDashboardData: async function () {
            const oModel = this.getView().getModel();
            const oUser = oModel.getProperty("/user");

            try {
                await Promise.all([
                    this.loadStats(oUser.ID),
                    this.loadTours()
                ]);
            } catch (e) {
                MessageToast.show("Impossible de charger les données du dashboard.");
            }
        },

        loadStats: async function (sUserID) {
            const oModel = this.getView().getModel();

            try {
                const oODataModel = this.getOwnerComponent().getModel();
                const oContext = oODataModel.bindContext("/getPlannerStats(...)");

                oContext.setParameter("userID", sUserID || null);

                await oContext.execute();

                const oResult = oContext.getBoundContext().getObject();

                oModel.setProperty("/stats", {
                    totalTours: oResult.totalTours || 0,
                    draftTours: oResult.draftTours || 0,
                    pendingTours: oResult.pendingTours || 0,
                    acceptedTours: oResult.acceptedTours || 0,
                    rejectedTours: oResult.rejectedTours || 0,
                    totalRoadmaps: oResult.totalRoadmaps || 0
                });

            } catch (e) {
                console.error("Erreur stats planificateur", e);
                MessageToast.show("Impossible de charger les statistiques.");
            }
        },

        loadTours: async function () {
            const oModel = this.getView().getModel();

            try {
                const response = await fetch("/odata/v4/route-management/Tours?$top=5&$orderby=createdAt desc");

                if (!response.ok) {
                    throw new Error("Erreur lors du chargement des tournées.");
                }

                const data = await response.json();
                oModel.setProperty("/tours", data.value || []);

            } catch (e) {
                console.error("Erreur chargement tournées", e);
                oModel.setProperty("/tours", []);
                MessageToast.show("Impossible de charger les tournées.");
            }
        },

        onRefresh: function () {
            this.loadDashboardData();
            MessageToast.show("Données actualisées.");
        },

        onCreateTour: function () {
            window.location.href = "/tours/webapp/index.html";
        },

        onOpenTours: function () {
            window.location.href = "/tours/webapp/index.html";
        },

        onOpenRoadmaps: function () {
            window.location.href = "/roadmaps/webapp/index.html";
        },

        onTourPress: function () {
            window.location.href = "/tours/webapp/index.html";
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