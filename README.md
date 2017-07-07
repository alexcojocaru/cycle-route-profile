# cycle-route-profile
---------------------
A Javascript application to build a route using the Google Maps APIs
and generate the elevation chart real time (as the route is being modified).
The application has support for unlimited number of waypoints.

The application uses the Google Elevation API:
https://developers.google.com/maps/documentation/elevation/intro
, for which you need an API key:
https://developers.google.com/maps/documentation/elevation/get-api-key

Since the application runs fully on the client side, the API key will
not be sent to any server other than the Google elevation API.



Prerequisites
-------------
* node v6.9.1 - https://nodejs.org/en/download/releases/
* yarn 0.21.3 - https://yarnpkg.com/en/docs/install



Resources
---------
* Get an API key
> https://developers.google.com/maps/documentation/elevation/get-api-key
* Google Maps API Reference
> https://developers.google.com/maps/documentation/javascript/3.exp/reference
* Google Elevation Service Guide
> https://developers.google.com/maps/documentation/javascript/elevation
* ChartJS
> http://www.chartjs.org/docs/



Running the application
-----------------------
Run
`yarn install && yarn run start`
and open http://localhost:8080/index.html in the browser.



Using query parameters to modify the app behavior
-------------------------------------------------
Eg. http://localhost:8080/?apiKey=xyz&logLevel=DEBUG
* apiKey - preset the apiKey to be used;
* logLevel - override the log level; valid values are TRACE, DEBUG, INFO, WARN, ERROR.



Verifying the local changes
---------------------------
`yarn run verify`
runs the linting and the testing.

`make verify`
runs the build; it downloads node and yarn
locally, installs the required node modules, and runs the linting
and testing.

