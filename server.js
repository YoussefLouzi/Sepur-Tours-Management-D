const cds = require('@sap/cds');
const express = require('express');
const path = require('path');

const UI_APPLICATIONS = [
  'home',
  'login',
  'planner-dashboard',
  'supervisor-dashboard',
  'tours',
  'roadmaps',
  'supervisor-tours',
  'supervisor-roadmaps'
];

cds.on('bootstrap', (app) => {
  app.use((_req, res, next) => {
    const originalEnd = res.end;

    res.end = function (chunk, encoding, callback) {
      const contentType = String(res.getHeader('content-type') || '');

      if (res.statusCode >= 400 && chunk && contentType.includes('application/json')) {
        try {
          const payload = JSON.parse(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk));
          const message = payload?.error?.message?.value || payload?.error?.message || '';
          const technicalPattern = /(?:expected property|json at position|stack|sql|sqlite|hana|no handler|no such|node_modules|\.js:\d+|[a-z]:\\|\/home\/|\/srv\/)/i;

          if (technicalPattern.test(String(message))) {
            payload.error = {
              code: res.statusCode >= 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST',
              message: res.statusCode >= 500
                ? 'Une erreur interne est survenue. Veuillez réessayer ultérieurement.'
                : 'La requête envoyée est invalide.'
            };
            chunk = JSON.stringify(payload);
            res.setHeader('content-length', Buffer.byteLength(chunk));
          }
        } catch {
          // A non-JSON response is left unchanged.
        }
      }

      return originalEnd.call(this, chunk, encoding, callback);
    };

    next();
  });

  app.get('/', (_req, res) => res.redirect('/home/webapp/index.html'));

  UI_APPLICATIONS.forEach((application) => {
    const webappPath = path.join(__dirname, 'app', application, 'webapp');
    app.use(`/${application}/webapp`, express.static(webappPath));
  });

  cds.once('served', () => {
    app.use((error, req, res, next) => {
      if (res.headersSent) {
        return next(error);
      }

      const status = Number(error.statusCode || error.status || 500);
      const clientStatus = status >= 400 && status < 500 ? status : 500;
      const messages = {
        400: 'La requête envoyée est invalide.',
        401: 'Authentification requise.',
        403: 'Accès non autorisé.',
        404: 'Ressource introuvable.',
        405: 'Méthode non autorisée.'
      };

      cds.log('http-errors').error('Unhandled HTTP error', {
        method: req.method,
        path: req.path,
        error: error.stack || error.message
      });

      return res.status(clientStatus).json({
        error: {
          code: clientStatus === 500 ? 'INTERNAL_ERROR' : `HTTP_${clientStatus}`,
          message: messages[clientStatus] || 'Une erreur interne est survenue. Veuillez réessayer ultérieurement.'
        }
      });
    });
  });
});

module.exports = cds.server;
