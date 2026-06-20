sap.ui.define([
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (MessageToast, MessageBox) {
  "use strict";

  function addContext(aContexts, oContext) {
    if (!oContext || typeof oContext.getPath !== "function" || typeof oContext.getModel !== "function") {
      return;
    }

    if (!aContexts.some(function (item) { return item.getPath() === oContext.getPath(); })) {
      aContexts.push(oContext);
    }
  }

  function getContexts(aArgs) {
    var aContexts = [];

    Array.prototype.forEach.call(aArgs, function (arg) {
      if (Array.isArray(arg)) {
        arg.forEach(function (item) { addContext(aContexts, item); });
      }

      addContext(aContexts, arg);

      if (arg && typeof arg.getSource === "function") {
        var oSource = arg.getSource();
        addContext(aContexts, oSource && oSource.getBindingContext && oSource.getBindingContext());
      }
    });

    return aContexts;
  }

  function getErrorMessage(oError, sFallback) {
    var oCause = oError && oError.cause;
    var sMessage = (oCause && oCause.message) || (oError && oError.message) || "";
    return /(?:node_modules|\.js:\d+|no handler|no such|SQLITE_|TypeError|ReferenceError|srv-dispatch)/i.test(sMessage)
      ? sFallback
      : (sMessage || sFallback);
  }

  async function getObject(oContext) {
    return typeof oContext.requestObject === "function"
      ? oContext.requestObject()
      : oContext.getObject();
  }

  function refreshModel(oContext) {
    var oModel = oContext && oContext.getModel();

    if (oModel && typeof oModel.refresh === "function") {
      oModel.refresh();
    }
  }

  return {
    onBackToDashboard: function () {
      MessageToast.show("Retour au dashboard...");

      setTimeout(function () {
        window.location.href = "/planner-dashboard/webapp/index.html";
      }, 300);
    },

    onBack: function () {
      MessageToast.show("Retour...");

      setTimeout(function () {
        window.history.back();
      }, 200);
    },

    onCreateRoadmapFromTour: async function () {
      var aContexts = getContexts(arguments);

      if (aContexts.length !== 1) {
        MessageBox.warning("Veuillez sélectionner une seule tournée validée.");
        return;
      }

      var oContext = aContexts[0];
      var oTour = await getObject(oContext);

      if (!oTour || oTour.IsActiveEntity === false || String(oTour.status || "").toUpperCase() !== "VALIDATED") {
        MessageBox.warning("La feuille de route ne peut être créée que depuis une tournée validée.");
        return;
      }

      MessageBox.confirm("Créer une feuille de route à partir de cette tournée ?", {
        title: "Création de la feuille de route",
        actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
        emphasizedAction: MessageBox.Action.OK,
        onClose: async function (sAction) {
          if (sAction !== MessageBox.Action.OK) {
            return;
          }

          try {
            var oModel = oContext.getModel();
            var oAction = oModel.bindContext("/createRoadmapFromTour(...)");

            oAction.setParameter("tourID", oTour.ID);
            await oAction.execute();
            refreshModel(oContext);

            MessageBox.success("La feuille de route a été créée avec succès.", {
              actions: ["Ouvrir les feuilles de route", MessageBox.Action.CLOSE],
              emphasizedAction: "Ouvrir les feuilles de route",
              onClose: function (sResult) {
                if (sResult === "Ouvrir les feuilles de route") {
                  window.location.href = "/roadmaps/webapp/index.html";
                }
              }
            });
          } catch (oError) {
            MessageBox.error(getErrorMessage(
              oError,
              "Impossible de créer la feuille de route."
            ));
          }
        }
      });
    }
  };
});
