Add elevation coordinates to a GPX file
=======================================
A Javascript application to add the missing elevation coordinates to
each point in a GPX file.

The application uses the Google Elevation API:
https://developers.google.com/maps/documentation/elevation/intro
, for which you need an API key:
https://developers.google.com/maps/documentation/elevation/get-api-key

Since the application runs fully on the client side, the API key will
not be sent to any server other than the Google elevation API.



Prerequisites
-------------
* node v6.9.1: https://nodejs.org/en/download/releases/



Resources
---------
Google Elevation Service Guide
https://developers.google.com/maps/documentation/javascript/elevation
Google Maps API Reference
https://developers.google.com/maps/documentation/javascript/3.exp/reference#ElevationService
Get an API key
https://developers.google.com/maps/documentation/elevation/get-api-key

Not using this one, for it doesn't accept CORS requests (FML):
Google Elevation API
https://developers.google.com/maps/documentation/elevation/intro



Running the application
-----------------------
Run
`yarn install && yarn run start`
and open http://localhost:8080/index.html in the browser.



Verifying the local changes
---------------------------
`yarn run verify`
runs the linting and the testing.

`make verify`
runs the build; it downloads node and yarn
locally, installs the required node modules, and runs the linting
and testing.

