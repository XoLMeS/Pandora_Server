var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');

var Schema = mongoose.Schema;

var MsgSchema = new mongoose.Schema({
	username: {
		type: String,
		require: true 
	},
	content: {
		type: String,
		require: true 
	},
	created: Date,
	serverId: {
		type: Schema.Types.ObjectId,
		require: true
	},
	channelId: {
		type: Schema.Types.ObjectId,
		require: true
	}
});

MsgSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Message', MsgSchema);