# mmlog

mmlog is a very primitive tool for dumping chat history from a Mattermost
chat server.

## Download and install

    $ npm install -g mmlog

or:

    $ git clone https://github.com/davepacheco/mmlog
    $ cd mmlog
    $ npm install

## Generate a Mattermost authentication token

Before running the tool, you need to generate a Mattermost authentication token.
You can do this using curl(1) from the command-line, and the easiest way is to
[follow the instructions in the Mattermost API
documentation](https://api.mattermost.com/#tag/authentication).

## Generate an mmlog configuration file

`mmlog` looks for a configuration file in `$HOME/.mmlogrc`.  This should
be a JSON object with properties describing:

* `host`, the host of your chat server (assumed to be running over https)
* `login_id`, your login id
* `token`, the authentication token described above
* `default_team`, the team whose channels you want to search with `mmlog`

Here's an example (with the token elided):

    $ cat ~/.mmlogrc
    {
        "host": "chat.joyent.us",
        "login_id": "dap",
        "token": "...",
        "default_team": "joyent"
    }

## Run the program

With all that in place, you can run the program like this:

    $ mmlog mib | tail -1
    2017-09-01 14:03:29.993 ryan.zezeski           I do like me some lovely ticket prose.

In general, use:

    mmlog [OPTIONS] CHANNEL

to print up to 1000 messages from channel `CHANNEL`.

The only option right now is `--since DATE_TIME`, which selects messages
starting from the specified timestamp.  This should generally be an [ISO
8601](https://www.w3.org/TR/NOTE-datetime) Date or DateTime, such as one of
these:

    mmlog --since=2017-09-01 mib
    mmlog --since=2017-09-01T13:00Z mib

The timestamp is currently interpreted as UTC unless it contains a timezone in
it, as in:

    mmlog --since='2017-09-01T13:00-07:00' mib

However, timestamps for individual chat messages are printed in an
ISO-8601-like format in the local time zone.
