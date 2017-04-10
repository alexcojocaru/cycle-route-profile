window.__DEV__ = true;

jest.dontMock("../routeFormatters");

describe("routeFormatters", function () {
    const formatters = require("../routeFormatters");

    describe("format distance", function () {
        it("formats short distance", function () {
            expect(formatters.formatDistance(100)).toEqual("100 m");
        });

        it("formats long distance without routing", function () {
            expect(formatters.formatDistance(10000)).toEqual("10 km");
        });

        it("formats long distance with rounding", function () {
            expect(formatters.formatDistance(123456)).toEqual("123.46 km");
        });

        it("formats 0 distance", function () {
            expect(formatters.formatDistance(0)).toEqual("0 m");
        });

        it("formats negative short distance", function () {
            expect(formatters.formatDistance(-100)).toEqual("-100 m");
        });

        it("formats negative long distance", function () {
            expect(formatters.formatDistance(-100234)).toEqual("-100.23 km");
        });
    });
});
