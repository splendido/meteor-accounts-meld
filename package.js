Package.describe (
    {
        "summary" : "Meteor package to meld user accounts registered with the same email address, or associate many different 3rd-party login services with the same user account."
    }
);
Package.on_use(function (api) {
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
