sap.ui.define([
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/m/Dialog",
  "sap/m/TextArea",
  "sap/m/Button",
  "sap/m/Label",
  "sap/m/VBox"
], function (
  MessageToast,
  MessageBox,
  Dialog,
  TextArea,
  Button,
  Label,
  VBox
) {
  "use strict";

  function normalizeStatus(sStatus) {
    return String(sStatus || "").trim().toUpperCase();
  }

  function isCreatedStatus(sStatus) {
    return normalizeStatus(sStatus) === "CREATED";
  }

  function addContextOnce(aContexts, oContext) {
    if (!oContext || typeof oContext.getPath !== "function" || typeof oContext.getModel !== "function") {
      return;
    }

    var sPath = oContext.getPath();

    var bExists = aContexts.some(function (item) {
      return item && typeof item.getPath === "function" && item.getPath() === sPath;
    });

    if (!bExists) {
      aContexts.push(oContext);
    }
  }

  function getContextsFromArguments(aArgs) {
    var aContexts = [];

    for (var i = 0; i < aArgs.length; i += 1) {
      var arg = aArgs[i];

      if (Array.isArray(arg)) {
        arg.forEach(function (item) {
          addContextOnce(aContexts, item);
        });
      }

      addContextOnce(aContexts, arg);

      if (arg && typeof arg.getSource === "function") {
        var source = arg.getSource();

        if (source && typeof source.getBindingContext === "function") {
          addContextOnce(aContexts, source.getBindingContext());
        }
      }
    }

    return aContexts;
  }

  async function keepOnlyCreatedRoadmaps(aContexts) {
    var aCreatedContexts = [];

    for (var i = 0; i < aContexts.length; i += 1) {
      var oContext = aContexts[i];
      var oObject = null;

      if (oContext && typeof oContext.requestObject === "function") {
        oObject = await oContext.requestObject();
      } else if (oContext && typeof oContext.getObject === "function") {
        oObject = oContext.getObject();
      }

      if (oObject && oObject.IsActiveEntity !== false && isCreatedStatus(oObject.status)) {
        addContextOnce(aCreatedContexts, oContext);
      }
    }

    return aCreatedContexts;
  }

  async function executeBoundAction(oContext, sActionName, oParameters) {
    if (!oContext || typeof oContext.getModel !== "function") {
      throw new Error("Aucune feuille de route sélectionnée.");
    }

    var oModel = oContext.getModel();

    if (!oModel || typeof oModel.bindContext !== "function") {
      throw new Error("Modèle OData introuvable.");
    }

    var sFullActionName = "RouteManagementService." + sActionName + "(...)";
    var oAction = oModel.bindContext(sFullActionName, oContext);

    Object.keys(oParameters || {}).forEach(function (sKey) {
      oAction.setParameter(sKey, oParameters[sKey]);
    });

    await oAction.execute();
  }

  async function executeForAll(aContexts, sActionName, oParameters) {
    for (var i = 0; i < aContexts.length; i += 1) {
      await executeBoundAction(aContexts[i], sActionName, oParameters);
    }

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

  function getErrorMessage(oError, sFallback) {
    var oCause = oError && oError.cause;
    var sMessage = (oCause && oCause.message) || (oError && oError.message) || "";
    return /(?:node_modules|\.js:\d+|no handler|no such|SQLITE_|TypeError|ReferenceError|srv-dispatch)/i.test(sMessage)
      ? sFallback
      : (sMessage || sFallback);
  }

  return {
    onBackToDashboard: function () {
      MessageToast.show("Retour au dashboard superviseur...");

      setTimeout(function () {
        window.location.href = "/supervisor-dashboard/webapp/index.html";
      }, 300);
    },

    onBack: function () {
      MessageToast.show("Retour...");

      setTimeout(function () {
        window.history.back();
      }, 200);
    },

    onValidateRoadmap: async function () {
      var aContexts = getContextsFromArguments(arguments);

      if (!aContexts.length) {
        MessageBox.warning("Veuillez sélectionner une feuille de route à valider.");
        return;
      }

      var aCreatedContexts = await keepOnlyCreatedRoadmaps(aContexts);

      if (!aCreatedContexts.length) {
        MessageBox.warning("Seules les feuilles de route créées peuvent être validées.");
        return;
      }

      var sMessage = aCreatedContexts.length === 1
        ? "Voulez-vous valider cette feuille de route ?"
        : "Voulez-vous valider les feuilles de route sélectionnées ?";

      MessageBox.confirm(sMessage, {
        title: "Validation des feuilles de route",
        actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
        emphasizedAction: MessageBox.Action.OK,
        onClose: async function (sAction) {
          if (sAction !== MessageBox.Action.OK) {
            return;
          }

          try {
            await executeForAll(aCreatedContexts, "validateRoadmap");

            MessageToast.show("Validation effectuée avec succès.");
          } catch (error) {
            MessageBox.error(getErrorMessage(error, "Erreur lors de la validation."));
          }
        }
      });
    },

    onRejectRoadmap: async function () {
      var aContexts = getContextsFromArguments(arguments);

      if (!aContexts.length) {
        MessageBox.warning("Veuillez sélectionner une feuille de route à rejeter.");
        return;
      }

      var aCreatedContexts = await keepOnlyCreatedRoadmaps(aContexts);

      if (!aCreatedContexts.length) {
        MessageBox.warning("Seules les feuilles de route créées peuvent être rejetées.");
        return;
      }

      var oReasonArea = new TextArea({
        width: "100%",
        rows: 5,
        placeholder: "Saisir le motif de rejet..."
      });

      var oRejectButton = new Button({
        text: "Rejeter",
        type: "Reject",
        press: async function () {
          var sReason = oReasonArea.getValue();

          if (!sReason || !sReason.trim()) {
            MessageBox.warning("Le motif de rejet est obligatoire.");
            return;
          }

          oRejectButton.setEnabled(false);
          oRejectButton.setBusy(true);

          try {
            await executeForAll(aCreatedContexts, "rejectRoadmap", {
              reason: sReason.trim()
            });

            MessageToast.show("Rejet effectué avec succès.");
            oDialog.close();
          } catch (error) {
            MessageBox.error(getErrorMessage(error, "Erreur lors du rejet."));
          } finally {
            oRejectButton.setBusy(false);
            oRejectButton.setEnabled(true);
          }
        }
      });

      var oDialog = new Dialog({
        title: "Rejeter la feuille de route",
        contentWidth: "28rem",
        content: [
          new VBox({
            width: "100%",
            items: [
              new Label({
                text: "Motif de rejet obligatoire",
                required: true
              }),
              oReasonArea
            ]
          })
        ],
        beginButton: oRejectButton,
        endButton: new Button({
          text: "Annuler",
          press: function () {
            oDialog.close();
          }
        }),
        afterClose: function () {
          oDialog.destroy();
        }
      });

      oDialog.open();
    },

    onMarkRoadmapCompleted: async function () {
      var aContexts = getContextsFromArguments(arguments);
      var aCompletable = [];

      for (var i = 0; i < aContexts.length; i += 1) {
        var oObject = typeof aContexts[i].requestObject === "function"
          ? await aContexts[i].requestObject()
          : (aContexts[i].getObject && aContexts[i].getObject());

        if (oObject && oObject.IsActiveEntity !== false && normalizeStatus(oObject.status) === "VALIDATED") {
          addContextOnce(aCompletable, aContexts[i]);
        }
      }

      if (!aCompletable.length) {
        MessageBox.warning("Sélectionnez une feuille de route validée à terminer.");
        return;
      }

      MessageBox.confirm("Confirmer la clôture des feuilles de route sélectionnées ?", {
        title: "Clôture des feuilles de route",
        actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
        emphasizedAction: MessageBox.Action.OK,
        onClose: async function (sAction) {
          if (sAction !== MessageBox.Action.OK) return;

          try {
            await executeForAll(aCompletable, "markRoadmapCompleted");
            MessageToast.show("Feuille(s) de route marquée(s) comme terminée(s).");
          } catch (oError) {
            MessageBox.error(getErrorMessage(oError, "Impossible de terminer la feuille de route."));
          }
        }
      });
    }
  };
});
