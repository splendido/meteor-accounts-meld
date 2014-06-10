accounts-meld
=============

Meteor package to meld user accounts registered with the same email address, or simply associate many different 3rd-party login services with the same user account.

Originally conceived as a core part of the package [accounts-templates-core](https://atmospherejs.com/package/accounts-templates-core), was finally released as an independent package to let everyone interested exploit it their own way.

For a very basic working example [test-account-meld](https://github.com/splendido/test-accounts-meld) can be cloned and configured with the preferred login services specifying their configuration inside [this](https://github.com/splendido/test-accounts-meld/blob/master/server/accounts.js) file.

In a near future, its integration within the package [accounts-templates-core](https://atmospherejs.com/package/accounts-templates-core) will be available for testing at any of the live examples linked from http://accounts-templates.meteor.com

A very basic example, styled for twitter [bootstrap](http://getbootstrap.com/), showing how to write the templates to present the final user with the choice about whether to meld or not to meld two accounts registered with the same email address, is provided with the package [accounts-meld-client-bootstrap](https://atmospherejs.com/package/accounts-meld-client-bootstrap).
For more details about this topic, please have a look at the [Documentation](#Documentation) below.

Enjoy!


#### Table of Contents
* [Introduction](#Introduction)
* [Features](#Features)
* [Disclaimer](#Disclaimer)
* [Acknowledgements](#Acknowledgements)
* [Documentation](#Documentation)
* [Behind The Scenes](#BehindTheScenes)


<a name="Introduction"/>
# Introduction

accounts-meld tried to address the following aspects:

1. No two accounts registered with the same email address can exist
2. Many different 3rd-party login services could be associated with the same user account
3. Different accounts created in different times referring to the same email address might/should be melded together.

There might be many reasons for an application to wish to address the above points. Examples could be:

* preventing a user to register herself using different services to exploit some initial trial offer more than once (1.)
* leverage the integration with many different social networks to provide a better user experience (2.)
* gather as many information as possible, about a particular user, from different services (2.)
*  let a user, which has forgotten which service used to register to the application, the ability to recover the old account and all the information associated with it (3.)

and possibly more than these...


<a name="Features"/>
# Features

* Server-side code only!
* Works with any login service, out of the box!
* Fewest possible login operations to save round trip information exchanges with the server.
* Optional callback to be used for document migration.
* Customizable users' object melding not to loose any information.
* Optional interaction with the user (by means of a few additional templates not included with the core package) to ask whether to perform a meld action or not.


<a name="Disclaimer"/>
#Disclaimer

*The present work is released, as is, under the MIT license and, in no cases, for no reasons, the author can be considered responsible for any information losses or any possible damages derived by its use.*

For security reasons all the rationale behind accounts-meld is based upon **verified** email addresses. This is to prevent any malicious user to register herself using another user's email address and instantly being asked/allowed to meld the new account with the *old* one originally belonging to the user under **identity theft attack**!

All the logic put in place to detect pairs of accounts possibly belonging to the same user is based on the `registered_emails` field provided by the use of [accounts-emails-field](https://atmospherejs.com/package/accounts-emails-field) package.

**I strongly suggest (and encourage) anyone possibly interested in using accounts-meld to personally check how the services that will be made available work. Especially, please verify whether it is possible to use them to login to another application before the registered email address was verified!**

It would be very kind of you if any verification attempt, either successful or not, could be published among the [issues](https://github.com/splendido/meteor-accounts-emails-field/issues) for the repository of accounts-email field. The three major points being:

* asses whether there is a field, among the service information provided soon after the login, stating the email verification state (e.g. google provides the field `verified_email` while linkedin and facebook provides none)
* confirm that the email address registered with the service is provided under the field `email` or the field `emailAddress` (linkedin)
* try to register a new user with a specific service and next try to use the same service to login into the application before confirming/verifying the email ownership.

After reporting, the logic behind the package accounts-emails-field could be aligned with the result of the above checks so to ensure correct behaviour with as many services as possible!

A big thank in advance to anyone contributing!


<a name="Acknowledgements"/>
#Acknowledgements

Undeniably, the package [accounts-merge](https://atmospherejs.com/package/accounts-merge) together with discussions directly entertained with its author @lirbank played a big role in writing this package. Actually at the very beginning accounts-meld was not even conceived as a package itself: only after a bit of googling around and various thinking the decision was taken, mainly because there was quite a bit of work involved and different projects might had different peculiar purposes.

Along the way also [accounts-multi] was released, basically as a consequence of [this](https://groups.google.com/forum/#!topic/meteor-talk/pfXfnX4qNzo) post.

So, big thanks to @lirbank, @dburles, and the original author of the snipped provided by him.

Many thanks also to everyone else which already provided, or will be, kind words, support, PR, suggestions and testing.


<a name="Documentation"/>
# Documentation

The package provides the following options:

* askBeforeMeld (Boolean, default false)
* checkForConflictingServices (Boolean, default false)
* meldUserCallback (function, default null)
* meldDBCallback (function, default null)

### askBeforeMeld

### checkForConflictingServices

### meldUserCallback

### meldDBCallback


<a name="BehindTheScenes"/>
# Behind The Scenes
