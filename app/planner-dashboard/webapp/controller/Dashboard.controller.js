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
                MessageBox.error("Accès refusé. Ce dashboard est réservé au planificateur.", {
                    onClose: function () {
                        window.location.href = "/login/webapp/index.html";
                    }
                });
                return;
            }

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

                tours: [],
                roadmaps: []
            }));

            this.loadDashboardData();
        },

        onAfterRendering: function () {
            this._applyChartDesign();
        },

        _applyChartDesign: function () {
            const oTourChart = this.byId("tourStatusChart");
            const oRoadmapChart = this.byId("roadmapStatusChart");

            if (oTourChart) {
                oTourChart.setVizProperties({
                    title: {
                        visible: false
                    },
                    legend: {
                        visible: true,
                        position: "right",
                        label: {
                            style: {
                                fontFamily: "'72', Arial"
                            }
                        }
                    },
                    plotArea: {
                        dataLabel: {
                            visible: true,
                            type: "percentage",
                            style: {
                                fontFamily: "'72', Arial",
                                fontWeight: "bold"
                            }
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
                    title: {
                        visible: false
                    },
                    legend: {
                        visible: false
                    },
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
                            visible: true,
                            style: {
                                fontFamily: "'72', Arial",
                                fontWeight: "bold"
                            }
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

        normalizeStatus: function (sStatus) {
            if (["DRAFT", "PENDING", "CREATED"].includes(sStatus)) {
                return "CREATED";
            }

            if (["ACCEPTED", "VALIDATED", "ACTIVE", "COMPLETED"].includes(sStatus)) {
                return "VALIDATED";
            }

            if (["REJECTED", "CANCELLED"].includes(sStatus)) {
                return "REJECTED";
            }

            return "CREATED";
        },

        loadDashboardData: async function () {
            const oModel = this.getView().getModel();
            oModel.setProperty("/busy", true);

            try {
                const [aTours, aRoadmaps] = await Promise.all([
                    this._loadTours(),
                    this._loadRoadmaps()
                ]);

                this._calculateStatistics(aTours, aRoadmaps);

                MessageToast.show("Données actualisées.", {
                    duration: 1600
                });

            } catch (e) {
                console.error("[Dashboard] Erreur chargement:", e);
                MessageBox.error("Impossible de charger les données du dashboard.\n\n" + (e.message || ""));
            } finally {
                oModel.setProperty("/busy", false);

                setTimeout(function () {
                    this._applyChartDesign();
                }.bind(this), 300);
            }
        },

        _loadTours: async function () {
            const oModel = this.getView().getModel();

            const sUrl = "/odata/v4/route-management/Tours" +
                "?$select=ID,tourCode,tourDate,zone,collectionType,status,clientName,vehicleRegistration,driverLastName,createdAt" +
                "&$orderby=createdAt desc" +
                "&$top=8";

            const response = await fetch(sUrl);

            if (!response.ok) {
                throw new Error("Erreur HTTP " + response.status + " lors du chargement des tournées.");
            }

            const data = await response.json();
            const aTours = data.value || [];

            oModel.setProperty("/tours", aTours);

            return aTours;
        },

        _loadRoadmaps: async function () {
            const oModel = this.getView().getModel();

            const sUrl = "/odata/v4/route-management/Roadmaps" +
                "?$select=ID,roadmapCode,startDate,endDate,status,tourCode,tourDate,tourZone,createdAt" +
                "&$orderby=createdAt desc" +
                "&$top=8";

            const response = await fetch(sUrl);

            if (!response.ok) {
                throw new Error("Erreur HTTP " + response.status + " lors du chargement des roadmaps.");
            }

            const data = await response.json();
            const aRoadmaps = data.value || [];

            oModel.setProperty("/roadmaps", aRoadmaps);

            return aRoadmaps;
        },

        _calculateStatistics: function (aTours, aRoadmaps) {
            const oModel = this.getView().getModel();

            const oTourStats = {
                CREATED: 0,
                VALIDATED: 0,
                REJECTED: 0
            };

            const oRoadmapStats = {
                CREATED: 0,
                VALIDATED: 0,
                REJECTED: 0
            };

            aTours.forEach(function (oTour) {
                const s = this.normalizeStatus(oTour.status);
                oTourStats[s] = (oTourStats[s] || 0) + 1;
            }.bind(this));

            aRoadmaps.forEach(function (oRoadmap) {
                const s = this.normalizeStatus(oRoadmap.status);
                oRoadmapStats[s] = (oRoadmapStats[s] || 0) + 1;
            }.bind(this));

            oModel.setProperty("/stats", {
                totalTours: aTours.length,
                createdTours: oTourStats.CREATED,
                validatedTours: oTourStats.VALIDATED,
                rejectedTours: oTourStats.REJECTED,

                totalRoadmaps: aRoadmaps.length,
                createdRoadmaps: oRoadmapStats.CREATED,
                validatedRoadmaps: oRoadmapStats.VALIDATED,
                rejectedRoadmaps: oRoadmapStats.REJECTED
            });

            oModel.setProperty("/tourChartData", [
                {
                    status: "Créées",
                    total: oTourStats.CREATED
                },
                {
                    status: "Validées",
                    total: oTourStats.VALIDATED
                },
                {
                    status: "Rejetées",
                    total: oTourStats.REJECTED
                }
            ]);

            oModel.setProperty("/roadmapChartData", [
                {
                    status: "Créées",
                    total: oRoadmapStats.CREATED
                },
                {
                    status: "Validées",
                    total: oRoadmapStats.VALIDATED
                },
                {
                    status: "Rejetées",
                    total: oRoadmapStats.REJECTED
                }
            ]);
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
                        window.location.href = "/login/webapp/index.html";
                    }
                }
            });
        },

        formatStatusState: function (sStatus) {
            switch (this.normalizeStatus(sStatus)) {
                case "VALIDATED":
                    return "Success";
                case "REJECTED":
                    return "Error";
                case "CREATED":
                    return "Warning";
                default:
                    return "None";
            }
        },

        formatStatusText: function (sStatus) {
            switch (this.normalizeStatus(sStatus)) {
                case "CREATED":
                    return "Créée";
                case "VALIDATED":
                    return "Validée";
                case "REJECTED":
                    return "Rejetée";
                default:
                    return sStatus || "";
            }
        },

        formatDate: function (sDate) {
            if (!sDate) {
                return "";
            }

            const oDate = new Date(sDate);

            if (isNaN(oDate.getTime())) {
                return sDate;
            }

            return oDate.toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });
        }
    });
});