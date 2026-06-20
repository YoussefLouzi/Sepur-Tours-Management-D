sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Popover",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Text",
    "sap/m/Button",
    "sap/m/Toolbar",
    "sap/m/ToolbarSpacer",
    "sap/m/Title",
    "sap/m/ObjectStatus",
    "sap/ui/core/Icon"
], function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    Popover,
    VBox,
    HBox,
    Text,
    Button,
    Toolbar,
    ToolbarSpacer,
    Title,
    ObjectStatus,
    Icon
) {
    "use strict";

    return Controller.extend("sepur.planner.controller.Dashboard", {

        onInit: function () {
            const sUser = localStorage.getItem("sepur.user") || sessionStorage.getItem("sepur.user");

            if (!sUser) {
                window.location.href = "/login/webapp/index.html";
                return;
            }

            let oUser;

            try {
                oUser = JSON.parse(sUser);
            } catch (e) {
                localStorage.removeItem("sepur.user");
                sessionStorage.removeItem("sepur.user");
                window.location.href = "/login/webapp/index.html";
                return;
            }

            const sRole = String(oUser.role || "").trim().toUpperCase();

            if (sRole !== "PLANIFICATEUR" && sRole !== "PLANNER" && sRole !== "ADMIN") {
                MessageBox.error("Accès refusé. Ce tableau de bord est réservé au planificateur.", {
                    onClose: function () {
                        window.location.href = "/login/webapp/index.html";
                    }
                });
                return;
            }

            oUser.role = sRole;

            this.getView().setModel(new JSONModel({
                busy: false,
                user: oUser,
                userInitials: this.getInitials(oUser.fullName),

                stats: {
                    totalTours: 0,
                    createdTours: 0,
                    validatedTours: 0,
                    rejectedTours: 0,
                    totalRoadmaps: 0,
                    createdRoadmaps: 0,
                    validatedRoadmaps: 0,
                    rejectedRoadmaps: 0
                },

                tourChartData: [],
                roadmapChartData: [],

                notifications: {
                    unreadCount: 0,
                    totalCount: 0,
                    items: [],
                    lastSync: "-"
                }
            }));

            this.loadDashboardData();

            this._notificationInterval = setInterval(function () {
                this._loadNotificationsSilent();
            }.bind(this), 30000);
        },

        onExit: function () {
            if (this._notificationInterval) {
                clearInterval(this._notificationInterval);
                this._notificationInterval = null;
            }

            if (this._notificationPopover) {
                this._notificationPopover.destroy();
                this._notificationPopover = null;
            }
        },

        onAfterRendering: function () {
            this._applyChartDesign();
            this._updateNotificationButtonState();
        },

        _applyChartDesign: function () {
            const oTourChart = this.byId("tourStatusChart");
            const oRoadmapChart = this.byId("roadmapStatusChart");

            if (oTourChart) {
                oTourChart.setVizProperties({
                    title: { visible: false },
                    legend: {
                        visible: true,
                        position: "right"
                    },
                    plotArea: {
                        dataLabel: {
                            visible: true,
                            type: "percentage"
                        },
                        colorPalette: [
                            "#E9730C",
                            "#107E3E",
                            "#BB0000"
                        ],
                        background: {
                            color: "transparent"
                        }
                    },
                    general: {
                        background: {
                            color: "transparent"
                        }
                    }
                });
            }

            if (oRoadmapChart) {
                oRoadmapChart.setVizProperties({
                    title: { visible: false },
                    legend: { visible: false },
                    valueAxis: {
                        title: {
                            visible: true,
                            text: "Nombre"
                        }
                    },
                    categoryAxis: {
                        title: {
                            visible: true,
                            text: "Statut"
                        }
                    },
                    plotArea: {
                        dataLabel: {
                            visible: true
                        },
                        colorPalette: [
                            "#0A6ED1"
                        ],
                        background: {
                            color: "transparent"
                        }
                    },
                    general: {
                        background: {
                            color: "transparent"
                        }
                    }
                });
            }
        },

        getInitials: function (sName) {
            if (!sName) {
                return "PL";
            }

            return sName
                .split(" ")
                .map(function (p) {
                    return p.charAt(0);
                })
                .join("")
                .substring(0, 2)
                .toUpperCase();
        },

        loadDashboardData: async function () {
            const oModel = this.getView().getModel();
            oModel.setProperty("/busy", true);

            try {
                const aResults = await Promise.all([
                    this._loadTours(),
                    this._loadRoadmaps(),
                    this._loadPlannerStats()
                ]);

                this._lastTours = aResults[0];
                this._lastRoadmaps = aResults[1];

                this._applyStatistics(aResults[2]);
                this._buildNotifications(this._lastTours, this._lastRoadmaps);

            } catch (e) {
                console.error("[Dashboard] Erreur chargement:", e);
                MessageBox.error("Impossible de charger les données du dashboard.\n\n" + (e.message || ""));
            } finally {
                oModel.setProperty("/busy", false);

                setTimeout(function () {
                    this._applyChartDesign();
                    this._updateNotificationButtonState();
                }.bind(this), 300);
            }
        },

        _loadNotificationsSilent: async function () {
            try {
                const aResults = await Promise.all([
                    this._loadTours(),
                    this._loadRoadmaps(),
                    this._loadPlannerStats()
                ]);

                this._lastTours = aResults[0];
                this._lastRoadmaps = aResults[1];

                this._applyStatistics(aResults[2]);
                this._buildNotifications(this._lastTours, this._lastRoadmaps);
                this._updateNotificationButtonState();
            } catch (e) {
                console.error("[Notifications] Erreur:", e);
            }
        },

        _loadTours: async function () {
            const sUrl = "/odata/v4/route-management/Tours" +
                "?$select=ID,tourCode,tourDate,zone,collectionType,status,clientName,vehicleRegistration,driverLastName,createdAt" +
                "&$orderby=createdAt desc" +
                "&$top=1000";

            const response = await fetch(sUrl);

            if (!response.ok) {
                throw new Error("Erreur HTTP " + response.status + " lors du chargement des tournées.");
            }

            const data = await response.json();
            return data.value || [];
        },

        _loadRoadmaps: async function () {
            const sUrl = "/odata/v4/route-management/Roadmaps" +
                "?$select=ID,roadmapCode,startDate,endDate,status,tourCode,tourDate,tourZone,createdAt" +
                "&$orderby=createdAt desc" +
                "&$top=1000";

            const response = await fetch(sUrl);

            if (!response.ok) {
                throw new Error("Erreur HTTP " + response.status + " lors du chargement des feuilles de route.");
            }

            const data = await response.json();
            return data.value || [];
        },

        _loadPlannerStats: async function () {
            const oDataModel = this.getOwnerComponent().getModel();
            const oUser = this.getView().getModel().getProperty("/user") || {};
            const oContext = oDataModel.bindContext("/getPlannerStats(...)");

            oContext.setParameter("userID", oUser.ID);
            await oContext.execute();

            return oContext.getBoundContext().getObject() || {};
        },

        _applyStatistics: function (oStats) {
            const oModel = this.getView().getModel();

            oModel.setProperty("/stats", {
                totalTours: oStats.totalTours || 0,
                createdTours: oStats.pendingTours || 0,
                validatedTours: oStats.acceptedTours || 0,
                rejectedTours: oStats.rejectedTours || 0,
                totalRoadmaps: oStats.totalRoadmaps || 0,
                createdRoadmaps: oStats.createdRoadmaps || 0,
                validatedRoadmaps: oStats.validatedRoadmaps || 0,
                rejectedRoadmaps: oStats.rejectedRoadmaps || 0
            });

            oModel.setProperty("/tourChartData", [
                { status: "Créées", total: oStats.pendingTours || 0 },
                { status: "Validées", total: oStats.acceptedTours || 0 },
                { status: "Rejetées", total: oStats.rejectedTours || 0 }
            ]);

            oModel.setProperty("/roadmapChartData", [
                { status: "Créées", total: oStats.createdRoadmaps || 0 },
                { status: "Validées", total: oStats.validatedRoadmaps || 0 },
                { status: "Rejetées", total: oStats.rejectedRoadmaps || 0 }
            ]);
        },

        _getReadNotificationIds: function () {
            try {
                return JSON.parse(localStorage.getItem("sepur.planner.readNotifications") || "[]");
            } catch (e) {
                return [];
            }
        },

        _setReadNotificationIds: function (aIds) {
            localStorage.setItem("sepur.planner.readNotifications", JSON.stringify(aIds || []));
        },

        _buildNotifications: function (aTours, aRoadmaps) {
            const oModel = this.getView().getModel();
            const aReadIds = this._getReadNotificationIds();
            const aNotifications = [];

            aTours.forEach(function (oTour) {
                const sStatus = String(oTour.status || "").trim().toUpperCase();

                if (sStatus === "VALIDATED" || sStatus === "REJECTED") {
                    const sId = "TOUR-" + oTour.ID + "-" + sStatus;

                    aNotifications.push({
                        id: sId,
                        entity: "TOUR",
                        type: sStatus === "VALIDATED" ? "Success" : "Error",
                        icon: sStatus === "VALIDATED" ? "sap-icon://accept" : "sap-icon://decline",
                        title: sStatus === "VALIDATED" ? "Tournée validée" : "Tournée rejetée",
                        description: (oTour.tourCode || "-") + " | " + (oTour.clientName || "-") + " | " + (oTour.zone || "-"),
                        detail: sStatus === "VALIDATED"
                            ? "Le superviseur a validé cette tournée."
                            : "Le superviseur a rejeté cette tournée. Une correction est nécessaire.",
                        status: sStatus,
                        unread: aReadIds.indexOf(sId) === -1
                    });
                }
            }.bind(this));

            aRoadmaps.forEach(function (oRoadmap) {
                const sStatus = String(oRoadmap.status || "").trim().toUpperCase();

                if (sStatus === "VALIDATED" || sStatus === "REJECTED") {
                    const sId = "ROADMAP-" + oRoadmap.ID + "-" + sStatus;

                    aNotifications.push({
                        id: sId,
                        entity: "ROADMAP",
                        type: sStatus === "VALIDATED" ? "Success" : "Error",
                        icon: sStatus === "VALIDATED" ? "sap-icon://accept" : "sap-icon://decline",
                        title: sStatus === "VALIDATED" ? "Feuille de route validée" : "Feuille de route rejetée",
                        description: (oRoadmap.roadmapCode || "-") + " | Tournée : " + (oRoadmap.tourCode || "-"),
                        detail: sStatus === "VALIDATED"
                            ? "Le superviseur a validé cette feuille de route."
                            : "Le superviseur a rejeté cette feuille de route. Une vérification est nécessaire.",
                        status: sStatus,
                        unread: aReadIds.indexOf(sId) === -1
                    });
                }
            }.bind(this));

            const iUnread = aNotifications.filter(function (n) {
                return n.unread;
            }).length;

            oModel.setProperty("/notifications", {
                unreadCount: iUnread,
                totalCount: aNotifications.length,
                items: aNotifications,
                lastSync: new Date().toLocaleString("fr-FR")
            });

            this._updateNotificationButtonState();
        },

        _updateNotificationButtonState: function () {
            const oButton = this.byId("btnPlannerNotifications");

            if (!oButton) {
                return;
            }

            const iUnread = this.getView().getModel().getProperty("/notifications/unreadCount") || 0;

            if (iUnread > 0) {
                oButton.addStyleClass("notificationButtonUnread");
            } else {
                oButton.removeStyleClass("notificationButtonUnread");
            }
        },

        _markCurrentNotificationsAsRead: function () {
            const oModel = this.getView().getModel();
            const aNotifications = oModel.getProperty("/notifications/items") || [];

            const aIds = aNotifications.map(function (n) {
                return n.id;
            });

            this._setReadNotificationIds(aIds);

            aNotifications.forEach(function (n) {
                n.unread = false;
            });

            oModel.setProperty("/notifications/items", aNotifications);
            oModel.setProperty("/notifications/unreadCount", 0);

            this._updateNotificationButtonState();
        },

        _createNotificationItem: function (oNotification) {
            const sStateClass = oNotification.type === "Success"
                ? "notificationSuccess"
                : "notificationError";

            const oIcon = new Icon({
                src: oNotification.icon
            }).addStyleClass("notificationIcon " + sStateClass);

            const oTitle = new Text({
                text: oNotification.title
            }).addStyleClass("notificationTitle");

            const oStatus = new ObjectStatus({
                text: oNotification.unread ? "Non lue" : "Lue",
                state: oNotification.unread ? "Information" : "None"
            }).addStyleClass("notificationStatus");

            const oDescription = new Text({
                text: oNotification.description
            }).addStyleClass("notificationDescription");

            const oDetail = new Text({
                text: oNotification.detail
            }).addStyleClass("notificationDetail");

            const oHeader = new HBox({
                justifyContent: "SpaceBetween",
                alignItems: "Center",
                items: [
                    new HBox({
                        alignItems: "Center",
                        items: [
                            oIcon,
                            oTitle
                        ]
                    }),
                    oStatus
                ]
            }).addStyleClass("notificationItemHeader");

            return new VBox({
                items: [
                    oHeader,
                    oDescription,
                    oDetail
                ]
            }).addStyleClass(oNotification.unread ? "notificationCard notificationUnread" : "notificationCard");
        },

        onOpenNotifications: function (oEvent) {
            this._buildNotifications(this._lastTours || [], this._lastRoadmaps || []);

            const oModel = this.getView().getModel();
            const aNotifications = oModel.getProperty("/notifications/items") || [];
            const sLastSync = oModel.getProperty("/notifications/lastSync") || "-";

            if (this._notificationPopover) {
                this._notificationPopover.destroy();
                this._notificationPopover = null;
            }

            const oContent = new VBox({
                width: "28rem"
            }).addStyleClass("notificationPopoverContent");

            const oHeader = new Toolbar({
                content: [
                    new Title({
                        text: "Notifications",
                        level: "H4"
                    }).addStyleClass("notificationPopoverTitle"),
                    new ToolbarSpacer(),
                    new Button({
                        text: "Tout marquer comme lu",
                        icon: "sap-icon://accept",
                        type: "Transparent",
                        press: this.onMarkAllNotificationsRead.bind(this)
                    }).addStyleClass("markReadButton")
                ]
            }).addStyleClass("notificationPopoverToolbar");

            oContent.addItem(oHeader);

            oContent.addItem(new Text({
                text: "Dernière synchronisation : " + sLastSync
            }).addStyleClass("notificationSyncText"));

            if (!aNotifications.length) {
                oContent.addItem(
                    new VBox({
                        items: [
                            new Icon({
                                src: "sap-icon://bell"
                            }).addStyleClass("emptyNotificationIcon"),
                            new Text({
                                text: "Aucune notification pour le moment."
                            }).addStyleClass("emptyNotificationText")
                        ]
                    }).addStyleClass("emptyNotificationBox")
                );
            } else {
                aNotifications.forEach(function (oNotification) {
                    oContent.addItem(this._createNotificationItem(oNotification));
                }.bind(this));
            }

            this._notificationPopover = new Popover({
                placement: "Bottom",
                showHeader: false,
                contentWidth: "29rem",
                content: oContent
            }).addStyleClass("plannerNotificationPopover");

            this.getView().addDependent(this._notificationPopover);
            this._notificationPopover.openBy(oEvent.getSource());

            this._markCurrentNotificationsAsRead();
        },

        onMarkAllNotificationsRead: function () {
            this._markCurrentNotificationsAsRead();

            if (this._notificationPopover) {
                this._notificationPopover.close();
            }

            MessageToast.show("Notifications marquées comme lues.");
        },

        onRefresh: function () {
            this.loadDashboardData();
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

        onOpenRejectedTours: function () {
            window.location.href = "/tours/webapp/index.html";
        },

        onOpenHome: function () {
            window.location.href = "/home/webapp/index.html";
        },

        onLogout: function () {
            MessageBox.confirm("Êtes-vous sûr de vouloir vous déconnecter ?", {
                title: "Déconnexion",
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        localStorage.removeItem("sepur.user");
                        localStorage.removeItem("currentUser");
                        localStorage.removeItem("sepurUser");
                        sessionStorage.removeItem("sepur.user");
                        sessionStorage.removeItem("currentUser");
                        sessionStorage.removeItem("sepurUser");
                        window.location.href = "/login/webapp/index.html";
                    }
                }
            });
        }
    });
});
