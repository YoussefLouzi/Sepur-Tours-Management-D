sap.ui.define([
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/m/Dialog",
  "sap/m/TextArea",
  "sap/m/Button",
  "sap/m/Label",
  "sap/m/VBox"
], function (MessageToast, MessageBox, Dialog, TextArea, Button, Label, VBox) {
  "use strict";

  function addContext(aContexts, oContext) {
    if (!oContext || typeof oContext.getPath !== "function" || typeof oContext.getModel !== "function") {
      return;
    }

    if (!aContexts.some(function (item) { return item.getPath() === oContext.getPath(); })) {
      aContexts.push(oContext);
    }
  }

  function getContextsFromArguments(aArgs) {
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
    return (oCause && oCause.message) || (oError && oError.message) || sFallback;
  }

  function filterCreatedContexts(aContexts) {
    return aContexts.filter(function (oContext) {
      if (typeof oContext.getObject !== "function") {
        return true;
      }

      var oTour = oContext.getObject();
      var sStatus = String(oTour && oTour.status || "").trim().toUpperCase();
      return sStatus === "CREATED" || sStatus === "DRAFT" || sStatus === "PENDING";
    });
  }

  async function executeBoundAction(oContext, sActionName, oParameters) {
    var oModel = oContext && oContext.getModel();

    if (!oModel) {
      throw new Error("Modèle OData introuvable.");
    }

    var oAction = oModel.bindContext("RouteManagementService." + sActionName + "(...)", oContext);

    Object.keys(oParameters || {}).forEach(function (sKey) {
      oAction.setParameter(sKey, oParameters[sKey]);
    });

    await oAction.execute();
  }

  function refreshContexts(aContexts) {
    var aModels = [];

    aContexts.forEach(function (oContext) {
      var oModel = oContext.getModel();

      if (oModel && aModels.indexOf(oModel) === -1) {
        aModels.push(oModel);
      }
    });

    aModels.forEach(function (oModel) {
      if (typeof oModel.refresh === "function") {
        oModel.refresh();
      }
    });
  }

  async function executeForAll(aContexts, sActionName, oParameters) {
    for (var i = 0; i < aContexts.length; i += 1) {
      await executeBoundAction(aContexts[i], sActionName, oParameters);
    }

    refreshContexts(aContexts);
  }

  return {
    onBackToDashboard: function () {
      MessageToast.show("Retour au dashboard superviseur...");
      setTimeout(function () { window.location.href = "/supervisor-dashboard/webapp/index.html"; }, 300);
    },

    onBack: function () {
      MessageToast.show("Retour...");
      setTimeout(function () { window.history.back(); }, 200);
    },

    onValidateTour: async function () {
      var aContexts = getContextsFromArguments(arguments);

      if (!aContexts.length) {
        MessageBox.warning("Veuillez sélectionner une tournée à valider.");
        return;
      }

      aContexts = filterCreatedContexts(aContexts);

      if (!aContexts.length) {
        MessageBox.warning("Seules les tournées créées peuvent être validées.");
        return;
      }

      var sMessage = aContexts.length === 1
        ? "Voulez-vous valider cette tournée ?"
        : "Voulez-vous valider les tournées sélectionnées ?";

      MessageBox.confirm(sMessage, {
        title: "Validation des tournées",
        actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
        emphasizedAction: MessageBox.Action.OK,
        onClose: async function (sAction) {
          if (sAction !== MessageBox.Action.OK) {
            return;
          }

          try {
            await executeForAll(aContexts, "validate");
            MessageToast.show(aContexts.length === 1
              ? "Tournée validée avec succès."
              : "Tournées validées avec succès.");
          } catch (oError) {
            MessageBox.error(getErrorMessage(
              oError,
              "Erreur lors de la validation des tournées."
            ));
          }
        }
      });
    },

    onRejectTour: function () {
      var aContexts = getContextsFromArguments(arguments);

      if (!aContexts.length) {
        MessageBox.warning("Veuillez sélectionner une tournée à rejeter.");
        return;
      }

      aContexts = filterCreatedContexts(aContexts);

      if (!aContexts.length) {
        MessageBox.warning("Seules les tournées créées peuvent être rejetées.");
        return;
      }

      var oReasonArea = new TextArea({
        width: "100%",
        rows: 5,
        growing: true,
        maxLength: 500,
        placeholder: "Saisir le motif de rejet..."
      });

      var oRejectButton = new Button({
        text: "Rejeter",
        type: "Reject",
        press: async function () {
          var sReason = oReasonArea.getValue().trim();

          if (!sReason) {
            MessageBox.warning("Le motif de rejet est obligatoire.");
            return;
          }

          oRejectButton.setEnabled(false);
          oRejectButton.setBusy(true);

          try {
            await executeForAll(aContexts, "rejectTourDecision", { reason: sReason });
            MessageToast.show(aContexts.length === 1
              ? "Tournée rejetée avec succès."
              : "Tournées rejetées avec succès.");
            oDialog.close();
          } catch (oError) {
            MessageBox.error(getErrorMessage(
              oError,
              "Erreur lors du rejet des tournées."
            ));
          } finally {
            oRejectButton.setBusy(false);
            oRejectButton.setEnabled(true);
          }
        }
      });

      var oDialog = new Dialog({
        title: aContexts.length === 1 ? "Rejeter la tournée" : "Rejeter les tournées",
        contentWidth: "28rem",
        content: [
          new VBox({
            width: "100%",
            class: "sapUiSmallMargin",
            items: [
              new Label({ text: "Motif de rejet obligatoire", required: true }),
              oReasonArea
            ]
          })
        ],
        beginButton: oRejectButton,
        endButton: new Button({
          text: "Annuler",
          press: function () { oDialog.close(); }
        }),
        afterClose: function () { oDialog.destroy(); }
      });

      oDialog.open();
    }
  };
});
