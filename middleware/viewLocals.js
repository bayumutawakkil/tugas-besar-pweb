'use strict';

const { getPendingInvitations } = require('../models/penelitianModel');

async function attachViewLocals(req, res, next) {
  if (!req.user) return next();

  try {
    const pendingInvites = await getPendingInvitations(req.user.id);
    res.locals.pendingInviteCount = pendingInvites.length;
    res.locals.pendingInvites = pendingInvites;
  } catch (err) {
    console.error('[viewLocals] attachViewLocals error:', err);
    res.locals.pendingInviteCount = 0;
    res.locals.pendingInvites = [];
  }

  return next();
}

module.exports = { attachViewLocals };
