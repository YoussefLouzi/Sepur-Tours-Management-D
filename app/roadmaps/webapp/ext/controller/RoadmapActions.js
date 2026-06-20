sap.ui.define([
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (MessageToast, MessageBox) {
  "use strict";

  function getContextFromArguments(aArgs) {
    for (var i = 0; i < aArgs.length; i += 1) {
      var arg = aArgs[i];

      if (arg && typeof arg.getPath === "function" && typeof arg.getModel === "function") {
        return arg;
      }

      if (arg && typeof arg.getSource === "function") {
        var oSource = arg.getSource();
        var oContext = oSource && oSource.getBindingContext && oSource.getBindingContext();

        if (oContext) {
          return oContext;
        }
      }
    }

    return null;
  }

  function getErrorMessage(oError, sFallback) {
    var oCause = oError && oError.cause;
    return (oCause && oCause.message) || (oError && oError.message) || sFallback;
  }

  function refreshContext(oContext) {
    var oModel = oContext && oContext.getModel();

    if (oModel && typeof oModel.refresh === "function") {
      oModel.refresh();
    }
  }

  async function executeBoundAction(oContext, sActionName) {
    if (!oContext || typeof oContext.getModel !== "function") {
      throw new Error("Feuille de route introuvable.");
    }

    var oModel = oContext.getModel();
    var oAction = oModel.bindContext("RouteManagementService." + sActionName + "(...)", oContext);

    await oAction.execute();
    refreshContext(oContext);

    return oAction.getBoundContext() ? oAction.getBoundContext().getObject() : null;
  }

  return {
    onBackToDashboard: function () {
      MessageToast.show("Retour au dashboard...");
      setTimeout(function () { window.location.href = "/planner-dashboard/webapp/index.html"; }, 300);
    },

    onBack: function () {
      MessageToast.show("Retour...");
      setTimeout(function () { window.history.back(); }, 200);
    },

    onAutoAssignTours: function () {
      var oContext = getContextFromArguments(arguments);

      if (!oContext) {
        MessageBox.warning("Roadmap introuvable.");
        return;
      }

      MessageBox.confirm(
        "Voulez-vous affecter automatiquement les tournées du même client et du même mois ?",
        {
          title: "Affectation automatique",
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.OK,
          onClose: async function (sAction) {
            if (sAction !== MessageBox.Action.OK) {
              return;
            }

            try {
              await executeBoundAction(oContext, "autoAssignTours");
              MessageToast.show("Tournées affectées avec succès.");
            } catch (oError) {
              MessageBox.error(getErrorMessage(
                oError,
                "Erreur lors de l’affectation des tournées."
              ));
            }
          }
        }
      );
    },

    onGenerateRoadmapSheet: async function () {
      var oContext = getContextFromArguments(arguments);

      if (!oContext) {
        MessageBox.warning("Roadmap introuvable.");
        return;
      }

      var oWindow = window.open("", "_blank");

      if (!oWindow) {
        MessageBox.warning("Veuillez autoriser les fenêtres contextuelles pour afficher la feuille de route.");
        return;
      }

      try {
        oWindow.document.write("<p style='font-family:Arial;padding:24px'>Génération en cours...</p>");

        var oModel = oContext.getModel();
        var oAction = oModel.bindContext(
          "RouteManagementService.generateRoadmapSheetHtml(...)",
          oContext
        );

        await oAction.execute();

        var oResult = oAction.getBoundContext().getObject();
        var sHtml = oResult && (oResult.value || oResult);

        if (!sHtml) {
          oWindow.close();
          MessageBox.warning("Aucune feuille de route générée.");
          return;
        }

        oWindow.document.open();
        oWindow.document.write(sHtml);
        oWindow.document.close();
      } catch (oError) {
        oWindow.close();
        MessageBox.error(getErrorMessage(
          oError,
          "Erreur lors de la génération de la feuille de route."
        ));
      }
    }
  };
});
