var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');

var MsgSchema = new mongoose.Schema({
	title: {
		type: String,
		require: true 
	}
});

MsgSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Channel', MsgSchema);