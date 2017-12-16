var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');

var Schema = mongoose.Schema;

var MsgSchema = new mongoose.Schema({
	title: {
		type: String,
		require: true 
	},
	created: Date,
	users: {
		type: [String]
	},
	channels: {
		type: [Schema.Types.ObjectId]
	},
	roles: {
		type: [Schema.Types.ObjectId]
	}, 
	img: { 
		data: Buffer, 
		contentType: String 
	}
});

MsgSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Server', MsgSchema);