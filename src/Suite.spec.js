var _ = require("underscore"),
    Backbone = require("backbone"),
    Validator = require("./backbone-validator");

describe("Suite", function () {

    describe("required", function () {
        it("should skip if not required and not given", function () {
            valueNotRequired();
            expectSkip();
        });
        it("should pass if not required but given", function () {
            valueExists();
            valueNotRequired();
            expectPass();
        });
        it("should fail fatal if required and not given", function () {
            valueRequired();
            expectFatal();
        });
        it("should pass if required and given", function () {
            valueExists();
            valueRequired();
            expectPass();
        });
    });

    describe("type", function () {
        it("should pass if string given and type is string", function () {
            valueExists("string");
            valueTypeOf("string");
            valueTypeOf(String);
            expectPass();
        });
        it("should fail fatal if string given and type is not string", function () {
            valueExists();
            valueTypeOf("string");
            expectFatal();
        });
        it("should pass if null given and type is null", function () {
            valueExists();
            valueTypeOf(null);
            valueTypeOf("null");
            expectPass();
        });
        it("should fail fatal if null given and type is undefined", function () {
            valueExists();
            valueTypeOf(undefined);
            valueTypeOf("undefined");
            expectFatal();
        });
        it("should pass if null given and type if object", function () {
            valueExists();
            valueTypeOf("object");
            valueTypeOf(Object);
            expectPass();
        });
        it("should fail fatal if undefined given and type is object", function () {
            valueTypeOf("object");
            valueTypeOf(Object);
            expectFatal();
        });
        it("should pass if object given and type if object", function () {
            valueExists({});
            valueTypeOf(Object);
            valueExists(new Date());
            valueTypeOf(Object);
            valueExists();
            valueTypeOf(Object);
            expectPass();
        });
        it("should pass if instance given and type is the class of instance", function () {
            valueExists(new Date());
            valueTypeOf(Date);
            expectPass();
        });
        it("should fail fatal if instance given and type is not the class of instance", function () {
            valueExists(new Date());
            valueTypeOf(Number);
            valueTypeOf(RegExp);
            expectFatal();
        });
    });

    describe("min", function () {
        it("should pass if number bigger or equals min", function () {
            valueExists(5);
            valueMin(5);
            valueMin(1);
            valueMin(0);
            valueMin(-1);
            valueMin(-6);
            expectPass();
        });

        it("should pass if string length bigger or equals min ", function () {
            valueExists("a");
            valueMin(0);
            valueExists("abcd");
            valueMin(3);
            valueMin(4);
            expectPass();
        });
        it("should fail if number or string length smaller than min", function () {
            valueExists(3);
            valueMin(4);
            valueMin(6);
            valueExists("");
            valueMin(1);
            expectFail();
        });
    });

    describe("max", function () {
        it("should pass if number or length smaller or equals max", function () {
            valueExists(0);
            valueMax(0);
            valueMax(5);
            valueExists("");
            valueMax(0);
            valueExists("abc");
            valueMax(5);
            expectPass();
        });
        if ("should fail if number or length bigger than max", function () {
            valueExists(0);
            valueMax(-1);
            valueExists("abc");
            valueMax(4);
            expectFail();
        });
    });

    describe("range", function () {
        it("should pass if number or length in range", function () {
            valueExists(5);
            valueIn(5, 5);
            valueIn(4, 5);
            valueIn(4, 6);
            valueIn(-1, 10);
            valueExists("");
            valueIn(0, 0);
            valueIn(-1, 1);
            expectPass();
        });
        it("should fail if number or length not in range", function () {
            valueExists(5);
            valueIn(6, 7);
            valueIn(3, 4);
            valueExists("abc");
            valueIn(-1, 2);
            valueIn(4, 5);
            expectFail();
        });
    });

    describe("equal", function () {
        var o = {a:1, b:"a"};
        it("should pass if the same value", function () {
            valueEqual(undefined);
            valueExists();
            valueEqual(null);
            valueExists(123);
            valueEqual(123);
            valueExists(o);
            valueEqual(o);
            expectPass();
        });
        it("should fail if not the same value", function () {
            valueEqual(null);
            valueExists(null);
            valueEqual(123);
            valueExists(123);
            valueEqual(o);
            valueExists(o);
            valueEqual(undefined);
            expectFail();
        });
        it("should pass if object is a clone of another object", function () {
            valueExists(o);
            valueEqual(_.clone(o));
            expectPass();
        });
    });

    describe("same", function () {
        var o = {};
        it("should pass if the same value", function () {
            valueSame(undefined);
            valueExists();
            valueSame(null);
            valueExists(123);
            valueSame(123);
            valueExists(o);
            valueSame(o);
            expectPass();
        });
        it("should fail if not the same value", function () {
            valueSame(null);
            valueExists(null);
            valueSame(123);
            valueExists(123);
            valueSame(o);
            valueExists(o);
            valueSame(undefined);
            valueSame(_.clone(o))
            expectFail();
        });
    });

    describe("contained", function () {
        it("should pass if the value is in the array", function () {
            valueExists(123);
            valueContained([1, 2, 3, 123, "a"]);
            expectPass();
        });
        it("should fail if the value is not in the array", function () {
            valueExists();
            valueContained([undefined, 0, ""]);
            expectFail();
        });
    });

    describe("match", function () {
        it("should pass if the expression matches the value", function () {
            valueExists("123");
            valueMatch(/^\d+$/g);
            valueMatch([/^\d+$/g, /^\w+$/g]);
            valueExists("a@b.com");
            valueMatch("email");
            valueMatch({
                all:[/^\S+$/g, /^.*$/g],
                any:["email", "url"]
            })
            expectPass();
        });
        it("should fail if the expression does not match the value", function () {
            valueExists("abc");
            valueMatch(/^\d+$/g);
            valueMatch("email");
            valueMatch([/\w+/g, /\d+/g]);
            valueMatch({
                all:["email", "url"],
                any:/\w+/g
            });
            valueMatch({
                any:["email", "url"]
            });
            expectFail();
        });
    });

    describe("constructor", function () {
        var defaultSuite = new Validator.Suite();
        it("should pass if it's called from custom test", function () {
            suite = new Validator.Suite(customTest);
            suite.custom(validator, true);
            expectPass();
        });
        it("should fail if it's called from custom test", function () {
            suite = new Validator.Suite(customTest);
            suite.custom(validator, false);
            expectFail();
        });
        it("should override default tests", function () {
            expect(suite.range).toEqual(defaultSuite.range);
            suite = new Validator.Suite(overrideRange);
            expect(suite.min).toEqual(defaultSuite.min);
            expect(suite.range).not.toEqual(defaultSuite.range);
        });
        it("should extend and override patterns", function () {
            expect(suite.patterns).toEqual(defaultSuite.patterns);
            suite = new Validator.Suite(customPatterns);
            expect(suite.patterns).not.toEqual(defaultSuite.patterns);
            expect(suite.patterns.custom).toEqual(customPatterns.patterns.custom);
            expect(suite.patterns.email).toEqual(customPatterns.patterns.email);
            expect(suite.patterns.url).toEqual(defaultSuite.patterns.url);
        });
    });

    var suite;
    var validator;

    beforeEach(function () {
        suite = new Validator.Suite();
        validator = jasmine.createSpyObj("validator", ["pass", "fail", "clear", "done"]);
    });

    var valueExists = function (value) {
        if (value === undefined)
            value = null;
        validator.value = value;
    };
    var valueRequired = function () {
        suite.required(validator, true);
    };
    var valueNotRequired = function () {
        suite.required(validator, false);
    };
    var valueTypeOf = function (type) {
        suite.type(validator, type);
    };
    var valueMin = function (min) {
        suite.min(validator, min);
    };
    var valueMax = function (max) {
        suite.max(validator, max);
    };
    var valueIn = function (min, max) {
        suite.range(validator, {min:min, max:max});
    };
    var valueEqual = function (expected) {
        suite.equal(validator, expected);
    };
    var valueSame = function (expected) {
        suite.same(validator, expected);
    };
    var valueContained = function (list) {
        suite.contained(validator, list);
    };
    var valueMatch = function (pattern) {
        suite.match(validator, pattern);
    };

    var expectFail = function () {
        expect(validator.pass).not.toHaveBeenCalled();
        expect(validator.clear).not.toHaveBeenCalled();
        expect(validator.fail).toHaveBeenCalled();
        expect(validator.done).not.toHaveBeenCalled();
    };
    var expectFatal = function () {
        expect(validator.pass).not.toHaveBeenCalled();
        expect(validator.clear).toHaveBeenCalled();
        expect(validator.fail).toHaveBeenCalled();
        expect(validator.done).toHaveBeenCalled();
    };
    var expectPass = function () {
        expect(validator.pass).toHaveBeenCalled();
        expect(validator.clear).not.toHaveBeenCalled();
        expect(validator.fail).not.toHaveBeenCalled();
        expect(validator.done).not.toHaveBeenCalled();
    };
    var expectSkip = function () {
        expect(validator.pass).toHaveBeenCalled();
        expect(validator.clear).toHaveBeenCalled();
        expect(validator.fail).not.toHaveBeenCalled();
        expect(validator.done).toHaveBeenCalled();
    };

    var customTest = {
        custom:function (validator, attr) {
            if (attr)
                validator.pass();
            else
                validator.fail();
        }
    };

    var overrideRange = {
        range:function (validator, attr) {
            if (attr)
                validator.pass();
            else
                validator.fail();
        }
    };

    var customPatterns = {
        patterns:{
            custom:/\w+/,
            email:/\w+/
        }
    };
});