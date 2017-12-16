var mongoose = require('mongoose');

var autoIncrement = require('mongoose-auto-increment');
autoIncrement.initialize(mongoose.connection);

var models = require('require_tree').require_tree('./db/models/');
    
module.exports = function() {

    mongoose.connection.on('open', function() {
        console.log('Connected to mongo server!');
    });

    mongoose.connection.on('error', function(err) {
        console.log('Could not connect to mongo server!');
        console.log(err.message);
    });

    try {
        mongoose.connect("mongodb://localhost:27017/test");
    } catch (err) {
        console.log(err);
    }
};