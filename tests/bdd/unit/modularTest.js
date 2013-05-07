/*
 * Modular - JavaScript AMD Framework
 * Copyright 2013 Dan Phillimore (asmblah)
 * http://asmblah.github.com/modular/
 *
 * Implements the AMD specification - see https://github.com/amdjs/amdjs-api/wiki/AMD
 *
 * Released under the MIT license
 * https://github.com/asmblah/modular/raw/master/MIT-LICENSE.txt
 */

/*global define */
define([
    "vendor/chai/chai",
    "vendor/sinon/sinon",
    "js/util"
], function (
    chai,
    sinon,
    util
) {
    "use strict";

    var expect = chai.expect;

    describe("Browser modular.js", function () {
        var createdScript,
            global,
            head,
            loadModule,
            Math,
            modularScript;

        beforeEach(function (done) {
            global = {};
            Math = {
                random: sinon.stub()
            };

            util.get("/modular.js", {cache: false}).then(function (js) {
                loadModule = function () {
                    /*jshint evil:true */
                    new Function("Math", js).call(global, Math);
                };
                done();
            });
        });

        util.each([
            {
                browser: false,
                externalDefine: true,
                amdCompatible: true
            },
            {
                browser: false,
                externalDefine: false
            },
            {
                browser: true,
                externalDefine: true,
                amdCompatible: false,
                supportsDocumentBaseURI: true,
                supportsScriptOnload: true,
                baseURI: "http://world.net/path/to/righteousness",
                baseUrl: "http://world.net/path/to",
                modularSrc: "http://world.net/path/to/righteousness/modular.js",
                ModularSrc: "http://world.net/path/to/righteousness/js/Modular.js",
                dataMain: undefined,
                domReady: false,
                supportsDOMContentLoaded: true
            },
            {
                browser: true,
                externalDefine: true,
                amdCompatible: true,
                supportsDocumentBaseURI: true,
                supportsScriptOnload: true,
                baseURI: "http://world.net/path/to/righteousness",
                baseUrl: "http://world.net/path/to",
                modularSrc: "http://world.net/path/to/righteousness/modular.js",
                ModularSrc: "http://world.net/path/to/righteousness/js/Modular.js",
                dataMain: undefined,
                domReady: true,
                supportsDOMContentLoaded: false
            },
            {
                browser: true,
                externalDefine: false,
                supportsDocumentBaseURI: true,
                supportsScriptOnload: false,
                baseURI: "http://world.net/path/to/righteousness",
                baseUrl: "http://world.net/path/to",
                modularSrc: "http://world.net/path/to/righteousness/modular.js",
                ModularSrc: "http://world.net/path/to/righteousness/js/Modular.js",
                dataMain: "a/module/to/remember",
                domReady: true,
                supportsDOMContentLoaded: true
            }
        ], function (scenario) {
            describe("when the environment is" + (scenario.browser ? "": " not") + " a browser, define(...) is" + (scenario.externalDefine ? "" : " not") + " already defined" + (scenario.amdCompatible ? " and supports AMD" : "") + ", document.baseURI is" + (scenario.supportsDocumentBaseURI ? "" : " not") + " supported, script.onload is" + (scenario.supportsScriptOnload ? "" : " not") + " supported", function () {
                beforeEach(function () {
                    if (scenario.browser) {
                        modularScript = {
                            getAttribute: sinon.stub().withArgs("data-main").returns(scenario.dataMain),
                            removeAttribute: sinon.spy(),
                            src: scenario.modularSrc
                        };
                        head = {
                            firstChild: modularScript,
                            insertBefore: sinon.spy(function (element) {
                                global.document.scripts.unshift(element);
                            }),
                            removeChild: sinon.spy()
                        };
                        global.document = {
                            createElement: sinon.spy(function () {
                                createdScript = {
                                    getAttribute: sinon.stub(),
                                    removeAttribute: sinon.spy(),
                                    src: ""
                                };
                                return createdScript;
                            }),
                            getElementsByTagName: sinon.stub().withArgs("head").returns([head]),
                            scripts: [modularScript]
                        };
                        global.location = {
                            pathname: ""
                        };
                        global.setTimeout = sinon.spy();

                        if (scenario.supportsDocumentBaseURI) {
                            global.document.baseURI = scenario.baseURI;
                        } else {
                            global.location.pathname = scenario.baseURI;
                        }

                        if (!scenario.supportsScriptOnload) {
                            global.document.uniqueID = 0;
                        }

                        if (scenario.domReady) {
                            global.document.readyState = "interactive";
                        }

                        if (scenario.supportsDOMContentLoaded) {
                            global.addEventListener = sinon.spy();
                        }
                    }

                    if (scenario.externalDefine) {
                        global.define = sinon.spy();

                        if (scenario.amdCompatible) {
                            global.define.amd = {};
                        }
                    }
                });

                it("should not error", function () {
                    expect(loadModule).to.not.throw();
                });

                describe("when it does not error", function () {
                    beforeEach(function () {
                        loadModule();
                    });

                    function expectScriptToHaveLoaded(src) {
                        describe("when the script with src '" + src + "' loads", function () {
                            it("should create a script element", function () {
                                expect(global.document.createElement).to.have.been.calledOnce;
                            });

                            it("should set the script element's src to the correct URI", function () {
                                expect(createdScript.src).to.equal(src);
                            });

                            it("should insert one element in the head", function () {
                                expect(head.insertBefore).to.have.been.calledOnce;
                            });

                            it("should insert the script element in the head", function () {
                                expect(head.insertBefore).to.have.been.calledWith(createdScript);
                            });

                            it("should insert the script element as the first child in the head", function () {
                                expect(head.insertBefore).to.have.been.calledWith(sinon.match.any, head.firstChild);
                            });

                            if (scenario.supportsScriptOnload) {
                                it("should attach a function listening for script.onload", function () {
                                    expect(createdScript.onload).to.be.a("function");
                                });

                                it("should not attach a function listening for script.onreadystatechange", function () {
                                    expect(createdScript.onreadystatechange).to.not.be.a("function");
                                });

                                describe("when the script loads successfully", function () {
                                    beforeEach(function () {
                                        global.require = sinon.spy();
                                        createdScript.onload();
                                    });

                                    it("should remove one element from the head", function () {
                                        expect(head.removeChild).to.have.been.calledOnce;
                                    });

                                    it("should remove the script from the head", function () {
                                        expect(head.removeChild).to.have.been.calledWith(createdScript);
                                    });
                                });
                            } else {
                                it("should attach a function listening for script.onreadystatechange", function () {
                                    expect(createdScript.onreadystatechange).to.be.a("function");
                                });

                                it("should not attach a function listening for script.onload", function () {
                                    expect(createdScript.onload).to.not.be.a("function");
                                });
                            }
                        });
                    }

                    if (scenario.browser && (!scenario.externalDefine || scenario.amdCompatible)) {
                        if (scenario.amdCompatible) {
                            it("should call define(...) once", function () {
                                expect(global.define).to.have.been.calledOnce;
                            });

                            it("should request the Modular core module", function () {
                                expect(global.define).to.have.been.calledWith(sinon.match(["./js/Modular"]));
                            });
                        } else {
                            expectScriptToHaveLoaded(scenario.ModularSrc);
                        }

                        describe("when loading the Modular core module", function () {
                            var modular,
                                MockModular;

                            beforeEach(function () {
                                global.document.createElement.reset();
                                head.insertBefore.reset();

                                MockModular = function () {};
                                MockModular.prototype.configure = sinon.spy();

                                if (scenario.externalDefine) {
                                    modular = global.define.getCall(0).args[1](MockModular);
                                } else {
                                    global.require = sinon.spy();

                                    if (scenario.supportsScriptOnload) {
                                        createdScript.onload();
                                    } else {
                                        createdScript.readyState = "loaded";
                                        createdScript.onreadystatechange();
                                    }
                                }
                            });

                            if (!scenario.externalDefine) {
                                it("should call require(...) once", function () {
                                    expect(global.require).to.have.been.calledOnce;
                                });

                                it("should request the 'modular' special dependency", function () {
                                    expect(global.require).to.have.been.calledWith(sinon.match(["modular"]));
                                });
                            } else {
                                it("should return an instance of the requested Modular as this module's value", function () {
                                    expect(modular).to.be.an.instanceOf(MockModular);
                                });
                            }

                            describe("when the Modular core module is loaded", function () {
                                beforeEach(function () {
                                    if (!scenario.externalDefine) {
                                        modular = new MockModular();
                                        global.require.getCall(0).args[1](modular);
                                    }
                                });

                                describe("when configuring the Modular instance", function () {
                                    it("should call Modular.configure(...)", function () {
                                        expect(modular.configure).to.have.been.calledOnce;
                                    });

                                    it("should set the 'baseUrl' option correctly", function () {
                                        expect(modular.configure).to.have.been.calledWith(sinon.match.hasOwn("baseUrl", scenario.baseUrl));
                                    });

                                    it("should set the 'baseUrl' option using document.baseURI rather than location.pathname when available");

                                    describe("with the 'exclude' option", function () {
                                        var regex;

                                        beforeEach(function () {
                                            regex = modular.configure.getCall(0).args[0].exclude;
                                        });

                                        it("should exclude http://... URIs", function () {
                                            expect("http://abc.com").to.match(regex);
                                        });

                                        it("should exclude https://... URIs", function () {
                                            expect("http://abc.com").to.match(regex);
                                        });

                                        it("should not exclude paths with no protocol", function () {
                                            expect("/a/path/to/a/module").to.not.match(regex);
                                        });
                                    });

                                    describe("with the 'transport' and 'defineAnonymous' options", function () {
                                        var defineAnonymous,
                                            transport;

                                        beforeEach(function () {
                                            var options;
                                            options = modular.configure.getCall(0).args[0];
                                            defineAnonymous = options.defineAnonymous;
                                            transport = options.transport;
                                        });

                                        describe("when requesting an undefined module through the transport", function () {
                                            var callback,
                                                module;

                                            beforeEach(function () {
                                                callback = sinon.spy();
                                                module = {
                                                    config: {}
                                                };
                                            });

                                            util.each([
                                                {id: "mod/ule", allowCached: false, random: 76},
                                                {id: "a/module", allowCached: false, random: 123},
                                                {id: "mod/ded", allowCached: true, random: 39487.3}
                                            ], function (fixture) {
                                                describe("when the module's id is '" + fixture.id + "' and caching is " + (fixture.allowCached ? "" : "not ") + "allowed", function () {
                                                    beforeEach(function () {
                                                        module.config.baseUrl = scenario.baseUrl;
                                                        module.config.cache = fixture.allowCached;
                                                        module.id = fixture.id;
                                                        Math.random.returns(fixture.random);

                                                        transport(callback, module);
                                                    });

                                                    expectScriptToHaveLoaded(scenario.baseUrl + "/" + fixture.id + ".js" + (fixture.allowCached ? "" : "?__r=" + fixture.random));
                                                });
                                            });
                                        });
                                    });
                                });

                                describe("when handling data-main for the modular.js script element", function () {
                                    if (scenario.dataMain) {
                                        describe("when the element defines a 'data-main' attribute of '" + scenario.dataMain, function () {
                                            it("should remove the 'data-main' attribute", function () {
                                                expect(modularScript.removeAttribute).to.have.been.calledOnce;
                                            });
                                        });
                                    } else {
                                        describe("when the element does not define a 'data-main' attribute", function () {
                                            it("should not remove the 'data-main' attribute", function () {
                                                expect(modularScript.removeAttribute).to.not.have.been.called;
                                            });
                                        });
                                    }
                                });
                            });
                        });
                    } else {
                        it("should not throw an error", function () {
                            expect(loadModule).to.not.throw();
                        });

                        if (scenario.externalDefine) {
                            it("should not call define(...)", function () {
                                loadModule();

                                expect(global.define).to.not.have.been.called;
                            });
                        }
                    }
                });
            });
        });
    });
});
