var amdefine = false;
if (typeof define !== 'function')
    var define = require('amdefine')(module, require),
        amdefine = true;

define(function (require, exports, module) {
    var _ = require("underscore"),
        Backbone = require("backbone");

    if (!Object.create)
        Object.create = function (proto) {
            var Surrogate = function () {
                this.constructor = Surrogate;
            };
            Surrogate.prototype = proto;
            var instance = new Surrogate();
            return instance;
        };



    var Validator = Backbone.Model.extend({
        checks: {},
        tests: {},
        patterns: {},
        errors: 0,
        pending: 0,
        attributeRelations: {},
        constructor: function (model) {
            Backbone.Model.call(this);
            this.model = model;
            this.dependencyResolver = new this.DependencyResolver(this.tests);
            this.runners = {};
            _.each(this.model.schema, function (settings, attribute) {
                var tests = this.dependencyResolver.createTestMap(_.keys(settings));
                _.each(settings, function (config, name) {
                    var check = this.checks[name];
                    if (check)
                        settings[name] = check.call(this, config, name, attribute);
                }, this);
                var runner = new this.Runner(tests, settings);
                runner.on("run", function () {
                    this.set(attribute, undefined, {old: this.get(attribute)});
                }, this);
                runner.on("end", function (result) {
                    --this.pending;
                    this.set(attribute, result, {old: this.get(attribute)});
                }, this);
                this.runners[attribute] = runner;
                this.on("change:" + attribute, function (model, value, options) {
                    if (!!options.old != !!value) {
                        if (value)
                            ++this.errors;
                        else
                            --this.errors;
                    }
                }, this);
            }, this);
        },
        related: function (attribute, relations) {
            if (!this.attributeRelations[attribute])
                this.attributeRelations[attribute] = {};
            if (!(relations instanceof Array))
                relations = [relations];
            _.each(relations, function (relation) {
                this.attributeRelations[attribute][relation] = true;
            }, this);
        },
        run: function (attributes) {
            var calling = {};
            var add = function (attribute) {
                if (calling[attribute])
                    return;
                calling[attribute] = true;
                if (this.attributeRelations[attribute])
                    _.each(this.attributeRelations[attribute], function (flag, attribute) {
                        add.call(this, attribute);
                    }, this);
            };
            _.each(this.runners, function (runner, attribute) {
                if (this.model.get(attribute) !== attributes[attribute])
                    add.call(this, attribute);
            }, this);
            _.each(calling, function (flag, attribute) {

                var runner = this.runners[attribute];
                if (!runner.pending)
                    ++this.pending;
                runner.run(attributes, attributes[attribute]);
            }, this);
        },
        force: function (attributes) {
            _.each(this.runners, function (runner, attribute) {
                if (!runner.pending)
                    ++this.pending;
                runner.run(attributes, attributes[attribute]);
            }, this);
        }
    }, {
        extendable: {
            checks: true,
            tests: true,
            patterns: true
        },
        customize: function (pack) {
            if (!pack)
                return this;
            _.each(pack, function (value, property) {
                if (this.extendable[property]) {
                    var needNewBranch = this.prototype[property] && this.__super__ && this.prototype[property] === this.__super__[property];
                    if (needNewBranch)
                        this.prototype[property] = Object.create(this.__super__[property]);
                    _.extend(this.prototype[property], value);
                }
                else
                    this.prototype[property] = value;
            }, this);
            return this;
        }
    });

    var Runner = function (testMap, settings) {
        this.testMap = testMap;
        this.settings = settings;
        this.names = _.keys(this.settings);
        this.id = 0;
        this.pending = false;
    };
    _.extend(Runner.prototype, Backbone.Events, {
        run: function (attributes, value) {
            ++this.id;
            this.attributes = attributes;
            this.value = value;
            this.error = false;
            this.result = false;
            this.pointer = 0;
            this.pending = true;
            this.trigger("run");
            this.next();
        },
        next: function () {
            if (!this.error && this.pointer < this.names.length) {
                this.name = this.names[this.pointer];
                this.config = this.settings[this.name];
                this.testMap[this.name].call(this, this.done.bind(this, this.id));
            }
            else
                this.end();
        },
        done: function (id, error) {
            if (this.id != id)
                return;
            this.error = error;
            if (this.error) {
                this.result = {};
                this.result[this.name] = this.error;
            }
            ++this.pointer;
            this.next();
        },
        end: function () {
            delete(this.name);
            delete(this.config);
            delete(this.value);
            this.pending = false;
            this.trigger("end", this.result);
        }
    });

    Validator.prototype.Runner = Runner;

    var DependencyResolver = function (tests) {
        this.tests = tests;
    };
    _.extend(DependencyResolver.prototype, {
        createTestMap: function (names) {
            var testMap = {};
            _.each(names, function (name) {
                this.appendIfNotContained(name, testMap);
            }, this);
            return testMap;
        },
        appendIfNotContained: function (name, testMap) {
            if (name in testMap)
                return;
            if (!(name in this.tests))
                throw new SyntaxError("Task " + name + " is not registered.");
            _.each(this.getDependencies(name), function (key) {
                this.appendIfNotContained(key, testMap);
            }, this);
            testMap[name] = this.getTest(name);
        },
        getDependencies: function (name) {
            var definition = this.tests[name];
            if (definition instanceof Array)
                return definition.slice(0, -1);
            else
                return [];
        },
        getTest: function (name) {
            var definition = this.tests[name];
            if (definition instanceof Array)
                return definition[definition.length - 1];
            else
                return definition;
        }
    });

    Validator.prototype.DependencyResolver = DependencyResolver;

    var Plugin = function () {
    };
    _.extend(Plugin.prototype, {
        Plugin: Plugin,
        Validator: Validator,
        Runner: Runner,
        DependencyResolver: DependencyResolver,
        load: function (name, _require, load, config) {
            var require = amdefine ? function (resources, callback) {
                var modules = [];
                _.each(resources, function (resource) {
                    modules.push(_require(resource));
                });
                callback.apply(null, modules);
            } : _require;
            require(this.parseResourceName(name), function () {
                var config = _.toArray(arguments);
                var branch = this.extend(config);
                load(branch);
            }.bind(this));
        },
        parseResourceName: function (name) {
            if (name == "")
                return [];
            return name.split(":");
        },
        extend: function (config) {
            var Branch = function () {
            };
            Branch.prototype = Object.create(this.constructor.prototype);
            var Validator = this.Validator.extend({});
            _.extend(Branch.prototype, {
                constructor: Branch,
                Validator: Validator
            });
            var branch = new Branch();
            if (config)
                branch.add(config);
            return branch;
        },
        add: function (config) {
            if (!(config instanceof Array))
                config = [config];
            _.each(config, function (resource) {
                this.Validator.customize(resource);
            }, this);
            return this;
        }
    });


    module.exports = new Plugin();

});