sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, MessageBox, JSONModel) {
    "use strict";

    return Controller.extend("sepur.supervisor.controller.Dashboard", {
        onInit: function () {
            this._refreshAll();
        },

        _getUser: function () {
            return this.getOwnerComponent().getModel("view").getProperty("/user");
        },

        _refreshAll: function () {
            this._loadStats();
            this._loadPending();
            this._loadRoadmaps();
            this._loadHistory();
        },

        _loadStats: async function () {
            try {
                const oModel = this.getView().getModel();
                const oCtx = oModel.bindContext("/getSupervisorStats(...)");
                await oCtx.execute();
                this.getOwnerComponent().getModel("view").setProperty("/stats", oCtx.getBoundContext().getObject());
            } catch (e) {
                MessageToast.show("Erreur statistiques superviseur.");
            }
        },

        _loadPending: async function () {
            try {
                const oModel = this.getView().getModel();
                const oCtx = oModel.bindContext("/getPendingTours(...)");
                await oCtx.execute();
                const data = oCtx.getBoundContext().getObject();
                const list = Array.isArray(data) ? data : (data.value || []);
                this.getView().setModel(new JSONModel(list), "pending");
            } catch (e) {
                this.getView().setModel(new JSONModel([]), "pending");
            }
        },

        _loadRoadmaps: async function () {
            try {
                const oModel = this.getView().getModel();
                const oList = oModel.bindList("/Roadmaps", undefined, undefined, undefined, {
                    $expand: "tour($select=tourCode)",
                    $orderby: "roadmapCode",
                    $top: 50
                });
                const aCtx = await oList.requestContexts(0, 50);
                const rows = aCtx.map((c) => {
                    const o = c.getObject();
                    o.tourCode = o.tour?.tourCode || "";
                    return o;
                });
                this.getView().setModel(new JSONModel(rows), "roadmaps");
            } catch (e) {
                this.getView().setModel(new JSONModel([]), "roadmaps");
            }
        },

        _loadHistory: async function () {
            try {
                const oModel = this.getView().getModel();
                const oList = oModel.bindList("/DecisionHistories", undefined, undefined, undefined, {
                    $orderby: "decisionDate desc",
                    $top: 30
                });
                const aCtx = await oList.requestContexts(0, 30);
                this.getView().setModel(new JSONModel(aCtx.map((c) => c.getObject())), "history");
            } catch (e) {
                this.getView().setModel(new JSONModel([]), "history");
            }
        },

        onLogout: function () {
            localStorage.removeItem("sepur.user");
            window.location.href = "/login/webapp/index.html";
        },

        onOpenTours: function () {
            window.location.href = "/tours/webapp/index.html";
        },

        onOpenRoadmaps: function () {
            window.location.href = "/roadmaps/webapp/index.html";
        },

        onAccept: async function (oEvent) {
            const tour = oEvent.getSource().getBindingContext("pending").getObject();
            const supervisor = this._getUser();
            try {
                const oModel = this.getView().getModel();
                const oAction = oModel.bindContext("/acceptTour(...)");
                oAction.setParameter("tourID", tour.ID);
                oAction.setParameter("supervisorID", supervisor.ID);
                await oAction.execute();
                MessageToast.show("Tournée acceptée.");
                this._refreshAll();
            } catch (e) {
                MessageBox.error(e.message || "Échec de l'acceptation.");
            }
        },

        onReject: function (oEvent) {
            const tour = oEvent.getSource().getBindingContext("pending").getObject();
            const supervisor = this._getUser();
            const that = this;

            MessageBox.prompt("Motif de refus (obligatoire)", {
                title: "Rejeter la tournée " + tour.tourCode,
                onClose: async function (sAction, oParams) {
                    if (sAction !== MessageBox.Action.OK) return;
                    const reason = (oParams && oParams.value || "").trim();
                    if (!reason) {
                        MessageBox.error("Le motif de refus est obligatoire.");
                        return;
                    }
                    try {
                        const oModel = that.getView().getModel();
                        const oAction = oModel.bindContext("/rejectTour(...)");
                        oAction.setParameter("tourID", tour.ID);
                        oAction.setParameter("supervisorID", supervisor.ID);
                        oAction.setParameter("reason", reason);
                        await oAction.execute();
                        MessageToast.show("Tournée rejetée.");
                        that._refreshAll();
                    } catch (e) {
                        MessageBox.error(e.message || "Échec du rejet.");
                    }
                }
            });
        }
    });
});
