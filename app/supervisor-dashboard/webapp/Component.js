sap.ui.define(["sap/ui/core/UIComponent", "sap/ui/model/json/JSONModel"], function (UIComponent, JSONModel) {
    "use strict";
    return UIComponent.extend("sepur.supervisor.Component", {
        metadata: { manifest: "json" },
        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
            const raw = localStorage.getItem("sepur.user");
            if (!raw) {
                window.location.href = "/login/webapp/index.html";
                return;
            }
            const user = JSON.parse(raw);
            if (user.role !== "SUPERVISEUR") {
                window.location.href = "/login/webapp/index.html";
                return;
            }
            this.setModel(new JSONModel({ user, stats: {} }), "view");
        }
    });
});
