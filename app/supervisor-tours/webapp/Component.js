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
                    return true;
                }
            } catch (e) {
                // Invalid session payload: redirect to login.
            }

            window.location.href = "/login/webapp/index.html?redirect=" +
                encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
            return false;
        }

        return Component.extend("sepur.supervisor.supervisortours.Component", {
            metadata: {
                manifest: "json"
            },

            init: function () {
                if (!requireRole("SUPERVISEUR")) {
                    return;
                }

                Component.prototype.init.apply(this, arguments);
            }
        });
    }
);
