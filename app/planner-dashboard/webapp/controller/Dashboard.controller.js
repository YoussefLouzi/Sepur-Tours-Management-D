sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("sepur.planner.controller.Dashboard", {
        onInit: function () {
            this._loadStats();
            this._loadTours();
        },

        _getUser: function () {
            return this.getOwnerComponent().getModel("view").getProperty("/user");
        },

        _loadStats: async function () {
            const user = this._getUser();
            try {
                const oModel = this.getView().getModel();
                const oCtx = oModel.bindContext(`/getPlannerStats(userID=${user.ID})`);
                await oCtx.execute();
                const stats = oCtx.getBoundContext().getObject();
                this.getOwnerComponent().getModel("view").setProperty("/stats", stats);
            } catch (e) {
                MessageToast.show("Impossible de charger les statistiques.");
            }
        },

        _loadTours: async function () {
            try {
                const oModel = this.getView().getModel();
                const oList = oModel.bindList("/Tours", undefined, undefined, undefined, {
                    $orderby: "tourDate desc",
                    $top: 20
                });
                const aContexts = await oList.requestContexts(0, 20);
                const oJson = new sap.ui.model.json.JSONModel(aContexts.map((c) => c.getObject()));
                this.getView().setModel(oJson, "tours");
            } catch (e) {
                MessageToast.show("Impossible de charger les tournées.");
            }
        },

        onLogout: function () {
            localStorage.removeItem("sepur.user");
            window.location.href = "/login/webapp/index.html";
        },

        onCreateTour: function () {
            window.location.href = "/tours/webapp/index.html#/Tours?$action=create";
        },

        onOpenTours: function () {
            window.location.href = "/tours/webapp/index.html";
        },

        onOpenRoadmaps: function () {
            window.location.href = "/roadmaps/webapp/index.html";
        },

        onSubmitTour: async function (oEvent) {
            const tour = oEvent.getSource().getBindingContext("tours").getObject();
            try {
                const oModel = this.getView().getModel();
                const oAction = oModel.bindContext("/submitTour(...)");
                oAction.setParameter("tourID", tour.ID);
                await oAction.execute();
                MessageToast.show("Tournée soumise au superviseur.");
                this._loadStats();
                this._loadTours();
            } catch (e) {
                MessageBox.error(e.message || "Échec de la soumission.");
            }
        },

        onCreateRoadmap: async function (oEvent) {
            const tour = oEvent.getSource().getBindingContext("tours").getObject();
            try {
                const oModel = this.getView().getModel();
                const oAction = oModel.bindContext("/createRoadmapFromTour(...)");
                oAction.setParameter("tourID", tour.ID);
                await oAction.execute();
                MessageToast.show("Roadmap créée avec succès.");
                this._loadStats();
            } catch (e) {
                MessageBox.error(e.message || "Impossible de créer la roadmap.");
            }
        }
    });
});
