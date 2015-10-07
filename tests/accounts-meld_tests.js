/* global
	AccountsMeld: false,
	MeldActions: false,
	OAuth: false,
	OAuthTest: false,
	Random: false,
	ServiceConfiguration: false,
	SRP: false,
	testAsyncMulti: false
*/
'use strict';

var credentialSecret = 'credentialSecret';

if (Meteor.isServer) {
	// Disable default DDP rate limiter
	Accounts.removeDefaultRateLimit();

	// server
	Meteor.publish("usersData", function() {
		return Meteor.users.find();
	});

	// connect middleware
	OAuth._requestHandlers["3"] = function(service, query, res) {
		// check if user authorized access
		if (!query.error) {
			// Prepare the login results before returning.

			// Run service-specific handler.
			var oauthResult = service.handleOauthRequest(query);

			var credentialToken = OAuth._credentialTokenFromQuery(query);

			// Store the login result so it can be retrieved in another
			// browser tab by the result handler
			OAuth._storePendingCredential(credentialToken, {
				serviceName: service.serviceName,
				serviceData: oauthResult.serviceData,
				options: oauthResult.options
			}, credentialSecret);
		}
		// Either close the window, redirect, or render nothing
		// if all else fails
		OAuth._renderOauthResults(res, query, credentialSecret);
	};

	Meteor.methods({
		assertMeldActionsCorrect: function(user, usersToMeld) {
			var userId = Meteor.users.findOne({
				$or: [{
					username: user.username
				}, {
					"profile.id": user.profile.id
				}, ]
			})._id;
			var results = _.map(usersToMeld, function(userToMeld) {
				var userToMeldId = Meteor.users.findOne({
					$or: [{
						username: userToMeld.username
					}, {
						"profile.id": userToMeld.profile.id
					}, ]
				})._id;
				return MeldActions.findOne({
					src_user_id: userToMeldId,
					dst_user_id: userId,
					meld: "ask"
				});
			}, {
				userId: userId
			});
			return _.all(results);
		},
		assertUsersMissing: function(users) {
			var usersId = _.map(users, function(user) {
				return {
					_id: user._id
				};
			});
			var foundUsers = Meteor.users.find({
				$or: usersId
			});
			if (foundUsers.count() === 0) {
				return true;
			}
		},
		getMeldActionsCount: function() {
			return MeldActions.find().count();
		},
		getUsersCount: function() {
			return Meteor.users.find().count();
		},
		getUserToken: function(user) {
			user = Meteor.users.findOne(user);
			var userId = user._id;
			Accounts._insertLoginToken(userId, Accounts._generateStampedLoginToken());
			var hashedToken = user.services.resume.loginTokens[0].hashedToken;
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
			// var userServiceId = user.services[serviceName].id || Random.id();
			ServiceConfiguration.configurations.insert({
				service: serviceName
			});
			// register a fake login service
			Accounts.oauth.registerService(serviceName);
			OAuth.registerService(serviceName, 3, null, function() {
				return {
					options: {
						profile: user.profile
					},
					serviceData: user.services[serviceName],
				};
			});
			if (callback) {
				callback();
			}
		},
		setupTests: function() {
			Meteor.users.remove({});
			MeldActions.remove({});
			ServiceConfiguration.configurations.remove({});
		},
		unregisterService: function(serviceName) {
			// Meteor.users._dropIndex('services.' + serviceName + '.id');
			Accounts.oauth.unregisterService(serviceName);
			OAuthTest.unregisterService(serviceName);
			ServiceConfiguration.configurations.remove({
				service: serviceName
			});
		},
		setAskBeforeMeld: function(value) {
			AccountsMeld.configure({
				askBeforeMeld: value
			});
		}
	});
}


