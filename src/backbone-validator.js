if (typeof define !== 'function')
    var define = require('amdefine')(module);

define(function (require, exports, module) {
    var _ = require("underscore"),
        Backbone = require("backbone");

    /** @class
     * @extends Backbone.Events
     * @constructor
     */
    var AbstractTest = function () {
    };
    _.extend(AbstractTest.prototype, Backbone.Events, /** @lends AbstractTest#*/{
        enabled:true,
        pass:function () {
            this.trigger("done", true);
        },
        fail:function () {
            this.trigger("done", false);
        },
        disable:function () {
            if (!this.enabled)
                throw new SyntaxError("Test is already disabled.");
            this.enabled = false;
            this.trigger("toggle", this.enabled);
        },
        enable:function () {
            if (this.enabled)
                throw new SyntaxError("Test is already enabled.");
            this.enabled = true;
            this.trigger("toggle", this.enabled);
        },
        check:function (value) {
            if (!this.enabled)
                throw new SyntaxError("Cannot run disabled test.");
            this.evaluate(value);
        }
    });

    /** @class
     * @extends AbstractTest
     * @constructor
     */
    var AbstractAsyncTest = function () {
    };
    _.extend(AbstractAsyncTest.prototype, AbstractTest.prototype, /** @lends AbstractAsyncTest#*/ {
        id:0,
        tick:function () {
            ++this.id;
        },
        concurrency:function (id) {
            return id != this.id;
        },
        pass:function (id) {
            if (this.concurrency(id))
                return;
            this.tick();
            AbstractTest.prototype.pass.call(this);
        },
        fail:function (id) {
            if (this.concurrency(id))
                return;
            this.tick();
            AbstractTest.prototype.fail.call(this);
        },
        disable:function () {
            this.tick();
            AbstractTest.prototype.disable.call(this);
        },
        enable:function () {
            this.tick();
            AbstractTest.prototype.enable.call(this);
        },
        check:function (value) {
            this.tick();
            AbstractTest.prototype.check.apply(this, arguments);
        }
    });

    var RequiredTest = function (required) {
        this.required = required;
    };
    _.extend(RequiredTest.prototype, AbstractTest.prototype, {
        evaluate:function (value) {
            if (value !== undefined || !this.required)
                this.pass();
            else
                this.fail();
        }
    });

    var TypeTest = function (type) {
        if (type == "null")
            type = null;
        else if (type === undefined)
            type = "undefined";
        else if (typeof(type) == "function") {
            if (type == String)
                type = "string";
            else if (type == Number)
                type = "number";
            else if (type == Boolean)
                type = "boolean";
            else if (type == Object)
                type = "object";
        }
        this.type = type;
    };
    _.extend(TypeTest.prototype, AbstractTest.prototype, {
        evaluate:function (value) {
            var passed;
            if (typeof(this.type) == "string")
                passed = (typeof(value) == this.type);
            else if (typeof(this.type) == "function")
                passed = (value instanceof this.type);
            else if (this.type === null)
                passed = (value === this.type);
            else
                throw new SyntaxError("Invalid type param.");
            if (passed)
                this.pass();
            else
                this.fail();
        }
    });

    var MinTest = function (min) {
        if (isNaN(min))
            throw new SyntaxError("Invalid min param.");
        this.min = min;
    };
    _.extend(MinTest.prototype, AbstractTest.prototype, {
        evaluate:function (num) {
            if (typeof (num) == "string")
                num = num.length;
            if (num < this.min)
                this.fail();
            else
                this.pass();
        }
    });

    var MaxTest = function (max) {
        if (isNaN(max))
            throw new SyntaxError("Invalid max param.");
        this.max = max;
    };
    _.extend(MaxTest.prototype, AbstractTest.prototype, {
        evaluate:function (num) {
            if (typeof (num) == "string")
                num = num.length;
            if (num > this.max)
                this.fail();
            else
                this.pass();
        }
    });

    var RangeTest = function (range) {
        if (typeof(range) != "object" || isNaN(range.min) || isNaN(range.max))
            throw new SyntaxError("Invalid range param.");
        _.extend(this, range);
    };
    _.extend(RangeTest.prototype, AbstractTest.prototype, {
        evaluate:function (num) {
            if (typeof (num) == "string")
                num = num.length;
            if (num > this.max || num < this.min)
                this.fail();
            else
                this.pass();
        }
    });

    var SameTest = function (expected) {
        this.expected = expected;
    };
    _.extend(SameTest.prototype, AbstractTest.prototype, {
        evaluate:function (actual) {
            if (actual === this.expected)
                this.pass();
            else
                this.fail();
        }
    });
    var EqualTest = function (expected) {
        this.expected = expected;
    };
    _.extend(EqualTest.prototype, AbstractTest.prototype, {
        evaluate:function (actual) {
            var passed = typeof(this.expected) == "object" ? _.isEqual(actual, this.expected) : actual === this.expected;
            if (passed)
                this.pass();
            else
                this.fail();
        }
    });
    var ContainedTest = function (list) {
        this.list = list;
    };
    _.extend(ContainedTest.prototype, AbstractTest.prototype, {
        evaluate:function (item) {
            if (this.list.indexOf(item) != -1)
                this.pass();
            else
                this.fail();
        }
    });

    var MatchTest = function (expressions) {
        if (typeof(expressions) == "string" || (expressions instanceof RegExp) || (expressions instanceof Array))
            expressions = {all:expressions};
        if (expressions.all && !(expressions.all instanceof Array))
            expressions.all = [expressions.all];
        if (expressions.any && !(expressions.any instanceof Array))
            expressions.any = [expressions.any];
        this.expressions = expressions;
    };
    _.extend(MatchTest.prototype, AbstractTest.prototype, {
        patterns:{
            digits:/^\d+$/,
            number:/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/,
            email:/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i,
            url:/^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i
        },
        evaluate:function (value) {
            var tester = function (expression) {
                if (typeof(expression) == "string")
                    expression = this.patterns[expression];
                if (!(expression instanceof RegExp))
                    throw new SyntaxError("Invalid expression given.");
                return expression.test(value);
            };
            var valid = true;
            if (this.expressions.all)
                valid = valid && _.all(this.expressions.all, tester, this);
            if (this.expressions.any)
                valid = valid && _.any(this.expressions.any, tester, this);
            if (valid)
                this.pass();
            else
                this.fail();
        }
    });


    /** @class
     * @constructor
     */
    var Suite = function (rules, validator) {
        this.validator = validator;
        this.tests = {};
        _.each(rules, function (rule, test) {
            var testClass = this.testMap[test];
            this.tests[test] = new testClass(rule);
        }, this);
    };
    _.extend(Suite.prototype, Backbone.Events, /** @lends Suite#*/{
        testMap:{
            required:RequiredTest,
            type:TypeTest,
            min:MinTest,
            max:MaxTest,
            range:RangeTest,
            equal:EqualTest,
            same:SameTest,
            contained:ContainedTest,
            match:MatchTest
        },
        required:function () {
            var name = "required";
            var test = this.tests[name];
            var value = this.validator.value;
            test.on("done", function (passed) {
                var existence = (value !== undefined);
                if (existence)
                    this.pass(name);
                else if (test.required)
                    this.clearAndFail(name);
                else
                    this.clearAndPass(name);

            }, this);
            test.check(value);
        },
        type:function () {
            var name = "type";
            var test = this.tests[name];
            var value = this.validator.value;
            test.on("done", function (passed) {
                if (passed)
                    this.pass(name);
                else
                    this.clearAndFail(name);
            }, this);
            test.check(value);
        },
        min:function () {
            this.check("min");
        },
        max:function () {
            this.check("max");
        },
        range:function () {
            this.check("range");
        },
        equal:function () {
            this.check("equal");
        },
        same:function () {
            this.check("same");
        },
        contained:function () {
            this.check("contained");
        },
        match:function () {
            this.check("match");
        },
        check:function (name) {
            var test = this.tests[name];
            var value = this.validator.value;
            test.on("done", function (passed) {
                if (passed)
                    this.pass(name);
                else
                    this.fail(name);
            }, this);
            test.check(value);
        },
        pass:function (name) {
            this.validator.pass(name);
        },
        fail:function (name) {
            this.validator.fail(name);
        },
        clearAndPass:function (name) {
            this.validator.clear();
            this.validator.pass(name);
            this.validator.done();
        },
        clearAndFail:function (name) {
            this.validator.clear();
            this.validator.fail(name);
            this.validator.done();
        }
    });

    /** @class
     * @extends Backbone.Events
     * @constructor
     */
    var Validator = function (schema) {
        this.schema = schema;
        this.suites = {};
        _.each(this.schema, function (rules, attribute) {
            this.suites[attribute] = new this.suite(rules, this);
        }, this);
    };
    _.extend(Validator.prototype, Backbone.Events, /** @lends Validator#*/{
        suite:Suite,
        validate:function (model) {
            _.each(this.schema, function (rules, attribute) {
                this.attribute = attribute;
                this.value = model.get(attribute);
                this.isDone = false;
                this.clear();
                _.all(rules, function (params, test) {
                    var check = this.suites[attribute][test];
                    if (!(check instanceof Function))
                        throw new SyntaxError("Invalid validator config: test " + test + " not exist.");
                    check.call(this.suites[attribute]);
                    if (typeof (this.stack[test]) != "boolean")
                        this.pendings.push(test);
                    return !this.isDone;
                }, this);
                var event = this.pendings.length ? "pending" : (this.isValid ? "pass" : "fail");
                this.trigger(event, this.attribute, this.stack);
                this.trigger(event + ":" + this.attribute, this.stack);
            }, this);
        },
        pass:function (test) {
            this.stack[test] = true;
        },
        fail:function (test) {
            this.stack[test] = false;
            this.isValid = false;
        },
        done:function () {
            this.pendings = [];
            this.isDone = true;
        },
        clear:function () {
            this.pendings = [];
            this.isValid = true;
            this.stack = {};
        }
    });

    module.exports = {
        Suite:Suite,
        Validator:Validator
    };

    _.extend(Backbone, module.exports);
})
;