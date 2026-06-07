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
                MessageBox.error("Accès refusé. Ce dashboard est réservé au planificateur.");
                window.location.href = "/login/webapp/index.html";
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
            this.applyChartDesign();
        },

        applyChartDesign: function () {
            const oTourChart = this.byId("tourStatusChart");
            const oRoadmapChart = this.byId("roadmapStatusChart");

            const oVizProperties = {
                title: {
                    visible: false
                },
                legend: {
                    visible: true,
                    position: "bottom"
                },
                plotArea: {
                    dataLabel: {
                        visible: true
                    },
                    colorPalette: [
                        "#E9730C",
                        "#107E3E",
                        "#BB0000"
                    ]
                }
            };

            if (oTourChart) {
                oTourChart.setVizProperties(oVizProperties);
            }

            if (oRoadmapChart) {
                oRoadmapChart.setVizProperties(oVizProperties);
            }
        },

        getInitials: function (sName) {
            if (!sName) {
                return "PL";
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
                const aResults = await Promise.all([
                    this.loadTours(),
                    this.loadRoadmaps()
                ]);

                const aTours = aResults[0];
                const aRoadmaps = aResults[1];

                this.calculateStatistics(aTours, aRoadmaps);

                MessageToast.show("Dashboard actualisé.");

            } catch (e) {
                console.error(e);
                MessageBox.error("Impossible de charger les données du dashboard.");
            } finally {
                oModel.setProperty("/busy", false);
                this.applyChartDesign();
            }
        },

        loadTours: async function () {
            const oModel = this.getView().getModel();

            const sUrl = "/odata/v4/route-management/Tours" +
                "?$select=ID,tourCode,tourDate,zone,collectionType,status,clientName,vehicleRegistration,driverLastName,createdAt" +
                "&$orderby=createdAt desc" +
                "&$top=8";

            const response = await fetch(sUrl);

            if (!response.ok) {
                throw new Error("Erreur lors du chargement des tournées.");
            }

            const data = await response.json();
            const aTours = data.value || [];

            oModel.setProperty("/tours", aTours);

            return aTours;
        },

        loadRoadmaps: async function () {
            const oModel = this.getView().getModel();

            const sUrl = "/odata/v4/route-management/Roadmaps" +
                "?$select=ID,roadmapCode,startDate,endDate,status,tourCode,tourDate,tourZone,createdAt" +
                "&$orderby=createdAt desc" +
                "&$top=8";

            const response = await fetch(sUrl);

            if (!response.ok) {
                throw new Error("Erreur lors du chargement des roadmaps.");
            }

            const data = await response.json();
            const aRoadmaps = data.value || [];

            oModel.setProperty("/roadmaps", aRoadmaps);

            return aRoadmaps;
        },

        calculateStatistics: function (aTours, aRoadmaps) {
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
                const sStatus = this.normalizeStatus(oTour.status);
                oTourStats[sStatus] = (oTourStats[sStatus] || 0) + 1;
            }.bind(this));

            aRoadmaps.forEach(function (oRoadmap) {
                const sStatus = this.normalizeStatus(oRoadmap.status);
                oRoadmapStats[sStatus] = (oRoadmapStats[sStatus] || 0) + 1;
            }.bind(this));

            const oStats = {
                totalTours: aTours.length,
                createdTours: oTourStats.CREATED,
                validatedTours: oTourStats.VALIDATED,
                rejectedTours: oTourStats.REJECTED,

                totalRoadmaps: aRoadmaps.length,
                createdRoadmaps: oRoadmapStats.CREATED,
                validatedRoadmaps: oRoadmapStats.VALIDATED,
                rejectedRoadmaps: oRoadmapStats.REJECTED
            };

            oModel.setProperty("/stats", oStats);

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
            localStorage.removeItem("sepur.user");
            window.location.href = "/login/webapp/index.html";
        },

        formatStatusState: function (sStatus) {
            const sNormalizedStatus = this.normalizeStatus(sStatus);

            switch (sNormalizedStatus) {
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
            const sNormalizedStatus = this.normalizeStatus(sStatus);

            switch (sNormalizedStatus) {
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

            return oDate.toLocaleDateString("fr-FR");
        }
    });
});