var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');

var Schema = mongoose.Schema;

var MsgSchema = new mongoose.Schema({
	title: {
		type: String,
		require: true 
	},
	rights: {
		type: Number,
		require: true 
	},
	users: {
		type: [Schema.Types.ObjectId]
	}
});

MsgSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Role', MsgSchema);