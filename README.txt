Homepage: the Account page, "Forgot Your Password?" and "Change Your E-mail" (2026-11-16, version 3)
====================================================================================================

The two forms have their own page now, /account: side by side on a computer, one under the other on a phone. Every page's
top menu has an "Account" link, on the computer and in the phone menu. The homepage is back as it was: the two sections at
its bottom are gone.

Files of the website (same paths in the dogma-rising repository that Netlify deploys):
account.html                            NEW: the Account page with both forms, and a line that accounts are made in the
                                        launcher with an e-mail address you can reach
index.html                              CHANGED: your original homepage plus the Account link. Old links to
                                        /#forgot-password and /#change-email open the Account page.
howtoplay.html                          CHANGED: step 5 "Creating an Account" asks for an e-mail address you can reach
                                        and points to the Account page (the "no email required" line is gone), plus the
                                        Account link and the menu's CSS line below
about.html, contact.html, discord-live-news.html, map-selection.html, news.html
                                        CHANGED: only the Account link, and one CSS line that keeps the menu on one line on
                                        screens 1186 to 1330 px wide (with the extra link it wrapped into two lines there)
netlify\functions\forgot-password.js    the same as in the first version (already on your site)
netlify\functions\change-email.js       the same as in the first version (already on your site)

Put the eight .html files into the repository (account.html is new, the other seven replace the old ones) and let Netlify
deploy as usual. Already uploaded version 2 from earlier that night? Then only account.html and howtoplay.html changed. Links straight to a form: https://play.dogmarising.org/account#forgot-password and
https://play.dogmarising.org/account#change-email

Why functions: the homepage is HTTPS on Netlify, and the game server's account API is plain HTTP on dogmarising.org port
52099, so a visitor's browser may not call it from the homepage. The functions call it from Netlify's side:
- forgot-password.js only ever asks for a reset mail for one address. It always answers "If an account uses this address, a
  reset link is on its way", so the form does not tell strangers which addresses have accounts. One request per address
  per minute.
- change-email.js sends account name, password and new address. The server checks the password like the launcher login.
  After 5 wrong passwords for one account name it waits 15 minutes.
If the API ever moves, set the Netlify environment variable DDON_ACCOUNT_API (default http://dogmarising.org:52099/api/account).

What the server needs (see the README of DogmaRising-EmailRecovery.zip): the program update from for-dogma-rising\email-change
for "Change Your E-mail", and working mail settings ("MailSetting" in the config) for the mails. Without them the forms say
"not available yet" and "could not be sent".

Tested: both functions against a stand-in API (26 checks passed, 0 failed), the first version's forms in a browser against the
real server code on a test database. This version in a browser: the menu on one line on every page at 1186, 1280, 1331 and
1920 px; the Account page side by side at 1024 px and wider, one card under the other at 768 and 375 px, no sideways
scrolling; the phone menu with Account on every page; an old /#forgot-password link opening /account; both forms answering
through their functions (pointed at an empty local test port, never the live server).
