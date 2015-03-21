Package.describe({
	summary: "Meteor package to link/meld user accounts registered with the same (verified) email address.",
  version: "1.2.0",
  name: "splendido:accounts-meld",
  git: "https://github.com/splendido/meteor-accounts-meld.git",
});

Package.onUse(function(api) {
  api.versionsFrom("METEOR@1.0.4");

	api.use([
		'accounts-base',
		'check',
		'underscore'
	], ['server']);

	api.add_files([
		'lib/accounts-emails-field/lib/accounts-emails-field.js',
		'lib/accounts-meld-server.js',
		'lib/accounts-meld-hooks.js',
	], ['server']);

	api.imply([
		'accounts-base',
	], ['server']);

	api.export([
		'AccountsMeld',
		'MeldActions',
	], ['server']);
});


Package.onTest(function(api) {
	api.use('splendido:accounts-meld');

	api.use([
		'accounts-base',
		'accounts-oauth',
		'accounts-password',
		'http',
		'oauth',
		'oauth-encryption',
		'oauth2',
		'random',
		'service-configuration',
		'srp',
		'test-helpers',
		'tinytest',
		'underscore'
	], ['client', 'server']);

	api.add_files([
		'tests/accounts-meld_tests.js',
	], ['client', 'server']);
});
