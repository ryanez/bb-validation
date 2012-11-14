var _ = require("underscore"),
    Backbone = require("backbone"),
    async = require("async");


describe("async", function () {
    describe("auto - only with sync tests, I suppose it works by async tests too", function () {
        it("should call dependencies before callback", function () {
            var results;
            var err = null;
            async.auto({
                a:function (callback, r) {
                    callback(err, "a");
                },
                b:["a", function (callback, r) {
                    callback(err, "b");
                }],
                c:["b", function (callback, r) {
                    callback(err, "c");
                }]
            }, function (err, r) {
                results = r;
            });
            expect(results).toEqual({a:"a", b:"b", c:"c"});
        });

        it("should break if err given", function () {
            var results;
            var error;
            var err = null;
            async.auto({
                a:function (callback, r) {
                    callback(err, "a");
                },
                b:["a", function (callback, r) {
                    callback("error", "b");
                }],
                c:["b", function (callback, r) {
                    callback(err, "c");
                }]
            }, function (err, r) {
                results = r;
                error = err;
            });
            expect(error).toEqual("error");
            expect(results).toEqual(undefined);
        });

        it("should run in order by existence, type and min", function () {
            var order = [];
            var results = {};
            var value = "abcde";
            var config = {
                string:true,
                min:3
            };
            var end = true;
            async.auto({
                string:["existence", function (callback) {
                    var passed;
                    var string = (typeof(value) == "string");
                    if (config.string)
                        passed = string;
                    else
                        passed = !string;
                    results.string = passed;
                    order.push("string");
                    callback(string ? null : false);
                }],
                min:["string", function (callback) {
                    var passed;
                    var shorter = (value.length < config.min);
                    passed = !shorter;
                    results.min = passed;
                    order.push("min");
                    callback();
                }],
                existence:function (callback) {
                    var existence = (value !== undefined && value !== null);
                    order.push("existence");
                    callback(existence ? null : end);
                }
            });
            expect(order).toEqual(["existence", "string", "min"]);
            expect(results).toEqual({string:true, min:true});
        });

    });
})
;

