module.exports = function(app, db) {
  app.post('/msg', (req, res) => {
	console.log(req.body)
	res.send('Hello')
  });
};