sap.ui.define(
    ["sap/fe/core/AppComponent"],
    function (Component) {
        "use strict";

        function getSessionUser() {
            var sRaw = localStorage.getItem("sepur.user") || sessionStorage.getItem("sepur.user");
            return sRaw ? JSON.parse(sRaw) : null;
        }

        function requireRole(sRole) {
            try {
                var oUser = getSessionUser();
                var sUserRole = String(oUser && oUser.role || "").trim().toUpperCase();

                if (sUserRole === sRole || sUserRole === "ADMIN") {
                    return oUser;
                }
            } catch (e) {
                // Invalid session payload: redirect to login.
            }

            window.location.href = "/login/webapp/index.html?redirect=" +
                encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
            return null;
        }

        return Component.extend("ns.roadmaps.Component", {
            metadata: {
                manifest: "json"
            },

            init: function () {
                var oUser = requireRole("PLANIFICATEUR");

                if (!oUser) {
                    return;
                }

                Component.prototype.init.apply(this, arguments);

                var oModel = this.getModel();
                if (oModel && typeof oModel.changeHttpHeaders === "function") {
                    oModel.changeHttpHeaders({ "X-Sepur-User-Id": oUser.ID });
                }
            }
        });
    }
);
