if (typeof define !== 'function')
    var define = require('amdefine')(module, require);

define(function (require, exports, module) {

    var _ = require("underscore"),
        Backbone = require("backbone");

    if (!Backbone.Validator)
        throw new Error("Validator module not loaded yet.");

    var Test = Backbone.Validator.Test;

    var RequiredTest = Test.extend({
        initialize: function (required) {
            this.schema = (_.isUndefined(required) || !!required);
        },
        evaluate: function (done, value) {
            var existence = value !== undefined;
            if (!existence && this.schema)
                done(true);
            else if (!existence)
                done(false, {abort: true});
            else
                done(false);
        }
    });

    var TypeTest = Test.extend({
        types: ["undefined", "boolean", "number", "string", "object", "function"],
        initialize: function (type) {
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
            if (!_.isNull(type) && !_.isNaN(type) && !_.contains(this.types, type) && !_.isFunction(type))
                throw new TypeError("Attribute schema must be Function or type or null.");
            this.schema = type;
        },
        evaluate: function (done, value) {
            var passed;
            if (_.isNaN(value))
                passed = _.isNaN(this.schema);
            else if (_.isString(this.schema))
                passed = (typeof(value) == this.schema);
            else if (_.isFunction(this.schema))
                passed = (value instanceof this.schema);
            else
                passed = (value === this.schema);
            done(!passed);
        }
    });

    var NumberTest = Test.extend({
        toNumber: function (value) {
            if (typeof (value) == "string")
                return value.length;
            else if (value instanceof Array)
                return value.length;
            else if (isNaN(value))
                return Number.NaN;
            else
                return value;
        }
    });

    var MinTest = NumberTest.extend({
        initialize: function (min) {
            if (!_.isNumber(min) || _.isNaN(min))
                throw new TypeError("Attribute schema must be number.");
            this.schema = min;
        },
        evaluate: function (done, value) {
            done(this.toNumber(value) < this.schema);
        }
    });

    var MaxTest = NumberTest.extend({
        initialize: function (max) {
            if (!_.isNumber(max) || _.isNaN(max))
                throw new TypeError("Attribute schema must be number.");
            this.schema = max;
        },
        evaluate: function (done, value) {
            done(this.toNumber(value) > this.schema);
        }
    });

    var RangeTest = NumberTest.extend({
        initialize: function (range) {
            if (_.isArray(range) && range.length == 2 && _.isNumber(range[0]) && !_.isNaN(range[0]) && _.isNumber(range[1]) && !_.isNaN(range[1]))
                range = {
                    min: Math.min(range[0], range[1]),
                    max: Math.max(range[0], range[1])
                };
            if (!_.isObject(range) || !_.isNumber(range.min) || _.isNaN(range.min) || !_.isNumber(range.max) || _.isNaN(range.max) || range.max < range.min)
                throw new TypeError("Attribute schema must be range.");
            this.schema = range;
        },
        evaluate: function (done, value) {
            var num = this.toNumber(value);
            var err;
            if (num < this.schema.min)
                err = "min";
            else if (num > this.schema.max)
                err = "max";
            else
                err = false;
            done(err);
        }
    });

    var IdenticalTest = Test.extend({
        evaluate: function (done, value) {
            done(value !== this.schema);
        }
    });

    var EqualTest = Test.extend({
        evaluate: function (done, value) {
            var valid;
            if (_.isObject(this.schema))
                valid = _.isEqual(value, this.schema);
            else
                valid = value === this.schema;
            done(!valid);
        }
    });

    var MemberTest = Test.extend({
        initialize: function (list) {
            if (!_.isArray(list))
                throw new TypeError("Attribute schema must be array.");
            this.schema = list;
        },
        evaluate: function (done, value) {
            done(!_.contains(this.schema, value));
        }
    });

    var MatchTest = Test.extend({
        initialize: function (expressions) {
            if (_.isString(expressions) || _.isRegExp(expressions) || _.isArray(expressions))
                expressions = {all: expressions};
            if (!_.size(expressions))
                throw new TypeError("Empty attribute schema given.");
            _.each(expressions, function (patterns, operator) {
                if (operator != "any" && operator != "all")
                    throw new TypeError("Invalid operator[" + operator + "] given.");
                if (!_.isArray(patterns))
                    expressions[operator] = patterns = [patterns];
                if (!_.size(patterns))
                    throw new TypeError("Empty operator." + operator + " given.");
                _.each(patterns, function (pattern, index) {
                    patterns[index] = this.toRegExp(pattern);
                }, this);
            }, this);
            this.schema = expressions;
        },
        toRegExp: function (value) {
            var regexp;
            if (_.isString(value))
                regexp = this.common.patterns[value];
            else
                regexp = value;
            if (!_.isRegExp(regexp))
                throw new SyntaxError("Invalid expression given.");
            return regexp;
        },
        evaluate: function (done, value) {
            var match = function (expression) {
                return expression.test(value);
            };
            var valid = true;
            if (this.schema.all && !_.all(this.schema.all, match))
                valid = false;
            if (this.schema.any && !_.any(this.schema.any, match))
                valid = false;
            done(!valid);
        }
    });

    var DuplicateTest = Test.extend({
        initialize: function (duplicationOf) {
            if (!_.isString(duplicationOf))
                throw new TypeError("Invalid attribute name given.");
            this.schema = duplicationOf;
            this.relations[this.schema] = true;
        },
        evaluate: function (done, value, attributes) {
            done(attributes[this.schema] != value);
        }
    });


    module.exports = {
        common: {
            patterns: {
                digits: /^\d+$/,
                number: /^-?\d+(?:[\.,]\d+)?$/,
                email: /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i,
                url: /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i
            }
        },
        use: {
            required: {
                exports: RequiredTest
            },
            type: {
                exports: TypeTest,
                deps: ["required"]
            },
            min: {
                exports: MinTest,
                deps: ["type"]
            },
            max: {
                exports: MaxTest,
                deps: ["type"]
            },
            range: {
                exports: RangeTest,
                deps: ["type"]
            },
            identical: {
                exports: IdenticalTest,
                deps: ["required"]
            },
            equal: {
                exports: EqualTest,
                deps: ["required"]
            },
            member: {
                exports: MemberTest,
                deps: ["required"]
            },
            match: {
                exports: MatchTest,
                deps: ["type"]
            },
            duplicate: {
                exports: DuplicateTest,
                deps: ["required"]
            }
        }
    };

});