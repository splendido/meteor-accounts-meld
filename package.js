Package.on_use(function (api) {
    api.use([
        'accounts-base',
    ], ['server']);

    api.add_files([
        'lib/accounts-emails-field/accounts-emails-field.js',
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

    api.use([
        'minimongo',
        'mongo-livedata',
        'templating'
    ], 'client');

    api.add_files([
        'lib/accounts-meld-client.html',
        'lib/accounts-meld-client.js',
    ], ['client']);

    api.export([
        'MeldActions',
    ], ['client']);
});


Package.on_test(function(api) {
    api.use('accounts-meld');

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