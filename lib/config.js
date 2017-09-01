/*
 * lib/config.js: facilities for configuring this tool
 */

/* Interface exported to the rest of this module */
exports.mmLoadServerConfig = mmLoadServerConfig;

var mod_assertplus = require('assert-plus');
var mod_fs = require('fs');
var mod_jsprim = require('jsprim');
var mod_path = require('path');
var VError = require('verror');

/*
 * Schema for the .mmlogrc configuration file.
 *
 * Snake case isn't really idiomatic here, but it allows these properties to
 * match corresponding parameters in the Mattermost API.
 */
var MmlogConfigSchema = {
    'type': 'object',
    'properties': {
	'login_id':     { 'type': 'string', 'required': true },
	'token':        { 'type': 'string', 'required': true },
	'host':         { 'type': 'string', 'required': true },
	'default_team': { 'type': 'string', 'required': true }
    }
};

/*
 * Describes how to talk with the API on a remote Mattermost server.  This class
 * is used like a struct inside this module (i.e., just a bunch of public
 * fields), and the fields are generally immutable once they have been set.
 */
function MattermostServerConfig()
{
	/* chat server (assumed to be https) */
	this.mmc_host = null;

	/* root of API at the remote server  */
	this.mmc_api_root = '/api/v4';

	/* authentication login name */
	this.mmc_login_id = null;

	/* authentication token */
	this.mmc_token = null;

	/* default team to use in API */
	this.mmc_default_team = null;
}

/*
 * Loads configuration from $HOME/.mmlogrc.
 */
function mmLoadServerConfig(callback)
{
	var path;

	if (!process.env['HOME']) {
		setImmediate(callback, new VError(
		    'cannot find "$HOME/.mmlogrc" ($HOME not set)'));
		return;
	}

	path = mod_path.join(process.env['HOME'], '.mmlogrc');
	mod_fs.readFile(path, function (err, contents) {
		var config, error, rv;

		if (err) {
			callback(new VError(err, 'read "%s"', path));
			return;
		}

		try {
			config = JSON.parse(contents);
		} catch (ex) {
			callback(new VError(ex, 'parse "%s"', path));
			return;
		}

		error = mod_jsprim.validateJsonObject(
		    MmlogConfigSchema, config);
		if (error instanceof Error) {
			callback(new VError(error, 'validate "%s"', path));
			return;
		}

		mod_assertplus.object(config, 'config');
		mod_assertplus.string(config.host, 'config.host');
		mod_assertplus.string(config.login_id, 'config.login_id');
		mod_assertplus.string(config.token, 'config.token');
		mod_assertplus.string(config.default_team,
		    'config.default_team');

		rv = new MattermostServerConfig();
		rv.mmc_host = config.host;
		rv.mmc_login_id = config.login_id;
		rv.mmc_token = config.token;
		rv.mmc_default_team = config.default_team;
		callback(null, rv);
	});
}
