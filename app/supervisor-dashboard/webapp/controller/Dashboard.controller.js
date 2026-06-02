sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/Popover",
    "sap/m/VBox",
    "sap/m/Text",
    "sap/m/MessageStrip",
    "sap/m/Button",
    "sap/viz/ui5/format/ChartFormatter",
    "sap/viz/ui5/api/env/Format"
], function (
    Controller,
    MessageToast,
    Popover,
    VBox,
    Text,
    MessageStrip,
    Button,
    ChartFormatter,
    Format
) {
    "use strict";

    return Controller.extend("sepur.supervisor.controller.Dashboard", {
        onInit: function () {
            Format.numericFormatter(ChartFormatter.getInstance());
            this._loadDashboard();

            this._notificationInterval = setInterval(() => {
                this._loadNotifications();
            }, 30000);
        },

        onExit: function () {
            if (this._notificationInterval) {
                clearInterval(this._notificationInterval);
            }
        },

        _loadDashboard: async function () {
            await Promise.all([
                this._loadTourStats(),
                this._loadRoadmapStats(),
                this._loadSalesOrderStats(),
                this._loadHistoryStats(),
                this._loadNotifications()
            ]);

            this.onSelectTours();
        },

        _loadTourStats: async function () {
            const viewModel = this.getOwnerComponent().getModel("view");

            try {
                const oModel = this.getView().getModel();
                const oCtx = oModel.bindContext("/getSupervisorStats(...)");

                await oCtx.execute();

                const stats = oCtx.getBoundContext().getObject() || {};

                viewModel.setProperty("/tourStats", {
                    totalTours: stats.totalTours || 0,
                    pendingTours: stats.pendingValidation || 0,
                    acceptedTours: stats.acceptedTours || 0,
                    rejectedTours: stats.rejectedTours || 0
                });

            } catch (e) {
                console.error(e);
                viewModel.setProperty("/tourStats", {
                    totalTours: 0,
                    pendingTours: 0,
                    acceptedTours: 0,
                    rejectedTours: 0
                });
            }
        },

        _loadRoadmapStats: async function () {
            const viewModel = this.getOwnerComponent().getModel("view");

            try {
                const response = await fetch("/odata/v4/route-management/Roadmaps?$top=500");

                if (!response.ok) {
                    throw new Error("Erreur chargement roadmaps");
                }

                const data = await response.json();
                const roadmaps = data.value || [];

                const draft = roadmaps.filter(function (r) {
                    return r.status === "DRAFT" || r.status === "PENDING" || !r.status;
                }).length;

                const active = roadmaps.filter(function (r) {
                    return r.status === "ACTIVE";
                }).length;

                const completed = roadmaps.filter(function (r) {
                    return r.status === "COMPLETED";
                }).length;

                const cancelled = roadmaps.filter(function (r) {
                    return r.status === "CANCELLED" || r.status === "REJECTED";
                }).length;

                viewModel.setProperty("/roadmapStats", {
                    totalRoadmaps: roadmaps.length,
                    draftRoadmaps: draft,
                    activeRoadmaps: active,
                    completedRoadmaps: completed,
                    cancelledRoadmaps: cancelled
                });

            } catch (e) {
                console.error(e);
                viewModel.setProperty("/roadmapStats", {
                    totalRoadmaps: 0,
                    draftRoadmaps: 0,
                    activeRoadmaps: 0,
                    completedRoadmaps: 0,
                    cancelledRoadmaps: 0
                });
            }
        },

        _loadSalesOrderStats: async function () {
            const viewModel = this.getOwnerComponent().getModel("view");

            try {
                const response = await fetch("/odata/v4/route-management/SalesOrders?$top=1&$count=true");

                if (!response.ok) {
                    viewModel.setProperty("/salesOrderStats", {
                        totalSalesOrders: 0
                    });
                    return;
                }

                const data = await response.json();

                viewModel.setProperty("/salesOrderStats", {
                    totalSalesOrders: data["@odata.count"] || 0
                });

            } catch (e) {
                viewModel.setProperty("/salesOrderStats", {
                    totalSalesOrders: 0
                });
            }
        },

        _loadHistoryStats: async function () {
            const viewModel = this.getOwnerComponent().getModel("view");

            try {
                const response = await fetch("/odata/v4/route-management/DecisionHistories?$top=500");

                if (!response.ok) {
                    throw new Error("Erreur chargement historique");
                }

                const data = await response.json();
                const rows = data.value || [];

                viewModel.setProperty("/historyStats", {
                    totalDecisions: rows.length,
                    acceptedDecisions: rows.filter(function (d) {
                        return d.decision === "ACCEPTED";
                    }).length,
                    rejectedDecisions: rows.filter(function (d) {
                        return d.decision === "REJECTED";
                    }).length
                });

            } catch (e) {
                viewModel.setProperty("/historyStats", {
                    totalDecisions: 0,
                    acceptedDecisions: 0,
                    rejectedDecisions: 0
                });
            }
        },

        _loadNotifications: async function () {
    const viewModel = this.getOwnerComponent().getModel("view");
    const notifications = [];

    try {
        const pendingToursResponse = await fetch(
            "/odata/v4/route-management/Tours?$filter=status eq 'PENDING'&$orderby=createdAt desc&$top=100"
        );

        if (pendingToursResponse.ok) {
            const pendingToursData = await pendingToursResponse.json();
            const pendingTours = pendingToursData.value || [];

            if (pendingTours.length > 0) {
                notifications.push({
                    type: "Warning",
                    icon: "sap-icon://pending",
                    title: pendingTours.length + " tournée(s) en attente de validation",
                    description: "Des tournées créées ou soumises par le planificateur attendent une décision du superviseur.",
                    target: "TOURS"
                });
            }

            pendingTours.slice(0, 3).forEach(function (tour) {
                notifications.push({
                    type: "Warning",
                    icon: "sap-icon://map",
                    title: "Tournée à valider : " + (tour.tourCode || "-"),
                    description: "Zone : " + (tour.zone || "-") + " | Type : " + (tour.collectionType || "-"),
                    target: "TOURS"
                });
            });
        }
    } catch (e) {
        console.error("Erreur notifications tournées PENDING", e);
    }

    try {
        const roadmapsResponse = await fetch(
            "/odata/v4/route-management/Roadmaps?$orderby=createdAt desc&$top=100"
        );

        if (roadmapsResponse.ok) {
            const roadmapsData = await roadmapsResponse.json();
            const roadmaps = roadmapsData.value || [];

            const roadmapsToValidate = roadmaps.filter(function (roadmap) {
                return roadmap.status === "DRAFT" ||
                    roadmap.status === "PENDING" ||
                    !roadmap.status;
            });

            if (roadmapsToValidate.length > 0) {
                notifications.push({
                    type: "Information",
                    icon: "sap-icon://journey-arrive",
                    title: roadmapsToValidate.length + " roadmap(s) à vérifier",
                    description: "Des roadmaps sont en brouillon ou en attente de validation.",
                    target: "ROADMAPS"
                });
            }

            roadmapsToValidate.slice(0, 3).forEach(function (roadmap) {
                notifications.push({
                    type: "Information",
                    icon: "sap-icon://document",
                    title: "Roadmap à vérifier : " + (roadmap.roadmapCode || "-"),
                    description: "Statut actuel : " + (roadmap.status || "DRAFT"),
                    target: "ROADMAPS"
                });
            });
        }
    } catch (e) {
        console.error("Erreur notifications roadmaps", e);
    }

    try {
        const modifiedToursResponse = await fetch(
            "/odata/v4/route-management/Tours?$orderby=updatedAt desc&$top=5"
        );

        if (modifiedToursResponse.ok) {
            const modifiedToursData = await modifiedToursResponse.json();
            const modifiedTours = modifiedToursData.value || [];

            modifiedTours
                .filter(function (tour) {
                    return !!tour.updatedAt;
                })
                .slice(0, 3)
                .forEach(function (tour) {
                    notifications.push({
                        type: "Success",
                        icon: "sap-icon://edit",
                        title: "Modification détectée : " + (tour.tourCode || "-"),
                        description: "Statut : " + (tour.status || "-") + " | Dernière modification : " + (tour.updatedAt || "-"),
                        target: "TOURS"
                    });
                });
        }
    } catch (e) {
        console.error("Erreur notifications modifications tournées", e);
    }

    viewModel.setProperty("/notifications", {
        count: notifications.length,
        items: notifications,
        lastSync: new Date().toLocaleString("fr-FR")
    });
},
         
        onOpenNotifications: async function (oEvent) {
    await this._loadNotifications();

    const viewModel = this.getOwnerComponent().getModel("view");
    const notifications = viewModel.getProperty("/notifications/items") || [];
    const lastSync = viewModel.getProperty("/notifications/lastSync") || "-";

    if (this._notificationPopover) {
        this._notificationPopover.destroy();
        this._notificationPopover = null;
    }

    const content = new VBox({
        width: "26rem",
        class: "notificationPopoverContent"
    });

    content.addItem(new Text({
        text: "Dernière synchronisation : " + lastSync,
        class: "notificationSyncText"
    }));

    if (!notifications.length) {
        content.addItem(new MessageStrip({
            text: "Aucune notification pour le moment.",
            type: "Success",
            showIcon: true
        }));
    } else {
        notifications.forEach(function (notification) {
            content.addItem(new MessageStrip({
                text: notification.title + " — " + notification.description,
                type: notification.type,
                showIcon: true,
                class: "notificationItem"
            }));
        });
    }

    content.addItem(new Button({
        text: "Actualiser les notifications",
        icon: "sap-icon://refresh",
        width: "100%",
        class: "sapUiSmallMarginTop",
        press: async () => {
            await this._loadNotifications();
            MessageToast.show("Notifications synchronisées avec la base de données.");
            this._notificationPopover.close();
        }
    }));

    this._notificationPopover = new Popover({
        title: "Notifications",
        placement: "Bottom",
        contentWidth: "28rem",
        content: content
    });

    this._notificationPopover.openBy(oEvent.getSource());
},

        onSelectTours: function () {
            const viewModel = this.getOwnerComponent().getModel("view");
            const s = viewModel.getProperty("/tourStats") || {};

            viewModel.setProperty("/selectedModule", "TOURS");
            viewModel.setProperty("/chartTitle", "Répartition des tournées par statut");
            viewModel.setProperty("/chartSubtitle", "Statistiques des tournées créées dans le système");

            viewModel.setProperty("/chartData", [
                {
                    label: "En attente",
                    value: s.pendingTours || 0
                },
                {
                    label: "Acceptées",
                    value: s.acceptedTours || 0
                },
                {
                    label: "Rejetées",
                    value: s.rejectedTours || 0
                },
                {
                    label: "Total",
                    value: s.totalTours || 0
                }
            ]);

            this._setActiveModule(0);
            this._applyChartSettings("Répartition des tournées par statut", "Statut");
        },

        onSelectRoadmaps: function () {
            const viewModel = this.getOwnerComponent().getModel("view");
            const s = viewModel.getProperty("/roadmapStats") || {};

            viewModel.setProperty("/selectedModule", "ROADMAPS");
            viewModel.setProperty("/chartTitle", "Répartition des roadmaps par statut");
            viewModel.setProperty("/chartSubtitle", "Statistiques des roadmaps générées automatiquement");

            viewModel.setProperty("/chartData", [
                {
                    label: "Brouillon",
                    value: s.draftRoadmaps || 0
                },
                {
                    label: "Active",
                    value: s.activeRoadmaps || 0
                },
                {
                    label: "Terminée",
                    value: s.completedRoadmaps || 0
                },
                {
                    label: "Annulée",
                    value: s.cancelledRoadmaps || 0
                },
                {
                    label: "Total",
                    value: s.totalRoadmaps || 0
                }
            ]);

            this._setActiveModule(1);
            this._applyChartSettings("Répartition des roadmaps par statut", "Statut");
        },

        onSelectSalesOrders: function () {
            const viewModel = this.getOwnerComponent().getModel("view");
            const s = viewModel.getProperty("/salesOrderStats") || {};

            viewModel.setProperty("/selectedModule", "SALESORDERS");
            viewModel.setProperty("/chartTitle", "Répartition des commandes clients");
            viewModel.setProperty("/chartSubtitle", "Statistiques des Sales Orders générées");

            viewModel.setProperty("/chartData", [
                {
                    label: "Sales Orders",
                    value: s.totalSalesOrders || 0
                }
            ]);

            this._setActiveModule(2);
            this._applyChartSettings("Répartition des commandes clients", "Commandes");
        },

        onSelectHistory: function () {
            const viewModel = this.getOwnerComponent().getModel("view");
            const s = viewModel.getProperty("/historyStats") || {};

            viewModel.setProperty("/selectedModule", "HISTORY");
            viewModel.setProperty("/chartTitle", "Historique des décisions");
            viewModel.setProperty("/chartSubtitle", "Statistiques des validations et rejets effectués par le superviseur");

            viewModel.setProperty("/chartData", [
                {
                    label: "Acceptées",
                    value: s.acceptedDecisions || 0
                },
                {
                    label: "Rejetées",
                    value: s.rejectedDecisions || 0
                },
                {
                    label: "Total",
                    value: s.totalDecisions || 0
                }
            ]);

            this._setActiveModule(3);
            this._applyChartSettings("Historique des décisions", "Décisions");
        },

        _setActiveModule: function (index) {
            const items = this.getView().getDomRef()?.querySelectorAll(".moduleItem");

            if (!items) {
                return;
            }

            items.forEach(function (item) {
                item.classList.remove("activeModuleItem");
            });

            if (items[index]) {
                items[index].classList.add("activeModuleItem");
            }
        },

        _applyChartSettings: function (title, categoryTitle) {
    const chart = this.byId("mainColumnChart");

    if (!chart) {
        return;
    }

    chart.setVizProperties({
        title: {
            visible: false
        },
        legend: {
            visible: true,
            position: "right"
        },
        valueAxis: {
            title: {
                visible: true,
                text: "Total"
            }
        },
        categoryAxis: {
            title: {
                visible: true,
                text: categoryTitle
            }
        },
        plotArea: {
            dataLabel: {
                visible: true
            },
            colorPalette: [
                "#2f78bd"
            ],
            drawingEffect: "normal"
        }
    });
},
        onDashboard: function () {
            this.onSelectTours();
        },

        onRefresh: async function () {
            await this._loadDashboard();
            MessageToast.show("Statistiques actualisées.");
        },

        onOpenTours: function () {
            window.location.href = "/tours/webapp/index.html";
        },

        onOpenRoadmaps: function () {
            window.location.href = "/roadmaps/webapp/index.html";
        },

        onLogout: function () {
            localStorage.removeItem("sepur.user");
            window.location.href = "/login/webapp/index.html";
        }
    });
});