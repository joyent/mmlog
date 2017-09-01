/*
 * lib/mattermost.js: primitive utilities for talking to a Mattermost server
 */

/* Interface exported to the rest of this module */
exports.mmRequest = mmRequest;
exports.mmPaginatedList = mmPaginatedList;

var mod_assertplus = require('assert-plus');
var mod_https = require('https');
var mod_jsprim = require('jsprim');
var mod_path = require('path');
var mod_querystring = require('querystring');
var VError = require('verror');

/*
 * Makes a single request to a mattermost server, buffers the response (up to a
 * maximum size), and returns the JSON-parsed result (or an error).
 *
 * Named arguments:
 *
 *     server    see the MattermostServerConfig in lib/config.js
 *
 *     method    HTTP request method (see same-named property in Node
 *               http.request()).
 *
 *     resource  HTTP resource (path name, not including query string)
 *
 *     query     HTTP query string (as an object)
 */
function mmRequest(args, callback)
{
	var rqargs, headers, pathname;
	var request, done, aborted;
	var maxlength = 20 * 1024 * 1024;

	mod_assertplus.object(args, 'args');
	mod_assertplus.object(args.server, 'args.server');
	mod_assertplus.string(args.server.mmc_host, 'args.server.mmc_host');
	mod_assertplus.string(args.server.mmc_token, 'args.server.mmc_token');
	mod_assertplus.string(args.server.mmc_api_root,
	    'args.server.mmc_api_root');
	mod_assertplus.string(args.method, 'args.method');
	mod_assertplus.string(args.resource, 'args.resource');
	mod_assertplus.optionalObject(args.query, 'args.query');

	headers = {};
	headers['authorization'] = 'Bearer ' + args.server.mmc_token;

	pathname = mod_path.join(args.server.mmc_api_root, args.resource);
	if (args.query !== undefined) {
		pathname += '?' + mod_querystring.stringify(args.query);
	}

	rqargs = {
	    'host': args.server.mmc_host,
	    'method': args.method,
	    'path': pathname,
	    'headers': headers
	};

	console.error('request: %s %s',
	    rqargs.method, JSON.stringify(rqargs.path));
	request = mod_https.request(rqargs);

	/*
	 * We currently really only support GETs and other requests with empty
	 * bodies.
	 */
	request.end();

	/*
	 * Hopefully, there's exactly one path that results in us invoking the
	 * user's callback.  But it's not super clear from the Node HTTP API
	 * that exactly one of the paths below will execute.  Rather than
	 * sloppily ignoring other paths, we assert that only one of these ever
	 * executes.  If we blow the assertion, we need to figure out how to fix
	 * the code (in a way that doesn't just ignore the subsequent calls,
	 * unless that's provably the correct behavior).
	 */
	done = false;
	request.on('error', function onRequestError(err) {
		mod_assertplus.ok(!done, 'multiple callback paths');
		done = true;
		err = new VError(err, '%s "%s"',
		    rqargs.method, rqargs.path);
		callback(err);
	});

	aborted = false;
	request.on('response', function onResponseHeaders(response) {
		var d = '';

		/*
		 * We always wait until the entire response is read before
		 * taking action based on the status code or contents.
		 *
		 * If we get a huge response, stop saving it and fail this
		 * operation gracefully.
		 */
		response.on('data', function onResponseData(c) {
			var cs;

			if (aborted) {
				return;
			}

			cs = c.toString('utf8');
			if (d.length + cs.length > maxlength) {
				aborted = true;
				return;
			}

			d += cs;
		});

		response.on('end', function onResponseEnd() {
			var j;

			mod_assertplus.ok(!done, 'multiple callback paths');
			done = true;

			if (aborted) {
				callback(new VError('response was too large ' +
				    '(exceeded %d bytes)', maxlength));
				return;
			}

			if (response.statusCode >= 300 &&
			    response.statusCode < 400) {
				callback(new VError(
				    '300-level redirects not supported'));
				return;
			}

			try {
				j = JSON.parse(d);
			} catch (ex) {
				callback(new VError(ex,
				    'parsing response of %s "%s" (content: %s)',
				    rqargs.method, rqargs.path, d));
				return;
			}

			if (response.statusCode >= 400) {
				if (j.message) {
					callback(new VError(
					    'unexpected status code %d: %s',
					    response.statusCode, j.message));
				} else {
					callback(new VError(
					    'unexpected status code %d ' +
					    '(content: %s)',
					    response.statusCode, d));
				}
				return;
			}

			callback(null, j);
		});
	});
}

/*
 * Paginate through an API that returns a list.  This function takes the same
 * arguments as mmRequest, but repeats the request for additional pages until
 * we get a page that's not full of results.
 */
function mmPaginatedList(uargs, callback)
{
	var args;

	/*
	 * Copy the arguments provided by the caller so that we can muck with
	 * "query" in order to set "page".
	 */
	args = mod_jsprim.deepCopy(uargs);
	if (args.query !== undefined) {
		mod_assertplus.ok(args.query.page === undefined,
		    'cannot use "page" option with mmPaginatedList');
	} else {
		args.query = {};
	}

	if (args.query.per_page === undefined) {
		args.query.per_page = 200;
	}

	mmPaginatedListPage(args, 0, [], callback);
}

function mmPaginatedListPage(args, whichpage, results, callback)
{
	var perpage;

	mod_assertplus.number(args.query.per_page);
	perpage = args.query.per_page;
	args.query.page = whichpage;
	mmRequest(args, function (err, resultspage) {
		if (err) {
			err = new VError(err, 'page "%d"', whichpage);
			callback(err);
			return;
		}

		if (!Array.isArray(resultspage)) {
			callback(new VError('expected array'));
			return;
		}

		resultspage.forEach(function (r) { results.push(r); });
		if (resultspage.length < perpage) {
			callback(null, results);
			return;
		}

		mmPaginatedListPage(args, whichpage + 1, results, callback);
	});
}
