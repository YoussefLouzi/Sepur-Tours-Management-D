"use strict";

const cds = require("@sap/cds");

const CODE_BY_STATUS = Object.freeze({
    400: "VALIDATION_ERROR",
    401: "AUTHENTICATION_FAILED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT"
});

function rejectRequest(req, message, status = 400, options = {}) {
    return req.reject({
        status,
        code: options.code || CODE_BY_STATUS[status] || "BUSINESS_ERROR",
        message,
        target: options.target
    });
}

function registerErrorHandler(service) {
    const log = cds.log("route-management-errors");

    service.on("error", (error, req) => {
        const rawStatus = Number(error.statusCode || error.status);
        const details = Array.isArray(error.details) ? error.details : [];
        const isAssertionError = String(error.code || "").startsWith("ASSERT_") ||
            details.some((detail) => String(detail.code || "").startsWith("ASSERT_"));
        const status = Number.isFinite(rawStatus)
            ? rawStatus
            : (isAssertionError ? 400 : 500);

        if (status < 500) {
            error.status = status;
            error.statusCode = status;

            if (error.code === "MULTIPLE_ERRORS" || (isAssertionError && details.length > 1)) {
                error.message = "Plusieurs champs sont invalides. Consultez les détails ci-dessous.";
            }

            return;
        }

        log.error("Unhandled service error", {
            event: req && req.event,
            target: req && req.target && req.target.name,
            error: error.stack || error.message
        });

        error.status = 500;
        error.statusCode = 500;
        error.code = "INTERNAL_ERROR";
        error.message = "Une erreur interne est survenue. Veuillez réessayer ultérieurement.";
    });
}

module.exports = {
    registerErrorHandler,
    rejectRequest
};