if (Meteor.isClient) {

	Meteor.subscribe("pendingMeldActions");
	// var MeldActions = new Meteor.Collection('meldActions');

	// Declares some dummy users to be used in different combinations
	//
	//  variable name  Service      Email     Verified
	//
	//  userPwd1NV    password     pippo1    false
	//  userPwd1V     password     pippo1    true
	//  userPwd2NV    password     pippo2    false
	//  userPwd2V     password     pippo2    true
	//  userFB2NV     foobook      pippo1    false
	//  userFB2V      foobook      pippo1    true
	//  userFB2NV     foobook      pippo2    false
	//  userFB2V      foobook      pippo2    true
	//  userLO1NV     linkedout    pippo1    false
	//  userLO1V      linkedout    pippo1    true
	//  userLO2NV     linkedout    pippo2    false
	//  userLO2V      linkedout    pippo2    true
	//

	// User registered with service password with non-verified email
	var userPwd1NV = {
		username: Random.id(),
		email: "pippo1@example",
		emails: [{
			address: "pippo1@example.com",
			verified: false
		}],
		profile: {
			id: "password1-non-verified"
		},
		registered_emails: [{
			address: "pippo1@example.com",
			verified: false
		}],
		services: {
			password: {
				srp: SRP.generateVerifier("password1-non-verified")
			}
		}
	};
	// User registered with service password with Verified email
	var userPwd1V = {
		username: Random.id(),
		email: "pippo1@example",
		emails: [{
			address: "pippo1@example.com",
			verified: true
		}],
		profile: {
			id: "password1-verified"
		},
		registered_emails: [{
			address: "pippo1@example.com",
			verified: true
		}],
		services: {
			password: {
				srp: SRP.generateVerifier("password1-verified")
			}
		}
	};
	// User registered with service password with non-Verified email
	var userPwd2NV = {
		username: Random.id(),
		email: "pippo2@example",
		emails: [{
			address: "pippo2@example.com",
			verified: false
		}],
		profile: {
			id: "password2-non-verified"
		},
		registered_emails: [{
			address: "pippo2@example.com",
			verified: false
		}],
		services: {
			password: {
				srp: SRP.generateVerifier("password2-non-verified")
			}
		}
	};
	// User registered with service password with Verified email
	var userPwd2V = {
		username: Random.id(),
		email: "pippo2@example",
		emails: [{
			address: "pippo2@example.com",
			verified: true
		}],
		profile: {
			id: "password2-verified"
		},
		registered_emails: [{
			address: "pippo2@example.com",
			verified: true
		}],
		services: {
			password: {
				srp: SRP.generateVerifier("password2-verified")
			}
		}
	};
	// User registered with service foobook with non-Verified email
	var userFB1NV = {
		username: Random.id(),
		profile: {
			id: "foobook1-non-verified"
		},
		registered_emails: [{
			address: "pippo1@example.com",
			verified: false
		}],
		services: {
			"foobook": {
				"id": Random.id(),
				"emailAddress": "pippo1@example.com",
				"verified_email": false
			}
		}
	};
	// User registered with service foobook with Verified email
	var userFB1V = {
		username: Random.id(),
		profile: {
			id: "foobook1-verified"
		},
		registered_emails: [{
			address: "pippo1@example.com",
			verified: true
		}],
		services: {
			"foobook": {
				"id": Random.id(),
				"emailAddress": "pippo1@example.com",
				"verified_email": true
			}
		}
	};
	// User registered with service foobook with non-Verified email
	var userFB2NV = {
		username: Random.id(),
		profile: {
			id: "foobook2-non-verified"
		},
		registered_emails: [{
			address: "pippo2@example.com",
			verified: false
		}],
		services: {
			"foobook": {
				"id": Random.id(),
				"emailAddress": "pippo2@example.com",
				"verified_email": false
			}
		}
	};
	// User registered with service foobook with Verified email
	var userFB2V = {
		username: Random.id(),
		profile: {
			id: "foobook2-verified"
		},
		registered_emails: [{
			address: "pippo2@example.com",
			verified: true
		}],
		services: {
			"foobook": {
				"id": Random.id(),
				"emailAddress": "pippo2@example.com",
				"verified_email": true
			}
		}
	};
	// User registered with service linkedout with non-Verified email
	var userLO1NV = {
		username: Random.id(),
		profile: {
			id: "linkedout1-non-verified"
		},
		registered_emails: [{
			address: "pippo1@example.com",
			verified: false
		}],
		services: {
			"linkedout": {
				"id": Random.id(),
				"emailAddress": "pippo1@example.com",
				"verified_email": false
			}
		}
	};
	// User registered with service linkedout with Verified email
	var userLO1V = {
		username: Random.id(),
		profile: {
			id: "linkedout1-verified"
		},
		registered_emails: [{
			address: "pippo1@example.com",
			verified: true
		}],
		services: {
			"linkedout": {
				"id": Random.id(),
				"emailAddress": "pippo1@example.com",
				"verified_email": true
			}
		}
	};
	// User registered with service linkedout with non-Verified email
	var userLO2NV = {
		username: Random.id(),
		profile: {
			id: "linkedout2-non-verified"
		},
		registered_emails: [{
			address: "pippo2@example.com",
			verified: false
		}],
		services: {
			"linkedout": {
				"id": Random.id(),
				"emailAddress": "pippo2@example.com",
				"verified_email": false
			}
		}
	};
	// User registered with service linkedout with Verified email
	var userLO2V = {
		username: Random.id(),
		profile: {
			id: "linkedout2-verified"
		},
		registered_emails: [{
			address: "pippo2@example.com",
			verified: true
		}],
		services: {
			"linkedout": {
				"id": Random.id(),
				"emailAddress": "pippo2@example.com",
				"verified_email": true,
			}
		}
	};

	// Declares some handy function for user management, login and testing
	var AlreadyExistingServiceAddedError = function(test, expect) {
		return expect(function(error) {
			test.equal(
				error.reason,
				"Another account registered with the same service was found!"
			);
		});
	};
	var AlreadyExistingServiceMeldedError = function(test, expect) {
		return expect(function(error) {
			test.equal(
				error.reason,
				"Another account registered with the same service was found, " +
				"and melded with the current one!"
			);
		});
	};
	var askBeforeMeld = function(value) {
		return function(test, expect) {
			Meteor.call("setAskBeforeMeld", value, justWait(test, expect));
		};
	};
	var assertMeldActionsCorrect = function(user, usersToMeld) {
		return function(test, expect) {
			Meteor.call(
				"assertMeldActionsCorrect",
				user,
				usersToMeld,
				expect(function(error, correct) {
					test.isTrue(correct);
				})
			);
		};
	};
	var assertMeldActionsCount = function(count) {
		return function(test, expect) {
			Meteor.call(
				"getMeldActionsCount",
				expect(function(error, meldActionsCount) {
					test.equal(meldActionsCount, count);
				})
			);
		};
	};
	var assertUsersCount = function(count) {
		return function(test, expect) {
			Meteor.call("getUsersCount", expect(function(error, usersCount) {
				test.equal(usersCount, count);
			}));
		};
	};
	var assertUsersMissing = function(users) {
		return function(test, expect) {
			Meteor.call("assertUsersMissing", users, expect(function(error, correct) {
				test.isTrue(correct);
			}));
		};
	};
	var insertUsers = function(users) {
		return function(test, expect) {
			_.forEach(users, function(user) {
				Meteor.call("insertUser", user, justWait(test, expect));
			});
		};
	};
	var loggedInAs = function(user) {
		return function(test) {
			test.notEqual(Meteor.userId(), null);
			test.notEqual(user, null);
			if (user) {
				test.equal(Meteor.user().profile.id, user.profile.id);
			}
		};
	};
	var login3rdParty = function(test, expect) {
		Accounts.callLoginMethod({
			methodArguments: [{
				oauth: {
					credentialToken: this.credentialToken,
					credentialSecret: credentialSecret
				}
			}],
			userCallback: noError(test, expect)
		});
	};
	var login3rdPartyServiceAdded = function(test, expect) {
		Accounts.callLoginMethod({
			methodArguments: [{
				oauth: {
					credentialToken: this.credentialToken,
					credentialSecret: credentialSecret
				}
			}],
			userCallback: ServiceAddedError(test, expect)
		});
	};
	var login3rdPartyExistingServiceAdded = function(test, expect) {
		Accounts.callLoginMethod({
			methodArguments: [{
				oauth: {
					credentialToken: this.credentialToken,
					credentialSecret: credentialSecret
				}
			}],
			userCallback: AlreadyExistingServiceAddedError(test, expect)
		});
	};
	var login3rdPartyExistingServiceMelded = function(test, expect) {
		Accounts.callLoginMethod({
			methodArguments: [{
				oauth: {
					credentialToken: this.credentialToken,
					credentialSecret: credentialSecret
				}
			}],
			userCallback: AlreadyExistingServiceMeldedError(test, expect)
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
	var pwdLogin = function(user) {
		return function(test, expect) {
			Meteor.loginWithPassword({
				username: user.username
			}, user.profile.id, noError(test, expect));
		};
	};
	var registerService = function(serviceName, user) {
		return function(test, expect) {
			Meteor.call("registerService", serviceName, user, justWait(test, expect));
		};
	};
	var resetAll = function(test, expect) {
		Meteor.call("setupTests", justWait(test, expect));
	};
	var ServiceAddedError = function(test, expect) {
		return expect(function(error) {
			test.equal(
				error.reason,
				"Service correctly added to the current user, no need to proceed!"
			);
		});
	};
	var start3rdPartyLogin = function(serviceName) {
		return function(test, expect) {
			var credentialToken = Random.id();
			this.credentialToken = credentialToken;
			Meteor.http.post(
				"/_oauth/" +
				serviceName +
				"?state=" + OAuth._stateParam('popup', credentialToken),
				justWait(test, expect)
			);
		};
	};
	var unregisterService = function(serviceName) {
		return function(test, expect) {
			Meteor.call("unregisterService", serviceName, justWait(test, expect));
		};
	};


	// -----------------------
	// Actual tests definition
	// -----------------------

	// Handy function for creating test sequences
	var testPwdLoginWithUsersNoMeld = function(testSequence, users) {
		// The first user in list will be used to perform the login test
		testSequence.push.apply(testSequence, [
			// At first, makes tests with askBeforeMeld = false
			resetAll,
			insertUsers(users),
			assertUsersCount(users.length),
			askBeforeMeld(false),
			pwdLogin(users[0]),
			loggedInAs(users[0]),
			assertUsersCount(users.length),
			logoutStep,
			// Then, remakes same tests with askBeforeMeld = true
			resetAll,
			insertUsers(users),
			assertUsersCount(users.length),
			askBeforeMeld(true),
			pwdLogin(users[0]),
			loggedInAs(users[0]),
			assertMeldActionsCount(0),
			logoutStep,
		]);
	};
	// No meld actions are expected to be created here...
	var testSequence = [];
	testPwdLoginWithUsersNoMeld(testSequence, [userPwd1NV, userPwd2NV]);
	testPwdLoginWithUsersNoMeld(testSequence, [userPwd1NV, userPwd2V]);
	testPwdLoginWithUsersNoMeld(testSequence, [
		userPwd1NV,
		userFB1NV, userFB1V, userFB2NV, userFB2V,
		userLO1NV, userLO1V, userLO2NV, userLO2V
	]);
	testPwdLoginWithUsersNoMeld(testSequence, [userPwd1V, userPwd2NV]);
	testPwdLoginWithUsersNoMeld(testSequence, [userPwd1V, userPwd2V]);
	testPwdLoginWithUsersNoMeld(testSequence, [
		userPwd1V,
		userFB1NV, userFB2NV, userFB2V, userLO1NV, userLO2NV, userLO2V
	]);
	testSequence.push(resetAll);
	testAsyncMulti(
		"accounts-meld - login with password (no melds)",
		testSequence
	);



	// Handy function for creating test sequences
	var test3rdPartyLoginWithUsersNoMeld = function(testSequence, userToLogInWith3rdParty, users) {
		// The first user in list will be used to perform the pwd login
		var serviceName = _.keys(userToLogInWith3rdParty.services)[0];
		testSequence.push.apply(testSequence, [
			// At first, makes tests with askBeforeMeld = false
			resetAll,
			insertUsers(users),
			assertUsersCount(users.length),
			askBeforeMeld(false),
			registerService(serviceName, userToLogInWith3rdParty),
			start3rdPartyLogin(serviceName),
			login3rdParty,
			loggedInAs(userToLogInWith3rdParty),
			assertUsersCount(users.length + 1),
			logoutStep,
			unregisterService(serviceName),
			// Then, remakes same tests with askBeforeMeld = true
			resetAll,
			insertUsers(users),
			assertUsersCount(users.length),
			askBeforeMeld(true),
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
	test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1NV, []);
	test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1NV, [
		userPwd1NV, userPwd2NV
	]);
	test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1NV, [
		userPwd1V, userPwd2V
	]);
	test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1NV, [
		userFB1V, userFB2NV, userFB2V, userLO1NV, userLO1V, userLO2NV, userLO2V
	]);
	test3rdPartyLoginWithUsersNoMeld(testSequence, userFB1V, [
		userFB1NV, userFB2NV, userFB2V, userLO1NV, userLO2NV, userLO2V
	]);
	testSequence.push(resetAll);
	testAsyncMulti(
		"accounts-meld - login with 3rd-party service tests (no melds)",
		testSequence
	);



	// Handy function for creating test sequences
	var testPwdLoginWithUsersWithMeld = function(testSequence, user, usersToMeld, otherUsers) {
		// The first user in list will be used to perform the login test
		testSequence.push.apply(testSequence, [
			// At first, makes tests with askBeforeMeld = false
			resetAll,
			askBeforeMeld(false),
			insertUsers([user]),
			insertUsers(usersToMeld),
			insertUsers(otherUsers),
			assertUsersCount(1 + usersToMeld.length + otherUsers.length),
			pwdLogin(user),
			loggedInAs(user),
			assertUsersCount(1 + otherUsers.length),
			assertUsersMissing(usersToMeld),
			logoutStep,
			// Then, remakes same tests with askBeforeMeld = true
			resetAll,
			askBeforeMeld(true),
			insertUsers([user]),
			insertUsers(usersToMeld),
			insertUsers(otherUsers),
			assertUsersCount(1 + usersToMeld.length + otherUsers.length),
			pwdLogin(user),
			loggedInAs(user),
			assertMeldActionsCount(usersToMeld.length),
			assertMeldActionsCorrect(user, usersToMeld),
			logoutStep,
		]);
	};
	// A meld action is expected to be created here...
	testSequence = [];
	testPwdLoginWithUsersWithMeld(testSequence,
		userPwd1V, [userFB1V], [userFB2NV, userFB2V, userLO1NV, userLO2NV, userLO2V]
	);
	testPwdLoginWithUsersWithMeld(testSequence,
		userPwd1V,
		[userFB1V, userLO1V],
		[userFB2NV, userFB2V, userLO1NV, userLO2NV, userLO2V]
	);
	testSequence.push(resetAll);
	testAsyncMulti("accounts-meld - login with password and meld", testSequence);



	// Handy function for creating test sequences
	var test3rdPartyLoginWithUsersWithMeld = function(testSequence, userToLogInWith3rdParty, usersToMeld, otherUsers) {
		// The first user in list will be used to perform the pwd login
		var serviceName = _.keys(userToLogInWith3rdParty.services)[0];
		testSequence.push.apply(testSequence, [
			// At first, makes tests with askBeforeMeld = false
			resetAll,
			askBeforeMeld(false),
			insertUsers(usersToMeld),
			insertUsers(otherUsers),
			assertUsersCount(usersToMeld.length + otherUsers.length),
			registerService(serviceName, userToLogInWith3rdParty),
			start3rdPartyLogin(serviceName),
			login3rdParty,
			loggedInAs(usersToMeld[0]),
			assertUsersCount(otherUsers.length + 1),
			assertUsersMissing(userToLogInWith3rdParty),
			logoutStep,
			unregisterService(serviceName),
			// Then, remakes same tests with askBeforeMeld = true
			resetAll,
			askBeforeMeld(true),
			insertUsers(usersToMeld),
			insertUsers(otherUsers),
			assertUsersCount(usersToMeld.length + otherUsers.length),
			registerService(serviceName, userToLogInWith3rdParty),
			start3rdPartyLogin(serviceName),
			login3rdParty,
			loggedInAs(userToLogInWith3rdParty),
			assertMeldActionsCount(usersToMeld.length),
			assertMeldActionsCorrect(userToLogInWith3rdParty, usersToMeld),
			logoutStep,
			unregisterService(serviceName),
		]);
	};

	// A meld action is expected to be created here...
	testSequence = [];
	test3rdPartyLoginWithUsersWithMeld(testSequence,
		userFB1V,
		[userLO1V],
		[userFB1NV, userFB2NV, userFB2V, userLO1NV, userLO2NV, userLO2V]
	);
	test3rdPartyLoginWithUsersWithMeld(testSequence,
		userFB1V,
		[userLO1V, userPwd1V],
		[userFB1NV, userFB2NV, userFB2V, userLO1NV, userLO2NV, userLO2V]
	);
	testSequence.push(resetAll);
	testAsyncMulti(
		"accounts-meld - login with 3rd-party service and meld",
		testSequence
	);



	var testPwdLoginPlusAddServiceNoMeld = function(testSequence, users, userWithServiceToAdd) {
		// The first user in list will be used to perform the login test
		var serviceName = _.keys(userWithServiceToAdd.services)[0];
		testSequence.push.apply(testSequence, [
			// At first, makes tests with askBeforeMeld = false
			resetAll,
			registerService(serviceName, userWithServiceToAdd),
			insertUsers(users),
			assertUsersCount(users.length),
			askBeforeMeld(false),
			pwdLogin(users[0]),
			loggedInAs(users[0]),
			start3rdPartyLogin(serviceName),
			login3rdPartyServiceAdded,
			loggedInAs(users[0]),
			assertUsersCount(users.length),
			logoutStep,
			unregisterService(serviceName),
			// Then, remakes same tests with askBeforeMeld = true
			resetAll,
			registerService(serviceName, userWithServiceToAdd),
			insertUsers(users),
			assertUsersCount(users.length),
			askBeforeMeld(true),
			pwdLogin(users[0]),
			loggedInAs(users[0]),
			start3rdPartyLogin(serviceName),
			login3rdPartyServiceAdded,
			loggedInAs(users[0]),
			assertUsersCount(users.length),
			assertMeldActionsCount(0),
			logoutStep,
			unregisterService(serviceName),
		]);
	};
	// No meld action is expected to be created here...
	testSequence = [];
	testPwdLoginPlusAddServiceNoMeld(
		testSequence,
		[userPwd1V, userFB2NV, userFB2V, userLO1NV, userLO2NV, userLO2V],
		userFB1V
	);
	testSequence.push(resetAll);
	testAsyncMulti(
		"accounts-meld - already logged in with password and add service (no meld)",
		testSequence
	);



	var testPwdLoginPlusAddServiceAndMeld = function(testSequence, users, userWithServiceToAdd) {
		// The first user in list will be used to perform the login test
		var serviceName = _.keys(userWithServiceToAdd.services)[0];
		testSequence.push.apply(testSequence, [
			// At first, makes tests with askBeforeMeld = false
			resetAll,
			registerService(serviceName, userWithServiceToAdd),
			insertUsers(users),
			assertUsersCount(users.length),
			askBeforeMeld(false),
			pwdLogin(users[0]),
			loggedInAs(users[0]),
			start3rdPartyLogin(serviceName),
			login3rdPartyExistingServiceMelded,
			loggedInAs(users[0]),
			assertUsersCount(users.length - 1),
			assertUsersMissing(userWithServiceToAdd),
			logoutStep,
			unregisterService(serviceName),
			// Then, remakes same tests with askBeforeMeld = true
			resetAll,
			registerService(serviceName, userWithServiceToAdd),
			insertUsers(users),
			assertUsersCount(users.length),
			askBeforeMeld(true),
			pwdLogin(users[0]),
			loggedInAs(users[0]),
			start3rdPartyLogin(serviceName),
			login3rdPartyExistingServiceAdded,
			loggedInAs(users[0]),
			assertUsersCount(users.length),
			assertMeldActionsCount(1),
			assertMeldActionsCorrect(users[0], [userWithServiceToAdd]),
			logoutStep,
			unregisterService(serviceName),
		]);
	};
	// No meld action is expected to be created here...
	testSequence = [];
	testPwdLoginPlusAddServiceAndMeld(
		testSequence,
		[userPwd1V, userFB2V, userLO1NV, userLO2NV, userLO2V],
		userFB2V
	);
	testSequence.push(resetAll);
	testAsyncMulti(
		"accounts-meld - already logged in with password and add service and meld",
		testSequence
	);



	var testServiceLoginPlusAddServiceNoMeld = function(testSequence, users, userWithServiceToAdd) {
		// The first user in list will be used to perform the login test
		var serviceName1 = _.keys(users[0].services)[0];
		var serviceName2 = _.keys(userWithServiceToAdd.services)[0];
		testSequence.push.apply(testSequence, [
			// At first, makes tests with askBeforeMeld = false
			resetAll,
			registerService(serviceName1, users[0]),
			insertUsers(users),
			assertUsersCount(users.length),
			askBeforeMeld(false),
			start3rdPartyLogin(serviceName1),
			login3rdParty,
			loggedInAs(users[0]),
			unregisterService(serviceName1),
			registerService(serviceName2, userWithServiceToAdd),
			start3rdPartyLogin(serviceName2),
			login3rdPartyServiceAdded,
			loggedInAs(users[0]),
			assertUsersCount(users.length),
			logoutStep,
			unregisterService(serviceName2),
			// Then, remakes same tests with askBeforeMeld = true
			resetAll,
			registerService(serviceName1, users[0]),
			insertUsers(users),
			assertUsersCount(users.length),
			askBeforeMeld(true),
			start3rdPartyLogin(serviceName1),
			login3rdParty,
			loggedInAs(users[0]),
			unregisterService(serviceName1),
			registerService(serviceName2, userWithServiceToAdd),
			start3rdPartyLogin(serviceName2),
			login3rdPartyServiceAdded,
			loggedInAs(users[0]),
			assertUsersCount(users.length),
			assertMeldActionsCount(0),
			logoutStep,
			unregisterService(serviceName2),
		]);
	};
	// No meld action is expected to be created here...
	testSequence = [];
	testServiceLoginPlusAddServiceNoMeld(
		testSequence,
		[userFB1V, userFB2NV, userFB2V, userLO2NV, userLO2V],
		userLO1NV
	);
	testSequence.push(resetAll);
	testAsyncMulti(
		"accounts-meld - already logged in with service and add service (no meld)",
		testSequence
	);



	var testServiceLoginPlusAddServiceAndMeld = function(testSequence, users, userWithServiceToAdd) {
		// The first user in list will be used to perform the login test
		var serviceName1 = _.keys(users[0].services)[0];
		var serviceName2 = _.keys(userWithServiceToAdd.services)[0];
		testSequence.push.apply(testSequence, [
			// At first, makes tests with askBeforeMeld = false
			resetAll,
			registerService(serviceName1, users[0]),
			insertUsers(users),
			assertUsersCount(users.length),
			askBeforeMeld(false),
			start3rdPartyLogin(serviceName1),
			login3rdParty,
			loggedInAs(users[0]),
			unregisterService(serviceName1),
			registerService(serviceName2, userWithServiceToAdd),
			start3rdPartyLogin(serviceName2),
			login3rdPartyExistingServiceMelded,
			loggedInAs(users[0]),
			assertUsersCount(users.length - 1),
			assertUsersMissing(userWithServiceToAdd),
			logoutStep,
			unregisterService(serviceName2),
			// Then, remakes same tests with askBeforeMeld = true
			resetAll,
			registerService(serviceName1, users[0]),
			insertUsers(users),
			assertUsersCount(users.length),
			askBeforeMeld(true),
			start3rdPartyLogin(serviceName1),
			login3rdParty,
			loggedInAs(users[0]),
			unregisterService(serviceName1),
			registerService(serviceName2, userWithServiceToAdd),
			start3rdPartyLogin(serviceName2),
			login3rdPartyExistingServiceAdded,
			loggedInAs(users[0]),
			assertUsersCount(users.length),
			assertMeldActionsCount(1),
			assertMeldActionsCorrect(users[0], [userWithServiceToAdd]),
			logoutStep,
			unregisterService(serviceName2),
		]);
	};
	// No meld action is expected to be created here...
	testSequence = [];
	testServiceLoginPlusAddServiceAndMeld(
		testSequence,
		[userFB1V, userFB2NV, userFB2V, userLO1NV, userLO2NV],
		userLO1NV
	);
	testSequence.push(resetAll);
	testAsyncMulti(
		"accounts-meld - already logged in with service and add service and meld",
		testSequence
	);
}
