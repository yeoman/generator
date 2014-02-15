var ReadlineStub = require('./readline');
var _ = require("lodash");
var inquirer = _.clone( require('inquirer') );

var readline = new ReadlineStub();
inquirer.ui.Prompt.prototype.rl = readline;

module.exports = {
	prompt: function (config, cb) {
		inquirer.prompt.apply(inquirer, arguments);
	},

	readline: readline
};