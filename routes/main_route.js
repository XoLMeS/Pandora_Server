const msgRoutes = require('./msg_routes');
module.exports = function(app, db) {
  msgRoutes(app, db);
};