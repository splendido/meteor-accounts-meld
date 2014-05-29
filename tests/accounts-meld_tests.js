if (Meteor.isServer) {
    var http = Npm.require("http");

    // server
    Meteor.publish("usersData", function () {
        return Meteor.users.find();
    });

    // connect middleware
    OAuth._requestHandlers["3"] = function(service, query, res) {
        // check if user authorized access
        if (!query.error) {
            // Prepare the login results before returning.
            // Run service-specific handler.
            var oauthResult = service.handleOauthRequest(query);
            // Store the login result so it can be retrieved in another
            // browser tab by the result handler
            OAuth._storePendingCredential(query.state, {
                serviceName: service.serviceName,
                serviceData: oauthResult.serviceData,
                options: oauthResult.options
            });
        }
        // Either close the window, redirect, or render nothing
        // if all else fails
        OAuth._renderOauthResults(res, query);
    };

    Meteor.methods({
        getUsersCount: function() {
            return Meteor.users.find().count();
        },
        getUserToken: function(user) {
            var userId = Meteor.users.findOne(user)._id;
            Accounts._insertLoginToken(userId, Accounts._generateStampedLoginToken());
            var hashedToken = Meteor.users.findOne(userId).services.resume.loginTokens[0].hashedToken;
            return hashedToken;
        },
        insertUser: function(user) {
            Meteor.users.insert(user);
        },
        loginUser: function(user) {
            var userId = Meteor.users.findOne(user)._id;
            this.setUserId(userId);
        },
        registerService: function(serviceName, user, callback) {
            var userServiceId = user.services[serviceName].id || Random.id();
            ServiceConfiguration.configurations.insert({
                service: serviceName
            });
            // register a fake login service
            OAuth.registerService(serviceName, 3, null, function(query) {
                return {
                    options: {
                      profile: user.profile
                    },
                    serviceData: user.services[serviceName],
                };
            });
            if (callback)
                callback();
        },
        setupTests: function() {
            Meteor.users.remove({});
            MeldActions.remove({});
            //console.log("Users count: " + Meteor.users.find().count());
        },
        unregisterService: function(serviceName) {
            OAuthTest.unregisterService(serviceName);
        }
    });
}


