window.__DEV__ = true;

jest.dontMock("../routeParsers");
jest.dontMock("../hash");

describe("routeParsers", function () {
    const parsers = require("../routeParsers");
    const hashPoints = require("../hash").hashPoints;

    describe("same routes", function () {
        it("similar routes", function () {
            const points = [
                { lat: 35.35, lng: 25.25, ele: 15.15 },
                { lat: 34.34, lng: 24.24, ele: 14.14 }
            ];
            const routes = [
                {
                    points: points,
                    hash: hashPoints(points)
                }
            ];

            const otherPoints = [
                { lat: 35.35, lng: 25.25, ele: 151.151 },
                { lat: 34.34, lng: 24.24, ele: 141.141 }
            ];
            const otherRoutes = [
                {
                    points: otherPoints,
                    hash: hashPoints(otherPoints)
                }
            ];

            expect(parsers.areRoutesSame(routes, otherRoutes)).toBeTruthy();
        });

        it("disimilar routes", function () {
            const points = [
                { lat: 35.35, lng: 25.25, ele: 15.15 },
                { lat: 34.34, lng: 24.24, ele: 14.14 }
            ];
            const routes = [
                {
                    points: points,
                    hash: hashPoints(points)
                }
            ];

            const otherPoints = [
                { lat: 35.35, lng: 25.25, ele: 15.15 },
                { lat: 33.33, lng: 23.23, ele: 14.14 }
            ];
            const otherRoutes = [
                {
                    points: otherPoints,
                    hash: hashPoints(otherPoints)
                }
            ];

            expect(parsers.areRoutesSame(routes, otherRoutes)).toBeFalsy();
        });
    });

    describe("identical routes", function () {
        it("identical routes", function () {
            const points = [
                { lat: 35.35, lng: 25.25, ele: 15.15 },
                { lat: 34.34, lng: 24.24, ele: 14.14 }
            ];
            const routes = [
                {
                    points: points,
                    hash: hashPoints(points)
                }
            ];

            const otherPoints = [
                { lat: 35.35, lng: 25.25, ele: 15.15 },
                { lat: 34.34, lng: 24.24, ele: 14.14 }
            ];
            const otherRoutes = [
                {
                    points: otherPoints,
                    hash: hashPoints(otherPoints)
                }
            ];

            expect(parsers.areRoutesIdentical(routes, otherRoutes)).toBeTruthy();
        });

        it("disimilar routes", function () {
            const points = [
                { lat: 35.35, lng: 25.25, ele: 15.15 },
                { lat: 34.34, lng: 24.24, ele: 14.14 }
            ];
            const routes = [
                {
                    points: points,
                    hash: hashPoints(points)
                }
            ];

            const otherPoints = [
                { lat: 35.35, lng: 25.25, ele: 15.15 },
                { lat: 33.33, lng: 23.23, ele: 14.14 }
            ];
            const otherRoutes = [
                {
                    points: otherPoints,
                    hash: hashPoints(otherPoints)
                }
            ];

            expect(parsers.areRoutesIdentical(routes, otherRoutes)).toBeFalsy();
        });
    });
});