if (Meteor.isClient) {

    Meteor.subscribe("usersData");

    // Declares some dummy users to be used in different combinations
    //
    //  variable name  Service      Email     Verified
    //
    //  userPwd1_nV    password     pippo1    false
    //  userPwd1_V     password     pippo1    true
    //  userPwd2_nV    password     pippo2    false
    //  userPwd2_V     password     pippo2    true
    //  userFB2_nV     foobook      pippo1    false
    //  userFB2_V      foobook      pippo1    true
    //  userFB2_nV     foobook      pippo2    false
    //  userFB2_V      foobook      pippo2    true
    //  userLO1_nV     linkedout    pippo1    false
    //  userLO1_V      linkedout    pippo1    true
    //  userLO2_nV     linkedout    pippo2    false
    //  userLO2_V      linkedout    pippo2    true
    //

    // User registered with service password with non-verified email
    var userPwd1_nV = {
        username: Random.id(),
        email: "pippo1@example",
        emails: [{address: "pippo1@example.com",verified: false}],
        profile: {id: "password1-non-verified"},
        services: {password: {
            srp: SRP.generateVerifier("password1-non-verified")
        }}
    };
    // User registered with service password with Verified email
    var userPwd1_V = {
        username: Random.id(),
        email: "pippo1@example",
        emails: [{address: "pippo1@example.com",verified: true}],
        profile: {id: "password1-verified"},
        services: {password: {
            srp: SRP.generateVerifier("password1-verified")
        }}
    };
    // User registered with service password with non-Verified email
    var userPwd2_nV = {
        username: Random.id(),
        email: "pippo2@example",
        emails: [{address: "pippo2@example.com",verified: false}],
        profile: {id: "password2-non-verified"},
        services: {password: {
            srp: SRP.generateVerifier("password2-non-verified")
        }}
    };
    // User registered with service password with Verified email
    var userPwd2_V = {
        username: Random.id(),
        email: "pippo2@example",
        emails: [{address: "pippo2@example.com",verified: true}],
        profile: {id: "password2-verified"},
        services: {password: {
            srp: SRP.generateVerifier("password2-verified")
        }}
    };
    // User registered with service foobook with non-Verified email
    var userFB1_nV = {
        profile: {id: "foobook1-non-verified"},
        services: { "foobook": {
            "id": Random.id(),
            "emailAddress": "pippo1@best.com",
            "verified_email": false
        }}
    };
    // User registered with service foobook with Verified email
    var userFB1_V = {
        profile: {id: "foobook1-verified"},
        services: { "foobook": {
            "id": Random.id(),
            "emailAddress": "pippo1@best.com",
            "verified_email": true
        }}
    };
    // User registered with service foobook with non-Verified email
    var userFB2_nV = {
        profile: {id: "foobook2-non-verified"},
        services: { "foobook": {
            "id": Random.id(),
            "emailAddress": "pippo2@best.com",
            "verified_email": false
        }}
    };
    // User registered with service foobook with Verified email
    var userFB2_V = {
        profile: {id: "foobook2-verified"},
        services: { "foobook": {
            "id": Random.id(),
            "emailAddress": "pippo2@best.com",
            "verified_email": true
        }}
    };
    // User registered with service linkedout with non-Verified email
    var userLO1_nV = {
        profile: {id: "linkedout1-non-verified"},
        services: { "linkedout": {
            "id": Random.id(),
            "emailAddress": "pippo1@best.com",
            "verified_email": false
        }}
    };
    // User registered with service linkedout with Verified email
    var userLO1_V = {
        profile: {id: "linkedout1-verified"},
        services: { "linkedout": {
            "id": Random.id(),
            "emailAddress": "pippo1@best.com",
            "verified_email": true
        }}
    };
    // User registered with service linkedout with non-Verified email
    var userLO2_nV = {
        profile: {id: "linkedout2-non-verified"},
        services: { "linkedout": {
            "id": Random.id(),
            "emailAddress": "pippo2@best.com",
            "verified_email": false
        }}
    };
    // User registered with service linkedout with Verified email
    var userLO2_V = {
        profile: {id: "linkedout2-verified"},
        services: { "linkedout": {
            "id": Random.id(),
            "emailAddress": "pippo2@best.com",
            "verified_email": true,
        }}
    };

    // Declares some handy function for user management, login and testing
    var assertMeldActionsCount = function(count){
        return function(test, expect) {
            test.equal(MeldActions.find().count(), count);
        };
    };
    var assertUsersCount = function(count){
        return function(test, expect) {
            Meteor.call("getUsersCount", expect(function(error, usersCount){
                test.equal(usersCount, count);
            }));
        };
    };
    var insertUsers = function(users){
        return function(test, expect) {
            _.forEach(users, function(user){
                Meteor.call("insertUser", user, justWait(test, expect));
            });
        };
    };
    var loggedInAs = function(user) {
        return function(test, expect) {
            test.notEqual(Meteor.userId(), null);
            var user = Meteor.user();
            test.notEqual(user, null);
            if (user)
                test.equal(Meteor.user().profile.id, user.profile.id);
        };
    };
    var login3rdParty = function(test, expect) {
        var credentialSecret = OAuth._retrieveCredentialSecret(this.credentialToken) || null;
        Accounts.callLoginMethod({
            methodArguments: [{oauth: {
                    credentialToken: this.credentialToken,
                    credentialSecret: credentialSecret
            }}],
            userCallback: noError(test, expect)
        });
    };
    var logoutStep = function(test, expect) {
        Meteor.logout(expect(function(error) {
            test.equal(error, undefined);
            test.equal(Meteor.user(), null);
        }));
    };
    var noError = function(test, expect) {
        return expect(function(error) {
            test.equal(error, undefined);
        });
    };
    var justWait = function(test, expect) {
        return expect(function() {});
    };
    var pwdLogin = function(user){
        return function (test, expect) {
            Meteor.loginWithPassword({username: user.username}, user.profile.id, noError(test, expect));
        };
    };
    var registerService = function(serviceName, user) {
        return function(test, expect) {
            Meteor.call("registerService", serviceName, user, justWait(test, expect));
        };
    };
    var resetAll = function(test, expect) {
        Meteor.call("setupTests");
    };
    var start3rdPartyLogin = function(serviceName) {
        return function(test, expect) {
            var credentialToken = Random.id();
            this.credentialToken = credentialToken;
            Meteor.http.post(
                "/_oauth/" + serviceName + "?state=" + credentialToken,
                justWait(test, expect)
            );
        };
    };
    var unregisterService = function(serviceName){
        return function(test, expect) {
            Meteor.call("unregisterService", serviceName, justWait(test, expect));
        };
    };


    // -----------------------
    // Actual tests definition
    // -----------------------

    // Handy function for creating test sequences
    var testPwdLoginWithUsersNoMeld = function(testSequence, users){
        // The first user in list will be used to perform the login test
        testSequence.push.apply(testSequence, [
            resetAll,
            insertUsers(users),
            assertUsersCount(users.length),
            pwdLogin(users[0]),
            loggedInAs(users[0]),
            assertMeldActionsCount(0),
            logoutStep,
        ]);
    };
    // No meld actions are expected to be created here...
    testSequence = [];
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_nV]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd2_nV]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_V]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd2_V]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_nV, userPwd2_nV]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd2_nV, userPwd1_nV]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_V,  userPwd2_V]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd2_V,  userPwd1_V]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_nV, userPwd2_V]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd2_V,  userPwd1_nV]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_V,  userPwd2_nV]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd2_nV, userPwd1_V]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_nV, userFB2_nV, userFB2_nV, userLO1_nV, userLO2_nV]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_nV, userFB2_nV, userFB2_nV, userLO1_nV, userLO2_V]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_nV, userFB2_nV, userFB2_nV, userLO1_V,  userLO2_nV]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_nV, userFB2_nV, userFB2_nV, userLO1_V,  userLO2_V]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_nV, userFB2_nV, userFB2_V,  userLO1_nV, userLO2_nV]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_nV, userFB2_nV, userFB2_V,  userLO1_nV, userLO2_V]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_nV, userFB2_nV, userFB2_V,  userLO1_V,  userLO2_nV]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_nV, userFB2_nV, userFB2_V,  userLO1_V,  userLO2_V]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_nV, userFB2_V,  userFB2_nV, userLO1_nV, userLO2_nV]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_nV, userFB2_V,  userFB2_nV, userLO1_nV, userLO2_V]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_nV, userFB2_V,  userFB2_nV, userLO1_V,  userLO2_nV]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_nV, userFB2_V,  userFB2_nV, userLO1_V,  userLO2_V]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_nV, userFB2_V,  userFB2_V,  userLO1_nV, userLO2_nV]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_nV, userFB2_V,  userFB2_V,  userLO1_nV, userLO2_V]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_nV, userFB2_V,  userFB2_V,  userLO1_V,  userLO2_nV]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_nV, userFB2_V,  userFB2_V,  userLO1_V,  userLO2_V]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_V,  userFB2_nV, userFB2_nV, userLO1_nV, userLO2_nV]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_V,  userFB2_nV, userFB2_nV, userLO1_nV, userLO2_V]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_V,  userFB2_nV, userFB2_V,  userLO1_nV, userLO2_nV]);
    testPwdLoginWithUsersNoMeld(testSequence, [userPwd1_V,  userFB2_nV, userFB2_V,  userLO1_nV, userLO2_V]);
    testSequence.push(resetAll);
    testAsyncMulti("passwords - login with password tests (no melds)", testSequence);

    // Handy function for creating test sequences
    var test3rdPartyLoginWithUsersNoMeld = function(testSequence, userToLogInWith3rdParty, users){
        // The first user in list will be used to perform the pwd login
        var serviceName = _.keys(userToLogInWith3rdParty.services)[0];
        testSequence.push.apply(testSequence, [
            resetAll,
            insertUsers(users),
            assertUsersCount(users.length),
            unregisterService(serviceName),
            registerService(serviceName, userToLogInWith3rdParty),
            start3rdPartyLogin(serviceName),
            login3rdParty,
            loggedInAs(userToLogInWith3rdParty),
            assertMeldActionsCount(0),
            logoutStep,
            unregisterService(serviceName),
        ]);
    };

    // No meld actions are expected to be created here...
    testSequence = [];
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, []);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_V, []);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, []);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_V, []);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, []);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_V, []);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, []);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_V, []);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_nV, userPwd2_nV, userFB2_nV, userLO1_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_nV, userPwd2_nV, userFB2_nV, userLO1_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_nV, userPwd2_nV, userFB2_nV, userLO1_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_nV, userPwd2_nV, userFB2_nV, userLO1_V,  userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_nV, userPwd2_nV, userFB2_V,  userLO1_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_nV, userPwd2_nV, userFB2_V,  userLO1_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_nV, userPwd2_nV, userFB2_V,  userLO1_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_nV, userPwd2_nV, userFB2_V,  userLO1_V,  userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_nV, userPwd2_V,  userFB2_nV, userLO1_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_nV, userPwd2_V,  userFB2_nV, userLO1_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_nV, userPwd2_V,  userFB2_nV, userLO1_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_nV, userPwd2_V,  userFB2_nV, userLO1_V,  userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_nV, userPwd2_V,  userFB2_V,  userLO1_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_nV, userPwd2_V,  userFB2_V,  userLO1_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_nV, userPwd2_V,  userFB2_V,  userLO1_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_nV, userPwd2_V,  userFB2_V,  userLO1_V,  userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_V,  userPwd2_nV, userFB2_nV, userLO1_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_V,  userPwd2_nV, userFB2_nV, userLO1_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_V,  userPwd2_nV, userFB2_nV, userLO1_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_V,  userPwd2_nV, userFB2_nV, userLO1_V,  userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_V,  userPwd2_nV, userFB2_V,  userLO1_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_V,  userPwd2_nV, userFB2_V,  userLO1_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_V,  userPwd2_nV, userFB2_V,  userLO1_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_V,  userPwd2_nV, userFB2_V,  userLO1_V,  userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_V,  userPwd2_V,  userFB2_nV, userLO1_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_V,  userPwd2_V,  userFB2_nV, userLO1_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_V,  userPwd2_V,  userFB2_nV, userLO1_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_V,  userPwd2_V,  userFB2_nV, userLO1_V,  userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_V,  userPwd2_V,  userFB2_V,  userLO1_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_V,  userPwd2_V,  userFB2_V,  userLO1_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_V,  userPwd2_V,  userFB2_V,  userLO1_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1_nV, [userPwd1_V,  userPwd2_V,  userFB2_V,  userLO1_V,  userLO2_V ]);

    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_nV, userPwd2_nV, userFB1_nV, userLO1_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_nV, userPwd2_nV, userFB1_nV, userLO1_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_nV, userPwd2_nV, userFB1_nV, userLO1_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_nV, userPwd2_nV, userFB1_nV, userLO1_V,  userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_nV, userPwd2_nV, userFB1_V,  userLO1_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_nV, userPwd2_nV, userFB1_V,  userLO1_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_nV, userPwd2_nV, userFB1_V,  userLO1_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_nV, userPwd2_nV, userFB1_V,  userLO1_V,  userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_nV, userPwd2_V,  userFB1_nV, userLO1_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_nV, userPwd2_V,  userFB1_nV, userLO1_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_nV, userPwd2_V,  userFB1_nV, userLO1_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_nV, userPwd2_V,  userFB1_nV, userLO1_V,  userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_nV, userPwd2_V,  userFB1_V,  userLO1_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_nV, userPwd2_V,  userFB1_V,  userLO1_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_nV, userPwd2_V,  userFB1_V,  userLO1_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_nV, userPwd2_V,  userFB1_V,  userLO1_V,  userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_V,  userPwd2_nV, userFB1_nV, userLO1_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_V,  userPwd2_nV, userFB1_nV, userLO1_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_V,  userPwd2_nV, userFB1_nV, userLO1_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_V,  userPwd2_nV, userFB1_nV, userLO1_V,  userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_V,  userPwd2_nV, userFB1_V,  userLO1_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_V,  userPwd2_nV, userFB1_V,  userLO1_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_V,  userPwd2_nV, userFB1_V,  userLO1_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_V,  userPwd2_nV, userFB1_V,  userLO1_V,  userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_V,  userPwd2_V,  userFB1_nV, userLO1_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_V,  userPwd2_V,  userFB1_nV, userLO1_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_V,  userPwd2_V,  userFB1_nV, userLO1_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_V,  userPwd2_V,  userFB1_nV, userLO1_V,  userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_V,  userPwd2_V,  userFB1_V,  userLO1_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_V,  userPwd2_V,  userFB1_V,  userLO1_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_V,  userPwd2_V,  userFB1_V,  userLO1_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userFB2_nV, [userPwd1_V,  userPwd2_V,  userFB1_V,  userLO1_V,  userLO2_V ]);

    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_nV, userPwd2_nV, userFB1_nV, userFB2_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_nV, userPwd2_nV, userFB1_nV, userFB2_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_nV, userPwd2_nV, userFB1_nV, userFB2_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_nV, userPwd2_nV, userFB1_nV, userFB2_V,  userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_nV, userPwd2_nV, userFB1_V,  userFB2_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_nV, userPwd2_nV, userFB1_V,  userFB2_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_nV, userPwd2_nV, userFB1_V,  userFB2_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_nV, userPwd2_nV, userFB1_V,  userFB2_V,  userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_nV, userPwd2_V,  userFB1_nV, userFB2_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_nV, userPwd2_V,  userFB1_nV, userFB2_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_nV, userPwd2_V,  userFB1_nV, userFB2_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_nV, userPwd2_V,  userFB1_nV, userFB2_V,  userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_nV, userPwd2_V,  userFB1_V,  userFB2_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_nV, userPwd2_V,  userFB1_V,  userFB2_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_nV, userPwd2_V,  userFB1_V,  userFB2_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_nV, userPwd2_V,  userFB1_V,  userFB2_V,  userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_V,  userPwd2_nV, userFB1_nV, userFB2_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_V,  userPwd2_nV, userFB1_nV, userFB2_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_V,  userPwd2_nV, userFB1_nV, userFB2_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_V,  userPwd2_nV, userFB1_nV, userFB2_V,  userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_V,  userPwd2_nV, userFB1_V,  userFB2_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_V,  userPwd2_nV, userFB1_V,  userFB2_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_V,  userPwd2_nV, userFB1_V,  userFB2_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_V,  userPwd2_nV, userFB1_V,  userFB2_V,  userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_V,  userPwd2_V,  userFB1_nV, userFB2_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_V,  userPwd2_V,  userFB1_nV, userFB2_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_V,  userPwd2_V,  userFB1_nV, userFB2_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_V,  userPwd2_V,  userFB1_nV, userFB2_V,  userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_V,  userPwd2_V,  userFB1_V,  userFB2_nV, userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_V,  userPwd2_V,  userFB1_V,  userFB2_nV, userLO2_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_V,  userPwd2_V,  userFB1_V,  userFB2_V,  userLO2_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO1_nV, [userPwd1_V,  userPwd2_V,  userFB1_V,  userFB2_V,  userLO2_V ]);

    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_nV, userPwd2_nV, userFB1_nV, userFB2_nV, userLO1_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_nV, userPwd2_nV, userFB1_nV, userFB2_nV, userLO1_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_nV, userPwd2_nV, userFB1_nV, userFB2_V,  userLO1_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_nV, userPwd2_nV, userFB1_nV, userFB2_V,  userLO1_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_nV, userPwd2_nV, userFB1_V,  userFB2_nV, userLO1_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_nV, userPwd2_nV, userFB1_V,  userFB2_nV, userLO1_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_nV, userPwd2_nV, userFB1_V,  userFB2_V,  userLO1_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_nV, userPwd2_nV, userFB1_V,  userFB2_V,  userLO1_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_nV, userPwd2_V, userFB1_nV, userFB2_nV, userLO1_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_nV, userPwd2_V, userFB1_nV, userFB2_nV, userLO1_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_nV, userPwd2_V, userFB1_nV, userFB2_V,  userLO1_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_nV, userPwd2_V, userFB1_nV, userFB2_V,  userLO1_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_nV, userPwd2_V, userFB1_V,  userFB2_nV, userLO1_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_nV, userPwd2_V, userFB1_V,  userFB2_nV, userLO1_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_nV, userPwd2_V, userFB1_V,  userFB2_V,  userLO1_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_nV, userPwd2_V, userFB1_V,  userFB2_V,  userLO1_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_V, userPwd2_nV, userFB1_nV, userFB2_nV, userLO1_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_V, userPwd2_nV, userFB1_nV, userFB2_nV, userLO1_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_V, userPwd2_nV, userFB1_nV, userFB2_V,  userLO1_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_V, userPwd2_nV, userFB1_nV, userFB2_V,  userLO1_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_V, userPwd2_nV, userFB1_V,  userFB2_nV, userLO1_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_V, userPwd2_nV, userFB1_V,  userFB2_nV, userLO1_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_V, userPwd2_nV, userFB1_V,  userFB2_V,  userLO1_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_V, userPwd2_nV, userFB1_V,  userFB2_V,  userLO1_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_V, userPwd2_V, userFB1_nV, userFB2_nV, userLO1_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_V, userPwd2_V, userFB1_nV, userFB2_nV, userLO1_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_V, userPwd2_V, userFB1_nV, userFB2_V,  userLO1_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_V, userPwd2_V, userFB1_nV, userFB2_V,  userLO1_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_V, userPwd2_V, userFB1_V,  userFB2_nV, userLO1_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_V, userPwd2_V, userFB1_V,  userFB2_nV, userLO1_V ]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_V, userPwd2_V, userFB1_V,  userFB2_V,  userLO1_nV]);
    test3rdPartyLoginWithUsersNoMeld(testSequence, userLO2_nV, [userPwd1_V, userPwd2_V, userFB1_V,  userFB2_V,  userLO1_V ]);
    testSequence.push(resetAll);
    testAsyncMulti("passwords - login with 3rd-party service tests (no melds)", testSequence);


    /*
    // Handy function for creating test sequences
    var test3rPartyLoginAfterPwdLoginWithUsersNoMeld = function(testSequence, users, userToLogInWith3rdParty){
        // The first user in list will be used to perform the pwd login
        testSequence.push(resetAll);
        testSequence.push(insertUsers(users));
        testSequence.push(assertUsersCount(users.length));
        testSequence.push(pwdLogin(users[0]));
        testSequence.push(loggedInAs(users[0]));
        testSequence.push(assertMeldActionsCount(0));

        var serviceName = _.keys(userToLogInWith3rdParty.services)[0];
        testSequence.push(registerService(serviceName, userToLogInWith3rdParty));
        testSequence.push(start3rdPartyLogin(serviceName));
        testSequence.push(login3rdParty);
        testSequence.push(loggedInAs(userToLogInWith3rdParty));
        testSequence.push(assertMeldActionsCount(0));
        testSequence.push(logoutStep);
        testSequence.push(unregisterService(serviceName));
    };
    */  
}